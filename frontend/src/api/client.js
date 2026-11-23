import axios from 'axios';
import { API_URL } from '../config';
import { store } from '../store';
import { logout } from '../store/authSlice';
import { showToast } from '../store/toastSlice';

const client = axios.create({ baseURL: API_URL, timeout: 15000 });

// Attach the auth token to every request
client.interceptors.request.use((config) => {
  const { token } = store.getState().auth;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired/invalid token logs the user out (login itself is allowed to return 401)
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublic = PUBLIC_ROUTES.includes(error.config?.url);
    if (error.response?.status === 401 && !isPublic && store.getState().auth.token) {
      store.dispatch(logout());
      store.dispatch(showToast({ type: 'error', message: 'Your session expired. Please log in again.' }));
    }
    return Promise.reject(error);
  },
);

export default client;
