import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, FileText } from 'lucide-react';
import studentApi from '../api/studentClient';
import AnimatedCounter from '../components/AnimatedCounter';
import { exportStudentScorecardPdf } from '../utils/exportPdf';

const CONFETTI_COLORS = ['#2FA84F', '#1F4E78', '#F5A623', '#E85D75', '#7C6FE0'];

function Confetti() {
  const pieces = Array.from({ length: 28 });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: '16px' }}>
      {pieces.map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${Math.random() * 0.6}s`,
            animationDuration: `${1.8 + Math.random() * 1}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function StudentResult() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [finalizing, setFinalizing] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!state) {
    navigate('/student/assessments');
    return null;
  }

  const { result, totalQuestions, reattempt, autoSubmitReason } = state;
  const percentage = Math.round((result.score / result.total_marks) * 100);
  const isGoodScore = percentage >= 60;

  // A reattempt choice is offered only if: reattempt is enabled for this assessment,
  // the result isn't already locked, and there's at least one attempt remaining.
  const canChooseReattempt =
    reattempt?.enabled && !result.locked_final && (reattempt?.attempts_remaining || 0) > 0;

  const handleDownloadScorecard = async () => {
    setDownloadingPdf(true);
    try {
      // Grab full student profile / assessment details if available
      const profileRes = await studentApi.get('/students/me').catch(() => null);
      const studentData = profileRes?.data || {};

      const fullResult = {
        ...result,
        students: studentData,
      };
      exportStudentScorecardPdf(fullResult, { total_marks: result.total_marks });
    } catch (err) {
      console.error(err);
      exportStudentScorecardPdf(result, { total_marks: result.total_marks });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleViewSolutions = async () => {
    if (canChooseReattempt) {
      // Viewing solutions while a reattempt choice is still open finalizes this score
      setFinalizing(true);
      try {
        await studentApi.post(`/results/finalize/${result.assessment_id}`);
      } catch (err) {
        console.error(err);
      } finally {
        setFinalizing(false);
      }
    }
    navigate(`/student/solutions/${result.assessment_id}`);
  };

  const handleReattempt = () => {
    navigate(`/student/take/${result.assessment_id}`, { state: { viaReattempt: true } });
  };

  return (
    <div style={styles.wrap}>
      <div style={{ ...styles.card, position: 'relative', overflow: 'hidden' }} className="animate-bounce-in">
        {isGoodScore && <Confetti />}

        <p style={styles.emoji} className={isGoodScore ? 'animate-bounce-in' : 'animate-wiggle'}>
          {isGoodScore ? '🎉' : '💪'}
        </p>
        <h2 style={styles.title} className="animate-fade-in">Assessment Submitted!</h2>

        {autoSubmitReason === 'time_up' && (
          <p style={styles.autoNote} className="animate-fade-in">⏱ Auto-submitted — time ran out.</p>
        )}
        {autoSubmitReason === 'violations' && (
          <p style={styles.autoNote} className="animate-fade-in">🚫 Auto-submitted — security violations logged.</p>
        )}

        <div style={styles.scoreCard} className="animate-scale-in">
          <p style={styles.scoreText}><AnimatedCounter value={result.score} /> / {result.total_marks}</p>
          <p style={styles.percentText}><AnimatedCounter value={percentage} duration={1100} />%</p>
        </div>

        <div style={styles.statsRow}>
          <div className="stagger-item" style={{ ...styles.statBox, '--delay': '0.1s' }}>
            <p style={styles.statValue}><AnimatedCounter value={result.correct_count} duration={700} /></p>
            <p style={styles.statLabel}>Correct</p>
          </div>
          <div className="stagger-item" style={{ ...styles.statBox, '--delay': '0.2s' }}>
            <p style={styles.statValue}><AnimatedCounter value={result.wrong_count} duration={700} /></p>
            <p style={styles.statLabel}>Wrong</p>
          </div>
          <div className="stagger-item" style={{ ...styles.statBox, '--delay': '0.3s' }}>
            <p style={styles.statValue}><AnimatedCounter value={Math.max(0, totalQuestions - result.correct_count - result.wrong_count)} duration={700} /></p>
            <p style={styles.statLabel}>Unattempted</p>
          </div>
          <div className="stagger-item" style={{ ...styles.statBox, '--delay': '0.4s' }}>
            <p style={styles.statValue}>{totalQuestions}</p>
            <p style={styles.statLabel}>Total</p>
          </div>
        </div>

        {canChooseReattempt && (
          <p style={styles.choiceNote} className="animate-fade-in">
            You have {reattempt.attempts_remaining} reattempt{reattempt.attempts_remaining === 1 ? '' : 's'} left.
            Choose one: viewing solutions makes this score <b>final</b>, or reattempt for a new score.
          </p>
        )}

        <button
          onClick={handleDownloadScorecard}
          disabled={downloadingPdf}
          className="w-full py-3 mb-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-smooth"
        >
          <FileText size={15} />
          {downloadingPdf ? 'Generating PDF Scorecard...' : 'Download Scorecard PDF'}
        </button>

        <button
          style={{ ...styles.button, background: '#1F4E78', marginBottom: '10px' }}
          className="transition-smooth hover:shadow-lg hover:-translate-y-0.5 text-xs"
          onClick={handleViewSolutions}
          disabled={finalizing}
        >
          {finalizing ? 'Finalizing...' : 'View Solutions'}
        </button>

        {canChooseReattempt && (
          <button
            style={{ ...styles.button, background: '#e67e22', marginBottom: '10px' }}
            className="transition-smooth hover:shadow-lg hover:-translate-y-0.5 text-xs"
            onClick={handleReattempt}
          >
            Reattempt ({reattempt.attempts_remaining} left)
          </button>
        )}

        <button style={styles.button} className="transition-smooth hover:shadow-lg hover:-translate-y-0.5 text-xs" onClick={() => navigate('/student/assessments')}>
          Back to Assessments
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--page-bg)', fontFamily: 'system-ui, sans-serif' },
  card: { background: 'var(--card-bg)', color: 'var(--text-body)', padding: '32px', borderRadius: '16px', boxShadow: 'var(--card-shadow-md)', width: '100%', maxWidth: '360px', textAlign: 'center' },
  emoji: { fontSize: '2.5rem', margin: 0 },
  title: { color: 'var(--heading-color)', marginBottom: '24px' },
  autoNote: { fontSize: '0.8rem', color: '#a83226', background: '#fdeceb', padding: '8px', borderRadius: '8px', marginTop: '-14px', marginBottom: '20px' },
  scoreCard: { background: '#1F4E78', borderRadius: '14px', padding: '20px', marginBottom: '20px' },
  scoreText: { color: '#fff', fontSize: '1.8rem', fontWeight: 'bold', margin: 0 },
  percentText: { color: '#cde', margin: '4px 0 0' },
  statsRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '24px' },
  statBox: { flex: 1 },
  statValue: { fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-body)' },
  statLabel: { fontSize: '0.7rem', color: 'var(--text-muted-2)', margin: 0 },
  choiceNote: { fontSize: '0.8rem', color: '#a8710a', background: '#fdf3e0', padding: '10px', borderRadius: '8px', marginBottom: '16px', lineHeight: 1.4 },
  button: { width: '100%', padding: '14px', background: '#2FA84F', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' },
};
