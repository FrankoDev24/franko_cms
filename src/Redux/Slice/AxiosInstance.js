// src/Redux/Slice/AxiosInstance.js
import axios from "axios";

/* ─────────────────────────────────────────────
   ENV VARIABLES
───────────────────────────────────────────── */
const LAMBDA_BASE_URL = import.meta.env.VITE_LAMBDA_BASE_URL;
const LAMBDA_HEADER_NAME =
  import.meta.env.VITE_LAMBDA_HEADER_NAME || "Identifier";
const LAMBDA_HEADER_VALUE =
  import.meta.env.VITE_LAMBDA_HEADER_VALUE || "Franko";

/* ─────────────────────────────────────────────
   VALIDATE ENV
───────────────────────────────────────────── */
if (!LAMBDA_BASE_URL) {
  console.error(
    "❌ VITE_LAMBDA_BASE_URL is not defined. Please set it in your .env file."
  );
}

/* ─────────────────────────────────────────────
   SAFE STORAGE GETTER
───────────────────────────────────────────── */
const safeGetFromStorage = (key) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;

    if (typeof value === "object") return value;

    if (value === "[object Object]") {
      localStorage.removeItem(key);
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch {
    return null;
  }
};

/* ─────────────────────────────────────────────
   GET CURRENT AUTH TOKEN
───────────────────────────────────────────── */
const getAuthToken = () => {
  try {
    const user = safeGetFromStorage("user");
    const customer = safeGetFromStorage("customer");

    if (user?.accessToken) return user.accessToken;
    if (customer?.accessToken) return customer.accessToken;

    return null;
  } catch {
    return null;
  }
};

/* ─────────────────────────────────────────────
   JWT TOKEN EXPIRY CHECKER
───────────────────────────────────────────── */
export const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode JWT payload
    const payload = JSON.parse(atob(parts[1]));
    const exp = payload.exp;
    
    if (!exp) return false; // No expiry set
    
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 60; // 60 seconds buffer
    
    return (exp - bufferTime) <= now;
  } catch (error) {
    console.warn('Error checking token expiry:', error);
    return true;
  }
};

/* ─────────────────────────────────────────────
   CREATE INSTANCE
───────────────────────────────────────────── */
const axiosInstance = axios.create({
  baseURL: LAMBDA_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    [LAMBDA_HEADER_NAME]: LAMBDA_HEADER_VALUE,
  },
});

/* ─────────────────────────────────────────────
   REQUEST INTERCEPTOR
───────────────────────────────────────────── */
axiosInstance.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};
    config.headers[LAMBDA_HEADER_NAME] = LAMBDA_HEADER_VALUE;

    if (!config.headers.Authorization) {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else if (
      config.data &&
      !config.headers["Content-Type"] &&
      typeof config.data === "object"
    ) {
      config.headers["Content-Type"] = "application/json";
    }

    config.params = {
      ...(config.params || {}),
    };

    if (import.meta.env.DEV) {
      console.log(`📤 ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        headers: config.headers,
      });
    }

    return config;
  },
  (error) => {
    console.error("❌ Request setup failed:", error);
    return Promise.reject(error);
  }
);

/* ─────────────────────────────────────────────
   RESPONSE INTERCEPTOR
───────────────────────────────────────────── */
axiosInstance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status}`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (import.meta.env.DEV) {
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} → ${status || "Network error"}`);
      if (data) console.error("Response:", data);
    }

    if (error.code === "ECONNABORTED") {
      console.error("⏱ Request timed out");
    } else if (error.message === "Network Error") {
      console.error("📡 Network unreachable");
    } else if (status === 401) {
      console.warn("🔐 Unauthorized — token may be expired");
    } else if (status === 403) {
      console.warn("🚫 Forbidden access");
    } else if (status === 429) {
      console.warn("⚠️ Rate limited");
    } else if (status >= 500) {
      console.error("💥 Server error");
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;