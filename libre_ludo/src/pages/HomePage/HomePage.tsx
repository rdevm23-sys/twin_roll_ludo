import { Link } from 'react-router-dom';
import clsx from 'clsx';
import styles from './HomePage.module.css';

function HomePage() {
  return (
    <div className={styles.pageContainer}>
      <main className={styles.homePage}>
        <section className={styles.welcome}>
          <h1 className={styles.title}>
            Twin Roll
            <small className={styles.version}>v1.0.4</small>
          </h1>
          <div className={styles.diceSet}>
            <span className={styles.dice}>⚀</span>
            <span className={styles.dice}>⚄</span>
          </div>
          <p>Two dice. One board. Start the game.</p>
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
