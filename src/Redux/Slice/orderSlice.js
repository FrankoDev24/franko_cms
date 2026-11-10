// src/Redux/Slice/orderSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import dayjs from "dayjs";
import axiosInstance from "./AxiosInstance";

/* --------------------------------------------------------------------------
   ✅ ROOT-CAUSE FIX for "timeout of 30000ms exceeded" while Network shows 200:

   The shared axios instance aborts at 30s. GetOrdersByDate for a whole month
   can take longer than that to stream its body, so axios rejects BEFORE the
   200 response finishes downloading.

   Fix strategy (list endpoint only):
     • Override `timeout` per request (request config wins over instance config).
     • Split the range into small chunks so each response is fast.
     • Retry a failed chunk once (GET is idempotent).
     • Push each chunk into the store as it arrives → the table fills
       progressively instead of waiting for the slowest window.
   -------------------------------------------------------------------------- */
const LIST_TIMEOUT_MS = 90000; // was effectively 30000 via the instance
const LIST_RETRIES = 1;        // one extra attempt per chunk
const CHUNK_DAYS = 7;          // weekly windows
const MAX_PARALLEL = 3;        // don't hammer the API

const toErrorPayload = (error, fallback) => {
  const server =
    error?.response?.data?.message ??
    (typeof error?.response?.data === "string" ? error.response.data : null);
  return server || error?.message || fallback;
};

// Normalize any API payload into a plain array of orders.
export const toOrderArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const candidates = [
    payload.data, payload.orders, payload.result,
    payload.Data, payload.Orders, payload.Result,
    payload.data?.orders, payload.data?.data, payload.result?.orders,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  if (payload.orderCode || payload.OrderCode || payload._id) return [payload];
  return [];
};

const unwrap = (payload) => payload?.data ?? payload?.result ?? payload;

// Stable identity for dedupe across chunks (never depend on orderCode existing).
const orderKey = (o) =>
  o?.orderCode ?? o?.OrderCode ?? o?._id ?? o?.id ??
  `${o?.fullName ?? ""}|${o?.orderDate ?? ""}|${o?.contactNumber ?? ""}`;

const isCanceled = (e) =>
  e?.code === "ERR_CANCELED" ||
  e?.name === "CanceledError" ||
  e?.name === "AbortError";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// `to` is exclusive (callers pass end + 1 day) — keep that semantics.
const buildChunks = (from, to) => {
  const start = dayjs(from);
  const end = dayjs(to);
  if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
    return [[from, to]];
  }
  const chunks = [];
  let cur = start;
  while (cur.isBefore(end)) {
    const next = cur.add(CHUNK_DAYS, "day");
    const chunkEnd = next.isAfter(end) ? end : next;
    chunks.push([cur.format("YYYY-MM-DD"), chunkEnd.format("YYYY-MM-DD")]);
    cur = chunkEnd;
  }
  return chunks;
};

const fetchChunk = async (from, to, signal) => {
  let lastErr;
  for (let attempt = 0; attempt <= LIST_RETRIES; attempt++) {
    try {
      const { data } = await axiosInstance.get("/", {
        params: { endpoint: `/Order/GetOrdersByDate/${from}/${to}` },
        timeout: LIST_TIMEOUT_MS, // ✅ overrides the instance's 30000
        signal,
      });
      return data;
    } catch (e) {
      if (isCanceled(e) || signal?.aborted) throw e;
      lastErr = e;
      if (attempt < LIST_RETRIES) await sleep(700 * (attempt + 1));
    }
  }
  throw lastErr;
};

/* --------------------------------------------------------------------------
   Loading / error COMPATIBILITY LAYER (unchanged contract):
   idle → loading === false, error === null; active → keyed objects.
   Always mutate through these helpers so immer never sees `false.orders = true`.
   -------------------------------------------------------------------------- */
const initialLoading = {
  orders: false, salesOrder: false, checkout: false, transition: false,
  lifeCycle: false, deliveryAddress: false, deliveryAddressFetch: false,
  deliveryUpdate: false,
};

const initialError = {
  orders: null, salesOrder: null, checkout: null, transition: null,
  lifeCycle: null, deliveryAddress: null, deliveryAddressFetch: null,
  deliveryUpdate: null,
};

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

