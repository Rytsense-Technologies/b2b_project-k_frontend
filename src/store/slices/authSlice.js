import { createSlice } from '@reduxjs/toolkit';

// NOTE: Only non-sensitive metadata (user object, flags) stored in Redux.
// JWT tokens are stored in SameSite=Strict cookies managed by src/lib/tokens.js.
const initialState = {
  user: null,       // { id, name, email, first_name, last_name, avatar_url }
  isAuthed: false,
  onboardingComplete: false,
  role: null,        // mapped from API user_type — see mapUserTypeToRole in lib/auth/rbac.js
  tenantId: null,    // string for B2B users, null for B2C
  permissions: [],   // string[] from API e.g. ['users.read', 'reports.read']
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.isAuthed = true;
      state.onboardingComplete = action.payload.onboarding_complete ?? false;
      state.role = action.payload.role ?? null;
      state.tenantId = action.payload.tenant_id ?? null;
      state.permissions = action.payload.permissions ?? [];
    },
    clearCredentials(state) {
      state.user   = null;
      state.isAuthed = false;
      state.onboardingComplete = false;
      state.role = null;
      state.tenantId = null;
      state.permissions = [];
    },
    setOnboardingComplete(state, action) {
      state.onboardingComplete = action.payload;
    },
    setUser(state, action) {
      state.user = { ...state.user, ...action.payload };
    },
    setRoleData(state, action) {
      state.role = action.payload.role ?? state.role;
      state.tenantId = action.payload.tenantId ?? state.tenantId;
    },
    setRoleDataOnly(state, action) {
      state.role = action.payload.role;
      state.tenantId = action.payload.tenantId;
    },

  },
});

export const {
  setCredentials,
  clearCredentials,
  setOnboardingComplete,
  setUser,
  setRoleData,
  setRoleDataOnly,
} = authSlice.actions;


export default authSlice.reducer;

// Selectors
export const selectUser               = (s) => s.auth.user;
export const selectIsAuthed           = (s) => s.auth.isAuthed;
export const selectOnboardingComplete = (s) => s.auth.onboardingComplete;
export const selectRole               = (s) => s.auth.role;
export const selectTenantId           = (s) => s.auth.tenantId;
export const selectPermissions        = (s) => s.auth.permissions;
