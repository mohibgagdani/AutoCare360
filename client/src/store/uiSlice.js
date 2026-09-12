import { createSlice } from '@reduxjs/toolkit';

const THEME_KEY = 'ac360-theme';
const SIDEBAR_KEY = 'ac360-sidebar-collapsed';
const MOTION_KEY = 'ac360-reduce-motion';

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) */
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: read(THEME_KEY, 'system'), // light | dark | system
    reduceMotion: read(MOTION_KEY, 'false') === 'true',
    sidebarCollapsed: read(SIDEBAR_KEY, 'false') === 'true',
    mobileNavOpen: false,
    commandOpen: false,
  },
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
      write(THEME_KEY, action.payload);
    },
    setReduceMotion(state, action) {
      state.reduceMotion = action.payload;
      write(MOTION_KEY, String(action.payload));
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      write(SIDEBAR_KEY, String(state.sidebarCollapsed));
    },
    setMobileNav(state, action) {
      state.mobileNavOpen = action.payload;
    },
    setCommandOpen(state, action) {
      state.commandOpen = action.payload;
    },
  },
});

export const { setTheme, setReduceMotion, toggleSidebar, setMobileNav, setCommandOpen } = uiSlice.actions;
export default uiSlice.reducer;
