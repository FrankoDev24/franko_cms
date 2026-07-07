// productSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "./AxiosInstance";

/* ===========================
   ASYNC THUNKS
=========================== */

// Add Product
export const addProduct = createAsyncThunk(
  "products/addProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/", productData, {
        params: { endpoint: "/Product/Product-Post" },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to add product"
      );
    }
  }
);

// Update Product
export const updateProduct = createAsyncThunk(
  "products/updateProduct",
  async (productData, { rejectWithValue }) => {
    try {
      const { Productid, ...restData } = productData;
      const response = await axiosInstance.post("/", restData, {
        params: { endpoint: `/Product/Product_Put/${Productid}` },
        headers: {
          accept: "text/plain",
          "Content-Type": "application/json",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to update product"
      );
    }
  }
);

// Update Product Image
export const updateProductImage = createAsyncThunk(
  "products/updateProductImage",
  async ({ productID, imageFile }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("ProductId", productID);
      formData.append("ImageName", imageFile);
      const response = await axiosInstance.post("/", formData, {
        params: { endpoint: "/Product/Product-Image-Edit" },
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to update product image"
      );
    }
  }
);

// Fetch All Products
export const fetchAllProducts = createAsyncThunk(
  "products/fetchAllProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch all products"
      );
    }
  }
);

// Fetch Active Products Only
export const fetchProducts = createAsyncThunk(
  "products/fetchProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const filteredProducts = products
        .filter((product) => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      return filteredProducts;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch products"
      );
    }
  }
);

// Fetch Most Recent 24 Active Products
export const fetchProduct = createAsyncThunk(
  "products/fetchProduct",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/Product-Get" },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const filteredProducts = products
        .filter((product) => product.status == 1)
        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
        .slice(0, 24);
      return filteredProducts;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch product"
      );
    }
  }
);

// Fetch Paginated Products
export const fetchPaginatedProducts = createAsyncThunk(
  "products/fetchPaginatedProducts",
  async ({ pageNumber, pageSize = 24 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-Paginated",
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const validProducts = products.filter(
        (p) => new Date(p.dateCreated).getFullYear() > 2000
      );
      const invalidProducts = products.filter(
        (p) => new Date(p.dateCreated).getFullYear() <= 2000
      );
      const sortedValid = validProducts.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
      return [...sortedValid, ...invalidProducts];
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch paginated products"
      );
    }
  }
);

// Fetch Paginated Products By Showroom
export const fetchPaginatedProductsByShowroom = createAsyncThunk(
  "products/fetchPaginatedProductsByShowroom",
  async ({ showroomCode, pageNumber, pageSize = 10 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom-Pageinated",
          Code: showroomCode,
          PageNumber: pageNumber,
          PageSize: pageSize,
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const sorted = products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
      return { showroomCode, products: sorted };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch paginated showroom products"
      );
    }
  }
);

// Fetch Products By Category
export const fetchProductsByCategory = createAsyncThunk(
  "products/fetchProductsByCategory",
  async (categoryId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-Category/${categoryId}`,
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return { categoryId, products };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch products by category"
      );
    }
  }
);

// Fetch Products By Brand
export const fetchProductsByBrand = createAsyncThunk(
  "products/fetchProductsByBrand",
  async (brandId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-Brand/${brandId}`,
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      return products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch products by brand"
      );
    }
  }
);

// Fetch Products By Showroom
export const fetchProductsByShowroom = createAsyncThunk(
  "products/fetchProductsByShowroom",
  async (showRoomID, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-ShowRoom/${showRoomID}`,
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const sortedProducts = products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
      return { showRoomID, products: sortedProducts };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch products by showroom"
      );
    }
  }
);

// Fetch Product By ID
export const fetchProductById = createAsyncThunk(
  "products/fetchProductById",
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/Product-Get-by-Product_ID/${productId}`,
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || error.message || "Failed to fetch product by ID"
      );
    }
  }
);

// Fetch Active Products
export const fetchActiveProducts = createAsyncThunk(
  "products/fetchActiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-Active",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch active products"
      );
    }
  }
);