/* --------------------------------------------------------------------------
   Thunks
   -------------------------------------------------------------------------- */
export const fetchOrdersByDate = createAsyncThunk(
  "orders/fetchOrdersByDate",
  async ({ from, to }, { dispatch, signal, requestId, rejectWithValue }) => {
    const chunks = buildChunks(from, to);
    let cursor = 0;
    let done = 0;
    let okChunks = 0;
    const failures = [];

    const worker = async () => {
      while (cursor < chunks.length) {
        const [cFrom, cTo] = chunks[cursor++];
        let incoming = [];
        try {
          const data = await fetchChunk(cFrom, cTo, signal);
          incoming = toOrderArray(data);
          okChunks++;
        } catch (e) {
          if (isCanceled(e) || signal.aborted) throw e; // superseded / unmounted
          failures.push(e);
        }
        done++;
        // ✅ Progressive update: rows show up as each window resolves.
        dispatch(
          orderSlice.actions.ordersChunkResult({
            requestId, orders: incoming, done, total: chunks.length,
          })
        );
      }
    };

    try {
      await Promise.all(
        Array.from({ length: Math.min(MAX_PARALLEL, chunks.length) }, worker)
      );
    } catch {
      return rejectWithValue({ aborted: true, message: "Request cancelled" });
    }

    if (okChunks === 0 && failures.length) {
      return rejectWithValue(
        toErrorPayload(failures[0], "Failed to fetch orders by date")
      );
    }
    return { from, to, failedChunks: failures.length, totalChunks: chunks.length };
  }
);

export const checkOutOrder = createAsyncThunk(
  "orders/checkOutOrder",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/", payload, {
        params: { endpoint: "/Order/CheckOutDbCart" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to checkout order"));
    }
  }
);

export const fetchOrdersByCustomer = createAsyncThunk(
  "orders/fetchOrdersByCustomerOrAgent",
  async ({ from, to, customerId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: { endpoint: "/Order/GetOrderByCustomer", from, to, customerId },
        timeout: LIST_TIMEOUT_MS,
      });
      return data || [];
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch orders"));
    }
  }
);

export const fetchOrdersByThirdParty = createAsyncThunk(
  "orders/fetchOrdersByThirdParty",
  async ({ from, to, ThirdPartyAccountNumber }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: { endpoint: "/Order/GetOrderByThirdParty", from, to, ThirdPartyAccountNumber },
        timeout: LIST_TIMEOUT_MS,
      });
      return data || [];
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch orders"));
    }
  }
);

export const updateOrderTransition = createAsyncThunk(
  "orders/updateOrderTransition",
  async ({ CycleName, OrderId }, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/", null, {
        params: { endpoint: `/Order/UpdateOrderTransition/${CycleName}/${OrderId}` },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to update order transition"));
    }
  }
);

export const fetchOrderLifeCycle = createAsyncThunk(
  "orders/fetchOrderLifeCycle",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: { endpoint: "/Order/OrderLifeCycle-Get" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch order lifecycle"));
    }
  }
);

