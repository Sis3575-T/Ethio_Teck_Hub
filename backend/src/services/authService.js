/**
 * Authentication service — handles registration and token generation.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const User = require('../models/User');
const config = require('../config');
const { sendPasswordResetEmail } = require('./emailService');

/**
 * Generates a URL-safe portfolio slug from a display name.
 * Format: "<slugified-name>-<6-char-nanoid>"
 * e.g. "John Doe" → "john-doe-abc123"
 * @param {string} displayName
 * @returns {string}
 */
const generatePortfolioSlug = (displayName) => {
  const base = displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (except spaces/hyphens)
    .replace(/\s+/g, '-')            // spaces → hyphens
    .replace(/-+/g, '-')             // collapse consecutive hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens

  const suffix = nanoid(6);
  return base ? `${base}-${suffix}` : suffix;
};

/**
 * Signs a JWT access token for the given payload.
 * Reads JWT_SECRET from process.env at call time to support test environments.
 * @param {{ id: string, role: string }} payload
 * @returns {string}
 */
const signAccessToken = (payload) => {
  const secret = process.env.JWT_SECRET || config.jwt.secret;
  const expiresIn = process.env.JWT_EXPIRES_IN || config.jwt.expiresIn || '24h';
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Generates a random refresh token string, hashes it with bcrypt,
 * and returns both the raw token and the hash.
 * @returns {Promise<{ raw: string, hash: string }>}
 */
const generateRefreshToken = async () => {
  const raw = nanoid(64);
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const hash = await bcrypt.hash(raw, rounds);
  return { raw, hash };
};

/**
 * Authenticates a user by email and password.
 *
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ token: string, refreshToken: string, user: object }>}
 * @throws {Error} with status 400 if email or password is missing
 * @throws {Error} with status 401 if credentials are invalid or account is deactivated
 */
const login = async ({ email, password }) => {
  // --- Input validation ---
  if (!email || typeof email !== 'string') {
    const err = new Error('email is required');
    err.status = 400;
    throw err;
  }
  if (!password || typeof password !== 'string') {
    const err = new Error('password is required');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // --- Find user by email (case-insensitive via stored lowercase) ---
  const user = await User.findOne({ email: normalizedEmail });

  // --- Verify credentials — do NOT reveal which field is wrong ---
  if (!user) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    const err = new Error('Invalid credentials');
    err.status = 401;
    throw err;
  }

  // --- Check account status ---
  if (user.isActive === false) {
    const err = new Error('Account deactivated');
    err.status = 401;
    throw err;
  }

  // --- Generate new tokens ---
  const { raw: rawRefreshToken, hash: refreshTokenHash } = await generateRefreshToken();

  // --- Persist hashed refresh token ---
  user.refreshToken = refreshTokenHash;
  await user.save();

  // --- Sign JWT ---
  const token = signAccessToken({ id: user._id.toString(), role: user.role });

  return {
    token,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      portfolioSlug: user.portfolioSlug,
    },
  };
};

/**
 * Registers a new student account.
 *
 * @param {{ email: string, displayName: string, password: string }} data
 * @returns {Promise<{ token: string, refreshToken: string, user: object }>}
 * @throws {Error} with status 409 if email already exists
 * @throws {Error} with status 400 if validation fails
 */
const register = async ({ email, displayName, password }) => {
  // --- Input validation ---
  if (!email || typeof email !== 'string') {
    const err = new Error('email is required');
    err.status = 400;
    throw err;
  }
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    const err = new Error('displayName is required');
    err.status = 400;
    throw err;
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    const err = new Error('password must be at least 8 characters');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // --- Duplicate email check ---
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  // --- Hash password (10 rounds as per task spec) ---
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  // --- Generate portfolio slug ---
  const portfolioSlug = generatePortfolioSlug(displayName);

  // --- Generate refresh token ---
  const { raw: rawRefreshToken, hash: refreshTokenHash } = await generateRefreshToken();

  // --- Persist user ---
  const user = await User.create({
    email: normalizedEmail,
    displayName: displayName.trim(),
    passwordHash,
    portfolioSlug,
    refreshToken: refreshTokenHash,
  });

  // --- Sign JWT ---
  const token = signAccessToken({ id: user._id.toString(), role: user.role });

  return {
    token,
    refreshToken: rawRefreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      portfolioSlug: user.portfolioSlug,
    },
  };
};

/**
 * Rotates a refresh token: verifies the raw token against stored hashes,
 * issues a new JWT and refresh token, and invalidates the old one.
 *
 * @param {{ refreshToken: string }} data
 * @returns {Promise<{ token: string, refreshToken: string }>}
 * @throws {Error} with status 400 if refreshToken is missing
 * @throws {Error} with status 401 if no matching user found or account is deactivated
 */
