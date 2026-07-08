// productSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

/* ===========================
   ASYNC THUNKS — unchanged, keeping them all
=========================== */

export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/", productData, {
        params: { endpoint: "/Product/Product-Post" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to add product");
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const { Productid, ...restData } = productData;
      const response = await axiosInstance.post("/", restData, {
        params: { endpoint: `/Product/Product_Put/${Productid}` },
        headers: { accept: "text/plain", "Content-Type": "application/json" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to update product");
    }
  }
);

export const updateProductImage = createAsyncThunk(
  "products/updateProductImage",
  async ({ productID, imageFile }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("ProductId", productID);
      formData.append("ImageName", imageFile);
      const response = await axiosInstance.post("/", formData, {
        params: { endpoint: "/Product/Product-Image-Edit" },
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to update product image");
    }
  }
);

export const fetchAllProducts = createAsyncThunk(
  "products/fetchAllProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch all products");
    }
  }
);

export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: "/Product/Product-Get" } });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.filter((p) => p.status == 1).sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch products");
    }
  }
);

export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: "/Product/Product-Get" } });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.filter((p) => p.status == 1).sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)).slice(0, 24);
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch product");
    }
  }
);

export const fetchPaginatedProducts = createAsyncThunk(
  "products/fetchPaginatedProducts",
  async ({ pageNumber, pageSize = 24 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get-Paginated", PageNumber: pageNumber, PageSize: pageSize },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const valid = products.filter((p) => new Date(p.dateCreated).getFullYear() > 2000);
      const invalid = products.filter((p) => new Date(p.dateCreated).getFullYear() <= 2000);
      return [...valid.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)), ...invalid];
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch paginated products");
    }
  }
);

export const fetchPaginatedProductsByShowroom = createAsyncThunk(
  "products/fetchPaginatedProductsByShowroom",
  async ({ showroomCode, pageNumber, pageSize = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get-by-ShowRoom-Pageinated", Code: showroomCode, PageNumber: pageNumber, PageSize: pageSize },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return { showroomCode, products: products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)) };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch paginated showroom products");
    }
  }
);

export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: `/Product/Product-Get-by-Category/${categoryId}` } });
      return { categoryId, products: Array.isArray(response.data) ? response.data : [] };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch products by category");
    }
  }
);

export const fetchProductsByBrand = createAsyncThunk(
  "products/fetchProductsByBrand",
  async (brandId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: `/Product/Product-Get-by-Brand/${brandId}` } });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch products by brand");
    }
  }
);

export const fetchProductsByShowroom = createAsyncThunk(
  "products/fetchProductsByShowroom",
  async (showRoomID, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: `/Product/Product-Get-by-ShowRoom/${showRoomID}` } });
      const products = Array.isArray(response.data) ? response.data : [];
      return { showRoomID, products: products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)) };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch products by showroom");
    }
  }
);

export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: `/Product/Product-Get-by-Product_ID/${productId}` } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch product by ID");
    }
  }
);

export const fetchActiveProducts = createAsyncThunk(
  "products/fetchActiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: "/Product/Product-Get-Active" } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch active products");
    }
  }
);

export const fetchInactiveProducts = createAsyncThunk(
  "products/fetchInactiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: "/Product/Product-Get-0" } });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch inactive products");
    }
  }
);

export const fetchProductByShowroomAndRecord = createAsyncThunk(
  "products/fetchProductByShowroomAndRecord",
  async ({ showRoomCode, recordNumber }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get-by-ShowRoom_RecordNumber", ShowRommCode: showRoomCode, RecordNumber: recordNumber },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return { showRoomCode, products: products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)) };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch product by showroom and record number");
    }
  }
);

export const fetchProductsWithoutVariants = createAsyncThunk(
  "products/fetchProductsWithoutVariants",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: "/Product/GetProductsWithoutVariants" } });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch products without variants");
    }
  }
);

export const createProductVariantAndMerge = createAsyncThunk(
  "products/createProductVariantAndMerge",
  async (variantData, { rejectWithValue }) => {
    try {
      const now = new Date().toISOString();
      const enrichedVariants = (Array.isArray(variantData.variants) ? variantData.variants : []).map((v, index) => ({
        ...v,
        createdAt: v.createdAt || now,
        updatedAt: v.updatedAt || now,
      }));

      const response = await axiosInstance.post(
        "/",
        { ...variantData, variants: enrichedVariants },
        {
          params: { endpoint: "/Product/CreateProductVariantAndMerge" },
          headers: { accept: "text/plain", "Content-Type": "application/json" },
        }
      );

      return {
        ctP002ProductId: variantData.ctP002ProductId,
        createdVariants: enrichedVariants,
        raw: response.data,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to create product variant and merge");
    }
  }
);

export const fetchCTP002ProductVariants = createAsyncThunk(
  "products/fetchCTP002ProductVariants",
  async (ctp002ProductId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: `/Product/GetCTP002ProductVariants/${ctp002ProductId}` },
      });
      const variants = Array.isArray(response.data) ? response.data
        : Array.isArray(response.data?.data) ? response.data.data
        : Array.isArray(response.data?.variants) ? response.data.variants : [];
      return { ctp002ProductId, variants };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch CTP002 product variants");
    }
  }
);

