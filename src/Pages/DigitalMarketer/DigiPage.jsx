
import { useLocation, Navigate } from 'react-router-dom';

import DigiLayout from './DigiLayout';


import DigiProducts from './Digi/DigiProducts';
import DigiOrders from './Digi/DigiOrders';

const DigiPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Function to render content based on the current path
  const renderContent = () => {
    switch (currentPath) {
    
      case '/digi/products':
        return <DigiProducts />;
      case '/digi/orders':
        return <DigiOrders />;
      
      case '/digi':
        return <Navigate to="/digi/orders" />;
      default:
        return <Navigate to="/digi/orders" />;
    }
  };

  return (
    <DigiLayout>
      <div style={{ padding: 16, width: '100%' }}>
        {renderContent()}
      </div>
    </DigiLayout>
  );
};

export default DigiPage
