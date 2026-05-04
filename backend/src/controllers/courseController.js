/**
 * Course controller — thin HTTP layer that delegates to courseService.
 */
const courseService = require('../services/courseService');

/**
 * GET /api/courses
 *
 * Query params: page, limit, category, sort
 * Response 200: { courses, total, page, totalPages }
 * Response 400: invalid category or sort
 */
const getCourses = async (req, res, next) => {
  try {
    const { page, limit, category, sort } = req.query;
    const result = await courseService.getCourses({ page, limit, category, sort });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * GET /api/courses/:id
 *
 * Response 200: course object
 * Response 404: course not found
 */
const getCourseById = async (req, res, next) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    return res.status(200).json(course);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * GET /api/courses/:id/lessons
 *
 * Response 200: array of lessons ordered by `order` asc
 * Response 404: course not found
 */
const getCourseLessons = async (req, res, next) => {
  try {
    const lessons = await courseService.getCourseLessons(req.params.id);
    return res.status(200).json(lessons);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/courses/:id/enroll
 *
 * Response 201: enrollment object
 * Response 404: course not found
 * Response 409: already enrolled
 */
const enrollInCourse = async (req, res, next) => {
  try {
    const enrollment = await courseService.enrollInCourse(
      req.user.id,
      req.params.id
    );
    return res.status(201).json(enrollment);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * GET /api/lessons/:id
 *
 * Response 200: lesson object
 * Response 403: prerequisite lessons not completed or not enrolled
 * Response 404: lesson not found
 */
const getLessonById = async (req, res, next) => {
  try {
    const lesson = await courseService.getLessonById(req.params.id, req.user.id);
    return res.status(200).json(lesson);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/lessons/:id/complete
 *
 * Response 200: updated enrollment object
 * Response 403: not enrolled
 * Response 404: lesson not found
 */
const completeLesson = async (req, res, next) => {
  try {
    const enrollment = await courseService.completeLesson(req.params.id, req.user.id);
    return res.status(200).json(enrollment);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  getCourseLessons,
  enrollInCourse,
  getLessonById,
  completeLesson,
};
