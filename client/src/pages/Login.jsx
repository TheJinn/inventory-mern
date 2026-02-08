import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { api } from '../utils/api.js';
import { useAuth } from '../components/AuthProvider.jsx';
import { Eye, EyeOff } from '../components/EyeIcon.jsx';

export default function Login() {
  const nav = useNavigate();
  const { loginWithToken } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      loginWithToken(data.token, data.user);
      nav('/');
    } catch (ex) {
      setErr(ex.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Log in to your account</h1>
      <p className={styles.subtitle}>Welcome back! Please enter your details.</p>

      <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          name="login_email"
          placeholder="Example@email.com"
          autoComplete="off"
        />

        <label className={styles.label}>Password</label>
        <div className={styles.pwWrap}>
          <input
            className={`${styles.input} ${styles.pwInput}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={show ? 'text' : 'password'}
            name="login_password"
            placeholder="at least 8 characters"
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eye}
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>

        <div className={styles.rightLinkRow}>
          <Link to="/forgot" className={styles.link}>
            Forgot Password?
          </Link>
        </div>

        {err ? <div className={styles.error}>{err}</div> : null}

        <button className={styles.btn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className={styles.bottom}>
          <span>Don&apos;t you have an account?</span>
          <Link to="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  );
}
