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
      <div
        style={styles.timerBar}
        className={isTimeCritical ? 'animate-timer-danger' : ''}
      >
        <span>⏱ {minutes}:{seconds.toString().padStart(2, '0')}</span>
        <span>{currentIndex + 1} / {assessment.questions.length}</span>
      </div>

      {assessment.negative_marking && (
        <div style={styles.negativeBanner} className="animate-fade-in">
          ⚠️ Negative marking is enabled: -{assessment.negative_mark_value} mark for each wrong answer.
        </div>
      )}

      {violationCount > 0 && (
        <div style={styles.violationBanner} className="animate-fade-in animate-soft-pulse">
          🚫 Tab-switch warning {violationCount}/{MAX_VIOLATIONS} — one more and your test auto-submits.
        </div>
      )}

      <div style={styles.infoBanner}>
        🔒 This test monitors tab switching. Switching away {MAX_VIOLATIONS} times will auto-submit your test.
      </div>

      <div style={styles.navigator}>
        {assessment.questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined;
          const isCurrent = i === currentIndex;
          let circleStyle = styles.navCircle;
          if (isAnswered) circleStyle = { ...circleStyle, ...styles.navCircleAnswered };
          if (isCurrent) circleStyle = { ...circleStyle, ...styles.navCircleCurrent };
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              style={circleStyle}
              className="transition-smooth"
              title={isAnswered ? 'Answered' : 'Not answered'}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <div style={styles.body}>
        <p style={styles.questionText} key={question.id} className="animate-fade-in-up">{question.question_text}</p>

        {['A', 'B', 'C', 'D'].map((opt, i) => {
          const isSelected = answers[question.id] === opt;
          return (
            <div
              key={`${question.id}-${opt}`}
              onClick={() => selectOption(question.id, opt)}
              className="option-select stagger-item"
              style={{
                ...styles.option,
                ...(isSelected ? styles.optionSelected : {}),
                '--delay': `${i * 0.05}s`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{opt}. {question[`option_${opt.toLowerCase()}`]}</span>
              {isSelected && <span className="animate-pop-in" style={{ fontSize: '1.1rem' }}>✓</span>}
            </div>
          );
        })}
      </div>

      <div style={styles.navBar}>
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          style={{ ...styles.navButton, opacity: currentIndex === 0 ? 0.4 : 1 }}
        >
          Previous
        </button>

        {currentIndex < assessment.questions.length - 1 ? (
          <button style={styles.navButton} onClick={() => setCurrentIndex((i) => i + 1)}>
            Next
          </button>
        ) : (
          <button style={styles.submitButton} onClick={() => handleSubmit(false)} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', color: 'var(--text-body)', fontFamily: 'system-ui, sans-serif' },
  center: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
  timerBar: { background: '#1F4E78', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', transition: 'background-color 0.3s ease' },
  timerBarCritical: { background: '#c0392b' },
  negativeBanner: { background: '#fdf3e0', color: '#8a5a00', padding: '8px 24px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center' },
  violationBanner: { background: '#fdeceb', color: '#a83226', padding: '8px 24px', fontSize: '0.85rem', fontWeight: '700', textAlign: 'center' },
  infoBanner: { background: '#eef2f7', color: '#5c6b7a', padding: '6px 24px', fontSize: '0.75rem', textAlign: 'center' },
  navigator: { display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '14px 24px', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box', borderBottom: '1px solid var(--border-softer)' },
  navCircle: { width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border-soft)', background: 'var(--card-bg)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 },
  navCircleAnswered: { background: '#2FA84F', borderColor: '#2FA84F', color: '#fff' },
  navCircleCurrent: { borderColor: '#1F4E78', boxShadow: '0 0 0 3px rgba(31,78,120,0.25)' },
  body: { flex: 1, padding: '24px', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  questionText: { fontSize: '1.2rem', fontWeight: '600', marginBottom: '24px' },
  option: { border: '1px solid var(--border-soft)', borderRadius: '10px', padding: '14px', marginBottom: '12px', cursor: 'pointer' },
  optionSelected: { background: '#1F4E78', color: '#fff', borderColor: '#1F4E78' },
  navBar: { display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid var(--border-softer)', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  navButton: { background: 'var(--border-softer)', color: 'var(--text-body)', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer' },
  submitButton: { background: '#2FA84F', color: '#fff', padding: '12px 24px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer' },
};
