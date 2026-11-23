/**
 * Normalises VITE_API_URL so a common misconfiguration still works:
 * "my-api.vercel.app" -> "https://my-api.vercel.app/api". Without a protocol, axios would
 * treat the value as a path on the frontend's own domain.
 */
export const normalizeApiUrl = (raw) => {
  let url = String(raw || 'http://localhost:4000/api').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = `${/^(localhost|127\.0\.0\.1)(:|$)/.test(url) ? 'http' : 'https'}://${url}`;
  if (!/\/api$/i.test(url)) url = `${url}/api`;
  return url;
};

export const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL);

export const SUPPORTED_UPLOADS = ['.txt', '.md'];
export const MAX_UPLOAD_BYTES = 1024 * 1024; // keep in sync with the backend (1 MB)

export const DEMO_ACCOUNTS = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' },
];
export const DEMO_PASSWORD = 'password123';
