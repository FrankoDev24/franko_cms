import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { tokenMonitor } from "./services/tokenMonitor";
import { silentUserTokenRefresh, logoutUser } from "./Redux/Slice/userSlice";

/* ==================== PAGES ==================== */
import Customers from "./Pages/AdminPages/Customers";
import AdvertisementPage from "./Pages/AdminPages/Advertisement";
import AdminPage from "./Pages/AdminPages/AdminPanel";
import Dashboard from "./Pages/AdminPages/Dashboard";
import Orders from "./Pages/AdminPages/Orders/Orders";
import AdminProducts from "./Pages/AdminPages/Products/AdminProducts";
import Adminbrands from "./Pages/AdminPages/Adminbrands";
import AdminCategory from "./Pages/AdminPages/AdminCategory";
import AdminShowroom from "./Pages/AdminPages/AdminShowroom";
import BranchProductsPage from "./Pages/AdminPages/BranchProductsPage";

import FulfillmentPage from "./Pages/Fulfilments/FulfilmentPage/FulfilmentPage";
import FulfilmentsDashboard from "./Pages/Fulfilments/FulfilmentPage/FulfilmentsDashboard";
import FulfilmentsOrder from "./Pages/Fulfilments/FulfilmentPage/FulfilmentsOrder";

import ContentPage from "./Pages/ContentManager/ContentPage";
import ContentDashboard from "./Pages/ContentManager/ContentManagerPage/ContentDashboard";
import ContentProduct from "./Pages/ContentManager/ContentManagerPage/ContentProduct";
import ContentShowroom from "./Pages/ContentManager/ContentManagerPage/ContentShowroom";
import Contentbrand from "./Pages/ContentManager/ContentManagerPage/Contentbrand";
import ContentCategory from "./Pages/ContentManager/ContentManagerPage/ContentCategory";
import ContentBranchProduct from "./Pages/ContentManager/ContentManagerPage/ContentBranchProduct";
import ContentBanner from "./Pages/ContentManager/ContentManagerPage/ContentBanner";

import DevPage from "./Pages/Developer/DevPage";
import DevDashboard from "./Pages/Developer/Dev/DevDashboard";
import DevBrands from "./Pages/Developer/Dev/DevBrands";
import DevCategory from "./Pages/Developer/Dev/DevCategory";
import DevProducts from "./Pages/Developer/Dev/DevProducts";
import DevOrders from "./Pages/Developer/Dev/DevOrders";
import DevShowroom from "./Pages/Developer/Dev/DevShowroom";
import DevBanners from "./Pages/Developer/Dev/DevBanners";
import DevUsers from "./Pages/Developer/Dev/DevUsers";
import DevCustomers from "./Pages/Developer/Dev/DevCustomers";

import DigiPage from "./Pages/DigitalMarketer/DigiPage";
import DigiOrders from "./Pages/DigitalMarketer/Digi/DigiOrders";
import DigiProducts from "./Pages/DigitalMarketer/Digi/DigiProducts";

import UserLogin from "./Pages/AdminAuth/UserLogin";
import NoInternetPage from "./Pages/NoInternet";
import ScrollToTop from "./Pages/ScrollToTop";

/* ==================== ROUTE CONFIG ==================== */
const routes = [
  // ADMIN
  { path: "/admin/dashboard", layout: AdminPage, page: Dashboard },
  { path: "/admin/orders", layout: AdminPage, page: Orders },
  { path: "/admin/products", layout: AdminPage, page: AdminProducts },
  { path: "/admin/brands", layout: AdminPage, page: Adminbrands },
  { path: "/admin/categories", layout: AdminPage, page: AdminCategory },
  { path: "/admin/showroom", layout: AdminPage, page: AdminShowroom },
  { path: "/admin/customers", layout: AdminPage, page: Customers },
  { path: "/admin/banner", layout: AdminPage, page: AdvertisementPage },
  { path: "/admin/branch-products", layout: AdminPage, page: BranchProductsPage },

  // FULFILLMENT
  { path: "/fulfillment/dashboard", layout: FulfillmentPage, page: FulfilmentsDashboard },
  { path: "/fulfillment/orders", layout: FulfillmentPage, page: FulfilmentsOrder },

  // CONTENT
  { path: "/content/dashboard", layout: ContentPage, page: ContentDashboard },
  { path: "/content/products", layout: ContentPage, page: ContentProduct },
  { path: "/content/banner", layout: ContentPage, page: ContentBanner },
  { path: "/content/showroom", layout: ContentPage, page: ContentShowroom },
  { path: "/content/brands", layout: ContentPage, page: Contentbrand },
  { path: "/content/category", layout: ContentPage, page: ContentCategory },
  { path: "/content/branch-products", layout: ContentPage, page: ContentBranchProduct },

  // DEVELOPER
  { path: "/dev/dashboard", layout: DevPage, page: DevDashboard },
  { path: "/dev/brands", layout: DevPage, page: DevBrands },
  { path: "/dev/categories", layout: DevPage, page: DevCategory },
  { path: "/dev/products", layout: DevPage, page: DevProducts },
  { path: "/dev/orders", layout: DevPage, page: DevOrders },
  { path: "/dev/showroom", layout: DevPage, page: DevShowroom },
  { path: "/dev/banner", layout: DevPage, page: DevBanners },
  { path: "/dev/users", layout: DevPage, page: DevUsers },
  { path: "/dev/customers", layout: DevPage, page: DevCustomers },

  // DIGITAL MARKETER
  { path: "/digi/orders", layout: DigiPage, page: DigiOrders },
  { path: "/digi/products", layout: DigiPage, page: DigiProducts },
];

/* ==================== APP COMPONENT ==================== */
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const dispatch = useDispatch();

  /* ──────────────────────────────────────────
     Initialize Token Monitor
  ────────────────────────────────────────── */
  useEffect(() => {
    const handleRefresh = async () => {
      await silentUserTokenRefresh(dispatch);
    };

    const handleLogout = () => {
      dispatch(logoutUser());
    };

    // Initialize token monitor with callbacks
    tokenMonitor.init(dispatch, handleRefresh, handleLogout);

    // Cleanup on unmount
    return () => {
      tokenMonitor.cleanup();
    };
  }, [dispatch]);

  /* ──────────────────────────────────────────
     Network Status Monitoring
  ────────────────────────────────────────── */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('📡 Back online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('📡 Went offline');
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ──────────────────────────────────────────
     Show No Internet Page if Offline
  ────────────────────────────────────────── */
  if (!isOnline) {
    return <NoInternetPage />;
  }

  /* ──────────────────────────────────────────
     Render Routes
  ────────────────────────────────────────── */
  return (
    <>
      <ScrollToTop />

      <Routes>
        {/* Default Route */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        
        {/* Login Route */}
        <Route path="/admin/login" element={<UserLogin />} />

        {/* Dynamic Routes */}
        {routes.map(({ path, layout: Layout, page: Page }) => (
          <Route
            key={path}
            path={path}
            element={
              <Layout>
                <Page />
              </Layout>
            }
          />
        ))}

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </>
  );
}

export default App;