import session from 'express-session';
import MongoStore from 'connect-mongo';
import { env } from './env.js';

export function configureSession(customMongoUri = null) {
  const mongoUri = customMongoUri || process.env.MONGODB_URI || env.mongoUri;

  const store = MongoStore.create({
    mongoUrl: mongoUri,
    ttl: env.sessionTtlMs / 1000,
    autoRemove: 'native',
    touchAfter: 12 * 3600 // Lazy session update every 12 hours unless data changed
  });

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
