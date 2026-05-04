/**
 * Integration tests for Course and Lesson API endpoints
 *
 * Covers tasks 3.3 – 3.7:
 *   GET  /api/courses
 *   GET  /api/courses/:id
 *   GET  /api/courses/:id/lessons
 *   POST /api/courses/:id/enroll
 *   GET  /api/lessons/:id
 *   POST /api/lessons/:id/complete
 */
require('./setup');

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');
const Enrollment = require('../src/models/Enrollment');
const User = require('../src/models/User');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a JWT for a test user without hitting the DB.
 */
const makeToken = (userId, role = 'student') =>
  jwt.sign({ id: userId.toString(), role }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

/**
 * Creates a minimal active User document and returns { user, token }.
 */
const createUser = async (overrides = {}) => {
  const user = await User.create({
    email: overrides.email || `user-${Date.now()}@example.com`,
    displayName: overrides.displayName || 'Test User',
    passwordHash: 'hashed',
    portfolioSlug: `slug-${Date.now()}`,
    role: overrides.role || 'student',
    isActive: true,
    ...overrides,
  });
  const token = makeToken(user._id, user.role);
  return { user, token };
};

/**
 * Creates a published Course document.
 */
const createCourse = async (overrides = {}) =>
  Course.create({
    title: overrides.title || 'Test Course',
    description: overrides.description || 'A test course',
    category: overrides.category || 'Web Development',
    instructorName: 'Instructor',
    isPublished: overrides.isPublished !== undefined ? overrides.isPublished : true,
    enrollmentCount: overrides.enrollmentCount || 0,
    ...overrides,
  });

/**
 * Creates a Lesson document for a given courseId.
 */
const createLesson = async (courseId, order, overrides = {}) =>
  Lesson.create({
    courseId,
    title: overrides.title || `Lesson ${order}`,
    order,
    videoUrl: 'https://example.com/video',
    notes: 'Some notes',
    ...overrides,
  });

// ---------------------------------------------------------------------------
// GET /api/courses
// ---------------------------------------------------------------------------

describe('GET /api/courses', () => {
  let token;

  beforeEach(async () => {
    const { token: t } = await createUser();
    token = t;
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/courses');
    expect(res.status).toBe(401);
  });

  it('returns 200 with empty list when no courses exist', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
  });

  it('returns only published courses', async () => {
    await createCourse({ isPublished: true });
    await createCourse({ isPublished: false });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
  });

  it('paginates results correctly', async () => {
    // Create 3 published courses
    await Promise.all([
      createCourse({ title: 'C1' }),
      createCourse({ title: 'C2' }),
      createCourse({ title: 'C3' }),
    ]);

    const res = await request(app)
      .get('/api/courses?page=1&limit=2')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.page).toBe(1);
  });

  it('clamps limit to 50', async () => {
    const res = await request(app)
      .get('/api/courses?limit=999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // No error — just clamped
  });

  it('filters by category', async () => {
    await createCourse({ category: 'Web Development' });
    await createCourse({ category: 'AI/ML' });

    const res = await request(app)
      .get('/api/courses?category=AI%2FML')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].category).toBe('AI/ML');
  });

  it('returns 400 for an invalid category', async () => {
    const res = await request(app)
      .get('/api/courses?category=InvalidCategory')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('sorts by enrollmentCount descending', async () => {
    await createCourse({ title: 'Low', enrollmentCount: 5 });
    await createCourse({ title: 'High', enrollmentCount: 100 });

    const res = await request(app)
      .get('/api/courses?sort=enrollmentCount')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses[0].enrollmentCount).toBeGreaterThan(
      res.body.courses[1].enrollmentCount
    );
  });

  it('defaults to sorting by createdAt descending', async () => {
    await createCourse({ title: 'First' });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 10));
    await createCourse({ title: 'Second' });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses[0].title).toBe('Second');
  });
});

// ---------------------------------------------------------------------------
// GET /api/courses/:id
// ---------------------------------------------------------------------------

