import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Building2, ShieldCheck, KeyRound, LogOut, FilePlus2 } from 'lucide-react';
import api from '../api/client';
import { clearFacultySession } from '../components/Sidebar';
import EmptyState from '../components/EmptyState';

export default function AdminProfile() {
  const navigate = useNavigate();
  const name = localStorage.getItem('faculty_name');
  const email = localStorage.getItem('faculty_email');
  const departmentName = localStorage.getItem('faculty_department_name');
  const departmentCode = localStorage.getItem('faculty_department_code');

  const [recentAssessments, setRecentAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assessments')
      .then((res) => {
        const mine = (res.data || [])
          .filter((a) => a.faculty?.name === name)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 5);
        setRecentAssessments(mine);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [name]);

  const logout = () => {
    clearFacultySession();
    navigate('/');
  };

  const initials = (name || 'A').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in-up">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-800">{name}</h2>
            <p className="text-sm text-gray-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Administrator
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Mail size={16} className="text-secondary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm font-medium text-gray-800 truncate">{email || 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Building2 size={16} className="text-amber" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Department</p>
              <p className="text-sm font-medium text-gray-800 truncate">
                {departmentName ? `${departmentName} (${departmentCode})` : 'All Departments (Super Admin)'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-50">
          <button
            onClick={() => navigate('/faculty/forgot-password')}
            className="flex items-center gap-2 text-sm font-semibold text-primary bg-blue-50 px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-smooth"
          >
            <KeyRound size={15} /> Change Password
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm font-semibold text-rose-600 bg-rose-50 px-4 py-2.5 rounded-xl hover:bg-rose-100 transition-smooth"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in-up">
        <h2 className="font-bold text-gray-800 mb-4">Recent Activity</h2>
        {!loading && recentAssessments.length === 0 && (
          <EmptyState icon={FilePlus2} title="No assessments created yet" message="Assessments you create will show up here." />
        )}
        <ul className="space-y-3">
          {recentAssessments.map((a, i) => (
            <li key={a.id} className="stagger-item flex items-center gap-3" style={{ '--delay': `${i * 0.04}s` }}>
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                <FilePlus2 size={15} className="text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                <p className="text-xs text-gray-400">{a.departments?.code} · {new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
