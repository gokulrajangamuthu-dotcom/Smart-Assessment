import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api/client';
import AnimatedCounter from '../components/AnimatedCounter';
import ThemeToggle from '../components/ThemeToggle';

// Subject-aware icon + accent color, so each assessment card has its own identity
const ACCENTS = [
  { border: 'border-l-primary', chip: 'bg-blue-50 text-primary' },
  { border: 'border-l-accent', chip: 'bg-green-50 text-accent' },
  { border: 'border-l-amber', chip: 'bg-amber-50 text-amber' },
  { border: 'border-l-coral', chip: 'bg-rose-50 text-coral' },
  { border: 'border-l-violet', chip: 'bg-violet-50 text-violet' },
];

function subjectIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('data struct') || t.includes('dsa')) return '🧮';
  if (t.includes('os') || t.includes('operating')) return '💻';
  if (t.includes('dbms') || t.includes('database') || t.includes('sql')) return '🗄️';
  if (t.includes('network')) return '🌐';
  if (t.includes('algo')) return '🧠';
  if (t.includes('java') || t.includes('python') || t.includes('code')) return '👨‍💻';
  return '📝';
}

function accentFor(index) {
  return ACCENTS[index % ACCENTS.length];
}

// Derives Upcoming / Live / Completed from schedule + duration, so the badge
// stays correct without needing the backend to be polled for it.
function assessmentStatus(a) {
  if (a.is_active === false) return 'inactive';
  const start = new Date(a.scheduled_date).getTime();
  const end = start + (a.duration_minutes || 0) * 60000;
  const now = Date.now();
  if (now < start) return 'upcoming';
  if (now < end) return 'live';
  return 'completed';
}

