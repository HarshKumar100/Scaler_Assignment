'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, Form } from '../lib/api';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  Copy, 
  FileText, 
  Plus, 
  Share2, 
  Trash2, 
  BarChart3, 
  MoreHorizontal, 
  Search, 
  Edit3, 
  ExternalLink,
  Download,
  ArrowUpDown,
  X,
  Sparkles
} from 'lucide-react';

// Preset color gradients for card headers
const THEME_STYLES = [
  { bg: 'from-teal-700 to-teal-900' },
  { bg: 'from-indigo-700 to-indigo-900' },
  { bg: 'from-blue-700 to-slate-900' },
  { bg: 'from-purple-700 to-purple-900' },
  { bg: 'from-emerald-700 to-emerald-900' },
];

function CardBannerSvg({ index }: { index: number }) {
  // SVG background vector doodles matching MS Forms style (charts, checkmarks, planes, gears)
  return (
    <svg className="absolute inset-0 w-full h-full opacity-25 text-white stroke-current fill-none pointer-events-none" viewBox="0 0 320 100" preserveAspectRatio="xMidYMid slice">
      {/* Node graph / analytics icons */}
      <circle cx="30" cy="35" r="5" strokeWidth="1.5" />
      <circle cx="70" cy="20" r="4" strokeWidth="1.5" />
      <circle cx="110" cy="55" r="6" strokeWidth="1.5" />
      <path d="M30 35 L70 20 L110 55" strokeWidth="1.5" strokeDasharray="3 3" />
      
      {/* Checklist box */}
      <rect x="150" y="15" width="40" height="50" rx="4" strokeWidth="1.5" />
      <path d="M158 27 l5 5 l12 -12" strokeWidth="1.5" />
      <line x1="158" y1="42" x2="182" y2="42" strokeWidth="1.5" />
      <line x1="158" y1="52" x2="176" y2="52" strokeWidth="1.5" />

      {/* Paper Airplane */}
      <path d="M230 20 L275 40 L245 48 L238 65 L230 45 Z" strokeWidth="1.5" />

      {/* Pie chart */}
      <circle cx="280" cy="70" r="18" strokeWidth="1.5" />
      <path d="M280 70 L280 52 M280 70 L295 78" strokeWidth="1.5" />

      {/* Gear / Brain icon */}
      <circle cx="100" cy="80" r="12" strokeWidth="1.5" strokeDasharray="4 2" />
      <circle cx="100" cy="80" r="5" strokeWidth="1.5" />

      {/* Bar Chart */}
      <rect x="15" y="65" width="6" height="20" rx="1" strokeWidth="1.5" />
      <rect x="25" y="55" width="6" height="30" rx="1" strokeWidth="1.5" />
      <rect x="35" y="60" width="6" height="25" rx="1" strokeWidth="1.5" />
    </svg>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'responses'>('updated');
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadForms(true);
    // Auto-poll every 3 seconds for live response count updates without manual page reload
    const interval = setInterval(() => {
      loadForms(false);
    }, 3000);
    const onFocus = () => loadForms(false);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Aggressively prefetch all form routes as soon as forms data loads
  useEffect(() => {
    if (forms.length > 0) {
      forms.forEach(form => {
        router.prefetch(`/forms/${form.id}/build`);
        router.prefetch(`/forms/${form.id}/results`);
      });
    }
  }, [forms, router]);

  // Close active dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadForms = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await api<Form[]>('/api/forms');
      setForms(data);
    } catch (error) {
      if (showLoading) showToast('Failed to load forms');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const formatFormDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const isoStr = !dateStr.endsWith('Z') && !dateStr.includes('+') ? `${dateStr}Z` : dateStr;
    const d = new Date(isoStr);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCSV = async (form: Form) => {
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
      showToast('CSV downloaded successfully');
    } catch (e) {
      console.error(e);
      showToast('Error exporting CSV');
    }
  };

  const handleCreateForm = async () => {
    try {
      const newForm = await api<Form>('/api/forms', {
        method: 'POST',
        body: JSON.stringify({
          title: 'My New Form',
          theme: {
            primary_color: '#0f766e',
            background_color: '#f8fafc',
            text_color: '#0f172a',
            font_family: 'Inter',
          }
        }),
      });
      window.location.href = `/forms/${newForm.id}/build`;
    } catch (error) {
      showToast('Failed to create form');
    }
  };

  const handleDuplicate = async (form: Form) => {
    try {
      setActiveMenuId(null);
      const newForm = await api<Form>(`/api/forms/${form.id}/duplicate`, {
        method: 'POST',
      });
      setForms([newForm, ...forms]);
      showToast('Form duplicated successfully');
    } catch (error) {
      showToast('Failed to duplicate form');
    }
  };

  const handleShare = (slug: string) => {
    setActiveMenuId(null);
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    showToast('Form link copied to clipboard');
  };

  const confirmDelete = (form: Form) => {
    setActiveMenuId(null);
    setFormToDelete(form);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!formToDelete) return;
    try {
      await api(`/api/forms/${formToDelete.id}`, { method: 'DELETE' });
      setForms(forms.filter(f => f.id !== formToDelete.id));
      showToast('Form deleted');
    } catch (error) {
      showToast('Failed to delete form');
    } finally {
      setModalOpen(false);
      setFormToDelete(null);
    }
  };

  // Filter & Sort Logic
  const filteredForms = forms
    .filter(form => {
      const matchesSearch = form.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'published' ? form.status === 'published' :
        form.status === 'draft';
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'responses') return (b.response_count || 0) - (a.response_count || 0);
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  const publishedCount = forms.filter(f => f.status === 'published').length;
  const draftCount = forms.filter(f => f.status === 'draft').length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 pb-16 w-full overflow-x-hidden">
      {/* Top Navbar */}
      <nav className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-xs tracking-tight">
              F
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">formly</span>
          </div>

          <button 
            onClick={handleCreateForm} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-medium text-sm rounded-lg transition-all shadow-xs"
          >
            <Plus size={18} /> New Form
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-[1400px] mx-auto px-6 sm:px-8 pt-8 pb-20">
        {/* Workspace Title & Stats */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              My Forms
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {forms.length}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage, build, and view responses for all your forms
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs & Sort Controls */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button 
              onClick={() => setActiveTab('all')} 
              className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            >
              All Forms ({forms.length})
            </button>
            <button 
              onClick={() => setActiveTab('published')} 
              className={`filter-tab ${activeTab === 'published' ? 'active' : ''}`}
            >
              Published ({publishedCount})
            </button>
            <button 
              onClick={() => setActiveTab('draft')} 
              className={`filter-tab ${activeTab === 'draft' ? 'active' : ''}`}
            >
              Drafts ({draftCount})
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-sm text-slate-600">
            <ArrowUpDown size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Sort:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="updated">Recently Updated</option>
              <option value="title">Title (A-Z)</option>
              <option value="responses">Most Responses</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="form-card-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ms-form-card h-[250px] animate-pulse bg-slate-100 border border-slate-200 rounded-xl"></div>
            ))}
          </div>
        ) : filteredForms.length === 0 && searchQuery ? (
          /* Search Empty State */
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Search size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No forms matching "{searchQuery}"</h3>
            <p className="text-sm text-slate-500 mb-4">Try checking for typos or clear your search term.</p>
            <button onClick={() => setSearchQuery('')} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
              Clear Search
            </button>
          </div>
        ) : forms.length === 0 ? (
          /* Initial Empty State */
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">No forms created yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Create beautiful forms and collect responses effortlessly.</p>
            <button onClick={handleCreateForm} className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs transition-all">
              Create First Form
            </button>
          </div>
        ) : (
          /* Cards Grid */
          <div className="form-card-grid">
            {/* Create New Form Starter Card */}
            <div 
              onClick={handleCreateForm}
              className="create-card-dashed group text-center p-6"
            >
              <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <h3 className="font-semibold text-slate-800 text-base mb-1 group-hover:text-teal-700 transition-colors">
                New Form
              </h3>
              <p className="text-xs text-slate-400 max-w-[180px]">Start building from scratch with custom theme & fields</p>
            </div>

            {/* Form Cards matching Microsoft Forms Reference Design */}
            {filteredForms.map((form, index) => {
              const styleTheme = THEME_STYLES[index % THEME_STYLES.length];
              const isMenuOpen = activeMenuId === form.id;
              
              return (
                <div 
                  key={form.id}
                  className="ms-form-card group"
                >
                  {/* Decorative Banner Top — clicks open form builder */}
                  <Link
                    href={`/forms/${form.id}/build`}
                    prefetch={true}
                    className="block ms-form-card-banner bg-gradient-to-r cursor-pointer relative no-underline"
                    style={{ backgroundImage: `linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${styleTheme.bg}`} />
                    <CardBannerSvg index={index} />
                    
                    {/* Top Status Pill Tag */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-sm border border-white/60 backdrop-blur-md">
                        <span className={`w-2 h-2 rounded-full ${form.status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        {form.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </div>

                    {/* Quick Edit Overlay indicator */}
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-[5]">
                      <span className="px-3.5 py-1.5 bg-white/95 text-slate-900 text-xs font-semibold rounded-md shadow-md flex items-center gap-1.5">
                        <Edit3 size={14} className="text-teal-600" /> Open Form
                      </span>
                    </div>
                  </Link>

                  {/* Card Content Area */}
                  <div className="ms-form-card-body">
                    <div>
                      {/* Form Title — clicks open form builder */}
                      <Link 
                        href={`/forms/${form.id}/build`}
                        prefetch={true}
                        className="block no-underline"
                      >
                        <h3 
                          className="font-semibold text-slate-800 text-[15px] leading-snug line-clamp-2 hover:text-teal-700 transition-colors cursor-pointer mb-2"
                          title={form.title}
                        >
                          {form.title}
                        </h3>
                      </Link>

                      {/* Sub-label */}
                      <p className="text-xs font-medium text-teal-700 mb-1">
                        {form.status === 'published' ? 'Active form' : 'Draft form'}
                      </p>

                      {/* Date & Time Timestamp */}
                      <p className="text-xs text-slate-400">
                        {form.status === 'published' ? 'Updated ' : 'Created '}
                        {formatFormDate(form.updated_at || form.created_at)}
                      </p>
                    </div>

                    {/* Bottom Metadata — independent actions, NO parent navigation */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      {/* Response Count Link */}
                      <Link 
                        href={`/forms/${form.id}/results`}
                        prefetch={true}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 hover:bg-teal-50 px-2 py-1 -ml-2 rounded-md transition-all no-underline"
                        title="View Responses"
                      >
                        <BarChart3 size={14} className="text-teal-600" />
                        <span>{form.response_count} responses</span>
                      </Link>

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-1">
                        {/* Copy Link Button — visible for published forms */}
                        {form.status === 'published' && (
                          <button
                            type="button"
                            onClick={() => handleShare(form.slug)}
                            className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-50 rounded-md transition-colors"
                            title="Copy form link"
                          >
                            <ExternalLink size={16} />
                          </button>
                        )}

                        {/* 3-Dots Options Menu Button */}
                        <div className="relative" ref={isMenuOpen ? menuRef : null}>
                          <button
                            type="button"
                            onClick={() => setActiveMenuId(isMenuOpen ? null : form.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                            title="Options"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {/* Options Dropdown Menu */}
                          <AnimatePresence>
                            {isMenuOpen && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="absolute right-0 bottom-8 z-30 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 overflow-hidden text-xs text-slate-700"
                              >
                                <Link
                                  href={`/forms/${form.id}/build`}
                                  onClick={() => setActiveMenuId(null)}
                                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium no-underline text-inherit"
                                >
                                  <Edit3 size={14} className="text-slate-500" /> Edit Form
                                </Link>

                                <Link
                                  href={`/forms/${form.id}/results`}
                                  onClick={() => setActiveMenuId(null)}
                                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium no-underline text-inherit"
                                >
                                  <BarChart3 size={14} className="text-teal-600" /> View Responses
                                </Link>

                                {form.status === 'published' && (
                                  <button
                                    onClick={() => handleShare(form.slug)}
                                    className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700"
                                  >
                                    <Share2 size={14} className="text-indigo-500" /> Copy Share Link
                                  </button>
                                )}

                                <button
                                  onClick={() => { setActiveMenuId(null); handleExportCSV(form); }}
                                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700"
                                >
                                  <Download size={14} className="text-teal-600" /> Export CSV
                                </button>

                                <button
                                  onClick={() => handleDuplicate(form)}
                                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2.5 font-medium text-slate-700"
                                >
                                  <Copy size={14} className="text-slate-500" /> Duplicate Form
                                </button>

                                <div className="my-1 border-t border-slate-100" />

                                <button
                                  onClick={() => confirmDelete(form)}
                                  className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 font-medium"
                                >
                                  <Trash2 size={14} /> Delete Form
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="toast"
          >
            <Sparkles size={18} className="text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal"
            >
              <h2 className="text-lg font-bold text-slate-900 mb-2">Delete form?</h2>
              <p className="text-sm text-slate-600 mb-6">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{formToDelete?.title}"</span>? All collected responses will be permanently removed.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setModalOpen(false)} className="pill pill-outline text-xs py-2 px-4">
                  Cancel
                </button>
                <button onClick={handleDelete} className="pill pill-danger text-xs py-2 px-4">
                  Delete Form
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