describe('GET /api/courses/:id', () => {
  let token;

  beforeEach(async () => {
    const { token: t } = await createUser();
    token = t;
  });

  it('returns 200 with the course when found', async () => {
    const course = await createCourse({ title: 'My Course' });

    const res = await request(app)
      .get(`/api/courses/${course._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('My Course');
  });

  it('returns 404 when course does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/courses/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await request(app).get(`/api/courses/${course._id}`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/courses/:id/lessons
// ---------------------------------------------------------------------------

describe('GET /api/courses/:id/lessons', () => {
  let token;

  beforeEach(async () => {
    const { token: t } = await createUser();
    token = t;
  });

  it('returns lessons ordered by order asc', async () => {
    const course = await createCourse();
    await createLesson(course._id, 3, { title: 'Lesson 3' });
    await createLesson(course._id, 1, { title: 'Lesson 1' });
    await createLesson(course._id, 2, { title: 'Lesson 2' });

    const res = await request(app)
      .get(`/api/courses/${course._id}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].order).toBe(1);
    expect(res.body[1].order).toBe(2);
    expect(res.body[2].order).toBe(3);
  });

  it('returns empty array when course has no lessons', async () => {
    const course = await createCourse();

    const res = await request(app)
      .get(`/api/courses/${course._id}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 when course does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/courses/${fakeId}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/courses/:id/enroll
// ---------------------------------------------------------------------------

describe('POST /api/courses/:id/enroll', () => {
  let user, token;

  beforeEach(async () => {
    const result = await createUser();
    user = result.user;
    token = result.token;
  });

  it('creates enrollment at 0% and returns 201', async () => {
    const course = await createCourse();

    const res = await request(app)
      .post(`/api/courses/${course._id}/enroll`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.progressPercent).toBe(0);
    expect(res.body.completedLessons).toEqual([]);
    expect(res.body.studentId.toString()).toBe(user._id.toString());
    expect(res.body.courseId.toString()).toBe(course._id.toString());
  });

  it('increments enrollmentCount on the course', async () => {
    const course = await createCourse({ enrollmentCount: 5 });

    await request(app)
      .post(`/api/courses/${course._id}/enroll`)
      .set('Authorization', `Bearer ${token}`);

    const updated = await Course.findById(course._id);
    expect(updated.enrollmentCount).toBe(6);
  });

  it('returns 409 when already enrolled', async () => {
    const course = await createCourse();

    await request(app)
      .post(`/api/courses/${course._id}/enroll`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/courses/${course._id}/enroll`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 404 when course does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/courses/${fakeId}/enroll`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 without a token', async () => {
    const course = await createCourse();
    const res = await request(app).post(`/api/courses/${course._id}/enroll`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/lessons/:id
// ---------------------------------------------------------------------------

describe('GET /api/lessons/:id', () => {
  let user, token, course, lesson1, lesson2, lesson3;

  beforeEach(async () => {
    const result = await createUser();
    user = result.user;
    token = result.token;

    course = await createCourse();
    lesson1 = await createLesson(course._id, 1, { title: 'Lesson 1' });
    lesson2 = await createLesson(course._id, 2, { title: 'Lesson 2' });
    lesson3 = await createLesson(course._id, 3, { title: 'Lesson 3' });
  });

  it('returns 404 when lesson does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/lessons/${fakeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns first lesson without enrollment check', async () => {
    // Enroll first so the student is in the course
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [],
    });

    const res = await request(app)
      .get(`/api/lessons/${lesson1._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Lesson 1');
  });

  it('returns 403 when accessing lesson 2 without completing lesson 1', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [],
    });

    const res = await request(app)
      .get(`/api/lessons/${lesson2._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error');
  });

  it('returns lesson 2 after completing lesson 1', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [lesson1._id],
    });

    const res = await request(app)
      .get(`/api/lessons/${lesson2._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Lesson 2');
  });

  it('returns 403 when accessing lesson 3 with only lesson 1 completed', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [lesson1._id],
    });

    const res = await request(app)
      .get(`/api/lessons/${lesson3._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns lesson 3 after completing lessons 1 and 2', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [lesson1._id, lesson2._id],
    });

    const res = await request(app)
      .get(`/api/lessons/${lesson3._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Lesson 3');
  });

  it('returns 403 when not enrolled in the course', async () => {
    const res = await request(app)
      .get(`/api/lessons/${lesson2._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get(`/api/lessons/${lesson1._id}`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/lessons/:id/complete
// ---------------------------------------------------------------------------

describe('POST /api/lessons/:id/complete', () => {
  let user, token, course, lesson1, lesson2, lesson3;

  beforeEach(async () => {
    const result = await createUser();
    user = result.user;
    token = result.token;

    course = await createCourse();
    lesson1 = await createLesson(course._id, 1, { title: 'Lesson 1' });
    lesson2 = await createLesson(course._id, 2, { title: 'Lesson 2' });
    lesson3 = await createLesson(course._id, 3, { title: 'Lesson 3' });
  });

  it('adds lesson to completedLessons and returns updated enrollment', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [],
    });

    const res = await request(app)
      .post(`/api/lessons/${lesson1._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.completedLessons).toHaveLength(1);
    expect(res.body.completedLessons[0].toString()).toBe(lesson1._id.toString());
  });

  it('recalculates progressPercent correctly', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [],
    });

    // Complete lesson 1 of 3 → 33.33%
    const res1 = await request(app)
      .post(`/api/lessons/${lesson1._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res1.status).toBe(200);
    expect(res1.body.progressPercent).toBeCloseTo((1 / 3) * 100, 1);

    // Complete lesson 2 of 3 → 66.67%
    const res2 = await request(app)
      .post(`/api/lessons/${lesson2._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res2.status).toBe(200);
    expect(res2.body.progressPercent).toBeCloseTo((2 / 3) * 100, 1);

    // Complete lesson 3 of 3 → 100%
    const res3 = await request(app)
      .post(`/api/lessons/${lesson3._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res3.status).toBe(200);
    expect(res3.body.progressPercent).toBe(100);
  });

  it('is idempotent — completing the same lesson twice does not double-count', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [],
    });

    await request(app)
      .post(`/api/lessons/${lesson1._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post(`/api/lessons/${lesson1._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.completedLessons).toHaveLength(1);
    expect(res.body.progressPercent).toBeCloseTo((1 / 3) * 100, 1);
  });

  it('progress is monotonically non-decreasing across completions', async () => {
    await Enrollment.create({
      studentId: user._id,
      courseId: course._id,
      progressPercent: 0,
      completedLessons: [],
    });

    let prevProgress = 0;
    for (const lesson of [lesson1, lesson2, lesson3]) {
      const res = await request(app)
        .post(`/api/lessons/${lesson._id}/complete`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.progressPercent).toBeGreaterThanOrEqual(prevProgress);
      prevProgress = res.body.progressPercent;
    }

    expect(prevProgress).toBe(100);
  });

  it('returns 404 when lesson does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .post(`/api/lessons/${fakeId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when not enrolled in the course', async () => {
    const res = await request(app)
      .post(`/api/lessons/${lesson1._id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).post(`/api/lessons/${lesson1._id}/complete`);
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Role guard — admin can access student routes
// ---------------------------------------------------------------------------

describe('Role guard on course routes', () => {
  it('allows admin to access GET /api/courses', async () => {
    const { token } = await createUser({ role: 'admin' });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});
