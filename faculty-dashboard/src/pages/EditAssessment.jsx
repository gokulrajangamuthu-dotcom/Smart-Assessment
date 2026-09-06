import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import api from '../api/client';

export default function EditAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    department_code: '',
    scheduled_date: '',
    duration_minutes: 30,
    negative_marking: false,
    negative_mark_value: 0.25,
    reattempt_enabled: false,
    max_reattempts: 1,
  });
  const [questionCount, setQuestionCount] = useState(0);
  const [departments, setDepartments] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');

  const loadAssessment = () => {
    api.get(`/assessments/${id}`).then((res) => {
      const a = res.data;
      // Convert the stored UTC timestamp into the browser's LOCAL wall-clock
      // time for the datetime-local input, so the edit form shows the same
      // time the faculty originally entered (not shifted by the timezone).
      let localDate = '';
      if (a.scheduled_date) {
        const d = new Date(a.scheduled_date);
        const tzOffsetMs = d.getTimezoneOffset() * 60000;
        localDate = new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
      }
      setForm({
        title: a.title || '',
        description: a.description || '',
        department_code: '',
        scheduled_date: localDate,
        duration_minutes: a.duration_minutes || 30,
        negative_marking: a.negative_marking || false,
        negative_mark_value: a.negative_mark_value || 0.25,
        reattempt_enabled: a.reattempt_enabled || false,
        max_reattempts: a.max_reattempts || 1,
      });
      setQuestionCount(a.questions?.length || 0);
      setLoading(false);
    }).catch(() => {
      setError('Failed to load assessment');
      setLoading(false);
    });
  };

  useEffect(() => {
    loadAssessment();
    api.get('/departments').then((res) => setDepartments(res.data)).catch(console.error);
  }, [id]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleToggleNegative = (e) => setForm({ ...form, negative_marking: e.target.checked });
  const handleToggleReattempt = (e) => setForm({ ...form, reattempt_enabled: e.target.checked });

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      // Same fix as create: convert the local datetime-local value back to a
      // correct UTC ISO string before sending it to the backend.
      const payload = { ...form, scheduled_date: new Date(form.scheduled_date).toISOString() };
      if (!payload.department_code) delete payload.department_code;

      await api.put(`/assessments/${id}`, payload);
      setMessage('Assessment updated successfully!');
      setTimeout(() => navigate('/faculty/dashboard'), 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReplaceQuestions = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadMessage('');
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/questions/upload/${id}?replace=true`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMessage(res.data.message);
      loadAssessment(); // refresh question count
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
      <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
        <div className="h-10 bg-gray-100 rounded"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <div className="h-10 bg-gray-100 rounded"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-r from-primary to-primaryDark px-8 py-8 mb-8 shadow-lg">
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-1">SmartAssess</p>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2"><Pencil size={24} /> Edit Assessment</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10 space-y-8">
      <div>
        {error && <p className="text-danger mb-4">{error}</p>}
        {message && <p className="text-success mb-4">{message}</p>}

        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input name="title" value={form.title} onChange={handleChange} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Department <span className="text-gray-400 font-normal">(leave as-is to keep unchanged)</span>
            </label>
            <select name="department_code" value={form.department_code} onChange={handleChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-secondary transition-smooth">
              <option value="">Keep current department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Date</label>
              <input type="datetime-local" name="scheduled_date" value={form.scheduled_date} onChange={handleChange} required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration (mins)</label>
              <input type="number" name="duration_minutes" value={form.duration_minutes} onChange={handleChange}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.negative_marking} onChange={handleToggleNegative} />
              Enable Negative Marking (optional)
            </label>
            {form.negative_marking && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Marks deducted per wrong answer</label>
                <input type="number" step="0.05" min="0" name="negative_mark_value"
                  value={form.negative_mark_value} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
                <p className="text-xs text-gray-500 mt-1">e.g. 0.25 means 1/4 mark is deducted for every wrong answer.</p>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.reattempt_enabled} onChange={handleToggleReattempt} />
              Allow Reattempts (optional)
            </label>
            {form.reattempt_enabled && (
              <div className="mt-2">
                <label className="block text-sm font-medium mb-1">Max number of reattempts allowed</label>
                <input type="number" step="1" min="1" name="max_reattempts"
                  value={form.max_reattempts} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
                <p className="text-xs text-gray-500 mt-1">
                  Once a student views their solutions, their current score becomes final and they lose any remaining reattempts.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={() => navigate('/faculty/dashboard')}
              className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-smooth">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-bold text-primary mb-3">Questions</h2>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <p className="text-sm text-gray-600">
            This assessment currently has <b>{questionCount}</b> question{questionCount === 1 ? '' : 's'}.
          </p>
          <p className="text-sm text-gray-600">
            Upload a new Excel file to <b>replace all existing questions</b> with the ones in this file.
            Columns needed: <b>Question, OptionA, OptionB, OptionC, OptionD, CorrectOption, Marks</b>
          </p>

          {uploadMessage && <p className="text-success text-sm">{uploadMessage}</p>}

          <form onSubmit={handleReplaceQuestions} className="space-y-3">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border border-gray-200 rounded-xl px-3 py-2"
            />
            <button type="submit" disabled={uploading || !file}
              className="bg-success text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Replace Questions'}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  );
}
