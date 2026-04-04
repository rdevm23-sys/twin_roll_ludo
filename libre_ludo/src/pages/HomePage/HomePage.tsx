import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useCleanup } from '../../hooks/useCleanup';
import styles from './HomePage.module.css';

function HomePage() {
  const version = __APP_VERSION__;
  const cleanup = useCleanup();

  useEffect(() => {
    document.title = 'Twin Roll';
    cleanup();
  }, [cleanup]);

  return (
    <div className={styles.pageContainer}>
      <main className={styles.homePage}>
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
        </section>
      </main>
    </div>
  );
}

export default HomePage;
