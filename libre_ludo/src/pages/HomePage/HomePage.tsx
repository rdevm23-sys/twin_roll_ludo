import { Link } from 'react-router-dom';
import clsx from 'clsx';
import styles from './HomePage.module.css';

function HomePage() {
  return (
    <div className={styles.pageContainer}>
      <main className={styles.homePage}>
        <section className={styles.welcome}>
          <h1>
            Twin Roll
            <br />
            <small>Version 1.0.4</small>
          </h1>
          <p>Roll the dice, compete with friends, and send your tokens home first.</p>
          <nav className={styles.ctaButtons}>
            <Link className={clsx(styles.ctaButton, styles.playNowBtn)} to="/setup">
              🔥 Play Now!
            </Link>
          </nav>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
