import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, GraduationCap, Building2, ClipboardList, CheckCircle2, Clock,
  UserPlus, UserCog, FilePlus2, ArrowRight,
} from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { getAssessmentStatus } from '../utils/assessmentStatus';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const adminName = localStorage.getItem('faculty_name');

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/students'),
      api.get('/faculty'),
      api.get('/departments'),
      api.get('/assessments'),
    ])
      .then(([s, f, d, a]) => {
        setStudents(s.data || []);
        setFaculty(f.data || []);
        setDepartments(d.data || []);
        setAssessments(a.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const completedCount = assessments.filter((a) => getAssessmentStatus(a).key === 'completed').length;
  const pendingCount = assessments.filter((a) => {
    const k = getAssessmentStatus(a).key;
    return k === 'scheduled' || k === 'live';
  }).length;

  const recentAssessments = [...assessments]
    .sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))
    .slice(0, 5);

  const activity = [
    ...faculty.map((f) => ({ type: 'Faculty Added', label: f.name, at: f.created_at, icon: UserCog, color: 'text-violet bg-violet-50' })),
    ...students.map((s) => ({ type: 'Student Registered', label: s.name, at: s.created_at, icon: UserPlus, color: 'text-secondary bg-blue-50' })),
    ...assessments.map((a) => ({ type: 'Assessment Created', label: a.title, at: a.created_at, icon: FilePlus2, color: 'text-success bg-green-50' })),
  ]
    .filter((e) => e.at)
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin Dashboard</p>
          <h1 className="text-2xl font-bold text-gray-800">Welcome back, {adminName} 👋</h1>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-28">
              <div className="skeleton h-full w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in-up">
          <StatCard label="Total Students" value={students.length} icon={Users} color="secondary" />
          <StatCard label="Total Faculty" value={faculty.length} icon={GraduationCap} color="violet" />
          <StatCard label="Departments" value={departments.length} icon={Building2} color="amber" />
          <StatCard label="Assessments" value={assessments.length} icon={ClipboardList} color="primary" />
          <StatCard label="Completed" value={completedCount} icon={CheckCircle2} color="success" />
          <StatCard label="Pending" value={pendingCount} icon={Clock} color="danger" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Recent Assessments</h2>
            <button
              onClick={() => navigate('/admin/assessments')}
              className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={13} />
            </button>
          </div>

          {!loading && recentAssessments.length === 0 && (
            <EmptyState icon={ClipboardList} title="No assessments yet" message="Once faculty create assessments, they'll show up here." />
          )}

          <ul className="space-y-2">
            {recentAssessments.map((a, i) => (
              <li
                key={a.id}
                className="stagger-item flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-smooth cursor-pointer"
                style={{ '--delay': `${i * 0.04}s` }}
                onClick={() => navigate('/admin/assessments')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.title}</p>
                  <p className="text-xs text-gray-400">
                    {a.departments?.code || 'No dept'} · by {a.faculty?.name || 'Unknown'}
                  </p>
                </div>
                <StatusBadge assessment={a} />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
          <h2 className="font-bold text-gray-800 mb-4">Recent Activity</h2>

          {!loading && activity.length === 0 && (
            <EmptyState icon={Clock} title="No activity yet" message="Activity will appear as faculty, students and assessments are added." />
          )}

          <ul className="space-y-3">
            {activity.map((e, i) => {
              const Icon = e.icon;
              return (
                <li key={i} className="stagger-item flex items-start gap-3" style={{ '--delay': `${i * 0.04}s` }}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${e.color}`}>
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">{e.type}</span>
                    </p>
                    <p className="text-xs text-gray-500 truncate">{e.label}</p>
                    <p className="text-[11px] text-gray-400">{timeAgo(e.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
