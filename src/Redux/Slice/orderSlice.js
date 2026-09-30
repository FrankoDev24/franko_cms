// src/Redux/Slice/orderSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

// Optional helper to normalize error payloads (same pattern as adverts/products)
const toErrorPayload = (error, fallback) => {
  const server =
    error.response?.data?.message ??
    (typeof error.response?.data === "string" ? error.response.data : null);
  return server || error.message || fallback;
};

// Normalize any API payload into a plain array of orders.
// The endpoint does not always return a bare array (see DIAGNOSIS.md §3.4):
// it may wrap results ({ data: [...] } / { orders: [...] }), return a single
// order object, or return null/undefined on an empty 200 response.
export const toOrderArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.orders)) return payload.orders;
  if (Array.isArray(payload?.result)) return payload.result;
  if (
    payload &&
    typeof payload === "object" &&
    (payload.orderCode || payload.OrderCode || payload._id)
  ) {
    return [payload];
  }
  return [];
};

// Unwrap a single-object payload that may be nested under data/result.
const unwrap = (payload) => payload?.data ?? payload?.result ?? payload;

// ---------------------------------------------------------------------------
// Loading / error COMPATIBILITY LAYER
//
// Consumers (OrderDetailsModal, CycleUpdateModal, checkout screens, ...)
// historically treat `state.loading` / `state.error` as plain booleans:
//
//   if (loading) return null;                 // or <Spinner/>
//   disabled={loading}
//   if (error) show error
//
// To keep every one of those consumers working while still exposing
// per-domain flags (loading.orders, loading.salesOrder, ...):
//
//   • when NOTHING is active:  state.loading === false, state.error === null
//   • when something IS active: they become objects with per-domain keys
//
// This is why the details modal went blank when `loading` became a stable
// always-truthy object: `if (loading) return null` never rendered content
// (DIAGNOSIS.md §9).
//
// NEVER assign to state.loading / state.error directly — always go through
// setLoadingFlag / setErrorFlag so the idle value stays falsy and immer never
// sees `false.orders = true` (which throws).
// ---------------------------------------------------------------------------
const setLoadingFlag = (state, key, value) => {
  const current =
    state.loading && typeof state.loading === "object"
      ? state.loading
      : { ...initialLoading };
  const next = { ...current, [key]: value };
  state.loading = Object.values(next).some(Boolean) ? next : false;
};

const setErrorFlag = (state, key, value) => {
  const current =
    state.error && typeof state.error === "object"
      ? state.error
      : { ...initialError };
  const next = { ...current, [key]: value };
  state.error = Object.values(next).some((v) => v != null) ? next : null;
};

const initialLoading = {
  orders: false,
  salesOrder: false,
  checkout: false,
  transition: false,
  lifeCycle: false,
  deliveryAddress: false,
  deliveryUpdate: false,
};

const initialError = {
  orders: null,
  salesOrder: null,
  checkout: null,
  transition: null,
  lifeCycle: null,
  deliveryAddress: null,
  deliveryUpdate: null,
};

// Async thunks
export const fetchOrdersByDate = createAsyncThunk(
  "orders/fetchOrdersByDate",
  async ({ from, to }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: {
          endpoint: `/Order/GetOrdersByDate/${from}/${to}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch orders by date")
      );
    }
  }
);

export const checkOutOrder = createAsyncThunk(
  "orders/checkOutOrder",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        "/",
        payload,
        {
          params: {
            endpoint: "/Order/CheckOutDbCart",
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to checkout order")
      );
    }
  }
);

// Fetch orders by customer/agent
export const fetchOrdersByCustomer = createAsyncThunk(
  "orders/fetchOrdersByCustomerOrAgent",
  async ({ from, to, customerId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: {
          endpoint: "/Order/GetOrderByCustomer",
          from,
          to,
          customerId,
        },
      });
      return data || [];
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch orders")
      );
    }
  }
);

// Fetch orders by third-party agent
export const fetchOrdersByThirdParty = createAsyncThunk(
  "orders/fetchOrdersByThirdParty",
  async ({ from, to, ThirdPartyAccountNumber }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: {
          endpoint: "/Order/GetOrderByThirdParty",
          from,
          to,
          ThirdPartyAccountNumber,
        },
      });
      return data || [];
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch orders")
      );
    }
  }
);

export const updateOrderTransition = createAsyncThunk(
  "orders/updateOrderTransition",
  async ({ CycleName, OrderId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        "/",
        null,
        {
          params: {
            endpoint: `/Order/UpdateOrderTransition/${CycleName}/${OrderId}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to update order transition")
      );
    }
  }
);

