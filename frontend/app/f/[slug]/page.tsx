'use client';

import { useEffect, useState, use, useRef } from 'react';
import { api, Form, Question } from '../../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, ArrowUp, ArrowDown, ArrowRight, CornerDownLeft } from 'lucide-react';

export default function RespondentPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 is welcome screen, form.questions.length is thank you
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    loadForm();
  }, [resolvedParams.slug]);

  const loadForm = async () => {
    try {
      const data = await api<Form>(`/api/public/forms/${resolvedParams.slug}`);
      setForm(data);
    } catch (e) {
      setError('Form not found');
    }
  };

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < (form?.questions.length || 0)) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentIndex === -1 && e.key === 'Enter') {
        goToNext();
        return;
      }
      
      const q = form?.questions[currentIndex];
      if (!q) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'Enter') {
        if (q.type === 'long_text' && !e.metaKey && !e.ctrlKey) return; // Allow newlines in long_text
        e.preventDefault();
        goToNext();
      }

      // Quick selections
      if (q.type === 'yes_no') {
        if (e.key.toLowerCase() === 'y') { handleAnswer(q.id.toString(), 'Yes'); setTimeout(goToNext, 300); }
        if (e.key.toLowerCase() === 'n') { handleAnswer(q.id.toString(), 'No'); setTimeout(goToNext, 300); }
      }
      if (q.type === 'multiple_choice' || q.type === 'dropdown') {
        const opts = q.settings.options || [];
        const letterCode = e.key.toUpperCase().charCodeAt(0) - 65;
        const numCode = parseInt(e.key) - 1;
        let idx = -1;
        if (letterCode >= 0 && letterCode < opts.length) idx = letterCode;
        else if (numCode >= 0 && numCode < opts.length) idx = numCode;
        
        if (idx !== -1) {
          handleAnswer(q.id.toString(), opts[idx]);
          setTimeout(goToNext, 300);
        }
      }
      if (q.type === 'rating') {
        const num = parseInt(e.key);
        if (num > 0 && num <= (q.settings.max_rating || 5)) {
          handleAnswer(q.id.toString(), num.toString());
          setTimeout(goToNext, 300);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, form, answers]);

  const handleAnswer = (qid: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
    setError(null);
  };

  const validateCurrent = (): boolean => {
    if (currentIndex < 0) return true;
    const q = form!.questions[currentIndex];
    const val = answers[q.id.toString()];

    if (q.required && (!val || val.trim() === '')) {
      setError('Please fill this in');
      return false;
    }

    if (val) {
      if (q.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        setError('Please enter a valid email address');
        return false;
      }
      if (q.type === 'number' && isNaN(Number(val))) {
        setError('Please enter a valid number');
        return false;
      }
    }
    return true;
  };

  const goToNext = async () => {
    if (!form || submitting) return;
    if (!validateCurrent()) return;

    if (currentIndex === form.questions.length - 1) {
      submitForm();
    } else {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > -1) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
      setError(null);
    }
  };

  const submitForm = async () => {
    if (!form) return;
    try {
      setSubmitting(true);
      await api(`/api/public/forms/${form.slug}/responses`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      setDirection(1);
      setCurrentIndex(form.questions.length);
    } catch (e) {
      setError('Failed to submit form. Please try again.');
      setSubmitting(false);
    }
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        {error ? <div className="text-xl text-slate-500 font-medium">{error}</div> : <div className="animate-spin w-10 h-10 rounded-full border-3 border-indigo-200 border-t-indigo-600"></div>}
      </div>
    );
  }

  const variants = {
    enter: (dir: number) => ({ y: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { y: 0, opacity: 1 },
    exit: (dir: number) => ({ y: dir < 0 ? 40 : -40, opacity: 0 }),
  };

  const progress = currentIndex >= 0 ? Math.min(100, ((currentIndex + 1) / form.questions.length) * 100) : 0;

  return (
    <div className="h-screen w-full bg-white text-slate-900 overflow-hidden flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 h-1.5 bg-slate-100 w-full z-50">
        <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 relative flex items-center justify-center p-6 sm:p-12 md:p-24">
        <AnimatePresence custom={direction} mode="wait">
          {currentIndex === -1 && (
            <motion.div
              key="welcome"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="max-w-3xl w-full text-center"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-10 text-slate-900 leading-tight">
                {form.title}
              </h1>
              <button 
                onClick={goToNext}
                className="inline-flex items-center justify-center gap-3 bg-indigo-600 text-white text-lg md:text-xl font-bold py-4 px-12 rounded-xl hover:bg-indigo-700 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-md shadow-indigo-600/20 cursor-pointer tracking-wide"
              >
                <span>Start</span>
                <ArrowRight size={22} />
              </button>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                Press Enter <CornerDownLeft size={14} className="opacity-70" />
              </p>
            </motion.div>
          )}

          {currentIndex >= 0 && currentIndex < form.questions.length && (
            <motion.div
              key={`q-${currentIndex}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              className="max-w-3xl w-full"
            >
              <div className="flex items-start gap-4 md:gap-6">
                <span className="text-2xl md:text-3xl font-bold text-indigo-500/40 mt-1 flex-shrink-0 flex items-center gap-1">
                  {currentIndex + 1} <ArrowRight size={18} className="text-indigo-400/60" />
                </span>
                
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 text-slate-900 leading-tight tracking-tight">
                    {form.questions[currentIndex].title}
                    {form.questions[currentIndex].required && <span className="text-indigo-600 ml-1.5">*</span>}
                  </h2>
                  
                  {form.questions[currentIndex].description && (
                    <p className="text-lg md:text-xl text-gray-500 mb-8 font-medium">
                      {form.questions[currentIndex].description}
                    </p>
                  )}

                  <div className="mt-8">
                    {/* Input controls */}
                    {['short_text', 'email', 'number'].includes(form.questions[currentIndex].type) && (
                      <input
                        ref={inputRef as any}
                        type={form.questions[currentIndex].type === 'email' ? 'email' : form.questions[currentIndex].type === 'number' ? 'number' : 'text'}
                        className="w-full text-2xl md:text-3xl bg-transparent border-b-2 border-slate-200 py-4 outline-none focus:border-indigo-600 transition-colors placeholder:text-slate-300 font-medium text-slate-900"
                        placeholder="Type your answer here..."
                        value={answers[form.questions[currentIndex].id.toString()] || ''}
                        onChange={(e) => handleAnswer(form.questions[currentIndex].id.toString(), e.target.value)}
                      />
                    )}

                    {form.questions[currentIndex].type === 'long_text' && (
                      <textarea
                        ref={inputRef as any}
                        rows={4}
                        className="w-full text-xl md:text-2xl bg-transparent border-b-2 border-slate-200 py-4 outline-none focus:border-indigo-600 transition-colors placeholder:text-slate-300 font-medium resize-none text-slate-900"
                        placeholder="Type your answer here..."
                        value={answers[form.questions[currentIndex].id.toString()] || ''}
                        onChange={(e) => handleAnswer(form.questions[currentIndex].id.toString(), e.target.value)}
                      />
                    )}

                    {(form.questions[currentIndex].type === 'multiple_choice' || form.questions[currentIndex].type === 'dropdown') && (
                      <div className="space-y-3">
                        {(form.questions[currentIndex].settings.options || []).map((opt, i) => {
                          const isSelected = answers[form.questions[currentIndex].id.toString()] === opt;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                handleAnswer(form.questions[currentIndex].id.toString(), opt);
                                setTimeout(goToNext, 300);
                              }}
                              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left group cursor-pointer ${
                                isSelected 
                                  ? 'border-indigo-600 bg-indigo-50/50' 
                                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold transition-colors ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-500 group-hover:border-indigo-500/50'
                              }`}>
                                {String.fromCharCode(65 + i)}
                              </div>
                              <span className={`text-lg font-medium ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-700'}`}>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {form.questions[currentIndex].type === 'yes_no' && (
                      <div className="flex gap-4">
                        {['Yes', 'No'].map((opt) => {
                          const isSelected = answers[form.questions[currentIndex].id.toString()] === opt;
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                handleAnswer(form.questions[currentIndex].id.toString(), opt);
                                setTimeout(goToNext, 300);
                              }}
                              className={`flex-1 flex flex-col items-center gap-2 py-8 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-bold transition-colors ${
                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-slate-500'
                              }`}>
                                {opt.charAt(0)}
                              </div>
                              <span className={`text-xl font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-700'}`}>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {form.questions[currentIndex].type === 'rating' && (
                      <div className="flex flex-wrap gap-3">
                        {Array.from({length: form.questions[currentIndex].settings.max_rating || 5}).map((_, i) => {
                          const val = (i + 1).toString();
                          const isSelected = answers[form.questions[currentIndex].id.toString()] === val;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                handleAnswer(form.questions[currentIndex].id.toString(), val);
                                setTimeout(goToNext, 300);
                              }}
                              className={`w-14 h-16 md:w-16 md:h-20 rounded-xl border-2 flex items-center justify-center text-xl md:text-2xl font-bold transition-all cursor-pointer ${
                                isSelected ? 'border-indigo-600 bg-indigo-600 text-white scale-105 shadow-md' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:scale-105 shadow-xs'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Error state */}
                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0 }}
                        className="mt-6 flex items-center gap-2 text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-lg font-medium inline-flex text-sm"
                      >
                        <AlertCircle size={18} /> {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="mt-10 flex items-center gap-4">
                    <button 
                      onClick={goToNext}
                      disabled={submitting}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2 text-lg shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {currentIndex === form.questions.length - 1 ? (submitting ? 'Submitting...' : 'Submit') : 'OK'} 
                      {currentIndex !== form.questions.length - 1 && <Check size={20} />}
                    </button>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      Press <strong className="font-bold text-slate-700">Enter <CornerDownLeft size={13} className="inline ml-0.5" /></strong>
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentIndex === form.questions.length && (
            <motion.div
              key="thank-you"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-100/50">
                <Check size={48} strokeWidth={3} />
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-ink">Thank you!</h2>
              <p className="text-xl text-gray-500 font-medium">
                {form.thank_you_message || 'Your response has been recorded.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Nav */}
      {currentIndex >= 0 && currentIndex < form.questions.length && (
        <div className="fixed bottom-0 right-0 p-6 flex gap-2 z-10">
          <button 
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 bg-black/10 rounded-lg flex items-center justify-center text-ink hover:bg-black/20 transition-colors disabled:opacity-30"
          >
            <ArrowUp size={20} />
          </button>
          <button 
            onClick={goToNext}
            className="w-10 h-10 bg-black/10 rounded-lg flex items-center justify-center text-ink hover:bg-black/20 transition-colors"
          >
            <ArrowDown size={20} />
          </button>
        </div>
      )}
      
      <div className="fixed bottom-6 left-6 text-xs font-semibold text-gray-400 z-10 opacity-50">
        Powered by formly
      </div>
    </div>
  );
}
