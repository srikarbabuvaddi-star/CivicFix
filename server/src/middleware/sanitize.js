/**
 * Recursively sanitize objects to remove keys starting with '$' or containing '.'
 * to prevent NoSQL query operator injection attacks.
 */
function cleanObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 8) {
    return;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (item && typeof item === 'object') {
        cleanObject(item, depth + 1);
      }
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (obj[key] && typeof obj[key] === 'object') {
      cleanObject(obj[key], depth + 1);
    }
  }
}

/**
 * Express middleware that sanitizes user-supplied input on incoming requests
 */
export function sanitizeInputs(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    cleanObject(req.params);
  }
  next();
}

