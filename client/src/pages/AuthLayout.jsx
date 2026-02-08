import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import styles from './AuthLayout.module.css';

// Right-side illustrations (provided in project files)
import loginHero from '../assets/image1.png';
import forgotHero from '../assets/image2.png';
import otpHero from '../assets/image3.png';
import resetHero from '../assets/image4.png';

const COMPANY_NAME = 'NovaStock';

function pickHero(pathname) {
  if (pathname.startsWith('/signup')) return loginHero;
  if (pathname.startsWith('/forgot')) return forgotHero;
  if (pathname.startsWith('/otp')) return otpHero;
  if (pathname.startsWith('/reset')) return resetHero;
  return loginHero; // /login default
}

export default function AuthLayout() {
  const { pathname } = useLocation();
  const hero = pickHero(pathname);
  const showWelcome = pathname.startsWith('/login') || pathname.startsWith('/signup');

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.left}>
          <div className={styles.leftInner}>
            <Outlet />
          </div>
        </div>

        <div className={styles.right}>
          {showWelcome ? (
            <div className={styles.topBar}>
              <div className={styles.welcomeBlock}>
                <div className={styles.welcomeSmall}>Welcome to</div>
                <div className={styles.welcomeBig}>{COMPANY_NAME}</div>
              </div>
              <div className={styles.pie} aria-hidden="true" />
            </div>
          ) : null}

          <div className={showWelcome ? styles.heroWrapWelcome : styles.heroWrapCenter}>
            <img className={styles.hero} src={hero} alt="" />
          </div>
        </div>
      </div>
    </div>
  );
}
