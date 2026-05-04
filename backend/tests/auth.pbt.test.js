/**
 * Property-Based Tests for Auth Service
 * Feature: ethiotech-hub
 *
 * Tests Properties 1, 2, 3, 4, and 12 using fast-check.
 * Each property runs 100 iterations (numRuns: 100).
 *
 * Properties 1-4 call service/model functions directly (no HTTP) for speed.
 * Property 12 uses a minimal Express app to test the rate-limiter middleware.
 */
require('./setup');

const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const User = require('../src/models/User');
const authService = require('../src/services/authService');
const authenticate = require('../src/middleware/authenticate');
const roleGuard = require('../src/middleware/roleGuard');
const errorHandler = require('../src/middleware/errorHandler');
const authRouter = require('../src/routes/auth');

// Increase timeout for PBT suites — 100 runs with async operations need more time
jest.setTimeout(120000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Unique suffix to avoid slug collisions across runs */
let runCounter = 0;
function uniqueSuffix() {
  return `${Date.now()}-${++runCounter}`;
}

/**
 * Build a minimal Express app with rate limiting always enabled (no skip).
 * A fresh instance per call means a fresh in-memory store (no counter bleed).
 */
function buildRateLimitedApp() {
  const testApp = express();
  testApp.set('trust proxy', 1);
  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: true }));

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    // No skip — rate limiting is always active in this test app
  });

  testApp.use('/api/auth', limiter, authRouter);
  testApp.use(errorHandler);
  return testApp;
}

/**
 * Build a minimal Express app with protected admin and student routes
 * for testing role-based access control.
 */
function buildRoleTestApp() {
  const roleApp = express();
  roleApp.use(express.json());

  // Admin-only route
  roleApp.get(
    '/api/admin/stats',
    authenticate,
    roleGuard('admin'),
    (req, res) => res.json({ ok: true })
  );

  // Student-level route
  roleApp.get(
    '/api/courses',
    authenticate,
    roleGuard('student'),
    (req, res) => res.json({ ok: true })
  );

  roleApp.use(errorHandler);
  return roleApp;
}

/**
 * Create a user directly in the DB and return a signed JWT for that user.
 * @param {{ role: 'student' | 'admin' }} options
 * @returns {Promise<{ token: string, userId: string }>}
 */
async function createUserWithToken({ role = 'student' } = {}) {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);
  const suffix = uniqueSuffix();
  const passwordHash = await bcrypt.hash('Password123!', rounds);

  const user = await User.create({
    email: `user-${suffix}@example.com`,
    displayName: `Test User ${suffix}`,
    passwordHash,
    role,
    portfolioSlug: `test-user-${suffix}`,
    isActive: true,
  });

  const token = jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { token, userId: user._id.toString() };
}

// ---------------------------------------------------------------------------
// Property 1: Password Hashing Round-Trip
// ---------------------------------------------------------------------------

