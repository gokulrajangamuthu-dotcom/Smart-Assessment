import axios from 'axios';
import { normalizeError } from './normalizeError';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 60000,
});

// Attach faculty JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('faculty_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((res) => res, normalizeError);

export default api;
