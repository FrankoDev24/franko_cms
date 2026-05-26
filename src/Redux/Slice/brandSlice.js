import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

/* ============================
   FETCH BRANDS (via Lambda)
============================ */
export const fetchBrands = createAsyncThunk(
  "brand/fetchBrands",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Brand/Get-Brand",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch brands"
      );
    }
  }
);

/* ============================
   ADD BRAND (via Lambda)
============================ */
export const addBrand = createAsyncThunk(
  "brand/addBrand",
  async (brandData, { rejectWithValue }) => {
    try {
      // Maintain original validations
      if (!brandData.get("BrandName"))
        throw new Error("BrandName is required.");
      if (!brandData.get("CategoryId"))
        throw new Error("CategoryId is required.");
      if (!brandData.get("LogoName"))
        throw new Error("LogoName is required.");

      const response = await axiosInstance.post(
        "/",           // Lambda root
        brandData,
        {
          params: {
            endpoint: "/Brand/Setup-Brand",
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to add brand"
      );
    }
  }
);

/* ============================
   UPDATE BRAND (via Lambda)
============================ */
export const updateBrand = createAsyncThunk(
  "brand/updateBrand",
  async ({ id, formData }, { rejectWithValue }) => {
    try {
      if (!id) {
        throw new Error("Brand ID is required to update the brand.");
      }

      const response = await axiosInstance.post(
        "/",           // Lambda root
        formData,
        {
          params: {
            endpoint: `/Brand/Put-Brand/${id}`,
          },
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to update brand"
      );
    }
  }
);

/* ============================
   SLICE
============================ */
const brandSlice = createSlice({
  name: "brands",
  initialState: {
    brands: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch brands
      .addCase(fetchBrands.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        state.loading = false;
        state.brands = action.payload;
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Add brand
      .addCase(addBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.brands.push(action.payload);
      })
      .addCase(addBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update brand
      .addCase(updateBrand.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBrand.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.brands.findIndex(
          (brand) => brand.brandId === action.payload.brandId
        );
        if (index !== -1) {
          state.brands[index] = action.payload;
        }
      })
      .addCase(updateBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      });
  },
});

export default brandSlice.reducer;