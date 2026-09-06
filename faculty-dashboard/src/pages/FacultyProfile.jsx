import { useNavigate } from 'react-router-dom';

export default function FacultyProfile() {
  const navigate = useNavigate();
  const name = localStorage.getItem('faculty_name');
  const deptName = localStorage.getItem('faculty_department_name');
  const deptCode = localStorage.getItem('faculty_department_code');

  const logout = () => {
    localStorage.removeItem('faculty_token');
    localStorage.removeItem('faculty_name');
    localStorage.removeItem('faculty_is_admin');
    localStorage.removeItem('faculty_department_name');
    localStorage.removeItem('faculty_department_code');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50">
      <div className="bg-gradient-to-r from-primary to-primaryDark px-8 py-8 mb-8 shadow-lg">
        <div className="max-w-md mx-auto flex justify-between items-center animate-fade-in-up">
          <div>
            <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-1">SmartAssess</p>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
          </div>
          <button
            onClick={() => navigate('/faculty/dashboard')}
            className="bg-white/15 text-white border border-white/30 px-4 py-2 rounded-xl text-sm font-bold hover:bg-white/25 hover:-translate-y-0.5 transition-smooth"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-10">
        <div className="bg-white rounded-2xl shadow-md p-6 text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-4xl mx-auto mb-4">🧑‍🏫</div>
          <h2 className="text-xl font-bold text-primary">{name}</h2>
          <p className="text-sm text-gray-400 mb-1">Faculty</p>
          {deptName && (
            <p className="text-xs bg-blue-50 text-primary inline-block px-3 py-1 rounded-full mt-2">
              🏫 {deptName} ({deptCode})
            </p>
          )}

          <div className="mt-6 pt-6 border-t space-y-3">
            <button
              onClick={() => navigate('/faculty/forgot-password')}
              className="w-full text-sm text-primary hover:underline transition-smooth"
            >
              Change Password
            </button>
            <button
              onClick={logout}
              className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-100 transition-smooth"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
