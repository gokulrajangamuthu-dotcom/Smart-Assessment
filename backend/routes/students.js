import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import xlsx from 'xlsx';
import supabase from '../supabaseClient.js';
import { verifyToken, facultyOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Resolves a readable department code (e.g. "BCA") to its internal UUID
async function resolveDepartmentId(department_code) {
  if (!department_code) return null;
  const { data, error } = await supabase
    .from('departments')
    .select('id')
    .ilike('code', department_code.trim())
    .maybeSingle();
  if (error) throw error;
  return data ? data.id : null;
}

// ---------- FACULTY: ADD ONE STUDENT MANUALLY ----------
router.post('/', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { name, register_no, email, password, batch, department_code } = req.body;
    if (!name || !register_no || !password) {
      return res.status(400).json({ error: 'name, register_no and password are required' });
    }

    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('register_no', register_no)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'A student with this Register Number already exists' });
    }

    const department_id = await resolveDepartmentId(department_code);
    if (department_code && !department_id) {
      return res.status(404).json({ error: `No department found with code "${department_code}"` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('students')
      .insert([{ name, register_no, email: email || null, password_hash, department_id, batch }])
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ message: 'Student added successfully', student: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: BULK ADD STUDENTS VIA EXCEL ----------
// Expected Excel columns (case-insensitive): Name | RegisterNo | Email | Password | Batch | DepartmentCode
router.post('/bulk-upload', verifyToken, facultyOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) {
      return res.status(400).json({ error: 'Excel sheet is empty' });
    }

    const added = [];
    const skipped = [];

    // Cache resolved department codes so we don't re-query the DB for every row
    const deptCache = {};

    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2; // account for header row
      const name = row.Name || row.name;
      const register_no = String(row.RegisterNo || row.registerno || row['Register No'] || '').trim();
      const email = row.Email || row.email || null;
      const password = String(row.Password || row.password || '');
      const batch = row.Batch || row.batch || null;
      const deptCode = row.DepartmentCode || row.departmentcode || row['Department Code'] || null;

      if (!name || !register_no || !password) {
        skipped.push({ row: rowNum, reason: 'Missing name, register number, or password' });
        continue;
      }

      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('register_no', register_no)
        .maybeSingle();
      if (existing) {
        skipped.push({ row: rowNum, register_no, reason: 'Register Number already exists' });
        continue;
      }

      let department_id = null;
      if (deptCode) {
        const key = String(deptCode).trim().toUpperCase();
        if (!(key in deptCache)) {
          deptCache[key] = await resolveDepartmentId(deptCode);
        }
        department_id = deptCache[key];
        if (!department_id) {
          skipped.push({ row: rowNum, register_no, reason: `Department code "${deptCode}" not found` });
          continue;
        }
      }

      const password_hash = await bcrypt.hash(password, 10);
      const { error } = await supabase
        .from('students')
        .insert([{ name, register_no, email, password_hash, department_id, batch }]);

      if (error) {
        skipped.push({ row: rowNum, register_no, reason: error.message });
      } else {
        added.push(register_no);
      }
    }

    res.status(201).json({
      message: `${added.length} student(s) added successfully. ${skipped.length} skipped.`,
      added,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: LIST STUDENTS ----------
router.get('/', verifyToken, facultyOnly, async (req, res) => {
  try {
    let query = supabase
      .from('students')
      .select('id, name, register_no, email, batch, department_id, created_at, departments(name, code)')
      .order('name', { ascending: true });

    if (!req.user.is_admin) {
      query = query.eq('department_id', req.user.department_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: UPDATE A STUDENT ----------
router.put('/:id', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, batch, department_code, password, register_no } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email || null;
    if (batch !== undefined) updateFields.batch = batch;
    if (register_no !== undefined && register_no) updateFields.register_no = register_no;

    if (department_code) {
      const department_id = await resolveDepartmentId(department_code);
      if (!department_id) {
        return res.status(404).json({ error: `No department found with code "${department_code}"` });
      }
      updateFields.department_id = department_id;
    }

    if (password) {
      updateFields.password_hash = await bcrypt.hash(password, 10);
    }

    const { data, error } = await supabase
      .from('students')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    res.json({ message: 'Student updated successfully', student: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: DELETE A STUDENT ----------
router.delete('/:id', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Remove dependent rows first to satisfy foreign key constraints
    await supabase.from('responses').delete().eq('student_id', id);
    await supabase.from('results').delete().eq('student_id', id);

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
