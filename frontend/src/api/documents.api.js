import client from './client';
import { asyncCatcher } from './asyncCatcher';

export const getDocuments = () => asyncCatcher(() => client.get('/documents'));

export const getDocument = (id) => asyncCatcher(() => client.get(`/documents/${id}`));

export const createDocument = (payload = {}) => asyncCatcher(() => client.post('/documents', payload));

export const updateDocument = (id, payload) => asyncCatcher(() => client.patch(`/documents/${id}`, payload));

export const deleteDocument = (id) => asyncCatcher(() => client.delete(`/documents/${id}`));

export const importDocument = (file) => {
  const form = new FormData();
  form.append('file', file);
  return asyncCatcher(() => client.post('/documents/import', form));
};

// Sharing
export const getShares = (id) => asyncCatcher(() => client.get(`/documents/${id}/shares`));

export const shareDocument = (id, payload) => asyncCatcher(() => client.post(`/documents/${id}/shares`, payload));

export const unshareDocument = (id, userId) => asyncCatcher(() => client.delete(`/documents/${id}/shares/${userId}`));

// Export: resolves with data = { blob, filename }
export const exportDocumentPdf = (id) =>
  asyncCatcher(() => client.get(`/documents/${id}/export/pdf`, { responseType: 'blob', timeout: 60000 }));
