/**
 * Property-Based Tests for Enrollment Progress
 * Feature: ethiotech-hub
 *
 * Tests Property 5 using fast-check.
 * Runs 100 iterations (numRuns: 100).
 *
 * Calls courseService.completeLesson() directly (no HTTP) for speed.
 */
require('./setup');

const fc = require('fast-check');
const mongoose = require('mongoose');

const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');
const Enrollment = require('../src/models/Enrollment');
const User = require('../src/models/User');
const courseService = require('../src/services/courseService');

// Increase timeout for PBT suites — 100 runs with async DB operations need more time
jest.setTimeout(120000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let runCounter = 0;
function uniqueSuffix() {
  return `${Date.now()}-${++runCounter}`;
}

/**
 * Creates a minimal student user in the DB and returns its _id.
 */
async function createStudent() {
  const suffix = uniqueSuffix();
  const user = await User.create({
    email: `student-${suffix}@example.com`,
    displayName: `Student ${suffix}`,
    passwordHash: '$2a$04$placeholder',
    role: 'student',
    portfolioSlug: `student-${suffix}`,
    isActive: true,
  });
  return user._id;
}

/**
 * Creates a published course with `numLessons` lessons and returns
 * { courseId, lessonIds } where lessonIds are ordered by lesson.order (1-based).
 */
async function createCourseWithLessons(numLessons) {
  const suffix = uniqueSuffix();
  const course = await Course.create({
    title: `Course ${suffix}`,
    description: 'Test course',
    category: 'Web Development',
    isPublished: true,
  });

  const lessonDocs = [];
  for (let i = 1; i <= numLessons; i++) {
    const lesson = await Lesson.create({
      courseId: course._id,
      title: `Lesson ${i}`,
      order: i,
    });
    lessonDocs.push(lesson);
  }

  // Sort by order to ensure consistent ordering
  lessonDocs.sort((a, b) => a.order - b.order);
  const lessonIds = lessonDocs.map((l) => l._id);

  return { courseId: course._id, lessonIds };
}

// ---------------------------------------------------------------------------
// Property 5: Enrollment Progress is Monotonically Non-Decreasing
// ---------------------------------------------------------------------------

describe('Property 5: Enrollment progress is monotonically non-decreasing', () => {
  // Feature: ethiotech-hub, Property 5: For any enrollment and any arbitrary sequence of distinct lesson completions within that course, the progressPercent value after each completion must be >= the value before that completion, and must equal (completedLessons.length / totalLessons) * 100 after each step.
  // Validates: Requirements 5.3, 5.5

  it('progressPercent is monotonically non-decreasing and matches formula for any completion sequence', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate an arbitrary number of lessons (2-10)
        fc.integer({ min: 2, max: 10 }),
        async (numLessons) => {
          // Clean up before each run to ensure isolation
          const collections = mongoose.connection.collections;
          for (const key in collections) {
            await collections[key].deleteMany({});
          }

          // Set up: create student, course with lessons, and enrollment
          const studentId = await createStudent();
          const { courseId, lessonIds } = await createCourseWithLessons(numLessons);

          // Enroll the student
          await Enrollment.create({
            studentId,
            courseId,
            progressPercent: 0,
            completedLessons: [],
          });

          // Generate a shuffled permutation of lesson indices using fc.shuffledSubarray
          // We use a fresh arbitrary inside the async property to get a random permutation
          const indices = Array.from({ length: numLessons }, (_, i) => i);
          // Shuffle using Fisher-Yates for deterministic behavior within the run
          const shuffled = [...indices];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          let previousProgress = 0;
          let completedCount = 0;

          for (const idx of shuffled) {
            const lessonId = lessonIds[idx];

            // Complete the lesson
            const updatedEnrollment = await courseService.completeLesson(
              lessonId.toString(),
              studentId.toString()
            );

            completedCount += 1;

            const { progressPercent } = updatedEnrollment;

            // Property: progressPercent must be >= previous value (monotonically non-decreasing)
            expect(progressPercent).toBeGreaterThanOrEqual(previousProgress);

            // Property: progressPercent must equal (completedLessons.length / totalLessons) * 100
            const expectedProgress = (completedCount / numLessons) * 100;
            expect(progressPercent).toBeCloseTo(expectedProgress, 10);

            previousProgress = progressPercent;
          }

          // After all lessons are completed, progress must be 100%
          expect(previousProgress).toBeCloseTo(100, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('completing the same lesson twice does not decrease or inflate progress', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        async (numLessons) => {
          // Clean up before each run
          const collections = mongoose.connection.collections;
          for (const key in collections) {
            await collections[key].deleteMany({});
          }

          const studentId = await createStudent();
          const { courseId, lessonIds } = await createCourseWithLessons(numLessons);

          await Enrollment.create({
            studentId,
            courseId,
            progressPercent: 0,
            completedLessons: [],
          });

          // Complete the first lesson
          const afterFirst = await courseService.completeLesson(
            lessonIds[0].toString(),
            studentId.toString()
          );
          const progressAfterFirst = afterFirst.progressPercent;

          // Complete the same lesson again (idempotent)
          const afterDuplicate = await courseService.completeLesson(
            lessonIds[0].toString(),
            studentId.toString()
          );
          const progressAfterDuplicate = afterDuplicate.progressPercent;

          // Progress must not change on duplicate completion
          expect(progressAfterDuplicate).toBeCloseTo(progressAfterFirst, 10);

          // Progress must equal (1 / numLessons) * 100 (only 1 unique lesson completed)
          const expectedProgress = (1 / numLessons) * 100;
          expect(progressAfterDuplicate).toBeCloseTo(expectedProgress, 10);
        }
      ),
      { numRuns: 100 }
    );
  });
});
