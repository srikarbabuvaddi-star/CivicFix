import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;
let cachedPromise = null;

// Attach global Mongoose event listeners once
mongoose.connection.on('error', (err) => {
  logger.error('MongoDB runtime connection error:', err.message);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost. Reconnecting...');
  isConnected = false;
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully.');
  isConnected = true;
});

export async function connectDB(uri = process.env.MONGODB_URI || env.mongoUri) {
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return mongoose.connection;
  }

  if (!uri) {
    throw new Error('MONGODB_URI is not configured in the environment.');
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  try {
    mongoose.set('strictQuery', true);

    cachedPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    }).then((conn) => {
      cachedPromise = null;
      isConnected = conn.connection.readyState === 1;

      // Mask credentials in connection string for logging
      const safeHost = conn.connection.host || 'database';
      const safeDbName = conn.connection.name || 'civicfix';
      logger.info(`MongoDB connected: ${safeHost}/${safeDbName}`);

      return conn.connection;
    }).catch((err) => {
      cachedPromise = null;
      isConnected = false;
      logger.error('Failed to establish MongoDB connection:', err.message);
      throw err;
    });

    return await cachedPromise;
  } catch (error) {
    cachedPromise = null;
    isConnected = false;
    throw error;
  }
}

export async function disconnectDB() {
  cachedPromise = null;
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  try {
    await mongoose.connection.close(false);
    isConnected = false;
    logger.info('MongoDB connection closed gracefully.');
  } catch (error) {
    logger.error('Error during MongoDB disconnect:', error.message);
    throw error;
  }
}

export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

