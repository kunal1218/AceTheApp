import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { redis } from '../redis/client';

const router = Router();

const fallbackColleges = new Map<string, string[]>();
const fallbackProgress = new Map<string, Record<string, unknown>>();

const collegesKey = (userId: string) => `profile:${userId}:colleges`;
const progressKey = (userId: string) => `profile:${userId}:progress`;

const readColleges = async (userId: string): Promise<string[]> => {
  try {
    const raw = await redis.get(collegesKey(userId));
    if (!raw) return fallbackColleges.get(userId) ?? [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch (err) {
    console.warn('[profile] failed to read colleges from redis', err);
    return fallbackColleges.get(userId) ?? [];
  }
};

const writeColleges = async (userId: string, colleges: string[]): Promise<void> => {
  try {
    await redis.set(collegesKey(userId), JSON.stringify(colleges));
  } catch (err) {
    console.warn('[profile] failed to write colleges to redis', err);
    fallbackColleges.set(userId, colleges);
  }
};

const readProgress = async (userId: string): Promise<Record<string, unknown>> => {
  try {
    const raw = await redis.get(progressKey(userId));
    if (!raw) return fallbackProgress.get(userId) ?? {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.warn('[profile] failed to read progress from redis', err);
    return fallbackProgress.get(userId) ?? {};
  }
};

const writeProgress = async (userId: string, progress: Record<string, unknown>): Promise<void> => {
  try {
    await redis.set(progressKey(userId), JSON.stringify(progress));
  } catch (err) {
    console.warn('[profile] failed to write progress to redis', err);
    fallbackProgress.set(userId, progress);
  }
};

router.get('/colleges', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const colleges = await readColleges(userId);
  res.json(colleges);
});

router.post('/colleges', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const collegeId = typeof req.body?.id === 'string' ? req.body.id.trim() : '';
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (!collegeId) {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }
  const colleges = await readColleges(userId);
  if (!colleges.includes(collegeId)) {
    colleges.push(collegeId);
  }
  await writeColleges(userId, colleges);
  res.json(colleges);
});

router.delete('/colleges/:id', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  const collegeId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (!collegeId) {
    res.status(400).json({ success: false, error: 'id is required' });
    return;
  }
  const colleges = await readColleges(userId);
  const next = colleges.filter((id) => id !== collegeId);
  await writeColleges(userId, next);
  res.json(next);
});

router.get('/progress', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const progress = await readProgress(userId);
  res.json(progress);
});

router.post('/progress', requireAuth, async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  const collegeId = typeof req.body?.collegeId === 'string' ? req.body.collegeId.trim() : '';
  const progressUpdate = req.body?.progress;
  if (!collegeId || !progressUpdate || typeof progressUpdate !== 'object') {
    res.status(400).json({ success: false, error: 'collegeId and progress are required' });
    return;
  }
  const progress = await readProgress(userId);
  progress[collegeId] = progressUpdate;
  await writeProgress(userId, progress);
  res.json({ success: true, data: progress[collegeId] });
});

export default router;
