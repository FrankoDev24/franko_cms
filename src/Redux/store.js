// store.js
import { configureStore } from "@reduxjs/toolkit";
import { combineReducers } from "redux";

import categoryReducer from "./Slice/categorySlice";
import brandReducer from "./Slice/brandSlice";
import productReducer from "./Slice/productSlice";
import showroomReducer from "./Slice/showRoomSlice";
import orderReducer from "./Slice/orderSlice";
import userReducer from "./Slice/userSlice";
import customerReducer from "./Slice/customerSlice";
import cartReducer from "./Slice/cartSlice";
import advertismentReducer from "./Slice/advertismentSlice";
import branchProductReducer from "./Slice/branchProductSlice";
import branchOrderReducer from "./Slice/branchOrderSlice";

// ==================== COMBINE ALL REDUCERS ====================
const rootReducer = combineReducers({
  categories: categoryReducer,
  brands: brandReducer,
  products: productReducer,
  showrooms: showroomReducer,
  orders: orderReducer,
  user: userReducer,
  customer: customerReducer,
  cart: cartReducer,
  advertisment: advertismentReducer,
  branchProducts: branchProductReducer,
  branchOrders: branchOrderReducer,
});

// ==================== CONFIGURE STORE ====================
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});