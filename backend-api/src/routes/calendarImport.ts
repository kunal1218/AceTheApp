import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import * as ical from 'node-ical';
import { prisma } from '../db/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();
const upload = multer();

const isIcsFile = (file: Express.Multer.File | undefined): file is Express.Multer.File => {
  if (!file) return false;
  const allowed = ['text/calendar', 'application/ics', 'application/octet-stream'];
  const hasIcsExt = typeof file.originalname === 'string' && file.originalname.toLowerCase().endsWith('.ics');
  return hasIcsExt || (file.mimetype ? allowed.includes(file.mimetype) : false);
};

const parseCourseIdFromUrl = (url: string | undefined | null): string | null => {
  if (!url) return null;
  const match = url.match(/\/courses\/([^/]+)/i);
  return match ? match[1] : null;
};

router.post('/import-ics', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!isIcsFile(file)) {
    res.status(400).json({ error: 'ICS file is required' });
    return;
  }

  const raw = file.buffer.toString('utf8');

  let parsed: Record<string, ical.VEvent>;
  try {
    parsed = ical.parseICS(raw) as Record<string, ical.VEvent>;
  } catch (err) {
    console.error('[calendar/import-ics] parse failed', err);
    res.status(400).json({ error: 'Invalid ICS file' });
    return;
  }

  const events = Object.values(parsed).filter((entry): entry is ical.VEvent => (entry as any)?.type === 'VEVENT');

  let imported = 0;
  let updated = 0;
  let total = 0;

  for (const ev of events) {
    if (!ev.uid) continue;
    const dueAt = ev.start instanceof Date ? ev.start : new Date((ev as any).start);
    if (!dueAt || Number.isNaN(dueAt.getTime())) continue;

    total += 1;

    const url = (ev as any).url || (ev as any).URL || null;
    const courseId = parseCourseIdFromUrl(typeof url === 'string' ? url : null);

    const data = {
      userId: req.user!.id,
      source: 'canvas-ics',
      sourceId: ev.uid,
      title: ev.summary || 'Untitled event',
      description: ev.description || null,
      courseId,
      courseName: null as string | null,
      dueAt,
      htmlUrl: typeof url === 'string' ? url : null
    };

    const existing = await prisma.calendarEvent.findUnique({
      where: { userId_source_sourceId: { userId: data.userId, source: data.source, sourceId: data.sourceId } }
    });

    if (existing) {
      await prisma.calendarEvent.update({
        where: { userId_source_sourceId: { userId: data.userId, source: data.source, sourceId: data.sourceId } },
        data: {
          title: data.title,
          description: data.description,
          courseId: data.courseId,
          courseName: data.courseName,
          dueAt: data.dueAt,
          htmlUrl: data.htmlUrl
        }
      });
      updated += 1;
    } else {
      await prisma.calendarEvent.create({ data });
      imported += 1;
    }
  }

  res.json({ imported, updated, total });
});

router.get('/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const events = await prisma.calendarEvent.findMany({
      where: { userId: req.user!.id },
      orderBy: { dueAt: 'asc' }
    });
    res.json({ events });
  } catch (err) {
    console.error('[calendar/events] failed', err);
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

export default router;
