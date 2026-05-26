// src/Redux/Slice/customerSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance"; // Lambda-based axios instance

// -------------------------
// LocalStorage helpers
// -------------------------
const CUSTOMER_KEY = "customer";

/**
 * Load customer from localStorage
 * Handles both encrypted objects and regular JSON strings
 */
const loadCustomerFromStorage = () => {
  try {
    const value = localStorage.getItem(CUSTOMER_KEY);
    
  
    
    // If monkey-patch returned an object directly
    if (value && typeof value === "object") {
      return value;
    }
    
    // If it's a string, try to parse it
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return parsed;
      } catch {
  
        return null;
      }
    }
    
    return null;
  } catch (err) {

    return null;
  }
};

/**
 * Save customer to localStorage
 * Your monkey-patch handles encryption and stringification
 */
const saveCustomerToStorage = (customer) => {
  try {
  
    
    if (!customer) {
      localStorage.removeItem(CUSTOMER_KEY);
    
      return;
    }
    
    // Pass the object directly - monkey-patch will handle encryption
    localStorage.setItem(CUSTOMER_KEY, customer);

    
    // Verify it was saved correctly
    const verification = localStorage.getItem(CUSTOMER_KEY);

  } catch (e) {

  }
};

// -------------------------
// Async Thunks (via Lambda)
// -------------------------

// Create a new customer
export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData, { rejectWithValue }) => {
    try {

      const response = await axiosInstance.post(
        "/",
        customerData,
        {
          params: { endpoint: "/Users/Customer-Post" },
        }
      );
      

      return response.data;
    } catch (error) {
   
      return rejectWithValue(
        error.response?.data || "An unknown error occurred."
      );
    }
  }
);

// Fetch all customers
export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Users/Customer-Get" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "An unknown error occurred."
      );
    }
  }
);

// Get customer by contact number
export const getCustomerById = createAsyncThunk(
  "customers/getCustomerById",
  async (contactNumber, { rejectWithValue }) => {
    try {

      
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Users/GetCustomerById",
          contactNumber,
        },
      });

      const data = Array.isArray(response.data)
        ? response.data[0]
        : response.data;

   

      if (!data || !data.contactNumber) {
        return rejectWithValue("No customer found with that contact number.");
      }

      return data;
    } catch (error) {

      return rejectWithValue(
        error.response?.data ||
          "An unknown error occurred while fetching the customer."
      );
    }
  }
);

// Customer login
export const loginCustomer = createAsyncThunk(
  "customers/loginCustomer",
  async ({ contactNumber, password }, { dispatch, rejectWithValue }) => {
    try {

      
      const loginResponse = await axiosInstance.post(
        "/",
        {
          contactNumber,
          password,
          FullName: "N/A",
        },
        { params: { endpoint: "/Users/CustomerLogin" } }
      );

      let loginData = loginResponse.data;

      // Backend returns JSON string, not object – parse it
      if (typeof loginData === "string") {
        try {
          loginData = JSON.parse(loginData);
        } catch (e) {
  
          return rejectWithValue("Invalid response from server.");
        }
      }


      // Now loginData should be: { ResponseCode: "1", ResponseMessage: "successfully Login" }
      if (loginData?.ResponseCode !== "1") {
        return rejectWithValue(
          loginData?.ResponseMessage || "Login failed. Invalid credentials."
        );
      }

      // Load full customer record using the contact number
      const customer = await dispatch(getCustomerById(contactNumber)).unwrap();


      // Persist to localStorage (your monkey-patch will encrypt)
      saveCustomerToStorage(customer);

      return customer;
    } catch (error) {
 
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "An unknown error occurred during login."
      );
    }
  }
);

// Update account status (e.g., deactivate)
export const updateAccountStatus = createAsyncThunk(
  "customers/updateAccountStatus",
  async (arg, { getState, rejectWithValue }) => {
    try {
      // 1) Try account number from arg
      let accountNumber = arg?.accountNumber;

      // 2) Else from Redux state
      if (!accountNumber) {
        const state = getState();
        const current = state.customer?.currentCustomer;
        if (current?.customerAccountNumber) {
          accountNumber = current.customerAccountNumber;
        }
      }

      // 3) Else from localStorage
      if (!accountNumber) {
        const stored = loadCustomerFromStorage();
        if (stored?.customerAccountNumber) {
          accountNumber = stored.customerAccountNumber;
        }
      }

      if (!accountNumber) {
        return rejectWithValue("No customer account number found.");
      }

      const response = await axiosInstance.post(
        "/",
        {
          accountNumber,
          accountStatus: "0",
        },
        { params: { endpoint: "/Users/Customer-Status" } }
      );

      // Clear local storage customer
      saveCustomerToStorage(null);

      return response.data;
    } catch (error) {

      return rejectWithValue(
        error.response?.data?.message ||
          error.response?.data ||
          "Failed to delete account."
      );
    }
  }
);

// -------------------------
// Initial State
// -------------------------
const hydratedCustomer = loadCustomerFromStorage();

const initialState = {
  currentCustomer: hydratedCustomer,
  currentCustomerDetails: hydratedCustomer,
  customerList: [],
  loading: false,
  error: null,
  status: "idle",
  selectedCustomer: null,
};

// -------------------------
// Slice Definition
// -------------------------
const customerSlice = createSlice({
  name: "customer",
  initialState,
  reducers: {
    logoutCustomer: (state) => {

      state.currentCustomer = null;
      state.currentCustomerDetails = null;
      saveCustomerToStorage(null);
    },

    clearCustomers: (state) => {
      state.customerList = [];
    },

    setCustomer: (state, action) => {
      state.selectedCustomer = action.payload;
    },

    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
    },

    setCurrentCustomer: (state, action) => {

      state.currentCustomer = action.payload;
      state.currentCustomerDetails = action.payload;
      saveCustomerToStorage(action.payload);
    },
  },

  extraReducers: (builder) => {
    builder
      // CREATE
      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;

        
        const { ResponseCode } = action.payload || {};

        if (ResponseCode === "1" || ResponseCode === 1) {
          // Combine original form data and response
          const customer = { ...action.meta.arg, ...action.payload };

          
          state.currentCustomer = customer;
          state.currentCustomerDetails = customer;
          saveCustomerToStorage(customer);
        } else {
          state.error =
            action.payload?.ResponseMessage ||
            "Account creation failed. Invalid server response.";

        }
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ||
          action.error?.message ||
          "An unknown error occurred.";

      })

      // FETCH
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customerList = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload ||
          action.error?.message ||
          "An unknown error occurred.";
      })

      // GET CUSTOMER BY ID
      .addCase(getCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCustomerDetails = action.payload;

      })
      .addCase(getCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;

      })

      // LOGIN
      .addCase(loginCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginCustomer.fulfilled, (state, action) => {
        state.loading = false;

        
        state.currentCustomer = action.payload;
        state.currentCustomerDetails = action.payload;
        saveCustomerToStorage(action.payload);
      })
      .addCase(loginCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Login failed.";
        
      })

      // UPDATE STATUS
      .addCase(updateAccountStatus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateAccountStatus.fulfilled, (state) => {
        state.status = "succeeded";
        state.currentCustomer = null;
        state.currentCustomerDetails = null;
      })
      .addCase(updateAccountStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || "Failed to update account status.";
      });
  },
});

export const {
  logoutCustomer,
  clearCustomers,
  setCustomer,
  clearSelectedCustomer,
  setCurrentCustomer,
} = customerSlice.actions;

export default customerSlice.reducer;