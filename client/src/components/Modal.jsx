import React from 'react';
import styles from './Modal.module.css';

export default function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  const hasHead = Boolean(title);
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e)=>e.stopPropagation()}>
        {hasHead ? (
          <div className={styles.head}>
            <div className={styles.title}>{title}</div>
            <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
          </div>
        ) : null}

        <div className={hasHead ? styles.body : styles.bodyNoHead}>{children}</div>
      </div>
    </div>
  );
}
