import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Live Render backend API URL
const BASE_URL = 'https://smart-assessment-fc8k.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('student_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
