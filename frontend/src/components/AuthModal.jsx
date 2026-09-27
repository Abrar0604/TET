import React, { useState } from 'react';
import { X, Lock, Mail, User, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (isRegister) {
        if (!username.trim() || !email.trim() || !password.trim()) {
          setError('Please fill in all fields.');
          setSubmitting(false);
          return;
        }
        await register(username, email, password);
      } else {
        if (!username.trim() || !password.trim()) {
          setError('Please enter your username/email and password.');
          setSubmitting(false);
          return;
        }
        await login(username, password);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2E2A26]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-theme-border flex justify-between items-center bg-[#FDFCFA]">
          <div>
            <h2 className="text-xl font-serif text-theme-textPrimary font-semibold">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-xs text-theme-textSecondary mt-0.5">
              {isRegister ? 'Sign up to track your tests and progress' : 'Sign in to access your test history and analytics'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-theme-textSecondary hover:text-theme-textPrimary p-1.5 rounded-lg hover:bg-theme-background transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 border-b border-theme-border bg-theme-background text-sm font-medium">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-3 text-center transition-colors border-b-2 ${!isRegister ? 'border-theme-primary bg-theme-surface text-theme-textPrimary font-semibold' : 'border-transparent text-theme-textSecondary hover:text-theme-textPrimary'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`py-3 text-center transition-colors border-b-2 ${isRegister ? 'border-theme-primary bg-theme-surface text-theme-textPrimary font-semibold' : 'border-transparent text-theme-textSecondary hover:text-theme-textPrimary'}`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-[#FBEAE8] border border-[#F1C4BE] text-[#9A3428] text-sm leading-snug">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-theme-textSecondary mb-1.5">
              {isRegister ? 'Username' : 'Username or Email'}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-textSecondary">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? 'e.g. learner2026' : 'Enter username or email'}
                className="w-full pl-9 pr-3 py-2.5 bg-theme-background border border-theme-border rounded-lg text-sm text-theme-textPrimary placeholder:text-theme-textSecondary/50 focus:outline-none focus:border-theme-primary transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-theme-textSecondary mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-textSecondary">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. learner@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-theme-background border border-theme-border rounded-lg text-sm text-theme-textPrimary placeholder:text-theme-textSecondary/50 focus:outline-none focus:border-theme-primary transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-theme-textSecondary mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-theme-textSecondary">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-theme-background border border-theme-border rounded-lg text-sm text-theme-textPrimary placeholder:text-theme-textSecondary/50 focus:outline-none focus:border-theme-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-3 px-4 bg-theme-primary text-theme-textPrimary font-medium rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 border border-theme-primary/40 disabled:opacity-50"
          >
            <span>{submitting ? 'Processing...' : (isRegister ? 'Register Account' : 'Sign In')}</span>
            <ArrowRight size={16} />
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-theme-textSecondary hover:text-theme-textPrimary underline underline-offset-4"
            >
              Continue without signing in (Guest Mode)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
