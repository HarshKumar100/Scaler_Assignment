'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, Form, FormStats, FormResponse } from '../../../../lib/api';
import { ArrowLeft, Download, Eye, X, ListFilter, BarChart3, User, Mail, Star, MessageSquare, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'summary' | 'responses';

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [form, setForm] = useState<Form | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('responses');

  useEffect(() => {
    loadData(true);
    // Auto-poll every 3 seconds for live response updates without manual page reload
    const interval = setInterval(() => {
      loadData(false);
    }, 3000);
    const onFocus = () => loadData(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [resolvedParams.id]);

  const loadData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [formData, statsData, responsesData] = await Promise.all([
        api<Form>(`/api/forms/${resolvedParams.id}`),
        api<FormStats>(`/api/forms/${resolvedParams.id}/stats`),
        api<FormResponse[]>(`/api/forms/${resolvedParams.id}/responses`)
      ]);
      setForm(formData);
      setStats(statsData);
      setResponses(responsesData);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const formatRespDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const str = !dateStr.endsWith('Z') && !dateStr.includes('+') ? `${dateStr}Z` : dateStr;
    const d = new Date(str);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatRespTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const str = !dateStr.endsWith('Z') && !dateStr.includes('+') ? `${dateStr}Z` : dateStr;
    const d = new Date(str);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatRespDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const str = !dateStr.endsWith('Z') && !dateStr.includes('+') ? `${dateStr}Z` : dateStr;
    const d = new Date(str);
    return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleExportCSV = async () => {
    if (!form) return;
    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = `${BASE_URL}/api/forms/${form.id}/export-csv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${form.slug || 'form'}-responses.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (e) {
      console.error('CSV Export error:', e);
      alert('Error exporting CSV file');
    }
  };

  const getAnswerByType = (qId: number, answers: Record<string, string>) => {
    const q = form?.questions.find(qu => qu.id === qId);
    const val = answers[qId.toString()];
    if (!q || !val) return null;
    return { type: q.type, val, title: q.title };
  };

  const getIconForType = (type: string, val: string) => {
    if (val && (val.includes('@') || type === 'email')) return <Mail size={16} className="text-purple-500" />;
    if (type === 'rating') return <Star size={16} className="text-amber-500 fill-amber-400" />;
    if (['long_text', 'short_text'].includes(type)) return <MessageSquare size={16} className="text-blue-500" />;
    return <User size={16} className="text-gray-500" />;
  };

  const renderStars = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    const full = Math.floor(num);
    return (
      <div className="flex items-center gap-1">
        <span className="font-bold text-gray-900 mr-1">{val}</span>
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} size={14} className={`${i < full ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
          ))}
        </div>
      </div>
    );
  };

  const extractEmail = (answers: Record<string, string>) => {
    if (!form) return null;
    const emailQ = form.questions.find(q => q.type === 'email');
    if (emailQ) return answers[emailQ.id.toString()];
    for (const v of Object.values(answers)) {
      if (v && /^[\w.-]+@[\w.-]+\.\w+$/.test(v)) return v;
    }
    return null;
  };

  const extractName = (answers: Record<string, string>) => {
    if (!form) return null;
    const titles = form.questions
      .filter(q => ['short_text', 'long_text'].includes(q.type))
      .filter(q => /name|first|last/i.test(q.title));
    for (const q of titles) {
      if (answers[q.id.toString()]) return answers[q.id.toString()];
    }
    const firstShort = form.questions.find(q => q.type === 'short_text');
    if (firstShort && answers[firstShort.id.toString()]) return answers[firstShort.id.toString()];
    return null;
  };

  const extractRating = (answers: Record<string, string>) => {
    if (!form) return null;
    const rq = form.questions.find(q => q.type === 'rating');
    if (rq) return answers[rq.id.toString()];
    return null;
  };

  if (loading || !form || !stats) {
    return <div className="p-12 text-center text-gray-500 font-medium">Loading results...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      {/* Nav */}
      <nav className="nav justify-between bg-white px-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Link href={`/`} className="text-gray-500 hover:text-ink transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <Link href={`/forms/${form.id}/build`} className="text-gray-500 hover:text-ink transition-colors flex items-center gap-2 text-sm font-medium">
            Edit Form
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <h1 className="font-bold text-lg text-ink truncate max-w-sm">{form.title}</h1>
        </div>
        <button 
          onClick={handleExportCSV} 
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6547db] hover:bg-[#5436c0] text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm shadow-[#6547db]/20 cursor-pointer active:scale-95"
        >
          <Download size={16} /> Export CSV
        </button>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="card !p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shrink-0">
              <ListFilter size={26} className="text-purple-700" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-gray-900 tracking-tight">{stats.total_responses}</div>
              <div className="text-sm font-semibold text-gray-500 mt-0.5">Total Responses</div>
            </div>
          </div>
          <div className="card !p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center shrink-0">
              <BarChart3 size={26} className="text-emerald-700" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-gray-900 tracking-tight">{Math.round(stats.completion_rate)}%</div>
              <div className="text-sm font-semibold text-gray-500 mt-0.5">Completion Rate</div>
            </div>
          </div>
          <div className="card !p-6 flex items-center gap-4 cursor-pointer hover:!border-purple-300" onClick={() => router.push(`/forms/${form.id}/build`)}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shrink-0">
              <MessageSquare size={26} className="text-amber-700" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-3xl font-black text-gray-900 tracking-tight">{form.questions.length}</div>
              <div className="text-sm font-semibold text-gray-500 mt-0.5">Questions</div>
            </div>
            <ArrowRight size={20} className="text-gray-400" />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('responses')}
              className={`px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'responses'
                  ? 'border-purple text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              <ListFilter size={16} /> Responses <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${activeTab === 'responses' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>{responses.length}</span>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-5 py-3.5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px flex items-center gap-2 ${
                activeTab === 'summary'
                  ? 'border-purple text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg'
              }`}
            >
              <BarChart3 size={16} /> Summary
            </button>
          </div>
          <div className="text-xs font-semibold text-gray-500">
            {form.status === 'published'
              ? <span className="badge badge-published">Published</span>
              : <span className="badge badge-draft">Draft</span>
            }
          </div>
        </div>

        {/* TAB: RESPONSES */}
        <AnimatePresence mode="wait">
          {activeTab === 'responses' && (
            <motion.div key="responses-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {responses.length === 0 ? (
                <div className="card text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200">
                    <User size={36} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">No responses yet</h3>
                  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                    Share your published form to start collecting responses from people.
                  </p>
                  {form.status === 'published' && (
                    <Link href={`/f/${form.slug}`} target="_blank" className="pill">
                      Open Public Form <ArrowRight size={16} />
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Modern Cards List View */}
                  <div className="space-y-3">
                    {responses.map((resp, i) => {
                      const name = extractName(resp.answers);
                      const email = extractEmail(resp.answers);
                      const rating = extractRating(resp.answers);
                      const responseNum = responses.length - i;
                      const openDetail = () => setSelectedResponse(resp);
                      return (
                        <motion.div
                          key={resp.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className="!rounded-xl overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={openDetail}
                            onMouseDown={openDetail}
                            className="card !p-0 !rounded-xl w-full text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                          >
                            <div className="flex items-stretch">
                              {/* Left colored stripe + number */}
                              <div className="w-2 bg-gradient-to-b from-purple-500 to-purple-400 shrink-0 pointer-events-none" />
                              
                              <div className="flex-1 p-5 flex items-center gap-5 pointer-events-none">
                                {/* Avatar / Number */}
                                <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200 flex items-center justify-center text-gray-700 font-black text-lg group-hover:from-purple-100 group-hover:to-purple-50 group-hover:border-purple-200 group-hover:text-purple-700 transition-all duration-200">
                                  {name ? name.charAt(0).toUpperCase() : `#${responseNum}`}
                                </div>

                                {/* Name & Email */}
                                <div className="flex-1 min-w-0 text-left">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-gray-900 truncate">
                                      {name ? name : `Response #${responseNum}`}
                                    </h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold uppercase tracking-wider">
                                      #{responseNum}
                                    </span>
                                  </div>
                                  {email && (
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 truncate">
                                      <Mail size={13} className="text-gray-400 shrink-0" />
                                      <span className="truncate">{email}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 font-medium">
                                    <span>{formatRespDate(resp.submitted_at)}</span>
                                    <span>•</span>
                                    <span>{formatRespTime(resp.submitted_at)}</span>
                                  </div>
                                </div>

                                {/* Key Answer: Rating or Preview */}
                                <div className="hidden md:flex items-center gap-4">
                                  {rating && (
                                    <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200">
                                      {renderStars(rating)}
                                    </div>
                                  )}
                                  {!rating && form.questions[0] && (
                                    <div className="max-w-[240px] px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-left">
                                      <p className="text-xs text-gray-500 font-semibold mb-0.5 truncate">{form.questions[0].title}</p>
                                      <p className="text-sm text-gray-800 font-medium truncate">
                                        {resp.answers[form.questions[0].id.toString()] || '—'}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Eye Icon / CT A */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    View Details
                                    <ArrowRight size={15} />
                                  </span>
                                  <div className="p-2.5 rounded-xl bg-gray-50 text-gray-500 group-hover:bg-purple-50 group-hover:text-purple-600 transition-all duration-200 border border-gray-100 group-hover:border-purple-200">
                                    <Eye size={18} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* TAB: SUMMARY */}
          {activeTab === 'summary' && (
            <motion.div key="summary-tab" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              {stats.questions.length === 0 ? (
                <div className="card text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200">
                    <BarChart3 size={36} className="text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">No questions yet</h3>
                  <p className="text-gray-500">Add questions to your form to see summary statistics.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {stats.questions.map(qStat => {
                    return (
                      <div key={qStat.question_id} className="card !rounded-xl !p-6">
                        <div className="flex items-start justify-between mb-5">
                          <div className="min-w-0 pr-4">
                            <h3 className="font-bold text-base text-gray-900 mb-1 leading-snug">{qStat.title}</h3>
                            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{qStat.type.replace('_', ' ')}</span>
                              <span>{qStat.count} answers</span>
                            </div>
                          </div>
                          {qStat.average !== undefined && (
                            <div className="text-4xl font-black text-amber-500 leading-none shrink-0">
                              {qStat.average.toFixed(1)}
                            </div>
                          )}
                        </div>
                        
                        {qStat.counts && Object.keys(qStat.counts).length > 0 ? (
                          <div className="space-y-3.5">
                            {Object.entries(qStat.counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => {
                              const percent = qStat.count > 0 ? Math.round((count / qStat.count) * 100) : 0;
                              return (
                                <div key={label}>
                                  <div className="flex justify-between text-sm mb-1.5">
                                    <span className="text-gray-800 font-medium truncate pr-4 max-w-[70%]">{label}</span>
                                    <span className="text-gray-900 font-black shrink-0 flex items-baseline gap-1">
                                      {count}
                                      <span className="text-gray-400 font-normal text-xs">({percent}%)</span>
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                      className="bg-gradient-to-r from-purple-600 to-purple-400 h-2.5 rounded-full transition-all duration-500" 
                                      style={{ width: `${percent}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : qStat.average !== undefined ? (
                          <div className="pt-2">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                <div className="text-4xl font-black text-amber-500 mb-1">{qStat.average.toFixed(1)}</div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Average Rating</div>
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                                <div className="text-4xl font-black text-purple-600 mb-1">{qStat.count}</div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Votes</div>
                              </div>
                            </div>
                            <div className="flex justify-center gap-1.5">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const threshold = i + 0.5;
                                const isFill = qStat.average! >= threshold;
                                return (
                                  <div key={i} className={`w-12 h-12 rounded-xl flex items-center justify-center ${isFill ? 'bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200' : 'bg-gray-50 border border-gray-100'}`}>
                                    <Star 
                                      size={22} 
                                      className={isFill ? 'text-amber-500 fill-amber-400' : 'text-gray-300'} 
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600 bg-gradient-to-br from-blue-50 to-blue-100/40 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                            <MessageSquare size={18} className="text-blue-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-gray-900 text-sm mb-0.5">Open-ended responses</p>
                              <p className="text-xs text-gray-600">{qStat.count} text answer{qStat.count !== 1 ? 's' : ''} collected. Browse individual responses to read them.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Response Detail Modal */}
      <AnimatePresence>
        {selectedResponse && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setSelectedResponse(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[95vw] max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-br from-gray-50 to-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shrink-0">
                    {extractName(selectedResponse.answers)
                      ? <span className="text-purple-700 font-black text-lg">{extractName(selectedResponse.answers)!.charAt(0).toUpperCase()}</span>
                      : <Eye size={22} className="text-purple-700" />
                    }
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">
                      {extractName(selectedResponse.answers) ? extractName(selectedResponse.answers) : 'Response'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 font-medium">
                      {formatRespDateTime(selectedResponse.submitted_at)}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedResponse(null)} 
                  className="p-2.5 text-gray-400 hover:text-gray-900 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all hover:shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-5">
                {form.questions.map((q, index) => {
                  const val = selectedResponse.answers[q.id.toString()];
                  const ans = getAnswerByType(q.id, selectedResponse.answers);
                  return (
                    <div key={q.id} className="rounded-2xl border border-gray-100 overflow-hidden bg-white hover:border-gray-200 transition-colors">
                      <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-start gap-3">
                        <div className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-purple-600 to-purple-500 text-white flex items-center justify-center text-xs font-black mt-0.5">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 leading-snug">{q.title}</h4>
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <span>{q.type.replace('_', ' ')}</span>
                            {q.required && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">Required</span>}
                          </div>
                        </div>
                      </div>
                      <div className="px-5 py-4">
                        {val ? (
                          ans?.type === 'rating' ? (
                            renderStars(val)
                          ) : ans?.type === 'yes_no' ? (
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold border">
                              {String(val).toLowerCase() === 'yes' ? (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">✓</div>
                                  <span className="text-emerald-700">Yes</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">✕</div>
                                  <span className="text-red-700">No</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">{val}</p>
                          )
                        ) : (
                          <p className="text-gray-400 italic py-1">No answer provided</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
