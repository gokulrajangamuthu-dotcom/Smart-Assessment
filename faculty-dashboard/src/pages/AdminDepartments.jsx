import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2, Users, GraduationCap, ClipboardList, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import EmptyState from '../components/EmptyState';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState({ name: '', code: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDepartments = () => {
    setLoading(true);
    api.get('/departments/counts')
      .then((res) => setDepartments(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDepartments(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/departments/${editing.id}`, form);
      } else {
        await api.post('/departments', form);
      }
      setModalOpen(false);
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    const confirmed = window.confirm(`Delete "${dept.name}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await api.delete(`/departments/${dept.id}`);
      loadDepartments();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
          <h1 className="text-2xl font-bold text-gray-800">Departments</h1>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-smooth flex items-center gap-2"
        >
          <Plus size={16} /> Add Department
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-40"><div className="skeleton h-full w-full" /></div>)}
        </div>
      )}

      {!loading && departments.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <EmptyState icon={Building2} title="No departments yet" message="Add your first department to start assigning faculty, students and assessments." />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((d, i) => (
          <div key={d.id} className="stagger-item bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover" style={{ '--delay': `${i * 0.04}s` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 size={20} className="text-primary" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} title="Edit" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-smooth">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(d)} title="Delete" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 transition-smooth">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-gray-800">{d.name}</h3>
            <p className="text-xs text-gray-400 mb-4">{d.code}</p>
            <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-50 pt-3">
              <MiniStat icon={GraduationCap} value={d.faculty_count} label="Faculty" />
              <MiniStat icon={Users} value={d.student_count} label="Students" />
              <MiniStat icon={ClipboardList} value={d.assessment_count} label="Tests" />
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-800">{editing ? 'Edit Department' : 'Add Department'}</h2>
                <button onClick={() => setModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                  <X size={16} />
                </button>
              </div>
              {error && <p className="text-danger text-sm mb-3">{error}</p>}
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Bachelor of Computer Applications"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department Code</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="BCA"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary text-white py-2.5 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Department'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MiniStat({ icon: Icon, value, label }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 text-gray-700 font-bold text-sm">
        <Icon size={13} className="text-gray-400" /> {value}
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