export const fetchOrderLifeCycle = createAsyncThunk(
  "orders/fetchOrderLifeCycle",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: {
          endpoint: "/Order/OrderLifeCycle-Get",
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch order lifecycle")
      );
    }
  }
);

export const fetchSalesOrderById = createAsyncThunk(
  "orders/fetchSalesOrderById",
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: {
          endpoint: `/Order/SalesOrderGet/${orderId}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch sales order")
      );
    }
  }
);

export const updateOrderDelivery = createAsyncThunk(
  "orders/updateOrderDelivery",
  async ({ orderCode, ...payload }, { rejectWithValue }) => {
    try {
      const OrderCode = payload?.OrderCode ?? orderCode;
      if (!OrderCode) {
        throw new Error("OrderCode is required.");
      }

      // Include OrderCode in the body with correct casing
      const body = { ...payload, OrderCode };

      const { data } = await axiosInstance.post(
        "/",
        body,
        {
          params: {
            endpoint: `/Order/OrderDeliveryUpdate/${OrderCode}`,
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to update order delivery")
      );
    }
  }
);

export const orderAddress = createAsyncThunk(
  "orders/orderAddress",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post(
        "/",
        payload,
        {
          params: {
            endpoint: "/Order/OrderAddress",
          },
        }
      );
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to update order address")
      );
    }
  }
);

export const fetchOrderDeliveryAddress = createAsyncThunk(
  "orders/fetchOrderDeliveryAddress",
  async (OrderCode, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: {
          endpoint: `/Order/GetOrderDeliveryAddress/${OrderCode}`,
        },
      });
      return data;
    } catch (error) {
      return rejectWithValue(
        toErrorPayload(error, "Failed to fetch delivery address")
      );
    }
  }
);

// Slice
const orderSlice = createSlice({
  name: "order",
  initialState: {
    orders: [],
    salesOrder: [],
    deliveryAddress: [],
    deliveryUpdate: null,
    lifeCycle: null,

    // Result of the last CheckOutDbCart call. NOTE: this used to be written
    // into `state.orders`, which wiped the Orders page list (see DIAGNOSIS.md §5).
    checkoutResult: null,

    checkoutDetails: localStorage.getItem("checkoutDetails") || {},
    orderAddressDetails: localStorage.getItem("orderAddressDetails") || {},

    // { from, to } of the most recent fetchOrdersByDate request — used by the
    // UI to explain which window was searched in the empty state.
    lastFetchMeta: null,

    // Falsy when idle (legacy-compatible), keyed object when active.
    // See the compatibility layer above.
    loading: false,
    error: null,
  },
  reducers: {
    // Clear localStorage and reset state
    clearLocalStorage: (state) => {
      localStorage.removeItem("checkoutDetails");
      localStorage.removeItem("orderAddressDetails");
      localStorage.removeItem("userOrders");
      state.checkoutDetails = null;
      state.orderAddressDetails = null;
      state.orders = [];
    },

    // Save checkout details
    saveCheckoutDetails: (state, action) => {
      const checkoutDetails = action.payload;
      state.checkoutDetails = checkoutDetails;
      localStorage.setItem("checkoutDetails", checkoutDetails);
    },

    // Save order address details
    saveAddressDetails: (state, action) => {
      const orderAddressDetails = action.payload;
      state.orderAddressDetails = orderAddressDetails;
      localStorage.setItem("orderAddressDetails", orderAddressDetails);
    },

    updateOrder: (state, action) => {
      const updated = action.payload;
      const index = state.orders.findIndex((o) => o._id === updated._id);
      if (index !== -1) {
        state.orders[index] = { ...state.orders[index], ...updated };
      }
    },

    // Store the local order
    // WARNING: this overwrites `state.orders` (the API-backed list used by the
    // admin Orders page) with localStorage data. If the two screens share this
    // slice, move this to a separate `localOrders` key (see DIAGNOSIS.md §5/§7).
    storeLocalOrder: (state, action) => {
      const { userId, orderId } = action.payload;
      const storedOrders =
        JSON.parse(localStorage.getItem("userOrders")) || [];

      const existingOrderIndex = storedOrders.findIndex(
        (order) => order.userId === userId && order.orderId === orderId
      );

      if (existingOrderIndex !== -1) {
        storedOrders[existingOrderIndex] = action.payload;
      } else {
        storedOrders.push(action.payload);
      }

      state.orders = storedOrders;
      localStorage.setItem("userOrders", JSON.stringify(storedOrders));
    },

    // Fetch orders by user
    // WARNING: same as storeLocalOrder — writes localStorage data over the
    // API-backed `state.orders` list (see DIAGNOSIS.md §5/§7).
    fetchOrdersByUser: (state, action) => {
      const userId = action.payload;
      const storedOrders =
        JSON.parse(localStorage.getItem("userOrders")) || [];
      state.orders = storedOrders.filter((order) => order.userId === userId);
    },

    // Clear orders
    clearOrders: (state) => {
      state.orders = [];
      state.salesOrder = [];
      state.deliveryAddress = [];
      state.checkoutResult = null;
      state.lastFetchMeta = null;
      // Idle values must stay FALSY — a truthy `{...all false}` object keeps
      // `if (loading) return null` consumers blank forever.
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // -----------------------------------------------------------------
      // Fetch orders by date (the Orders page list)
      // -----------------------------------------------------------------
      .addCase(fetchOrdersByDate.pending, (state, action) => {
        setLoadingFlag(state, "orders", true);
        setErrorFlag(state, "orders", null);
        state.lastFetchMeta = action.meta?.arg ?? null;
      })
      .addCase(fetchOrdersByDate.fulfilled, (state, action) => {
        setLoadingFlag(state, "orders", false);
        setErrorFlag(state, "orders", null);
        // Normalize: the endpoint is not guaranteed to return a bare array.
        state.orders = toOrderArray(action.payload);
      })
      .addCase(fetchOrdersByDate.rejected, (state, action) => {
        setLoadingFlag(state, "orders", false);
        // Surface the failure — previously it was swallowed and the UI showed
        // "No orders found" for what was really a failed request.
        // Keep the previous `orders` so a refetch failure doesn't blank the list.
        setErrorFlag(
          state,
          "orders",
          action.payload ||
            action.error?.message ||
            "Failed to fetch orders by date"
        );
      })

      // -----------------------------------------------------------------
      // Order lifecycle transition (Update Cycle)
      // -----------------------------------------------------------------
      .addCase(updateOrderTransition.pending, (state) => {
        setLoadingFlag(state, "transition", true);
        setErrorFlag(state, "transition", null);
      })
      .addCase(updateOrderTransition.fulfilled, (state, action) => {
        setLoadingFlag(state, "transition", false);
        const updatedOrder = unwrap(action.payload) || {};
        const updatedCode =
          updatedOrder.orderCode ?? updatedOrder.OrderCode ?? updatedOrder._id;
        const index = state.orders.findIndex(
          (order) =>
            (order.orderCode ?? order.OrderCode ?? order._id) === updatedCode
        );
        if (index !== -1) {
          state.orders[index] = { ...state.orders[index], ...updatedOrder };
        }
      })
      .addCase(updateOrderTransition.rejected, (state, action) => {
        setLoadingFlag(state, "transition", false);
        setErrorFlag(
          state,
          "transition",
          action.payload ||
            action.error?.message ||
            "Error updating order lifecycle"
        );
      })

      // -----------------------------------------------------------------
      // Order lifecycle catalog
      // -----------------------------------------------------------------
      .addCase(fetchOrderLifeCycle.pending, (state) => {
        setLoadingFlag(state, "lifeCycle", true);
        setErrorFlag(state, "lifeCycle", null);
      })
      .addCase(fetchOrderLifeCycle.fulfilled, (state, action) => {
        setLoadingFlag(state, "lifeCycle", false);
        state.lifeCycle = action.payload;
      })
      .addCase(fetchOrderLifeCycle.rejected, (state, action) => {
        setLoadingFlag(state, "lifeCycle", false);
        setErrorFlag(state, "lifeCycle", action.payload);
      })

      // -----------------------------------------------------------------
      // Checkout
      // -----------------------------------------------------------------
      .addCase(checkOutOrder.pending, (state) => {
        setLoadingFlag(state, "checkout", true);
        setErrorFlag(state, "checkout", null);
      })
      .addCase(checkOutOrder.fulfilled, (state, action) => {
        setLoadingFlag(state, "checkout", false);
        // Do NOT write this over `state.orders` — that wiped the Orders page.
        // Consumers of the checkout response should read `state.orders.checkoutResult`.
        state.checkoutResult = action.payload;
      })
      .addCase(checkOutOrder.rejected, (state, action) => {
        setLoadingFlag(state, "checkout", false);
        setErrorFlag(
          state,
          "checkout",
          action.payload ||
            action.error?.message ||
            "Failed to checkout order"
        );
      })

      // -----------------------------------------------------------------
      // Order address / delivery
      // -----------------------------------------------------------------
      .addCase(orderAddress.pending, (state) => {
        setLoadingFlag(state, "deliveryAddress", true);
        setErrorFlag(state, "deliveryAddress", null);
      })
      .addCase(orderAddress.fulfilled, (state, action) => {
        setLoadingFlag(state, "deliveryAddress", false);
        state.deliveryAddress = action.payload;
      })
      .addCase(orderAddress.rejected, (state, action) => {
        setLoadingFlag(state, "deliveryAddress", false);
        setErrorFlag(state, "deliveryAddress", action.payload);
      })
      .addCase(fetchOrderDeliveryAddress.fulfilled, (state, action) => {
        if (action.payload) {
          state.deliveryAddress = action.payload;
        } else {
          state.deliveryAddress = null;
        }
      })
      .addCase(fetchOrderDeliveryAddress.rejected, (state, action) => {
        // Was `state.error = action.payload` — clobbered the whole error field.
        setErrorFlag(state, "deliveryAddress", action.payload);
      })
      .addCase(updateOrderDelivery.pending, (state) => {
        setLoadingFlag(state, "deliveryUpdate", true);
        setErrorFlag(state, "deliveryUpdate", null);
      })
      .addCase(updateOrderDelivery.fulfilled, (state, action) => {
        setLoadingFlag(state, "deliveryUpdate", false);
        state.deliveryUpdate = action.payload;
      })
      .addCase(updateOrderDelivery.rejected, (state, action) => {
        setLoadingFlag(state, "deliveryUpdate", false);
        setErrorFlag(
          state,
          "deliveryUpdate",
          action.payload ||
            action.error?.message ||
            "Failed to update order delivery"
        );
      })

      // -----------------------------------------------------------------
      // Sales order details (View Details modal)
      // The payload is stored RAW on purpose — OrderDetailsModal already knows
      // this shape. Only the loading/error bookkeeping changed.
      // -----------------------------------------------------------------
      .addCase(fetchSalesOrderById.pending, (state) => {
        setLoadingFlag(state, "salesOrder", true);
        setErrorFlag(state, "salesOrder", null);
      })
      .addCase(fetchSalesOrderById.fulfilled, (state, action) => {
        setLoadingFlag(state, "salesOrder", false);
        state.salesOrder = action.payload;
      })
      .addCase(fetchSalesOrderById.rejected, (state, action) => {
        setLoadingFlag(state, "salesOrder", false);
        setErrorFlag(
          state,
          "salesOrder",
          action.payload || "Failed to fetch sales order"
        );
      })

      // -----------------------------------------------------------------
      // Customer / third-party lists
      // -----------------------------------------------------------------
      .addCase(fetchOrdersByCustomer.pending, (state) => {
        setLoadingFlag(state, "orders", true);
        setErrorFlag(state, "orders", null);
      })
      .addCase(fetchOrdersByCustomer.fulfilled, (state, action) => {
        setLoadingFlag(state, "orders", false);
        state.orders = toOrderArray(action.payload);
      })
      .addCase(fetchOrdersByCustomer.rejected, (state, action) => {
        setLoadingFlag(state, "orders", false);
        setErrorFlag(
          state,
          "orders",
          action.payload ||
            action.error?.message ||
            "Failed to fetch orders"
        );
      })
      .addCase(fetchOrdersByThirdParty.pending, (state) => {
        setLoadingFlag(state, "orders", true);
        setErrorFlag(state, "orders", null);
      })
      .addCase(fetchOrdersByThirdParty.fulfilled, (state, action) => {
        setLoadingFlag(state, "orders", false);
        state.orders = toOrderArray(action.payload);
      })
      .addCase(fetchOrdersByThirdParty.rejected, (state, action) => {
        setLoadingFlag(state, "orders", false);
        setErrorFlag(
          state,
          "orders",
          action.payload ||
            action.error?.message ||
            "Failed to fetch orders"
        );
      });
  },
});

export const {
  storeLocalOrder,
  fetchOrdersByUser,
  clearOrders,
  saveCheckoutDetails,
  updateOrder,
  saveAddressDetails,
  clearLocalStorage,
} = orderSlice.actions;

export default orderSlice.reducer;
