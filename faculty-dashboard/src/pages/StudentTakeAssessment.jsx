import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, Maximize, AlertTriangle, Lock, CheckCircle2 } from 'lucide-react';
import studentApi from '../api/studentClient';

export default function StudentTakeAssessment() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [assessment, setAssessment] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [violationModal, setViolationModal] = useState({ show: false, reason: '' });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const violationCountRef = useRef(0);
  const wasHiddenRef = useRef(false);
  const MAX_VIOLATIONS = 3;

  // Request fullscreen
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {});
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  useEffect(() => {
    studentApi.get(`/assessments/${assessmentId}`).then((res) => {
      const cameViaReattemptButton = location.state?.viaReattempt;
      const hasExistingAttempt = !!res.data.my_result;

      if (hasExistingAttempt && !cameViaReattemptButton) {
        studentApi.post(`/results/finalize/${assessmentId}`).catch(() => {});
        navigate('/student/assessments', { replace: true });
        return;
      }

      setAssessment(res.data);
      setTimeLeft(res.data.duration_minutes * 60);
    }).catch((err) => {
      if (err.response?.data?.not_available_yet) {
        const opensAt = new Date(err.response.data.scheduled_date).toLocaleString();
        alert(`This assessment isn't open yet. It becomes available on ${opensAt}.`);
      } else if (!err.response?.data?.already_completed) {
        alert('Failed to load assessment');
      }
      navigate('/student/assessments', { replace: true });
    });
  }, [assessmentId]);

  // Main countdown timer
  useEffect(() => {
    if (!assessment) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment]);

  // Integrity Tracker: Fullscreen, Tab-switch, Window blur, Shortcuts & Copy-Paste prevention
  useEffect(() => {
    if (!assessment) return;

    const triggerViolation = (reason) => {
      if (submittedRef.current) return;
      violationCountRef.current += 1;
      const count = violationCountRef.current;
      setViolationCount(count);

      if (count >= MAX_VIOLATIONS) {
        handleSubmit(false, true);
      } else {
        setViolationModal({
          show: true,
          reason: reason || 'Focus lost from assessment window.',
        });
      }
    };

    const handleVisibilityChange = () => {
      if (submittedRef.current) return;
      if (document.hidden) {
        wasHiddenRef.current = true;
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        triggerViolation('Tab switch or window minimized detected');
      }
    };

    const handleWindowBlur = () => {
      if (submittedRef.current) return;
      // Slight debounce to avoid firing simultaneously with visibilitychange
      setTimeout(() => {
        if (!document.hasFocus() && !submittedRef.current) {
          triggerViolation('Window blur / secondary screen focus detected');
        }
      }, 300);
    };

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen && !submittedRef.current && violationCountRef.current < MAX_VIOLATIONS) {
        triggerViolation('Exited fullscreen mode');
      }
    };

    const handleKeyDown = (e) => {
      // Prevent common shortcuts: Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, F12, PrintScreen
      if (
        (e.ctrlKey && ['c', 'v', 'x', 'u', 'a', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => e.preventDefault();
    const handleCopyCutPaste = (e) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment]);

  const selectOption = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleSubmit = async (isTimeUp = false, isViolation = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);

    const autoSubmitReason = isTimeUp ? 'time_up' : isViolation ? 'violations' : null;
    setSubmitting(true);

    const answersArray = Object.entries(answers).map(([question_id, selected_option]) => ({
      question_id,
      selected_option,
    }));

    try {
      const res = await studentApi.post('/results/submit', {
        assessment_id: assessmentId,
        answers: answersArray,
        violations: violationCountRef.current,
      });

      // Exit fullscreen safely if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      navigate('/student/result', {
        state: {
          result: res.data.result,
          totalQuestions: assessment.questions.length,
          reattempt: res.data.reattempt,
          autoSubmitReason,
        },
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
      submittedRef.current = false;
      setSubmitting(false);
    }
  };

  if (!assessment) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto animate-pulse">
            <Lock size={24} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Preparing Secure Assessment...</h2>
          <div className="skeleton h-4 w-3/4 mx-auto rounded-full" />
          <div className="skeleton h-4 w-1/2 mx-auto rounded-full" />
        </div>
      </div>
    );
  }

  const question = assessment.questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isTimeCritical = timeLeft <= 60 && timeLeft > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Sticky Security & Timer Header */}
      <div className="sticky top-0 z-30 bg-slate-900 text-white px-4 sm:px-8 py-3 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Proctored Session
          </div>
          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold transition"
            >
              <Maximize size={12} />
              Enable Fullscreen
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className={`px-4 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold flex items-center gap-1.5 ${
            isTimeCritical ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-100'
          }`}>
            ⏱ {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-xl">
            Q {currentIndex + 1} / {assessment.questions.length}
          </span>
        </div>
      </div>

      {/* Warning Banners */}
      {assessment.negative_marking && (
        <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-4 py-2 text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2">
          <AlertTriangle size={15} className="text-amber-600" />
          Negative marking active: -{assessment.negative_mark_value} mark per wrong answer.
        </div>
      )}

      {violationCount > 0 && (
        <div className="bg-rose-600 text-white px-4 py-2 text-center text-xs sm:text-sm font-bold animate-pulse flex items-center justify-center gap-2 shadow-inner">
          <ShieldAlert size={16} />
          Security Warning: Violation {violationCount}/{MAX_VIOLATIONS} logged! Reaching {MAX_VIOLATIONS} will immediately submit your test.
        </div>
      )}

      {/* Question Number Pills Navigator */}
      <div className="w-full max-w-3xl mx-auto px-4 py-4 overflow-x-auto no-scrollbar flex items-center gap-2 border-b border-slate-200/70">
        {assessment.questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`min-w-[36px] h-[36px] rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
                isCurrent
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                  : isAnswered
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Card */}
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
              Question {currentIndex + 1}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
              {question.marks || 1} Mark{(question.marks || 1) > 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((opt) => {
            const isSelected = answers[question.id] === opt;
            const optText = question[`option_${opt.toLowerCase()}`];
            if (!optText && optText !== 0) return null;

            return (
              <div
                key={`${question.id}-${opt}`}
                onClick={() => selectOption(question.id, opt)}
                className={`p-4 sm:p-5 rounded-2xl border text-sm sm:text-base font-medium transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                    : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/20 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {opt}
                  </span>
                  <span className="leading-snug">{optText}</span>
                </div>
                {isSelected && <CheckCircle2 size={20} className="shrink-0 text-white" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 py-4 px-4 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-sm font-semibold transition"
          >
            ← Previous
          </button>

          {currentIndex < assessment.questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-200"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-md shadow-emerald-200 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Finish & Submit Test ✓'}
            </button>
          )}
        </div>
      </div>

      {/* Security Violation Modal */}
      {violationModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-rose-100">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Security Warning #{violationCount}</h3>
              <p className="text-xs text-rose-600 font-semibold mt-1 uppercase tracking-wide">
                {violationModal.reason}
              </p>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Leaving the assessment screen, switching tabs, or exiting fullscreen is recorded. Reaching <b>{MAX_VIOLATIONS} violations</b> will instantly auto-submit your assessment.
            </p>
            <button
              onClick={() => {
                setViolationModal({ show: false, reason: '' });
                enterFullscreen();
              }}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 transition"
            >
              I Understand, Resume Test
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

