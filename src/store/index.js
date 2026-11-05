import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';

/** Same source as main layout rehydration — avoids "empty user" flash before /auth/me. */
function getPreloadedUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('pk_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    return u && typeof u === 'object' ? u : null;
  } catch {
    return null;
  }
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
  preloadedState: {
    auth: {
      user: getPreloadedUser(),
      isAuthed: false,
      onboardingComplete: false,
    },
  },
  devTools: process.env.NODE_ENV !== 'production',
});
