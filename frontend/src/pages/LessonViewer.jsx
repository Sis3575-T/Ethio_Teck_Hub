import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api, { getLessonById, completeLesson, getCourseLessons } from '../services/api';

/**
 * LessonViewer
 * Displays a single lesson: video embed, notes, optional coding task,
 * "Mark as Complete" button, and prev/next navigation.
 */
function LessonViewer() {
  const { id: courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [code, setCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [codeSubmitted, setCodeSubmitted] = useState(false);

  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [autoMark, setAutoMark] = useState(false);

  // Fetch lesson + sibling lessons for navigation
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setCompleted(false);
    setCode('');
    setCodeSubmitted(false);

    Promise.all([getLessonById(lessonId), getCourseLessons(courseId)])
      .then(([lessonRes, lessonsRes]) => {
        if (cancelled) return;
        const loaded = lessonRes.data.lesson ?? lessonRes.data;
        setLesson(loaded);
        // initialize completed state from server data if present
        if (typeof loaded.completed !== 'undefined') {
          setCompleted(Boolean(loaded.completed));
        }
        const list = lessonsRes.data.lessons ?? lessonsRes.data.data ?? lessonsRes.data ?? [];
        setAllLessons([...list].sort((a, b) => a.order - b.order));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to load lesson.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [lessonId, courseId]);

  // Derive prev/next lesson IDs
  // Prefer the loaded lesson _id when available, fall back to route param
  const currentId = lesson?._id ?? lessonId;
  const currentIndex = allLessons.findIndex((l) => String(l._id) === String(currentId));
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1
    ? allLessons[currentIndex + 1]
    : null;

  async function handleComplete() {
    setCompleting(true);
    setCompleteError('');
    try {
      await completeLesson(lessonId);
      setCompleted(true);
    } catch (err) {
      setCompleteError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Could not mark lesson as complete.'
      );
    } finally {
      setCompleting(false);
    }
  }

  async function handleCodeSubmit(e) {
    e.preventDefault();
    e.preventDefault();
    setSubmittingCode(true);
    setCompleteError('');
    try {
      // Try server endpoint first
      await api.post(`/lessons/${lessonId}/submission`, { code });
      setCodeSubmitted(true);
    } catch (err) {
      // Fallback: save to localStorage if server endpoint not available
      try {
        const key = `lessonSubmission:${lessonId}`;
        const payload = { code, savedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(payload));
        setCodeSubmitted(true);
      } catch (storageErr) {
        setCompleteError('Failed to save submission.');
      }
    } finally {
      setSubmittingCode(false);
    }
  }

  function onVideoEnded() {
    if (autoMark && !completed) {
      handleComplete();
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <Link
            to={`/courses/${courseId}`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Course
          </Link>
        </div>
      </div>
    );
  }

  if (!lesson) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <Link
            to={`/courses/${courseId}`}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Course
          </Link>

          <h1 className="text-sm font-semibold text-gray-800 truncate">{lesson.title}</h1>

          {/* Prev / Next navigation */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => prevLesson && navigate(`/courses/${courseId}/lessons/${prevLesson._id}`)}
              disabled={!prevLesson}
              title={prevLesson ? `Previous: ${prevLesson.title}` : 'No previous lesson'}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => nextLesson && navigate(`/courses/${courseId}/lessons/${nextLesson._id}`)}
              disabled={!nextLesson}
              title={nextLesson ? `Next: ${nextLesson.title}` : 'No next lesson'}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Lesson title */}
        <div>
          <p className="text-xs font-medium text-primary-500 uppercase tracking-wide mb-1">
            Lesson {lesson.order}
          </p>
          <h2 className="text-2xl font-bold text-gray-900">{lesson.title}</h2>
        </div>

        {/* Video embed */}
        {lesson.videoUrl && (
          <div className="bg-black rounded-2xl overflow-hidden aspect-video shadow-md">
            <VideoEmbed url={lesson.videoUrl} title={lesson.title} onEnded={onVideoEnded} />
          </div>
        )}

        {/* Notes */}
        {lesson.notes && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Lesson Notes</h3>
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {lesson.notes}
            </div>
          </div>
        )}

        {/* Coding task */}
        {lesson.hasCodingTask && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-accent-yellow/20 text-yellow-700 font-semibold px-2.5 py-1 rounded-full">
                Coding Task
              </span>
            </div>

            {lesson.codingTaskDescription && (
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {lesson.codingTaskDescription}
              </p>
            )}

            {codeSubmitted ? (
              <div
                role="status"
                className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
              >
                ✓ Code submitted successfully!
              </div>
            ) : (
              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <label htmlFor="code-editor" className="block text-xs font-medium text-gray-600">
                  Your solution
                </label>
                <textarea
                  id="code-editor"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={12}
                  spellCheck={false}
                  placeholder="// Write your code here..."
                  className="w-full rounded-lg border border-gray-300 bg-gray-900 text-green-400 font-mono text-sm px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                />
                <button
                  type="submit"
                  disabled={submittingCode || !code.trim()}
                  className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingCode ? 'Submitting…' : 'Submit Code'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Mark as Complete */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-800">Finished this lesson?</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Mark it complete to track your progress.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            {completeError && (
              <p className="text-xs text-red-600">{completeError}</p>
            )}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-500 mr-4">
                <input
                  type="checkbox"
                  checked={autoMark}
                  onChange={(e) => setAutoMark(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Auto-mark when video ends</span>
              </label>

              {completed ? (
              <div className="flex items-center gap-2 text-primary-600 font-semibold text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Lesson Complete
              </div>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="rounded-lg bg-primary-500 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {completing ? 'Saving…' : 'Mark as Complete'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom prev/next navigation */}
        <div className="flex justify-between gap-4 pb-8">
          {prevLesson ? (
            <Link
              to={`/courses/${courseId}/lessons/${prevLesson._id}`}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors group max-w-[45%]"
            >
              <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Previous</p>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-700 truncate">
                  {prevLesson.title}
                </p>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              to={`/courses/${courseId}/lessons/${nextLesson._id}`}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors group max-w-[45%] ml-auto text-right"
            >
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Next</p>
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-700 truncate">
                  {nextLesson.title}
                </p>
              </div>
              <svg className="w-4 h-4 text-gray-400 group-hover:text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Video Embed ──────────────────────────────────────────────────────────────

/**
 * Renders a YouTube embed or a native <video> element depending on the URL.
 */
function VideoEmbed({ url, title, onEnded }) {
  const youtubeId = extractYouTubeId(url);

  if (youtubeId) {
    return (
      <iframe
        className="w-full h-full"
        src={`https://www.youtube.com/embed/${youtubeId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Fallback: native video element for direct video URLs
  return (
    <video
      className="w-full h-full"
      src={url}
      onEnded={onEnded}
      controls
      title={title}
    >
      Your browser does not support the video tag.
    </video>
  );
}

/**
 * Extract YouTube video ID from various YouTube URL formats.
 * Returns null if the URL is not a YouTube URL.
 */
function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1);
    }
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v');
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

export default LessonViewer;