// Fetch Inactive Products
export const fetchInactiveProducts = createAsyncThunk(
  "products/fetchInactiveProducts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-0",
        },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch inactive products"
      );
    }
  }
);

// Fetch Product By Showroom And Record Number
export const fetchProductByShowroomAndRecord = createAsyncThunk(
  "products/fetchProductByShowroomAndRecord",
  async ({ showRoomCode, recordNumber }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: "/Product/Product-Get-by-ShowRoom_RecordNumber",
          ShowRommCode: showRoomCode,
          RecordNumber: recordNumber,
        },
      });
      const products = Array.isArray(response.data) ? response.data : [];
      const sortedProducts = products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
      return { showRoomCode, products: sortedProducts };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch product by showroom and record number"
      );
    }
  }
);

/* ===========================
   NEW VARIANT ASYNC THUNKS
=========================== */

/* ===========================
   NEW VARIANT ASYNC THUNKS
=========================== */

// Fetch Products Without Variants
export const fetchProductsWithoutVariants = createAsyncThunk(
  "products/fetchProductsWithoutVariants",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/GetProductsWithoutVariants" },
      });

      const products = Array.isArray(response.data) ? response.data : [];
      return products.sort(
        (a, b) => new Date(b.dateCreated) - new Date(a.dateCreated)
      );
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch products without variants"
      );
    }
  }
);

// Create Product Variant And Merge
export const createProductVariantAndMerge = createAsyncThunk(
  "products/createProductVariantAndMerge",
  async (variantData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/", variantData, {
        params: { endpoint: "/Product/CreateProductVariantAndMerge" },
        headers: {
          accept: "text/plain",
          "Content-Type": "application/json",
        },
      });

      // Return the new variants too so the slice can merge them locally
      return {
        ctP002ProductId: variantData.ctP002ProductId,
        createdVariants: Array.isArray(variantData.variants) ? variantData.variants : [],
        raw: response.data,
      };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to create product variant and merge"
      );
    }
  }
);

// Fetch CTP002 Product Variants By ctp002ProductId
export const fetchCTP002ProductVariants = createAsyncThunk(
  "products/fetchCTP002ProductVariants",
  async (ctp002ProductId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: {
          endpoint: `/Product/GetCTP002ProductVariants/${ctp002ProductId}`,
        },
      });

      // Some APIs return { data: [...] } or { variants: [...] } — handle both
      const variants = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data?.variants)
        ? response.data.variants
        : [];

      return { ctp002ProductId, variants };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch CTP002 product variants"
      );
    }
  }
);

// Fetch Multiple CTP002 Product Variants (note: name aligned with your code)
export const fetchMultipleCTP002ProductVariants = createAsyncThunk(
  "products/fetchMultipleCTP002ProductVariants",
  async (ctp002ProductIds, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/", ctp002ProductIds, {
        params: { endpoint: "/Product/GetMultiplyCTP002ProductVariants" },
        headers: {
          accept: "text/plain",
          "Content-Type": "application/json",
        },
      });

      // Some APIs return an object keyed by id, others return an array
      let variants = [];
      if (Array.isArray(response.data)) {
        variants = response.data;
      } else if (response.data && typeof response.data === "object") {
        // Flatten the response object into a single array, tagging with parentId
        const all = [];
        Object.entries(response.data).forEach(([parentId, list]) => {
          if (Array.isArray(list)) {
            list.forEach((v) => all.push({ ...v, _parentId: parentId }));
          }
        });
        variants = all;
      }

      return { ctp002ProductIds, variants };
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch multiple CTP002 product variants"
      );
    }
  }
);