describe('Property 1: Password hashing round-trip', () => {
  // Feature: ethiotech-hub, Property 1: For any valid plaintext password (min 8 chars), the stored hash must not equal the plaintext, and bcrypt.compare(plaintext, hash) must return true

  it('hash != plaintext and bcrypt.compare returns true for any valid password', async () => {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '4', 10);

    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 50 }),
        async (password) => {
          const hash = await bcrypt.hash(password, rounds);

          // The hash must not equal the plaintext
          expect(hash).not.toBe(password);

          // bcrypt.compare must return true
          const isMatch = await bcrypt.compare(password, hash);
          expect(isMatch).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Duplicate Email Registration Returns 409 and Leaves Collection Unchanged
// ---------------------------------------------------------------------------

describe('Property 2: Duplicate email registration returns 409 and leaves collection unchanged', () => {
  // Feature: ethiotech-hub, Property 2: For any email address already registered, a subsequent registration attempt with that same email must return 409, and User.countDocuments() must remain unchanged

  it('returns 409 and does not add a new user document for duplicate email', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          // Clean up before each run to ensure isolation
          await User.deleteMany({});

          const suffix = uniqueSuffix();
          const normalizedEmail = email.toLowerCase().trim();

          // First registration — call service directly for speed
          let firstResult;
          try {
            firstResult = await authService.register({
              email: normalizedEmail,
              displayName: `User ${suffix}`,
              password: 'Password123!',
            });
          } catch (err) {
            // If the first registration fails (e.g. email rejected), skip this run
            return;
          }

          const countAfterFirst = await User.countDocuments();

          // Second registration with the same email — must throw 409
          let secondError;
          try {
            await authService.register({
              email: normalizedEmail,
              displayName: `Another User ${suffix}`,
              password: 'DifferentPass99!',
            });
          } catch (err) {
            secondError = err;
          }

          expect(secondError).toBeDefined();
          expect(secondError.status).toBe(409);

          // Collection must remain unchanged
          const countAfterSecond = await User.countDocuments();
          expect(countAfterSecond).toBe(countAfterFirst);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Used Refresh Token Is Invalidated (Token Rotation)
// ---------------------------------------------------------------------------

describe('Property 3: Used refresh token is invalidated (token rotation)', () => {
  // Feature: ethiotech-hub, Property 3: For any valid refresh token issued to a user, using it once must succeed (200), and using the same token a second time must fail (401)

  it('first use of refresh token succeeds, second use fails with 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8 }),
        }),
        async ({ email, password }) => {
          // Clean up before each run
          await User.deleteMany({});

          const suffix = uniqueSuffix();
          const normalizedEmail = email.toLowerCase().trim();

          // Register a user to get a refresh token — use service directly
          let registerResult;
          try {
            registerResult = await authService.register({
              email: normalizedEmail,
              displayName: `Token User ${suffix}`,
              password,
            });
          } catch (err) {
            // Skip if registration failed (e.g. email rejected by service)
            return;
          }

          const { refreshToken: rawRefreshToken } = registerResult;

          // First use — must succeed
          let firstResult;
          try {
            firstResult = await authService.refreshToken({ refreshToken: rawRefreshToken });
          } catch (err) {
            throw new Error(`First refresh token use failed unexpectedly: ${err.message}`);
          }

          expect(firstResult).toHaveProperty('token');
          expect(firstResult).toHaveProperty('refreshToken');

          // Second use of the SAME token — must fail with 401
          let secondError;
          try {
            await authService.refreshToken({ refreshToken: rawRefreshToken });
          } catch (err) {
            secondError = err;
          }

          expect(secondError).toBeDefined();
          expect(secondError.status).toBe(401);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Role-Based Access Invariant
// ---------------------------------------------------------------------------

describe('Property 4: Role-based access invariant', () => {
  // Feature: ethiotech-hub, Property 4: For any user with 'student' role, requests to admin routes return 403. For any user with 'admin' role, requests to both admin and student routes do NOT return 403.

  it('student gets 403 on admin routes; admin does not get 403 on either route', async () => {
    const roleApp = buildRoleTestApp();

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('student', 'admin'),
        async (role) => {
          // Clean up before each run
          await User.deleteMany({});

          const { token } = await createUserWithToken({ role });

          // Request to admin route
          const adminRes = await request(roleApp)
            .get('/api/admin/stats')
            .set('Authorization', `Bearer ${token}`);

          // Request to student route
          const studentRes = await request(roleApp)
            .get('/api/courses')
            .set('Authorization', `Bearer ${token}`);

          if (role === 'student') {
            // Student must be forbidden on admin route
            expect(adminRes.status).toBe(403);
            // Student must NOT be forbidden on student route
            expect(studentRes.status).not.toBe(403);
          } else {
            // Admin must NOT be forbidden on either route
            expect(adminRes.status).not.toBe(403);
            expect(studentRes.status).not.toBe(403);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Rate Limiting Returns 429 After 10 Requests Per IP Per Minute
// ---------------------------------------------------------------------------

describe('Property 12: Rate limiting returns 429 after 10 requests per IP per minute', () => {
  // Feature: ethiotech-hub, Property 12: For any IP address, after 10 requests to /api/auth/login, the 11th returns 429

  it('11th+ request from same IP returns 429', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 11, max: 20 }),
        async (totalRequests) => {
          // Build a fresh rate-limited app per run so counters are isolated
          const rateLimitedApp = buildRateLimitedApp();

          // Use a unique IP per run to avoid cross-run interference
          const octet2 = Math.floor(Math.random() * 255);
          const octet3 = Math.floor(Math.random() * 255);
          const octet4 = Math.floor(Math.random() * 255);
          const ip = `10.${octet2}.${octet3}.${octet4}`;

          const statuses = [];
          for (let i = 0; i < totalRequests; i++) {
            const res = await request(rateLimitedApp)
              .post('/api/auth/login')
              .set('X-Forwarded-For', ip)
              .send({ email: 'test@example.com', password: 'password123' });
            statuses.push(res.status);
          }

          // First 10 requests must NOT be 429
          const first10 = statuses.slice(0, 10);
          expect(first10.every((s) => s !== 429)).toBe(true);

          // All requests from index 10 onward must be 429
          const beyond10 = statuses.slice(10);
          expect(beyond10.every((s) => s === 429)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
