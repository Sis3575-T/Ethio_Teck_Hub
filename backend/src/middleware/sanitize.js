const xss = require('xss');

/**
 * Recursively sanitizes all string values in an object to prevent XSS injection.
 * @param {*} value - The value to sanitize (object, array, string, or other)
 * @returns {*} The sanitized value
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return xss(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      sanitized[key] = sanitizeValue(value[key]);
    }
    return sanitized;
  }
  return value;
}

/**
 * Express middleware that sanitizes req.body, req.params, and req.query
 * to prevent XSS injection attacks. Applied globally to all routes.
 */
function sanitizeMiddleware(req, res, next) {
  // Sanitize req.body (parsed JSON or urlencoded)
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  // Sanitize req.params
  if (req.params) {
    for (const key of Object.keys(req.params)) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = xss(req.params[key]);
      }
    }
  }

  // Sanitize req.query by creating a new object (req.query is a getter-only property)
  if (req.query) {
    const sanitizedQuery = {};
    for (const key of Object.keys(req.query)) {
      sanitizedQuery[key] = sanitizeValue(req.query[key]);
    }
    // Override the query getter with a plain object
    Object.defineProperty(req, 'query', {
      value: sanitizedQuery,
      writable: true,
      configurable: true,
    });
  }

  next();
}

module.exports = sanitizeMiddleware;
