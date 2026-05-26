import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from './AxiosInstance'; // Lambda-based Axios instance

/* ===========================
   ASYNC THUNKS (via Lambda)
=========================== */

// Fetch all showrooms
export const fetchShowrooms = createAsyncThunk(
  'showrooms/fetchShowrooms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/', {
        params: { endpoint: '/ShowRoom/Get-ShowRoom' },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch showrooms');
    }
  }
);

// Fetch home page showrooms
export const fetchHomePageShowrooms = createAsyncThunk(
  'showrooms/fetchHomePageShowrooms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/', {
        params: { endpoint: '/ShowRoom/Get-HomePageShowRoom' },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch home page showrooms'
      );
    }
  }
);

// Add a new showroom
export const addShowroom = createAsyncThunk(
  'showrooms/addShowroom',
  async (showroomData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        '/',                     // Lambda root
        showroomData,
        {
          params: { endpoint: '/ShowRoom/Setup-Showroom' },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add showroom');
    }
  }
);

// Update an existing showroom
export const updateShowroom = createAsyncThunk(
  'showrooms/updateShowroom',
  async ({ Showroomid, ...showroomData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        '/',                     // Lambda root
        showroomData,
        {
          params: { endpoint: `/ShowRoom/Showroom-Put/${Showroomid}` },
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update showroom');
    }
  }
);

/* ===========================
   SLICE
=========================== */

const showroomSlice = createSlice({
  name: 'showrooms',
  initialState: {
    showrooms: [],
    homePageShowrooms: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearShowrooms: (state) => {
      state.showrooms = [];
      state.homePageShowrooms = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchShowrooms
      .addCase(fetchShowrooms.pending, (state) => { state.loading = true; })
      .addCase(fetchShowrooms.fulfilled, (state, action) => {
        state.loading = false;
        state.showrooms = action.payload;
      })
      .addCase(fetchShowrooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchHomePageShowrooms
      .addCase(fetchHomePageShowrooms.pending, (state) => { state.loading = true; })
      .addCase(fetchHomePageShowrooms.fulfilled, (state, action) => {
        state.loading = false;
        state.homePageShowrooms = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchHomePageShowrooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // addShowroom
      .addCase(addShowroom.pending, (state) => { state.loading = true; })
      .addCase(addShowroom.fulfilled, (state, action) => {
        state.loading = false;
        state.showrooms.push(action.payload);
      })
      .addCase(addShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // updateShowroom
      .addCase(updateShowroom.pending, (state) => { state.loading = true; })
      .addCase(updateShowroom.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.showrooms.findIndex(
          (showroom) => showroom.showRoomID === action.payload.showRoomID
        );
        if (index !== -1) {
          state.showrooms[index] = action.payload;
        }
      })
      .addCase(updateShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

/* ===========================
   EXPORTS
=========================== */

export const { clearShowrooms } = showroomSlice.actions;
export default showroomSlice.reducer;