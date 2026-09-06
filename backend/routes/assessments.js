import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import supabase from '../supabaseClient.js';
import { verifyToken, facultyOnly } from '../middleware/auth.js';

const router = express.Router();

// ---------- CREATE ASSESSMENT (Faculty only) ----------
router.post('/', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { title, description, department_code, scheduled_date, duration_minutes, negative_marking, negative_mark_value, reattempt_enabled, max_reattempts } = req.body;

    if (!department_code) {
      return res.status(400).json({ error: 'department_code is required (e.g. BCA)' });
    }

    // Look up the department's internal UUID using its readable code
    const { data: dept, error: deptErr } = await supabase
      .from('departments')
      .select('id')
      .ilike('code', department_code.trim())
      .maybeSingle();

    if (deptErr) throw deptErr;
    if (!dept) {
      return res.status(404).json({ error: `No department found with code "${department_code}"` });
    }

    const { data, error } = await supabase
      .from('assessments')
      .insert([{
        title,
        description,
        department_id: dept.id,
        created_by: req.user.id,
        scheduled_date,
        duration_minutes,
        negative_marking: !!negative_marking,
        negative_mark_value: negative_marking ? Number(negative_mark_value) || 0 : 0,
        reattempt_enabled: !!reattempt_enabled,
        max_reattempts: reattempt_enabled ? Math.max(1, Number(max_reattempts) || 1) : 0
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- LIST ASSESSMENTS (for student's department, or all for faculty) ----------
router.get('/', verifyToken, async (req, res) => {
  try {
    const selectCols = req.user.role === 'student'
      ? '*'
      : '*, departments(name, code), faculty(name, is_admin)'; // admin/faculty view needs dept + creator name

    let query = supabase.from('assessments').select(selectCols).order('scheduled_date', { ascending: false });

    if (req.user.role === 'student') {
      query = query.eq('department_id', req.user.department_id).eq('is_active', true);
    } else if (req.user.role === 'faculty' && !req.user.is_admin) {
      query = query.eq('department_id', req.user.department_id);
    }
    // admin faculty sees all departments

    const { data, error } = await query;
    if (error) throw error;

    // For students, attach their own result status per assessment so the
    // frontend can show "Completed" and lock cards they've already finalized.
    if (req.user.role === 'student' && data.length > 0) {
      const assessmentIds = data.map((a) => a.id);
      const { data: myResults } = await supabase
        .from('results')
        .select('assessment_id, score, total_marks, attempts_used, locked_final')
        .eq('student_id', req.user.id)
        .in('assessment_id', assessmentIds);

      const resultMap = {};
      (myResults || []).forEach((r) => { resultMap[r.assessment_id] = r; });

      const enriched = data.map((a) => ({ ...a, my_result: resultMap[a.id] || null }));
      return res.json(enriched);
    }

    // For faculty/admin, attach question count and attempted-student count per
    // assessment so the dashboard cards can show them without extra round trips.
    if (req.user.role !== 'student' && data.length > 0) {
      const assessmentIds = data.map((a) => a.id);
      const [{ data: questions }, { data: results }] = await Promise.all([
        supabase.from('questions').select('assessment_id').in('assessment_id', assessmentIds),
        supabase.from('results').select('assessment_id').in('assessment_id', assessmentIds),
      ]);

      const countBy = (rows) => (rows || []).reduce((acc, r) => {
        acc[r.assessment_id] = (acc[r.assessment_id] || 0) + 1;
        return acc;
      }, {});
      const questionCounts = countBy(questions);
      const attemptedCounts = countBy(results);

      const enriched = data.map((a) => ({
        ...a,
        question_count: questionCounts[a.id] || 0,
        attempted_count: attemptedCounts[a.id] || 0,
      }));
      return res.json(enriched);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: DASHBOARD STATS OVERVIEW ----------
// Registered before "/:id" so this literal path is never swallowed by the param route.
router.get('/stats/overview', verifyToken, facultyOnly, async (req, res) => {
  try {
    const scoped = !req.user.is_admin;

    let studentsQuery = supabase.from('students').select('id', { count: 'exact', head: true });
    let assessmentsQuery = supabase.from('assessments').select('id, title, scheduled_date');
    if (scoped) {
      studentsQuery = studentsQuery.eq('department_id', req.user.department_id);
      assessmentsQuery = assessmentsQuery.eq('department_id', req.user.department_id);
    }

    const [{ count: total_students, error: sErr }, { data: assessments, error: aErr }] = await Promise.all([
      studentsQuery,
      assessmentsQuery,
    ]);
    if (sErr) throw sErr;
    if (aErr) throw aErr;

    const assessmentIds = (assessments || []).map((a) => a.id);
    let average_score = 0;
    if (assessmentIds.length > 0) {
      const { data: results, error: rErr } = await supabase
        .from('results')
        .select('score, total_marks')
        .in('assessment_id', assessmentIds);
      if (rErr) throw rErr;

      const percentages = (results || [])
        .filter((r) => r.total_marks > 0)
        .map((r) => (r.score / r.total_marks) * 100);
      average_score = percentages.length
        ? Math.round((percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100) / 100
        : 0;
    }

    const now = Date.now();
    const upcoming = (assessments || [])
      .filter((a) => new Date(a.scheduled_date).getTime() > now)
      .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0] || null;

    res.json({
      total_students: total_students || 0,
      total_assessments: assessmentIds.length,
      average_score,
      upcoming_assessment: upcoming,
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- GET SINGLE ASSESSMENT WITH QUESTIONS ----------
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: assessment, error: aErr } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();
    if (aErr) throw aErr;

    let myResult = null;

    // Students cannot open/attempt an assessment before its scheduled start time.
    // This is enforced here (not just in the UI) so it can't be bypassed.
    if (req.user.role === 'student') {
      const scheduledTime = new Date(assessment.scheduled_date).getTime();
      const now = Date.now();
      if (now < scheduledTime) {
        return res.status(403).json({
          error: 'This assessment is not available yet.',
          not_available_yet: true,
          scheduled_date: assessment.scheduled_date,
        });
      }

      // Blocks re-entry via the browser Back button after a student has already
      // finalized their result (e.g. by viewing solutions, or using all attempts).
      const { data: fetchedResult } = await supabase
        .from('results')
        .select('score, total_marks, locked_final')
        .eq('assessment_id', id)
        .eq('student_id', req.user.id)
        .maybeSingle();
      myResult = fetchedResult;

      if (myResult?.locked_final) {
        return res.status(403).json({
          error: 'You have already completed this assessment.',
          already_completed: true,
          score: myResult.score,
          total_marks: myResult.total_marks,
        });
      }
    }

    // Students should not receive the correct_option field
    const questionCols = req.user.role === 'student'
      ? 'id, question_text, option_a, option_b, option_c, option_d, marks, question_order'
      : '*';

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select(questionCols)
      .eq('assessment_id', id)
      .order('question_order', { ascending: true });
    if (qErr) throw qErr;

    // For students, tell the frontend whether they already have an attempt on
    // record for this assessment. Combined with the "came from Reattempt button"
    // flag on the frontend, this stops the browser Back button from sneaking a
    // student back into a reattempt they didn't explicitly choose.
    res.json({
      ...assessment,
      questions,
      my_result: req.user.role === 'student' ? myResult : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- UPDATE ASSESSMENT (Faculty only) ----------
router.put('/:id', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, department_code, scheduled_date, duration_minutes, is_active, negative_marking, negative_mark_value, reattempt_enabled, max_reattempts } = req.body;

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (scheduled_date !== undefined) updateFields.scheduled_date = scheduled_date;
    if (duration_minutes !== undefined) updateFields.duration_minutes = duration_minutes;
    if (is_active !== undefined) updateFields.is_active = is_active;
    if (negative_marking !== undefined) {
      updateFields.negative_marking = !!negative_marking;
      updateFields.negative_mark_value = negative_marking ? Number(negative_mark_value) || 0 : 0;
    }
    if (reattempt_enabled !== undefined) {
      updateFields.reattempt_enabled = !!reattempt_enabled;
      updateFields.max_reattempts = reattempt_enabled ? Math.max(1, Number(max_reattempts) || 1) : 0;
    }

    if (department_code) {
      const { data: dept, error: deptErr } = await supabase
        .from('departments')
        .select('id')
        .ilike('code', department_code.trim())
        .maybeSingle();
      if (deptErr) throw deptErr;
      if (!dept) {
        return res.status(404).json({ error: `No department found with code "${department_code}"` });
      }
      updateFields.department_id = dept.id;
    }

    const { data, error } = await supabase
      .from('assessments')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- DELETE ASSESSMENT (Faculty only) ----------
// Deletes the assessment along with all its questions, responses, and results
router.delete('/:id', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete dependent rows first to satisfy foreign key constraints
    await supabase.from('responses').delete().eq('assessment_id', id);
    await supabase.from('results').delete().eq('assessment_id', id);
    await supabase.from('questions').delete().eq('assessment_id', id);

    const { error } = await supabase.from('assessments').delete().eq('id', id);
    if (error) throw error;

    res.json({ message: 'Assessment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
