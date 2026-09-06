import express from 'express';
import { friendlyErrorMessage } from '../utils/errors.js';
import multer from 'multer';
import xlsx from 'xlsx';
import supabase from '../supabaseClient.js';
import { verifyToken, facultyOnly } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ---------- BULK UPLOAD QUESTIONS VIA EXCEL ----------
// Expected Excel columns (case-insensitive, exact header names):
// Question | OptionA | OptionB | OptionC | OptionD | CorrectOption | Marks
// Add ?replace=true to the URL to delete existing questions first (used when editing an assessment)
router.post('/upload/:assessmentId', verifyToken, facultyOnly, upload.single('file'), async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const replaceExisting = req.query.replace === 'true';
    if (!req.file) return res.status(400).json({ error: 'No Excel file uploaded' });

    if (replaceExisting) {
      // Remove old responses/results tied to old questions first (FK safety),
      // then the old questions themselves, so the new sheet fully replaces them.
      await supabase.from('responses').delete().eq('assessment_id', assessmentId);
      await supabase.from('results').delete().eq('assessment_id', assessmentId);
      await supabase.from('questions').delete().eq('assessment_id', assessmentId);
    } else {
      // Safety net: if this assessment already has questions and the caller
      // didn't explicitly ask to replace them, block it. This is what prevents
      // accidental duplicate uploads from repeated/rapid button clicks.
      const { count, error: countErr } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('assessment_id', assessmentId);
      if (countErr) throw countErr;
      if (count > 0) {
        return res.status(409).json({
          error: `This assessment already has ${count} question(s). Use "Replace Questions" from the Edit page instead of uploading again here.`
        });
      }
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) {
      return res.status(400).json({ error: 'Excel sheet is empty' });
    }

    const questionsToInsert = rows.map((row, index) => {
      const correctOption = String(row.CorrectOption || row.correctoption || '').trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
        throw new Error(`Row ${index + 2}: CorrectOption must be A, B, C or D`);
      }
      return {
        assessment_id: assessmentId,
        question_text: row.Question || row.question,
        option_a: row.OptionA || row.optiona,
        option_b: row.OptionB || row.optionb,
        option_c: row.OptionC || row.optionc,
        option_d: row.OptionD || row.optiond,
        correct_option: correctOption,
        marks: Number(row.Marks || row.marks || 1),
        question_order: index + 1
      };
    });

    const { data, error } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (error) throw error;

    // Update total_marks on the assessment
    const totalMarks = questionsToInsert.reduce((sum, q) => sum + q.marks, 0);
    await supabase.from('assessments').update({ total_marks: totalMarks }).eq('id', assessmentId);

    res.status(201).json({ message: `${data.length} questions uploaded successfully`, questions: data });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
