import { createSlice } from '@reduxjs/toolkit';
import { logout } from './authSlice';

const initialState = { owned: [], shared: [], loaded: false };

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    setDocuments: (state, { payload }) => {
      state.owned = payload.owned;
      state.shared = payload.shared;
      state.loaded = true;
    },
    addOwnedDocument: (state, { payload }) => {
      state.owned.unshift({ ...payload, shareCount: 0 });
    },
    removeDocument: (state, { payload: id }) => {
      state.owned = state.owned.filter((d) => d.id !== id);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(logout, () => initialState);
  },
});

export const { setDocuments, addOwnedDocument, removeDocument } = documentsSlice.actions;
export default documentsSlice.reducer;
