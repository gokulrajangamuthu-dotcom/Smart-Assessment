import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import api from '../api/client';

export default function TakeAssessmentScreen({ route, navigation }) {
  const { assessmentId } = route.params;
  const [assessment, setAssessment] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { question_id: 'A' }
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get(`/assessments/${assessmentId}`).then((res) => {
      setAssessment(res.data);
      setTimeLeft(res.data.duration_minutes * 60);
    }).catch((err) => Alert.alert('Error', 'Failed to load assessment'));
  }, [assessmentId]);

  useEffect(() => {
    if (!assessment) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [assessment]);

  const selectOption = (questionId, option) => {
    setAnswers({ ...answers, [questionId]: option });
  };

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    clearInterval(timerRef.current);
    setSubmitting(true);

    const answersArray = Object.entries(answers).map(([question_id, selected_option]) => ({
      question_id,
      selected_option,
    }));

    try {
      const res = await api.post('/results/submit', { assessment_id: assessmentId, answers: answersArray });
      navigation.replace('Result', { result: res.data.result, totalQuestions: assessment.questions.length });
    } catch (err) {
      Alert.alert('Submission Failed', err.response?.data?.error || 'Something went wrong');
      setSubmitting(false);
    }
  };

  if (!assessment) return <View style={styles.center}><Text>Loading...</Text></View>;

  const question = assessment.questions[currentIndex];
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <View style={styles.container}>
      <View style={styles.timerBar}>
        <Text style={styles.timerText}>⏱ {minutes}:{seconds.toString().padStart(2, '0')}</Text>
        <Text style={styles.progressText}>{currentIndex + 1} / {assessment.questions.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.questionText}>{question.question_text}</Text>

        {['A', 'B', 'C', 'D'].map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.option, answers[question.id] === opt && styles.optionSelected]}
            onPress={() => selectOption(question.id, opt)}
          >
            <Text style={[styles.optionText, answers[question.id] === opt && styles.optionTextSelected]}>
              {opt}. {question[`option_${opt.toLowerCase()}`]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.navBar}>
        <TouchableOpacity
          disabled={currentIndex === 0}
          onPress={() => setCurrentIndex((i) => i - 1)}
          style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
        >
          <Text style={styles.navButtonText}>Previous</Text>
        </TouchableOpacity>

        {currentIndex < assessment.questions.length - 1 ? (
          <TouchableOpacity style={styles.navButton} onPress={() => setCurrentIndex((i) => i + 1)}>
            <Text style={styles.navButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={() => handleSubmit(false)} disabled={submitting}>
            <Text style={styles.navButtonText}>{submitting ? 'Submitting...' : 'Submit'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#1F4E78' },
  timerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  progressText: { color: '#fff', fontSize: 14 },
  body: { padding: 20 },
  questionText: { fontSize: 18, fontWeight: '600', marginBottom: 24, color: '#222' },
  option: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 12 },
  optionSelected: { backgroundColor: '#1F4E78', borderColor: '#1F4E78' },
  optionText: { fontSize: 15, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderTopWidth: 1, borderColor: '#eee' },
  navButton: { backgroundColor: '#eee', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  navButtonDisabled: { opacity: 0.4 },
  submitButton: { backgroundColor: '#2FA84F', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  navButtonText: { fontWeight: '600', fontSize: 15, color: '#222' },
});
