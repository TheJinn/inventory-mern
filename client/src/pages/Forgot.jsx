import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AuthForm.module.css';
import { api } from '../utils/api.js';

export default function Forgot() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);
    try {
      const data = await api.forgotPassword({ email });
      // Required by spec: OTP must always be printed in browser console for testing.
      // eslint-disable-next-line no-console
      console.log(`[OTP] Email: ${email} | OTP: ${data?.otp}`);
      if (data?.otp) sessionStorage.setItem('testingOtp', String(data.otp));
      sessionStorage.setItem('resetEmail', email);
      setMsg('OTP sent. Please check your email. (OTP is also printed in the browser console for testing.)');
      nav('/otp');
    } catch (ex) {
      setErr(ex.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Company name</h1>
      <p className={styles.subtitle}>
        Please enter your registered email ID to <br /> receive an OTP
      </p>

      <form onSubmit={onSubmit} className={styles.form} autoComplete="off">
        <label className={styles.label}>E-mail</label>
        <input
          className={styles.input}
          name="forgot_email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Enter your registered email"
          autoComplete="off"
        />

        {msg ? <div className={styles.ok}>{msg}</div> : null}
        {err ? <div className={styles.error}>{err}</div> : null}

        <button className={styles.btn} disabled={loading}>
          {loading ? 'Sending...' : 'Send Mail'}
        </button>
      </form>
    </div>
  );
}
