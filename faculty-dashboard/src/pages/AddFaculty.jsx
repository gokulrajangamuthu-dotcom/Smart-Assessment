import { useState, useEffect } from 'react';
import { Search, Pencil, Trash2, KeyRound, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';

const PAGE_SIZE = 10;

export default function AddFaculty() {
  const [mode, setMode] = useState('manual'); // 'manual' | 'bulk' | 'manage'

  // ---- Manual add state ----
  const [form, setForm] = useState({
    name: '', email: '', password: '', department_code: '', is_admin: false,
  });
  const [savedFaculty, setSavedFaculty] = useState(null);
  const [saving, setSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  // ---- Bulk upload state ----
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');

  // ---- Manage/delete/edit state ----
  const [facultyList, setFacultyList] = useState([]);
  const [facultyError, setFacultyError] = useState('');
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
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

  const loadFaculty = () => {
    setFacultyLoading(true);
    setFacultyError('');
    api.get('/faculty')
      .then((res) => setFacultyList(res.data))
      .catch((err) => setFacultyError(err.response?.data?.error || 'Failed to load faculty'))
      .finally(() => setFacultyLoading(false));
  };

  useEffect(() => {
    if (mode === 'manage') loadFaculty();
  }, [mode]);

  useEffect(() => { setPage(1); }, [deptFilter, search]);

  const handleDeleteFaculty = async (id, name) => {
    const confirmed = window.confirm(`Delete "${name}"? This permanently removes their faculty account.`);
    if (!confirmed) return;
    try {
      await api.delete(`/faculty/${id}`);
      setFacultyList((prev) => prev.filter((f) => f.id !== id));
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
      await api.put(`/faculty/${id}`, { password: newPassword });
      alert(`Password reset for ${name}.`);
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditError('');
    setEditForm({
      name: f.name || '',
      email: f.email || '',
      department_code: f.departments?.code || '',
      is_admin: f.is_admin || false,
      password: '', // blank = keep unchanged
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setEditError('');
  };

  const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });
  const handleEditToggleAdmin = (e) => setEditForm({ ...editForm, is_admin: e.target.checked });

  const saveEdit = async (id) => {
    setEditSaving(true);
    setEditError('');
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      const res = await api.put(`/faculty/${id}`, payload);
      setFacultyList((prev) => prev.map((f) => (f.id === id ? { ...f, ...res.data.faculty, departments: f.departments } : f)));
      loadFaculty(); // refresh so department name/code and admin badge stay accurate
      setEditingId(null);
    } catch (err) {
      setEditError(err.response?.data?.error || 'Update failed');
    } finally {
      setEditSaving(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleToggleAdmin = (e) => setForm({ ...form, is_admin: e.target.checked });

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setManualError('');
    setSaving(true);
    try {
      const res = await api.post('/faculty', form);
      setSavedFaculty(res.data.faculty);
      setForm({ name: '', email: '', password: '', department_code: '', is_admin: false });
    } catch (err) {
      setManualError(err.response?.data?.error || 'Failed to add faculty');
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
      const res = await api.post('/faculty/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBulkResult(res.data);
    } catch (err) {
      setBulkError(err.response?.data?.error || 'Bulk upload failed');
    } finally {
      setUploading(false);
    }
  };

  const visibleFaculty = facultyList
    .filter((f) => deptFilter === 'all' || f.departments?.code === deptFilter)
    .filter((f) => {
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return f.name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q);
    });

  const totalPages = Math.max(1, Math.ceil(visibleFaculty.length / PAGE_SIZE));
  const pagedFaculty = visibleFaculty.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <GraduationCap size={22} /> Faculty
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
          Manage Faculty
        </button>
      </div>

      {mode === 'manual' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in max-w-xl">
          {manualError && <p className="text-danger text-sm mb-4">{manualError}</p>}
          {savedFaculty && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 animate-scale-in">
              <p className="text-success font-semibold text-sm">Faculty added! Share these login details:</p>
              <p className="text-sm mt-2"><b>Email:</b> {savedFaculty.email}</p>
              <p className="text-sm text-gray-500">Password: the one you just entered (not shown again for security).</p>
            </div>
          )}

          <form onSubmit={handleManualAdd} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input name="password" value={form.password} onChange={handleChange} required minLength={6} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-secondary transition-smooth" />
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
            <label className="sm:col-span-2 flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={form.is_admin} onChange={handleToggleAdmin} />
              Make this an Admin account (can see all departments, not just their own)
            </label>
            <button type="submit" disabled={saving} className="sm:col-span-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-smooth disabled:opacity-50">
              {saving ? 'Adding...' : '+ Add Faculty'}
            </button>
          </form>
        </div>
      ) : mode === 'bulk' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in max-w-xl">
          <p className="text-sm text-gray-600 mb-4">
            Upload an Excel file with columns: <b>Name, Email, Password, DepartmentCode, IsAdmin</b> (IsAdmin: "yes" or leave blank)
          </p>

          {bulkError && <p className="text-danger text-sm mb-4">{bulkError}</p>}

          {bulkResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 animate-scale-in">
              <p className="text-primary font-semibold text-sm">{bulkResult.message}</p>
              {bulkResult.skipped?.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 max-h-40 overflow-y-auto">
                  {bulkResult.skipped.map((s, i) => (
                    <p key={i}>Row {s.row}{s.email ? ` (${s.email})` : ''}: {s.reason}</p>
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
              {uploading ? 'Uploading...' : 'Upload & Register Faculty'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in">
          {facultyLoading && <div className="skeleton h-40 w-full" />}
          {facultyError && <p className="text-danger text-sm">{facultyError}</p>}

          {!facultyLoading && !facultyError && (
            <>
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
                  />
                </div>
                <p className="text-sm text-gray-400 whitespace-nowrap">{visibleFaculty.length} faculty account{visibleFaculty.length === 1 ? '' : 's'}</p>
              </div>

              {departments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  <button
                    onClick={() => setDeptFilter('all')}
                    className={`text-xs font-bold px-3 py-2 rounded-xl transition-smooth ${
                      deptFilter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({facultyList.length})
                  </button>
                  {departments.map((d) => {
                    const count = facultyList.filter((f) => f.departments?.code === d.code).length;
                    const isActive = deptFilter === d.code;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setDeptFilter(d.code)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl transition-smooth ${
                          isActive ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {d.code} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {visibleFaculty.length === 0 ? (
                <EmptyState icon={GraduationCap} title="No faculty found" message="Try adjusting your search or department filter." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b uppercase text-xs tracking-wide">
                        <th className={`${density} pr-3`}></th>
                        <th className={density}>Name</th>
                        <th className={density}>Email</th>
                        <th className={density}>Department</th>
                        <th className={density}>Role</th>
                        <th className={density}>Created</th>
                        <th className={`${density} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedFaculty.map((f, i) => (
                        <FacultyRow
                          key={f.id}
                          faculty={f}
                          index={i}
                          density={density}
                          isEditing={editingId === f.id}
                          editForm={editForm}
                          editError={editError}
                          editSaving={editSaving}
                          departments={departments}
                          onStartEdit={() => (editingId === f.id ? cancelEdit() : startEdit(f))}
                          onEditChange={handleEditChange}
                          onEditToggleAdmin={handleEditToggleAdmin}
                          onSaveEdit={() => saveEdit(f.id)}
                          onCancelEdit={cancelEdit}
                          onDelete={() => handleDeleteFaculty(f.id, f.name)}
                          onResetPassword={() => handleResetPassword(f.id, f.name)}
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
}

function FacultyRow({
  faculty: f, index, density, isEditing, editForm, editError, editSaving, departments,
  onStartEdit, onEditChange, onEditToggleAdmin, onSaveEdit, onCancelEdit, onDelete, onResetPassword,
}) {
  const initials = (f.name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <>
      <tr className="border-b last:border-0 stagger-item hover:bg-gray-50 transition-smooth" style={{ '--delay': `${index * 0.03}s` }}>
        <td className={`${density} pr-3`}>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-primary flex items-center justify-center text-xs font-bold">{initials}</div>
        </td>
        <td className={`${density} font-medium text-gray-800`}>{f.name}</td>
        <td className={`${density} text-gray-500`}>{f.email}</td>
        <td className={density}>{f.departments?.code || '—'}</td>
        <td className={density}>
          {f.is_admin
            ? <span className="text-xs bg-amber-100 text-amber px-2 py-0.5 rounded-full font-semibold">Admin</span>
            : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">Faculty</span>}
        </td>
        <td className={`${density} text-gray-400 text-xs`}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</td>
        <td className={`${density} text-right`}>
          <div className="flex justify-end gap-1">
            <button onClick={onStartEdit} title="Edit faculty" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-100 transition-smooth">
              <Pencil size={14} />
            </button>
            <button onClick={onResetPassword} title="Reset password" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-amber-100 transition-smooth">
              <KeyRound size={14} />
            </button>
            <button onClick={onDelete} title="Delete faculty" className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-100 transition-smooth">
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
                <label className="block text-xs font-medium mb-1">Email</label>
                <input name="email" type="email" value={editForm.email} onChange={onEditChange} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" />
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
            <label className="flex items-center gap-2 text-xs font-medium mt-3">
              <input type="checkbox" checked={editForm.is_admin} onChange={onEditToggleAdmin} />
              Admin account (can see all departments)
            </label>
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
