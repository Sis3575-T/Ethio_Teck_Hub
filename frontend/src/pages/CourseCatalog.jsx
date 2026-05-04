import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getCourses } from '../services/api';

const CATEGORIES = [
  'All',
  'Web Development',
  'Mobile Development',
  'AI/ML',
  'Cybersecurity',
  'UI/UX Design',
  'Database Systems',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'mostEnrolled', label: 'Most Enrolled' },
];

const PAGE_SIZE = 9;

/**
 * CourseCatalog
 * Displays a filterable, sortable, paginated list of published courses.
 */
function CourseCatalog() {
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        sort,
      };
      if (category !== 'All') {
        params.category = category;
      }
      const { data } = await getCourses(params);
      // API may return { courses, total } or { data: courses, total }
      setCourses(data.courses ?? data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load courses. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [page, category, sort]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Reset to page 1 when filters change
  function handleCategoryChange(e) {
    setCategory(e.target.value);
    setPage(1);
  }

  function handleSortChange(e) {
    setSort(e.target.value);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Course Catalog</h1>
          <p className="mt-1 text-sm text-gray-500">
            Explore courses across technology disciplines
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Filter / Sort Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Category filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="category-filter" className="text-xs font-medium text-gray-600">
              Category
            </label>
            <select
              id="category-filter"
              value={category}
              onChange={handleCategoryChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sort-select" className="text-xs font-medium text-gray-600">
              Sort by
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={handleSortChange}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && courses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <svg
              className="w-16 h-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="text-gray-500 font-medium">No courses found</p>
            <p className="text-gray-400 text-sm mt-1">
              {category !== 'All'
                ? `No courses in "${category}" yet. Try a different category.`
                : 'No courses are available at the moment.'}
            </p>
          </div>
        )}

        {/* Course grid */}
        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} &mdash; {total} course{total !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  'Web Development': 'bg-blue-100 text-blue-700',
  'Mobile Development': 'bg-purple-100 text-purple-700',
  'AI/ML': 'bg-yellow-100 text-yellow-700',
  Cybersecurity: 'bg-red-100 text-red-700',
  'UI/UX Design': 'bg-pink-100 text-pink-700',
  'Database Systems': 'bg-green-100 text-green-700',
};

function CourseCard({ course }) {
  const badgeClass =
    CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-700';

  return (
    <Link
      to={`/courses/${course._id}`}
      className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md hover:border-primary-200 transition-all"
    >
      {/* Category badge */}
      <span
        className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${badgeClass}`}
      >
        {course.category}
      </span>

      {/* Title */}
      <h2 className="text-base font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
        {course.title}
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-500 line-clamp-3 flex-1 mb-4">
        {course.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-3 mt-auto">
        <span className="truncate max-w-[60%]">
          {course.instructorName ? `By ${course.instructorName}` : 'EthioTech Hub'}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
          {(course.enrollmentCount ?? 0).toLocaleString()} enrolled
        </span>
      </div>
    </Link>
  );
}

export default CourseCatalog;
