// Component/AccessCodeModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, message } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import axios from 'axios';

// Get Lambda URL from environment
const LAMBDA_BASE_URL = import.meta.env.VITE_LAMBDA_BASE_URL;

// LocalStorage key
const ACCESS_CODE_KEY = 'admin_access_code';

// ============ Utility Functions ============

/**
 * Validates if the stored access code matches the backend key
 * @returns {Promise<boolean>} - Returns true if valid, false otherwise
 */
export const checkAccessCodeValidity = async () => {
  const storedCode = localStorage.getItem(ACCESS_CODE_KEY);
  
  if (!storedCode) {
    return false;
  }
  
  try {
    // Verify stored code against backend
    const response = await axios.post(
      `${LAMBDA_BASE_URL}/?endpoint=/Auth/Verify-Access-Code`,
      { accessCode: storedCode },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    return response.data?.success || false;
  } catch (error) {
    // If verification fails, clear the stored code
    clearAccessCode();
    return false;
  }
};

/**
 * Stores the verified access code in localStorage
 * @param {string} accessCode - The verified access code
 */
export const storeAccessCode = (accessCode) => {
  localStorage.setItem(ACCESS_CODE_KEY, accessCode);
};

/**
 * Clears the stored access code
 */
export const clearAccessCode = () => {
  localStorage.removeItem(ACCESS_CODE_KEY);
};

/**
 * Gets the currently stored access code (for internal use only)
 * @returns {string|null}
 */
export const getStoredAccessCode = () => {
  return localStorage.getItem(ACCESS_CODE_KEY);
};

// ============ API Call to Lambda ============

const verifyAccessCodeWithBackend = async (accessCode) => {
  try {
    const response = await axios.post(
      `${LAMBDA_BASE_URL}/?endpoint=/Auth/Verify-Access-Code`,
      { accessCode },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );
    
    return {
      success: response.data?.success || false,
      message: response.data?.message || 'Verification failed',
      attemptsRemaining: response.data?.attemptsRemaining,
    };
  } catch (error) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    // Handle rate limiting (429)
    if (status === 429) {
      return {
        success: false,
        message: 'Too many attempts. Please try again in 15 minutes.',
        isRateLimited: true,
      };
    }
    
    // Handle unauthorized (401) - invalid access code
    if (status === 401) {
      return {
        success: false,
        message: errorData?.message || 'Invalid access code',
        attemptsRemaining: errorData?.attemptsRemaining,
      };
    }
    
    // Handle other errors
    return {
      success: false,
      message: errorData?.message || 'Network error. Please try again.',
      attemptsRemaining: errorData?.attemptsRemaining,
    };
  }
};

// ============ Modal Component ============

const AccessCodeModal = ({ visible, onSuccess, onCancel }) => {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [validating, setValidating] = useState(true);

  // Check existing access code on mount
  useEffect(() => {
    const validateExistingCode = async () => {
      if (!visible) {
        setValidating(false);
        return;
      }

      const storedCode = getStoredAccessCode();
      
      if (!storedCode) {
        setValidating(false);
        return;
      }

      // Validate stored code against backend
      const isValid = await checkAccessCodeValidity();
      
      if (isValid) {
        // Stored code is still valid, grant access immediately
        message.success('Access granted!');
        onSuccess();
      } else {
        // Stored code is invalid or backend key changed
        clearAccessCode();
        message.info('Access code has changed. Please enter the new code.');
      }
      
      setValidating(false);
    };

    validateExistingCode();
  }, [visible, onSuccess]);

  const handleSubmit = async () => {
    if (!accessCode.trim()) {
      message.warning('Please enter an access code');
      return;
    }

    if (isLocked || attempts >= 5) {
      message.error('Access locked. Please try again later.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await verifyAccessCodeWithBackend(accessCode.trim());
      
      if (result.success) {
        // Store the verified access code
        storeAccessCode(accessCode.trim());
        message.success('Access granted! You can now proceed.');
        setAccessCode('');
        setAttempts(0);
        onSuccess();
      } else {
        // Handle rate limiting
        if (result.isRateLimited) {
          setIsLocked(true);
          message.error(result.message);
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          
          if (newAttempts >= 5) {
            message.error('Too many failed attempts. Please contact administrator.');
          } else {
            const remaining = result.attemptsRemaining ?? (5 - newAttempts);
            message.error(`Invalid access code. ${remaining} attempts remaining.`);
          }
        }
        setAccessCode('');
      }
    } catch (error) {
      console.error('Access code verification error:', error);
      message.error('Failed to verify access code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && !isLocked && attempts < 5) {
      handleSubmit();
    }
  };

  const isDisabled = attempts >= 5 || loading || isLocked || validating;

  return (
    <Modal
      title={null}
      open={visible}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={400}
    >
      <div className="py-6 px-2">
        {/* Icon and Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <SafetyOutlined className="text-3xl text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Access Code Required</h2>
          <p className="text-gray-500 text-sm mt-2">
            {validating 
              ? 'Validating your access...'
              : 'This area is restricted. Please enter your access code to continue.'}
          </p>
        </div>

        {/* Validation Loading State */}
        {validating ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
            <p className="text-gray-600 text-sm">Checking your access code...</p>
          </div>
        ) : (
          <>
            {/* Access Code Input */}
            <div className="space-y-4">
              <Input.Password
                placeholder="Enter access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                onKeyPress={handleKeyPress}
                size="large"
                prefix={<LockOutlined className="text-gray-400" />}
                disabled={isDisabled}
                className="rounded-lg"
                autoFocus
              />
              
              {attempts > 0 && attempts < 5 && !isLocked && (
                <p className="text-red-500 text-sm text-center">
                  {5 - attempts} attempts remaining
                </p>
              )}

              {(attempts >= 5 || isLocked) && (
                <p className="text-red-500 text-sm text-center">
                  {isLocked 
                    ? 'Rate limit exceeded. Please try again in 15 minutes.'
                    : 'Access locked. Please contact administrator.'}
                </p>
              )}

              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                disabled={isDisabled}
                className="w-full bg-green-700 hover:bg-green-800 h-10 rounded-lg"
                size="large"
              >
                {loading ? 'Verifying...' : 'Verify Access Code'}
              </Button>

              {onCancel && (
                <Button
                  onClick={onCancel}
                  className="w-full h-10 rounded-lg"
                  size="large"
                  disabled={validating}
                >
                  Cancel
                </Button>
              )}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-xs text-center">
                <LockOutlined className="mr-1" />
                Your access code is validated against our secure server
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default AccessCodeModal;