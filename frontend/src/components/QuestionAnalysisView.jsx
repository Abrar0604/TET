import React, { useState } from 'react';
import { Check, X, Minus, HelpCircle, ArrowLeft, BarChart2, ListFilter, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QuestionAnalysisView({ result, onBackToDashboard, title }) {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'correct', 'incorrect', 'unattempted'
  const [filterSubject, setFilterSubject] = useState('all');
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'summary'
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'focus'
  const [focusedIndex, setFocusedIndex] = useState(0);

  const questions = result?.questions_analysis || [];

  // Get distinct subjects
  const subjects = Array.from(new Set(questions.map(q => q.subject))).filter(Boolean);

  // Filter questions
  const filteredQuestions = questions.filter(q => {
    if (filterStatus === 'correct' && !q.is_correct) return false;
    if (filterStatus === 'incorrect' && (q.status !== 'incorrect')) return false;
    if (filterStatus === 'unattempted' && (q.status !== 'unattempted')) return false;
    if (filterSubject !== 'all' && q.subject !== filterSubject) return false;
    return true;
  });

  const correctCount = result?.correct_count ?? questions.filter(q => q.is_correct).length;
  const incorrectCount = result?.incorrect_count ?? questions.filter(q => q.status === 'incorrect').length;
  const unattemptedCount = result?.unattempted_count ?? questions.filter(q => q.status === 'unattempted').length;
  const totalCount = questions.length;
  const accuracy = result?.accuracy ?? (totalCount > 0 ? Math.round((correctCount / (correctCount + incorrectCount || 1)) * 100) : 0);

  const formatSeconds = (sec) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const isRTLText = (text) => /[\u0600-\u06FF]/.test(text || '');

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-theme-border pb-6">
        <div>
          <button
            onClick={onBackToDashboard || (() => navigate('/'))}
            className="inline-flex items-center space-x-1.5 text-xs text-theme-textSecondary hover:text-theme-textPrimary mb-2 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-serif text-theme-textPrimary font-semibold">
            {title || result?.title || 'Test Analysis & Review'}
          </h1>
          <p className="text-xs text-theme-textSecondary mt-1">
            Submitted on {result?.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'Recently'}
            {result?.time_taken_seconds > 0 && ` • Time taken: ${formatSeconds(result.time_taken_seconds)}`}
          </p>
        </div>

        {/* View Switch: Analysis Tab vs Summary */}
        <div className="flex items-center bg-theme-surface border border-theme-border rounded-lg p-1 text-xs font-medium">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${activeTab === 'analysis' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'text-theme-textSecondary hover:text-theme-textPrimary'}`}
          >
            <ListFilter size={14} />
            <span>Question Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 ${activeTab === 'summary' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'text-theme-textSecondary hover:text-theme-textPrimary'}`}
          >
            <BarChart2 size={14} />
            <span>Scorecard & Metrics</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-theme-textSecondary">Score</p>
          <p className="text-2xl font-serif font-semibold text-theme-textPrimary mt-1">
            {result?.score} <span className="text-sm font-normal text-theme-textSecondary">/ {result?.max_score}</span>
          </p>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-theme-textSecondary">Accuracy</p>
          <p className="text-2xl font-serif font-semibold text-theme-textPrimary mt-1">
            {accuracy}%
          </p>
        </div>

        <div className="bg-[#F2F8F0] border border-[#CDE3CB] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-[#355B2E]">Right (Correct)</p>
          <p className="text-2xl font-serif font-semibold text-[#2D5226] mt-1">
            {correctCount}
          </p>
        </div>

        <div className="bg-[#FDF0ED] border border-[#F4CCC6] rounded-xl p-4">
          <p className="text-xs uppercase tracking-wider text-[#8A3328]">Wrong (Incorrect)</p>
          <p className="text-2xl font-serif font-semibold text-[#802D22] mt-1">
            {incorrectCount}
          </p>
        </div>
      </div>

      {/* TAB 1: QUESTION ANALYSIS VIEW */}
      {activeTab === 'analysis' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterStatus === 'all' ? 'bg-theme-textPrimary text-white border-theme-textPrimary' : 'bg-theme-background text-theme-textSecondary border-theme-border hover:bg-theme-surface'}`}
              >
                All Questions ({totalCount})
              </button>

              <button
                onClick={() => setFilterStatus('correct')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${filterStatus === 'correct' ? 'bg-[#355B2E] text-white border-[#355B2E]' : 'bg-[#F2F8F0] text-[#355B2E] border-[#CDE3CB] hover:bg-[#E5F2E2]'}`}
              >
                <Check size={13} />
                <span>Right ({correctCount})</span>
              </button>

              <button
                onClick={() => setFilterStatus('incorrect')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${filterStatus === 'incorrect' ? 'bg-[#802D22] text-white border-[#802D22]' : 'bg-[#FDF0ED] text-[#8A3328] border-[#F4CCC6] hover:bg-[#FBE5E1]'}`}
              >
                <X size={13} />
                <span>Wrong ({incorrectCount})</span>
              </button>

              <button
                onClick={() => setFilterStatus('unattempted')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${filterStatus === 'unattempted' ? 'bg-[#555] text-white border-[#555]' : 'bg-theme-background text-theme-textSecondary border-theme-border hover:bg-theme-surface'}`}
              >
                <Minus size={13} />
                <span>Unattempted ({unattemptedCount})</span>
              </button>
            </div>

            {/* Subject Selector & View Mode Switch */}
            <div className="flex items-center gap-3">
              {subjects.length > 1 && (
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="text-xs bg-theme-background border border-theme-border rounded-lg px-3 py-2 text-theme-textPrimary focus:outline-none focus:border-theme-primary"
                >
                  <option value="all">All Subjects ({subjects.length})</option>
                  {subjects.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              <div className="flex border border-theme-border rounded-lg overflow-hidden text-xs">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 ${viewMode === 'list' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'bg-theme-surface text-theme-textSecondary'}`}
                  title="List view"
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode('focus')}
                  className={`px-2.5 py-1.5 ${viewMode === 'focus' ? 'bg-theme-primary text-theme-textPrimary font-semibold' : 'bg-theme-surface text-theme-textSecondary'}`}
                  title="Single Question Focus"
                >
                  Focus
                </button>
              </div>
            </div>
          </div>

          {/* Quick Jump Palette */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-theme-textSecondary">
                Question Quick Navigator
              </span>
              <div className="flex items-center space-x-4 text-xs text-theme-textSecondary">
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#B7CDB0]"></span><span>Right</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#E3B7B0]"></span><span>Wrong</span></span>
                <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#E5DFD6]"></span><span>Skipped</span></span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                let badgeClass = 'bg-[#FAF7F2] text-theme-textSecondary border border-theme-border';
                if (q.is_correct) {
                  badgeClass = 'bg-[#D3E5CE] text-[#24471D] border border-[#B7CDB0] font-semibold';
                } else if (q.status === 'incorrect') {
                  badgeClass = 'bg-[#F8D2CC] text-[#78241B] border border-[#E3B7B0] font-semibold';
                } else {
                  badgeClass = 'bg-[#EFEAE2] text-theme-textSecondary border border-theme-border';
                }

                return (
                  <button
                    key={q.question_id || idx}
                    onClick={() => {
                      if (viewMode === 'focus') {
                        setFocusedIndex(idx);
                      } else {
                        const el = document.getElementById(`analysis-q-${idx}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`w-7 h-7 rounded text-xs flex items-center justify-center transition-transform hover:scale-105 ${badgeClass}`}
                    title={`Question ${idx + 1}: ${q.status}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIST VIEW OF QUESTIONS */}
          {viewMode === 'list' && (
            <div className="space-y-6">
              {filteredQuestions.length === 0 ? (
                <div className="bg-theme-surface border border-theme-border rounded-xl p-10 text-center text-theme-textSecondary">
                  No questions match the selected filter.
                </div>
              ) : (
                filteredQuestions.map((q, filteredIdx) => {
                  const originalIdx = questions.findIndex(item => item.question_id === q.question_id);
                  const qNum = originalIdx >= 0 ? originalIdx + 1 : filteredIdx + 1;
                  const isRtl = isRTLText(q.question_text);

                  return (
                    <div
                      key={q.question_id || filteredIdx}
                      id={`analysis-q-${originalIdx}`}
                      className="bg-theme-surface border border-theme-border rounded-xl p-6 transition-all hover:border-theme-primary/50"
                    >
                      {/* Question Top Meta */}
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 pb-3 border-b border-theme-border">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold font-serif text-theme-textPrimary">
                            Question {qNum}
                          </span>
                          {q.subject && (
                            <span className="text-xs bg-theme-background border border-theme-border text-theme-textSecondary px-2.5 py-0.5 rounded-full">
                              {q.subject_name || q.subject}
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div>
                          {q.is_correct ? (
                            <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-[#F2F8F0] border border-[#CDE3CB] text-[#355B2E] font-medium">
                              <Check size={13} />
                              <span>Right (+1)</span>
                            </span>
                          ) : q.status === 'incorrect' ? (
                            <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-[#FDF0ED] border border-[#F4CCC6] text-[#802D22] font-medium">
                              <X size={13} />
                              <span>Wrong (0)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-theme-background border border-theme-border text-theme-textSecondary">
                              <Minus size={13} />
                              <span>Not Attempted</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <p
                        dir={isRtl ? 'rtl' : 'ltr'}
                        className={`text-base text-theme-textPrimary mb-6 leading-relaxed whitespace-pre-wrap ${isRtl ? 'text-right font-serif text-lg' : ''}`}
                      >
                        {q.question_text}
                      </p>

                      {/* Options with Comparison */}
                      <div className="space-y-3">
                        {Object.keys(q.options || {}).map((key) => {
                          const optKey = parseInt(key);
                          const optText = q.options[key];
                          if (!optText) return null;

                          const isUserChoice = q.selected_option === optKey;
                          const isCorrectOption = q.correct_option === optKey;

                          let optionStyle = 'border-theme-border bg-theme-background text-theme-textSecondary';
                          let badge = null;

                          if (isUserChoice && isCorrectOption) {
                            // User selected the correct option
                            optionStyle = 'border-[#A2C99D] bg-[#EAF4E8] text-[#24471D] font-medium';
                            badge = (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#D3E5CE] text-[#24471D] font-semibold flex items-center space-x-1">
                                <Check size={12} />
                                <span>Your Answer (Correct)</span>
                              </span>
                            );
                          } else if (isUserChoice && !isCorrectOption) {
                            // User selected wrong option
                            optionStyle = 'border-[#EBB6AC] bg-[#FDF0ED] text-[#78241B] font-medium';
                            badge = (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#F8D2CC] text-[#78241B] font-semibold flex items-center space-x-1">
                                <X size={12} />
                                <span>Your Choice (Incorrect)</span>
                              </span>
                            );
                          } else if (isCorrectOption) {
                            // This is the correct option that the user didn't pick
                            optionStyle = 'border-[#B4DCB0] bg-[#F2F8F0] text-[#2D5226] font-medium';
                            badge = (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#D3E5CE] text-[#2D5226] font-semibold flex items-center space-x-1">
                                <Check size={12} />
                                <span>Correct Answer</span>
                              </span>
                            );
                          }

                          return (
                            <div
                              key={key}
                              dir={isRtl ? 'rtl' : 'ltr'}
                              className={`p-3.5 rounded-lg border flex items-center justify-between transition-colors ${isRtl ? 'flex-row-reverse text-right' : 'text-left'} ${optionStyle}`}
                            >
                              <div className={`flex items-start space-x-3 ${isRtl ? 'space-x-reverse' : ''}`}>
                                <div className={`flex-shrink-0 w-6 h-6 rounded-full border text-xs flex items-center justify-center font-mono ${isCorrectOption ? 'border-[#355B2E] bg-[#355B2E] text-white' : (isUserChoice ? 'border-[#802D22] bg-[#802D22] text-white' : 'border-theme-border bg-theme-surface text-theme-textSecondary')}`}>
                                  {key}
                                </div>
                                <span className="text-sm pt-0.5">{optText}</span>
                              </div>
                              {badge && <div className={isRtl ? 'mr-3' : 'ml-3'}>{badge}</div>}
                            </div>
                          );
                        })}
                      </div>

                      {/* Explanation note for unattempted */}
                      {q.status === 'unattempted' && (
                        <div className="mt-4 p-3 rounded-lg bg-theme-background border border-theme-border text-xs text-theme-textSecondary flex items-center space-x-2">
                          <HelpCircle size={14} className="text-theme-textSecondary flex-shrink-0" />
                          <span>
                            Question was not attempted. The correct option is <strong>Option {q.correct_option}</strong>.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* FOCUS VIEW (ONE QUESTION AT A TIME) */}
          {viewMode === 'focus' && questions.length > 0 && (
            <div className="bg-theme-surface border border-theme-border rounded-xl p-6">
              {(() => {
                const q = questions[focusedIndex] || questions[0];
                const isRtl = isRTLText(q.question_text);

                return (
                  <div>
                    <div className="flex justify-between items-center pb-4 mb-4 border-b border-theme-border">
                      <span className="font-serif font-semibold text-theme-textPrimary">
                        Question {focusedIndex + 1} of {questions.length} ({q.subject_name || q.subject})
                      </span>
                      <div>
                        {q.is_correct ? (
                          <span className="text-xs px-2.5 py-1 rounded bg-[#F2F8F0] border border-[#CDE3CB] text-[#355B2E] font-medium">Right</span>
                        ) : q.status === 'incorrect' ? (
                          <span className="text-xs px-2.5 py-1 rounded bg-[#FDF0ED] border border-[#F4CCC6] text-[#802D22] font-medium">Wrong</span>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded bg-theme-background border border-theme-border text-theme-textSecondary">Unattempted</span>
                        )}
                      </div>
                    </div>

                    <p dir={isRtl ? 'rtl' : 'ltr'} className={`text-lg text-theme-textPrimary mb-6 whitespace-pre-wrap leading-relaxed ${isRtl ? 'text-right font-serif' : ''}`}>
                      {q.question_text}
                    </p>

                    <div className="space-y-3 mb-6">
                      {Object.keys(q.options || {}).map((key) => {
                        const optKey = parseInt(key);
                        const optText = q.options[key];
                        const isUserChoice = q.selected_option === optKey;
                        const isCorrectOption = q.correct_option === optKey;

                        let style = 'border-theme-border bg-theme-background text-theme-textSecondary';
                        if (isUserChoice && isCorrectOption) style = 'border-[#A2C99D] bg-[#EAF4E8] text-[#24471D] font-medium';
                        else if (isUserChoice && !isCorrectOption) style = 'border-[#EBB6AC] bg-[#FDF0ED] text-[#78241B] font-medium';
                        else if (isCorrectOption) style = 'border-[#B4DCB0] bg-[#F2F8F0] text-[#2D5226] font-medium';

                        return (
                          <div key={key} dir={isRtl ? 'rtl' : 'ltr'} className={`p-4 rounded-lg border flex items-center justify-between ${style}`}>
                            <div className="flex items-center space-x-3">
                              <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs">{key}</span>
                              <span className="text-sm">{optText}</span>
                            </div>
                            {isUserChoice && isCorrectOption && <span className="text-xs text-[#24471D] font-semibold">Your Answer (Correct)</span>}
                            {isUserChoice && !isCorrectOption && <span className="text-xs text-[#78241B] font-semibold">Your Choice (Incorrect)</span>}
                            {!isUserChoice && isCorrectOption && <span className="text-xs text-[#2D5226] font-semibold">Correct Answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-theme-border">
                      <button
                        onClick={() => setFocusedIndex(prev => Math.max(0, prev - 1))}
                        disabled={focusedIndex === 0}
                        className="px-4 py-2 border border-theme-border rounded-lg text-xs font-medium text-theme-textSecondary disabled:opacity-40 hover:bg-theme-background"
                      >
                        &larr; Previous Question
                      </button>
                      <span className="text-xs text-theme-textSecondary">
                        Use the question navigator above to jump to any question
                      </span>
                      <button
                        onClick={() => setFocusedIndex(prev => Math.min(questions.length - 1, prev + 1))}
                        disabled={focusedIndex === questions.length - 1}
                        className="px-4 py-2 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-medium disabled:opacity-40 hover:opacity-90"
                      >
                        Next Question &rarr;
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCORECARD & METRICS */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="bg-theme-surface border border-theme-border rounded-xl p-6">
            <h3 className="font-serif text-lg font-semibold text-theme-textPrimary mb-4">
              Subject-wise Breakdown
            </h3>
            
            <div className="space-y-3">
              {result?.subject_wise_score && Object.keys(result.subject_wise_score).map(subKey => {
                const sub = result.subject_wise_score[subKey];
                const subAcc = sub.total > 0 ? Math.round((sub.correct / sub.total) * 100) : 0;

                return (
                  <div key={subKey} className="bg-theme-background border border-theme-border p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-theme-textPrimary">{sub.subject_name || subKey}</span>
                      <div className="flex items-center space-x-4 text-xs">
                        <span className="text-[#355B2E] font-medium">{sub.correct} Right</span>
                        <span className="text-[#802D22] font-medium">{sub.incorrect} Wrong</span>
                        <span className="text-theme-textSecondary">{sub.skipped ?? sub.unattempted ?? 0} Skipped</span>
                        <span className="font-semibold text-theme-textPrimary">{subAcc}%</span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-[#E5DFD6] h-2 rounded-full overflow-hidden flex">
                      <div style={{ width: `${(sub.correct / sub.total) * 100}%` }} className="bg-[#A7C4BC]" title="Correct"></div>
                      <div style={{ width: `${(sub.incorrect / sub.total) * 100}%` }} className="bg-[#E8C4C4]" title="Incorrect"></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-theme-surface border border-theme-border rounded-xl p-6 flex justify-between items-center">
            <div>
              <p className="font-serif font-medium text-theme-textPrimary">Want to review questions in detail?</p>
              <p className="text-xs text-theme-textSecondary mt-0.5">Switch to the Question Analysis tab to inspect every choice.</p>
            </div>
            <button
              onClick={() => setActiveTab('analysis')}
              className="px-4 py-2 bg-theme-primary text-theme-textPrimary rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Open Question Analysis &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
