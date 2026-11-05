import { createApp } from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let appInstance = null;

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error(
      'Database connection error in Vercel serverless function:',
      err.message
    );

    return res.status(503).json({
      success: false,
      message: 'Service temporarily unavailable. Please try again later.'
    });
  }

  if (!appInstance) {
    appInstance = createApp();
  }

  return appInstance(req, res);
}
