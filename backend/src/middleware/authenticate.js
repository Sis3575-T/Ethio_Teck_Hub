/**
 * JWT authentication middleware.
 *
 * Extracts the Bearer token from the Authorization header, verifies it
 * against JWT_SECRET, checks that the user account is still active, and
 * attaches { id, role } to req.user before calling next().
 *
 * On any failure it responds with 401 Unauthorized.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = async (req, res, next) => {
  try {
    // --- Extract token from "Authorization: Bearer <token>" header ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    // --- Verify signature and expiry ---
    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    // --- Check that the user account is still active ---
    const user = await User.findById(decoded.id).select('isActive role');
    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // --- Attach minimal payload to request ---
    req.user = { id: decoded.id, role: decoded.role };

    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = authenticate;
