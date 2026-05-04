/**
 * Auth controller — thin HTTP layer that delegates to authService.
 */
const authService = require('../services/authService');

/**
 * POST /api/auth/refresh
 *
 * Body: { refreshToken }
 * Response 200: { token, refreshToken }
 * Response 400: missing refreshToken field
 * Response 401: invalid/expired/already-used refresh token, or deactivated account
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken({ refreshToken });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/auth/register
 *
 * Body: { email, displayName, password }
 * Response 201: { token, refreshToken, user: { id, email, displayName, role, portfolioSlug } }
 * Response 400: validation error
 * Response 409: email already exists
 */
const register = async (req, res, next) => {
  try {
    const { email, displayName, password } = req.body;
    const result = await authService.register({ email, displayName, password });
    return res.status(201).json(result);
  } catch (err) {
    // Forward errors with explicit status codes to the global error handler
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/auth/login
 *
 * Body: { email, password }
 * Response 200: { token, refreshToken, user: { id, email, displayName, role, portfolioSlug } }
 * Response 400: missing fields
 * Response 401: invalid credentials or account deactivated
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/auth/forgot-password
 *
 * Body: { email }
 * Response 200: always (does not reveal whether email is registered)
 * Response 400: missing email field
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword({ email });
    return res.status(200).json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/auth/reset-password
 *
 * Body: { token, newPassword }
 * Response 200: { message: "Password reset successful" }
 * Response 400: invalid/expired token, password too short, or missing fields
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword({ token, newPassword });
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

module.exports = { register, login, refresh, forgotPassword, resetPassword };
