import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import authRoutes from './routes/auth';
import subscriptionRoutes from './routes/subscription';
import coursesRouter from './routes/courses';
import syllabusRouter from './routes/syllabus';
import { requireAuth, requireSubscription } from './middleware/auth';

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGINS,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/courses', requireAuth, requireSubscription, coursesRouter);
app.use('/api/courses', requireAuth, requireSubscription, coursesRouter);
app.use('/api/syllabi', syllabusRouter);
// backwards-compatible alias (old clients hit /syllabi)
app.use('/syllabi', syllabusRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});
