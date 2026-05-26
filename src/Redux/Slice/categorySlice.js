import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

/* ===========================
   ASYNC THUNKS (via Lambda)
=========================== */

export const fetchCategories = createAsyncThunk(
  "Category/fetchCategories",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Category/Category-Get",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch categories"
      );
    }
  }
);

export const addCategory = createAsyncThunk(
  "Category/addCategory",
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/",               // Lambda root
        categoryData,
        {
          params: {
            endpoint: "/Category/Setup-Category",
          },
        }
      );
      return response.data;
    } catch (error) {
  
      return rejectWithValue(
        error.response?.data || "Failed to add category"
      );
    }
  }
);

export const updateCategory = createAsyncThunk(
  "Category/updateCategory",
  async ({ categoryId, categoryData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "/",               // Lambda root
        categoryData,
        {
          params: {
            endpoint: `/Category/Category-Put/${categoryId}`,
          },
        }
      );
      return response.data;
    } catch (error) {

      return rejectWithValue(
        error.response?.data || "Failed to update category"
      );
    }
  }
);

/* ===========================
   SLICE
=========================== */

const categorySlice = createSlice({
  name: "categories",
  initialState: {
    categories: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Add category
      .addCase(addCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.categories.push(action.payload);
      })
      .addCase(addCategory.rejected, (state, action) => {
        state.loading = false;
     
        state.error = action.payload;
      })

      // Update category
      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.categories.findIndex(
          (category) =>
            category.categoryId === action.payload.categoryId
        );

        if (index !== -1) {
          state.categories[index] = {
            ...state.categories[index],
            ...action.payload,
          };
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
   
        state.error = action.payload;
      });
  },
});

export default categorySlice.reducer;