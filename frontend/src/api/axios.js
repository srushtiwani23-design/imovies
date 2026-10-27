import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 60000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('imovies_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const errMsg = (e) => {
  if (e?.response?.data?.message) return e.response.data.message;
  if (e?.code === 'ECONNABORTED') return 'The server took too long to respond. Try again in a moment.';
  if (e?.message === 'Network Error') return 'Cannot reach the server. Check that the backend is running.';
  return e?.message || 'Something went wrong';
};

export const assetUrl = (path) => {
  if (!path) return '';
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`;
};

export default api;
