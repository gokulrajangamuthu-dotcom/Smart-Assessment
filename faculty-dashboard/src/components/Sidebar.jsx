import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, GraduationCap, Users, Building2,
  FileBarChart, BarChart3, Settings, UserCircle, LogOut, ChevronLeft, ChevronRight, MessageSquare,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/assessments', label: 'Assessments', icon: ClipboardList },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/faculty', label: 'Faculty', icon: GraduationCap },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/profile', label: 'Profile', icon: UserCircle },
];

export function clearFacultySession() {
  localStorage.removeItem('faculty_token');
  localStorage.removeItem('faculty_name');
  localStorage.removeItem('faculty_is_admin');
  localStorage.removeItem('faculty_email');
  localStorage.removeItem('faculty_department_name');
  localStorage.removeItem('faculty_department_code');
}

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearFacultySession();
    navigate('/');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 248 }}
      transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
      className="shrink-0 bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen z-20 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-100 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
          SA
        </div>
        {!collapsed && <span className="font-bold text-primary tracking-tight truncate">SmartAssess</span>}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-smooth ${
                isActive ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pb-3 space-y-1 border-t border-gray-100 pt-3 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-smooth"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-smooth"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );
}
