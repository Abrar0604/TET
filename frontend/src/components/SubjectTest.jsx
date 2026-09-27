import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, HelpCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function SubjectTest() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  useEffect(() => {
    authFetch('/api/subjects')
      .then(res => res.json())
      .then(data => setSubjects(data))
      .catch(err => console.error(err));
  }, []);

  const startTest = async () => {
    if (!selectedSubject || starting) return;
    setStarting(true);
    
    try {
      const res = await authFetch('/api/test/subject-wise/start', {
        method: 'POST',
        body: JSON.stringify({
          subject: selectedSubject.code,
          question_count: questionCount
        })
      });
      const data = await res.json();
      if (data.attempt_id) {
        navigate(`/test/${data.attempt_id}`, { state: { testData: data } });
      }
    } catch (err) {
      console.error(err);
      alert('Error starting test session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-theme-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-theme-textPrimary font-semibold">
          Subject Practice
        </h1>
        <p className="text-xs text-theme-textSecondary mt-1">
          Select a subject and configure the number of questions for a targeted practice session
        </p>
      </div>
      
      {!selectedSubject ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(sub => (
            <button
              key={sub.code}
              onClick={() => {
                setSelectedSubject(sub);
                setQuestionCount(Math.min(10, sub.total_questions));
              }}
              className="bg-theme-surface border border-theme-border p-5 rounded-xl hover:border-theme-primary/80 transition-all text-left flex flex-col justify-between group shadow-sm"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-theme-background border border-theme-border text-theme-textSecondary">
                    {sub.code}
                  </span>
                  <span className="text-xs text-theme-textSecondary">
                    {sub.total_questions} Questions
                  </span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-theme-textPrimary mb-1">
                  {sub.name}
                </h3>
              </div>
              <div className="pt-4 mt-2 border-t border-theme-border flex items-center justify-between text-xs text-theme-textSecondary group-hover:text-theme-textPrimary">
                <span>Start Practice</span>
                <ArrowRight size={14} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-theme-surface border border-theme-border rounded-xl p-8 max-w-lg mx-auto shadow-sm">
          <button 
            onClick={() => setSelectedSubject(null)} 
            className="inline-flex items-center space-x-1.5 text-xs text-theme-textSecondary hover:text-theme-textPrimary mb-6 transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to subjects</span>
          </button>
          
          <h2 className="text-xl font-serif font-semibold text-theme-textPrimary mb-1">
            {selectedSubject.name}
          </h2>
          <p className="text-xs text-theme-textSecondary mb-6">
            Configure the question count and pacing for this session
          </p>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-theme-textSecondary">
                Number of questions
              </label>
              <span className="font-serif font-semibold text-lg text-theme-textPrimary">
                {questionCount}
              </span>
            </div>
            <input 
              type="range" 
              min="5" 
              max={Math.min(50, selectedSubject.total_questions)} 
              step="5" 
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full accent-theme-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-theme-textSecondary mt-1">
              <span>5</span>
              <span>{Math.min(50, selectedSubject.total_questions)} max</span>
            </div>
          </div>
          
          <div className="bg-theme-background border border-theme-border p-4 rounded-lg mb-6 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-theme-textSecondary">Estimated Duration</span>
              <span className="font-semibold text-theme-textPrimary">{Math.ceil(questionCount * 1.2)} minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-theme-textSecondary">Recommended Pacing</span>
              <span className="font-semibold text-theme-textPrimary">72 seconds / question</span>
            </div>
          </div>
          
          <button 
            onClick={startTest}
            disabled={starting}
            className="w-full bg-theme-primary text-theme-textPrimary py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity border border-theme-primary/40 disabled:opacity-50"
          >
            {starting ? 'Preparing Session...' : 'Start Practice Session'}
          </button>
        </div>
      )}
    </div>
  );
}
