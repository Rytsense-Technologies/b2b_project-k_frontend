import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: { sidebarOpen: true, activeModal: null },
  reducers: {
    toggleSidebar(s)  { s.sidebarOpen = !s.sidebarOpen; },
    openModal(s, a)   { s.activeModal = a.payload; },
    closeModal(s)     { s.activeModal = null; },
  },
});

export const { toggleSidebar, openModal, closeModal } = uiSlice.actions;
export default uiSlice.reducer;

export const selectSidebarOpen = (s) => s.ui.sidebarOpen;
export const selectActiveModal = (s) => s.ui.activeModal;
