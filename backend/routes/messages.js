import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import supabase from '../supabaseClient.js';
import { verifyToken, facultyOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---------- ADMIN: LIST THREADS (one per non-admin faculty) ----------
router.get('/threads', verifyToken, adminOnly, async (req, res) => {
  try {
    const { data: facultyList, error: fErr } = await supabase
      .from('faculty')
      .select('id, name, email')
      .eq('is_admin', false)
      .order('name', { ascending: true });
    if (fErr) throw fErr;

    const { data: msgs, error: mErr } = await supabase
      .from('messages')
      .select('faculty_id, body, sender_is_admin, is_read, created_at')
      .order('created_at', { ascending: true });
    if (mErr) throw mErr;

    const threads = facultyList.map((f) => {
      const own = msgs.filter((m) => m.faculty_id === f.id);
      const last = own[own.length - 1];
      return {
        faculty_id: f.id,
        faculty_name: f.name,
        faculty_email: f.email,
        last_message: last?.body || null,
        last_at: last?.created_at || null,
        unread_count: own.filter((m) => !m.sender_is_admin && !m.is_read).length,
      };
    });
    threads.sort((a, b) => new Date(b.last_at || 0) - new Date(a.last_at || 0));

    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- UNREAD COUNT (for the header badge) ----------
router.get('/unread-count', verifyToken, facultyOnly, async (req, res) => {
  try {
    let query = supabase.from('messages').select('id', { count: 'exact', head: true }).eq('is_read', false);
    query = req.user.is_admin
      ? query.eq('sender_is_admin', false)
      : query.eq('faculty_id', req.user.id).eq('sender_is_admin', true);

    const { count, error } = await query;
    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- GET A THREAD & mark the other party's messages as read ----------
// Regular faculty always get their own thread; admin passes ?facultyId= to view any faculty's thread.
router.get('/thread', verifyToken, facultyOnly, async (req, res) => {
  try {
    const facultyId = req.user.is_admin ? req.query.facultyId : req.user.id;
    if (!facultyId) return res.status(400).json({ error: 'facultyId is required' });

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    const unreadIds = data.filter((m) => m.sender_is_admin !== req.user.is_admin && !m.is_read).map((m) => m.id);
    if (unreadIds.length) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
      data.forEach((m) => { if (unreadIds.includes(m.id)) m.is_read = true; });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- SEND A MESSAGE ----------
// Regular faculty always send into their own thread; admin must pass facultyId to pick the thread.
router.post('/', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { body, facultyId } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Message body is required' });

    const targetFacultyId = req.user.is_admin ? facultyId : req.user.id;
    if (!targetFacultyId) return res.status(400).json({ error: 'facultyId is required' });

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        faculty_id: targetFacultyId,
        sender_id: req.user.id,
        sender_is_admin: !!req.user.is_admin,
        body: body.trim(),
      }])
      .select()
      .single();
    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
