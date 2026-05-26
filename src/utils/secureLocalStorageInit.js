// src/secureStorage.js
import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY || "your-secret-key";

/* ─────────────────────────────────────────────
   ENCRYPTION HELPERS
───────────────────────────────────────────── */
const encrypt = (data) => {
  try {
    const str = typeof data === "string" ? data : JSON.stringify(data);
    return CryptoJS.AES.encrypt(str, SECRET_KEY).toString();
  } catch (err) {
    console.error("Encrypt failed:", err);
    return data;
  }
};

const decrypt = (cipherText) => {
  try {
    if (!cipherText || typeof cipherText !== "string") return cipherText;
    if (!cipherText.startsWith("U2FsdGVkX1")) return cipherText;

    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch (err) {
    console.error("Decrypt failed:", err);
    return cipherText;
  }
};

/* ─────────────────────────────────────────────
   MONKEY PATCH (RUNS ONCE)
───────────────────────────────────────────── */
if (typeof window !== "undefined" && !window.__SECURE_STORAGE_PATCHED__) {
  window.__SECURE_STORAGE_PATCHED__ = true;

  const originalSet = Storage.prototype.setItem;
  const originalGet = Storage.prototype.getItem;
  const originalRemove = Storage.prototype.removeItem;

  Storage.prototype.setItem = function (key, value) {
    try {
      // Don't encrypt null/undefined
      if (value === null || value === undefined) {
        originalRemove.call(this, key);
        return;
      }

      // If already encrypted, store as-is
      if (typeof value === "string" && value.startsWith("U2FsdGVkX1")) {
        originalSet.call(this, key, value);
        return;
      }

      const encrypted = encrypt(value);
      originalSet.call(this, key, encrypted);
    } catch (err) {
      console.error("setItem failed:", err);
      originalSet.call(this, key, value);
    }
  };

  Storage.prototype.getItem = function (key) {
    try {
      const encrypted = originalGet.call(this, key);
      if (!encrypted) return null;

      const decrypted = decrypt(encrypted);

      // Try parsing as JSON
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (err) {
      console.error("getItem failed:", err);
      return null;
    }
  };

  Storage.prototype.removeItem = function (key) {
    originalRemove.call(this, key);
  };

  console.log("✅ Secure storage initialized");
}

/* ─────────────────────────────────────────────
   HELPER UTILITIES (Optional)
───────────────────────────────────────────── */
export const secureStorage = {
  set: (key, value) => localStorage.setItem(key, value),
  get: (key) => localStorage.getItem(key),
  remove: (key) => localStorage.removeItem(key),
  clear: () => localStorage.clear(),
};

export default secureStorage;