// src/App.jsx
import { useEffect, useState, Suspense, lazy } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";

import { tokenMonitor } from "./services/tokenMonitor";
import { silentUserTokenRefresh, logoutUser } from "./Redux/Slice/userSlice";

import NoInternetPage from "./Pages/NoInternet";
import ScrollToTop from "./Pages/ScrollToTop";
import UserLogin from "./Pages/AdminAuth/UserLogin";
import AuthGuard from "./Component/AuthGuard";

/* ==================== LAYOUTS (eager — the app shell) ====================
   Layouts stay eager so the shell (sidebar/header) loads once and PERSISTS
   across in-section navigation. Pages below are lazy-loaded so opening one
   page downloads just that page instead of the entire application. */
import AdminPage from "./Pages/AdminPages/AdminPanel";
import FulfillmentPage from "./Pages/Fulfilments/FulfilmentPage/FulfilmentPage";
import ContentPage from "./Pages/ContentManager/ContentPage";
import DevPage from "./Pages/Developer/DevPage";
import DigiPage from "./Pages/DigitalMarketer/DigiPage";

/* ==================== PAGES (lazy — one chunk per page) ==================== */
const AdvertisementPage = lazy(() => import("./Pages/AdminPages/Advertisement"));
const Dashboard = lazy(() => import("./Pages/AdminPages/Dashboard"));
const Orders = lazy(() => import("./Pages/AdminPages/Orders/Orders"));
const AdminProducts = lazy(() => import("./Pages/AdminPages/Products/AdminProducts"));
const Adminbrands = lazy(() => import("./Pages/AdminPages/Adminbrands"));
const AdminCategory = lazy(() => import("./Pages/AdminPages/AdminCategory"));
const AdminShowroom = lazy(() => import("./Pages/AdminPages/AdminShowroom"));
const BranchProductsPage = lazy(() => import("./Pages/AdminPages/BranchProductsPage"));

const FulfilmentsDashboard = lazy(() =>
  import("./Pages/Fulfilments/FulfilmentPage/FulfilmentsDashboard")
);
const FulfilmentsOrder = lazy(() =>
  import("./Pages/Fulfilments/FulfilmentPage/FulfilmentsOrder")
);

const ContentDashboard = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/ContentDashboard")
);
const ContentProduct = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/ContentProduct")
);
const ContentShowroom = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/ContentShowroom")
);
const Contentbrand = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/Contentbrand")
);
const ContentCategory = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/ContentCategory")
);
const ContentBanner = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/ContentBanner")
);
const CTP001ProductsPage = lazy(() =>
  import("./Pages/ContentManager/ContentManagerPage/CTP001ProductsPage")
);

const DevDashboard = lazy(() => import("./Pages/Developer/Dev/DevDashboard"));
const DevBrands = lazy(() => import("./Pages/Developer/Dev/DevBrands"));
const DevCategory = lazy(() => import("./Pages/Developer/Dev/DevCategory"));
const DevProducts = lazy(() => import("./Pages/Developer/Dev/DevProducts"));
const DevOrders = lazy(() => import("./Pages/Developer/Dev/DevOrders"));
const DevShowroom = lazy(() => import("./Pages/Developer/Dev/DevShowroom"));
const DevBanners = lazy(() => import("./Pages/Developer/Dev/DevBanners"));
const DevUsers = lazy(() => import("./Pages/Developer/Dev/DevUsers"));
const DevCtp001Products = lazy(() => import("./Pages/Developer/Dev/DevCtp001Products"));

const DigiOrders = lazy(() => import("./Pages/DigitalMarketer/Digi/DigiOrders"));
const DigiProducts = lazy(() => import("./Pages/DigitalMarketer/Digi/DigiProducts"));

/* ==================== SECTION / ROUTE CONFIG ====================
   Each section is ONE parent route: the layout wraps an <Outlet/> and stays
   mounted while only the child page changes. `index` is the page shown when
   the bare section URL is opened (e.g. /admin -> /admin/dashboard).
   IMPORTANT: layouts receive <Outlet/> as `children`, so they work unchanged
   as long as they render {children} normally. */
