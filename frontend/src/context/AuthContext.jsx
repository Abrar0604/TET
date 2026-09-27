import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('tet_token') || null);
  const [guestId] = useState(() => {
    let gid = localStorage.getItem('tet_guest_id');
    if (!gid) {
      gid = 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('tet_guest_id', gid);
    }
    return gid;
  });
  const [loading, setLoading] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Check token on mount
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Token invalid or expired
          localStorage.removeItem('tet_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to authenticate token:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (usernameOrEmail, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username_or_email: usernameOrEmail,
        password: password
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed. Please check credentials.');
    }
    localStorage.setItem('tet_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setAuthModalOpen(false);
    return data.user;
  };

  const register = async (username, email, password) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Registration failed. Please try again.');
    }
    localStorage.setItem('tet_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setAuthModalOpen(false);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('tet_token');
    setToken(null);
    setUser(null);
  };

  // Helper fetch with auto auth token & guest identity injection
  const authFetch = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Guest-ID': guestId,
      ...(options.headers || {})
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      guestId,
      loading,
      login,
      register,
      logout,
      authFetch,
      authModalOpen,
      setAuthModalOpen
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
