/**
 * Standardized success response envelope
 */
export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  const meta = {
    timestamp: new Date().toISOString()
  };
  if (res.req?.id) {
    meta.correlationId = res.req.id;
  }

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta
  });
}

/**
 * Standardized error response envelope
 */
export function sendError(res, message = 'An error occurred', statusCode = 500, details = null) {
  const meta = {
    timestamp: new Date().toISOString()
  };
  if (res.req?.id) {
    meta.correlationId = res.req.id;
  }

  const payload = {
    success: false,
    message,
    statusCode,
    meta
  };

  if (details) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
}

