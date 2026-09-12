import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit';
import { metaApi } from '@/services';

/** Catalog data: vehicle types, fuel types, maintenance categories. */
export const fetchMeta = createAsyncThunk(
  'meta/fetch',
  async () => (await metaApi.get()).data,
  { condition: (force, { getState }) => force === true || getState().meta.status === 'idle' || getState().meta.status === 'failed' }
);

const metaSlice = createSlice({
  name: 'meta',
  initialState: { vehicleTypes: [], fuelTypes: [], categories: [], status: 'idle' },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMeta.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMeta.fulfilled, (state, action) => ({ ...state, ...action.payload, status: 'ready' }))
      .addCase(fetchMeta.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

const byCode = (list) => Object.fromEntries(list.map((item) => [item.code, item]));
export const selectVehicleTypeMap = createSelector([(s) => s.meta.vehicleTypes], byCode);
export const selectFuelTypeMap = createSelector([(s) => s.meta.fuelTypes], byCode);
export const selectCategoryMap = createSelector([(s) => s.meta.categories], (list) =>
  Object.fromEntries(list.map((c) => [c._id, c]))
);
export default metaSlice.reducer;
