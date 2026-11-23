import { createSlice } from '@reduxjs/toolkit';

let nextId = 1;

const toastSlice = createSlice({
  name: 'toasts',
  initialState: [],
  reducers: {
    showToast: {
      reducer: (state, { payload }) => {
        state.push(payload);
      },
      prepare: ({ message, type = 'info' }) => ({ payload: { id: nextId++, message, type } }),
    },
    dismissToast: (state, { payload: id }) => state.filter((t) => t.id !== id),
  },
});

export const { showToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;
