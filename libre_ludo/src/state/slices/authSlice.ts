import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type TAuthState = {
  token: string | null;
  player: {
    id: number;
    username: string;
    avatar?: string;
  } | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
};

export const initialState: TAuthState = {
  token: localStorage.getItem('auth_token'),
  player: localStorage.getItem('auth_player')
    ? JSON.parse(localStorage.getItem('auth_player')!)
    : null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('auth_token'),
};

const reducers = {
  setLoading: (state: TAuthState, action: PayloadAction<boolean>) => {
    state.loading = action.payload;
  },
  setError: (state: TAuthState, action: PayloadAction<string | null>) => {
    state.error = action.payload;
  },
  setAuth: (
    state: TAuthState,
    action: PayloadAction<{ token: string; player: { id: number; username: string; avatar?: string } }>
  ) => {
    const { token, player } = action.payload;
    state.token = token;
    state.player = player;
    state.isAuthenticated = true;
    state.error = null;
    state.loading = false;
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_player', JSON.stringify(player));
  },
  clearAuth: (state: TAuthState) => {
    state.token = null;
    state.player = null;
    state.isAuthenticated = false;
    state.error = null;
    state.loading = false;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_player');
  },
  setAuthError: (state: TAuthState, action: PayloadAction<string>) => {
    state.error = action.payload;
    state.loading = false;
  },
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers,
});

export const { setLoading, setError, setAuth, clearAuth, setAuthError } = authSlice.actions;

export default authSlice.reducer;
