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

import { generateFallbackQuestions } from '../utils/fallbackGenerator.js';

// ---------- AI QUESTION GENERATOR (GEMINI & BUILT-IN ENGINE) ----------
router.post('/generate-ai', verifyToken, facultyOnly, async (req, res) => {
  try {
    const {
      topic,
      subtopic = '',
      difficulty = 'Medium',
      count = 5,
      marksPerQuestion = 1,
      apiKey: customApiKey
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ error: 'Topic is required to generate questions.' });
    }

    const effectiveApiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;

    let questions = null;
    let fallbackUsed = false;
    let fallbackReason = '';

    if (effectiveApiKey) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

        const prompt = `You are an expert exam question creator for aptitude, technical, and academic assessments.
Generate exactly ${count} multiple choice questions (MCQs) for:
- Topic: ${topic}
${subtopic ? `- Subtopic / Focus: ${subtopic}` : ''}
- Difficulty Level: ${difficulty}
- Default Marks per question: ${marksPerQuestion}

Return ONLY a valid JSON array of objects with this EXACT structure:
[
  {
    "question_text": "Detailed question prompt",
    "option_a": "First option",
    "option_b": "Second option",
    "option_c": "Third option",
    "option_d": "Fourth option",
    "correct_option": "A",
    "marks": ${Number(marksPerQuestion) || 1},
    "explanation": "Clear step-by-step reason why this is correct"
  }
]
Important rules:
1. "correct_option" MUST be one of "A", "B", "C", or "D".
2. Ensure options are distinct and unambiguous.
3. Output valid JSON only, without markdown wrapping or backticks if possible.`;

        const candidateModels = [
          process.env.GEMINI_MODEL,
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-2.5-flash'
        ].filter(Boolean);

        let response = null;
        let lastError = null;

        for (const modelName of candidateModels) {
          try {
            response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                responseMimeType: 'application/json',
              }
            });
            if (response && response.text) break;
          } catch (err) {
            lastError = err;
            console.warn(`[Gemini] Model ${modelName} attempt:`, err.message);
          }
        }

        if (response && response.text) {
          let rawText = response.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          let parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            questions = parsed;
          } else if (parsed.questions && Array.isArray(parsed.questions)) {
            questions = parsed.questions;
          }
        } else {
          throw lastError || new Error('Google Gemini API unavailable.');
        }
      } catch (aiErr) {
        console.warn('[AI Generator] Google Gemini call failed, engaging SmartAssess Question Engine:', aiErr.message);
        fallbackUsed = true;
        const isFortinetBlock =
          aiErr.message?.includes('FortiGuard') ||
          aiErr.message?.includes('Artificial Intelligence Technology') ||
          aiErr.message?.includes('403') ||
          aiErr.message?.includes('fetch failed');

        fallbackReason = isFortinetBlock
          ? 'Notice: Your network firewall (e.g. FortiGuard) blocked the external AI API. Generated high-quality questions using SmartAssess Built-in Engine.'
          : 'Notice: Google Gemini was unreachable. Generated questions using SmartAssess Built-in Engine.';
        
        questions = generateFallbackQuestions(topic, Number(count), Number(marksPerQuestion), difficulty);
      }
    } else {
      fallbackUsed = true;
      fallbackReason = 'Generated questions using SmartAssess Built-in Engine.';
      questions = generateFallbackQuestions(topic, Number(count), Number(marksPerQuestion), difficulty);
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      questions = generateFallbackQuestions(topic, Number(count), Number(marksPerQuestion), difficulty);
    }

    // Sanitize and validate questions
    const sanitized = questions.map((q, idx) => {
      const correct = String(q.correct_option || 'A').trim().toUpperCase();
      return {
        question_text: String(q.question_text || `Question ${idx + 1}`).trim(),
        option_a: String(q.option_a || 'Option A').trim(),
        option_b: String(q.option_b || 'Option B').trim(),
        option_c: String(q.option_c || 'Option C').trim(),
        option_d: String(q.option_d || 'Option D').trim(),
        correct_option: ['A', 'B', 'C', 'D'].includes(correct) ? correct : 'A',
        marks: Number(q.marks) || Number(marksPerQuestion) || 1,
        explanation: String(q.explanation || '').trim()
      };
    });

    res.json({
      success: true,
      topic,
      difficulty,
      count: sanitized.length,
      questions: sanitized,
      fallbackUsed,
      fallbackReason
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

// ---------- BULK INSERT / REPLACE QUESTIONS (E.G. FROM AI GENERATOR) ----------
router.post('/bulk-create/:assessmentId', verifyToken, facultyOnly, async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { questions, replaceExisting = true } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'No questions provided to insert.' });
    }

    if (replaceExisting) {
      await supabase.from('responses').delete().eq('assessment_id', assessmentId);
      await supabase.from('results').delete().eq('assessment_id', assessmentId);
      await supabase.from('questions').delete().eq('assessment_id', assessmentId);
    }

    // Get current question count to offset question_order if appending
    let startOrder = 1;
    if (!replaceExisting) {
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('assessment_id', assessmentId);
      startOrder = (count || 0) + 1;
    }

    const questionsToInsert = questions.map((q, index) => {
      const correctOption = String(q.correct_option || '').trim().toUpperCase();
      if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
        throw new Error(`Question ${index + 1}: CorrectOption must be A, B, C or D`);
      }
      return {
        assessment_id: assessmentId,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_option: correctOption,
        marks: Number(q.marks || 1),
        question_order: startOrder + index
      };
    });

    const { data, error } = await supabase
      .from('questions')
      .insert(questionsToInsert)
      .select();

    if (error) throw error;

    // Recalculate total_marks on the assessment
    const { data: allQuestions } = await supabase
      .from('questions')
      .select('marks')
      .eq('assessment_id', assessmentId);

    const totalMarks = (allQuestions || []).reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
    await supabase.from('assessments').update({ total_marks: totalMarks }).eq('id', assessmentId);

    res.status(201).json({
      message: `${data.length} questions saved successfully`,
      questions: data,
      total_marks: totalMarks
    });
  } catch (err) {
    res.status(500).json({ error: friendlyErrorMessage(err) });
  }
});

export default router;
