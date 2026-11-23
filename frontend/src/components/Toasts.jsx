import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '../store/toastSlice';
import './Toasts.scss';

const Toast = ({ toast }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, dispatch]);

  return (
    <div className={`toast toast--${toast.type}`} role="status">
      <span>{toast.message}</span>
      <button type="button" aria-label="Dismiss" onClick={() => dispatch(dismissToast(toast.id))}>
        ×
      </button>
    </div>
  );
};

const Toasts = () => {
  const toasts = useSelector((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
};

export default Toasts;
