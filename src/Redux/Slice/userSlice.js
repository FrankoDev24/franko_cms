// src/Redux/Slice/userSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance, { isTokenExpired } from "./AxiosInstance";

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const USER_KEY = "user";
const LOGIN_TIME_KEY = "loginTime";
const LAST_ACTIVITY_KEY = "lastActivity";

/* ═══════════════════════════════════════════════
   STORAGE HELPERS
═══════════════════════════════════════════════ */

/**
 * Safely get data from localStorage
 */
const safeGetFromStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    if (typeof data === "object" && data !== null) {
      return data;
    }
    
    if (typeof data === "string" && data === "[object Object]") {
      console.warn(`Invalid object string found for key "${key}". Cleaning up.`);
      localStorage.removeItem(key);
      return null;
    }
    
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch (parseError) {
        console.warn(`Failed to parse JSON for key "${key}":`, parseError);
        return null;
      }
    }
    
    return data;
  } catch (e) {
    console.warn(`Failed to get ${key} from localStorage:`, e);
    return null;
  }
};

/**
 * Safely set data to localStorage
 */
const safeSetToStorage = (key, value) => {
  try {
    if (!value) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`Failed to persist ${key}:`, e);
  }
};

/**
 * Load user from storage
 */
const loadFromStorage = () => {
  try {
    const data = safeGetFromStorage(USER_KEY);
    
    if (!data) return null;
    
    if (typeof data === "object" && data !== null) {
      if (data.contactNumber || data.contact || data.userAccountNumber || data.accessToken) {
        return data;
      }
    }
    
    return null;
  } catch (e) {
    console.warn("Failed to load user from storage:", e);
    return null;
  }
};

/**
 * Save user to storage
 */
const saveToStorage = (user) => {
  try {
    if (!user) {
      safeSetToStorage(USER_KEY, null);
      safeSetToStorage(LOGIN_TIME_KEY, null);
      safeSetToStorage(LAST_ACTIVITY_KEY, null);
    } else {
      const userToSave = {
        ...user,
        lastUpdated: Date.now(),
      };
      safeSetToStorage(USER_KEY, userToSave);
      
      const now = Date.now();
      safeSetToStorage(LOGIN_TIME_KEY, now);
      safeSetToStorage(LAST_ACTIVITY_KEY, now);
    }
  } catch (e) {
    console.error("Failed to persist user:", e);
  }
};

/**
 * Clear all user storage
 */
const clearStorage = () => {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOGIN_TIME_KEY);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch (e) {
    console.error("Failed to clear user storage:", e);
  }
};

/**
 * Update last activity time
 */
const updateLastActivityTime = () => {
  try {
    const user = loadFromStorage();
    if (user) {
      safeSetToStorage(LAST_ACTIVITY_KEY, Date.now());
    }
  } catch (e) {
    console.error("Failed to update activity time:", e);
  }
};

/* ═══════════════════════════════════════════════
   VALIDATION HELPERS
═══════════════════════════════════════════════ */

/**
 * Validate user data structure
 */
const validateUserData = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return false;
  }
  
  const hasContact = (userData.contactNumber && typeof userData.contactNumber === 'string' && userData.contactNumber.trim() !== '') ||
                    (userData.contact && typeof userData.contact === 'string' && userData.contact.trim() !== '');
  
  return hasContact;
};

/**
 * Safe JSON parser
 */
