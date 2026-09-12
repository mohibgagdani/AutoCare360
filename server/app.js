import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { apiLimiter, mongoSanitize } from './middleware/security.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { UPLOAD_ROOT } from './services/storageService.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', env.trustProxy);

  app.use(
    helmet({
      // Allow the SPA (different origin) to render uploaded images/PDFs.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests and the configured client origins.
        if (!origin || env.clientUrls.includes(origin.replace(/\/$/, ''))) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Content-Disposition'],
      maxAge: 600,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize);
  if (!env.isProd) app.use(morgan('dev'));

  // Local-disk uploads (development fallback when Cloudinary isn't configured).
  // File names are random 128-bit tokens, so URLs are unguessable.
  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      maxAge: '7d',
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    })
  );

  app.get('/', (_req, res) =>
    res.json({ success: true, data: { name: 'AutoCare360 API', docs: '/api/health' } })
  );
  app.use('/api', apiLimiter, apiRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
