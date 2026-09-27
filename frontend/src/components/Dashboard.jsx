import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Activity, 
  Award, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  BookOpen, 
  Eye, 
  TrendingUp,
  UserCheck,
  Zap
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, authFetch, setAuthModalOpen } = useAuth();

  useEffect(() => {
    fetchDashboard();
    fetchActiveSession();
  }, [user]);

  const fetchActiveSession = async () => {
    try {
      const res = await authFetch('/api/attempts/active');
      if (res.ok) {
        const data = await res.json();
        if (data.has_active_test) {
          setActiveSession(data);
        } else {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.warn('Error checking active test:', err);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/dashboard/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatSeconds = (sec) => {
    if (!sec) return '—';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-theme-textSecondary text-sm">
        Loading performance dashboard and analytics...
      </div>
    );
  }

  const hasTests = summary && summary.total_tests_taken > 0;
  const subjectsMap = summary?.subject_breakdown || {};
  const subjectList = Object.values(subjectsMap);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Welcome / Auth Banner */}
      <div className="bg-theme-surface border border-theme-border rounded-xl p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-theme-textPrimary font-semibold">
              {user ? `Welcome, ${user.username}` : 'Exam Preparation Dashboard'}
            </h1>
            {user && (
              <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#EAF4E8] text-[#24471D] border border-[#B7CDB0] font-medium flex items-center space-x-1">
                <UserCheck size={12} />
                <span>Active Account</span>
              </span>
            )}
          </div>
          <p className="text-xs text-theme-textSecondary mt-1 leading-relaxed">
            {user 
              ? 'Your performance metrics, subject strengths, and complete test history are synced to your account.'
              : 'You are currently in Guest Mode. Sign in or register to sync your test history and lifetime progress across devices.'
            }
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-center">
          {!user ? (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="px-4 py-2 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity border border-theme-primary/40 whitespace-nowrap"
            >
              Sign In / Register
            </button>
          ) : (
            <Link
              to="/practice"
              className="px-4 py-2 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity border border-theme-primary/40 whitespace-nowrap"
            >
              Start New Test &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Active Ongoing Test Banner */}
      {activeSession && (
        <div className="bg-[#FAF4ED] border border-[#F2D9B1] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D48B38] animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A5B27]">
                Test Session In Progress
              </span>
              {activeSession.is_paused && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-theme-tertiary text-theme-textPrimary font-semibold">
                  Paused
                </span>
              )}
            </div>
            <h3 className="font-serif font-semibold text-theme-textPrimary text-base sm:text-lg">
              {activeSession.title}
            </h3>
            <p className="text-xs text-theme-textSecondary flex items-center space-x-2">
              <Clock size={13} className="text-theme-textSecondary flex-shrink-0" />
              <span>
                {formatSeconds(activeSession.remaining_seconds)} remaining
                {activeSession.can_pause ? ' • Timer can be paused' : ' • Timer runs continuously'}
              </span>
            </p>
          </div>

          <Link
            to={`/test/${activeSession.attempt_id}`}
            className="w-full sm:w-auto text-center px-4 py-2.5 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity border border-theme-primary/40 flex items-center justify-center space-x-1.5 whitespace-nowrap"
          >
            <span>Resume Test Now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {!hasTests ? (
        /* Empty State */
        <div className="bg-theme-surface border border-theme-border rounded-xl p-6 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-theme-background border border-theme-border flex items-center justify-center mb-4 text-theme-primary">
            <Activity size={28} />
          </div>
          <h2 className="text-lg sm:text-xl font-serif font-medium text-theme-textPrimary mb-2">No tests recorded yet</h2>
          <p className="text-xs text-theme-textSecondary max-w-md mb-6 leading-relaxed">
            Begin your preparation by taking a focused subject-wise practice test or a full-length comprehensive mock. Your accuracy, pacing, and subject diagnostics will appear here automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
            <Link 
              to="/practice" 
              className="bg-theme-primary text-theme-textPrimary px-5 py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity border border-theme-primary/40 text-center"
            >
              Take Subject Practice
            </Link>
            <Link 
              to="/full-mock" 
              className="bg-theme-tertiary text-theme-textPrimary px-5 py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity border border-theme-tertiary/40 text-center"
            >
              Start Full Length Mock
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Top Key Metrics Grid: 1 col on mobile, 2 col on tablet, 4 on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-theme-textSecondary mb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold">Overall Accuracy</span>
                <Target size={16} className="text-theme-primary flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-semibold text-theme-textPrimary">
                {summary.overall_accuracy}%
              </p>
              <p className="text-[11px] text-theme-textSecondary mt-1">
                Across {summary.total_questions_attempted} attempted questions
              </p>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-theme-textSecondary mb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold">Tests Completed</span>
                <CheckCircle size={16} className="text-[#355B2E] flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-semibold text-theme-textPrimary">
                {summary.total_tests_taken}
              </p>
              <p className="text-[11px] text-theme-textSecondary mt-1">
                Full mocks and sectional tests
              </p>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-theme-textSecondary mb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold">Total Questions</span>
                <BookOpen size={16} className="text-theme-secondary flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-semibold text-theme-textPrimary">
                {summary.total_correct} <span className="text-sm font-normal text-theme-textSecondary">/ {summary.total_questions_attempted}</span>
              </p>
              <p className="text-[11px] text-theme-textSecondary mt-1">
                Correct answers confirmed
              </p>
            </div>

            <div className="bg-theme-surface border border-theme-border rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between text-theme-textSecondary mb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold">Average Pacing</span>
                <Clock size={16} className="text-theme-tertiary flex-shrink-0" />
              </div>
              <p className="text-2xl sm:text-3xl font-serif font-semibold text-theme-textPrimary">
                {summary.average_time_per_question > 0 ? `${summary.average_time_per_question}s` : '—'}
              </p>
              <p className="text-[11px] text-theme-textSecondary mt-1">
                Per question answered
              </p>
            </div>
          </div>

          {/* Diagnostic Strengths & Weaknesses Banner */}
          {(summary.weaknesses?.length > 0 || summary.strengths?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.weaknesses?.length > 0 && (
                <div className="bg-[#FDF3F1] border border-[#F4CCC6] rounded-xl p-5">
                  <div className="flex items-center space-x-2 text-[#802D22] mb-1.5">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Focus Recommended</span>
                  </div>
                  <p className="text-sm text-theme-textPrimary font-medium">
                    {summary.weaknesses.join(', ')}
                  </p>
                  <p className="text-xs text-theme-textSecondary mt-1 mb-3">
                    These subjects are currently below 60% accuracy. Target them in practice sessions to boost your overall ranking.
                  </p>
                  <Link
                    to="/practice"
                    className="inline-flex items-center space-x-1.5 text-xs text-[#802D22] font-semibold hover:underline"
                  >
                    <span>Start Practice Session &rarr;</span>
                  </Link>
                </div>
              )}

              {summary.strengths?.length > 0 && (
                <div className="bg-[#F2F8F0] border border-[#CDE3CB] rounded-xl p-5">
                  <div className="flex items-center space-x-2 text-[#355B2E] mb-1.5">
                    <Award size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Strong Competencies</span>
                  </div>
                  <p className="text-sm text-theme-textPrimary font-medium">
                    {summary.strengths.join(', ')}
                  </p>
                  <p className="text-xs text-theme-textSecondary mt-1">
                    Consistent performance with 75%+ accuracy in these areas. Maintain regular revision to keep your speed sharp.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Subject-Wise Performance Breakdown */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-serif font-semibold text-theme-textPrimary">
                  Subject-Wise Analysis & Competency
                </h2>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Detailed accuracy, questions solved, and proficiency ratings for all 6 subjects
                </p>
              </div>
              <Link
                to="/practice"
                className="text-xs font-semibold text-theme-textPrimary hover:underline"
              >
                Practice any subject &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectList.map(sub => {
                const acc = sub.accuracy || 0;
                let badgeClass = 'bg-theme-background text-theme-textSecondary border-theme-border';
                let badgeText = 'Not Started';

                if (sub.attempted > 0) {
                  if (acc >= 75) {
                    badgeClass = 'bg-[#F2F8F0] text-[#355B2E] border-[#CDE3CB]';
                    badgeText = 'Strong';
                  } else if (acc >= 50) {
                    badgeClass = 'bg-[#FBF6EE] text-[#856327] border-[#F2D9B1]';
                    badgeText = 'Moderate';
                  } else {
                    badgeClass = 'bg-[#FDF0ED] text-[#802D22] border-[#F4CCC6]';
                    badgeText = 'Needs Practice';
                  }
                }

                return (
                  <div
                    key={sub.code}
                    className="bg-theme-background border border-theme-border rounded-xl p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-serif font-semibold text-theme-textPrimary text-sm">
                          {sub.name}
                        </span>
                        <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-2xl font-serif font-semibold text-theme-textPrimary">
                          {sub.attempted > 0 ? `${acc}%` : '—'}
                        </span>
                        <span className="text-xs text-theme-textSecondary">
                          {sub.correct} / {sub.attempted} correct
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-[#E5DFD6] h-1.5 rounded-full overflow-hidden mb-3">
                        <div
                          style={{ width: `${sub.attempted > 0 ? acc : 0}%` }}
                          className={`h-full ${acc >= 75 ? 'bg-[#A7C4BC]' : acc >= 50 ? 'bg-[#F2D9B1]' : 'bg-[#E8C4C4]'}`}
                        ></div>
                      </div>
                    </div>

                    <Link
                      to="/practice"
                      className="text-[11px] font-medium text-theme-textSecondary hover:text-theme-textPrimary flex items-center justify-between pt-2 border-t border-theme-border"
                    >
                      <span>Practice {sub.name}</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Trend Chart */}
          {summary.progress_trend?.length > 1 && (
            <div className="bg-theme-surface border border-theme-border rounded-xl p-6">
              <h2 className="text-lg font-serif font-semibold text-theme-textPrimary mb-1">
                Accuracy Progression Trend
              </h2>
              <p className="text-xs text-theme-textSecondary mb-6">
                Historical accuracy trajectory across your consecutive test attempts
              </p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary.progress_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5DFD6" vertical={false} />
                    <XAxis dataKey="date" stroke="#6B6560" fontSize={11} tickLine={false} />
                    <YAxis stroke="#6B6560" fontSize={11} tickLine={false} domain={[0, 100]} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-theme-surface border border-theme-border p-3 rounded-lg shadow-sm text-xs space-y-1">
                              <p className="font-serif font-semibold text-theme-textPrimary">{data.title}</p>
                              <p className="text-theme-textSecondary">Score: {data.score} / {data.max_score}</p>
                              <p className="text-theme-primary font-bold">Accuracy: {data.accuracy}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#8AA89E" 
                      fill="#A7C4BC" 
                      fillOpacity={0.3} 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Recent Test History Table */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-serif font-semibold text-theme-textPrimary">
                  Recent Tests & Detailed Reviews
                </h2>
                <p className="text-xs text-theme-textSecondary mt-0.5">
                  Click 'Review Analysis' on any past test to view all right, wrong, and unattempted questions
                </p>
              </div>
              <Link
                to="/history"
                className="text-xs font-semibold text-theme-textPrimary hover:underline"
              >
                View Full History &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {summary.recent_attempts?.slice(0, 5).map(item => (
                <div
                  key={item.id}
                  className="bg-theme-background border border-theme-border p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-theme-primary/60 transition-colors"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-serif font-medium text-theme-textPrimary text-sm">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-textSecondary">
                        {item.type === 'full_length' ? 'Full Length Mock' : 'Subject Practice'}
                      </span>
                    </div>
                    <p className="text-xs text-theme-textSecondary mt-0.5">
                      {item.date} {item.time_taken_seconds > 0 && `• ${formatSeconds(item.time_taken_seconds)}`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="font-serif font-semibold text-theme-textPrimary text-sm">
                        {item.score} / {item.max_score}
                      </span>
                      <span className="text-xs text-theme-textSecondary block">
                        {item.accuracy}%
                      </span>
                    </div>

                    <button
                      onClick={() => navigate(`/test/${item.id}?review=1`)}
                      className="px-3 py-1.5 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center space-x-1.5 border border-theme-primary/40"
                    >
                      <Eye size={13} />
                      <span>Review Analysis</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
