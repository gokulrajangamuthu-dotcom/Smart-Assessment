import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import studentApi from '../api/studentClient';
import ThemeToggle from '../components/ThemeToggle';

// Formats milliseconds remaining into "1d 23:23:02" style countdown text
function formatCountdown(ms) {
  if (ms <= 0) return null;
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

// Subject-aware icon + accent color, so each assessment card has its own identity
const ACCENTS = ['#1F4E78', '#2FA84F', '#F5A623', '#E85D75', '#7C6FE0'];
const ACCENT_BG = ['#eaf2f8', '#eafaf0', '#fdf3e0', '#fce9ec', '#efedfb'];

function subjectIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('data struct') || t.includes('dsa')) return '🧮';
  if (t.includes('os') || t.includes('operating')) return '💻';
  if (t.includes('dbms') || t.includes('database') || t.includes('sql')) return '🗄️';
  if (t.includes('network')) return '🌐';
  if (t.includes('algo')) return '🧠';
  if (t.includes('java') || t.includes('python') || t.includes('code')) return '👨‍💻';
  return '📝';
}

export default function StudentAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const name = localStorage.getItem('student_name');

  useEffect(() => {
    studentApi.get('/assessments').then((res) => setAssessments(res.data)).catch(console.error);
  }, []);

  // Ticks every second so all countdowns on the page update live
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const logout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_name');
    navigate('/');
  };

  const handleClick = (a) => {
    const scheduledTime = new Date(a.scheduled_date).getTime();
    if (scheduledTime > now) return; // time-locked, do nothing

    if (a.my_result?.locked_final) {
      alert(`You've already completed this assessment. Your final score: ${a.my_result.score} / ${a.my_result.total_marks}`);
      return;
    }

    // If they already have an attempt on record (not yet finalized), this is
    // an explicit, intentional reattempt click — tag it so the take-assessment
    // page knows this wasn't a browser Back-button re-entry.
    const options = a.my_result ? { state: { viaReattempt: true } } : undefined;
    navigate(`/student/take/${a.id}`, options);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header} className="animate-fade-in-up">
        <div>
          <p style={styles.headerEyebrow}>SmartAssess</p>
          <h2 style={styles.headerTitle}>Hi, {name} 👋</h2>
          <p style={styles.headerSub}>Weekly Assessments</p>
        </div>
        <div className="flex items-center">
          <ThemeToggle onColor className="mr-2" />
          <button style={styles.linkBtn} className="transition-smooth hover:-translate-y-0.5" onClick={() => navigate('/student/profile')}>My Profile</button>
          <button style={styles.linkBtn} className="transition-smooth hover:-translate-y-0.5" onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={styles.list}>
        {assessments.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px' }} className="animate-fade-in">
            <p style={{ fontSize: '2.5rem', margin: 0 }}>🗒️</p>
            <p style={styles.empty}>No assessments available right now.</p>
          </div>
        )}
        {assessments.map((a, index) => {
          const scheduledTime = new Date(a.scheduled_date).getTime();
          const remaining = scheduledTime - now;
          const isTimeLocked = remaining > 0;
          const isCompleted = !!a.my_result?.locked_final;
          const isAttemptedNotFinal = !!a.my_result && !a.my_result.locked_final;
          const isCardDisabled = isTimeLocked || isCompleted;
          const countdownText = formatCountdown(remaining);
          const accent = ACCENTS[index % ACCENTS.length];
          const accentBg = ACCENT_BG[index % ACCENT_BG.length];

          return (
            <div
              key={a.id}
              style={{
                ...styles.card,
                borderLeft: `5px solid ${accent}`,
                ...(isCardDisabled ? styles.cardLocked : {}),
                '--delay': `${index * 0.07}s`,
              }}
              className={`stagger-item ${isCardDisabled ? '' : 'card-hover'}`}
              onClick={() => handleClick(a)}
            >
              <div style={styles.cardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ ...styles.iconChip, background: isCardDisabled ? '#f0f0f0' : accentBg }}>
                    {subjectIcon(a.title)}
                  </span>
                  <h3 style={styles.cardTitle}>{a.title}</h3>
                </div>
                {isTimeLocked && <span style={styles.lockBadge} className="animate-soft-pulse">🔒 Locked</span>}
                {!isTimeLocked && isCompleted && <span style={styles.completedBadge}>✅ Completed</span>}
                {!isTimeLocked && isAttemptedNotFinal && <span style={styles.reattemptBadge}>🔄 Reattempt Available</span>}
              </div>
              <p style={styles.cardMeta}>
                {new Date(a.scheduled_date).toLocaleString()} · {a.duration_minutes} mins · {a.total_marks} marks
              </p>
              {isTimeLocked && countdownText && (
                <p style={styles.countdown}>Opens in {countdownText}</p>
              )}
              {!isTimeLocked && isCompleted && (
                <p style={styles.completedScore}>Final score: {a.my_result.score} / {a.my_result.total_marks}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--page-bg)', fontFamily: 'system-ui, sans-serif' },
  header: { background: 'linear-gradient(90deg, #1F4E78 0%, #12314E 100%)', color: '#fff', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
  headerEyebrow: { margin: 0, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#a9c6e6', fontWeight: 600 },
  headerTitle: { margin: '2px 0 0', fontSize: '1.5rem' },
  headerSub: { margin: 0, opacity: 0.8, fontSize: '0.9rem' },
  linkBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 14px', borderRadius: '8px', marginLeft: '8px', cursor: 'pointer' },
  list: { padding: '24px 20px', maxWidth: '700px', margin: '0 auto' },
  card: { background: 'var(--card-bg)', borderRadius: '14px', padding: '18px', marginBottom: '14px', boxShadow: 'var(--card-shadow-sm)', cursor: 'pointer' },
  cardLocked: { cursor: 'not-allowed', opacity: 0.75, background: 'var(--border-softer)' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  iconChip: { width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
  cardTitle: { margin: 0, color: 'var(--heading-color)', fontWeight: 700 },
  lockBadge: { fontSize: '0.75rem', background: '#f1c40f22', color: '#a8710a', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 },
  completedBadge: { fontSize: '0.75rem', background: '#2FA84F22', color: '#1e6b37', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 },
  reattemptBadge: { fontSize: '0.75rem', background: '#e67e2222', color: '#a85a10', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 },
  completedScore: { margin: '8px 0 0', fontSize: '0.85rem', color: '#1e6b37', fontWeight: 700 },
  cardMeta: { margin: '10px 0 0', fontSize: '0.85rem', color: 'var(--text-muted-2)' },
  countdown: { margin: '8px 0 0', fontSize: '0.9rem', color: '#c0392b', fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
  empty: { textAlign: 'center', color: 'var(--text-muted-3)', margin: '8px 0 0' },
};
