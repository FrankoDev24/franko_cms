// Component/withAccessCode.jsx
import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import AccessCodeModal, { checkAccessCodeValidity } from './AccessCodeModal';

const withAccessCode = (WrappedComponent) => {
  return function WithAccessCodeComponent(props) {
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [isCheckingAccess, setIsCheckingAccess] = useState(true);

    useEffect(() => {
      const checkAccess = () => {
        const isValid = checkAccessCodeValidity();
        
        if (isValid) {
          setHasAccess(true);
          setShowAccessModal(false);
        } else {
          setHasAccess(false);
          setShowAccessModal(true);
        }
        
        setIsCheckingAccess(false);
      };

      // Small delay to prevent flash
      const timer = setTimeout(checkAccess, 100);
      return () => clearTimeout(timer);
    }, []);

    const handleAccessSuccess = () => {
      setShowAccessModal(false);
      setHasAccess(true);
    };

    // Loading state
    if (isCheckingAccess) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <Spin size="large" tip="Checking access..." />
        </div>
      );
    }

    // Show modal if no access
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <AccessCodeModal 
            visible={showAccessModal} 
            onSuccess={handleAccessSuccess} 
          />
        </div>
      );
    }

    // Render wrapped component if access granted
    return <WrappedComponent {...props} />;
  };
};

export default withAccessCode;