
import { useLocation, Navigate } from 'react-router-dom';
import AdminLayout from './Layout';  // Assuming AdminLayout provides sidebar and layout
import Dashboard from './Dashboard';
import Brands from './Adminbrands.jsx';
import Categories from './AdminCategory';
import Products from './Products/AdminProducts.jsx';
import Orders from './Orders/Orders';
import ShowRoom from "./AdminShowroom.jsx";
import Users from './Users';
import Customers from './Customers';
import AdvertisementPage from './Advertisement';
import BranchProductsPage from './BranchProductsPage.jsx';


const AdminPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Function to render content based on the current path
  const renderContent = () => {
    switch (currentPath) {
      case '/admin/dashboard':
        return <Dashboard />;
      case '/admin/brands':
        return <Brands />;
      case '/admin/categories': 
        return <Categories />;
      case '/admin/products':
        return <Products />;
      case '/admin/orders':
        return <Orders />;
      case '/admin/showroom':
        return <ShowRoom />;
        case "/admin/banner":
        return <AdvertisementPage />;
        case '/admin/branch-products':
        return <BranchProductsPage />;
      case '/admin/users':
        return <Users />;
      case '/admin/customers':
        return <Customers />;
      case '/admin':
        return <Navigate to="/admin/dashboard" />;
      default:
        return <Navigate to="/admin/dashboard" />;
    }
  };

  return (
    <AdminLayout>
      <div style={{ padding: 16, width: '100%' }}>
        {renderContent()}
      </div>
    </AdminLayout>
  );
};

export default AdminPage
