import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function FacultyStudentReview() {
  const { assessmentId, studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/results/faculty-review/${assessmentId}/${studentId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load student review'))
      .finally(() => setLoading(false));
  }, [assessmentId, studentId]);

  if (loading) return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-4 animate-pulse">
      <div className="h-16 bg-gray-200 rounded-2xl mb-6"></div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl shadow-md p-5 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
          <div className="h-9 bg-gray-100 rounded"></div>
          <div className="h-9 bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  );
  if (error) return <div className="text-center py-10 text-danger">{error}</div>;

  const { student, result, questions } = data;

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-gradient-to-r from-primary to-primaryDark px-8 py-8 mb-8 shadow-lg">
        <div className="max-w-3xl mx-auto flex justify-between items-center animate-fade-in-up">
          <div>
            <p className="text-blue-200 text-sm font-medium tracking-wide uppercase mb-1">Student Review</p>
            <h1 className="text-2xl font-bold text-white">{student.name} <span className="text-blue-200 font-normal">· {student.register_no}</span></h1>
            {result && (
              <p className="text-blue-100 text-sm mt-1">
                Score: <b>{result.score} / {result.total_marks}</b> · Rank #{result.rank} · {result.correct_count} correct, {result.wrong_count} wrong
              </p>
            )}
          </div>
          <button
            onClick={() => navigate('/faculty/dashboard')}
            className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-smooth"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-10 space-y-4">
        {questions.map((q, index) => (
          <div key={q.id} className="stagger-item card-hover bg-white rounded-2xl shadow-md p-5" style={{ '--delay': `${index * 0.05}s` }}>
            <p className="font-semibold text-gray-800 mb-3">{index + 1}. {q.question_text}</p>

            {['A', 'B', 'C', 'D'].map((opt) => {
              const optionText = q[`option_${opt.toLowerCase()}`];
              const isCorrectOption = q.correct_option === opt;
              const isSelectedOption = q.selected_option === opt;
              const isWrongSelection = isSelectedOption && !isCorrectOption;

              let cls = 'border border-gray-200';
              if (isCorrectOption) cls = 'border border-accent bg-green-50 text-green-800';
              else if (isWrongSelection) cls = 'border border-coral bg-rose-50 text-rose-800';

              return (
                <div key={opt} className={`flex justify-between items-center px-3 py-2 rounded-lg mb-2 text-sm ${cls} transition-smooth`}>
                  <span>{opt}. {optionText}</span>
                  {isCorrectOption && <span className="text-xs font-bold text-accent">✓ Correct Answer</span>}
                  {isWrongSelection && <span className="text-xs font-bold text-coral">✗ Student's Answer</span>}
                </div>
              );
            })}

            {!q.selected_option && (
              <p className="text-xs text-gray-400 italic mt-1">Student did not answer this question.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
