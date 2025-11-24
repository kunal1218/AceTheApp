import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { cacheUser } from '../redis/client';

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

export default router;
