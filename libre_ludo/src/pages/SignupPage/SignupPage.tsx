import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import { setAuth, setError, setLoading } from '../../state/slices/authSlice';
import { register } from '../../api/auth';
import { useCleanup } from '../../hooks/useCleanup';
import bg from '../../assets/bg.jpg';
import HomeIcon from '../../assets/icons/home.svg?react';
import styles from './SignupPage.module.css';
import type { RootState } from '../../state/store';

function SignupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cleanup = useCleanup();

  useEffect(() => {
    document.title = 'Twin Roll — Sign Up';
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (username.length < 3) {
      toast.error('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const response = await register({ username, password });
      dispatch(setAuth(response));
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      dispatch(setError(errorMsg));
      toast.error(errorMsg);
    }
  };

  return (
    <div className={styles.pageContainer} style={{ backgroundImage: `url(${bg})` }}>
      <main className={styles.signupPage}>
        <Link to="/" className={styles.homeBtn} title="Back to home">
          <HomeIcon />
        </Link>

        <div className={styles.signupBox}>
          <h1 className={styles.title}>Twin Roll</h1>
          <p className={styles.subtitle}>Create your account</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                disabled={loading}
                autoComplete="username"
                required
              />
              {username && username.length < 3 && (
                <span className={styles.hint}>At least 3 characters required</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                disabled={loading}
                autoComplete="new-password"
                required
              />
              {password && password.length < 6 && (
                <span className={styles.hint}>At least 6 characters required</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={loading}
                autoComplete="new-password"
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <span className={styles.hint}>Passwords do not match</span>
              )}
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className={styles.loginLink}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </main>

      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}

export default SignupPage;
