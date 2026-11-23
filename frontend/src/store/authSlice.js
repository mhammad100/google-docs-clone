import { createSlice } from '@reduxjs/toolkit';

export const AUTH_STORAGE_KEY = 'docs.auth';

const loadAuth = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
    if (saved?.token && saved?.user) return saved;
  } catch {
    // ignore corrupted storage
  }
  return { token: null, user: null };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuth(),
  reducers: {
    setSession: (state, { payload }) => {
      state.token = payload.token;
      state.user = payload.user;
    },
    setUser: (state, { payload }) => {
      state.user = payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setSession, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
