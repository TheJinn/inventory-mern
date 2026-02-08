import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { api } from '../utils/api.js';
import { useAuth } from '../components/AuthProvider.jsx';
import { Eye, EyeOff } from '../components/EyeIcon.jsx';

export default function Signup() {
  const nav = useNavigate();
  const { loginWithToken } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setLoading(true);
    try {
      const data = await api.signup({ name, email, password });
      loginWithToken(data.token, data.user);
      nav('/');
    } catch (ex) {
      setErr(ex.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Create an account</h1>
      <p className={styles.subtitle}>Start inventory management.</p>

      <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          name="signup_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          autoComplete="off"
        />

        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          name="signup_email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Example@email.com"
          autoComplete="off"
        />

        <label className={styles.label}>Create Password</label>
        <div className={styles.pwWrap}>
          <input
            className={`${styles.input} ${styles.pwInput}`}
            name="signup_password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show1 ? 'text' : 'password'}
            placeholder="at least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eye}
            onClick={() => setShow1((s) => !s)}
            aria-label={show1 ? 'Hide password' : 'Show password'}
          >
            {show1 ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <label className={styles.label}>Confirm Password</label>
        <div className={styles.pwWrap}>
          <input
            className={`${styles.input} ${styles.pwInput}`}
            name="signup_confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type={show2 ? 'text' : 'password'}
            placeholder="at least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eye}
            onClick={() => setShow2((s) => !s)}
            aria-label={show2 ? 'Hide password' : 'Show password'}
          >
            {show2 ? <EyeOff /> : <Eye />}
          </button>
        </div>

        {err ? <div className={styles.error}>{err}</div> : null}

        <button className={styles.btn} disabled={loading}>
          {loading ? 'Creating...' : 'Sign up'}
        </button>

        <div className={styles.bottom}>
          <span>Do you have an account?</span>
          <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