const STATUS_STYLES = {
  upcoming: { label: 'Upcoming', className: 'bg-amber-50 text-amber' },
  live: { label: 'Live', className: 'bg-green-50 text-accent' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-500' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.completed;
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${s.className}`}>
      {status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
      {s.label}
    </span>
  );
}

export default function Dashboard() {
  const [assessments, setAssessments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  const loadAssessments = () => {
    api.get('/assessments').then((res) => setAssessments(res.data)).catch(console.error);
  };

  const loadOverview = () => {
    api.get('/assessments/stats/overview').then((res) => setOverview(res.data)).catch(console.error);
  };

  const loadUnreadCount = () => {
    api.get('/messages/unread-count').then((res) => setUnreadCount(res.data.count)).catch(() => {});
  };

  useEffect(() => {
    loadAssessments();
    loadOverview();
    loadUnreadCount();
    const id = setInterval(loadUnreadCount, 15000);
    return () => clearInterval(id);
  }, []);

  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus = statusFilter === 'all' || assessmentStatus(a) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadAssessment = async (id) => {
    setSelected(id);
    setPanelLoading(true); // shows a skeleton immediately so clicks feel instant
    setAnalytics(null);
    setLeaderboard([]);
    try {
      const res = await api.get(`/results/summary/${id}`); // one request instead of two
      setAnalytics(res.data.analytics);
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      console.error(err);
    } finally {
      setPanelLoading(false);
    }
  };

  const handleDelete = async (e, id, title) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Delete "${title}"? This is permanent and will also delete all its questions and results.`);
    if (!confirmed) return;

    try {
      await api.delete(`/assessments/${id}`);
      if (selected === id) {
        setSelected(null);
        setAnalytics(null);
        setLeaderboard([]);
      }
      loadAssessments();
      loadOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleEdit = (e, id) => {
    e.stopPropagation();
    navigate(`/faculty/edit/${id}`);
  };

  const chartData = leaderboard.slice(0, 10).map((r) => ({
    name: r.students?.register_no || 'N/A',
    score: r.score,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primaryDark px-8 py-8 mb-8 shadow-lg">
        <div className="max-w-5xl mx-auto flex justify-between items-center animate-fade-in-up flex-wrap gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-1">SmartAssess</p>
            <h1 className="text-3xl font-bold text-white">Hi, {localStorage.getItem('faculty_name')} 👋</h1>
            {localStorage.getItem('faculty_department_name') && (
              <p className="text-blue-200 text-sm mt-1">
                🏫 {localStorage.getItem('faculty_department_name')} ({localStorage.getItem('faculty_department_code')})
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <ThemeToggle onColor />
            {localStorage.getItem('faculty_is_admin') === 'true' && (
              <Link
                to="/faculty/add-faculty"
                className="bg-white/15 text-white border border-white/30 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/25 hover:-translate-y-0.5 transition-smooth flex items-center gap-2"
              >
                <span className="text-lg leading-none">🧑‍🏫</span> Manage Faculty
              </Link>
            )}
            <Link
              to="/faculty/add-students"
              className="bg-white/15 text-white border border-white/30 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/25 hover:-translate-y-0.5 transition-smooth flex items-center gap-2"
            >
              <span className="text-lg leading-none">👥</span> Add Students
            </Link>
            <Link
              to="/faculty/messages"
              className="relative bg-white/15 text-white border border-white/30 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/25 hover:-translate-y-0.5 transition-smooth flex items-center gap-2"
            >
              <span className="text-lg leading-none">💬</span> Messages
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              to="/faculty/create"
              className="bg-white/15 text-white border border-white/30 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white/25 hover:-translate-y-0.5 transition-smooth flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> New Assessment
            </Link>
            <Link
              to="/faculty/profile"
              className="bg-white text-primary px-5 py-2.5 rounded-xl text-sm font-bold hover:shadow-xl hover:-translate-y-0.5 transition-smooth flex items-center gap-2"
            >
              <span className="text-lg leading-none">🧑</span> Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-10">
        {overview && (
          <div className="grid grid-cols-4 gap-4 mb-6 animate-fade-in-up">
            <StatCard label="Total Students" value={overview.total_students} icon="🧑‍🎓" color="primary" />
            <StatCard label="Total Assessments" value={overview.total_assessments} icon="📚" color="accent" />
            <StatCard label="Average Score %" value={overview.average_score} icon="📊" color="amber" />
            <div className="bg-white rounded-2xl shadow-md p-4 text-center card-hover">
              <div className="w-9 h-9 mx-auto mb-2 rounded-lg flex items-center justify-center text-lg bg-rose-50">🗓️</div>
              {overview.upcoming_assessment ? (
                <>
                  <p className="text-sm font-bold text-coral truncate" title={overview.upcoming_assessment.title}>
                    {overview.upcoming_assessment.title}
                  </p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {new Date(overview.upcoming_assessment.scheduled_date).toLocaleString()}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-400">None scheduled</p>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">Upcoming</p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1 bg-white rounded-2xl shadow-md p-5">
            <h2 className="font-bold mb-4 text-gray-800 flex items-center gap-2">
              <span>📚</span> Assessments
            </h2>

            <div className="space-y-2 mb-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assessments..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
              >
                <option value="all">All statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <ul className="space-y-2.5">
              {filteredAssessments.map((a, i) => {
                const { border, chip } = accentFor(i);
                const isSelected = selected === a.id;
                const status = assessmentStatus(a);
                return (
                  <li key={a.id} className="stagger-item" style={{ '--delay': `${i * 0.05}s` }}>
                    <div
                      onClick={() => loadAssessment(a.id)}
                      className={`w-full flex flex-col gap-2 px-3 py-3 rounded-xl text-sm cursor-pointer border-l-4 transition-smooth ${border} ${
                        isSelected ? 'bg-primary text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-lg w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${isSelected ? 'bg-white/20' : chip}`}>
                          {subjectIcon(a.title)}
                        </span>
                        <span className="flex-1 truncate font-medium">{a.title}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleEdit(e, a.id)}
                            title="Edit"
                            className={`text-xs w-7 h-7 flex items-center justify-center rounded-lg hover:scale-125 transition-smooth ${
                              isSelected ? 'hover:bg-blue-800' : 'hover:bg-gray-200'
                            }`}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, a.id, a.title)}
                            title="Delete"
                            className={`text-xs w-7 h-7 flex items-center justify-center rounded-lg hover:scale-125 transition-smooth ${
                              isSelected ? 'hover:bg-red-700' : 'hover:bg-red-100'
                            }`}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                        <span>{new Date(a.scheduled_date).toLocaleDateString()}</span>
                        <span>{a.question_count ?? 0} Qs</span>
                        <span>{a.attempted_count ?? 0} attempted</span>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  </li>
                );
              })}
              {!filteredAssessments.length && (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">🗒️</p>
                  <p className="text-gray-400 text-sm">
                    {assessments.length ? 'No assessments match your search/filter.' : 'No assessments yet — create your first one above.'}
                  </p>
                </div>
              )}
            </ul>
          </div>

          <div className="col-span-2 space-y-6">
            {panelLoading && (
              <div className="animate-fade-in space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl shadow-md p-4">
                      <div className="skeleton" style={{ height: '36px', width: '36px', borderRadius: '10px', margin: '0 auto 8px' }} />
                      <div className="skeleton" style={{ height: '20px', width: '50%', margin: '0 auto 6px' }} />
                      <div className="skeleton" style={{ height: '10px', width: '70%', margin: '0 auto' }} />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl shadow-md p-5">
                  <div className="skeleton" style={{ height: '220px', width: '100%' }} />
                </div>
              </div>
            )}
            {!panelLoading && analytics && (
              <div className="grid grid-cols-4 gap-4 animate-fade-in-up">
                <StatCard label="Attempted" value={analytics.attempted} icon="🧑‍🎓" color="primary" />
                <StatCard label="Average" value={analytics.average_score} icon="📊" color="accent" />
                <StatCard label="Highest" value={analytics.highest_score} icon="🏆" color="amber" />
                <StatCard label="Lowest" value={analytics.lowest_score} icon="📉" color="coral" />
              </div>
            )}

            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-5 animate-fade-in-up">
                <h2 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                  <span>📈</span> Top 10 Scores
                </h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#1F4E78" radius={[6, 6, 0, 0]} animationDuration={800} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {leaderboard.length > 0 && (
              <div className="bg-white rounded-2xl shadow-md p-5 animate-fade-in-up">
                <h2 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                  <span>🏅</span> Leaderboard
                </h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b uppercase text-xs tracking-wide">
                      <th className="py-2">Rank</th>
                      <th>Register No</th>
                      <th>Name</th>
                      <th>Score</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((r, i) => (
                      <tr key={i} className="border-b last:border-0 stagger-item hover:bg-gray-50 transition-smooth" style={{ '--delay': `${i * 0.04}s` }}>
                        <td className="py-2.5 font-semibold">
                          {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                        </td>
                        <td>{r.students?.register_no}</td>
                        <td>{r.students?.name}</td>
                        <td className="font-semibold text-primary">{r.score}</td>
                        <td className="text-right">
                          <button
                            onClick={() => navigate(`/faculty/review/${selected}/${r.student_id}`)}
                            className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-900 hover:-translate-y-0.5 transition-smooth"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const COLOR_MAP = {
  primary: { bg: 'bg-blue-50', text: 'text-primary' },
  accent: { bg: 'bg-green-50', text: 'text-accent' },
  amber: { bg: 'bg-amber-50', text: 'text-amber' },
  coral: { bg: 'bg-rose-50', text: 'text-coral' },
};

function StatCard({ label, value, icon, color }) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  const numericValue = Number(value) || 0;
  const hasDecimals = !Number.isInteger(numericValue);
  return (
    <div className="bg-white rounded-2xl shadow-md p-4 text-center card-hover">
      <div className={`w-9 h-9 mx-auto mb-2 rounded-lg flex items-center justify-center text-lg ${c.bg}`}>{icon}</div>
      <p className={`text-2xl font-bold ${c.text}`}>
        <AnimatedCounter value={numericValue} decimals={hasDecimals ? 2 : 0} />
      </p>
      <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
    </div>
  );
}
