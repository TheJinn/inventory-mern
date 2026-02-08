import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import styles from './AppShell.module.css';
import logo from '../assets/logo1.png';
import { useAuth } from './AuthProvider';

const links = [
  { to: '/', label: 'Home', key: 'home' },
  { to: '/products', label: 'Products', key: 'products' },
  { to: '/invoices', label: 'Invoices', key: 'invoices' },
  { to: '/statistics', label: 'Statistics', key: 'statistics' },
  { to: '/settings', label: 'Settings', key: 'settings' }
];

function SidebarIcon({ name }) {

  switch (name) {
    case 'home':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case 'products':
      return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14.5 7.5H10.3L8.9 10.125H6.1L4.7 7.5H0.5" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.915 1.47125L0.5 7.5V12.75C0.5 13.2141 0.6475 13.6592 0.91005 13.9874C1.1726 14.3156 1.5287 14.5 1.9 14.5H13.1C13.4713 14.5 13.8274 14.3156 14.0899 13.9874C14.3525 13.6592 14.5 13.2141 14.5 12.75V7.5L12.085 1.47125C11.9691 1.17969 11.7904 0.934325 11.5691 0.762745C11.3477 0.591165 11.0925 0.500173 10.832 0.5H4.168C3.90754 0.500173 3.65228 0.591165 3.43093 0.762745C3.20958 0.934325 3.0309 1.17969 2.915 1.47125Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

      );
    case 'invoices':
      return (
        <svg width="15" height="17" viewBox="0 0 15 17" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clip-path="url(#clip0_1_1377)">
          <path d="M10.125 4.125H4.875M10.125 7.625H4.875M10.125 11.125H6.625M1.375 0.625H13.625V16.375L12.722 15.6015C12.4048 15.3297 12.0009 15.1803 11.5832 15.1803C11.1655 15.1803 10.7615 15.3297 10.4444 15.6015L9.54138 16.375L8.63925 15.6015C8.32202 15.3294 7.91791 15.1799 7.5 15.1799C7.08209 15.1799 6.67798 15.3294 6.36075 15.6015L5.45863 16.375L4.55563 15.6015C4.23846 15.3297 3.83452 15.1803 3.41681 15.1803C2.9991 15.1803 2.59517 15.3297 2.278 15.6015L1.375 16.375V0.625Z" stroke="white" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
          <defs>
          <clipPath id="clip0_1_1377">
          <rect width="15" height="17" fill="white"/>
          </clipPath>
          </defs>
        </svg>

      );
    case 'statistics':
      return (
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#filter0_d_1_1400)">
          <path d="M7.26375 10.9375H8.13875V7H7.26375V10.9375ZM13.8612 10.9375H14.7362V2.625H13.8612V10.9375ZM10.5625 10.9375H11.4375V8.75H10.5625V10.9375ZM10.5625 7H11.4375V5.25H10.5625V7ZM5.414 14C5.01092 14 4.67462 13.8652 4.40512 13.5957C4.13562 13.3262 4.00058 12.9897 4 12.586V1.414C4 1.01092 4.13504 0.674625 4.40512 0.405125C4.67521 0.135625 5.0115 0.000583333 5.414 0H16.5869C16.9894 0 17.3257 0.135041 17.5957 0.405125C17.8658 0.675208 18.0006 1.0115 18 1.414V12.5869C18 12.9894 17.8652 13.3257 17.5957 13.5957C17.3262 13.8658 16.9897 14.0006 16.586 14H5.414ZM5.414 13.125H16.5869C16.721 13.125 16.8444 13.069 16.957 12.957C17.0696 12.845 17.1256 12.7213 17.125 12.586V1.414C17.125 1.27925 17.069 1.15558 16.957 1.043C16.845 0.930416 16.7213 0.874417 16.586 0.875H5.414C5.27925 0.875 5.15558 0.931 5.043 1.043C4.93042 1.155 4.87442 1.27867 4.875 1.414V12.5869C4.875 12.721 4.931 12.8444 5.043 12.957C5.155 13.0696 5.27837 13.1256 5.41312 13.125" fill="white"/>
          </g>
          <defs>
          <filter id="filter0_d_1_1400" x="0" y="0" width="22" height="22" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="4"/>
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_1400"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_1400" result="shape"/>
          </filter>
          </defs>
        </svg>

      );
    case 'settings':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="2" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.2 2.2 0 0 1-1.55 3.76 2.2 2.2 0 0 1-1.56-.64l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.64V21a2.2 2.2 0 0 1-4.4 0v-.07a1.8 1.8 0 0 0-1.1-1.64 1.8 1.8 0 0 0-1.98.36l-.05.05a2.2 2.2 0 0 1-3.12 0 2.2 2.2 0 0 1 0-3.12l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.64-1.1H2.9a2.2 2.2 0 0 1 0-4.4h.07A1.8 1.8 0 0 0 4.7 8.4a1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.2 2.2 0 0 1 1.56-3.76c.56 0 1.12.22 1.56.64l.05.05A1.8 1.8 0 0 0 9.4 3.6a1.8 1.8 0 0 0 1.1-1.64V1.9a2.2 2.2 0 0 1 4.4 0v.07a1.8 1.8 0 0 0 1.1 1.64 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.2 2.2 0 0 1 3.12 0 2.2 2.2 0 0 1 0 3.12l-.05.05A1.8 1.8 0 0 0 19.4 9.4c.5.22.86.7.86 1.26v.07A1.8 1.8 0 0 0 21.9 12a2.2 2.2 0 0 1 0 4.4h-.07a1.8 1.8 0 0 0-1.64 1.1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AppShell() {
  const loc = useLocation();
  const title = links.find(l => l.to === loc.pathname)?.label || 'Dashboard';
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  // Sidebar and mobile topbar both render a user menu button.
  // Using a single ref breaks click-outside logic because the ref points to only one node,
  // which can cause the Logout button to never receive the click.
  const sidebarUserRef = useRef(null);
  const mobileUserRef = useRef(null);

  const displayName = (user?.name || user?.username || user?.email || 'User').toString();

  useEffect(() => {
    function onDocClick(e) {
      if (!menuOpen) return;
      const inSidebar = sidebarUserRef.current?.contains(e.target);
      const inMobile = mobileUserRef.current?.contains(e.target);
      if (!inSidebar && !inMobile) setMenuOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setMenuOpen(false);
      navigate('/login');
    }
  };

  return (
    <div className={styles.wrap}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="logo" className={styles.logo} />
        </div>

        <nav className={styles.nav}>
          {links.map(l => (
            <NavLink
              key={l.key}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
            >
              <span className={styles.linkInner}>
                <span className={styles.linkIcon} aria-hidden>
                  <SidebarIcon name={l.key} />
                </span>
                <span className={styles.linkLabel}>{l.label}</span>
              </span>
            </NavLink>
          ))}
        </nav>

        <div className={styles.userSection} ref={sidebarUserRef}>
          <button
            type="button"
            className={styles.userButton}
            onClick={() => setMenuOpen(v => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.caret} aria-hidden>▾</span>
          </button>
          {menuOpen && (
            <div className={styles.userMenu} role="menu">
              <button type="button" className={styles.userMenuItem} onClick={handleLogout} role="menuitem">
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className={styles.main}>

        {/* Mobile: fixed top bar with logo (left) and user name (right). */}
        <div className={styles.mobileTopbar}>
          <img src={logo} alt="logo" className={styles.mobileLogo} />

          <div className={styles.mobileUser} ref={mobileUserRef}>
            <button
              type="button"
              className={styles.mobileUserButton}
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className={styles.mobileUserName}>{displayName}</span>
              <span className={styles.caret} aria-hidden>
                ▾
              </span>
            </button>

            {menuOpen && (
              <div className={styles.mobileUserMenu} role="menu">
                <button
                  type="button"
                  className={styles.userMenuItem}
                  onClick={handleLogout}
                  role="menuitem"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.content}>
          <Outlet />
        </div>

        <div className={styles.mobileNav}>
          {links.map(l => (
            <NavLink key={l.key} to={l.to} end={l.to==='/'} className={({isActive})=> isActive ? `${styles.mLink} ${styles.mActive}` : styles.mLink}>
              <span className={styles.mRow}>
                <span className={styles.mIcon}><SidebarIcon name={l.key} /></span>
              </span>
            </NavLink>
          ))}
        </div>
      </main>
    </div>
  );
}
