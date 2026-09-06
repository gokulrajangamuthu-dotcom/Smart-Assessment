import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import api from '../api/client';

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({ name: '', register_no: '', email: '', password: '', batch: '', department_id: '' });
  const [loading, setLoading] = useState(false);

  const update = (key, value) => setForm({ ...form, [key]: value });

  const handleRegister = async () => {
    if (!form.name || !form.register_no || !form.password) {
      Alert.alert('Missing fields', 'Name, Register Number and Password are required');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/student/register', form);
      Alert.alert('Success', 'Registration complete! Please login.');
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Registration Failed', err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Student Account</Text>

      <TextInput style={styles.input} placeholder="Full Name" onChangeText={(v) => update('name', v)} />
      <TextInput style={styles.input} placeholder="Register Number" autoCapitalize="characters" onChangeText={(v) => update('register_no', v)} />
      <TextInput style={styles.input} placeholder="Email (optional)" keyboardType="email-address" onChangeText={(v) => update('email', v)} />
      <TextInput style={styles.input} placeholder="Batch (e.g. 2024-2027)" onChangeText={(v) => update('batch', v)} />
      <TextInput style={styles.input} placeholder="Department ID (given by faculty)" onChangeText={(v) => update('department_id', v)} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry onChangeText={(v) => update('password', v)} />

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Registering...' : 'Register'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1F4E78', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 16 },
  button: { backgroundColor: '#1F4E78', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
