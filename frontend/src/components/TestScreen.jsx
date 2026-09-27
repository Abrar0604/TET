import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Check, X, Bookmark, Clock, ArrowRight, ArrowLeft, Pause, Play, AlertCircle } from 'lucide-react';
import QuestionAnalysisView from './QuestionAnalysisView';
import { useAuth } from '../context/AuthContext';

export default function TestScreen() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { authFetch } = useAuth();

  const isReviewModeQuery = new URLSearchParams(location.search).get('review') === '1';

  const [testData, setTestData] = useState(null);
  const [currentSubject, setCurrentSubject] = useState('');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { subject: { qId: ans } }
  const [markedForReview, setMarkedForReview] = useState({}); // { subject: { qId: boolean } }
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [canPause, setCanPause] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Autosave helper ref to avoid closures issues
  const answersRef = useRef(answers);
  const markedRef = useRef(markedForReview);
  answersRef.current = answers;
  markedRef.current = markedForReview;

  const triggerAutosave = async (updatedAnswers, updatedMarked) => {
    if (submitted) return;
    try {
      await authFetch(`/api/test/${attemptId}/autosave`, {
        method: 'POST',
        body: JSON.stringify({
          answers: updatedAnswers || answersRef.current,
          marked_for_review: updatedMarked || markedRef.current
        })
      });
    } catch (err) {
      console.warn('Autosave background sync:', err);
    }
  };

  useEffect(() => {
    const fetchTest = async () => {
      setLoading(true);
      try {
        const res = await authFetch(`/api/attempts/${attemptId}/review`);
        if (!res.ok) {
          throw new Error('Failed to load test session');
        }
        const data = await res.json();
        
        // If test is already submitted or opened in review mode
        if (data.submitted_at || isReviewModeQuery || data.questions_analysis?.length > 0) {
          setResult(data);
          setSubmitted(true);
          setTestData(data);
          setLoading(false);
          return;
        }

        setTestData(data);
        const subjects = data.subjects_included || Object.keys(data.questions || {});
        if (subjects.length > 0) {
          setCurrentSubject(subjects[0]);
        }
        
        const durationSec = (data.duration_minutes || 60) * 60;
        setTotalDurationSeconds(durationSec);

        // Calculate accurate real-world remaining seconds
        const remSec = data.remaining_seconds !== undefined ? data.remaining_seconds : durationSec;
        setTimeLeft(remSec);
        setIsPaused(Boolean(data.is_paused));
        setCanPause(Boolean(data.can_pause ?? (data.test_type === 'subject_wise')));
        
        // Restore answers and marked for review from active session
        const initAns = {};
        const initMarked = {};
        subjects.forEach(sub => {
          initAns[sub] = (data.current_answers && data.current_answers[sub]) ? data.current_answers[sub] : {};
          initMarked[sub] = (data.marked_for_review && data.marked_for_review[sub]) ? data.marked_for_review[sub] : {};
        });
        setAnswers(initAns);
        setMarkedForReview(initMarked);

        // If time already expired before user returned
        if (remSec <= 0 && !data.is_paused) {
          handleSubmitDirect(initAns);
          return;
        }

      } catch (err) {
        console.error('Error fetching test:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTest();
  }, [attemptId, isReviewModeQuery]);

  // Wall-clock timer countdown (never stops unless user explicitly paused in subject-wise test)
  useEffect(() => {
    if (timeLeft === null || submitted || isPaused) return;
    
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [timeLeft, submitted, isPaused]);

  const handleSubmit = async () => {
    handleSubmitDirect(answers);
  };

  const handleSubmitDirect = async (finalAnswers) => {
    if (submitting || submitted) return;
    setSubmitting(true);

    const timeSpent = Math.max(0, totalDurationSeconds - (timeLeft || 0));

    try {
      const res = await authFetch('/api/test/submit', {
        method: 'POST',
        body: JSON.stringify({
          attempt_id: attemptId,
          answers: finalAnswers || answers,
          time_taken_seconds: timeSpent
        })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setSubmitted(true);
      } else {
        alert('There was an issue submitting your test. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting test:', err);
      alert('Error submitting test. Please check network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptionSelect = (optIndex) => {
    if (submitted || isPaused) return;
    const questions = testData?.questions?.[currentSubject] || [];
    const q = questions[currentQIndex];
    if (!q) return;
    const qId = q.question_id;
    
    const updated = {
      ...answers,
      [currentSubject]: {
        ...(answers[currentSubject] || {}),
        [qId]: optIndex
      }
    };
    setAnswers(updated);
    triggerAutosave(updated, markedForReview);
  };

  const toggleReview = () => {
    if (submitted || isPaused) return;
    const questions = testData?.questions?.[currentSubject] || [];
    const q = questions[currentQIndex];
    if (!q) return;
    const qId = q.question_id;
    
    const updated = {
      ...markedForReview,
      [currentSubject]: {
        ...(markedForReview[currentSubject] || {}),
        [qId]: !markedForReview[currentSubject]?.[qId]
      }
    };
    setMarkedForReview(updated);
    triggerAutosave(answers, updated);
  };

  const handleTogglePause = async () => {
    if (!canPause || submitted) return;
    const nextPauseState = !isPaused;
    try {
      const res = await authFetch(`/api/test/${attemptId}/toggle-pause`, {
        method: 'POST',
        body: JSON.stringify({ pause: nextPauseState })
      });
      if (res.ok) {
        const data = await res.json();
        setIsPaused(data.is_paused);
        if (data.remaining_seconds !== undefined) {
          setTimeLeft(data.remaining_seconds);
        }
      }
    } catch (err) {
      console.error('Error toggling pause:', err);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-theme-textSecondary text-sm">
        Resuming your test session and question state...
      </div>
    );
  }

  // If test is submitted or in review mode, show the dedicated Question Analysis View
  if (submitted && result) {
    return (
      <QuestionAnalysisView
        result={result}
        title={result.title || testData?.title || 'Test Analysis & Review'}
        onBackToDashboard={() => navigate('/')}
      />
    );
  }

  if (!testData || !testData.questions) {
    return (
      <div className="p-12 text-center text-theme-textSecondary">
        Test session could not be found or has expired.
      </div>
    );
  }

  const subjects = testData.subjects_included || Object.keys(testData.questions || {});
  const questions = testData.questions[currentSubject] || [];
  const currentQuestion = questions[currentQIndex];

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center text-theme-textSecondary">
        No questions found for subject {currentSubject}.
      </div>
    );
  }

  const currentQId = currentQuestion.question_id;
  const currentAnswer = answers[currentSubject]?.[currentQId];
  const isMarked = markedForReview[currentSubject]?.[currentQId];
  const isWarning = timeLeft <= 300; // 5 mins
  const isRtl = /[\u0600-\u06FF]/.test(currentQuestion.question_text || '');

  return (
    <div className="flex flex-col h-full bg-theme-background">
      {/* Top Test Header Bar */}
      <div className="bg-theme-surface border-b border-theme-border px-6 py-3.5 flex justify-between items-center flex-shrink-0">
        {/* Subject Navigation Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-1 sm:pb-0">
          {subjects.map(sub => (
            <button 
              key={sub}
              onClick={() => { setCurrentSubject(sub); setCurrentQIndex(0); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${currentSubject === sub ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'bg-theme-background text-theme-textSecondary hover:bg-theme-border'}`}
            >
              {sub}
            </button>
          ))}
        </div>
        
        {/* Timer Display & Pause Control */}
        <div className="flex items-center space-x-3">
          {/* Pause Button (Subject-wise tests only) */}
          {canPause && (
            <button
              onClick={handleTogglePause}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
                isPaused 
                  ? 'bg-theme-primary text-theme-textPrimary border-theme-primary font-semibold' 
                  : 'bg-theme-background text-theme-textSecondary border-theme-border hover:bg-theme-surface'
              }`}
              title={isPaused ? "Resume Timer" : "Pause Timer (Subject-wise only)"}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? 'Resume Timer' : 'Pause Timer'}</span>
            </button>
          )}

          {/* Wall-Clock Countdown */}
          <div className={`font-mono text-sm font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-2 ${
            isPaused
              ? 'bg-theme-tertiary text-theme-textPrimary border border-theme-border'
              : (isWarning ? 'bg-theme-warning text-theme-textPrimary border border-theme-warning' : 'bg-theme-background text-theme-textSecondary border border-theme-border')
          }`}>
            <Clock size={15} />
            <span>{formatTime(timeLeft)}</span>
            {isPaused && <span className="text-[10px] uppercase font-sans font-bold ml-1 text-theme-textPrimary">(Paused)</span>}
          </div>
        </div>
      </div>

      {/* Paused Overlay Notice */}
      {isPaused && (
        <div className="bg-[#FAF4ED] border-b border-[#F2D9B1] px-6 py-2.5 text-xs text-[#7A5B27] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Pause size={14} className="flex-shrink-0" />
            <span>Timer is paused. You can take a break or review your answers without losing time.</span>
          </div>
          <button
            onClick={handleTogglePause}
            className="px-2.5 py-1 bg-theme-primary text-theme-textPrimary rounded text-xs font-semibold hover:opacity-90"
          >
            Resume Timer
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Main Question Workspace */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-serif font-semibold text-theme-textPrimary">
                Question {currentQIndex + 1} of {questions.length} ({currentSubject})
              </span>
              <span className="text-[11px] text-theme-textSecondary">
                Autosaved to your session
              </span>
            </div>

            <button 
              onClick={toggleReview}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 ${isMarked ? 'bg-theme-tertiary text-theme-textPrimary font-semibold' : 'border border-theme-border text-theme-textSecondary hover:bg-theme-surface'}`}
            >
              <Bookmark size={13} />
              <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
            </button>
          </div>
          
          {/* Question Box */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 mb-6 flex-1 shadow-sm">
            <p 
              dir={isRtl ? 'rtl' : 'ltr'} 
              className={`text-base text-theme-textPrimary mb-6 leading-relaxed whitespace-pre-wrap ${isRtl ? 'text-right font-serif text-lg' : ''}`}
            >
              {currentQuestion.question_text}
            </p>
            
            {/* Options */}
            <div className="space-y-3">
              {Object.keys(currentQuestion.options || {}).map((key) => {
                const optText = currentQuestion.options[key];
                if (!optText) return null;
                const isSelected = currentAnswer === parseInt(key);
                
                return (
                  <button
                    key={key}
                    dir={isRtl ? 'rtl' : 'ltr'}
                    onClick={() => handleOptionSelect(parseInt(key))}
                    className={`w-full p-3.5 rounded-lg border transition-colors flex items-center ${isRtl ? 'flex-row-reverse text-right space-x-reverse space-x-3' : 'text-left space-x-3'} ${isSelected ? 'border-theme-primary bg-[#F2F8F6]' : 'border-theme-border hover:bg-theme-background'}`}
                  >
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-mono ${isSelected ? 'border-theme-primary bg-theme-primary text-theme-textPrimary font-semibold' : 'border-theme-textSecondary/40 text-theme-textSecondary'}`}>
                      {key}
                    </div>
                    <span className={`text-sm flex-1 ${isSelected ? 'text-theme-textPrimary font-medium' : 'text-theme-textSecondary'}`}>
                      {optText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Bottom Action Controls */}
          <div className="flex justify-between items-center mt-auto pt-4 border-t border-theme-border flex-shrink-0">
            <button 
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium text-theme-textSecondary hover:bg-theme-surface disabled:opacity-40 transition-colors"
            >
              &larr; Previous
            </button>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  const updated = {
                    ...answers,
                    [currentSubject]: {
                      ...answers[currentSubject],
                      [currentQId]: null
                    }
                  };
                  setAnswers(updated);
                  triggerAutosave(updated, markedForReview);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-theme-textSecondary hover:bg-theme-surface border border-theme-border"
              >
                Clear Choice
              </button>

              {currentQIndex < questions.length - 1 ? (
                <button 
                  onClick={() => setCurrentQIndex(prev => prev + 1)}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-theme-primary text-theme-textPrimary hover:opacity-90 font-semibold"
                >
                  Save & Next &rarr;
                </button>
              ) : (
                <button 
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg text-xs font-medium bg-[#8AA89E] text-white hover:opacity-90 font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Test & View Analysis'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Palette Sidebar */}
        <div className="w-full md:w-72 bg-theme-surface border-t md:border-t-0 md:border-l border-theme-border flex flex-col flex-shrink-0 h-44 md:h-auto overflow-y-auto">
          <div className="p-4 border-b border-theme-border sticky top-0 bg-theme-surface z-10">
            <h3 className="font-serif text-xs font-semibold uppercase tracking-wider text-theme-textPrimary">
              Question Palette
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-theme-textSecondary">
              <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-theme-background border border-theme-border"></div><span>Not Visited</span></div>
              <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-theme-error"></div><span>Skipped</span></div>
              <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-theme-success"></div><span>Answered</span></div>
              <div className="flex items-center space-x-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-theme-tertiary"></div><span>Marked</span></div>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const qId = q.question_id;
              const hasAns = answers[currentSubject]?.[qId] !== undefined && answers[currentSubject]?.[qId] !== null;
              const isMark = markedForReview[currentSubject]?.[qId];
              
              let bgColor = 'bg-theme-background border border-theme-border';
              let textColor = 'text-theme-textSecondary';
              
              if (isMark) {
                bgColor = 'bg-theme-tertiary border-transparent';
                textColor = 'text-theme-textPrimary font-semibold';
              } else if (hasAns) {
                bgColor = 'bg-theme-success border-transparent';
                textColor = 'text-theme-textPrimary font-semibold';
              } else if (idx < currentQIndex) {
                bgColor = 'bg-theme-error border-transparent';
                textColor = 'text-theme-textPrimary';
              }

              const isCurrent = idx === currentQIndex;
              
              return (
                <button
                  key={qId}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`aspect-square flex items-center justify-center rounded-md text-xs font-medium transition-all ${bgColor} ${textColor} ${isCurrent ? 'ring-2 ring-theme-textPrimary ring-offset-1' : ''}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="p-4 mt-auto border-t border-theme-border space-y-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-theme-primary text-theme-textPrimary text-xs font-semibold hover:opacity-90 transition-opacity border border-theme-primary/50"
            >
              {submitting ? 'Evaluating...' : 'Finish & Submit Test'}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full py-1.5 rounded-lg text-[11px] text-theme-textSecondary hover:text-theme-textPrimary transition-colors text-center"
            >
              Save progress & exit to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
