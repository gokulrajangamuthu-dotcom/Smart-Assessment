import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import xlsx from 'xlsx';
import supabase from '../supabaseClient.js';
import { verifyToken, adminOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Resolves a readable department code (e.g. "BCA2027") to its internal UUID
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

// ---------- ADMIN: LIST FACULTY (all departments) ----------
router.get('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('faculty')
      .select('id, name, email, is_admin, department_id, created_at, departments(name, code)')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: ADD ONE FACULTY MANUALLY ----------
router.post('/', verifyToken, adminOnly, async (req, res) => {
  try {
    const { name, email, password, department_code, is_admin } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (!department_code) {
      return res.status(400).json({ error: 'department_code is required — this decides which department the faculty (and their assessments) belong to' });
    }

    const { data: existing } = await supabase
      .from('faculty')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'A faculty account with this email already exists' });
    }

    const department_id = await resolveDepartmentId(department_code);
    if (!department_id) {
      return res.status(404).json({ error: `No department found with code "${department_code}"` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('faculty')
      .insert([{ name, email, password_hash, department_id, is_admin: !!is_admin }])
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({ message: 'Faculty added successfully', faculty: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: BULK ADD FACULTY VIA EXCEL ----------
// Expected columns (case-insensitive): Name | Email | Password | DepartmentCode | IsAdmin (yes/no, optional)
router.post('/bulk-upload', verifyToken, adminOnly, upload.single('file'), async (req, res) => {
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
    const deptCache = {};

    for (const [index, row] of rows.entries()) {
      const rowNum = index + 2;
      const name = row.Name || row.name;
      const email = String(row.Email || row.email || '').trim();
      const password = String(row.Password || row.password || '');
      const deptCode = row.DepartmentCode || row.departmentcode || row['Department Code'];
      const isAdminFlag = String(row.IsAdmin || row.isadmin || '').trim().toLowerCase() === 'yes';

      if (!name || !email || !password || !deptCode) {
        skipped.push({ row: rowNum, reason: 'Missing name, email, password, or department code' });
        continue;
      }

      const { data: existing } = await supabase
        .from('faculty')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (existing) {
        skipped.push({ row: rowNum, email, reason: 'Email already exists' });
        continue;
      }

      const key = String(deptCode).trim().toUpperCase();
      if (!(key in deptCache)) {
        deptCache[key] = await resolveDepartmentId(deptCode);
      }
      const department_id = deptCache[key];
      if (!department_id) {
        skipped.push({ row: rowNum, email, reason: `Department code "${deptCode}" not found` });
        continue;
      }

      const password_hash = await bcrypt.hash(password, 10);
      const { error } = await supabase
        .from('faculty')
        .insert([{ name, email, password_hash, department_id, is_admin: isAdminFlag }]);

      if (error) {
        skipped.push({ row: rowNum, email, reason: error.message });
      } else {
        added.push(email);
      }
    }

    res.status(201).json({
      message: `${added.length} faculty account(s) added successfully. ${skipped.length} skipped.`,
      added,
      skipped,
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: UPDATE A FACULTY ACCOUNT ----------
router.put('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, department_code, is_admin, password } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (is_admin !== undefined) updateFields.is_admin = !!is_admin;

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
      .from('faculty')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    res.json({ message: 'Faculty updated successfully', faculty: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- ADMIN: DELETE A FACULTY ACCOUNT ----------
router.delete('/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ error: "You can't delete your own account while logged in as it." });
    }

    const { error } = await supabase.from('faculty').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Faculty account deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
