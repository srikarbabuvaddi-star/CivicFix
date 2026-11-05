import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDB(uri = env.mongoUri) {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = conn.connection.readyState === 1;

    // Mask credentials in connection string for logging
    const safeHost = conn.connection.host || 'database';
    const safeDbName = conn.connection.name || 'civicfix';
    logger.info(`MongoDB connected: ${safeHost}/${safeDbName}`);

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

    return conn.connection;
  } catch (error) {
    logger.error('Failed to establish MongoDB connection:', error.message);
    throw error;
  }
}

export async function disconnectDB() {
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

