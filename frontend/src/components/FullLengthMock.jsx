import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function FullLengthMock() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [starting, setStarting] = useState(false);

  const startTest = async () => {
    if (starting) return;
    setStarting(true);
    try {
      const res = await authFetch('/api/test/full-length/start', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.attempt_id) {
        navigate(`/test/${data.attempt_id}`, { state: { testData: data } });
      }
    } catch (err) {
      console.error(err);
      alert('Error initiating full-length mock. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const sections = [
    { name: 'Child Development and Pedagogy (CDP)', questions: 30, duration: '36 mins' },
    { name: 'English Language', questions: 30, duration: '36 mins' },
    { name: 'Urdu Language', questions: 30, duration: '36 mins' },
    { name: 'Mathematics', questions: 20, duration: '24 mins' },
    { name: 'Pedagogy of Science / Physical Science', questions: 20, duration: '24 mins' },
    { name: 'Biology', questions: 20, duration: '24 mins' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-theme-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-theme-textPrimary font-semibold">
          Full-Length Mock Examination
        </h1>
        <p className="text-xs text-theme-textSecondary mt-1">
          Complete 150-question timed exam covering all 6 subjects under official exam conditions
        </p>
      </div>
      
      <div className="bg-theme-surface border border-theme-border rounded-xl p-6 sm:p-8 max-w-2xl mx-auto shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-serif font-semibold text-theme-textPrimary mb-1">
            Exam Overview & Instructions
          </h2>
          <p className="text-xs text-theme-textSecondary leading-relaxed">
            This simulation mirrors the structure, pacing, and difficulty of the official TET exam. You can navigate between subjects freely and review any question before final submission.
          </p>
        </div>
        
        {/* Section Table */}
        <div className="bg-theme-background border border-theme-border rounded-xl overflow-hidden text-xs">
          <div className="px-4 py-2.5 bg-[#F5EFE6] border-b border-theme-border font-semibold text-theme-textPrimary flex justify-between">
            <span>Subject Section</span>
            <span>Questions</span>
          </div>
          <div className="divide-y divide-theme-border">
            {sections.map(sec => (
              <div key={sec.name} className="px-4 py-2.5 flex justify-between items-center text-theme-textSecondary">
                <span className="font-medium text-theme-textPrimary">{sec.name}</span>
                <span>{sec.questions} questions</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Key Exam Stats */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-theme-background border border-theme-border rounded-xl text-center">
          <div>
            <p className="text-[11px] text-theme-textSecondary uppercase tracking-wider">Total Questions</p>
            <p className="text-xl font-serif font-semibold text-theme-textPrimary mt-0.5">150</p>
          </div>
          <div className="border-x border-theme-border">
            <p className="text-[11px] text-theme-textSecondary uppercase tracking-wider">Total Time</p>
            <p className="text-xl font-serif font-semibold text-theme-textPrimary mt-0.5">150 mins</p>
          </div>
          <div>
            <p className="text-[11px] text-theme-textSecondary uppercase tracking-wider">Target Pacing</p>
            <p className="text-xl font-serif font-semibold text-theme-textPrimary mt-0.5">60s / q</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#FAF4ED] border border-[#F2D9B1] text-xs text-[#7A5B27] flex items-start space-x-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            Once started, the timer will run continuously. You can mark questions for review and access the full question analysis once completed.
          </span>
        </div>
        
        <button 
          onClick={startTest}
          disabled={starting}
          className="w-full bg-theme-primary text-theme-textPrimary py-3.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity border border-theme-primary/40 disabled:opacity-50"
        >
          {starting ? 'Generating Mock Test Paper...' : 'Begin Full-Length Mock Exam'}
        </button>
      </div>
    </div>
  );
}
