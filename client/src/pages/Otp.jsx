import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { api } from '../utils/api.js';

export default function Otp() {
  const nav = useNavigate();
  const email = sessionStorage.getItem('resetEmail') || '';

  // Block access to this step if the email step hasn't been completed.
  useEffect(() => {
    if (!email) {
      nav('/forgot', { replace: true });
    }
  }, [email, nav]);

  useEffect(() => {
    const t = sessionStorage.getItem('testingOtp');
    if (t) {
      // eslint-disable-next-line no-console
      console.log(`[OTP] Email: ${email} | OTP: ${t}`);
    }
  }, [email]);
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await api.verifyOtp({ email, otp });
      nav('/reset');
    } catch (ex) {
      setErr(ex.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Enter Your OTP</h1>
      <p className={styles.subtitle}>
        We’ve sent a 6-digit OTP to your <br /> registered mail. <br /> Please enter it below to sign in.
      </p>

      <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
        <label className={styles.label}>OTP</label>
        <input
          className={styles.input}
          name="otp_code"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="xxxx05"
          maxLength={6}
        />

        {err ? <div className={styles.error}>{err}</div> : null}
        <button className={styles.btn} disabled={loading}>
          {loading ? 'Verifying...' : 'Confirm'}
        </button>
      </form>
    </div>
  );
}
