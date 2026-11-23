import { configureStore } from '@reduxjs/toolkit';
import authReducer, { AUTH_STORAGE_KEY } from './authSlice';
import documentsReducer from './documentsSlice';
import toastReducer from './toastSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    documents: documentsReducer,
    toasts: toastReducer,
  },
});

// Persist the session so it survives a refresh
let lastAuth = store.getState().auth;
store.subscribe(() => {
  const { auth } = store.getState();
  if (auth === lastAuth) return;
  lastAuth = auth;
  if (auth.token) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_STORAGE_KEY);
});
