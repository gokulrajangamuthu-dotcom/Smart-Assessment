import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function FacultyForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = enter email, 2 = enter OTP + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/faculty/forgot-password', { email });
      setMaskedEmail(res.data.maskedEmail);
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
      await api.post('/auth/faculty/reset-password', { email, otp, new_password: newPassword });
      alert('Password reset successfully! Please log in with your new password.');
      navigate('/faculty/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm animate-scale-in">
        <h1 className="text-2xl font-bold text-primary mb-1">SmartAssess</h1>
        <p className="text-gray-500 mb-6">{step === 1 ? 'Forgot Password' : 'Reset Password'}</p>

        {error && <p className="text-red-600 text-sm mb-4 animate-fade-in">{error}</p>}

        {step === 1 ? (
          <form onSubmit={handleRequestOtp}>
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              Enter your registered email. We'll send a verification code to reset your password.
            </p>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth focus:scale-[1.01]"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-900 hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="animate-fade-in-up">
            <p className="text-sm text-gray-500 mb-4 leading-relaxed">
              A 6-digit code was sent to <b>{maskedEmail}</b>. Enter it below with your new password.
            </p>

            <label className="block text-sm font-medium mb-1">Verification Code</label>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              className="w-full border rounded-lg px-3 py-2 mb-4 text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
            />

            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
            />

            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full border rounded-lg px-3 py-2 mb-6 focus:outline-none focus:ring-2 focus:ring-primary transition-smooth"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-900 hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-primary mt-3 underline"
            >
              ← Use a different email
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-4">
          <Link to="/faculty/login" className="text-primary">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
