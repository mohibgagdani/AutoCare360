import { configureStore } from '@reduxjs/toolkit';
import authReducer, { sessionExpired, setUser } from './authSlice';
import uiReducer from './uiSlice';
import metaReducer from './metaSlice';
import notificationReducer from './notificationSlice';
import { configureSession } from '@/services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    meta: metaReducer,
    notifications: notificationReducer,
  },
});

// Wire the API layer's session events into the store.
configureSession({
  expired: (reason) => store.dispatch(sessionExpired(reason)),
  refreshed: ({ user }) => {
    if (user) store.dispatch(setUser(user));
  },
});
