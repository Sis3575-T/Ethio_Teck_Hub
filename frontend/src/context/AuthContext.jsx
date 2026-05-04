import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and provides auth state + helpers.
 * Reads initial state from localStorage so the session survives page refresh.
 */
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    try {
      const token = localStorage.getItem('token');
      const userRaw = localStorage.getItem('user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      return { token, user };
    } catch {
      return { token: null, user: null };
    }
  });

  /**
   * Persist tokens and user info after a successful login / register.
   * @param {string} token - JWT access token
   * @param {string} refreshToken - Refresh token
   * @param {object} user - User object returned by the API
   */
  const login = useCallback((token, refreshToken, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setAuthState({ token, user });
  }, []);

  /**
   * Clear all auth state and storage.
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setAuthState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — convenience hook for consuming auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default AuthContext;
