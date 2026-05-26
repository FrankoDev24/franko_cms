import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';

const NoInternetPage = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);
    
    // Simulate checking connection
    setTimeout(() => {
      setIsRetrying(false);
      // Force a page reload to check actual connection
      window.location.reload();
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <WifiOff className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Main Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          No Internet Connection
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          It looks like you're not connected to the internet. Please check your connection and try again.
        </p>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="w-full bg-red-400 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="w-5 h-5" />
              Try Again
            </>
          )}
        </button>

        {/* Retry Count */}
        {retryCount > 0 && (
          <p className="text-sm text-gray-500 mt-4">
            Retry attempts: {retryCount}
          </p>
        )}

        {/* Connection Tips */}
        <div className="mt-8 p-4 bg-red-50 rounded-lg">
          <h3 className="font-medium text-red-500 mb-2">
            Connection Tips:
          </h3>
          <ul className="text-sm text-red-800 space-y-1">
            <li>• Check your WiFi or mobile data</li>
            <li>• Move closer to your router</li>
            <li>• Restart your router or device</li>
            <li>• Contact your internet provider</li>
          </ul>
        </div>

        {/* Status Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          Offline
        </div>
      </div>
    </div>
  );
};

export default NoInternetPage;