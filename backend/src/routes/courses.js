/**
 * Course routes — mounted at /api/courses
 */
const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const roleGuard = require('../middleware/roleGuard');
const {
  getCourses,
  getCourseById,
  getCourseLessons,
  enrollInCourse,
} = require('../controllers/courseController');

const router = express.Router();

// GET /api/courses — paginated, filterable, sortable course catalog
router.get('/', authenticate, roleGuard('student'), asyncHandler(getCourses));

// GET /api/courses/:id — single course detail
router.get('/:id', authenticate, roleGuard('student'), asyncHandler(getCourseById));

// GET /api/courses/:id/lessons — ordered lesson list for a course
router.get('/:id/lessons', authenticate, roleGuard('student'), asyncHandler(getCourseLessons));

// POST /api/courses/:id/enroll — enroll authenticated student in a course
router.post('/:id/enroll', authenticate, roleGuard('student'), asyncHandler(enrollInCourse));

module.exports = router;
