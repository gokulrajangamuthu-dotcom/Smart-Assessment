import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import studentApi from '../api/studentClient';

export default function StudentRegister() {
  const [form, setForm] = useState({ name: '', register_no: '', email: '', password: '', batch: '', department_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const update = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await studentApi.post('/auth/student/register', form);
      navigate('/student/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <form onSubmit={handleRegister} style={styles.card}>
        <h1 style={styles.title}>Create Student Account</h1>
        {error && <p style={styles.error}>{error}</p>}

        <label style={styles.label}>Full Name</label>
        <input style={styles.input} required onChange={(e) => update('name', e.target.value)} />

        <label style={styles.label}>Register Number</label>
        <input style={styles.input} required onChange={(e) => update('register_no', e.target.value)} />

        <label style={styles.label}>Email (used for password recovery)</label>
        <input style={styles.input} type="email" required onChange={(e) => update('email', e.target.value)} />

        <label style={styles.label}>Batch (e.g. 2024-2027)</label>
        <input style={styles.input} onChange={(e) => update('batch', e.target.value)} />

        <label style={styles.label}>Department Code (e.g. BCA)</label>
        <input style={styles.input} required onChange={(e) => update('department_code', e.target.value)} />

        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" required onChange={(e) => update('password', e.target.value)} />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Registering...' : 'Register'}
        </button>

        <p style={styles.link}>
          Already have an account? <Link to="/student/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg-flat)', padding: '20px' },
  card: { background: 'var(--card-bg)', color: 'var(--text-body)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--card-shadow-md)', width: '100%', maxWidth: '420px' },
  title: { fontSize: '1.4rem', fontWeight: 'bold', color: 'var(--heading-color)', marginBottom: '16px' },
  error: { color: '#d33', fontSize: '0.85rem', marginBottom: '12px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', marginTop: '12px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-soft)', background: 'var(--input-bg)', color: 'var(--text-body)', fontSize: '1rem', boxSizing: 'border-box' },
  button: { width: '100%', marginTop: '20px', padding: '12px', background: '#1F4E78', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' },
  link: { textAlign: 'center', marginTop: '16px', fontSize: '0.9rem' },
};
