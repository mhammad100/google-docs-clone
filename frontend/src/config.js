export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const SUPPORTED_UPLOADS = ['.txt', '.md'];
export const MAX_UPLOAD_BYTES = 1024 * 1024; // keep in sync with the backend (1 MB)

export const DEMO_ACCOUNTS = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  { name: 'Carol', email: 'carol@example.com' },
];
export const DEMO_PASSWORD = 'password123';
