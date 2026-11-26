import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import env from './config/env.js';
import { errorHandler, notFoundHandler } from './core/middleware/errorHandler.js';
import { apiRateLimiter } from './core/middleware/rateLimiter.js';
import authRoutes from './core/auth/auth.routes.js';
import userRoutes from './core/users/users.routes.js';
import departmentRoutes from './core/departments/departments.routes.js';
import auditRoutes from './core/audit/audit.routes.js';
import notificationRoutes from './core/notifications/notifications.routes.js';
import publicRoutes from './core/public/public.routes.js';
import ocrRoutes from './core/ocr/ocr.routes.js';
import duplicatesRoutes from './core/duplicates/duplicates.routes.js';
import leaderboardRoutes from './core/leaderboards/leaderboards.routes.js';
import reportsRoutes from './core/reports/reports.routes.js';
import insightsRoutes from './core/insights/insights.routes.js';
import deptAchievementRoutes from './modules/department-tracker/dept.routes.js';
import facultyAchievementRoutes from './modules/faculty-tracker/faculty.routes.js';
import studentAchievementRoutes from './modules/student-tracker/student.routes.js';

const app = express();

// Trust first proxy hop when deployed behind a reverse proxy so req.ip and rate limits stay accurate.
app.set('trust proxy', 1);

/**
 * Generates a unique request ID per HTTP request for audit correlation and log tracing.
 */
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  req.id = requestId; // Alias for backward compat
  res.setHeader('X-Request-Id', requestId);
  next();
});

app.use(helmet());

const corsOrigin = env.CORS_ORIGIN.includes(',')
  ? env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : env.CORS_ORIGIN;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Apply global API rate limiter to all /api routes
app.use('/api', apiRateLimiter);

/**
 * Health check endpoint for uptime monitors and load balancers.
 */
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Core API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/departments', departmentRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/ocr', ocrRoutes);
app.use('/api/v1/duplicates', duplicatesRoutes);
app.use('/api/v1/leaderboards', leaderboardRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/insights', insightsRoutes);

// Strictly isolated achievement tracker APIs
app.use('/api/v1/department-achievements', deptAchievementRoutes);
app.use('/api/v1/faculty-achievements', facultyAchievementRoutes);
app.use('/api/v1/student-achievements', studentAchievementRoutes);

// Handle unmatched API routes cleanly in JSON format before global error handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.id,
  });
});

// Global error-handling middleware must remain last
app.use(errorHandler);

export { app };
export default app;
