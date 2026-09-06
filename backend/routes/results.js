import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import supabase from '../supabaseClient.js';
import { verifyToken, studentOnly, facultyOnly } from '../middleware/auth.js';

const router = express.Router();

// ---------- SUBMIT ASSESSMENT (auto-evaluates and stores result) ----------
// Body: { assessment_id, answers: [{ question_id, selected_option }] }
router.post('/submit', verifyToken, studentOnly, async (req, res) => {
  try {
    const { assessment_id, answers } = req.body;
    const student_id = req.user.id;

    if (!assessment_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'assessment_id and answers[] are required' });
    }

    // Also block submission if somehow reached before the scheduled start time.
    // While we're here, also grab negative marking + reattempt settings for this assessment.
    const { data: assessmentCheck } = await supabase
      .from('assessments')
      .select('scheduled_date, negative_marking, negative_mark_value, reattempt_enabled, max_reattempts')
      .eq('id', assessment_id)
      .maybeSingle();
    if (assessmentCheck && new Date(assessmentCheck.scheduled_date).getTime() > Date.now()) {
      return res.status(403).json({ error: 'This assessment has not started yet.' });
    }
    const negativeMarking = assessmentCheck?.negative_marking || false;
    const negativeMarkValue = Number(assessmentCheck?.negative_mark_value) || 0;
    const reattemptEnabled = assessmentCheck?.reattempt_enabled || false;
    const maxReattempts = reattemptEnabled ? (Number(assessmentCheck?.max_reattempts) || 0) : 0;
    const maxAttemptsAllowed = 1 + maxReattempts; // first attempt + reattempts

    // Check for an existing result (this student may be reattempting)
    const { data: existingResult } = await supabase
      .from('results')
      .select('id, attempts_used, locked_final')
      .eq('student_id', student_id)
      .eq('assessment_id', assessment_id)
      .maybeSingle();

    if (existingResult) {
      if (existingResult.locked_final) {
        return res.status(409).json({ error: 'Your result for this assessment has already been finalized.' });
      }
      if (existingResult.attempts_used >= maxAttemptsAllowed) {
        return res.status(409).json({ error: 'You have used all your allowed attempts for this assessment.' });
      }
    }

    // Fetch correct answers for this assessment
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, correct_option, marks')
      .eq('assessment_id', assessment_id);
    if (qErr) throw qErr;

    const answerKey = {};
    questions.forEach(q => { answerKey[q.id] = q; });

    let score = 0, correctCount = 0, wrongCount = 0;
    const responsesToInsert = [];

    for (const ans of answers) {
      const q = answerKey[ans.question_id];
      if (!q) continue;
      const isCorrect = q.correct_option === String(ans.selected_option).toUpperCase();
      if (isCorrect) {
        score += q.marks;
        correctCount++;
      } else {
        wrongCount++;
        if (negativeMarking) {
          score -= negativeMarkValue;
        }
      }
      responsesToInsert.push({
        student_id,
        assessment_id,
        question_id: ans.question_id,
        selected_option: ans.selected_option,
        is_correct: isCorrect
      });
    }

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const finalScore = Math.round(score); // score column is an integer; negative marking can produce decimals

    let result;

    if (existingResult) {
      // Reattempt: replace the previous responses with this new attempt's responses
      await supabase.from('responses').delete().eq('assessment_id', assessment_id).eq('student_id', student_id);
      if (responsesToInsert.length > 0) {
        const { error: rErr } = await supabase.from('responses').insert(responsesToInsert);
        if (rErr) throw rErr;
      }

      const newAttemptsUsed = existingResult.attempts_used + 1;
      const newLockedFinal = newAttemptsUsed >= maxAttemptsAllowed; // auto-lock once attempts run out

      const { data, error: updateErr } = await supabase
        .from('results')
        .update({
          score: finalScore,
          total_marks: totalMarks,
          correct_count: correctCount,
          wrong_count: wrongCount,
          attempts_used: newAttemptsUsed,
          locked_final: newLockedFinal,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existingResult.id)
        .select()
        .single();
      if (updateErr) throw updateErr;
      result = data;
    } else {
      // First attempt
      if (responsesToInsert.length > 0) {
        const { error: rErr } = await supabase.from('responses').insert(responsesToInsert);
        if (rErr) throw rErr;
      }

      const lockedFinal = 1 >= maxAttemptsAllowed; // no reattempts allowed at all

      const { data, error: resErr } = await supabase
        .from('results')
        .insert([{
          student_id,
          assessment_id,
          score: finalScore,
          total_marks: totalMarks,
          correct_count: correctCount,
          wrong_count: wrongCount,
          attempts_used: 1,
          locked_final: lockedFinal,
        }])
        .select()
        .single();
      if (resErr) throw resErr;
      result = data;
    }

    // Recalculate ranks for this assessment (simple approach: fine for class-sized data)
    await recalculateRanks(assessment_id);

    res.status(201).json({
      message: 'Assessment submitted',
      result,
      reattempt: {
        enabled: reattemptEnabled,
        max_attempts_allowed: maxAttemptsAllowed,
        attempts_remaining: Math.max(0, maxAttemptsAllowed - result.attempts_used),
      },
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- STUDENT: FINALIZE RESULT (locks in current score, forfeits any remaining reattempts) ----------
// Called when the student chooses "View Solutions" instead of reattempting
router.post('/finalize/:assessmentId', verifyToken, studentOnly, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const student_id = req.user.id;

    const { data, error } = await supabase
      .from('results')
      .update({ locked_final: true })
      .eq('assessment_id', assessmentId)
      .eq('student_id', student_id)
      .select()
      .single();
    if (error) throw error;

    res.json({ message: 'Result finalized', result: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

async function recalculateRanks(assessment_id) {
  const { data: allResults } = await supabase
    .from('results')
    .select('id, score')
    .eq('assessment_id', assessment_id)
    .order('score', { ascending: false });

  if (!allResults) return;

  // Standard competition ranking (1224 style) - ties share the same rank
  let rank = 0, prevScore = null, position = 0;
  for (const r of allResults) {
    position++;
    if (r.score !== prevScore) rank = position;
    prevScore = r.score;
    await supabase.from('results').update({ rank }).eq('id', r.id);
  }
}

// ---------- STUDENT: OWN PERFORMANCE HISTORY ----------
router.get('/my-history', verifyToken, studentOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('*, assessments(title, scheduled_date, total_marks)')
      .eq('student_id', req.user.id)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- STUDENT: CURRENT COMPLETION STREAK ----------
// Streak = how many of the student's department's assessments in a row (most
// recent first, only ones that have already opened) the student has a result
// for. Missing any one assessment in that run breaks the streak at 0.
router.get('/streak', verifyToken, studentOnly, async (req, res) => {
  try {
    const { data: assessments, error: aErr } = await supabase
      .from('assessments')
      .select('id')
      .eq('department_id', req.user.department_id)
      .eq('is_active', true)
      .lte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: false });
    if (aErr) throw aErr;

    if (!assessments || assessments.length === 0) {
      return res.json({ streak: 0 });
    }

    const { data: results, error: rErr } = await supabase
      .from('results')
      .select('assessment_id')
      .eq('student_id', req.user.id)
      .in('assessment_id', assessments.map((a) => a.id));
    if (rErr) throw rErr;

    const completedIds = new Set((results || []).map((r) => r.assessment_id));

    let streak = 0;
    for (const a of assessments) {
      if (!completedIds.has(a.id)) break;
      streak++;
    }

    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY/STUDENT: LEADERBOARD FOR ONE ASSESSMENT ----------
router.get('/leaderboard/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('results')
      .select('student_id, score, rank, correct_count, wrong_count, students(name, register_no)')
      .eq('assessment_id', req.params.assessmentId)
      .order('rank', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: CLASS-WIDE ANALYTICS (for dashboard charts) ----------
router.get('/analytics/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { data: results, error } = await supabase
      .from('results')
      .select('score, correct_count, wrong_count')
      .eq('assessment_id', req.params.assessmentId);
    if (error) throw error;

    if (!results.length) {
      return res.json({ attempted: 0, average_score: 0, highest_score: 0, lowest_score: 0 });
    }

    const scores = results.map(r => r.score);
    const average_score = scores.reduce((a, b) => a + b, 0) / scores.length;

    res.json({
      attempted: results.length,
      average_score: Math.round(average_score * 100) / 100,
      highest_score: Math.max(...scores),
      lowest_score: Math.min(...scores)
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: COMBINED SUMMARY (leaderboard + analytics in one call) ----------
// Faster than calling /leaderboard and /analytics separately — saves a network round trip,
// which is what was making the dashboard feel slow when switching between assessments.
router.get('/summary/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { data: results, error } = await supabase
      .from('results')
      .select('student_id, score, rank, correct_count, wrong_count, students(name, register_no)')
      .eq('assessment_id', req.params.assessmentId)
      .order('rank', { ascending: true });
    if (error) throw error;

    const leaderboard = results || [];

    let analytics = { attempted: 0, average_score: 0, highest_score: 0, lowest_score: 0 };
    if (leaderboard.length > 0) {
      const scores = leaderboard.map((r) => r.score);
      analytics = {
        attempted: leaderboard.length,
        average_score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
        highest_score: Math.max(...scores),
        lowest_score: Math.min(...scores),
      };
    }

    // Total students in this assessment's department, so admin/faculty can see
    // attempted-vs-total (e.g. "12 / 45 students attempted").
    const { data: assessment } = await supabase
      .from('assessments')
      .select('department_id')
      .eq('id', req.params.assessmentId)
      .maybeSingle();

    if (assessment?.department_id) {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('department_id', assessment.department_id);
      analytics.total_students_in_department = count || 0;
    } else {
      analytics.total_students_in_department = 0;
    }

    res.json({ leaderboard, analytics });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// Escapes a value for a CSV cell: wraps in quotes and doubles any embedded quotes
// whenever the value contains a comma, quote, or newline.
function csvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// ---------- FACULTY/ADMIN: EXPORT RESULTS AS CSV ----------
router.get('/export/:assessmentId', verifyToken, async (req, res) => {
  try {
    const { assessmentId } = req.params;

    const { data: assessment, error: aErr } = await supabase
      .from('assessments')
      .select('title')
      .eq('id', assessmentId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assessment) return res.status(404).json({ error: 'Assessment not found' });

    const { data: results, error } = await supabase
      .from('results')
      .select('student_id, score, rank, correct_count, wrong_count, students(name, register_no)')
      .eq('assessment_id', assessmentId)
      .order('rank', { ascending: true });
    if (error) throw error;

    const header = ['Rank', 'Register No', 'Name', 'Score', 'Correct', 'Wrong'];
    const rows = (results || []).map((r) => [
      r.rank,
      r.students?.register_no,
      r.students?.name,
      r.score,
      r.correct_count,
      r.wrong_count,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');

    const safeTitle = assessment.title.replace(/[^a-z0-9\-_ ]/gi, '').trim() || 'results';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-results.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- STUDENT: REVIEW SOLUTIONS FOR ONE ASSESSMENT ----------
// Shows each question with the student's selected answer vs the correct answer
router.get('/review/:assessmentId', verifyToken, studentOnly, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const student_id = req.user.id;

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, question_order')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true });
    if (qErr) throw qErr;

    const { data: responses, error: rErr } = await supabase
      .from('responses')
      .select('question_id, selected_option, is_correct')
      .eq('assessment_id', assessmentId)
      .eq('student_id', student_id);
    if (rErr) throw rErr;

    const responseMap = {};
    responses.forEach((r) => { responseMap[r.question_id] = r; });

    const review = questions.map((q) => ({
      ...q,
      selected_option: responseMap[q.id]?.selected_option || null,
      is_correct: responseMap[q.id]?.is_correct || false,
    }));

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- FACULTY: REVIEW A SPECIFIC STUDENT'S ANSWERS FOR AN ASSESSMENT ----------
// Shows each question with that student's selected answer vs the correct answer,
// plus basic student/result info so the page can show a header.
router.get('/faculty-review/:assessmentId/:studentId', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { assessmentId, studentId } = req.params;

    const { data: student, error: sErr } = await supabase
      .from('students')
      .select('name, register_no')
      .eq('id', studentId)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { data: result, error: resErr } = await supabase
      .from('results')
      .select('score, total_marks, correct_count, wrong_count, rank, attempts_used, submitted_at')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId)
      .maybeSingle();
    if (resErr) throw resErr;

    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, question_order')
      .eq('assessment_id', assessmentId)
      .order('question_order', { ascending: true });
    if (qErr) throw qErr;

    const { data: responses, error: rErr } = await supabase
      .from('responses')
      .select('question_id, selected_option, is_correct')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId);
    if (rErr) throw rErr;

    const responseMap = {};
    responses.forEach((r) => { responseMap[r.question_id] = r; });

    const review = questions.map((q) => ({
      ...q,
      selected_option: responseMap[q.id]?.selected_option || null,
      is_correct: responseMap[q.id]?.is_correct || false,
    }));

    res.json({ student, result, questions: review });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