export const fetchSalesOrderById = createAsyncThunk(
  "orders/fetchSalesOrderById",
  async (orderId, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.get("/", {
        params: { endpoint: `/Order/SalesOrderGet/${orderId}` },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch sales order"));
    }
  }
);

export const updateOrderDelivery = createAsyncThunk(
  "orders/updateOrderDelivery",
  async ({ orderCode, ...payload }, { rejectWithValue }) => {
    try {
      const OrderCode = payload?.OrderCode ?? orderCode;
      if (!OrderCode) throw new Error("OrderCode is required.");
      const body = { ...payload, OrderCode };
      const { data } = await axiosInstance.post("/", body, {
        params: { endpoint: `/Order/OrderDeliveryUpdate/${OrderCode}` },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to update order delivery"));
    }
  }
);

export const orderAddress = createAsyncThunk(
  "orders/orderAddress",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await axiosInstance.post("/", payload, {
        params: { endpoint: "/Order/OrderAddress" },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to update order address"));
    }
  }
);

export const fetchOrderDeliveryAddress = createAsyncThunk(
  "orders/fetchOrderDeliveryAddress",
  async (OrderCode, { rejectWithValue }) => {
    try {
      if (!OrderCode) throw new Error("OrderCode is required.");
      const { data } = await axiosInstance.get("/", {
        params: { endpoint: `/Order/GetOrderDeliveryAddress/${OrderCode}` },
      });
      return data;
    } catch (error) {
      return rejectWithValue(toErrorPayload(error, "Failed to fetch delivery address"));
    }
  }
);

/* --------------------------------------------------------------------------
   Slice
   -------------------------------------------------------------------------- */
const orderSlice = createSlice({
  name: "order",
  initialState: {
    orders: [],
    salesOrder: [],
    deliveryAddress: [],
    deliveryUpdate: null,
    lifeCycle: null,
    checkoutResult: null,
    checkoutDetails: localStorage.getItem("checkoutDetails") || {},
    orderAddressDetails: localStorage.getItem("orderAddressDetails") || {},
    lastFetchMeta: null,

    // ✅ NEW: chunked-fetch bookkeeping
    activeRequestId: null,   // stale chunks/rejections are ignored
    ordersProgress: null,    // { done, total } while loading
    ordersWarning: null,     // partial-failure message (non-blocking)

    loading: false,
    error: null,
  },
  reducers: {
    // Internal: merge one chunk into the list (deduped), update progress.
    ordersChunkResult: (state, action) => {
      const { requestId, orders: incoming, done, total } = action.payload;
      if (requestId !== state.activeRequestId) return; // stale response
      state.ordersProgress = { done, total };
      if (incoming?.length) {
        const map = new Map();
        state.orders.forEach((o) => map.set(orderKey(o), o));
        incoming.forEach((o) => {
          const k = orderKey(o);
          if (!map.has(k)) map.set(k, o);
        });
        state.orders = Array.from(map.values());
      }
    },

    clearLocalStorage: (state) => {
      localStorage.removeItem("checkoutDetails");
      localStorage.removeItem("orderAddressDetails");
      localStorage.removeItem("userOrders");
      state.checkoutDetails = null;
      state.orderAddressDetails = null;
      state.orders = [];
    },

    saveCheckoutDetails: (state, action) => {
      state.checkoutDetails = action.payload;
      localStorage.setItem("checkoutDetails", action.payload);
    },

    saveAddressDetails: (state, action) => {
      state.orderAddressDetails = action.payload;
      localStorage.setItem("orderAddressDetails", action.payload);
    },

    updateOrder: (state, action) => {
      const updated = action.payload;
      const index = state.orders.findIndex((o) => o._id === updated._id);
      if (index !== -1) {
        state.orders[index] = { ...state.orders[index], ...updated };
      }
    },

    // WARNING: overwrites the API-backed list with localStorage data.
    storeLocalOrder: (state, action) => {
      const { userId, orderId } = action.payload;
      const storedOrders = JSON.parse(localStorage.getItem("userOrders")) || [];
      const idx = storedOrders.findIndex(
        (o) => o.userId === userId && o.orderId === orderId
      );
      if (idx !== -1) storedOrders[idx] = action.payload;
      else storedOrders.push(action.payload);
      state.orders = storedOrders;
      localStorage.setItem("userOrders", JSON.stringify(storedOrders));
    },

    fetchOrdersByUser: (state, action) => {
      const userId = action.payload;
      const storedOrders = JSON.parse(localStorage.getItem("userOrders")) || [];
      state.orders = storedOrders.filter((o) => o.userId === userId);
    },

    clearOrders: (state) => {
      state.orders = [];
      state.salesOrder = [];
      state.deliveryAddress = [];
      state.checkoutResult = null;
      state.lastFetchMeta = null;
      state.activeRequestId = null;
      state.ordersProgress = null;
      state.ordersWarning = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---------------- Orders list (chunked) ----------------
      .addCase(fetchOrdersByDate.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
        setLoadingFlag(state, "orders", true);
        setErrorFlag(state, "orders", null);
        state.ordersWarning = null;
        state.ordersProgress = null;
        state.orders = []; // fresh range → don't mix old windows in
        state.lastFetchMeta = action.meta.arg ?? null;
      })
      .addCase(fetchOrdersByDate.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        setLoadingFlag(state, "orders", false);
        setErrorFlag(state, "orders", null);
        state.ordersProgress = null;
        const { failedChunks = 0, totalChunks = 0 } = action.payload || {};
        state.ordersWarning =
          failedChunks > 0
            ? `${failedChunks} of ${totalChunks} date ranges failed to load. Some orders may be missing — press Retry.`
            : null;
      })
      .addCase(fetchOrdersByDate.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        setLoadingFlag(state, "orders", false);
        state.ordersProgress = null;
        if (action.payload?.aborted) return; // superseded/unmounted → silent
        setErrorFlag(
          state,
          "orders",
          (typeof action.payload === "string" ? action.payload : action.payload?.message) ||
            action.error?.message ||
            "Failed to fetch orders by date"
        );
        // Keep whatever chunks already arrived.
      })

      // ---------------- Cycle transition ----------------
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
          (o) => (o.orderCode ?? o.OrderCode ?? o._id) === updatedCode
        );
        if (index !== -1) {
          state.orders[index] = { ...state.orders[index], ...updatedOrder };
        }
      })
      .addCase(updateOrderTransition.rejected, (state, action) => {
        setLoadingFlag(state, "transition", false);
        setErrorFlag(state, "transition",
          action.payload || action.error?.message || "Error updating order lifecycle");
      })

      // ---------------- Lifecycle catalog ----------------
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

      // ---------------- Checkout ----------------
      .addCase(checkOutOrder.pending, (state) => {
        setLoadingFlag(state, "checkout", true);
        setErrorFlag(state, "checkout", null);
      })
      .addCase(checkOutOrder.fulfilled, (state, action) => {
        setLoadingFlag(state, "checkout", false);
        state.checkoutResult = action.payload; // never overwrite state.orders
      })
      .addCase(checkOutOrder.rejected, (state, action) => {
        setLoadingFlag(state, "checkout", false);
        setErrorFlag(state, "checkout",
          action.payload || action.error?.message || "Failed to checkout order");
      })

      // ---------------- Address / delivery ----------------
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

      .addCase(fetchOrderDeliveryAddress.pending, (state) => {
        setLoadingFlag(state, "deliveryAddressFetch", true);
        setErrorFlag(state, "deliveryAddressFetch", null);
      })
      .addCase(fetchOrderDeliveryAddress.fulfilled, (state, action) => {
        setLoadingFlag(state, "deliveryAddressFetch", false);
        setErrorFlag(state, "deliveryAddressFetch", null);
        state.deliveryAddress = action.payload ?? null;
      })
      .addCase(fetchOrderDeliveryAddress.rejected, (state, action) => {
        setLoadingFlag(state, "deliveryAddressFetch", false);
        setErrorFlag(state, "deliveryAddressFetch",
          action.payload || action.error?.message || "Failed to fetch delivery address");
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
        setErrorFlag(state, "deliveryUpdate",
          action.payload || action.error?.message || "Failed to update order delivery");
      })

      // ---------------- Sales order details ----------------
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
        setErrorFlag(state, "salesOrder", action.payload || "Failed to fetch sales order");
      })

      // ---------------- Customer / third-party lists ----------------
      .addCase(fetchOrdersByCustomer.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId; // invalidate stale chunks
        setLoadingFlag(state, "orders", true);
        setErrorFlag(state, "orders", null);
      })
      .addCase(fetchOrdersByCustomer.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        setLoadingFlag(state, "orders", false);
        state.orders = toOrderArray(action.payload);
      })
      .addCase(fetchOrdersByCustomer.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        setLoadingFlag(state, "orders", false);
        setErrorFlag(state, "orders",
          action.payload || action.error?.message || "Failed to fetch orders");
      })
      .addCase(fetchOrdersByThirdParty.pending, (state, action) => {
        state.activeRequestId = action.meta.requestId;
        setLoadingFlag(state, "orders", true);
        setErrorFlag(state, "orders", null);
      })
      .addCase(fetchOrdersByThirdParty.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        setLoadingFlag(state, "orders", false);
        state.orders = toOrderArray(action.payload);
      })
      .addCase(fetchOrdersByThirdParty.rejected, (state, action) => {
        if (action.meta.requestId !== state.activeRequestId) return;
        setLoadingFlag(state, "orders", false);
        setErrorFlag(state, "orders",
          action.payload || action.error?.message || "Failed to fetch orders");
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