const refreshToken = async ({ refreshToken: rawToken }) => {
  // --- Input validation ---
  if (!rawToken || typeof rawToken !== 'string') {
    const err = new Error('refreshToken is required');
    err.status = 400;
    throw err;
  }

  // --- Find all users that have a stored refresh token hash ---
  // We must compare the raw token against each stored hash (bcrypt.compare).
  // To avoid a full-collection scan on every request, we fetch only users
  // that have a non-null refreshToken field.
  const candidates = await User.find({ refreshToken: { $ne: null } }).select(
    '+refreshToken +isActive +role'
  );

  let matchedUser = null;
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(rawToken, candidate.refreshToken);
    if (isMatch) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    const err = new Error('Invalid refresh token');
    err.status = 401;
    throw err;
  }

  // --- Check account status ---
  if (matchedUser.isActive === false) {
    const err = new Error('Account deactivated');
    err.status = 401;
    throw err;
  }

  // --- Generate new token pair ---
  const { raw: newRawRefreshToken, hash: newRefreshTokenHash } = await generateRefreshToken();

  // --- Rotate: replace old hash with new hash (invalidates old token) ---
  matchedUser.refreshToken = newRefreshTokenHash;
  await matchedUser.save();

  // --- Sign new JWT ---
  const token = signAccessToken({ id: matchedUser._id.toString(), role: matchedUser.role });

  return {
    token,
    refreshToken: newRawRefreshToken,
  };
};

/**
 * Initiates a password reset flow for the given email address.
 *
 * Security note: always returns successfully regardless of whether the email
 * is registered, to prevent user enumeration attacks.
 *
 * If the email IS registered:
 *   - Generates a random reset token (raw)
 *   - Hashes the token with bcrypt and stores it in user.resetToken
 *   - Sets user.resetTokenExpiry to 60 minutes from now
 *   - Sends an email containing the raw token
 *
 * If the email is NOT registered:
 *   - Returns without any DB change or email
 *
 * @param {{ email: string }} data
 * @returns {Promise<void>}
 * @throws {Error} with status 400 if email is missing or not a string
 */
const forgotPassword = async ({ email }) => {
  // --- Input validation ---
  if (!email || typeof email !== 'string') {
    const err = new Error('email is required');
    err.status = 400;
    throw err;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // --- Look up user — do NOT reveal whether the address exists ---
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    // Return silently — do not reveal that the email is not registered
    return;
  }

  // --- Generate raw reset token ---
  const rawToken = nanoid(64);

  // --- Hash the token before storing ---
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const tokenHash = await bcrypt.hash(rawToken, rounds);

  // --- Store hash + expiry (60 minutes from now) ---
  user.resetToken = tokenHash;
  user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  // --- Send email with the raw token ---
  await sendPasswordResetEmail({ to: user.email, resetToken: rawToken });
};

/**
 * Resets a user's password using a valid reset token.
 *
 * Flow:
 *   1. Find all users with a non-null resetToken whose resetTokenExpiry is in the future.
 *   2. Use bcrypt.compare to verify the raw token against each stored hash.
 *   3. If no match is found → 400 "Invalid or expired reset token".
 *   4. Validate newPassword length (≥ 8 chars) → 400 if too short.
 *   5. Hash the new password, update user.passwordHash.
 *   6. Clear user.resetToken and user.resetTokenExpiry (invalidate token).
 *
 * @param {{ token: string, newPassword: string }} data
 * @returns {Promise<void>}
 * @throws {Error} with status 400 if token is invalid/expired or newPassword is too short
 */
const resetPassword = async ({ token, newPassword }) => {
  // --- Input validation ---
  if (!token || typeof token !== 'string') {
    const err = new Error('token is required');
    err.status = 400;
    throw err;
  }
  if (!newPassword || typeof newPassword !== 'string') {
    const err = new Error('newPassword is required');
    err.status = 400;
    throw err;
  }

  // --- Find candidates with a non-expired reset token ---
  const candidates = await User.find({
    resetToken: { $ne: null },
    resetTokenExpiry: { $gt: new Date() },
  });

  // --- Verify the raw token against each stored hash ---
  let matchedUser = null;
  for (const candidate of candidates) {
    const isMatch = await bcrypt.compare(token, candidate.resetToken);
    if (isMatch) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    const err = new Error('Invalid or expired reset token');
    err.status = 400;
    throw err;
  }

  // --- Validate new password length ---
  if (newPassword.length < 8) {
    const err = new Error('password must be at least 8 characters');
    err.status = 400;
    throw err;
  }

  // --- Hash the new password ---
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const newPasswordHash = await bcrypt.hash(newPassword, rounds);

  // --- Update user: new password hash, clear reset token fields ---
  matchedUser.passwordHash = newPasswordHash;
  matchedUser.resetToken = null;
  matchedUser.resetTokenExpiry = null;
  await matchedUser.save();
};

module.exports = {
  register,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  generatePortfolioSlug,
  signAccessToken,
  generateRefreshToken,
};
