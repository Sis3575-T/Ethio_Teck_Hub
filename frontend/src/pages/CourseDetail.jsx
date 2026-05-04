import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCourseById, getCourseLessons, enrollInCourse } from '../services/api';

/**
 * CourseDetail
 * Shows course info, ordered lesson list, and an enroll button.
 * Handles 409 (already enrolled) gracefully.
 */
function CourseDetail() {
  const { id } = useParams();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loadingCourse, setLoadingCourse] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [courseError, setCourseError] = useState('');

  const [enrolled, setEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');

  // Fetch course details
  useEffect(() => {
    let cancelled = false;
    setLoadingCourse(true);
    setCourseError('');

    getCourseById(id)
      .then(({ data }) => {
        if (!cancelled) {
          setCourse(data.course ?? data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCourseError(
            err.response?.data?.message ||
              err.response?.data?.error ||
              'Failed to load course details.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCourse(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fetch lessons
  useEffect(() => {
    let cancelled = false;
    setLoadingLessons(true);

    getCourseLessons(id)
      .then(({ data }) => {
        if (!cancelled) {
          const list = data.lessons ?? data.data ?? data ?? [];
          // Sort by order field ascending
          setLessons([...list].sort((a, b) => a.order - b.order));
        }
      })
      .catch(() => {
        if (!cancelled) setLessons([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingLessons(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleEnroll() {
    setEnrolling(true);
    setEnrollError('');
    setEnrollSuccess('');

    try {
      await enrollInCourse(id);
      setEnrolled(true);
      setEnrollSuccess('You have successfully enrolled in this course!');
    } catch (err) {
      if (err.response?.status === 409) {
        // Already enrolled — treat as success
        setEnrolled(true);
        setEnrollSuccess('You are already enrolled in this course.');
      } else {
        setEnrollError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            'Enrollment failed. Please try again.'
        );
      }
    } finally {
      setEnrolling(false);
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loadingCourse) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (courseError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{courseError}</p>
          <Link
            to="/courses"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            ← Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const CATEGORY_COLORS = {
    'Web Development': 'bg-blue-100 text-blue-700',
    'Mobile Development': 'bg-purple-100 text-purple-700',
    'AI/ML': 'bg-yellow-100 text-yellow-700',
    Cybersecurity: 'bg-red-100 text-red-700',
    'UI/UX Design': 'bg-pink-100 text-pink-700',
    'Database Systems': 'bg-green-100 text-green-700',
  };
  const badgeClass = CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back link */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/courses"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Courses
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Course header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${badgeClass}`}>
            {course.category}
          </span>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{course.title}</h1>

          <p className="text-gray-600 leading-relaxed mb-5">{course.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
            {course.instructorName && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {course.instructorName}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              {(course.enrollmentCount ?? 0).toLocaleString()} enrolled
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Enroll feedback */}
          {enrollSuccess && (
            <div
              role="status"
              className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
            >
              {enrollSuccess}
            </div>
          )}
          {enrollError && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            >
              {enrollError}
            </div>
          )}

          {/* Enroll button */}
          {enrolled ? (
            <div className="flex items-center gap-2 text-primary-600 font-semibold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Enrolled
            </div>
          ) : (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {enrolling ? 'Enrolling…' : 'Enroll Now'}
            </button>
          )}
        </div>

        {/* Lesson list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Content</h2>

          {loadingLessons ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lessons.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              No lessons available yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson._id}
                  lesson={lesson}
                  index={index}
                  courseId={id}
                  enrolled={enrolled}
                />
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lesson Row ───────────────────────────────────────────────────────────────

function LessonRow({ lesson, index, courseId, enrolled }) {
  // Lessons beyond the first are "locked" until enrolled
  const isLocked = !enrolled && index > 0;

  const content = (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-colors group">
      {/* Order number */}
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 group-hover:bg-primary-100 text-gray-500 group-hover:text-primary-600 text-xs font-semibold flex items-center justify-center transition-colors">
        {lesson.order ?? index + 1}
      </span>

      {/* Title */}
      <span className="flex-1 text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors">
        {lesson.title}
      </span>

      {/* Coding task badge */}
      {lesson.hasCodingTask && (
        <span className="text-xs bg-accent-yellow/20 text-yellow-700 font-medium px-2 py-0.5 rounded-full">
          Coding
        </span>
      )}

      {/* Lock / arrow icon */}
      {isLocked ? (
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-gray-300 group-hover:text-primary-400 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (isLocked) {
    return <li title="Enroll to unlock this lesson">{content}</li>;
  }

  return (
    <li>
      <Link to={`/courses/${courseId}/lessons/${lesson._id}`}>{content}</Link>
    </li>
  );
}

export default CourseDetail;
