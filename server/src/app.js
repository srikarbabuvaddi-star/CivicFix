import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { configureSession } from './config/session.js';
import { correlationId } from './middleware/correlationId.js';
import { sanitizeInputs } from './middleware/sanitize.js';
import { csrfProtection } from './middleware/csrf.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { getDatabaseStatus } from './config/db.js';
import { sendSuccess } from './utils/apiResponse.js';
import { NotFoundError } from './utils/errors.js';

import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import issueRoutes from './modules/issues/issue.routes.js';
import departmentRoutes from './modules/departments/department.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';

export function createApp(customSessionStoreUri = null) {
  const app = express();

  // Attach Correlation ID to every incoming request
  app.use(correlationId);

  // Trust proxy for rate limiting / secure cookies behind reverse proxies (Nginx, Render, Railway, AWS ALB)
  if (env.trustProxy) {
    app.set('trust proxy', env.trustProxy);
  }

  // Security HTTP Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false
    })
  );

  // Cross-Origin Resource Sharing
  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-correlation-id'],
      exposedHeaders: ['x-correlation-id']
    })
  );

  // Request size limit (protects against payload bombing)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Sanitize user inputs to mitigate NoSQL injection
  app.use(sanitizeInputs);

  app.use(cookieParser());

  // Liveness check handlers (process uptime & health - independent of MongoDB)
  const livenessHandler = (req, res) => {
    return sendSuccess(
      res,
      {
        status: 'ok',
        environment: env.nodeEnv,
        uptimeSeconds: Math.floor(process.uptime()),
        database: getDatabaseStatus()
      },
      'CivicFix Service Healthy',
      200
    );
  };

  // Readiness check handlers (verifies live DB connectivity)
  const readinessHandler = (req, res) => {
    const dbStatus = getDatabaseStatus();
    const isReady = dbStatus === 'connected';
    const statusCode = isReady ? 200 : 503;

    return res.status(statusCode).json({
      success: isReady,
      message: isReady ? 'CivicFix Service Ready' : 'Database Unavailable',
      data: {
        status: isReady ? 'ready' : 'not_ready',
        database: dbStatus,
        uptimeSeconds: Math.floor(process.uptime())
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  };

  // Register liveness and readiness health-check routes before MongoDB session and CSRF middleware
  app.get('/health', livenessHandler);
  app.get('/api/v1/health', livenessHandler);
  app.get('/ready', readinessHandler);
  app.get('/api/v1/ready', readinessHandler);

  // Persistent Server-side Sessions (backed by MongoStore)
  app.use(configureSession(customSessionStoreUri));

  // CSRF Protection
  app.use(csrfProtection);

  // Apply general rate limiter to API routes in non-test environments
  if (!env.isTest) {
    app.use('/api', generalLimiter);
  }

  // API modules
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/issues', issueRoutes);
  app.use('/api/v1/departments', departmentRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/analytics', analyticsRoutes);

  // 404 handler for unknown routes
  app.use((req, res, next) => {
    next(new NotFoundError(`Resource not found: ${req.method} ${req.originalUrl}`));
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
