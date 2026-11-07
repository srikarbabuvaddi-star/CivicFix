import { createApp } from '../server/src/app.js';
import { connectDB } from '../server/src/config/db.js';

let appInstance = null;

function isLivenessRoute(url = '') {
  const path = url.split('?')[0];
  return path === '/health' || path === '/api/v1/health' || path.endsWith('/health');
}

function isReadinessRoute(url = '') {
  const path = url.split('?')[0];
  return path === '/ready' || path === '/api/v1/ready' || path.endsWith('/ready');
}

export default async function handler(req, res) {
  // Normalize req.url if Vercel internal router passes the rewrite destination
  if (req.headers && req.headers['x-matched-path'] && (req.url === '/api/index.js' || req.url.startsWith('/api/index.js'))) {
    req.url = req.headers['x-matched-path'];
  }

  if (!appInstance) {
    appInstance = createApp();
  }

  // Liveness health-check requests must work independently of MongoDB availability
  if (isLivenessRoute(req.url)) {
    return appInstance(req, res);
  }

  // Attempt database connection for readiness checks and stateful routes
  try {
    await connectDB();
  } catch (err) {
    console.error(
      'Database connection error in Vercel serverless function:',
      err.message
    );

    // For readiness check, delegate to Express to return structured readiness response
    if (isReadinessRoute(req.url)) {
      return appInstance(req, res);
    }

    if (typeof res.status === 'function') {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.'
      });
    }

    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.'
      })
    );
  }

  return appInstance(req, res);
}
