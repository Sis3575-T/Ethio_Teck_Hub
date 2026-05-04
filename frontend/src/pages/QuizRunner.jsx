import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizzesByCourse, submitQuiz } from '../services/api';

/**
 * QuizRunner — timed quiz page.
 *
 * Route: /courses/:id/quiz
 * - Fetches quizzes for the course (uses first quiz found).
 * - Countdown timer auto-submits when it reaches zero.
 * - Supports multiple-choice (radio buttons) and coding (textarea) questions.
 * - Shows per-question results and score after submission.
 */
export default function QuizRunner() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  // ── Loading / error state ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Quiz data ──────────────────────────────────────────────────────────────
  const [quiz, setQuiz] = useState(null);

  // ── Answer state ───────────────────────────────────────────────────────────
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // ── Timer state ────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // ── Submission state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { score, attempt, results }

  // ── Fetch quiz on mount ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const fetchQuiz = async () => {
      try {
        const res = await getQuizzesByCourse(courseId);
        if (cancelled) return;

        const quizzes = res.data;
        if (!quizzes || quizzes.length === 0) {
          setError('No quiz found for this course.');
          setLoading(false);
          return;
        }

        const q = quizzes[0];
        setQuiz(q);
        setAnswers(new Array(q.questions.length).fill(null));
        setTimeLeft(q.durationSeconds);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load quiz.');
          setLoading(false);
        }
      }
    };

    fetchQuiz();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  // ── Handle submission ──────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (timeTaken) => {
      if (submitting || result) return;
      setSubmitting(true);

      // Stop the timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      try {
        const elapsed =
          timeTaken !== undefined ? timeTaken : quiz.durationSeconds - (timeLeft || 0);
        const res = await submitQuiz(quiz._id, {
          answers,
          timeTakenSeconds: elapsed,
        });
        setResult(res.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to submit quiz.');
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, result, quiz, timeLeft, answers]
  );

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || result) return;

    if (timeLeft <= 0) {
      // Auto-submit when timer reaches zero
      handleSubmit(quiz?.durationSeconds);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft === null, result !== null]); // only re-run when these booleans change

  // ── Answer change handlers ─────────────────────────────────────────────────
  const handleMultipleChoiceChange = (questionIndex, optionIndex) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  };

  const handleCodingChange = (questionIndex, value) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = value;
      return next;
    });
  };

  // ── Format time as MM:SS ───────────────────────────────────────────────────
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Render: loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Loading quiz…</p>
      </div>
    );
  }

  // ── Render: error ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Course
        </button>
      </div>
    );
  }

  // ── Render: results ────────────────────────────────────────────────────────
  if (result) {
    const passed = result.score >= 70;

    return (
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-2">{quiz.title || 'Quiz Results'}</h1>

        {/* Score summary */}
        <div
          className={`rounded-lg p-6 mb-6 text-center ${
            passed ? 'bg-green-50 border border-green-300' : 'bg-red-50 border border-red-300'
          }`}
        >
          <p className="text-5xl font-bold mb-2">{result.score}%</p>
          <p
            className={`text-xl font-semibold ${
              passed ? 'text-green-700' : 'text-red-700'
            }`}
          >
            {passed ? '✓ Passed' : '✗ Failed'}
          </p>
          <p className="text-gray-500 mt-1">
            {passed
              ? 'Congratulations! You passed the quiz.'
              : 'You need 70% or higher to pass. Try again!'}
          </p>
        </div>

        {/* Per-question feedback */}
        <h2 className="text-lg font-semibold mb-3">Question Breakdown</h2>
        <div className="space-y-4">
          {result.results.map((r, i) => {
            const question = quiz.questions[i];
            return (
              <div
                key={i}
                className={`rounded-lg border p-4 ${
                  r.correct
                    ? 'border-green-300 bg-green-50'
                    : 'border-red-300 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={r.correct ? 'text-green-600' : 'text-red-600'}>
                    {r.correct ? '✓' : '✗'}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">
                      Q{i + 1}: {question?.text}
                    </p>
                    {!r.correct && (
                      <p className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Correct answer: </span>
                        {question?.type === 'multiple-choice' &&
                        r.correctAnswer !== null &&
                        question?.options
                          ? question.options[r.correctAnswer]
                          : r.correctAnswer}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      <span className="font-medium">Your answer: </span>
                      {question?.type === 'multiple-choice' &&
                      answers[i] !== null &&
                      question?.options
                        ? question.options[answers[i]]
                        : answers[i] ?? '(no answer)'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Course
        </button>
      </div>
    );
  }

  // ── Render: quiz in progress ───────────────────────────────────────────────
  const currentQuestion = quiz.questions[currentIndex];
  const isTimeLow = timeLeft !== null && timeLeft <= 30;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">{quiz.title || 'Quiz'}</h1>
        <div
          className={`text-lg font-mono font-semibold px-3 py-1 rounded ${
            isTimeLow
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-gray-100 text-gray-700'
          }`}
          aria-label={`Time remaining: ${formatTime(timeLeft)}`}
        >
          ⏱ {formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress indicator */}
      <p className="text-sm text-gray-500 mb-4">
        Question {currentIndex + 1} of {quiz.questions.length}
      </p>

      {/* Question */}
      <div className="bg-white border rounded-lg p-5 mb-6 shadow-sm">
        <p className="font-medium text-gray-800 mb-4">{currentQuestion.text}</p>

        {currentQuestion.type === 'multiple-choice' && (
          <div className="space-y-2" role="radiogroup" aria-label="Answer options">
            {currentQuestion.options.map((option, optIdx) => (
              <label
                key={optIdx}
                className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name={`question-${currentIndex}`}
                  value={optIdx}
                  checked={answers[currentIndex] === optIdx}
                  onChange={() => handleMultipleChoiceChange(currentIndex, optIdx)}
                  className="accent-blue-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        )}

        {currentQuestion.type === 'coding' && (
          <textarea
            className="w-full h-40 p-3 font-mono text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Write your code answer here…"
            value={answers[currentIndex] ?? ''}
            onChange={(e) => handleCodingChange(currentIndex, e.target.value)}
            aria-label="Code answer"
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <div className="flex gap-2">
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-full text-sm font-medium ${
                i === currentIndex
                  ? 'bg-blue-600 text-white'
                  : answers[i] !== null
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
              aria-label={`Go to question ${i + 1}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {currentIndex < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => Math.min(quiz.questions.length - 1, i + 1))}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={() => handleSubmit()}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}
