import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
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
  const timerRef = useRef(null);
  const submittedRef = useRef(false);
  const violationCountRef = useRef(0);
  const wasHiddenRef = useRef(false);
  const MAX_VIOLATIONS = 3;

  useEffect(() => {
    studentApi.get(`/assessments/${assessmentId}`).then((res) => {
      const cameViaReattemptButton = location.state?.viaReattempt;
      const hasExistingAttempt = !!res.data.my_result;

      // A result already exists for this assessment, but this page wasn't
      // reached through the "Reattempt" button on the Result page — most
      // likely the browser Back button. Don't let that count as a reattempt;
      // lock in whatever score they already have and send them straight back
      // to the assessments list, no popup needed.
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
      // already_completed case: no popup, just quietly send them back
      navigate('/student/assessments', { replace: true });
    });
  }, [assessmentId]);

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

  // Tab-switch detection. If the student switches to another browser tab and
  // comes back, that's counted as one violation. After MAX_VIOLATIONS, the
  // test is auto-submitted — this discourages looking things up mid-test.
  useEffect(() => {
    if (!assessment) return;

    const handleVisibilityChange = () => {
      if (submittedRef.current) return;

      if (document.hidden) {
        wasHiddenRef.current = true;
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        violationCountRef.current += 1;
        setViolationCount(violationCountRef.current);

        if (violationCountRef.current >= MAX_VIOLATIONS) {
          handleSubmit(false, true);
        }
        // No popup here on purpose — the on-screen warning banner (below the
        // timer) already shows the updated count without interrupting the student.
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessment]);

  const selectOption = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleSubmit = async (isTimeUp = false, isViolation = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);

    // No alert() here on purpose — calling a blocking alert() from inside a
    // window blur/focus handler can freeze the tab-switch flow in some browsers.
    // Instead we pass the reason along and show a plain banner on the Result page.
    const autoSubmitReason = isTimeUp ? 'time_up' : isViolation ? 'violations' : null;

    setSubmitting(true);

    const answersArray = Object.entries(answers).map(([question_id, selected_option]) => ({
      question_id,
      selected_option,
    }));

    try {
      const res = await studentApi.post('/results/submit', { assessment_id: assessmentId, answers: answersArray });
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
      <div style={styles.page}>
        <div style={{ ...styles.timerBar, opacity: 0.6 }}>
          <span>⏱ --:--</span>
        </div>
        <div style={styles.body}>
          <div className="skeleton" style={{ height: '24px', width: '90%', marginBottom: '24px' }} />
          <div className="skeleton" style={{ height: '48px', width: '100%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '48px', width: '100%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '48px', width: '100%', marginBottom: '12px' }} />
          <div className="skeleton" style={{ height: '48px', width: '100%' }} />
        </div>
      </div>
    );
  }

  const question = assessment.questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isTimeCritical = timeLeft <= 60 && timeLeft > 0;

  return (
    <div style={styles.page}>
      {/* Sticky Top Bar */}
      <div
        style={styles.timerBar}
        className={`sticky top-0 z-20 shadow-sm ${isTimeCritical ? 'animate-timer-danger' : ''}`}
      >
        <span className="text-sm sm:text-base font-bold flex items-center gap-1.5">
          ⏱ {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <span className="text-xs sm:text-sm font-semibold bg-white/15 px-3 py-1 rounded-full">
          Q {currentIndex + 1} of {assessment.questions.length}
        </span>
      </div>

      {assessment.negative_marking && (
        <div style={styles.negativeBanner} className="animate-fade-in text-xs sm:text-sm">
          ⚠️ Negative marking enabled: -{assessment.negative_mark_value} mark per wrong answer.
        </div>
      )}

      {violationCount > 0 && (
        <div style={styles.violationBanner} className="animate-fade-in animate-soft-pulse text-xs sm:text-sm">
          🚫 Tab-switch warning {violationCount}/{MAX_VIOLATIONS} — one more and your test auto-submits.
        </div>
      )}

      <div style={styles.infoBanner} className="text-[11px] sm:text-xs">
        🔒 Tab switching is monitored. Switching away {MAX_VIOLATIONS} times will auto-submit.
      </div>

      {/* Horizontally scrollable Question Navigator */}
      <div className="w-full max-w-[640px] mx-auto px-4 py-3 overflow-x-auto no-scrollbar border-b border-gray-100 flex items-center gap-2">
        {assessment.questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`
                min-w-[34px] h-[34px] rounded-full text-xs font-bold transition-smooth flex items-center justify-center shrink-0
                ${isCurrent ? 'ring-2 ring-primary ring-offset-2 bg-primary text-white scale-105' : ''}
                ${!isCurrent && isAnswered ? 'bg-emerald-600 text-white' : ''}
                ${!isCurrent && !isAnswered ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : ''}
              `}
              title={`Question ${i + 1} ${isAnswered ? '(Answered)' : ''}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Main Question Body */}
      <div className="flex-1 w-full max-w-[640px] mx-auto px-4 py-5 sm:py-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 mb-6 animate-fade-in-up">
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Question {currentIndex + 1}</span>
            <span className="text-xs font-semibold text-gray-500">{question.marks || 1} Mark{(question.marks || 1) > 1 ? 's' : ''}</span>
          </div>
          <p className="text-base sm:text-lg font-semibold text-gray-900 leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {['A', 'B', 'C', 'D'].map((opt, i) => {
            const isSelected = answers[question.id] === opt;
            const optText = question[`option_${opt.toLowerCase()}`];
            if (!optText && optText !== 0) return null;

            return (
              <div
                key={`${question.id}-${opt}`}
                onClick={() => selectOption(question.id, opt)}
                className={`
                  w-full p-4 rounded-xl border text-sm sm:text-base font-medium transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99]
                  ${isSelected
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-white text-gray-800 border-gray-200 hover:border-primary/50 hover:bg-slate-50 shadow-sm'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5
                    ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}
                  `}>
                    {opt}
                  </span>
                  <span className="leading-snug">{optText}</span>
                </div>
                {isSelected && <span className="font-bold text-base shrink-0">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-gray-100 py-3 px-4 shadow-lg">
        <div className="max-w-[640px] mx-auto flex items-center justify-between gap-3">
          <button
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-sm font-semibold transition-smooth"
          >
            ← Previous
          </button>

          {currentIndex < assessment.questions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex((i) => i + 1)}
              className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-blue-900 text-white text-sm font-semibold transition-smooth shadow-md"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-smooth shadow-md disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Test ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#1e293b', fontFamily: 'system-ui, sans-serif' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  timerBar: { background: '#1F4E78', color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background-color 0.3s ease' },
  negativeBanner: { background: '#fdf3e0', color: '#8a5a00', padding: '6px 16px', fontWeight: '600', textAlign: 'center' },
  violationBanner: { background: '#fdeceb', color: '#a83226', padding: '6px 16px', fontWeight: '700', textAlign: 'center' },
  infoBanner: { background: '#eef2f7', color: '#5c6b7a', padding: '4px 16px', textAlign: 'center' },
};

