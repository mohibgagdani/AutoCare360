import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { notificationApi } from '@/services';

export const fetchUnreadCount = createAsyncThunk('notifications/unread', async () => {
  const res = await notificationApi.unreadCount();
  return res.data.count;
});

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { unread: 0 },
  reducers: {
    setUnread(state, action) {
      state.unread = Math.max(0, action.payload);
    },
    decrementUnread(state) {
      state.unread = Math.max(0, state.unread - 1);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unread = action.payload;
    });
  },
});

export const { setUnread, decrementUnread } = notificationSlice.actions;
export default notificationSlice.reducer;
