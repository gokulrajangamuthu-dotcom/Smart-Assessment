import { useState, useRef, useEffect } from 'react';
import { FilePlus2, UploadCloud, Sparkles } from 'lucide-react';
import api from '../api/client';
import AiQuestionModal from '../components/AiQuestionModal';

export default function CreateAssessment() {
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
  const [departments, setDepartments] = useState([]);
  const [assessmentId, setAssessmentId] = useState(null);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const createLockRef = useRef(false);
  const uploadLockRef = useRef(false);

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data)).catch(console.error);
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleToggleNegative = (e) => setForm({ ...form, negative_marking: e.target.checked });
  const handleToggleReattempt = (e) => setForm({ ...form, reattempt_enabled: e.target.checked });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (createLockRef.current) return; // instant check, no render delay
    createLockRef.current = true;
    setError('');
    setCreating(true);
    try {
      // The <input type="datetime-local"> gives a plain "YYYY-MM-DDTHH:mm" string
      // with no timezone info. `new Date(...)` correctly interprets that as the
      // browser's LOCAL time, so converting it to ISO here gives the right UTC
      // instant to store. Sending the raw string instead would make the backend
      // store it as if it were already UTC, shifting the time by your timezone offset.
      const payload = { ...form, scheduled_date: new Date(form.scheduled_date).toISOString() };
      const res = await api.post('/assessments', payload);
      setAssessmentId(res.data.id);
      setMessage('Assessment created! Now upload the question Excel file below.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create assessment');
      createLockRef.current = false; // allow retry only if it actually failed
    } finally {
      setCreating(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !assessmentId) return;
    if (uploadLockRef.current) return; // instant check, blocks rapid double/triple clicks immediately
    uploadLockRef.current = true;
    setUploading(true);
    setError('');
    try {
      const res = await api.post(`/questions/upload/${assessmentId}`, formDataFromFile(file), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(res.data.message);
      setUploaded(true); // locks the button so it can't be clicked again
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      uploadLockRef.current = false; // allow retry only if it actually failed
    } finally {
      setUploading(false);
    }
  };

  const formDataFromFile = (f) => {
    const formData = new FormData();
    formData.append('file', f);
    return formData;
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-r from-primary to-primaryDark px-8 py-8 mb-8 shadow-lg">
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-1">SmartAssess</p>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2"><FilePlus2 size={26} /> Create New Assessment</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-10">

      {error && <p className="text-danger mb-4">{error}</p>}
      {message && <p className="text-success mb-4">{message}</p>}

      {!assessmentId ? (
        <form onSubmit={handleCreate} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input name="title" onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea name="description" onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-secondary transition-smooth" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select name="department_code" value={form.department_code} onChange={handleChange} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white outline-none focus:border-secondary transition-smooth">
              <option value="" disabled>Select a department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Date</label>
              <input type="datetime-local" name="scheduled_date" onChange={handleChange} required
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
                  e.g. 1 means the student can attempt once more after their first try (2 tries total).
                  Once a student views their solutions, their current score becomes final and they lose any remaining reattempts.
                </p>
              </div>
            )}
          </div>
          <button type="submit" disabled={creating} className="bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50">
            {creating ? 'Creating...' : 'Create Assessment'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="p-5 rounded-2xl bg-gradient-to-tr from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200 text-left transition group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mb-3 shadow-md">
                <Sparkles size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                Generate with AI
                <span className="text-[10px] uppercase font-extrabold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">New</span>
              </h3>
              <p className="text-xs text-gray-500 mt-1">Generate syllabus-aligned MCQs instantly using Google Gemini.</p>
            </button>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white mb-3 shadow-md">
                <UploadCloud size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">Upload Excel Sheet</h3>
              <p className="text-xs text-gray-500 mt-1">Upload existing question bank in .xlsx or .xls format.</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <p className="text-xs text-gray-600 flex items-center gap-2">
              <UploadCloud size={16} className="text-secondary shrink-0" />
              Upload Excel file with columns: <b>Question, OptionA, OptionB, OptionC, OptionD, CorrectOption, Marks</b>
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <div className="flex gap-3">
              <button type="submit" disabled={uploading || uploaded || !file} className="bg-success text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-smooth disabled:opacity-50 text-sm">
                {uploading ? 'Uploading...' : uploaded ? 'Uploaded ✓' : 'Upload Questions'}
              </button>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-smooth text-sm flex items-center gap-1.5"
              >
                <Sparkles size={16} />
                Open AI Generator
              </button>
            </div>
            {uploaded && (
              <p className="text-xs text-gray-500">
                Questions uploaded. Go to the Dashboard to view it, or click "Replace Questions" from the Edit page if you need to fix anything.
              </p>
            )}
          </form>

          <AiQuestionModal
            isOpen={showAiModal}
            onClose={() => setShowAiModal(false)}
            assessmentId={assessmentId}
            onQuestionsSaved={(res) => {
              setUploaded(true);
              setMessage(res.message || 'Questions generated and saved successfully!');
            }}
          />
        </div>
      )}
      </div>
    </div>
  );
}
