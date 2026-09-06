import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import supabase from '../supabaseClient.js';
import { sendOtpEmail } from '../utils/mailer.js';

const router = express.Router();

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

// ---------- STUDENT REGISTER ----------
router.post('/student/register', async (req, res) => {
  try {
    const { name, register_no, email, password, department_code, batch } = req.body;
    if (!name || !register_no || !password) {
      return res.status(400).json({ error: 'name, register_no and password are required' });
    }

    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('register_no', register_no)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Student with this Register Number already exists' });
    }

    const department_id = await resolveDepartmentId(department_code);
    if (department_code && !department_id) {
      return res.status(404).json({ error: `No department found with code "${department_code}"` });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('students')
      .insert([{ name, register_no, email, password_hash, department_id, batch }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Student registered successfully', student_id: data.id });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- STUDENT LOGIN ----------
router.post('/student/login', async (req, res) => {
  try {
    const { register_no, password } = req.body;

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('register_no', register_no)
      .maybeSingle();

    if (error) throw error;
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { id: student.id, role: 'student', department_id: student.department_id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      student: { id: student.id, name: student.name, register_no: student.register_no }
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// Note: There is intentionally no public "faculty register" endpoint anymore.
// Faculty accounts can only be created by an admin, via POST /api/faculty
// (see routes/faculty.js), which requires an admin-authenticated request.
// This ensures only faculty added by an admin can ever log in.

// ---------- FACULTY LOGIN ----------
router.post('/faculty/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data: faculty, error } = await supabase
      .from('faculty')
      .select('*, departments(name, code)')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!faculty) return res.status(404).json({ error: 'Faculty not found' });

    const valid = await bcrypt.compare(password, faculty.password_hash);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign(
      { id: faculty.id, role: 'faculty', department_id: faculty.department_id, is_admin: faculty.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      faculty: {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        is_admin: faculty.is_admin,
        department_name: faculty.departments?.name || null,
        department_code: faculty.departments?.code || null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- STUDENT: REQUEST PASSWORD RESET OTP ----------
router.post('/student/forgot-password', async (req, res) => {
  try {
    const { register_no } = req.body;
    if (!register_no) {
      return res.status(400).json({ error: 'register_no is required' });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id, name, email')
      .eq('register_no', register_no)
      .maybeSingle();
    if (error) throw error;

    if (!student) {
      return res.status(404).json({ error: 'No student found with this Register Number' });
    }
    if (!student.email) {
      return res.status(400).json({ error: 'No email is saved for this account. Please contact your faculty to reset your password.' });
    }

    // 6-digit numeric OTP, valid for 10 minutes
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from('students')
      .update({ reset_otp: otp, reset_otp_expiry: expiry })
      .eq('id', student.id);
    if (updateErr) throw updateErr;

    await sendOtpEmail(student.email, student.name, otp);

    // Mask the email so the frontend can show "code sent to g***j@gmail.com" without leaking it fully
    const maskedEmail = student.email.replace(/^(.{1,2}).*(@.*)$/, '$1***$2');
    res.json({ message: 'A verification code has been sent to your registered email.', maskedEmail });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- STUDENT: RESET PASSWORD USING OTP ----------
router.post('/student/reset-password', async (req, res) => {
  try {
    const { register_no, otp, new_password } = req.body;
    if (!register_no || !otp || !new_password) {
      return res.status(400).json({ error: 'register_no, otp and new_password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id, reset_otp, reset_otp_expiry')
      .eq('register_no', register_no)
      .maybeSingle();
    if (error) throw error;

    if (!student || !student.reset_otp) {
      return res.status(400).json({ error: 'No password reset was requested for this account' });
    }
    if (student.reset_otp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (new Date(student.reset_otp_expiry).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    const { error: updateErr } = await supabase
      .from('students')
      .update({ password_hash, reset_otp: null, reset_otp_expiry: null })
      .eq('id', student.id);
    if (updateErr) throw updateErr;

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: REQUEST PASSWORD RESET OTP ----------
router.post('/faculty/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const { data: faculty, error } = await supabase
      .from('faculty')
      .select('id, name, email')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;

    if (!faculty) {
      return res.status(404).json({ error: 'No faculty account found with this email' });
    }

    // 6-digit numeric OTP, valid for 10 minutes
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from('faculty')
      .update({ reset_otp: otp, reset_otp_expiry: expiry })
      .eq('id', faculty.id);
    if (updateErr) throw updateErr;

    await sendOtpEmail(faculty.email, faculty.name, otp);

    const maskedEmail = faculty.email.replace(/^(.{1,2}).*(@.*)$/, '$1***$2');
    res.json({ message: 'A verification code has been sent to your registered email.', maskedEmail });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: RESET PASSWORD USING OTP ----------
router.post('/faculty/reset-password', async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'email, otp and new_password are required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { data: faculty, error } = await supabase
      .from('faculty')
      .select('id, reset_otp, reset_otp_expiry')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;

    if (!faculty || !faculty.reset_otp) {
      return res.status(400).json({ error: 'No password reset was requested for this account' });
    }
    if (faculty.reset_otp !== otp) {
      return res.status(400).json({ error: 'Incorrect verification code' });
    }
    if (new Date(faculty.reset_otp_expiry).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Please request a new one.' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    const { error: updateErr } = await supabase
      .from('faculty')
      .update({ password_hash, reset_otp: null, reset_otp_expiry: null })
      .eq('id', faculty.id);
    if (updateErr) throw updateErr;

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