const safeParseJSON = (raw) => {
  if (typeof raw === "object" && raw !== null) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/* ═══════════════════════════════════════════════
   BACKEND COMMUNICATION HELPERS
═══════════════════════════════════════════════ */

/**
 * Base backend call through Lambda
 */
const callBackend = async ({
  endpoint,
  method = "GET",
  data,
  extraParams = {},
  headers = {},
}) => {
  const config = {
    method,
    url: "/",
    params: {
      endpoint,
      ...extraParams,
    },
    headers,
  };

  if (data !== undefined) {
    config.data = data;
  }

  const res = await axiosInstance(config);
  return res;
};

/**
 * Build authorization headers
 */
const buildAuthHeaders = (providedToken = null) => {
  const stored = loadFromStorage();
  const accessToken = providedToken || stored?.accessToken;
  const headers = { "Content-Type": "application/json" };
  if (accessToken && typeof accessToken === 'string' && accessToken.trim() !== '') {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

/* ═══════════════════════════════════════════════
   TOKEN REFRESH LOGIC
═══════════════════════════════════════════════ */

let refreshPromise = null;
let isRefreshing = false;

/**
 * Refresh user token via backend
 */
const refreshUserToken = async (refreshToken) => {
  const headers = { "Content-Type": "application/json" };

  const res = await callBackend({
    endpoint: "/Users/UserRefreshToken",
    method: "POST",
    data: { refreshToken },
    headers,
  });

  const data = safeParseJSON(res.data);

  if (!res.status || res.status < 200 || res.status >= 300) {
    throw new Error(data?.response?.responseMessage || "Token refresh failed");
  }

  const code = data?.response?.responseCode;
  if (code !== "1") {
    throw new Error(data?.response?.responseMessage || "Token refresh failed");
  }

  return data;
};

/**
 * Silent token refresh (exported for token monitor)
 */
export const silentUserTokenRefresh = async (dispatch) => {
  if (refreshPromise) {
    return refreshPromise;
  }

  if (isRefreshing) {
    console.log('Refresh already in progress, skipping...');
    return null;
  }

  try {
    isRefreshing = true;
    const stored = loadFromStorage();
    const refreshToken = stored?.refreshToken;
    
    if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim() === '') {
      console.warn('No valid refresh token found');
      dispatch(logoutUser());
      isRefreshing = false;
      return null;
    }

    console.log('🔄 Starting silent token refresh...');
    refreshPromise = refreshUserToken(refreshToken);
    const refreshed = await refreshPromise;

    const newTokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    };

    const updatedUser = { 
      ...stored, 
      ...newTokens,
      lastTokenRefresh: Date.now()
    };
    
    saveToStorage(updatedUser);
    dispatch(updateToken(newTokens));
    updateLastActivityTime();
    
    console.log('✅ Token refreshed successfully');
    
    refreshPromise = null;
    isRefreshing = false;
    return newTokens.accessToken;
  } catch (error) {
    refreshPromise = null;
    isRefreshing = false;
    console.error('❌ Silent token refresh failed:', error);
    dispatch(logoutUser());
    return null;
  }
};

/**
 * Request with automatic token refresh
 */
const requestWithAutoRefresh = async ({
  endpoint,
  method = "GET",
  data,
  extraParams = {},
  providedToken = null,
  dispatch = null,
}) => {
  const stored = loadFromStorage();
  let headers = buildAuthHeaders(providedToken);

  let res;
  try {
    res = await callBackend({
      endpoint,
      method,
      data,
      extraParams,
      headers,
    });
  } catch (err) {
    if (err.response?.status !== 401) {
      throw err;
    }
    res = err.response;
  }

  if (res.status !== 401) {
    return res;
  }

  // Handle 401: Try to refresh token
  if (dispatch) {
    const newAccessToken = await silentUserTokenRefresh(dispatch);
    if (newAccessToken) {
      headers = buildAuthHeaders(newAccessToken);

      const retryRes = await callBackend({
        endpoint,
        method,
        data,
        extraParams,
        headers,
      });

      return retryRes;
    }
  }

  // Fallback refresh attempt
  const refreshToken = stored?.refreshToken;
  if (!refreshToken || typeof refreshToken !== 'string' || refreshToken.trim() === '') {
    clearStorage();
    throw new Error("SESSION_EXPIRED");
  }

  try {
    const refreshed = await refreshUserToken(refreshToken);

    const newTokens = {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    };

    const updatedUser = { 
      ...stored, 
      ...newTokens,
      lastTokenRefresh: Date.now()
    };
    saveToStorage(updatedUser);

    headers = buildAuthHeaders(newTokens.accessToken);

    const retryRes = await callBackend({
      endpoint,
      method,
      data,
      extraParams,
      headers,
    });

    return retryRes;
  } catch (error) {
    clearStorage();
    throw new Error("SESSION_EXPIRED");
  }
};

/* ═══════════════════════════════════════════════
   ASYNC THUNKS
═══════════════════════════════════════════════ */

/**
 * Create new user
 */
export const createUser = createAsyncThunk(
  "users/createUser",
  async (userData, { rejectWithValue }) => {
    try {
      if (!validateUserData(userData)) {
        return rejectWithValue({
          message: "Invalid user data provided.",
          responseCode: "0",
        });
      }

      const res = await callBackend({
        endpoint: "/Users/User-Post",
        method: "POST",
        data: userData,
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Registration failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Registration failed.",
        responseCode: "0",
      });
    }
  }
);

/**
 * Fetch all users
 */
export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const res = await requestWithAutoRefresh({
        endpoint: "/Users/Access",
        method: "GET",
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Failed to fetch users.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return Array.isArray(data) ? data : [data].filter(Boolean);
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Failed to fetch users.",
        responseCode: "0",
      });
    }
  }
);

