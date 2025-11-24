import { Router, type Request, type Response } from 'express';
import type { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../db/prisma';
import { cacheUser, invalidateUserCache } from '../redis/client';
import { requireAuth, requireSubscription } from '../middleware/auth';

const router = Router();

const parseStatus = (raw: unknown): SubscriptionStatus | null => {
  if (typeof raw !== 'string') return null;
  const normalized = raw.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'CANCELED' || normalized === 'EXPIRED') {
    return normalized as SubscriptionStatus;
  }
  return null;
};

const refreshUserSubscriptionFlag = async (userId: string) => {
  const active = await prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' } });
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { hasActiveSubscription: Boolean(active) }
  });
  await cacheUser(updatedUser);
  return updatedUser;
};

router.use(requireAuth);

router.get('/me', async (req: Request, res: Response) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user!.id },
      orderBy: { startedAt: 'desc' }
    });

    res.json({ success: true, data: { subscriptions } });
  } catch (err) {
    console.error('Failed to fetch subscriptions', err);
    res.status(500).json({ success: false, error: 'Could not fetch subscriptions' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const status = parseStatus(req.body.status) ?? 'ACTIVE';
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : null;
    const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : new Date();

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.user!.id,
        status,
        startedAt,
        expiresAt
      }
    });

    const updatedUser = await refreshUserSubscriptionFlag(req.user!.id);

    res.status(201).json({ success: true, data: { subscription, user: updatedUser } });
  } catch (err) {
    console.error('Failed to create subscription', err);
    res.status(500).json({ success: false, error: 'Could not create subscription' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.subscription.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }

    if (req.user!.role !== 'ADMIN' && existing.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Not allowed to update this subscription' });
      return;
    }

    const status = parseStatus(req.body.status);
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;
    const startedAt = req.body.startedAt ? new Date(req.body.startedAt) : undefined;

    const updated = await prisma.subscription.update({
      where: { id },
      data: {
        status: status ?? existing.status,
        expiresAt,
        startedAt
      }
    });

    const updatedUser = await refreshUserSubscriptionFlag(updated.userId);

    res.json({ success: true, data: { subscription: updated, user: updatedUser } });
  } catch (err) {
    console.error('Failed to update subscription', err);
    res.status(500).json({ success: false, error: 'Could not update subscription' });
  }
});

router.get('/protected/ping', requireSubscription, (_req: Request, res: Response) => {
  res.json({ success: true, data: { message: 'Subscription gate passed' } });
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.subscription.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }

    if (req.user!.role !== 'ADMIN' && existing.userId !== req.user!.id) {
      res.status(403).json({ success: false, error: 'Not allowed to delete this subscription' });
      return;
    }

    await prisma.subscription.delete({ where: { id } });
    await invalidateUserCache(existing.userId);
    await refreshUserSubscriptionFlag(existing.userId);

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Failed to delete subscription', err);
    res.status(500).json({ success: false, error: 'Could not delete subscription' });
  }
});

export default router;
