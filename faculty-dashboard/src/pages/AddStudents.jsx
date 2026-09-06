import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Pencil, Trash2, KeyRound, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';

const PAGE_SIZE = 10;

export default function AddStudents() {
  const navigate = useNavigate();
  const location = useLocation();
  const insideAdminShell = location.pathname.startsWith('/admin');

  const [mode, setMode] = useState('manual'); // 'manual' | 'bulk' | 'manage'

  // ---- Manual add state ----
  const [form, setForm] = useState({
    name: '', register_no: '', email: '', password: '', batch: '', department_code: '',
  });
  const [savedStudent, setSavedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  // ---- Bulk upload state ----
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');

  // ---- Manage/delete/edit state ----
  const [students, setStudents] = useState([]);
  const [studentsError, setStudentsError] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // ---- Departments list (for dropdown) ----
  const [departments, setDepartments] = useState([]);

  const density = localStorage.getItem('admin_table_density') === 'dense' ? 'py-1.5' : 'py-3';

  useEffect(() => {
    api.get('/departments').then((res) => setDepartments(res.data)).catch(console.error);
  }, []);

  const loadStudents = () => {
    setStudentsLoading(true);
    setStudentsError('');
    api.get('/students')
      .then((res) => setStudents(res.data))
      .catch((err) => setStudentsError(err.response?.data?.error || 'Failed to load students'))
      .finally(() => setStudentsLoading(false));
  };

  useEffect(() => {
    if (mode === 'manage') loadStudents();
  }, [mode]);

  useEffect(() => { setPage(1); setSelectedIds([]); }, [deptFilter, batchFilter, search]);

  const handleDeleteStudent = async (id, name) => {
    const confirmed = window.confirm(`Delete "${name}"? This permanently removes their account and all their assessment results.`);
    if (!confirmed) return;
    try {
      await api.delete(`/students/${id}`);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleResetPassword = async (id, name) => {
    const newPassword = window.prompt(`Enter a new password for "${name}" (min. 6 characters):`);
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      await api.put(`/students/${id}`, { password: newPassword });
      alert(`Password reset for ${name}.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(`Delete ${selectedIds.length} selected student(s)? This permanently removes their accounts and results.`);
    if (!confirmed) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/students/${id}`)));
      setStudents((prev) => prev.filter((s) => !selectedIds.includes(s.id)));
      setSelectedIds([]);
    } catch (err) {
      alert(err.response?.data?.error || 'Some deletions failed — please refresh and check.');
      loadStudents();
    } finally {
      setBulkDeleting(false);
    }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setEditError('');
    setEditForm({
      name: s.name || '',
      register_no: s.register_no || '',
      email: s.email || '',
      batch: s.batch || '',
      department_code: s.departments?.code || '',
      password: '', // blank = keep unchanged
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditError('');
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const saveEdit = async (id) => {
    setEditSaving(true);
    setEditError('');
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password; // don't touch password if left blank
      const res = await api.put(`/students/${id}`, payload);
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...res.data.student, departments: s.departments } : s)));
      // Refresh full list so the department name/code shown stays accurate after a department change
      loadStudents();
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setManualError('');
    setSaving(true);
    try {
      const res = await api.post('/students', form);
      setSavedStudent(res.data.student);
      setForm({ name: '', register_no: '', email: '', password: '', batch: '', department_code: form.department_code });
    } catch (err) {
      setManualError(err.response?.data?.error || 'Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setBulkError('');
    setBulkResult(null);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/students/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkResult(res.data);
    } catch (err) {
      setBulkError(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const batches = useMemo(() => [...new Set(students.map((s) => s.batch).filter(Boolean))].sort(), [students]);

  const visibleStudents = students
    .filter((s) => deptFilter === 'all' || s.departments?.code === deptFilter)
    .filter((s) => batchFilter === 'all' || s.batch === batchFilter)
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return s.name?.toLowerCase().includes(q) || s.register_no?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / PAGE_SIZE));
  const pagedStudents = visibleStudents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allPagedSelected = pagedStudents.length > 0 && pagedStudents.every((s) => selectedIds.includes(s.id));

  const toggleSelectAll = () => {
    if (allPagedSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedStudents.some((s) => s.id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pagedStudents.map((s) => s.id)])]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const content = (
    <div className={insideAdminShell ? 'space-y-6' : 'max-w-2xl mx-auto px-4 pb-10 space-y-6'}>
      {!insideAdminShell && (
        <div className="flex justify-end -mb-2">
          <button onClick={() => navigate('/faculty/dashboard')} className="text-sm font-semibold text-primary hover:underline">
            ← Back to Dashboard
          </button>
        </div>
      )}

      <div>
        {insideAdminShell && <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>}
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users size={22} /> Students
        </h1>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-smooth ${
            mode === 'manual' ? 'bg-white shadow text-primary' : 'text-gray-500'
          }`}
        >
          Add Manually
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-smooth ${
            mode === 'bulk' ? 'bg-white shadow text-primary' : 'text-gray-500'
          }`}
        >
          Bulk Register (Excel)
        </button>
        <button
          onClick={() => setMode('manage')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-smooth ${
            mode === 'manage' ? 'bg-white shadow text-primary' : 'text-gray-500'
          }`}
        >
          Manage Students
        </button>
      </div>

      {mode === 'manual' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in max-w-xl">
          {manualError && <p className="text-danger text-sm mb-4">{manualError}</p>}
          {savedStudent && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 animate-scale-in">
              <p className="text-success font-semibold text-sm">Student added! Share these login details:</p>
              <p className="text-sm mt-2"><b>Register No:</b> {savedStudent.register_no}</p>
              <p className="text-sm text-gray-500">Password: the one you just entered (not shown again for security).</p>
            </div>
          )}

          <form onSubmit={handleManualAdd} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Register Number</label>
              <input name="register_no" value={form.register_no} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email (optional)</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input name="password" value={form.password} onChange={handleChange} required minLength={6} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Batch</label>
              <input name="batch" placeholder="e.g. 2024-2027" value={form.batch} onChange={handleChange} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                name="department_code"
                value={form.department_code}
                onChange={handleChange}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-secondary transition-smooth"
              >
                <option value="" disabled>Select a department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving} className="sm:col-span-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50">
              {saving ? 'Adding...' : '+ Add Student'}
            </button>
          </form>
        </div>
      ) : mode === 'bulk' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in max-w-xl">
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel file with columns: <b>Name, RegisterNo, Email, Password, Batch, DepartmentCode</b>
          </p>

          {bulkError && <p className="text-danger text-sm mb-4">{bulkError}</p>}

          {bulkResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 animate-scale-in">
              <p className="text-primary font-semibold text-sm">{bulkResult.message}</p>
              {bulkResult.skipped?.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 max-h-40 overflow-y-auto">
                  {bulkResult.skipped.map((s, i) => (
                    <p key={i}>Row {s.row}{s.register_no ? ` (${s.register_no})` : ''}: {s.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleBulkUpload} className="space-y-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
            <button type="submit" disabled={uploading || !file} className="bg-success text-white px-5 py-2.5 rounded-xl font-semibold hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload & Register Students'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in">
          {studentsLoading && <div className="skeleton h-40 w-full" />}
          {studentsError && <p className="text-danger text-sm">{studentsError}</p>}

          {!studentsLoading && !studentsError && (
            <>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, register no or email..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
                  />
                </div>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm">
                  <option value="all">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.code}>{d.code}</option>
                  ))}
                </select>
                {batches.length > 0 && (
                  <select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm">
                    <option value="all">All Batches</option>
                    {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                )}
                <p className="text-sm text-gray-400 whitespace-nowrap">{visibleStudents.length} student{visibleStudents.length === 1 ? '' : 's'}</p>
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 mb-4 animate-fade-in">
                  <p className="text-sm font-semibold text-primary">{selectedIds.length} selected</p>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="text-xs font-bold bg-danger text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-smooth disabled:opacity-50"
                  >
                    {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                  </button>
                </div>
              )}

              {visibleStudents.length === 0 ? (
                <EmptyState icon={Users} title="No students found" message="Try adjusting your search or filters." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b uppercase text-xs tracking-wide">
                        <th className={`${density} pr-2`}>
                          <input type="checkbox" checked={allPagedSelected} onChange={toggleSelectAll} />
                        </th>
                        <th className={`${density} pr-3`}></th>
                        <th className={density}>Name</th>
                        <th className={density}>Register No</th>
                        <th className={density}>Department</th>
                        <th className={density}>Batch</th>
                        <th className={`${density} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedStudents.map((s, i) => (
                        <StudentRow
                          key={s.id}
                          student={s}
                          index={i}
                          density={density}
                          checked={selectedIds.includes(s.id)}
                          onToggleSelect={() => toggleSelectOne(s.id)}
                          isEditing={editingId === s.id}
                          editForm={editForm}
                          editError={editError}
                          editSaving={editSaving}
                          departments={departments}
                          onStartEdit={() => (editingId === s.id ? cancelEdit() : startEdit(s))}
                          onEditChange={handleEditChange}
                          onSaveEdit={() => saveEdit(s.id)}
                          onCancelEdit={cancelEdit}
                          onDelete={() => handleDeleteStudent(s.id, s.name)}
                          onResetPassword={() => handleResetPassword(s.id, s.name)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-smooth"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <span className="text-gray-400 text-xs">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-smooth"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );

  if (insideAdminShell) return content;
  return <div className="min-h-screen bg-surface pt-8">{content}</div>;
}

function StudentRow({
  student: s, index, density, checked, onToggleSelect, isEditing, editForm, editError, editSaving, departments,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit, onDelete, onResetPassword,
}) {
  const initials = (s.name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <>
      <tr className="border-b last:border-0 stagger-item hover:bg-gray-50 transition-smooth" style={{ '--delay': `${index * 0.03}s` }}>
        <td className={`${density} pr-2`}>
          <input type="checkbox" checked={checked} onChange={onToggleSelect} />
        </td>
        <td className={`${density} pr-3`}>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center text-xs font-bold">{initials}</div>
        </td>
        <td className={`${density} font-medium text-gray-800`}>
          {s.name}
          {s.email && <span className="block text-xs text-gray-400 font-normal">{s.email}</span>}
        </td>
        <td className={`${density} text-gray-500`}>{s.register_no}</td>
        <td className={density}>{s.departments?.code || '—'}</td>
        <td className={density}>{s.batch || '—'}</td>
        <td className={`${density} text-right`}>
          <div className="flex justify-end gap-1">
            <button onClick={onStartEdit} title="Edit student" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-smooth">
              <Pencil size={14} />
            </button>
            <button onClick={onResetPassword} title="Reset password" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-100 transition-smooth">
              <KeyRound size={14} />
            </button>
            <button onClick={onDelete} title="Delete student" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 transition-smooth">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {isEditing && (
        <tr className="bg-gray-50/50">
          <td colSpan={7} className="p-4 animate-fade-in">
            {editError && <p className="text-danger text-xs mb-2">{editError}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Full Name</label>
                <input name="name" value={editForm.name} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Register Number</label>
                <input name="register_no" value={editForm.register_no} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input name="email" type="email" value={editForm.email} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Batch</label>
                <input name="batch" value={editForm.batch} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Department</label>
                <select name="department_code" value={editForm.department_code} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                  {departments.map((d) => (
                    <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">New Password <span className="text-gray-400 font-normal">(leave blank to keep)</span></label>
                <input name="password" value={editForm.password} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={onSaveEdit} disabled={editSaving} className="bg-primary text-white text-xs px-4 py-1.5 rounded-lg font-medium hover:shadow-md transition-smooth disabled:opacity-50">
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={onCancelEdit} className="bg-gray-100 text-gray-700 text-xs px-4 py-1.5 rounded-lg font-medium hover:bg-gray-200 transition-smooth">
                Cancel
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
