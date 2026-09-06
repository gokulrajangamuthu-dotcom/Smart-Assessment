import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const CARD_ACCENTS = {
  student: { bg: '#eaf2f8', ring: '#1F4E78' },
  faculty: { bg: '#eafaf0', ring: '#2FA84F' },
  admin: { bg: '#fdf3e0', ring: '#F5A623' },
};

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <ThemeToggle />
      </div>
      <div style={styles.badge} className="animate-fade-in">📝 Weekly Aptitude Assessment Platform</div>
      <h1 style={{ ...styles.title }} className="animate-fade-in-up">SmartAssess</h1>
      <p style={styles.subtitle} className="animate-fade-in-up">Sharpen your skills for placements & GATE, one week at a time</p>

      <div style={styles.cardRow}>
        <button
          style={{ ...styles.card, '--delay': '0.1s' }}
          className="card-hover stagger-item"
          onClick={() => navigate('/student/login')}
        >
          <span style={{ ...styles.emojiWrap, background: CARD_ACCENTS.student.bg }} className="animate-bounce-in">🎓</span>
          <span style={styles.cardTitle}>Student</span>
          <span style={styles.cardDesc}>Take assessments, view results & ranking</span>
          <span style={{ ...styles.cardArrow, color: CARD_ACCENTS.student.ring }}>Continue →</span>
        </button>

        <button
          style={{ ...styles.card, '--delay': '0.22s' }}
          className="card-hover stagger-item"
          onClick={() => navigate('/faculty/login')}
        >
          <span style={{ ...styles.emojiWrap, background: CARD_ACCENTS.faculty.bg }} className="animate-bounce-in">🧑‍🏫</span>
          <span style={styles.cardTitle}>Faculty</span>
          <span style={styles.cardDesc}>Create assessments, upload questions, view analytics</span>
          <span style={{ ...styles.cardArrow, color: CARD_ACCENTS.faculty.ring }}>Continue →</span>
        </button>

        <button
          style={{ ...styles.card, '--delay': '0.34s' }}
          className="card-hover stagger-item"
          onClick={() => navigate('/admin/login')}
        >
          <span style={{ ...styles.emojiWrap, background: CARD_ACCENTS.admin.bg }} className="animate-bounce-in">🛡️</span>
          <span style={styles.cardTitle}>Admin</span>
          <span style={styles.cardDesc}>Manage faculty accounts across all departments</span>
          <span style={{ ...styles.cardArrow, color: CARD_ACCENTS.admin.ring }}>Continue →</span>
        </button>
      </div>

      <p style={styles.footer} className="animate-fade-in">Built for smarter weekly practice 🚀</p>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--page-bg)',
    fontFamily: 'system-ui, sans-serif',
    padding: '24px',
  },
  badge: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-soft)',
    borderRadius: '999px',
    padding: '6px 16px',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    marginBottom: '16px',
    boxShadow: 'var(--card-shadow-sm)',
  },
  title: { fontSize: '2.75rem', fontWeight: 'bold', color: 'var(--heading-color)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-muted)', marginTop: '10px', marginBottom: '44px', fontSize: '1.02rem' },
  cardRow: { display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    width: '230px',
    padding: '32px 22px',
    background: 'var(--card-bg)',
    border: '1px solid var(--border-soft)',
    borderRadius: '18px',
    boxShadow: 'var(--card-shadow-md)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    transition: 'transform 0.15s',
  },
  emojiWrap: {
    fontSize: '2.1rem',
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  cardTitle: { fontSize: '1.2rem', fontWeight: '700', color: 'var(--heading-color)' },
  cardDesc: { fontSize: '0.85rem', color: 'var(--text-muted-2)', textAlign: 'center', lineHeight: 1.4 },
  cardArrow: { fontSize: '0.8rem', fontWeight: '700', marginTop: '6px' },
  footer: { marginTop: '48px', fontSize: '0.8rem', color: 'var(--text-muted-3)' },
};
