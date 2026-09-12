import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi } from '@/services';
import { refreshSession, setAccessToken } from '@/services/api';
import { getErrorMessage } from '@/utils/errors';

/** Restores the session on page load using the httpOnly refresh cookie. */
export const bootstrapSession = createAsyncThunk('auth/bootstrap', async () => {
  try {
    const { user } = await refreshSession();
    return user;
  } catch {
    return null;
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials);
    setAccessToken(res.data.accessToken);
    return res.data.user;
  } catch (error) {
    return rejectWithValue({ message: getErrorMessage(error), errors: error.response?.data?.errors });
  }
});

export const register = createAsyncThunk('auth/register', async (body, { rejectWithValue }) => {
  try {
    const res = await authApi.register(body);
    setAccessToken(res.data.accessToken);
    return res.data.user;
  } catch (error) {
    return rejectWithValue({ message: getErrorMessage(error), errors: error.response?.data?.errors });
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } finally {
    setAccessToken(null);
  }
});

const initialState = {
  user: null,
  status: 'idle', // idle | loading | authenticated | unauthenticated
  initialized: false,
  sessionMessage: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      if (action.payload) state.status = 'authenticated';
    },
    sessionExpired(state, action) {
      state.user = null;
      state.status = 'unauthenticated';
      state.sessionMessage =
        action.payload === 'blocked'
          ? 'Your account has been blocked. Please contact support.'
          : 'Your session has expired. Please sign in again.';
    },
    clearSessionMessage(state) {
      state.sessionMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'unauthenticated';
        state.initialized = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.initialized = true;
        state.sessionMessage = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.initialized = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
        state.status = 'unauthenticated';
      });
  },
});

export const { setUser, sessionExpired, clearSessionMessage } = authSlice.actions;
export const selectUser = (s) => s.auth.user;
export const selectIsAdmin = (s) => s.auth.user?.role === 'admin';
export default authSlice.reducer;
