import { configureStore } from '@reduxjs/toolkit';
import playersReducer from './slices/playersSlice';
import boardReducer from './slices/boardSlice';
import diceReducer from './slices/diceSlice';
import sessionReducer from './slices/sessionSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    players: playersReducer,
    board: boardReducer,
    dice: diceReducer,
    session: sessionReducer,
    auth: authReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
