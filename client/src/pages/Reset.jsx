import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { api } from '../utils/api.js';
import { Eye, EyeOff } from '../components/EyeIcon.jsx';

export default function Reset() {
  const nav = useNavigate();
  const email = sessionStorage.getItem('resetEmail') || '';

  // Block access to this step if the email step hasn't been completed.
  useEffect(() => {
    if (!email) {
      nav('/forgot', { replace: true });
    }
  }, [email, nav]);

  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    if (pw1.length < 8) return setErr('Password must be at least 8 characters.');
    if (pw1 !== pw2) return setErr('Passwords do not match.');
    setLoading(true);
    try {
      await api.resetPassword({ email, newPassword: pw1 });
      sessionStorage.removeItem('resetEmail');
      nav('/login');
    } catch (ex) {
      setErr(ex.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Create New Password</h1>
      <p className={styles.subtitle}>
        Today is a new day. It&apos;s your day. You shape it.<br />
        Sign in to start managing your projects.
      </p>

      <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
        <label className={styles.label}>Enter New Password</label>
        <div className={styles.pwWrap}>
          <input
            className={`${styles.input} ${styles.pwInput}`}
            name="reset_password"
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
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
            name="reset_confirm"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
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

        <div className={styles.rightLinkRow}>
          <Link to="/forgot" className={styles.link}>
            Forgot Password?
          </Link>
        </div>

        {err ? <div className={styles.error}>{err}</div> : null}

        <button className={styles.btn} disabled={loading}>
          {loading ? 'Saving...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}