// Fetch All CTP002 Product Variants
export const fetchAllCTP002ProductVariants = createAsyncThunk(
  "products/fetchAllCTP002ProductVariants",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/", {
        params: { endpoint: "/Product/GetAllCTP002ProductVariants" },
      });

      // Normalize response shape
      let variants = [];
      if (Array.isArray(response.data)) {
        variants = response.data;
      } else if (Array.isArray(response.data?.data)) {
        variants = response.data.data;
      } else if (Array.isArray(response.data?.variants)) {
        variants = response.data.variants;
      } else if (response.data && typeof response.data === "object") {
        const all = [];
        Object.entries(response.data).forEach(([parentId, list]) => {
          if (Array.isArray(list)) {
            list.forEach((v) => all.push({ ...v, _parentId: parentId }));
          }
        });
        variants = all;
      }

      return variants;
    } catch (error) {
      return rejectWithValue(
        error.response?.data ||
          error.message ||
          "Failed to fetch all CTP002 product variants"
      );
    }
  }
);
/* ===========================
   SLICE
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

    // Variant-related state
    productsWithoutVariants: [],
    productVariants: {},          // keyed by ctp002ProductId
    multipleProductVariants: [],
    allProductVariants: [],
    variantMergeResult: null,

    loading: false,
    error: null,
  },

  reducers: {
    setPage: (state, action) => {
      state.currentPage = action.payload;
    },

    clearProducts: (state) => {
      state.products = [];
      state.filteredProducts = [];
      state.productsByShowroom = {};
      state.currentProduct = null;
      state.error = null;
    },

    resetProducts: (state) => {
      state.products = [];
    },

    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },

    clearVariantMergeResult: (state) => {
      state.variantMergeResult = null;
    },

    clearProductVariants: (state) => {
      state.productVariants = {};
      state.multipleProductVariants = [];
      state.allProductVariants = [];
    },
  },

  extraReducers: (builder) => {
    builder
      /* ===========================
         EXISTING THUNKS
      =========================== */

      // Add Product
      .addCase(addProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products.push(action.payload);
      })
      .addCase(addProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update Product
      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(
          (item) =>
            item.Productid == updatedProduct.productID ||
            item.productID == updatedProduct.productID ||
            item.Productid == updatedProduct.Productid ||
            item.productID == updatedProduct.Productid
        );
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Update Product Image
      .addCase(updateProductImage.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateProductImage.fulfilled, (state, action) => {
        state.loading = false;
        const updatedProduct = action.payload;
        const index = state.products.findIndex(
          (item) =>
            item.Productid === updatedProduct.Productid ||
            item.productID === updatedProduct.productID ||
            item.Productid === updatedProduct.productID ||
            item.productID === updatedProduct.Productid
        );
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
      })
      .addCase(updateProductImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products By Brand
      .addCase(fetchProductsByBrand.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByBrand.fulfilled, (state, action) => {
        state.loading = false;
        state.brandProducts = action.payload;
      })
      .addCase(fetchProductsByBrand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products (active only)
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product Recent 24
      .addCase(fetchProduct.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch All Products
      .addCase(fetchAllProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAllProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchAllProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products By Category
      .addCase(fetchProductsByCategory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.productsByCategory[action.payload.categoryId] =
          action.payload.products;
      })
      .addCase(fetchProductsByCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Products By Showroom
      .addCase(fetchProductsByShowroom.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductsByShowroom.fulfilled, (state, action) => {
        state.loading = false;
        const { showRoomID, products } = action.payload;
        state.productsByShowroom[showRoomID] = products;
      })
      .addCase(fetchProductsByShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product By ID
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Paginated Products
      .addCase(fetchPaginatedProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaginatedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload;
      })
      .addCase(fetchPaginatedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Paginated Products By Showroom
      .addCase(fetchPaginatedProductsByShowroom.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPaginatedProductsByShowroom.fulfilled, (state, action) => {
        state.loading = false;
        const { showroomCode, products } = action.payload;
        state.productsByShowroom[showroomCode] = products;
      })
      .addCase(fetchPaginatedProductsByShowroom.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Active Products
      .addCase(fetchActiveProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.activeProducts = action.payload;
      })
      .addCase(fetchActiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Inactive Products
      .addCase(fetchInactiveProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInactiveProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.inactiveProducts = action.payload;
      })
      .addCase(fetchInactiveProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      // Fetch Product By Showroom And Record
      .addCase(fetchProductByShowroomAndRecord.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchProductByShowroomAndRecord.fulfilled, (state, action) => {
        state.loading = false;
        const { showRoomCode, products } = action.payload;
        state.productsByShowroom[showRoomCode] = products;
      })
      .addCase(fetchProductByShowroomAndRecord.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })

      /* ===========================
         NEW VARIANT THUNKS
      =========================== */

      
    // Fetch Products Without Variants
    .addCase(fetchProductsWithoutVariants.pending, (state) => {
      state.loading = true;
    })
    .addCase(fetchProductsWithoutVariants.fulfilled, (state, action) => {
      state.loading = false;
      state.productsWithoutVariants = action.payload;
    })
    .addCase(fetchProductsWithoutVariants.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || action.error.message;
    })

    // Create Product Variant And Merge — optimistically append to ctp002ProductVariants
    .addCase(createProductVariantAndMerge.pending, (state) => {
      state.loading = true;
    })
    .addCase(createProductVariantAndMerge.fulfilled, (state, action) => {
      state.loading = false;
      const { ctP002ProductId, createdVariants } = action.payload;
      if (ctP002ProductId && createdVariants.length) {
        const existing = state.ctp002ProductVariants[ctP002ProductId] || [];
        state.ctp002ProductVariants[ctP002ProductId] = [
          ...existing,
          ...createdVariants,
        ];
      }
    })
    .addCase(createProductVariantAndMerge.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || action.error.message;
    })

    // Fetch CTP002 Product Variants
    .addCase(fetchCTP002ProductVariants.pending, (state) => {
      state.loading = true;
    })
    .addCase(fetchCTP002ProductVariants.fulfilled, (state, action) => {
      state.loading = false;
      state.ctp002ProductVariants[action.payload.ctp002ProductId] =
        action.payload.variants;
    })
    .addCase(fetchCTP002ProductVariants.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || action.error.message;
    })

    // Fetch Multiple CTP002 Product Variants
    .addCase(fetchMultipleCTP002ProductVariants.pending, (state) => {
      state.loading = true;
    })
    .addCase(fetchMultipleCTP002ProductVariants.fulfilled, (state, action) => {
      state.loading = false;
      const { ctp002ProductIds, variants } = action.payload;
      // Group variants by parentId and merge into state
      const byParent = {};
      variants.forEach((v) => {
        const pid = v._parentId || v.ctP002ProductId || v.CTP002ProductId;
        if (!pid) return;
        if (!byParent[pid]) byParent[pid] = [];
        byParent[pid].push(v);
      });
      // If _parentId is missing but we have an array of ids, fall back
      if (Object.keys(byParent).length === 0 && Array.isArray(variants) && Array.isArray(ctp002ProductIds)) {
        // Assume single-group: distribute equally (best effort)
        // (Most APIs tag with parentId already)
      }
      Object.entries(byParent).forEach(([pid, list]) => {
        const existing = state.ctp002ProductVariants[pid] || [];
        state.ctp002ProductVariants[pid] = [...existing, ...list];
      });
    })
    .addCase(fetchMultipleCTP002ProductVariants.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || action.error.message;
    })

    // Fetch All CTP002 Product Variants
    .addCase(fetchAllCTP002ProductVariants.pending, (state) => {
      state.loading = true;
    })
    .addCase(fetchAllCTP002ProductVariants.fulfilled, (state, action) => {
      state.loading = false;
      state.allCTP002ProductVariants = action.payload;
      // Also build a map keyed by parent id for fast lookup
      const map = {};
      action.payload.forEach((v) => {
        const pid =
          v.ctP002ProductId || v.CTP002ProductId || v.ctp002ProductId || v._parentId;
        if (!pid) return;
        if (!map[pid]) map[pid] = [];
        map[pid].push(v);
      });
      state.ctp002ProductVariants = { ...state.ctp002ProductVariants, ...map };
    })
    .addCase(fetchAllCTP002ProductVariants.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || action.error.message;
    });
},

});

export const {
  clearProducts,
  setPage,
  clearCurrentProduct,
  resetProducts,
  clearVariantMergeResult,
  clearProductVariants,
} = productSlice.actions;

export default productSlice.reducer;