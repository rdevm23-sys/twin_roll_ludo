import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useCleanup } from '../../hooks/useCleanup';
import { clearAuth } from '../../state/slices/authSlice';
import styles from './HomePage.module.css';
import type { RootState } from '../../state/store';

function HomePage() {
  const version = __APP_VERSION__;
  const cleanup = useCleanup();
  const dispatch = useDispatch();
  const { isAuthenticated, player } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    document.title = 'Twin Roll';
    cleanup();
  }, [cleanup]);

  const handleLogout = () => {
    dispatch(clearAuth());
  };

  return (
    <div className={styles.pageContainer}>
      <main className={styles.homePage}>
        {isAuthenticated && (
          <div className={styles.header}>
            <div className={styles.userInfo}>
              <span className={styles.username}>👋 Welcome, {player?.username}</span>
            </div>
            <button onClick={handleLogout} className={styles.logoutBtn}>
              Logout
            </button>
          </div>
        )}

        <section className={styles.welcome}>
          <p className={styles.badge}>Twin Roll</p>
          <h1 className={styles.title}>
            <span className={styles.titleStack}>
              <span className={styles.titleRow}>
                <span className={styles.titleDice} aria-hidden>
                  🎲
                </span>
                <span className={styles.titleWord}>Twin</span>
              </span>
              <span className={styles.titleRow}>
                <span className={styles.titleDice} aria-hidden>
                  🎲
                </span>
                <span className={styles.titleWord}>Roll</span>
              </span>
            </span>
            <small className={styles.version}>v{version}</small>
          </h1>
          <p className={styles.tagline}>Two dice. One board. Your move.</p>

          {isAuthenticated ? (
            <nav className={styles.ctaButtons} aria-label="Play modes">
              <Link className={clsx(styles.ctaButton, styles.playNowBtn)} to="/setup?mode=pass">
                Pass &amp; play
              </Link>
              <Link className={clsx(styles.ctaButton, styles.secondaryCta)} to="/setup">
                Play with bots
              </Link>
              <Link className={clsx(styles.ctaButton, styles.secondaryCta)} to="/online">
                Online
              </Link>
            </nav>
          ) : (
            <nav className={styles.ctaButtons} aria-label="Authentication">
              <Link className={clsx(styles.ctaButton, styles.playNowBtn)} to="/login">
                Login
              </Link>
              <Link className={clsx(styles.ctaButton, styles.secondaryCta)} to="/signup">
                Sign Up
              </Link>
            </nav>
          )}
        </section>
      </main>
    </div>
  );
}

export default HomePage;
