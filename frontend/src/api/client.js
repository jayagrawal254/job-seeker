import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Append custom DB URL from localStorage to every request if set.
api.interceptors.request.use(config => {
  try {
    const dbUrl = localStorage.getItem('customDbUrl');
    if (dbUrl) {
      if (!config.params) config.params = {};
      config.params.dbUrl = dbUrl;
    }
  } catch (e) {
    // localStorage may not be available in all environments; ignore silently.
  }
  return config;
}, error => Promise.reject(error));

export default api;