/**
 * Get user by contact number
 */
export const getUserById = createAsyncThunk(
  "users/getUserById",
  async ({ contactNumber, accessToken = null }, { rejectWithValue, dispatch }) => {
    try {
      if (!contactNumber || typeof contactNumber !== 'string' || contactNumber.trim() === '') {
        return rejectWithValue({
          message: "Valid contact number is required.",
          responseCode: "0",
        });
      }

      const res = await requestWithAutoRefresh({
        endpoint: "/Users/GetUserById",
        method: "GET",
        extraParams: { contactNumber },
        providedToken: accessToken,
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Failed to fetch user.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      const user = Array.isArray(data) ? data[0] : data;

      if (!user || !validateUserData(user)) {
        return rejectWithValue({
          message: "User not found or invalid user data.",
          responseCode: "0",
        });
      }

      return user;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Failed to fetch user.",
        responseCode: "0",
      });
    }
  }
);

/**
 * Login user
 */
export const loginUser = createAsyncThunk(
  "users/LogIn",
  async ({ contact, password }, { dispatch, rejectWithValue }) => {
    try {
      if (!contact || !password || 
          typeof contact !== 'string' || typeof password !== 'string' ||
          contact.trim() === '' || password.trim() === '') {
        return rejectWithValue({
          message: "Contact number and password are required.",
          responseCode: "0",
          isAccountNotFound: false,
        });
      }

      const res = await callBackend({
        endpoint: "/Users/LogIn",
        method: "POST",
        data: { contactNumber: contact, password, FullName: "N/A" },
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.response?.responseMessage || "Login failed.",
          responseCode: data?.response?.responseCode || String(res.status),
          isAccountNotFound: false,
        });
      }

      const responseCode = data?.response?.responseCode;
      const responseMessage = data?.response?.responseMessage;
      const loginStatus = data?.status;

      if (!data || responseCode !== "1") {
        const msg = responseMessage || "Access Denied";
        const code = responseCode ?? "0";

        const isAccountNotFound =
          code === "0" ||
          msg.toLowerCase().includes("access denied") ||
          msg.toLowerCase().includes("not found") ||
          msg.toLowerCase().includes("invalid");

        return rejectWithValue({
          message: msg,
          responseCode: code,
          isAccountNotFound,
        });
      }

      // Require password change
      if (loginStatus === false) {
        const loginResult = {
          contactNumber: contact,
          contact: contact,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          requiresPasswordChange: true,
          loginStatus: false,
          loginTime: Date.now(),
        };
        return loginResult;
      }

      // Normal login
      const tempUser = {
        contactNumber: contact,
        contact: contact,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        loginTime: Date.now(),
      };
      saveToStorage(tempUser);

      try {
        const profile = await dispatch(
          getUserById({
            contactNumber: contact,
            accessToken: data.accessToken,
          })
        ).unwrap();

        const merged = {
          ...profile,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          contactNumber: contact,
          contact: contact,
          loginStatus: true,
          isAuthenticated: true,
          loginTime: Date.now(),
        };

        saveToStorage(merged);
        return merged;
      } catch (profileError) {
        console.warn("Failed to fetch user profile:", profileError);
        
        const basicUser = {
          contactNumber: contact,
          contact: contact,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          loginStatus: true,
          isAuthenticated: true,
          loginTime: Date.now(),
        };

        saveToStorage(basicUser);
        return basicUser;
      }
    } catch (error) {
      if (error?.responseCode) return rejectWithValue(error);
      return rejectWithValue({
        message: error.message || "Login failed.",
        responseCode: "0",
        isAccountNotFound: false,
      });
    }
  }
);

/**
 * Update user password
 */
