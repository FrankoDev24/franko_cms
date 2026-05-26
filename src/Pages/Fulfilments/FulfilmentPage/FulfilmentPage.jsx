
import { useLocation, Navigate } from 'react-router-dom';
import FulfilmentsDashboard from './FulfilmentsDashboard';
import FulfilmentsOrder from './FulfilmentsOrder';
import FulfilmentHome from '../FufilmentHome';

const FulfillmentPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Function to render content based on the current path
  const renderContent = () => {
    switch (currentPath) {
      case '/fulfillment/dashboard':
        return <FulfilmentsDashboard />;
      case '/fulfillment/orders':
        return <FulfilmentsOrder />;
      
      case '/fulfillment':
        return <Navigate to="/fulfillment/dashboard" />;
      default:
        return <Navigate to="/fulfillment/dashboard" />;
    }
  };

  return (
    <FulfilmentHome>
      <div style={{ padding: 5, width: '100%' }}>
        {renderContent()}
      </div>
    </FulfilmentHome>
  );
};

export default FulfillmentPage
