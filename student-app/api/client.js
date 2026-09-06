import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Replace with your backend's deployed URL (e.g. Railway/Render URL)
// When testing locally on a real phone, use your computer's LAN IP, not "localhost"
// Temporarily using a localtunnel URL because the phone and this PC are on a
// Wi-Fi network with client isolation, so direct LAN IP access doesn't work.
const BASE_URL = 'https://twelve-ants-brake.loca.lt/api';

const api = axios.create({
  baseURL: BASE_URL,
  // loca.lt shows an HTML "click to continue" interstitial on the first
  // request unless this header is present, which would break JSON responses.
  headers: { 'Bypass-Tunnel-Reminder': 'true' },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('student_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