export const updateUserPassword = createAsyncThunk(
  "users/updateUserPassword",
  async ({ contactNumber, oldPassword, newPassword }, { rejectWithValue, dispatch }) => {
    try {
      if (!contactNumber || !oldPassword || !newPassword ||
          typeof contactNumber !== 'string' || 
          typeof oldPassword !== 'string' || 
          typeof newPassword !== 'string' ||
          contactNumber.trim() === '' || 
          oldPassword.trim() === '' || 
          newPassword.trim() === '') {
        return rejectWithValue({
          message: "All password fields are required.",
          responseCode: "0",
        });
      }

      const res = await requestWithAutoRefresh({
        endpoint: "/Users/UpdateUserPassword",
        method: "POST",
        data: { contactNumber, oldPassword, newPassword },
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300 || data?.ResponseCode !== "1") {
        return rejectWithValue({
          message: data?.ResponseMessage || "Password update failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Password update failed.",
        responseCode: "0",
      });
    }
  }
);

/**
 * Update account status
 */
export const updateAccountStatus = createAsyncThunk(
  "users/updateAccountStatus",
  async (_, { getState, rejectWithValue, dispatch }) => {
    try {
      const user = getState().user.currentUser;

      if (!user?.userAccountNumber) {
        return rejectWithValue({
          message: "No user account found.",
          responseCode: "0",
        });
      }

      const res = await requestWithAutoRefresh({
        endpoint: "/Users/User-Status",
        method: "POST",
        data: {
          accountNumber: user.userAccountNumber,
          accountStatus: "0",
        },
        dispatch,
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300) {
        return rejectWithValue({
          message: data?.ResponseMessage || "Status update failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      clearStorage();
      return data;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        return rejectWithValue({
          message: "Session expired. Please login again.",
          responseCode: "401",
        });
      }
      return rejectWithValue({
        message: error.message || "Status update failed.",
        responseCode: "0",
      });
    }
  }
);

/**
 * Forgot password
 */
export const forgotPassword = createAsyncThunk(
  "users/forgotPassword",
  async ({ contactNumber, email }, { rejectWithValue }) => {
    try {
      if (!contactNumber || !email ||
          typeof contactNumber !== 'string' || typeof email !== 'string' ||
          contactNumber.trim() === '' || email.trim() === '') {
        return rejectWithValue({
          message: "Contact number and email are required.",
          responseCode: "0",
        });
      }

      const res = await callBackend({
        endpoint: "/Users/UserForgotPassword",
        method: "POST",
        data: { contactNumber, email },
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300 || data?.ResponseCode !== "1") {
        return rejectWithValue({
          message: data?.ResponseMessage || "Password reset request failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Password reset request failed.",
        responseCode: "0",
      });
    }
  }
);

/**
 * Reset password
 */
export const resetPassword = createAsyncThunk(
  "users/resetPassword",
  async ({ contactNumber, token, newPassword }, { rejectWithValue }) => {
    try {
      if (!contactNumber || !token || !newPassword ||
          typeof contactNumber !== 'string' || 
          typeof token !== 'string' || 
          typeof newPassword !== 'string' ||
          contactNumber.trim() === '' || 
          token.trim() === '' || 
          newPassword.trim() === '') {
        return rejectWithValue({
          message: "All reset password fields are required.",
          responseCode: "0",
        });
      }

      const res = await callBackend({
        endpoint: "/Users/UserResetPassword",
        method: "POST",
        data: { contactNumber, token, newPassword },
        headers: { "Content-Type": "application/json" },
      });

      const data = safeParseJSON(res.data);

      if (res.status < 200 || res.status >= 300 || data?.ResponseCode !== "1") {
        return rejectWithValue({
          message: data?.ResponseMessage || "Password reset failed.",
          responseCode: data?.ResponseCode || String(res.status),
        });
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        message: error.message || "Password reset failed.",
        responseCode: "0",
      });
    }
  }
);

/* ═══════════════════════════════════════════════
   INITIAL STATE
═══════════════════════════════════════════════ */

const hydrated = loadFromStorage();

const initialState = {
  currentUser: hydrated,
  currentUserDetails: hydrated,
  users: [],
  loading: false,
  error: null,
  isAuthenticated: !!(hydrated?.accessToken && 
                      typeof hydrated.accessToken === 'string' && 
                      hydrated.accessToken.trim() !== ''),
};

/* ═══════════════════════════════════════════════
   SLICE
═══════════════════════════════════════════════ */

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.currentUser = null;
      state.currentUserDetails = null;
      state.isAuthenticated = false;
      state.error = null;
      clearStorage();
    },
    
    setUser: (state, action) => {
      const user = action.payload;
      if (user && validateUserData(user)) {
        state.currentUser = user;
        state.currentUserDetails = user;
        state.isAuthenticated = !!(user.accessToken && 
                                  typeof user.accessToken === 'string' && 
                                  user.accessToken.trim() !== '');
        saveToStorage(user);
      } else {
        state.currentUser = null;
        state.currentUserDetails = null;
        state.isAuthenticated = false;
        clearStorage();
      }
    },
    
    clearUsers: (state) => {
      state.users = [];
    },
    
    clearSelectedUser: (state) => {
      state.currentUserDetails = null;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    updateToken: (state, action) => {
      if (state.currentUser && action.payload?.accessToken && action.payload?.refreshToken) {
        const updatedUser = {
          ...state.currentUser,
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          lastTokenRefresh: Date.now(),
        };
        
        state.currentUser = updatedUser;
        state.currentUserDetails = updatedUser;
        state.isAuthenticated = true;
        saveToStorage(updatedUser);
      }
    },
    
    syncWithStorage: (state) => {
      const stored = loadFromStorage();
      if (stored && validateUserData(stored)) {
        state.currentUser = stored;
        state.currentUserDetails = stored;
        state.isAuthenticated = !!(stored.accessToken && 
                                  typeof stored.accessToken === 'string' && 
                                  stored.accessToken.trim() !== '');
      } else {
        state.currentUser = null;
        state.currentUserDetails = null;
        state.isAuthenticated = false;
      }
    },
    
    updateActivity: () => {
      updateLastActivityTime();
    },
  },
  
  extraReducers: (builder) => {
    builder
      // ── createUser ──
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload?.ResponseCode === "1") {
          const user = { ...action.meta.arg, ...action.payload, createdAt: Date.now() };
          if (validateUserData(user)) {
            state.currentUser = user;
            state.currentUserDetails = user;
            state.isAuthenticated = !!(user?.accessToken && 
                                      typeof user.accessToken === 'string' && 
                                      user.accessToken.trim() !== '');
            saveToStorage(user);
          }
        }
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Registration failed.";
      })

      // ── fetchUsers ──
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch users.";
        if (action.payload?.responseCode === "401") {
          state.currentUser = null;
          state.currentUserDetails = null;
          state.isAuthenticated = false;
          clearStorage();
        }
      })

      // ── getUserById ──
      .addCase(getUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.loading = false;
        if (validateUserData(action.payload)) {
          state.currentUserDetails = action.payload;
        }
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch user details.";
        if (action.payload?.responseCode === "401") {
          state.currentUser = null;
          state.currentUserDetails = null;
          state.isAuthenticated = false;
          clearStorage();
        }
      })

      // ── loginUser ──
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload.requiresPasswordChange && validateUserData(action.payload)) {
          state.currentUser = action.payload;
          state.currentUserDetails = action.payload;
          state.isAuthenticated = true;
          
          // Initialize activity tracking
          const now = Date.now();
          localStorage.setItem('loginTime', now.toString());
          localStorage.setItem('lastActivity', now.toString());
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed.";
        state.isAuthenticated = false;
        clearStorage();
      })

      // ── updateUserPassword ──
      .addCase(updateUserPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserPassword.fulfilled, (state) => {
        state.loading = false;
        if (state.currentUser) {
          const updatedUser = {
            ...state.currentUser,
            lastPasswordChange: Date.now(),
          };
          state.currentUser = updatedUser;
          saveToStorage(updatedUser);
        }
      })
      .addCase(updateUserPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Password update failed.";
        if (action.payload?.responseCode === "401") {
          state.currentUser = null;
          state.currentUserDetails = null;
          state.isAuthenticated = false;
          clearStorage();
        }
      })

      // ── updateAccountStatus ──
      .addCase(updateAccountStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateAccountStatus.fulfilled, (state) => {
        state.loading = false;
        state.currentUser = null;
        state.currentUserDetails = null;
        state.isAuthenticated = false;
      })
      .addCase(updateAccountStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Status update failed.";
      })

      // ── forgotPassword ──
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Password reset request failed.";
      })

      // ── resetPassword ──
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Password reset failed.";
      });
  },
});

/* ═══════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════ */

export const {
  logoutUser,
  setUser,
  clearUsers,
  clearSelectedUser,
  clearError,
  updateToken,
  syncWithStorage,
  updateActivity,
} = userSlice.actions;

export { 
  loadFromStorage, 
  saveToStorage, 
  clearStorage,
  validateUserData,
  updateLastActivityTime 
};

export default userSlice.reducer;