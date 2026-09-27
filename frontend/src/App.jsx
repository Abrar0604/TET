import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Award, 
  History, 
  User, 
  LogOut, 
  LogIn, 
  GraduationCap,
  Menu,
  X
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isTestActive = location.pathname.startsWith('/test/') && !location.search.includes('review=1');

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/practice', label: 'Subject Practice', icon: FileText },
    { to: '/full-mock', label: 'Full-Length Mock', icon: Award },
    { to: '/history', label: 'Test History', icon: History },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-theme-background font-sans overflow-hidden flex-col md:flex-row">
      {/* Mobile Top Navigation Bar (Only on mobile and when not taking a full-screen test) */}
      {!isTestActive && (
        <header className="md:hidden bg-theme-surface border-b border-theme-border px-4 py-3 flex items-center justify-between z-30 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-theme-textSecondary hover:bg-theme-background hover:text-theme-textPrimary transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-theme-primary/40 border border-theme-primary flex items-center justify-center text-theme-textPrimary">
                <GraduationCap size={16} />
              </div>
              <span className="text-sm font-serif font-semibold text-theme-textPrimary">
                TET Prep
              </span>
            </div>
          </div>

          <div>
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-theme-primary/50 border border-theme-primary text-theme-textPrimary font-semibold text-xs flex items-center justify-center uppercase">
                  {user.username.slice(0, 2)}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-theme-primary text-theme-textPrimary border border-theme-primary/40"
              >
                Sign In
              </button>
            )}
          </div>
        </header>
      )}

      {/* Mobile Slide-Out Drawer Overlay */}
      {!isTestActive && mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={closeMobileMenu}
        >
          <div 
            className="w-72 max-w-[80vw] h-full bg-theme-surface border-r border-theme-border flex flex-col justify-between p-4 shadow-xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-theme-border">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-theme-primary/40 border border-theme-primary flex items-center justify-center text-theme-textPrimary">
                    <GraduationCap size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-serif font-semibold text-theme-textPrimary">
                      TET Exam Platform
                    </h2>
                    <p className="text-[10px] text-theme-textSecondary">
                      Practice & Performance
                    </p>
                  </div>
                </div>
                <button 
                  onClick={closeMobileMenu}
                  className="p-1 rounded text-theme-textSecondary hover:text-theme-textPrimary"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="space-y-1">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={closeMobileMenu}
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

            <div className="pt-4 border-t border-theme-border">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2.5">
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
                    onClick={() => { logout(); closeMobileMenu(); }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border border-theme-border text-xs text-theme-textSecondary hover:bg-theme-background"
                  >
                    <LogOut size={13} />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setAuthModalOpen(true); closeMobileMenu(); }}
                  className="w-full py-2 px-3 bg-theme-primary text-theme-textPrimary font-medium text-xs rounded-lg flex items-center justify-center space-x-1.5"
                >
                  <LogIn size={13} />
                  <span>Sign In / Register</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar (Only visible on md: screens and larger) */}
      {!isTestActive && (
        <aside className="hidden md:flex w-64 bg-theme-surface border-r border-theme-border flex-col justify-between flex-shrink-0 z-20">
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
      <main className={`flex-1 overflow-auto bg-theme-background ${isTestActive ? 'pb-0' : 'pb-16 md:pb-0'}`}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/practice" element={<SubjectTest />} />
          <Route path="/full-mock" element={<FullLengthMock />} />
          <Route path="/history" element={<TestHistory />} />
          <Route path="/test/:attemptId" element={<TestScreen />} />
          <Route path="/review/:attemptId" element={<TestScreen />} />
        </Routes>
      </main>

      {/* Mobile Bottom Navigation Bar (Ultra-convenient for mobile users) */}
      {!isTestActive && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-theme-surface border-t border-theme-border flex justify-around items-center py-2 px-1 z-30 shadow-md">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
                  isActive 
                    ? 'text-theme-textPrimary font-bold' 
                    : 'text-theme-textSecondary hover:text-theme-textPrimary'
                }`}
              >
                <div className={`p-1 rounded-md ${isActive ? 'bg-theme-primary/40 text-theme-textPrimary' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className="mt-0.5 whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

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
