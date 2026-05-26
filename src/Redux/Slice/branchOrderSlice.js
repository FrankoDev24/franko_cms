import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import axios from "axios"

// -------------------- CONSTANTS --------------------
const API_BASE_URL = "https://ftetpsapi.salesmate.app/"
const API_KEY = "462a06ad-6bcd-4ecf-ba68-b11d875e9b3f"

const DEFAULT_BCODE = "855"
const DEFAULT_CUSTOMER_ACCOUNT = 20985623

// -------------------- HELPERS --------------------
const normalizeName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()

// -------------------- ASYNC THUNK --------------------
export const addBranchOrder = createAsyncThunk(
  "branchOrders/addBranchOrder",
  async (payload, { getState, rejectWithValue }) => {
    try {
      const {
        orderCode,
        items,
        deliveryAddress,
        geolocation = null,
        bCode = DEFAULT_BCODE,
        orderDate = new Date().toISOString().split("T")[0],
        customerAccountNumber = DEFAULT_CUSTOMER_ACCOUNT,
      } = payload || {}

      // ---------- VALIDATION ----------
      if (!orderCode) throw new Error("orderCode is required")
      if (!deliveryAddress) throw new Error("deliveryAddress is required")
      if (!Array.isArray(items) || items.length === 0)
        throw new Error("items must be a non-empty array")

      // ---------- BRANCH PRODUCT LOOKUP ----------
      const branchProducts = getState()?.branchProducts?.data || []

      const productCodeByName = new Map()
      branchProducts.forEach((p) => {
        if (p?.productName && p?.productCode) {
          productCodeByName.set(
            normalizeName(p.productName),
            String(p.productCode)
          )
        }
      })

      // ---------- BUILD API PAYLOAD ----------
      const orderLines = items.map((item) => {
        const quantity = Number(item?.quantity)

        if (!quantity || quantity <= 0) {
          throw new Error("Invalid quantity in order items")
        }

        // priority:
        // 1. productId2 (branch product code)
        // 2. productCode
        // 3. lookup by productName
        let productId =
          item?.productId2 ||
          item?.productCode ||
          (item?.productName
            ? productCodeByName.get(normalizeName(item.productName))
            : null)

        if (!productId) {
          throw new Error(
            `Missing branch product code for "${item?.productName ?? "unknown"}"`
          )
        }

        return {
          orderRefrenceNumber: orderCode,
          productId: String(productId),
          quantity,
          deliveryAddress,
          geolocation,
          bCode: String(bCode),
          orderDate,
        }
      })

      // ---------- API CALL ----------
      const response = await axios.post(
        `${API_BASE_URL}CTP001_3_PO/AddOrder`,
        orderLines,
        {
          headers: {
            "x-api-key": API_KEY,
            CustomerAccountNumber: customerAccountNumber,
          },
        }
      )

      return {
        response: response.data,
        sentLines: orderLines,
      }
    } catch (error) {
      return rejectWithValue(
        error?.response?.data ||
          error?.message ||
          "Failed to submit branch order"
      )
    }
  }
)

// -------------------- SLICE --------------------
const branchOrderSlice = createSlice({
  name: "branchOrders",
  initialState: {
    loading: false,
    error: null,
    lastPostResponse: null,
    lastPostedLines: null,
  },
  reducers: {
    clearBranchOrderState: (state) => {
      state.loading = false
      state.error = null
      state.lastPostResponse = null
      state.lastPostedLines = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addBranchOrder.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(addBranchOrder.fulfilled, (state, action) => {
        state.loading = false
        state.lastPostResponse = action.payload.response
        state.lastPostedLines = action.payload.sentLines
      })
      .addCase(addBranchOrder.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
  },
})

// -------------------- EXPORTS --------------------
export const { clearBranchOrderState } = branchOrderSlice.actions
export default branchOrderSlice.reducer
