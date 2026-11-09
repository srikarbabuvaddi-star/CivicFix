import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export function configureSession(customMongoUri = null) {
  let mongoUri = customMongoUri || process.env.MONGODB_URI || env.mongoUri;
  if (mongoUri) {
    mongoUri = String(mongoUri).trim();
    if (mongoUri.startsWith('MONGODB_URI=')) {
      mongoUri = mongoUri.substring('MONGODB_URI='.length).trim();
    }
    if ((mongoUri.startsWith('"') && mongoUri.endsWith('"')) || (mongoUri.startsWith("'") && mongoUri.endsWith("'"))) {
      mongoUri = mongoUri.slice(1, -1).trim();
    }
  }

  let store;
  if (mongoUri) {
    store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: env.sessionTtlMs / 1000,
      autoRemove: 'native',
      touchAfter: 12 * 3600 // Lazy session update every 12 hours unless data changed
    });
    if (store && store.clientPromise) {
      store.clientPromise.catch((err) => {
        logger.warn(`[Session Store] MongoStore connection warning: ${err.message}`);
      });
    }
  } else {
    logger.warn('[Session] MONGODB_URI not provided. Initializing session in fallback MemoryStore mode.');
    store = new session.MemoryStore();
  }

  return session({
    name: env.sessionCookieName,
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store,
    rolling: true, // Reset maxAge on every response
    cookie: {
      httpOnly: true,
      secure: env.isProduction, // HTTPS only in production
      sameSite: env.cookieSameSite,
      maxAge: env.sessionTtlMs,
      path: '/'
    }
  });
}
