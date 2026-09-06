import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Send, ChevronLeft } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';

const POLL_MS = 10000;

export default function Messages() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const insideAdminShell = location.pathname.startsWith('/admin');
  const isAdmin = localStorage.getItem('faculty_is_admin') === 'true';

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(isAdmin);
  const [selectedFacultyId, setSelectedFacultyId] = useState(searchParams.get('facultyId') || null);

  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  const loadThreads = () => {
    if (!isAdmin) return;
    api.get('/messages/threads')
      .then((res) => {
        setThreads(res.data);
        // Keep the currently open thread selected on refresh; otherwise default to the first one
        setSelectedFacultyId((prev) => prev || (res.data[0]?.faculty_id ?? null));
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load conversations'))
      .finally(() => setThreadsLoading(false));
  };

  const loadMessages = (facultyId) => {
    const url = isAdmin ? `/messages/thread?facultyId=${facultyId}` : '/messages/thread';
    setMessagesLoading(true);
    api.get(url)
      .then((res) => setMessages(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load messages'))
      .finally(() => setMessagesLoading(false));
  };

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isAdmin && !selectedFacultyId) return;
    loadMessages(selectedFacultyId);
    const id = setInterval(() => loadMessages(selectedFacultyId), POLL_MS);
    return () => clearInterval(id);
  }, [selectedFacultyId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    setSending(true);
    setError('');
    try {
      await api.post('/messages', isAdmin ? { body, facultyId: selectedFacultyId } : { body });
      loadMessages(selectedFacultyId);
      if (isAdmin) loadThreads();
    } catch (err) {
      setDraft(body);
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const selectedThread = threads.find((t) => t.faculty_id === selectedFacultyId);

  const content = (
    <div className={`bg-white rounded-2xl shadow-md flex ${isAdmin ? 'h-[70vh]' : 'h-[75vh] max-w-2xl mx-auto'} overflow-hidden`}>
      {isAdmin && (
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 font-bold text-gray-800 text-sm">Faculty Conversations</div>
          <div className="flex-1 overflow-y-auto">
            {threadsLoading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
            {!threadsLoading && !threads.length && (
              <EmptyState icon={MessageSquare} title="No faculty yet" message="Faculty accounts will appear here once added." />
            )}
            {threads.map((t) => (
              <button
                key={t.faculty_id}
                onClick={() => setSelectedFacultyId(t.faculty_id)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-smooth ${
                  selectedFacultyId === t.faculty_id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-gray-800 truncate">{t.faculty_name}</span>
                  {t.unread_count > 0 && (
                    <span className="text-[10px] font-bold bg-coral text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {t.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 truncate mt-0.5">{t.last_message || 'No messages yet'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-4 py-3 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center gap-2">
          <MessageSquare size={16} className="text-primary" />
          {isAdmin ? (selectedThread?.faculty_name || 'Select a conversation') : 'Messages with Admin'}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messagesLoading && <p className="text-sm text-gray-400 text-center py-8">Loading…</p>}
          {!messagesLoading && isAdmin && !selectedFacultyId && (
            <p className="text-sm text-gray-400 text-center py-8">Pick a faculty member on the left to view their messages.</p>
          )}
          {!messagesLoading && (!isAdmin || selectedFacultyId) && !messages.length && (
            <EmptyState icon={MessageSquare} title="No messages yet" message="Send the first message below." />
          )}
          {messages.map((m) => {
            const mine = m.sender_is_admin === isAdmin;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="px-4 text-xs text-rose-600">{error}</p>}

        <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            disabled={isAdmin && !selectedFacultyId}
            className="flex-1 bg-gray-50 border border-transparent focus:border-secondary focus:bg-white rounded-xl px-3 py-2 text-sm outline-none transition-smooth disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim() || (isAdmin && !selectedFacultyId)}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-primary text-white hover:bg-blue-900 transition-smooth disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );

  if (insideAdminShell) return content;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 px-4 py-8">
      <div className="max-w-5xl mx-auto mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/faculty/dashboard')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-md hover:bg-gray-50 transition-smooth"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Messages</h1>
      </div>
      <div className="max-w-5xl mx-auto">{content}</div>
    </div>
  );
}
