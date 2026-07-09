import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import interviewReducer from './slices/interviewSlice';
import uiReducer from './slices/uiSlice';

// Preload plan from sessionStorage so the very first synchronous render
// already has the correct plan — avoids upgrade-banner flash for premium users.
function getPreloadedPlan() {
  if (typeof window === 'undefined') return 'free';
  try {
    return sessionStorage.getItem('pk_plan') || 'free';
  } catch {
    return 'free';
  }
}

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
    interview: interviewReducer,
    ui: uiReducer,
  },
  preloadedState: {
    auth: {
      user: getPreloadedUser(),
      plan: getPreloadedPlan(),
      isAuthed: false,
      onboardingComplete: false,
      planSelected: false,
    },
  },
  devTools: process.env.NODE_ENV !== 'production',
});
