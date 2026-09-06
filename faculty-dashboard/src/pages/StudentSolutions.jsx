import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import studentApi from '../api/studentClient';

export default function StudentSolutions() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    studentApi.get(`/results/review/${assessmentId}`)
      .then((res) => setQuestions(res.data))
      .catch(() => setError('Failed to load solutions'))
      .finally(() => setLoading(false));
  }, [assessmentId]);

  if (loading) {
    return (
      <div style={styles.wrap}>
        <div style={{ ...styles.header, opacity: 0.6 }}>
          <h2 style={styles.headerTitle}>Solutions</h2>
        </div>
        <div style={styles.list}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.card}>
              <div className="skeleton" style={{ height: '18px', width: '85%', marginBottom: '14px' }} />
              <div className="skeleton" style={{ height: '38px', width: '100%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '38px', width: '100%', marginBottom: '8px' }} />
              <div className="skeleton" style={{ height: '38px', width: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error) return <div style={styles.center}>{error}</div>;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>Solutions</h2>
        <button style={styles.backButton} onClick={() => navigate('/student/assessments')}>
          Back to Assessments
        </button>
      </div>

      <div style={styles.list}>
        {questions.map((q, index) => (
          <div key={q.id} className="stagger-item card-hover" style={{ ...styles.card, '--delay': `${index * 0.06}s` }}>
            <p style={styles.questionText}>
              {index + 1}. {q.question_text}
            </p>

            {['A', 'B', 'C', 'D'].map((opt) => {
              const optionText = q[`option_${opt.toLowerCase()}`];
              const isCorrectOption = q.correct_option === opt;
              const isSelectedOption = q.selected_option === opt;
              const isWrongSelection = isSelectedOption && !isCorrectOption;

              let style = styles.option;
              if (isCorrectOption) style = { ...styles.option, ...styles.correctOption };
              else if (isWrongSelection) style = { ...styles.option, ...styles.wrongOption };

              return (
                <div key={opt} style={style} className="transition-smooth">
                  <span>{opt}. {optionText}</span>
                  {isCorrectOption && <span style={styles.tag}>✓ Correct Answer</span>}
                  {isWrongSelection && <span style={styles.tagWrong}>✗ Your Answer</span>}
                </div>
              );
            })}

            {!q.selected_option && (
              <p style={styles.notAnswered}>You did not answer this question.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: '100vh', background: 'var(--page-bg)', fontFamily: 'system-ui, sans-serif' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', background: '#1F4E78' },
  headerTitle: { color: '#fff', margin: 0, fontSize: '1.3rem' },
  backButton: { background: '#fff', color: '#1F4E78', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '600', cursor: 'pointer' },
  list: { maxWidth: '600px', margin: '0 auto', padding: '20px' },
  card: { background: 'var(--card-bg)', borderRadius: '12px', padding: '18px', marginBottom: '16px', boxShadow: 'var(--card-shadow-sm)' },
  questionText: { fontWeight: '600', marginBottom: '12px', color: 'var(--text-body)' },
  option: { border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.92rem', color: 'var(--text-body)' },
  correctOption: { background: '#eafaf0', borderColor: '#2FA84F', color: '#1e6b37' },
  wrongOption: { background: '#fdeceb', borderColor: '#e74c3c', color: '#a83226' },
  tag: { fontSize: '0.75rem', fontWeight: '700', color: '#2FA84F' },
  tagWrong: { fontSize: '0.75rem', fontWeight: '700', color: '#e74c3c' },
  notAnswered: { fontSize: '0.85rem', color: 'var(--text-muted-3)', fontStyle: 'italic', margin: '4px 0 0' },
};
