import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword as forgotPasswordApi } from '../services/api';

/**
 * ForgotPasswordPage
 * Field: email
 * On success: shows a generic success message (avoids email enumeration)
 */
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate() {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
    return '';
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleChange(e) {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const err = validate();
    if (err) {
      setEmailError(err);
      return;
    }

    setLoading(true);
    try {
      await forgotPasswordApi({ email: email.trim().toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      // Show generic message to avoid email enumeration; surface only unexpected errors
      if (err.response?.status === 429) {
        setApiError('Too many requests. Please wait a moment and try again.');
      } else if (!err.response || err.response.status >= 500) {
        setApiError('A server error occurred. Please try again later.');
      } else {
        // 404 / 400 — still show success to avoid enumeration
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600">EthioTech Hub</h1>
          <p className="mt-2 text-gray-600">Reset your password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Forgot Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email address and we will send you a link to reset your password.
          </p>

          {/* Success state */}
          {submitted ? (
            <div
              role="status"
              className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700"
            >
              If that email is registered, a reset link has been sent. Check your inbox.
            </div>
          ) : (
            <>
              {/* API-level error */}
              {apiError && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                >
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleChange}
                    aria-describedby={emailError ? 'email-error' : undefined}
                    aria-invalid={!!emailError}
                    className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      emailError ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
                    }`}
                    placeholder="you@example.com"
                  />
                  {emailError && (
                    <p id="email-error" className="mt-1 text-xs text-red-600">
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Sending link…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* Back to login */}
          <p className="mt-6 text-center text-sm text-gray-600">
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-700">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