const sections = [
  {
    path: "/admin",
    layout: AdminPage,
    index: "dashboard",
    pages: [
      { path: "dashboard", page: Dashboard },
      { path: "orders", page: Orders },
      { path: "products", page: AdminProducts },
      { path: "brands", page: Adminbrands },
      { path: "categories", page: AdminCategory },
      { path: "showroom", page: AdminShowroom },
      { path: "banner", page: AdvertisementPage },
      { path: "branch-products", page: BranchProductsPage },
    ],
  },
  {
    path: "/fulfillment",
    layout: FulfillmentPage,
    index: "dashboard",
    pages: [
      { path: "dashboard", page: FulfilmentsDashboard },
      { path: "orders", page: FulfilmentsOrder },
    ],
  },
  {
    path: "/content",
    layout: ContentPage,
    index: "dashboard",
    pages: [
      { path: "dashboard", page: ContentDashboard },
      { path: "products", page: ContentProduct },
      { path: "banner", page: ContentBanner },
      { path: "showroom", page: ContentShowroom },
      { path: "brands", page: Contentbrand },
      { path: "category", page: ContentCategory },
      { path: "ctp001-products", page: CTP001ProductsPage },
    ],
  },
  {
    path: "/dev",
    layout: DevPage,
    index: "dashboard",
    pages: [
      { path: "dashboard", page: DevDashboard },
      { path: "brands", page: DevBrands },
      { path: "categories", page: DevCategory },
      { path: "products", page: DevProducts },
      { path: "orders", page: DevOrders },
      { path: "showroom", page: DevShowroom },
      { path: "banner", page: DevBanners },
      { path: "users", page: DevUsers },
      { path: "ctp001-products", page: DevCtp001Products },
    ],
  },
  {
    path: "/digi",
    layout: DigiPage,
    index: "orders",
    pages: [
      { path: "orders", page: DigiOrders },
      { path: "products", page: DigiProducts },
    ],
  },
];

/* Small self-contained loader (no UI-framework dependency) */
const PageLoader = ({ label = "Loading page..." }) => (
  <div
    style={{
      minHeight: 240,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      alignItems: "center",
      justifyContent: "center",
      padding: 48,
    }}
  >
    <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
    <div
      style={{
        width: 42,
        height: 42,
        border: "4px solid #e5e7eb",
        borderTopColor: "#16a34a",
        borderRadius: "50%",
        animation: "app-spin 0.8s linear infinite",
      }}
    />
    <span style={{ color: "#6b7280", fontSize: 14 }}>{label}</span>
  </div>
);

/* Sends a user to login while REMEMBERING where they were trying to go, so
   after authentication they can be returned to that page instead of the
   dashboard (see FIX-NOTES.md). */
const RedirectToLogin = () => {
  const location = useLocation();
  return (
    <Navigate
      to="/admin/login"
      state={{ from: location }}
      replace
    />
  );
};

/* ==================== APP COMPONENT ==================== */
function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const dispatch = useDispatch();
  const location = useLocation();

  /* Initialize Token Monitor */
  useEffect(() => {
    const handleRefresh = () => silentUserTokenRefresh(dispatch);
    const handleLogout = () => dispatch(logoutUser());

    tokenMonitor.init(dispatch, handleRefresh, handleLogout);

    return () => tokenMonitor.cleanup();
  }, [dispatch]);

  /* Network Status Monitoring */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("📡 Back online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("📡 Went offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return <NoInternetPage />;
  }

  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes - NO AuthGuard */}
        <Route path="/" element={<RedirectToLogin />} />
        <Route path="/admin/login" element={<UserLogin />} />

        {/* Protected Sections — layout stays mounted; only the page changes */}
        {sections.map(({ path, layout: Layout, index, pages }) => (
          <Route
            key={path}
            path={path}
            element={
              <AuthGuard>
                <Layout>
                  {/* Suspense INSIDE the layout: a slow page chunk shows the
                      loader in the content area while the shell stays put. */}
                  <Suspense fallback={<PageLoader />}>
                    <Outlet />
                  </Suspense>
                </Layout>
              </AuthGuard>
            }
          >
            {/* Bare section URL -> its default page */}
            <Route index element={<Navigate to={index} replace />} />
            {pages.map(({ path: pagePath, page: Page }) => (
              <Route key={pagePath} path={pagePath} element={<Page />} />
            ))}
          </Route>
        ))}

        {/* Catch-all — remembers the attempted URL for post-login return */}
        <Route path="*" element={<RedirectToLogin />} />
      </Routes>
    </>
  );
}

export default App;
