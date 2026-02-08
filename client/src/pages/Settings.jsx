import React, { useEffect, useMemo, useState } from 'react';
import styles from './Settings.module.css';
import homeStyles from './Home.module.css';
import { api } from '../utils/api.js';

function splitName(full = '') {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] || '', last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // UI labels in the design are "Password" and "Confirm Password".
  // These are used to set a NEW password (both fields must match).
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);

  const fullName = useMemo(() => {
    const fn = String(firstName || '').trim();
    const ln = String(lastName || '').trim();
    return (fn + (ln ? ` ${ln}` : '')).trim();
  }, [firstName, lastName]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const d = await api.me();
        const n = splitName(d.user?.name || '');
        setFirstName(n.first);
        setLastName(n.last);
        setEmail(d.user?.email || '');
      } catch (ex) {
        setErr(ex?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSave(e) {
    e.preventDefault();
    setErr('');
    setMsg('');

    try {
      setSaving(true);

      // Update profile name
      await api.updateProfile({ name: fullName });

      // Reset password (new password must match confirm password)
      const wantsPasswordChange = String(password).length > 0 || String(confirmPassword).length > 0;
      if (wantsPasswordChange) {
        if (!password || !confirmPassword) throw new Error('Please fill both Password and Confirm Password');
        if (password !== confirmPassword) throw new Error('Password and Confirm Password must match');
        await api.updatePassword({ newPassword: password });
        setPassword('');
        setConfirmPassword('');
      }

      setMsg('Saved');
    } catch (ex) {
      setErr(ex?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.state}>Loading...</div>;

  return (
    <div className={homeStyles.page}>
      <div className={homeStyles.topbar}>
        <div className={homeStyles.pageTitle}>Settings</div>
      </div>
      <div className={homeStyles.headerDivider} />

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div className={styles.tab}>Edit Profile</div>
        </div>

        <form className={styles.form} onSubmit={onSave}>
          <div className={styles.field}>
            <label className={styles.label}>First name</label>
            <input
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Last name</label>
            <input
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} value={email} readOnly />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Confirm Password</label>
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          {msg ? <div className={styles.msgOk}>{msg}</div> : null}
          {err ? <div className={styles.msgErr}>{err}</div> : null}

          <button className={styles.saveBtn} type="submit" disabled={saving}>
            {saving ? 'Saving' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
