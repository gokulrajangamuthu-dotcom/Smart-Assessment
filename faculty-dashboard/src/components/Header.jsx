import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, MessageSquare, ChevronDown, User, LogOut, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { clearFacultySession } from './Sidebar';
import ThemeToggle from './ThemeToggle';

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const adminName = localStorage.getItem('faculty_name') || 'Admin';
  const adminEmail = localStorage.getItem('faculty_email') || '';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ assessments: [], students: [], faculty: [] });
  const [openMenu, setOpenMenu] = useState(null); // 'search' | 'notif' | 'messages' | 'profile' | null
  const [threads, setThreads] = useState([]);
  const debounceRef = useRef(null);
  const headerRef = useRef(null);

  const loadThreads = () => {
    api.get('/messages/threads').then((res) => setThreads(res.data)).catch(() => {});
  };

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 15000);
    return () => clearInterval(id);
  }, []);

  const unreadCount = threads.reduce((sum, t) => sum + t.unread_count, 0);
  const recentThreads = threads.filter((t) => t.last_message).slice(0, 5);

  const goToThread = (facultyId) => {
    setOpenMenu(null);
    navigate(`/admin/messages?facultyId=${facultyId}`);
  };

  useEffect(() => {
    function onDocClick(e) {
      if (headerRef.current && !headerRef.current.contains(e.target)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ assessments: [], students: [], faculty: [] });
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const [a, s, f] = await Promise.all([
          api.get('/assessments'),
          api.get('/students'),
          api.get('/faculty'),
        ]);
        const q = query.trim().toLowerCase();
        setResults({
          assessments: (a.data || []).filter((x) => x.title?.toLowerCase().includes(q)).slice(0, 5),
          students: (s.data || []).filter((x) => x.name?.toLowerCase().includes(q) || x.register_no?.toLowerCase().includes(q)).slice(0, 5),
          faculty: (f.data || []).filter((x) => x.name?.toLowerCase().includes(q) || x.email?.toLowerCase().includes(q)).slice(0, 5),
        });
        setOpenMenu('search');
      } catch {
        // search is a convenience feature only — fail silently
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const initials = adminName.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const hasResults = results.assessments.length + results.students.length + results.faculty.length > 0;

  const handleLogout = () => {
    clearFacultySession();
    navigate('/');
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100 h-16 flex items-center justify-between px-3 md:px-6 gap-2 md:gap-4">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 md:hidden flex items-center justify-center shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setOpenMenu('search')}
            placeholder="Search..."
            className="w-full bg-gray-50 border border-transparent focus:border-secondary focus:bg-white rounded-xl pl-9 pr-3 py-2 text-sm outline-none transition-smooth placeholder:text-gray-400"
          />

          <AnimatePresence>
            {openMenu === 'search' && query.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-96 overflow-y-auto z-30"
              >
                {!hasResults && <p className="text-sm text-gray-400 text-center py-6">No matches for "{query}"</p>}
                {results.assessments.length > 0 && (
                  <SearchGroup label="Assessments">
                    {results.assessments.map((a) => (
                      <SearchRow key={a.id} title={a.title} subtitle={a.departments?.code} onClick={() => { navigate('/admin/assessments'); setOpenMenu(null); }} />
                    ))}
                  </SearchGroup>
                )}
                {results.students.length > 0 && (
                  <SearchGroup label="Students">
                    {results.students.map((s) => (
                      <SearchRow key={s.id} title={s.name} subtitle={s.register_no} onClick={() => { navigate('/admin/students'); setOpenMenu(null); }} />
                    ))}
                  </SearchGroup>
                )}
                {results.faculty.length > 0 && (
                  <SearchGroup label="Faculty">
                    {results.faculty.map((f) => (
                      <SearchRow key={f.id} title={f.name} subtitle={f.email} onClick={() => { navigate('/admin/faculty'); setOpenMenu(null); }} />
                    ))}
                  </SearchGroup>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <ThemeToggle />
        <IconPopover icon={Bell} open={openMenu === 'notif'} onToggle={() => setOpenMenu((m) => (m === 'notif' ? null : 'notif'))}>
          <p className="text-sm text-gray-400 text-center py-6 px-4">No new notifications</p>
        </IconPopover>
        <IconPopover
          icon={MessageSquare}
          badge={unreadCount}
          open={openMenu === 'messages'}
          onToggle={() => setOpenMenu((m) => (m === 'messages' ? null : 'messages'))}
        >
          {!recentThreads.length && <p className="text-sm text-gray-400 text-center py-6 px-4">No messages yet</p>}
          {recentThreads.map((t) => (
            <button
              key={t.faculty_id}
              onClick={() => goToThread(t.faculty_id)}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex flex-col border-b border-gray-50 last:border-0"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-gray-800 truncate">{t.faculty_name}</span>
                {t.unread_count > 0 && (
                  <span className="text-[10px] font-bold bg-coral text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shrink-0">
                    {t.unread_count}
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-400 truncate">{t.last_message}</span>
            </button>
          ))}
          {recentThreads.length > 0 && (
            <button
              onClick={() => { setOpenMenu(null); navigate('/admin/messages'); }}
              className="w-full text-center px-4 py-2 text-xs font-semibold text-secondary hover:bg-gray-50"
            >
              View all
            </button>
          )}
        </IconPopover>

        <div className="relative ml-1">
          <button
            onClick={() => setOpenMenu((m) => (m === 'profile' ? null : 'profile'))}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-smooth"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials || <User size={14} />}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="text-sm font-semibold text-gray-800">{adminName}</p>
              <p className="text-xs text-gray-400">Administrator</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden md:block" />
          </button>
          <AnimatePresence>
            {openMenu === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-30"
              >
                {adminEmail && <p className="px-4 py-2 text-xs text-gray-400 truncate border-b border-gray-50 mb-1">{adminEmail}</p>}
                <button onClick={() => { navigate('/admin/profile'); setOpenMenu(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <User size={15} /> Profile
                </button>
                <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2">
                  <LogOut size={15} /> Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

function SearchGroup({ label, children }) {
  return (
    <div className="py-1">
      <p className="px-4 pt-2 pb-1 text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

function SearchRow({ title, subtitle, onClick }) {
  return (
    <button onClick={onClick} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex flex-col">
      <span className="text-sm text-gray-800 truncate">{title}</span>
      {subtitle && <span className="text-xs text-gray-400 truncate">{subtitle}</span>}
    </button>
  );
}

function IconPopover({ icon: Icon, open, onToggle, badge, children }) {
  return (
    <div className="relative">
      <button onClick={onToggle} className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 transition-smooth">
        <Icon size={18} />
        {badge > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-30 max-h-96 overflow-y-auto"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
