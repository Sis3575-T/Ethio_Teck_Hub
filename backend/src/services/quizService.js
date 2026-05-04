/**
 * Quiz service — business logic for quiz retrieval, grading, and history.
 */
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');

/**
 * Returns all quizzes for a course, stripping correctIndex from each question.
 *
 * @param {string} courseId
 * @returns {Promise<Array>}
 */
const getQuizzesByCourse = async (courseId) => {
  // Verify course exists
  const course = await Course.findById(courseId);
  if (!course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }

  const quizzes = await Quiz.find({ courseId }).lean();

  // Strip correctIndex from each question for security
  return quizzes.map((quiz) => ({
    ...quiz,
    questions: quiz.questions.map((q) => {
      const { correctIndex, testCases, ...safeQuestion } = q;
      return safeQuestion;
    }),
  }));
};

/**
 * Grades a quiz attempt and persists a QuizAttempt record.
 *
 * Grading rules:
 *   - multiple-choice: answer (number index) === question.correctIndex
 *   - coding: answer (string) === testCase[0].expectedOutput (simple string equality)
 *
 * @param {string} quizId
 * @param {string} studentId
 * @param {Array}  answers         - array of answers, one per question
 * @param {number} timeTakenSeconds
 * @returns {Promise<{ score: number, attempt: object, results: Array }>}
 */
const submitQuiz = async (quizId, studentId, answers, timeTakenSeconds) => {
  const quiz = await Quiz.findById(quizId).lean();
  if (!quiz) {
    const err = new Error('Quiz not found');
    err.status = 404;
    throw err;
  }

  const results = [];
  let correctCount = 0;

  quiz.questions.forEach((question, index) => {
    const answer = answers[index];
    let correct = false;
    let correctAnswer = null;

    if (question.type === 'multiple-choice') {
      correct = answer === question.correctIndex;
      correctAnswer = question.correctIndex;
    } else if (question.type === 'coding') {
      // Simple string equality against the first test case's expectedOutput
      const expected =
        question.testCases && question.testCases.length > 0
          ? question.testCases[0].expectedOutput
          : null;
      correct = expected !== null && String(answer) === String(expected);
      correctAnswer = expected;
    }

    if (correct) correctCount += 1;

    results.push({
      questionIndex: index,
      correct,
      correctAnswer,
    });
  });

  const totalQuestions = quiz.questions.length;
  const score =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const attempt = await QuizAttempt.create({
    studentId,
    quizId,
    score,
    timeTakenSeconds: timeTakenSeconds || 0,
    answers,
    submittedAt: new Date(),
  });

  return { score, attempt, results };
};

/**
 * Returns all QuizAttempts for a student, ordered by submittedAt descending.
 *
 * @param {string} studentId
 * @returns {Promise<Array>}
 */
const getQuizHistory = async (studentId) => {
  const attempts = await QuizAttempt.find({ studentId })
    .sort({ submittedAt: -1 })
    .lean();
  return attempts;
};

module.exports = {
  getQuizzesByCourse,
  submitQuiz,
  getQuizHistory,
};
