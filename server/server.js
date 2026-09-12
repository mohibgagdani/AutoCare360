import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { startScheduler } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';
import { isCloudinaryEnabled } from './config/cloudinary.js';
import { isEmailEnabled } from './services/emailService.js';

async function bootstrap() {
  await connectDB();
  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`AutoCare360 API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    logger.info(`File storage: ${isCloudinaryEnabled ? 'Cloudinary' : 'local disk (server/uploads)'} · Email: ${isEmailEnabled ? 'SMTP' : 'console'}`);
  });

  const scheduler = env.enableJobs ? startScheduler() : null;

  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    scheduler?.stop();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => logger.error('Unhandled rejection:', reason));
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error.message);
  process.exit(1);
});
