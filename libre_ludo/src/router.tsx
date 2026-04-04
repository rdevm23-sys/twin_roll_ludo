import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen/LoadingScreen.tsx';
import HomePage from './pages/HomePage/HomePage.tsx';
import NotFound from './pages/NotFound/NotFound.tsx';
import ErrorBoundary from './pages/ErrorBoundary/ErrorBoundary.tsx';
import LoginPage from './pages/LoginPage/LoginPage.tsx';
import SignupPage from './pages/SignupPage/SignupPage.tsx';
import { lazy, Suspense, type LazyExoticComponent, type ReactElement } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from './state/store';

const Play = lazy(() => import('./pages/Play/Play.tsx'));
const PlayerSetup = lazy(() => import('./pages/PlayerSetup/PlayerSetup.tsx'));
const OnlinePage = lazy(() => import('./pages/Online/OnlinePage.tsx'));

const wrapWithSuspense = (Component: LazyExoticComponent<() => ReactElement>) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

// Protected route component for authenticated users only
function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export const router = createBrowserRouter([
  {
    path: '/',
    ErrorBoundary,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/signup',
        element: <SignupPage />,
      },
      {
        path: '/play',
        element: (
          <ProtectedRoute>
            {wrapWithSuspense(Play)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/setup',
        element: (
          <ProtectedRoute>
            {wrapWithSuspense(PlayerSetup)}
          </ProtectedRoute>
        ),
      },
      {
        path: '/online',
        element: (
          <ProtectedRoute>
            {wrapWithSuspense(OnlinePage)}
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
