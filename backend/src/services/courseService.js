/**
 * Course service — business logic for courses, lessons, and enrollments.
 */
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

const VALID_CATEGORIES = [
  'Web Development',
  'Mobile Development',
  'AI/ML',
  'Cybersecurity',
  'UI/UX Design',
  'Database Systems',
];

const VALID_SORT_FIELDS = ['enrollmentCount', 'createdAt'];

/**
 * Returns a paginated, filterable, sortable list of published courses.
 *
 * @param {{ page?: number, limit?: number, category?: string, sort?: string }} options
 * @returns {Promise<{ courses: object[], total: number, page: number, totalPages: number }>}
 */
const getCourses = async ({ page = 1, limit = 10, category, sort = 'createdAt' } = {}) => {
  // --- Clamp and validate pagination params ---
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // --- Build filter ---
  const filter = { isPublished: true };
  if (category) {
    if (!VALID_CATEGORIES.includes(category)) {
      const err = new Error(
        `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      );
      err.status = 400;
      throw err;
    }
    filter.category = category;
  }

  // --- Build sort ---
  const sortField = VALID_SORT_FIELDS.includes(sort) ? sort : 'createdAt';
  const sortObj = { [sortField]: -1 }; // always descending

  const [courses, total] = await Promise.all([
    Course.find(filter).sort(sortObj).skip(skip).limit(limitNum).lean(),
    Course.countDocuments(filter),
  ]);

  return {
    courses,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

/**
 * Returns a single course by ID.
 *
 * @param {string} courseId
 * @returns {Promise<object>}
 * @throws {Error} 404 if not found
 */
const getCourseById = async (courseId) => {
  const course = await Course.findById(courseId).lean();
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }
  return course;
};

/**
 * Returns all lessons for a course, ordered by `order` ascending.
 *
 * @param {string} courseId
 * @returns {Promise<object[]>}
 * @throws {Error} 404 if course not found
 */
const getCourseLessons = async (courseId) => {
  // Verify course exists
  const course = await Course.findById(courseId).lean();
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  const lessons = await Lesson.find({ courseId }).sort({ order: 1 }).lean();
  return lessons;
};

/**
 * Enrolls a student in a course.
 * Creates an enrollment at 0% progress and increments the course's enrollmentCount.
 *
 * @param {string} studentId
 * @param {string} courseId
 * @returns {Promise<object>} The created enrollment
 * @throws {Error} 404 if course not found
 * @throws {Error} 409 if already enrolled
 */
const enrollInCourse = async (studentId, courseId) => {
  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  // Check for duplicate enrollment
  const existing = await Enrollment.findOne({ studentId, courseId });
  if (existing) {
    const err = new Error('Already enrolled in this course');
    err.status = 409;
    throw err;
  }

  // Create enrollment
  const enrollment = await Enrollment.create({
    studentId,
    courseId,
    progressPercent: 0,
    completedLessons: [],
  });

  // Increment enrollmentCount atomically
  await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

  return enrollment.toObject();
};

/**
 * Returns a single lesson by ID, enforcing sequential order.
 * The student must have completed all lessons with a lower `order` value
 * before accessing this lesson.
 *
 * @param {string} lessonId
 * @param {string} studentId
 * @returns {Promise<object>}
 * @throws {Error} 404 if lesson not found
 * @throws {Error} 403 if student has not completed prerequisite lessons
 */
const getLessonById = async (lessonId, studentId) => {
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) {
    const err = new Error('Lesson not found');
    err.status = 404;
    throw err;
  }

  // First lesson (order === 1) is always accessible
  if (lesson.order <= 1) {
    return lesson;
  }

  // Find the student's enrollment for this course
  const enrollment = await Enrollment.findOne({
    studentId,
    courseId: lesson.courseId,
  }).lean();

  if (!enrollment) {
    const err = new Error('You are not enrolled in this course');
    err.status = 403;
    throw err;
  }

  // Get all lessons with a lower order value (prerequisites)
  const prerequisites = await Lesson.find({
    courseId: lesson.courseId,
    order: { $lt: lesson.order },
  })
    .select('_id')
    .lean();

  if (prerequisites.length === 0) {
    return lesson;
  }

  // Check that all prerequisites are in completedLessons
  const completedSet = new Set(
    enrollment.completedLessons.map((id) => id.toString())
  );

  const allCompleted = prerequisites.every((prereq) =>
    completedSet.has(prereq._id.toString())
  );

  if (!allCompleted) {
    const err = new Error(
      'You must complete all previous lessons before accessing this one'
    );
    err.status = 403;
    throw err;
  }

  return lesson;
};

/**
 * Marks a lesson as complete for a student and recalculates progress.
 * progressPercent = (completedLessons.length / totalLessons) * 100
 *
 * @param {string} lessonId
 * @param {string} studentId
 * @returns {Promise<object>} Updated enrollment
 * @throws {Error} 404 if lesson not found
 * @throws {Error} 403 if not enrolled
 */
const completeLesson = async (lessonId, studentId) => {
  const lesson = await Lesson.findById(lessonId).lean();
  if (!lesson) {
    const err = new Error('Lesson not found');
    err.status = 404;
    throw err;
  }

  const enrollment = await Enrollment.findOne({
    studentId,
    courseId: lesson.courseId,
  });

  if (!enrollment) {
    const err = new Error('You are not enrolled in this course');
    err.status = 403;
    throw err;
  }

  // Add lesson to completedLessons if not already present (idempotent)
  const alreadyCompleted = enrollment.completedLessons.some(
    (id) => id.toString() === lessonId.toString()
  );

  if (!alreadyCompleted) {
    enrollment.completedLessons.push(lessonId);
  }

  // Recalculate progress
  const totalLessons = await Lesson.countDocuments({ courseId: lesson.courseId });
  const progressPercent =
    totalLessons > 0
      ? (enrollment.completedLessons.length / totalLessons) * 100
      : 0;

  enrollment.progressPercent = Math.min(100, progressPercent);
  await enrollment.save();

  return enrollment.toObject();
};

module.exports = {
  getCourses,
  getCourseById,
  getCourseLessons,
  enrollInCourse,
  getLessonById,
  completeLesson,
  VALID_CATEGORIES,
};
