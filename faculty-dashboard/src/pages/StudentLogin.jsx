import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import studentApi from '../api/studentClient';

export default function StudentLogin() {
  const [registerNo, setRegisterNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await studentApi.post('/auth/student/login', { register_no: registerNo, password });
      localStorage.setItem('student_token', res.data.token);
      localStorage.setItem('student_name', res.data.student.name);
      navigate('/student/assessments');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleLogin} style={styles.card} className="animate-scale-in">
        <h1 style={styles.title}>SmartAssess</h1>
        <p style={styles.subtitle}>Student Login</p>

        {error && <p style={styles.error} className="animate-fade-in">{error}</p>}

        <label style={styles.label}>Register Number</label>
        <input
          value={registerNo}
          onChange={(e) => setRegisterNo(e.target.value)}
          required
          style={styles.input}
          className="transition-smooth focus:scale-[1.01]"
        />

        <label style={styles.label}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
          className="transition-smooth focus:scale-[1.01]"
        />

        <button type="submit" disabled={loading} style={styles.button} className="transition-smooth hover:shadow-lg hover:-translate-y-0.5">
          {loading ? 'Logging in...' : 'Login as Student'}
        </button>

        <div style={styles.footerLinks}>
          <p style={styles.linkSmall}>
            <Link to="/student/forgot-password" style={{ color: '#1F4E78', textDecoration: 'none', fontWeight: 600 }}>Forgot password?</Link>
          </p>
          <p style={styles.linkSmall}>
            New student? <Link to="/student/register" style={{ color: '#1F4E78', fontWeight: 600 }}>Register here</Link>
          </p>
          <p style={styles.linkSmall}>
            Faculty / Admin? <Link to="/faculty/login" style={{ color: '#1F4E78', fontWeight: 600 }}>Staff Login</Link>
          </p>
          <p style={{ ...styles.linkSmall, marginTop: '12px' }}>
            <Link to="/" style={{ color: '#888', textDecoration: 'none' }}>← Back to Home</Link>
          </p>
        </div>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)' },
  card: { background: 'var(--card-bg)', color: 'var(--text-body)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--card-shadow-md)', width: '100%', maxWidth: '380px' },
  title: { fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--heading-color)', margin: 0 },
  subtitle: { color: 'var(--text-muted)', marginBottom: '20px' },
  error: { color: '#d33', fontSize: '0.85rem', marginBottom: '12px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', marginTop: '12px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-soft)', background: 'var(--input-bg)', color: 'var(--text-body)', fontSize: '1rem', boxSizing: 'border-box' },
  button: { width: '100%', marginTop: '20px', padding: '12px', background: '#1F4E78', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' },
  link: { textAlign: 'center', marginTop: '16px', fontSize: '0.9rem' },
  linkSmall: { textAlign: 'center', marginTop: '8px', fontSize: '0.8rem' },
};
