import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye, ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TestHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const navigate = useNavigate();
  const { authFetch, user, setAuthModalOpen } = useAuth();

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/attempts/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching test history:', err);
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

  const filteredHistory = history.filter(item => {
    if (filterType === 'subject_wise') return item.test_type === 'subject_wise';
    if (filterType === 'full_length') return item.test_type === 'full_length';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 border-b border-theme-border pb-4 sm:pb-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-theme-textPrimary font-semibold">
            Test History & Past Attempts
          </h1>
          <p className="text-xs text-theme-textSecondary mt-1">
            Review detailed question analysis, accuracy, and options for all previously submitted tests
          </p>
        </div>

        {!user && (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg border border-theme-primary bg-[#F2F8F6] text-xs font-medium text-theme-textPrimary hover:opacity-90 transition-opacity"
          >
            Sign in to sync your history
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-2 border-b border-theme-border no-scrollbar">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterType === 'all' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'text-theme-textSecondary hover:bg-theme-surface'}`}
        >
          All Attempts ({history.length})
        </button>
        <button
          onClick={() => setFilterType('subject_wise')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterType === 'subject_wise' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'text-theme-textSecondary hover:bg-theme-surface'}`}
        >
          Subject Practice
        </button>
        <button
          onClick={() => setFilterType('full_length')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${filterType === 'full_length' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'text-theme-textSecondary hover:bg-theme-surface'}`}
        >
          Full-Length Mocks
        </button>
      </div>

      {/* History List or Empty State */}
      {loading ? (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-8 sm:p-12 text-center text-theme-textSecondary text-xs sm:text-sm">
          Loading test history...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-theme-background border border-theme-border flex items-center justify-center mb-4 text-theme-textSecondary">
            <History size={22} />
          </div>
          <h3 className="font-serif text-base sm:text-lg font-medium text-theme-textPrimary mb-1">
            No test attempts found
          </h3>
          <p className="text-xs text-theme-textSecondary max-w-sm mb-6">
            Take your first subject practice test or full-length mock to start building your test history and analysis.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => navigate('/practice')}
              className="px-4 py-2 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Practice by Subject
            </button>
            <button
              onClick={() => navigate('/full-mock')}
              className="px-4 py-2 bg-theme-tertiary text-theme-textPrimary rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Take Full Mock
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const dateStr = item.date ? new Date(item.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Recent';

            return (
              <div
                key={item.id}
                className="bg-theme-surface border border-theme-border rounded-xl p-4 sm:p-5 hover:border-theme-primary/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif font-semibold text-theme-textPrimary text-sm sm:text-base">
                      {item.title || item.subject_name || 'Test Attempt'}
                    </span>
                    <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-theme-background border border-theme-border text-theme-textSecondary font-medium">
                      {item.test_type === 'full_length' ? 'Full Length Mock' : 'Subject Practice'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-theme-textSecondary">
                    <span className="flex items-center space-x-1">
                      <Clock size={12} />
                      <span>{dateStr}</span>
                    </span>
                    {item.time_taken_seconds > 0 && (
                      <span>Time: {formatSeconds(item.time_taken_seconds)}</span>
                    )}
                    <span>
                      Right: <strong className="text-[#355B2E]">{item.correct_count}</strong> | Wrong: <strong className="text-[#802D22]">{item.incorrect_count}</strong> | Skipped: {item.unattempted_count}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-theme-border/60">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-serif font-semibold text-theme-textPrimary">
                      {item.score} <span className="text-xs font-normal text-theme-textSecondary">/ {item.max_score}</span>
                    </div>
                    <div className="text-[11px] sm:text-xs text-theme-textSecondary font-medium">
                      {item.accuracy}% Accuracy
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/test/${item.id}?review=1`)}
                    className="px-3.5 py-2 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-medium hover:opacity-90 transition-opacity flex items-center space-x-1.5 border border-theme-primary/40 flex-shrink-0"
                  >
                    <Eye size={14} />
                    <span>Review Analysis</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
