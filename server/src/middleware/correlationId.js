import crypto from 'crypto';

/**
 * Middleware that assigns a unique Correlation ID to every incoming HTTP request.
 * If the client or upstream proxy sends an `x-correlation-id` header, it is preserved;
 * otherwise, a cryptographically random UUIDv4 is generated.
 * The correlation ID is exposed in the response headers and attached to `req.id`.
 */
export function correlationId(req, res, next) {
  const incomingId = req.headers['x-correlation-id'];
  const reqId = typeof incomingId === 'string' && incomingId.trim()
    ? incomingId.trim()
    : crypto.randomUUID();

  req.id = reqId;
  res.setHeader('x-correlation-id', reqId);
  next();
}

