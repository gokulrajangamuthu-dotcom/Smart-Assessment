import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Search, ClipboardList, Users2, Trophy, TrendingUp, TrendingDown, Gauge } from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { getAssessmentStatus } from '../utils/assessmentStatus';

function subjectIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('data struct') || t.includes('dsa')) return '🧮';
  if (t.includes('os') || t.includes('operating')) return '💻';
  if (t.includes('dbms') || t.includes('database') || t.includes('sql')) return '🗄️';
  if (t.includes('math')) return '📐';
  if (t.includes('network')) return '🌐';
  if (t.includes('algo')) return '🧠';
  return '📝';
}

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  const [selected, setSelected] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/assessments'), api.get('/departments')])
      .then(([a, d]) => {
        setAssessments(a.data || []);
        setDepartments(d.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...assessments];
    if (deptFilter !== 'all') list = list.filter((a) => a.departments?.code === deptFilter);
    if (statusFilter !== 'all') list = list.filter((a) => getAssessmentStatus(a).key === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.title?.toLowerCase().includes(q) || a.faculty?.name?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.scheduled_date) - new Date(a.scheduled_date);
      if (sortBy === 'date_asc') return new Date(a.scheduled_date) - new Date(b.scheduled_date);
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'department') return (a.departments?.code || '').localeCompare(b.departments?.code || '');
      return 0;
    });
    return list;
  }, [assessments, deptFilter, statusFilter, search, sortBy]);

  const loadAssessment = async (id) => {
    setSelected(id);
    setPanelLoading(true);
    setAnalytics(null);
    setLeaderboard([]);
    try {
      const res = await api.get(`/results/summary/${id}`);
      setAnalytics(res.data.analytics);
      setLeaderboard(res.data.leaderboard);
    } catch (err) {
      console.error(err);
    } finally {
      setPanelLoading(false);
    }
  };

  const chartData = leaderboard.slice(0, 10).map((r) => ({
    name: r.students?.register_no || 'N/A',
    score: r.score,
  }));

  const selectedAssessment = assessments.find((a) => a.id === selected);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-800">Assessments</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or faculty..."
            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
          />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm">
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm">
          <option value="all">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm">
          <option value="date_desc">Newest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="title">Title (A-Z)</option>
          <option value="department">Department</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          {loading && <div className="skeleton h-64 w-full" />}
          {!loading && filtered.length === 0 && (
            <EmptyState icon={ClipboardList} title="No assessments found" message="Try adjusting your search or filters." />
          )}
          <ul className="space-y-2.5 max-h-[600px] overflow-y-auto">
            {filtered.map((a, i) => {
              const isSelected = selected === a.id;
              return (
                <li key={a.id} className="stagger-item" style={{ '--delay': `${i * 0.03}s` }}>
                  <div
                    onClick={() => loadAssessment(a.id)}
                    className={`w-full flex flex-col gap-2 px-3.5 py-3 rounded-xl text-sm cursor-pointer border transition-smooth ${
                      isSelected ? 'bg-primary text-white border-primary shadow-md' : 'bg-gray-50 border-transparent hover:bg-gray-100 hover:translate-x-0.5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span>{subjectIcon(a.title)}</span>
                        <span className="font-semibold truncate">{a.title}</span>
                      </div>
                      {!isSelected && <StatusBadge assessment={a} />}
                    </div>
                    <div className={`text-xs flex items-center gap-2 flex-wrap ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>
                      <span className={`px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/15' : 'bg-black/5'}`}>{a.departments?.code || 'No dept'}</span>
                      <span>by {a.faculty?.name || 'Unknown'}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selected && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
              <EmptyState icon={Gauge} title="Select an assessment" message="Pick an assessment from the list to see its analysis." />
            </div>
          )}

          {selected && (
            <>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h2 className="font-bold text-gray-800 flex items-center gap-2">
                    <span>{subjectIcon(selectedAssessment?.title)}</span> {selectedAssessment?.title}
                  </h2>
                  <StatusBadge assessment={selectedAssessment} />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedAssessment?.departments?.name} ({selectedAssessment?.departments?.code}) · Created by {selectedAssessment?.faculty?.name || 'Unknown'}
                </p>
              </div>

              {panelLoading && (
                <div className="animate-fade-in space-y-6">
                  <div className="grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 h-24">
                        <div className="skeleton h-full w-full" />
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="skeleton" style={{ height: '220px', width: '100%' }} />
                  </div>
                </div>
              )}

              {!panelLoading && analytics && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 animate-fade-in-up">
                  <StatCard label="In Dept." value={analytics.total_students_in_department} icon={Users2} color="violet" />
                  <StatCard label="Attempted" value={analytics.attempted} icon={ClipboardList} color="secondary" />
                  <StatCard label="Average" value={analytics.average_score} icon={Gauge} color="success" decimals={analytics.average_score % 1 !== 0 ? 2 : 0} />
                  <StatCard label="Highest" value={analytics.highest_score} icon={TrendingUp} color="amber" />
                  <StatCard label="Lowest" value={analytics.lowest_score} icon={TrendingDown} color="danger" />
                </div>
              )}

              {!panelLoading && analytics?.total_students_in_department > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="font-bold text-gray-800 text-sm">Participation</h2>
                    <span className="text-sm font-semibold text-primary">
                      {analytics.attempted} / {analytics.total_students_in_department} attempted
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 bg-success rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (analytics.attempted / analytics.total_students_in_department) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {!panelLoading && chartData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
                  <h2 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                    <TrendingUp size={16} /> Top 10 Scores
                  </h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="score" fill="#1E3A5F" radius={[6, 6, 0, 0]} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {!panelLoading && leaderboard.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
                  <h2 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                    <Trophy size={16} /> Leaderboard
                  </h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b uppercase text-xs tracking-wide">
                        <th className="py-2">Rank</th>
                        <th>Register No</th>
                        <th>Name</th>
                        <th>Score</th>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {!panelLoading && !analytics?.attempted && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                  <EmptyState icon={Users2} title="No attempts yet" message="No students have attempted this assessment yet." />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
