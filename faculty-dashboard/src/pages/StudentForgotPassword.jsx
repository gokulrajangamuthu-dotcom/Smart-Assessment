import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import studentApi from '../api/studentClient';

export default function StudentForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = enter register no, 2 = enter OTP + new password
  const [registerNo, setRegisterNo] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await studentApi.post('/auth/student/forgot-password', { register_no: registerNo });
      setMaskedEmail(res.data.maskedEmail);
      setMessage(res.data.message);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await studentApi.post('/auth/student/reset-password', {
        register_no: registerNo,
        otp,
        new_password: newPassword,
      });
      alert('Password reset successfully! Please log in with your new password.');
      navigate('/student/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card} className="animate-scale-in">
        <h1 style={styles.title}>SmartAssess</h1>
        <p style={styles.subtitle}>{step === 1 ? 'Forgot Password' : 'Reset Password'}</p>

        {error && <p style={styles.error} className="animate-fade-in">{error}</p>}
        {step === 2 && message && <p style={styles.success}>{message}</p>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
            <p style={styles.helperText}>
              Enter your Register Number. We'll send a verification code to your registered email.
            </p>
            <label style={styles.label}>Register Number</label>
            <input
              value={registerNo}
              onChange={(e) => setRegisterNo(e.target.value)}
              required
              style={styles.input}
              className="transition-smooth focus:scale-[1.01]"
            />
            <button type="submit" disabled={loading} style={styles.button} className="transition-smooth hover:shadow-lg hover:-translate-y-0.5">
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="animate-fade-in-up">
            <p style={styles.helperText}>
              A 6-digit code was sent to <b>{maskedEmail}</b>. Enter it below along with your new password.
            </p>
            <label style={styles.label}>Verification Code</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              style={{ ...styles.input, letterSpacing: '4px', fontWeight: 'bold', textAlign: 'center' }}
              className="transition-smooth focus:scale-[1.01]"
            />

            <label style={styles.label}>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              className="transition-smooth focus:scale-[1.01]"
            />

            <label style={styles.label}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
              className="transition-smooth focus:scale-[1.01]"
            />

            <button type="submit" disabled={loading} style={styles.button} className="transition-smooth hover:shadow-lg hover:-translate-y-0.5">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <p style={styles.linkSmall}>
              <button type="button" onClick={() => setStep(1)} style={styles.linkButton}>
                ← Use a different Register Number
              </button>
            </p>
          </form>
        )}

        <p style={styles.linkSmall}>
          <Link to="/student/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)' },
  card: { background: 'var(--card-bg)', color: 'var(--text-body)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--card-shadow-md)', width: '100%', maxWidth: '380px' },
  title: { fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--heading-color)', margin: 0 },
  subtitle: { color: 'var(--text-muted)', marginBottom: '16px' },
  helperText: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 },
  error: { color: '#d33', fontSize: '0.85rem', marginBottom: '12px' },
  success: { color: '#2FA84F', fontSize: '0.85rem', marginBottom: '12px' },
  label: { display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', marginTop: '12px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-soft)', background: 'var(--input-bg)', color: 'var(--text-body)', fontSize: '1rem', boxSizing: 'border-box' },
  button: { width: '100%', marginTop: '20px', padding: '12px', background: '#1F4E78', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', cursor: 'pointer' },
  linkSmall: { textAlign: 'center', marginTop: '14px', fontSize: '0.85rem' },
  linkButton: { background: 'none', border: 'none', color: 'var(--heading-color)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' },
};
