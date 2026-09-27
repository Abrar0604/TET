import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Award, 
  History, 
  User, 
  LogOut, 
  LogIn, 
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import SubjectTest from './components/SubjectTest';
import FullLengthMock from './components/FullLengthMock';
import TestHistory from './components/TestHistory';
import TestScreen from './components/TestScreen';
import AuthModal from './components/AuthModal';

function AppLayout() {
  const location = useLocation();
  const { user, logout, authModalOpen, setAuthModalOpen } = useAuth();

  const isTestActive = location.pathname.startsWith('/test/') && !location.search.includes('review=1');

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/practice', label: 'Subject Practice', icon: FileText },
    { to: '/full-mock', label: 'Full-Length Mock', icon: Award },
    { to: '/history', label: 'Test History', icon: History },
  ];

  return (
    <div className="flex h-screen bg-theme-background font-sans overflow-hidden">
      {/* Sidebar (hidden during active full-screen tests for zero distraction) */}
      {!isTestActive && (
        <aside className="w-64 bg-theme-surface border-r border-theme-border flex flex-col justify-between flex-shrink-0 z-20">
          <div>
            {/* Platform Branding */}
            <div className="p-6 border-b border-theme-border">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-theme-primary/40 border border-theme-primary flex items-center justify-center text-theme-textPrimary">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h1 className="text-base font-serif font-semibold text-theme-textPrimary leading-tight">
                    TET Exam Platform
                  </h1>
                  <p className="text-[11px] text-theme-textSecondary">
                    Practice & Performance
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive 
                        ? 'bg-theme-primary/30 text-theme-textPrimary font-semibold border border-theme-primary/50' 
                        : 'text-theme-textSecondary hover:bg-theme-background hover:text-theme-textPrimary'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Account / Auth Widget */}
          <div className="p-4 border-t border-theme-border bg-[#FDFCFA]">
            {user ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-theme-primary/50 border border-theme-primary text-theme-textPrimary font-semibold text-xs flex items-center justify-center uppercase">
                    {user.username.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-serif font-semibold text-theme-textPrimary truncate">
                      {user.username}
                    </p>
                    <p className="text-[10px] text-theme-textSecondary truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border border-theme-border text-xs text-theme-textSecondary hover:bg-theme-background hover:text-theme-textPrimary transition-colors"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs">
                  <span className="font-serif font-semibold text-theme-textPrimary">Guest Learner</span>
                  <p className="text-[11px] text-theme-textSecondary mt-0.5">
                    Save your tests and history
                  </p>
                </div>
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="w-full py-2 px-3 bg-theme-primary text-theme-textPrimary font-medium text-xs rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center space-x-1.5 border border-theme-primary/40"
                >
                  <LogIn size={13} />
                  <span>Sign In / Register</span>
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 overflow-auto bg-theme-background">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<SubjectTest />} />
          <Route path="/full-mock" element={<FullLengthMock />} />
          <Route path="/history" element={<TestHistory />} />
          <Route path="/test/:attemptId" element={<TestScreen />} />
          <Route path="/review/:attemptId" element={<TestScreen />} />
        </Routes>
      </main>

      {/* Global Auth Modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}
