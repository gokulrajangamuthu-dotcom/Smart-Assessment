import axios from 'axios';
import { normalizeError } from './normalizeError';

const studentApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

// Uses a SEPARATE token key from faculty, so both can technically be
// logged in on the same browser without conflicting.
studentApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('student_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

studentApi.interceptors.response.use((res) => res, normalizeError);

export default studentApi;
