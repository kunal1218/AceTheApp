import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { cacheUser } from '../redis/client';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (params: { userId: string; email: string; role: string; hasActiveSubscription: boolean }): string => {
  return jwt.sign(params, env.JWT_SECRET, { expiresIn: '7d' });
};

const setAuthCookie = (res: Response, token: string): void => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

const sanitizeUser = <T extends { passwordHash?: string }>(user: T) => {
  const { passwordHash, ...rest } = user;
  return rest;
};

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const rawEmail = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!emailRegex.test(rawEmail)) {
      res.status(400).json({ success: false, error: 'Invalid email address' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (existing) {
      res.status(400).json({ success: false, error: 'User already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const isAdmin = env.ADMIN_EMAILS.includes(rawEmail);

    const user = await prisma.user.create({
      data: {
        email: rawEmail,
        passwordHash,
        role: isAdmin ? 'ADMIN' : 'USER',
        hasActiveSubscription: isAdmin ? true : false
      }
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hasActiveSubscription: user.hasActiveSubscription
    });

    setAuthCookie(res, token);
    await cacheUser(user);

    res.status(201).json({ success: true, data: { user: sanitizeUser(user), token } });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});

router.post('/signin', async (req: Request, res: Response) => {
  try {
    const rawEmail = typeof req.body.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!rawEmail || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordsMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hasActiveSubscription: user.hasActiveSubscription
    });

    setAuthCookie(res, token);
    await cacheUser(user);

    res.json({ success: true, data: { user: sanitizeUser(user), token } });
  } catch (err) {
    console.error('Signin error', err);
    res.status(500).json({ success: false, error: 'Failed to sign in' });
  }
});

router.post('/signout', (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ success: true, data: { message: 'Signed out' } });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  res.json({ success: true, data: { user: sanitizeUser(req.user) } });
});

router.post('/oracle-seen', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }
    const seen = req.body?.seen === false ? false : true;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { hasSeenOracleCutscene: seen }
    });
    await cacheUser(updated);
    res.json({ success: true, data: { user: sanitizeUser(updated) } });
  } catch (err) {
    console.error('Failed to update oracle cutscene flag', err);
    res.status(500).json({ success: false, error: 'Failed to update cutscene state' });
  }
});

// Google OAuth: redirect to Google's consent screen
router.get('/google', (_req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CALLBACK_URL) {
    res.status(500).json({ success: false, error: 'Google OAuth not configured' });
    return;
  }
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Google OAuth callback: exchange code, upsert user, issue JWT, redirect to frontend with token
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    if (!code) {
      res.status(400).send('Missing authorization code');
      return;
    }
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
      res.status(500).send('Google OAuth not configured');
      return;
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error('Google token exchange failed:', errorText);
      res.status(502).send('Failed to exchange code for tokens');
      return;
    }

    const tokenJson = (await tokenRes.json()) as { id_token?: string; access_token?: string };
    if (!tokenJson.id_token) {
      res.status(502).send('No id_token returned from Google');
      return;
    }

    const [, payload] = tokenJson.id_token.split('.');
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as {
      email?: string;
      name?: string;
    };

    const email = decoded.email?.toLowerCase().trim();
    const name = decoded.name || 'Google User';
    if (!email) {
      res.status(502).send('No email returned from Google');
      return;
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const randomPwd = crypto.randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPwd, 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: env.ADMIN_EMAILS.includes(email) ? 'ADMIN' : 'USER',
          hasActiveSubscription: env.ADMIN_EMAILS.includes(email) ? true : false
        }
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      hasActiveSubscription: user.hasActiveSubscription
    });
    setAuthCookie(res, token);
    await cacheUser(user);

    const redirectTarget = env.FRONTEND_ORIGIN?.replace(/\/$/, '') || 'http://localhost:3000';
    res.redirect(`${redirectTarget}/profile?token=${token}`);
  } catch (err) {
    console.error('Google OAuth callback error', err);
    res.status(500).send('OAuth error');
  }
});

export default router;
