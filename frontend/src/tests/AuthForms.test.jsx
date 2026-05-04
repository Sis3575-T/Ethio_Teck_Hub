/**
 * AuthForms.test.jsx
 * Tests for RegisterPage, LoginPage, ForgotPasswordPage, and ResetPasswordPage.
 * Covers: form validation, error display, and API call behaviour.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import { AuthProvider } from '../context/AuthContext';
import RegisterPage from '../pages/RegisterPage';
import LoginPage from '../pages/LoginPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage';
import ResetPasswordPage from '../pages/ResetPasswordPage';

// ── Mock the api service ──────────────────────────────────────────────────────
vi.mock('../services/api', () => ({
  default: {},
  register: vi.fn(),
  login: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}));

import * as apiModule from '../services/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderWithRouter(ui, { initialEntries = ['/'] } = {}) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    </AuthProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterPage
// ─────────────────────────────────────────────────────────────────────────────
describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    renderWithRouter(<RegisterPage />);
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderWithRouter(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/display name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please confirm your password/i)).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    renderWithRouter(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/display name/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'short');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    renderWithRouter(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/display name/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'different123');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('does not call API when validation fails', async () => {
    renderWithRouter(<RegisterPage />);
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/display name is required/i);
    expect(apiModule.register).not.toHaveBeenCalled();
  });

  it('calls register API with correct data on valid submission', async () => {
    apiModule.register.mockResolvedValueOnce({
      data: { token: 'jwt', refreshToken: 'rt', user: { id: '1', displayName: 'Test User' } },
    });

    renderWithRouter(
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    );

    await userEvent.type(screen.getByLabelText(/display name/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(apiModule.register).toHaveBeenCalledWith({
        displayName: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows API error message on failed registration', async () => {
    apiModule.register.mockRejectedValueOnce({
      response: { data: { message: 'An account with this email already exists.' } },
    });

    renderWithRouter(<RegisterPage />);
    await userEvent.type(screen.getByLabelText(/display name/i), 'Test User');
    await userEvent.type(screen.getByLabelText(/^email/i), 'existing@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(
      await screen.findByText(/an account with this email already exists/i)
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LoginPage
// ─────────────────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password fields', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    renderWithRouter(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows invalid email error', async () => {
    renderWithRouter(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/^email/i), 'not-an-email');
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('does not call API when validation fails', async () => {
    renderWithRouter(<LoginPage />);
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));
    await screen.findByText(/email is required/i);
    expect(apiModule.login).not.toHaveBeenCalled();
  });

  it('calls login API with correct data on valid submission', async () => {
    apiModule.login.mockResolvedValueOnce({
      data: { token: 'jwt', refreshToken: 'rt', user: { id: '1' } },
    });

    renderWithRouter(
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    );

    await userEvent.type(screen.getByLabelText(/^email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await waitFor(() => {
      expect(apiModule.login).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      });
    });
  });

  it('shows API error on failed login', async () => {
    apiModule.login.mockRejectedValueOnce({
      response: { data: { message: 'Invalid email or password.' } },
    });

    renderWithRouter(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/^email/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrongpassword');
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  it('renders a link to forgot-password page', () => {
    renderWithRouter(<LoginPage />);
    expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ForgotPasswordPage
// ─────────────────────────────────────────────────────────────────────────────
describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email field and submit button', () => {
    renderWithRouter(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows error when email is empty', async () => {
    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
  });

  it('shows error for invalid email format', async () => {
    renderWithRouter(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/^email/i), 'bad-email');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it('does not call API when validation fails', async () => {
    renderWithRouter(<ForgotPasswordPage />);
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await screen.findByText(/email is required/i);
    expect(apiModule.forgotPassword).not.toHaveBeenCalled();
  });

  it('shows success message after successful submission', async () => {
    apiModule.forgotPassword.mockResolvedValueOnce({ data: {} });

    renderWithRouter(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/^email/i), 'user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(
      await screen.findByText(/if that email is registered/i)
    ).toBeInTheDocument();
  });

  it('calls forgotPassword API with correct email', async () => {
    apiModule.forgotPassword.mockResolvedValueOnce({ data: {} });

    renderWithRouter(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/^email/i), 'user@example.com');
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(apiModule.forgotPassword).toHaveBeenCalledWith({ email: 'user@example.com' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ResetPasswordPage
// ─────────────────────────────────────────────────────────────────────────────
describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders new password and confirm password fields', () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password?token=abc123'],
    });
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows warning when no token is present', () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password'],
    });
    expect(screen.getByText(/no reset token found/i)).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password?token=abc123'],
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/new password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/please confirm your new password/i)).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password?token=abc123'],
    });
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'short');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password?token=abc123'],
    });
    await userEvent.type(screen.getByLabelText(/^new password$/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'different123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('does not call API when validation fails', async () => {
    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password?token=abc123'],
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    await screen.findByText(/new password is required/i);
    expect(apiModule.resetPassword).not.toHaveBeenCalled();
  });

  it('calls resetPassword API with token and new password', async () => {
    apiModule.resetPassword.mockResolvedValueOnce({ data: {} });

    renderWithRouter(
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/login" element={<div>Login</div>} />
      </Routes>,
      { initialEntries: ['/reset-password?token=abc123'] }
    );

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpassword123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(apiModule.resetPassword).toHaveBeenCalledWith({
        token: 'abc123',
        newPassword: 'newpassword123',
      });
    });
  });

  it('shows error message when token is expired (400 response)', async () => {
    apiModule.resetPassword.mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Token expired' } },
    });

    renderWithRouter(<ResetPasswordPage />, {
      initialEntries: ['/reset-password?token=expiredtoken'],
    });

    await userEvent.type(screen.getByLabelText(/^new password$/i), 'newpassword123');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'newpassword123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(
      await screen.findByText(/expired or already been used/i)
    ).toBeInTheDocument();
  });
});
