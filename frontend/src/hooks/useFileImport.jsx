import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { importDocument } from '../api/documents.api';
import { showToast } from '../store/toastSlice';
import { MAX_UPLOAD_BYTES, SUPPORTED_UPLOADS } from '../config';

/**
 * File picker for importing .txt/.md files as new documents.
 * Render `fileInput` once, then call `openPicker()` from any button or menu item.
 */
export const useFileImport = () => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow choosing the same file again
    if (!file) return;

    // Fast client-side checks; the server validates again
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!SUPPORTED_UPLOADS.includes(ext)) {
      dispatch(showToast({ type: 'error', message: 'Only .txt and .md files are supported' }));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      dispatch(showToast({ type: 'error', message: 'File is too large (max 1 MB)' }));
      return;
    }

    setUploading(true);
    const res = await importDocument(file);
    setUploading(false);

    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }

    dispatch(showToast({ type: 'success', message: res.message }));
    navigate(`/documents/${res.data.id}`);
  };

  const fileInput = (
    <input ref={inputRef} type="file" accept={SUPPORTED_UPLOADS.join(',')} hidden onChange={handleFile} />
  );

  return { openPicker: () => inputRef.current?.click(), uploading, fileInput };
};
