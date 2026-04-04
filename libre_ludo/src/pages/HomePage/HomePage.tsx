import { Link } from 'react-router-dom';
import clsx from 'clsx';
import styles from './HomePage.module.css';

function HomePage() {
  const version = __APP_VERSION__;

  return (
    <div className={styles.pageContainer}>
      <main className={styles.homePage}>
        <section className={styles.welcome}>
          <p className={styles.badge}>Multiplayer Ludo</p>
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
          <nav className={styles.ctaButtons}>
            <Link className={clsx(styles.ctaButton, styles.playNowBtn)} to="/setup">
              Play Now!
            </Link>
          </nav>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
