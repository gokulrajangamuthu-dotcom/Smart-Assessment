import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import supabase from '../supabaseClient.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---------- LIST ALL DEPARTMENTS (for dropdowns) ----------
// Available to any logged-in faculty — used to populate department pickers
// instead of making people type a code from memory.
router.get('/', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: DEPARTMENT LIST WITH FACULTY/STUDENT/ASSESSMENT COUNTS ----------
// Registered before any "/:id" route so this literal path is never swallowed by a param route.
router.get('/counts', verifyToken, adminOnly, async (req, res) => {
  try {
    const { data: departments, error: deptErr } = await supabase
      .from('departments')
      .select('id, name, code')
      .order('name', { ascending: true });
    if (deptErr) throw deptErr;

    const [{ data: faculty, error: facErr }, { data: students, error: stuErr }, { data: assessments, error: asmErr }] =
      await Promise.all([
        supabase.from('faculty').select('department_id'),
        supabase.from('students').select('department_id'),
        supabase.from('assessments').select('department_id'),
      ]);
    if (facErr) throw facErr;
    if (stuErr) throw stuErr;
    if (asmErr) throw asmErr;

    const countBy = (rows) => rows.reduce((acc, r) => {
      if (r.department_id) acc[r.department_id] = (acc[r.department_id] || 0) + 1;
      return acc;
    }, {});
    const facultyCounts = countBy(faculty);
    const studentCounts = countBy(students);
    const assessmentCounts = countBy(assessments);

    res.json(departments.map((d) => ({
      ...d,
      faculty_count: facultyCounts[d.id] || 0,
      student_count: studentCounts[d.id] || 0,
      assessment_count: assessmentCounts[d.id] || 0,
    })));
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: CREATE DEPARTMENT ----------
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' });

    const { data, error } = await supabase
      .from('departments')
      .insert([{ name: name.trim(), code: code.trim().toUpperCase() }])
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A department with this name or code already exists' });
      }
      throw error;
    }
    res.status(201).json({ message: 'Department created successfully', department: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: UPDATE DEPARTMENT ----------
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (code !== undefined) updates.code = code.trim().toUpperCase();

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'A department with this name or code already exists' });
      }
      throw error;
    }
    if (!data) return res.status(404).json({ error: 'Department not found' });
    res.json({ message: 'Department updated successfully', department: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: DELETE DEPARTMENT ----------
// Blocked if any faculty/students/assessments still reference this department —
// same "block instead of silently cascading" convention used for question re-uploads.
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    const [{ count: facultyCount, error: facErr }, { count: studentCount, error: stuErr }, { count: assessmentCount, error: asmErr }] =
      await Promise.all([
        supabase.from('faculty').select('id', { count: 'exact', head: true }).eq('department_id', id),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('department_id', id),
        supabase.from('assessments').select('id', { count: 'exact', head: true }).eq('department_id', id),
      ]);
    if (facErr) throw facErr;
    if (stuErr) throw stuErr;
    if (asmErr) throw asmErr;

    if (facultyCount > 0 || studentCount > 0 || assessmentCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: this department still has ${facultyCount} faculty, ${studentCount} student(s) and ${assessmentCount} assessment(s) assigned to it.`
      });
    }

    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
