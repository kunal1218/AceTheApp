import { Router, type Request, type Response } from 'express';
import { prisma } from '../db/prisma';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : undefined;

    if (!name) {
      res.status(400).json({ success: false, error: 'Course name is required' });
      return;
    }

    const course = await prisma.course.create({
      data: {
        name,
        category,
        userId: req.user!.id
      }
    });

    res.status(201).json({ success: true, data: { course } });
  } catch (err) {
    console.error('Failed to create course', err);
    res.status(500).json({ success: false, error: 'Could not create course' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const courses = await prisma.course.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: { courses } });
  } catch (err) {
    console.error('Failed to list courses', err);
    res.status(500).json({ success: false, error: 'Could not fetch courses' });
  }
});

router.get('/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findFirst({
      where: { id: courseId, userId: req.user!.id },
      include: { syllabusItems: { orderBy: { date: 'asc' } } }
    });

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    res.json({ success: true, data: { course } });
  } catch (err) {
    console.error('Failed to fetch course', err);
    res.status(500).json({ success: false, error: 'Could not fetch course' });
  }
});

router.delete('/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const existing = await prisma.course.findFirst({ where: { id: courseId, userId: req.user!.id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    await prisma.course.delete({ where: { id: courseId } });

    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    console.error('Failed to delete course', err);
    res.status(500).json({ success: false, error: 'Could not delete course' });
  }
});

router.get('/:courseId/syllabus', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findFirst({ where: { id: courseId, userId: req.user!.id } });
    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    const items = await prisma.syllabusItem.findMany({
      where: { courseId },
      orderBy: { date: 'asc' }
    });

    res.json({ success: true, data: { syllabus: items } });
  } catch (err) {
    console.error('Failed to list syllabus items', err);
    res.status(500).json({ success: false, error: 'Could not fetch syllabus items' });
  }
});

export default router;
