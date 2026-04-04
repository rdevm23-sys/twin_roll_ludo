import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { setAuth, setError, setLoading } from '../../state/slices/authSlice';
import { login } from '../../api/auth';
import { useCleanup } from '../../hooks/useCleanup';
import bg from '../../assets/bg.jpg';
import HomeIcon from '../../assets/icons/home.svg?react';
import styles from './LoginPage.module.css';
import type { RootState } from '../../state/store';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cleanup = useCleanup();

  useEffect(() => {
    document.title = 'Twin Roll — Login';
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password');
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const response = await login({ username, password });
      dispatch(setAuth(response));
      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      dispatch(setError(errorMsg));
      toast.error(errorMsg);
    }
  };

  return (
    <div className={styles.pageContainer} style={{ backgroundImage: `url(${bg})` }}>
      <main className={styles.loginPage}>
        <Link to="/" className={styles.homeBtn} title="Back to home">
          <HomeIcon />
        </Link>

        <div className={styles.loginBox}>
          <h1 className={styles.title}>Twin Roll</h1>
          <p className={styles.subtitle}>Login to your account</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={loading}
                autoComplete="username"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className={styles.signupLink}>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </main>

      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}

export default LoginPage;