export const fetchMultipleCTP002ProductVariants = createAsyncThunk(
  "products/fetchMultipleCTP002ProductVariants",
  async (ctp002ProductIds, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/", ctp002ProductIds, {
        params: { endpoint: "/Product/GetMultiplyCTP002ProductVariants" },
        headers: { accept: "text/plain", "Content-Type": "application/json" },
      });
      let variants = [];
      if (Array.isArray(response.data)) { variants = response.data; }
      else if (response.data && typeof response.data === "object") {
        Object.entries(response.data).forEach(([parentId, list]) => {
          if (Array.isArray(list)) list.forEach((v) => variants.push({ ...v, _parentId: parentId }));
        });
      }
      return { ctp002ProductIds, variants };
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch multiple CTP002 product variants");
    }
  }
);

export const fetchAllCTP002ProductVariants = createAsyncThunk(
  "products/fetchAllCTP002ProductVariants",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", { params: { endpoint: "/Product/GetAllCTP002ProductVariants" } });
      let variants = [];
      if (Array.isArray(response.data)) { variants = response.data; }
      else if (Array.isArray(response.data?.data)) { variants = response.data.data; }
      else if (Array.isArray(response.data?.variants)) { variants = response.data.variants; }
      else if (response.data && typeof response.data === "object") {
        Object.entries(response.data).forEach(([parentId, list]) => {
          if (Array.isArray(list)) list.forEach((v) => variants.push({ ...v, _parentId: parentId }));
        });
      }
      return variants;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message || "Failed to fetch all CTP002 product variants");
    }
  }
);

/* ===========================
   SLICE — FIXED
=========================== */

