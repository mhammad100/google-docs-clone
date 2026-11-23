import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { exportDocumentPdf } from '../api/documents.api';
import { showToast } from '../store/toastSlice';
import { downloadBlob } from '../utils/format';

/**
 * Downloads a document as PDF (generated on the server with its page setup).
 * `beforeExport` lets the editor flush unsaved edits first so the PDF is up to date.
 */
export const usePdfExport = () => {
  const dispatch = useDispatch();
  const [exportingId, setExportingId] = useState(null);

  const exportPdf = async (id, { beforeExport } = {}) => {
    if (exportingId) return;
    setExportingId(id);
    dispatch(showToast({ type: 'info', message: 'Preparing PDF…' }));

    if (beforeExport) await beforeExport();
    const res = await exportDocumentPdf(id);
    setExportingId(null);

    if (res.error) {
      dispatch(showToast({ type: 'error', message: res.message }));
      return;
    }

    downloadBlob(res.data.blob, res.data.filename);
    dispatch(showToast({ type: 'success', message: `Downloaded ${res.data.filename}` }));
  };

  return { exportPdf, exportingId };
};
