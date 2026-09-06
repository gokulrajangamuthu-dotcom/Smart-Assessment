import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import studentApi from '../api/studentClient';
import AnimatedCounter from '../components/AnimatedCounter';
import ThemeToggle from '../components/ThemeToggle';

const ACCENTS = ['#1F4E78', '#2FA84F', '#F5A623', '#E85D75', '#7C6FE0'];
const ACCENT_BG = ['#eaf2f8', '#eafaf0', '#fdf3e0', '#fce9ec', '#efedfb'];

function subjectIcon(title = '') {
  const t = title.toLowerCase();
  if (t.includes('data struct') || t.includes('dsa')) return '🧮';
  if (t.includes('os') || t.includes('operating')) return '💻';
  if (t.includes('dbms') || t.includes('database') || t.includes('sql')) return '🗄️';
  if (t.includes('math')) return '📐';
  if (t.includes('network')) return '🌐';
  if (t.includes('algo')) return '🧠';
  if (t.includes('java') || t.includes('python') || t.includes('code')) return '👨‍💻';
  return '📝';
}

export default function StudentProfile() {
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const name = localStorage.getItem('student_name');

  useEffect(() => {
    studentApi.get('/results/my-history')
      .then((res) => setHistory(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    studentApi.get('/results/streak')
      .then((res) => setStreak(res.data.streak))
      .catch(console.error);
  }, []);

  const avgPercent = history.length
    ? Math.round(history.reduce((sum, h) => sum + (h.score / h.total_marks) * 100, 0) / history.length)
    : 0;

  const bestScore = history.length
    ? Math.max(...history.map((h) => Math.round((h.score / h.total_marks) * 100)))
    : 0;

  return (
    <div style={styles.page}>
      <div style={styles.header} className="animate-fade-in-up">
        <div>
          <p style={styles.eyebrow}>SmartAssess</p>
          <h2 style={styles.name}>{name}</h2>
        </div>
        <div className="flex items-center">
          <ThemeToggle onColor className="mr-2" />
          <button style={styles.backBtn} className="transition-smooth hover:-translate-y-0.5" onClick={() => navigate('/student/assessments')}>← Back</button>
        </div>
      </div>

      {/* Summary stat cards */}
      <div style={styles.statsRow} className="animate-fade-in-up">
        <div style={styles.statCard} className="card-hover">
          <div style={{ ...styles.statIcon, background: '#eaf2f8' }}>📊</div>
          <p style={styles.statValue}><AnimatedCounter value={avgPercent} />%</p>
          <p style={styles.statLabel}>Average Score</p>
        </div>
        <div style={styles.statCard} className="card-hover">
          <div style={{ ...styles.statIcon, background: '#fdf3e0' }}>🏆</div>
          <p style={styles.statValue}><AnimatedCounter value={bestScore} />%</p>
          <p style={styles.statLabel}>Best Score</p>
        </div>
        <div style={styles.statCard} className="card-hover">
          <div style={{ ...styles.statIcon, background: '#eafaf0' }}>📚</div>
          <p style={styles.statValue}><AnimatedCounter value={history.length} /></p>
          <p style={styles.statLabel}>Attempted</p>
        </div>
        <div style={styles.statCard} className="card-hover">
          <div style={{ ...styles.statIcon, background: '#fce9ec' }}>🔥</div>
          <p style={styles.statValue}><AnimatedCounter value={streak} /></p>
          <p style={styles.statLabel}>Streak</p>
        </div>
      </div>

      <div style={styles.list}>
        <h3 style={styles.sectionTitle}>📈 Performance History</h3>

        {loading && (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: '84px', width: '100%', borderRadius: '14px' }} />
            ))}
          </div>
        )}

        {!loading && history.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px' }} className="animate-fade-in">
            <p style={{ fontSize: '2.5rem', margin: 0 }}>🗒️</p>
            <p style={styles.empty}>No assessments attempted yet.</p>
          </div>
        )}

        {!loading && history.map((item, i) => {
          const percent = Math.round((item.score / item.total_marks) * 100);
          const accent = ACCENTS[i % ACCENTS.length];
          const accentBg = ACCENT_BG[i % ACCENT_BG.length];
          return (
            <div
              key={item.id}
              className="stagger-item card-hover"
              style={{ ...styles.card, borderLeft: `5px solid ${accent}`, '--delay': `${i * 0.06}s` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ ...styles.iconChip, background: accentBg }}>{subjectIcon(item.assessments?.title)}</span>
                <div style={{ flex: 1 }}>
                  <p style={styles.cardTitle}>{item.assessments?.title}</p>
                  <p style={styles.cardMeta}>
                    {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `Rank #${item.rank}`}
                    {' · '}{new Date(item.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ ...styles.cardScore, color: accent }}>{item.score}/{item.total_marks}</p>
                  <p style={styles.cardPercent}>{percent}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--page-bg)', fontFamily: 'system-ui, sans-serif' },
  header: { background: 'linear-gradient(90deg, #1F4E78 0%, #12314E 100%)', color: '#fff', padding: '28px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
  eyebrow: { margin: 0, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#a9c6e6', fontWeight: 600 },
  name: { margin: '2px 0 0', fontSize: '1.5rem' },
  backBtn: { background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' },
  statsRow: { display: 'flex', flexWrap: 'wrap', gap: '14px', maxWidth: '600px', margin: '-20px auto 0', padding: '0 20px', position: 'relative', zIndex: 1 },
  statCard: { flex: '1 1 calc(50% - 7px)', minWidth: '110px', background: 'var(--card-bg)', borderRadius: '14px', padding: '16px', textAlign: 'center', boxShadow: 'var(--card-shadow-md)' },
  statIcon: { width: '32px', height: '32px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: '1rem' },
  statValue: { margin: 0, fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--heading-color)' },
  statLabel: { margin: 0, fontSize: '0.7rem', color: 'var(--text-muted-2)', fontWeight: 600 },
  list: { maxWidth: '600px', margin: '0 auto', padding: '30px 20px' },
  sectionTitle: { color: 'var(--text-body)', marginTop: 0 },
  card: { background: 'var(--card-bg)', borderRadius: '14px', padding: '16px', marginBottom: '12px', boxShadow: 'var(--card-shadow-sm)' },
  iconChip: { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 },
  cardTitle: { margin: 0, color: 'var(--heading-color)', fontWeight: '700' },
  cardScore: { margin: '0', fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-body)' },
  cardPercent: { margin: 0, fontSize: '0.75rem', color: 'var(--text-muted-3)' },
  cardMeta: { margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-muted-2)' },
  empty: { textAlign: 'center', color: 'var(--text-muted-3)', margin: '8px 0 0' },
};
