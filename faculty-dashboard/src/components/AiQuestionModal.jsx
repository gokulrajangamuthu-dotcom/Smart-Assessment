import { useState } from 'react';
import { Sparkles, X, Loader2, CheckCircle2, Trash2, Plus, Edit2, Key, Info } from 'lucide-react';
import api from '../api/client';

export default function AiQuestionModal({ isOpen, onClose, assessmentId, onQuestionsSaved }) {
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [count, setCount] = useState(5);
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('smartassess_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fallbackNotice, setFallbackNotice] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [replaceExisting, setReplaceExisting] = useState(true);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError('Please provide a topic name.');
      return;
    }
    setError('');
    setFallbackNotice('');
    setGenerating(true);

    try {
      if (apiKey.trim()) {
        localStorage.setItem('smartassess_gemini_key', apiKey.trim());
      }
      const res = await api.post('/questions/generate-ai', {
        topic: topic.trim(),
        subtopic: subtopic.trim(),
        difficulty,
        count: Number(count),
        marksPerQuestion: Number(marksPerQuestion),
        apiKey: apiKey.trim() || undefined,
      });

      setGeneratedQuestions(res.data.questions || []);
      if (res.data.fallbackReason) {
        setFallbackNotice(res.data.fallbackReason);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate questions.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateQuestion = (idx, field, val) => {
    setGeneratedQuestions((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleDeleteQuestion = (idx) => {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveToAssessment = async () => {
    if (!assessmentId) {
      if (onQuestionsSaved) onQuestionsSaved(generatedQuestions);
      onClose();
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/questions/bulk-create/${assessmentId}`, {
        questions: generatedQuestions,
        replaceExisting,
      });
      if (onQuestionsSaved) onQuestionsSaved(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save questions to assessment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white dark:from-dark-card dark:to-dark-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 dark:shadow-none">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                AI Question Generator
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400">
                  Gemini AI
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-dark-muted">Generate syllabus-aligned MCQs with verified answers and explanations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-card-hover rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-sm flex items-start gap-2.5">
              <Info size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Generation Notice</p>
                <p className="text-xs mt-0.5 leading-relaxed">{error}</p>
                {error.toLowerCase().includes('api key') && (
                  <button
                    onClick={() => setShowKeyInput(true)}
                    className="mt-2 text-xs font-semibold text-rose-800 dark:text-rose-300 underline"
                  >
                    Enter Gemini API Key below
                  </button>
                )}
              </div>
            </div>
          )}

          {generatedQuestions.length === 0 ? (
            /* Input Form */
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text uppercase tracking-wider mb-1.5">
                  Subject / Topic <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Quantitative Aptitude: Time and Work, Data Structures, Indian Constitution"
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text uppercase tracking-wider mb-1.5">
                  Subtopic / Specific Concepts (Optional)
                </label>
                <input
                  type="text"
                  value={subtopic}
                  onChange={(e) => setSubtopic(e.target.value)}
                  placeholder="e.g. Pipes and Cisterns, Efficiency ratios, Binary Search Trees"
                  className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl px-4 py-2.5 text-sm text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text uppercase tracking-wider mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl px-3 py-2.5 text-sm text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 transition"
                  >
                    <option value="Easy">Easy (Beginner)</option>
                    <option value="Medium">Medium (Standard)</option>
                    <option value="Hard">Hard (Advanced)</option>
                    <option value="Mixed">Mixed (Balanced)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text uppercase tracking-wider mb-1.5">
                    No. of Questions
                  </label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl px-3 py-2.5 text-sm text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 transition"
                  >
                    <option value={3}>3 Questions (Quick Test)</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={15}>15 Questions</option>
                    <option value={20}>20 Questions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-dark-text uppercase tracking-wider mb-1.5">
                    Marks per Question
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={marksPerQuestion}
                    onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                    className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-2xl px-3 py-2.5 text-sm text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Gemini API Key Collapsible */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 hover:underline"
                >
                  <Key size={13} />
                  {showKeyInput ? 'Hide Custom Gemini API Key' : 'Configure Custom Gemini API Key'}
                </button>
                {showKeyInput && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-dark-bg rounded-2xl border border-gray-200 dark:border-dark-border">
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-dark-muted mb-1">
                      Gemini API Key (Optional if backend .env has GEMINI_API_KEY)
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl px-3 py-1.5 text-xs text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 transition font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={generating || !topic.trim()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none transition disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating Questions with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate {count} Questions
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Review & Edit Screen */
            <div className="space-y-4">
              {fallbackNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                  <Info size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <p>{fallbackNotice}</p>
                </div>
              )}

              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900">
                <div>
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-300">
                    Generated {generatedQuestions.length} Questions for "{topic}"
                  </p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                    Review or tweak options before saving to the assessment.
                  </p>
                </div>
                <button
                  onClick={() => setGeneratedQuestions([])}
                  className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
                >
                  Regenerate / Change Topic
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-500 dark:text-dark-muted uppercase">
                          Marks: {q.marks}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(idx)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                        title="Delete Question"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        value={q.question_text}
                        onChange={(e) => handleUpdateQuestion(idx, 'question_text', e.target.value)}
                        className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl p-2.5 text-xs text-gray-900 dark:text-dark-text outline-none focus:border-indigo-600 font-medium"
                      />
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['A', 'B', 'C', 'D'].map((opt) => {
                        const optKey = `option_${opt.toLowerCase()}`;
                        const isCorrect = q.correct_option === opt;
                        return (
                          <div
                            key={opt}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition ${
                              isCorrect
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                                : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleUpdateQuestion(idx, 'correct_option', opt)}
                              className={`w-6 h-6 rounded-lg text-[11px] font-bold shrink-0 transition ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-100 dark:bg-dark-card-hover text-gray-700 dark:text-dark-text hover:bg-emerald-100'
                              }`}
                              title="Click to set as correct answer"
                            >
                              {opt}
                            </button>
                            <input
                              type="text"
                              value={q[optKey] || ''}
                              onChange={(e) => handleUpdateQuestion(idx, optKey, e.target.value)}
                              className="w-full bg-transparent outline-none text-xs text-gray-800 dark:text-dark-text"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-gray-500 dark:text-dark-muted bg-white dark:bg-dark-card p-2 rounded-xl border border-gray-100 dark:border-dark-border">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Explanation: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Controls */}
              {assessmentId && (
                <div className="p-3 bg-gray-50 dark:bg-dark-bg rounded-2xl border border-gray-200 dark:border-dark-border flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 dark:text-dark-text">Save Mode:</span>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={replaceExisting}
                        onChange={() => setReplaceExisting(true)}
                        className="text-indigo-600"
                      />
                      <span>Replace existing questions</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={!replaceExisting}
                        onChange={() => setReplaceExisting(false)}
                        className="text-indigo-600"
                      />
                      <span>Append to existing questions</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setGeneratedQuestions([])}
                  className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-card-hover transition"
                >
                  Back to Prompt
                </button>
                <button
                  type="button"
                  onClick={handleSaveToAssessment}
                  disabled={saving || generatedQuestions.length === 0}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-200 dark:shadow-none transition disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving to Assessment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Insert {generatedQuestions.length} Questions into Assessment
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
