import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/faculty/login', { email, password });

      if (!res.data.faculty.is_admin) {
        setError('This account does not have admin access.');
        setLoading(false);
        return;
      }

      localStorage.setItem('faculty_token', res.data.token);
      localStorage.setItem('faculty_name', res.data.faculty.name);
      localStorage.setItem('faculty_is_admin', 'true');
      localStorage.setItem('faculty_email', res.data.faculty.email || '');
      localStorage.setItem('faculty_department_name', res.data.faculty.department_name || '');
      localStorage.setItem('faculty_department_code', res.data.faculty.department_code || '');
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-violet-50">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm animate-scale-in">
        <h1 className="text-2xl font-bold text-primary mb-1">SmartAssess</h1>
        <p className="text-gray-500 mb-6 flex items-center gap-1">🛡️ Admin Login</p>

        {error && <p className="text-red-600 text-sm mb-4 animate-fade-in">{error}</p>}

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth focus:scale-[1.01]"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth focus:scale-[1.01]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-900 hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login as Admin'}
        </button>
      </form>
    </div>
  );
}
