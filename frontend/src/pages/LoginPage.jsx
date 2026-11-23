import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { login, register } from '../api/auth.api';
import { setSession } from '../store/authSlice';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../config';
import './LoginPage.scss';

const EMPTY = { name: '', email: '', password: '' };

const validate = (form, mode) => {
  const errors = {};
  if (mode === 'register' && !form.name.trim()) errors.name = 'Name is required';
  if (!form.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Email is not valid';
  if (!form.password) errors.password = 'Password is required';
  else if (mode === 'register' && form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  return errors;
};

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((errs) => ({ ...errs, [field]: undefined }));
    setFormError('');
  };

  const submit = async (values) => {
    const clientErrors = validate(values, mode);
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }

    setSubmitting(true);
    const res = mode === 'login' ? await login(values) : await register(values);
    setSubmitting(false);

    if (res.error) {
      // Map server field errors onto the form when present
      const fieldErrors = Object.fromEntries((res.error.details || []).map((d) => [d.field, d.message]));
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setFormError(res.message);
      return;
    }

    dispatch(setSession(res.data));
    navigate(location.state?.from || '/', { replace: true });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit(form);
  };

  const loginAsDemo = (email) => {
    const values = { ...EMPTY, email, password: DEMO_PASSWORD };
    setMode('login');
    setForm(values);
    submit(values);
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setErrors({});
    setFormError('');
  };

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__brand">
          <span className="login__logo" aria-hidden="true">D</span>
          <h1>Docs</h1>
        </div>
        <p className="login__subtitle">{mode === 'login' ? 'Sign in to your documents' : 'Create an account'}</p>

        <form onSubmit={handleSubmit} noValidate className="login__form">
          {mode === 'register' && (
            <label className="field">
              <span className="field__label">Name</span>
              <input className={`input${errors.name ? ' input--error' : ''}`} value={form.name} onChange={update('name')} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
          )}
          <label className="field">
            <span className="field__label">Email</span>
            <input
              className={`input${errors.email ? ' input--error' : ''}`}
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          <label className="field">
            <span className="field__label">Password</span>
            <input
              className={`input${errors.password ? ' input--error' : ''}`}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.password}
              onChange={update('password')}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>

          {formError && <p className="form-error">{formError}</p>}

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button type="button" className="btn btn--link" onClick={switchMode}>
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Sign in'}
        </button>

        <div className="login__demo">
          <p>
            Demo accounts (password <code>{DEMO_PASSWORD}</code>)
          </p>
          <div className="login__demo-buttons">
            {DEMO_ACCOUNTS.map((a) => (
              <button key={a.email} type="button" className="btn btn--secondary" onClick={() => loginAsDemo(a.email)} disabled={submitting}>
                {a.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
