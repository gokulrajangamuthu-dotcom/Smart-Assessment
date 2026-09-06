import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ResultScreen({ route, navigation }) {
  const { result, totalQuestions } = route.params;
  const percentage = Math.round((result.score / result.total_marks) * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{percentage >= 60 ? '🎉' : '💪'}</Text>
      <Text style={styles.title}>Assessment Submitted!</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreText}>{result.score} / {result.total_marks}</Text>
        <Text style={styles.percentText}>{percentage}%</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{result.correct_count}</Text>
          <Text style={styles.statLabel}>Correct</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{result.wrong_count}</Text>
          <Text style={styles.statLabel}>Wrong</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalQuestions}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'AssessmentList' }] })}
      >
        <Text style={styles.buttonText}>Back to Assessments</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1F4E78', marginBottom: 24 },
  scoreCard: { backgroundColor: '#1F4E78', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%', marginBottom: 24 },
  scoreText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  percentText: { fontSize: 16, color: '#cde', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 32 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#222' },
  statLabel: { fontSize: 13, color: '#888' },
  button: { backgroundColor: '#2FA84F', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
