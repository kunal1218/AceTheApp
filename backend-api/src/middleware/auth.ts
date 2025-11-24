import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Role, User } from '@prisma/client';
import { prisma } from '../db/prisma';
import { cacheUser, getCachedUser } from '../redis/client';
import { env } from '../config/env';

type AuthTokenPayload = JwtPayload & {
  userId: string;
  email: string;
  role: Role;
  hasActiveSubscription: boolean;
};

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring('Bearer '.length).trim();
  }

  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  return null;
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;

    let user: User | null = await getCachedUser(payload.userId);

    if (!user) {
      user = await prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) {
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }
      await cacheUser(user);
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

export const requireSubscription = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  if (!req.user.hasActiveSubscription) {
    res.status(403).json({ success: false, error: 'Active subscription required' });
    return;
  }

  next();
};
