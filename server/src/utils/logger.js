const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const currentLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'csrftoken',
  'secret',
  'cookie',
  'authorization',
  'smtppass',
  'sessionsecret',
  'mongouri',
  'passwordhash'
]);

/**
 * Deep clone and redact sensitive field values from logs
 */
function redact(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 5) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = redact(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level, message, context = null) {
  if (LOG_LEVELS[level] > (LOG_LEVELS[currentLevel] ?? 2)) {
    return;
  }

  const timestamp = new Date().toISOString();
  let contextStr = '';

  if (context !== null && context !== undefined) {
    try {
      const sanitized = typeof context === 'object' ? redact(context) : context;
      contextStr = ` ${typeof sanitized === 'object' ? JSON.stringify(sanitized) : sanitized}`;
    } catch {
      contextStr = ' [Unserializable Context]';
    }
  }

  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (level === 'error') {
    console.error(`${prefix} ${message}${contextStr}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}${contextStr}`);
  } else {
    console.log(`${prefix} ${message}${contextStr}`);
  }
}

export const logger = {
  info: (msg, ctx) => log('info', msg, ctx),
  warn: (msg, ctx) => log('warn', msg, ctx),
  error: (msg, ctx) => log('error', msg, ctx),
  debug: (msg, ctx) => log('debug', msg, ctx)
};
