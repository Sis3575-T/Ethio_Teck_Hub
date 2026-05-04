/**
 * Quiz controller — thin HTTP layer that delegates to quizService.
 */
const quizService = require('../services/quizService');

/**
 * GET /api/quizzes/history
 *
 * Returns all QuizAttempts for the authenticated student, ordered by submittedAt desc.
 * Response 200: array of attempt objects
 */
const getQuizHistory = async (req, res, next) => {
  try {
    const attempts = await quizService.getQuizHistory(req.user.id);
    return res.status(200).json(attempts);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * GET /api/quizzes/:courseId
 *
 * Returns all quizzes for a course, stripping correctIndex for security.
 * Response 200: array of quiz objects (without correctIndex)
 * Response 404: course not found
 */
const getQuizzesByCourse = async (req, res, next) => {
  try {
    const quizzes = await quizService.getQuizzesByCourse(req.params.courseId);
    return res.status(200).json(quizzes);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

/**
 * POST /api/quizzes/:id/submit
 *
 * Grades the quiz attempt and records it.
 * Body: { answers: [...], timeTakenSeconds: number }
 * Response 200: { score, attempt, results: [{ questionIndex, correct, correctAnswer }] }
 * Response 400: missing answers
 * Response 404: quiz not found
 */
const submitQuiz = async (req, res, next) => {
  try {
    const { answers, timeTakenSeconds } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an array' });
    }

    const result = await quizService.submitQuiz(
      req.params.id,
      req.user.id,
      answers,
      timeTakenSeconds
    );
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    return next(err);
  }
};

module.exports = {
  getQuizHistory,
  getQuizzesByCourse,
  submitQuiz,
};
