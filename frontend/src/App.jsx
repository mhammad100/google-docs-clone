import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useMatch } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './api/auth.api';
import { setUser } from './store/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import AppHeader from './components/AppHeader';
import Toasts from './components/Toasts';
import LoginPage from './pages/LoginPage';
import DocumentsPage from './pages/DocumentsPage';
import NotFoundPage from './pages/NotFoundPage';

// Editor.js is heavy, so the editor route is loaded on demand
const EditorPage = lazy(() => import('./pages/EditorPage'));

const App = () => {
  const dispatch = useDispatch();
  const token = useSelector((s) => s.auth.token);
  // The editor has its own Google Docs style top bar
  const inEditor = useMatch('/documents/:id');

  // Refresh the stored user on load; an invalid token is cleared by the axios interceptor
  useEffect(() => {
    if (!token) return;
    (async () => {
      const res = await getMe();
      if (res.error) return;
      dispatch(setUser(res.data));
    })();
  }, [token, dispatch]);

  return (
    <>
      {token && !inEditor && <AppHeader />}
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DocumentsPage />} />
          <Route
            path="/documents/:id"
            element={
              <Suspense fallback={<main className="page page-message">Loading editor…</main>}>
                <EditorPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toasts />
    </>
  );
};

export default App;
