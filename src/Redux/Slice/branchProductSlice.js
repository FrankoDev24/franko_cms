import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

const API_BASE_URL = "https://ftetpsapi.salesmate.app/"
const BRANCH_CODE = 855
const API_KEY = "462a06ad-6bcd-4ecf-ba68-b11d875e9b3f"

// Async thunk (NO params needed)
export const fetchBranchProducts = createAsyncThunk(
  "branchProducts/fetchBranchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}CTP001_3_PO/GetProductByBranch`,
        {
          params: {
            BranchCode: BRANCH_CODE
          },
          headers: {
            "x-api-key": API_KEY
          }
        }
      )

      return response.data
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Failed to fetch branch products"
      )
    }
  }
)

const branchProductSlice = createSlice({
  name: "branchProducts",
  initialState: {
    data: [],
    loading: false,
    error: null
  },
  reducers: {
    clearBranchProducts: (state) => {
      state.data = []
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranchProducts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBranchProducts.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(fetchBranchProducts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  }
})

export const { clearBranchProducts } = branchProductSlice.actions
export default branchProductSlice.reducer
