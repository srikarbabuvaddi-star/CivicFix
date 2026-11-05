import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

let server;

async function bootstrap() {
  try {
    logger.info('Starting CivicFix backend service...');

    // Connect to MongoDB
    await connectDB();

    // Initialize application
    const app = createApp();

    // Start HTTP server
    server = app.listen(env.port, () => {
      logger.info(`CivicFix API server running in [${env.nodeEnv}] on port ${env.port}`);
      logger.info(`Allowed client origin: ${env.clientOrigin}`);
    });

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

