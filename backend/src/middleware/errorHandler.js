/**
 * Global error handler middleware for Express.
 * Normalizes all errors into a consistent JSON envelope:
 *   { error: "message", details: { ... } }
 */
const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // Mongoose ValidationError → 400 with field-level details
  if (err.name === 'ValidationError') {
    const details = {};
    Object.keys(err.errors).forEach((field) => {
      details[field] = err.errors[field].message;
    });
    return res.status(400).json({
      error: 'Validation failed',
      details,
      ...(isDev && { stack: err.stack }),
    });
  }

  // Mongoose CastError (invalid ObjectId) → 404
  if (err.name === 'CastError') {
    return res.status(404).json({
      error: 'Resource not found',
      details: { field: err.path, value: err.value },
      ...(isDev && { stack: err.stack }),
    });
  }

  // MongoDB duplicate key error → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return res.status(409).json({
      error: `Duplicate value for ${field}: '${value}' already exists`,
      details: { field, value },
      ...(isDev && { stack: err.stack }),
    });
  }

  // JWT errors → 401
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      details: {},
      ...(isDev && { stack: err.stack }),
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      details: {},
      ...(isDev && { stack: err.stack }),
    });
  }

  // Default error
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(status).json({
    error: message,
    details: {},
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
