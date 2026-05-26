// storage/productCodesStorage.js

const STORAGE_KEY = 'franko_product_codes';

// Direct access to raw localStorage methods
const getRawItem = (key) => {
  try {
    // Get the raw encrypted value
    const value = Object.getOwnPropertyDescriptor(Storage.prototype, 'getItem')
      ? localStorage.getItem(key)
      : window.localStorage.getItem(key);
    return value;
  } catch (e) {
    return null;
  }
};

const setRawItem = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {

  }
};

// Product codes storage that works with your encryption
export const productCodesStorage = {
  save: (codes) => {
    try {
      // Your encrypted localStorage will handle the encryption
      setRawItem(STORAGE_KEY, typeof codes === 'string' ? codes : JSON.stringify(codes));
   
    } catch (error) {
     
    }
  },

  load: () => {
    try {
      const data = getRawItem(STORAGE_KEY);
      if (!data) return {};
      
      // Your encrypted localStorage already decrypts and parses
      if (typeof data === 'object') {
    
        return data;
      }
      
      // If it's still a string, try to parse it
      try {
        const parsed = JSON.parse(data);
  
        return parsed;
      } catch {
        return {};
      }
    } catch (error) {

      return {};
    }
  },

  addCode: (productId, code) => {
    if (!productId || !code) return;
    const codes = productCodesStorage.load();
    codes[String(productId)] = String(code);
    productCodesStorage.save(codes);
  },

  getCode: (productId) => {
    if (!productId) return null;
    const codes = productCodesStorage.load();
    return codes[String(productId)] || null;
  },

  removeCode: (productId) => {
    if (!productId) return;
    const codes = productCodesStorage.load();
    delete codes[String(productId)];
    productCodesStorage.save(codes);
  },

  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);

    } catch (error) {

    }
  }
};