import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

let server;

async function bootstrap() {
  try {
    if (!env.isConfigValid && env.isProduction) {
      logger.error('Fatal: Cannot start CivicFix standalone server due to invalid environment configuration:');
      env.configErrors.forEach((err) => logger.error(`  - ${err}`));
      logger.error('Please configure your .env file or environment variables before starting.\n');
      process.exit(1);
    }

    logger.info('Starting CivicFix backend service...');

    // Initialize application
    const app = createApp();

    // Start HTTP server on 0.0.0.0 for containerized environments (Render, Railway, Docker)
    server = app.listen(env.port, '0.0.0.0', () => {
      logger.info(`CivicFix API server running in [${env.nodeEnv}] on port ${env.port}`);
      logger.info(`Allowed client origin: ${env.clientOrigin}`);
    });

    // Connect to MongoDB
    try {
      await connectDB();
    } catch (dbError) {
      logger.error('Failed to establish initial MongoDB connection:', dbError.message);
      logger.warn(
        'Server is running in degraded state. Liveness probe (/health) will succeed, but readiness (/ready) and stateful routes require MongoDB.'
      );
    }

    // Graceful Shutdown Handler
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed.');
          try {
            await disconnectDB();
            logger.info('Graceful shutdown completed successfully.');
            process.exit(0);
          } catch (err) {
            logger.error('Error during database disconnection:', err.message);
            process.exit(1);
          }
        });

        // Force shutdown after 10s timeout
        setTimeout(() => {
          logger.error('Forced shutdown: timeout reached while closing connections.');
          process.exit(1);
        }, 10000).unref();
      } else {
        process.exit(0);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal initialization error:', error.message);
    process.exit(1);
  }
}

bootstrap();