const productSlice = createSlice({
  name: "products",

  initialState: {
    products: [],
    currentPage: 1,
    filteredProducts: [],
    brandProducts: [],
    productsByShowroom: {},
    productsByCategory: {},
    currentProduct: null,
    activeProducts: [],
    inactiveProducts: [],

    // ✅ FIX: All variant keys declared
    productsWithoutVariants: [],
    ctp002ProductVariants: {},      // ← WAS MISSING — caused the crash
    allCTP002ProductVariants: [],   // ← WAS MISSING
    productVariants: {},
    multipleProductVariants: [],
    allProductVariants: [],
    variantMergeResult: null,

    loading: false,
    error: null,
  },

  reducers: {
    setPage: (state, action) => { state.currentPage = action.payload; },
    clearProducts: (state) => {
      state.products = []; state.filteredProducts = [];
      state.productsByShowroom = {}; state.currentProduct = null; state.error = null;
    },
    resetProducts: (state) => { state.products = []; },
    clearCurrentProduct: (state) => { state.currentProduct = null; },
    clearVariantMergeResult: (state) => { state.variantMergeResult = null; },
    clearProductVariants: (state) => {
      state.productVariants = {}; state.multipleProductVariants = [];
      state.allProductVariants = []; state.ctp002ProductVariants = {};
      state.allCTP002ProductVariants = [];
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(addProduct.pending, (state) => { state.loading = true; })
      .addCase(addProduct.fulfilled, (state, action) => { state.loading = false; state.products.push(action.payload); })
      .addCase(addProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(updateProduct.pending, (state) => { state.loading = true; })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const u = action.payload;
        const i = state.products.findIndex((item) =>
          item.Productid == u.productID || item.productID == u.productID ||
          item.Productid == u.Productid || item.productID == u.Productid
        );
        if (i !== -1) state.products[i] = u;
      })
      .addCase(updateProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(updateProductImage.pending, (state) => { state.loading = true; })
      .addCase(updateProductImage.fulfilled, (state, action) => {
        state.loading = false;
        const u = action.payload;
        const i = state.products.findIndex((item) =>
          item.Productid === u.Productid || item.productID === u.productID ||
          item.Productid === u.productID || item.productID === u.Productid
        );
        if (i !== -1) state.products[i] = u;
      })
      .addCase(updateProductImage.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProductsByBrand.pending, (state) => { state.loading = true; })
      .addCase(fetchProductsByBrand.fulfilled, (state, action) => { state.loading = false; state.brandProducts = action.payload; })
      .addCase(fetchProductsByBrand.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchProducts.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(fetchProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProduct.pending, (state) => { state.loading = true; })
      .addCase(fetchProduct.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(fetchProduct.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchAllProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchAllProducts.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(fetchAllProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProductsByCategory.pending, (state) => { state.loading = true; })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => { state.loading = false; state.productsByCategory[action.payload.categoryId] = action.payload.products; })
      .addCase(fetchProductsByCategory.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProductsByShowroom.pending, (state) => { state.loading = true; })
      .addCase(fetchProductsByShowroom.fulfilled, (state, action) => { state.loading = false; state.productsByShowroom[action.payload.showRoomID] = action.payload.products; })
      .addCase(fetchProductsByShowroom.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProductById.pending, (state) => { state.loading = true; })
      .addCase(fetchProductById.fulfilled, (state, action) => { state.loading = false; state.currentProduct = action.payload; })
      .addCase(fetchProductById.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchPaginatedProducts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPaginatedProducts.fulfilled, (state, action) => { state.loading = false; state.products = action.payload; })
      .addCase(fetchPaginatedProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchPaginatedProductsByShowroom.pending, (state) => { state.loading = true; })
      .addCase(fetchPaginatedProductsByShowroom.fulfilled, (state, action) => { state.loading = false; state.productsByShowroom[action.payload.showroomCode] = action.payload.products; })
      .addCase(fetchPaginatedProductsByShowroom.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchActiveProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchActiveProducts.fulfilled, (state, action) => { state.loading = false; state.activeProducts = action.payload; })
      .addCase(fetchActiveProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchInactiveProducts.pending, (state) => { state.loading = true; })
      .addCase(fetchInactiveProducts.fulfilled, (state, action) => { state.loading = false; state.inactiveProducts = action.payload; })
      .addCase(fetchInactiveProducts.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProductByShowroomAndRecord.pending, (state) => { state.loading = true; })
      .addCase(fetchProductByShowroomAndRecord.fulfilled, (state, action) => { state.loading = false; state.productsByShowroom[action.payload.showRoomCode] = action.payload.products; })
      .addCase(fetchProductByShowroomAndRecord.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      .addCase(fetchProductsWithoutVariants.pending, (state) => { state.loading = true; })
      .addCase(fetchProductsWithoutVariants.fulfilled, (state, action) => { state.loading = false; state.productsWithoutVariants = action.payload; })
      .addCase(fetchProductsWithoutVariants.rejected, (state, action) => { state.loading = false; state.error = action.payload || action.error.message; })

      // ✅ FIX: Variant thunks DON'T touch state.loading
      .addCase(createProductVariantAndMerge.pending, (state) => {
        state.variantMergeResult = null;
      })
      .addCase(createProductVariantAndMerge.fulfilled, (state, action) => {
        const { ctP002ProductId, createdVariants } = action.payload || {};
        if (ctP002ProductId && Array.isArray(createdVariants) && createdVariants.length) {
          const existing = state.ctp002ProductVariants[ctP002ProductId] || [];
          state.ctp002ProductVariants[ctP002ProductId] = [...existing, ...createdVariants];
        }
        state.variantMergeResult = {
          success: true,
          message: action.payload?.raw?.responseMessage || "Variants created",
        };
      })
      .addCase(createProductVariantAndMerge.rejected, (state, action) => {
        state.variantMergeResult = {
          success: false,
          message: action.payload || "Failed to create variants",
        };
      })

      .addCase(fetchCTP002ProductVariants.pending, () => {})
      .addCase(fetchCTP002ProductVariants.fulfilled, (state, action) => {
        state.ctp002ProductVariants[action.payload.ctp002ProductId] = action.payload.variants;
      })
      .addCase(fetchCTP002ProductVariants.rejected, () => {})

      .addCase(fetchMultipleCTP002ProductVariants.pending, () => {})
      .addCase(fetchMultipleCTP002ProductVariants.fulfilled, (state, action) => {
        const { variants } = action.payload;
        const byParent = {};
        variants.forEach((v) => {
          const pid = v._parentId || v.ctP002ProductId || v.CTP002ProductId;
          if (!pid) return;
          if (!byParent[pid]) byParent[pid] = [];
          byParent[pid].push(v);
        });
        Object.entries(byParent).forEach(([pid, list]) => {
          state.ctp002ProductVariants[pid] = [...(state.ctp002ProductVariants[pid] || []), ...list];
        });
      })
      .addCase(fetchMultipleCTP002ProductVariants.rejected, () => {})

      .addCase(fetchAllCTP002ProductVariants.pending, () => {})
      .addCase(fetchAllCTP002ProductVariants.fulfilled, (state, action) => {
        state.allCTP002ProductVariants = action.payload;
        const map = {};
        action.payload.forEach((v) => {
          const pid = v.ctP002ProductId || v.CTP002ProductId || v.ctp002ProductId || v._parentId;
          if (!pid) return;
          if (!map[pid]) map[pid] = [];
          map[pid].push(v);
        });
        state.ctp002ProductVariants = { ...state.ctp002ProductVariants, ...map };
      })
      .addCase(fetchAllCTP002ProductVariants.rejected, () => {});
  },
});

export const {
  clearProducts, setPage, clearCurrentProduct,
  resetProducts, clearVariantMergeResult, clearProductVariants,
} = productSlice.actions;

export default productSlice.reducer;