import { Router, type Request, type Response } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

const coerceDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
};

const courseOwnedByUser = async (courseId: string, userId: string) => {
  return prisma.course.findFirst({ where: { id: courseId, userId } });
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.body;
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : undefined;
    const type = typeof req.body.type === 'string' ? req.body.type.trim() : undefined;
    const date = coerceDate(req.body.date);
    const rawText = typeof req.body.rawText === 'string' ? req.body.rawText : undefined;

    if (!courseId || !title) {
      res.status(400).json({ success: false, error: 'courseId and title are required' });
      return;
    }

    const course = await courseOwnedByUser(courseId, req.user!.id);
    if (!course) {
      res.status(403).json({ success: false, error: 'Course not found or not owned by user' });
      return;
    }

    const item = await prisma.syllabusItem.create({
      data: {
        courseId,
        title,
        description,
        type,
        date: date ?? undefined,
        rawText
      }
    });

    res.status(201).json({ success: true, data: { syllabusItem: item } });
  } catch (err) {
    console.error('Failed to create syllabus item', err);
    res.status(500).json({ success: false, error: 'Could not create syllabus item' });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.syllabusItem.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!existing || existing.course.userId !== req.user!.id) {
      res.status(404).json({ success: false, error: 'Syllabus item not found' });
      return;
    }

    const date = coerceDate(req.body.date);

    const updated = await prisma.syllabusItem.update({
      where: { id },
      data: {
        title: typeof req.body.title === 'string' ? req.body.title.trim() : existing.title,
        description:
          typeof req.body.description === 'string' ? req.body.description.trim() : req.body.description === null ? null : existing.description,
        type: typeof req.body.type === 'string' ? req.body.type.trim() : req.body.type === null ? null : existing.type,
        date: req.body.date === null ? null : date ?? existing.date
      }
    });

    res.json({ success: true, data: { syllabusItem: updated } });
  } catch (err) {
    console.error('Failed to update syllabus item', err);
    res.status(500).json({ success: false, error: 'Could not update syllabus item' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.syllabusItem.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!existing || existing.course.userId !== req.user!.id) {
      res.status(404).json({ success: false, error: 'Syllabus item not found' });
      return;
    }

    await prisma.syllabusItem.delete({ where: { id } });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Failed to delete syllabus item', err);
    res.status(500).json({ success: false, error: 'Could not delete syllabus item' });
  }
});

export default router;
