
import { useLocation, Navigate } from 'react-router-dom';
import DevBrands from './Dev/DevBrands';
import DevCategory from './Dev/DevCategory';
import DevProducts from './Dev/DevProducts';
import DevOrders from './Dev/DevOrders';

import DevBanners from './Dev/DevBanners';
import DevUsers from './Dev/DevUsers';


import DevDashboard from './Dev/DevDashboard';

import DevShowroom from './Dev/DevShowroom';
import DevLayout from './DevLayout';
import DevCustomers from './Dev/DevCustomers';
import DevBranchProducts from './Dev/DevBranchProducts';

const DevPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Function to render content based on the current path
  const renderContent = () => {
    switch (currentPath) {
      case '/dev/dashboard':
        return < DevDashboard/>;
      case '/dev/brands':
        return <DevBrands />;
      case '/dev/categories':
        return <DevCategory />;
      case '/dev/products':
        return <DevProducts />;
      case '/dev/orders':
        return <DevOrders />;
      case '/dev/showroom':
        return <DevShowroom />;
        case "/dev/banner":
        return <DevBanners/>;
        case '/dev/branch-products':
        return <DevBranchProducts/>;
      case '/dev/users':
        return <DevUsers />;
      case '/dev/customers':
        return <DevCustomers />;
       
      case '/dev':
        return <Navigate to="/dev/dashboard" />;
      default:
        return <Navigate to="/dev/dashboard" />;
    }
  };

  return (
    <DevLayout>
      <div style={{ padding: 16, width: '100%' }}>
        {renderContent()}
      </div>
    </DevLayout>
  );
};

export default DevPage
