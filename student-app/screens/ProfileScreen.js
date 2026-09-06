import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

export default function ProfileScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [streak, setStreak] = useState(0);
  const [name, setName] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('student_name').then(setName);
    api.get('/results/my-history').then((res) => setHistory(res.data)).catch(console.error);
    api.get('/results/streak').then((res) => setStreak(res.data.streak)).catch(console.error);
  }, []);

  const logout = async () => {
    await AsyncStorage.multiRemove(['student_token', 'student_name']);
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const avgPercent = history.length
    ? Math.round(
        history.reduce((sum, h) => sum + (h.score / h.total_marks) * 100, 0) / history.length
      )
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.avg}>Average Score: {avgPercent}%</Text>
        <Text style={styles.avg}>🔥 Streak: {streak}</Text>
      </View>

      <Text style={styles.sectionTitle}>Performance History</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>No assessments attempted yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.assessments?.title}</Text>
            <Text style={styles.cardScore}>{item.score} / {item.total_marks}</Text>
            <Text style={styles.cardMeta}>Rank #{item.rank} · {new Date(item.submitted_at).toLocaleDateString()}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  header: { backgroundColor: '#1F4E78', padding: 24 },
  name: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  avg: { color: '#cde', fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginLeft: 16, marginTop: 16, color: '#333' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1F4E78' },
  cardScore: { fontSize: 20, fontWeight: 'bold', marginTop: 6 },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  logoutButton: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: '#e74c3c', alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: '600' },
});
