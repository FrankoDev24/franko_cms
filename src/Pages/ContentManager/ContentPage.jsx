import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';

import ContentDashboard from './ContentManagerPage/ContentDashboard';
import ContentProduct from './ContentManagerPage/ContentProduct';
import ContentShowroom from './ContentManagerPage/ContentShowroom';

import Contentbrand from './ContentManagerPage/Contentbrand';
import ContentCategory from './ContentManagerPage/ContentCategory';
import ContentBanner from './ContentManagerPage/ContentBanner';
import ContentHome from './ContentHome';
import ContentBranchProduct from './ContentManagerPage/ContentBranchProduct';


const ContentPage = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Function to render content based on the current path
  const renderContent = () => {
    switch (currentPath) {
      case '/content/dashboard':
        return <ContentDashboard />;
      case '/content/products':
        return <ContentProduct />;
      case '/content/showroom':
        return <ContentShowroom />;
      case '/content/brands':
        return <Contentbrand />;
      case '/content/category':
        return <ContentCategory/>;
      case '/content/branch-products':
        return <ContentBranchProduct/>;
        case "/content/banner":
        return <ContentBanner/>;
      case '/content':
        return <Navigate to="/content/dashboard" />;
      default:
        return <Navigate to="/content/dashboard" />;
    }
  };

  return (
    <ContentHome>
      <div style={{ padding: 5, width: '100%' }}>
        {renderContent()}
      </div>
    </ContentHome>
  );
};

export default ContentPage;
