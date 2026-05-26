import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from './AxiosInstance';

// Small helper to normalize API array responses
const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data; // handles { data: [...] }
  return [];
};

// Consistent error extraction for thunks
const toErrorPayload = (error, fallback) => {
  const server =
    error.response?.data?.message ??
    (typeof error.response?.data === 'string' ? error.response.data : null);
  return server || error.message || fallback;
};

/* ===========================
   ASYNC THUNKS (via Lambda)
=========================== */

// Post a new advertisement (goes through Lambda)
export const postAdvertisment = createAsyncThunk(
  'advertisement/postAdvertisment',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post(
        '/',                     // call Lambda root
        formData,
        {
          params: {
            endpoint: '/Advertisement/PostAdvertisment', // backend endpoint
          },
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, 'Failed to post advertisement'));
    }
  }
);

// Get advertisements by AdsName (excluding index 0)
export const getAdvertisment = createAsyncThunk(
  'advertisement/get',
  async (AdsName, { rejectWithValue }) => {
    try {
      if (!AdsName) throw new Error('AdsName is required');

      const res = await axiosInstance.get('/', {
        params: {
          endpoint: '/Advertisement/GetAdvertisment', // backend endpoint
          AdsName,
        },
      });

      const rows = toArray(res.data);
      const formatted = rows.length > 1 ? rows.slice(1) : [];
      return formatted;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, 'Failed to fetch advertisements'));
    }
  }
);

// Get Home Page advertisements
export const getHomePageAdvertisment = createAsyncThunk(
  'advertisement/getHomePage',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/', {
        params: {
          endpoint: '/Advertisement/GetAdvertisment',
          AdsName: 'Home Page',
        },
      });

      const rows = toArray(res.data);
      const formatted = rows.length > 1 ? rows.slice(1) : [];
      return formatted;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, 'Failed to fetch Home Page advertisements'));
    }
  }
);

// Get Banner Page advertisements
export const getBannerPageAdvertisment = createAsyncThunk(
  'advertisement/getBannerPage',
  async (_, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.get('/', {
        params: {
          endpoint: '/Advertisement/GetAdvertisment',
          AdsName: 'Banner',
        },
      });

      const rows = toArray(res.data);
      const formatted = rows.length > 1 ? rows.slice(1) : [];
      return formatted;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, 'Failed to fetch Banner advertisements'));
    }
  }
);

// Update an existing advertisement
export const putAdvertisment = createAsyncThunk(
  'advertisement/putAdvertisment',
  async ({ Fileid, AdsName, IndexOrder, AdsNote, FileName }, { rejectWithValue }) => {
    try {
      if (!Fileid || !FileName) {
        throw new Error('Fileid and FileName are required.');
      }

      const fileToUpload = FileName?.originFileObj || FileName;

      const formData = new FormData();
      formData.append('FileName', fileToUpload);

      const res = await axiosInstance.post(
        '/',                     // still POST, but via Lambda
        formData,
        {
          params: {
            endpoint: '/Advertisement/PutAdvertisment', // backend endpoint
            Fileid,
            AdsName,
            IndexOrder,
            AdsNote,
          },
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      return res.data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, 'Failed to update advertisement'));
    }
  }
);

/* ===========================
   SLICE
=========================== */

const initialState = {
  advertisments: [],
  loading: false,
  error: null,
};

const advertismentSlice = createSlice({
  name: 'advertisment',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // POST
      .addCase(postAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(postAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) state.advertisments.push(action.payload);
      })
      .addCase(postAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to post advertisement';
      })

      // GET by AdsName
      .addCase(getAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisments = action.payload;
      })
      .addCase(getAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to fetch advertisements';
      })

      // GET Home Page
      .addCase(getHomePageAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHomePageAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisments = action.payload;
      })
      .addCase(getHomePageAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error?.message || 'Failed to fetch Home Page advertisements';
      })

      // GET Banner
      .addCase(getBannerPageAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBannerPageAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        state.advertisments = action.payload;
      })
      .addCase(getBannerPageAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error?.message || 'Failed to fetch Banner advertisements';
      })

      // PUT
      .addCase(putAdvertisment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(putAdvertisment.fulfilled, (state, action) => {
        state.loading = false;
        const idx = state.advertisments.findIndex(
          (ad) => ad.Fileid === action.payload?.Fileid
        );
        if (idx !== -1) state.advertisments[idx] = action.payload;
      })
      .addCase(putAdvertisment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error?.message || 'Failed to update advertisement';
      });
  },
});

export default advertismentSlice.reducer;