'use client';

import React, { useEffect, useState } from 'react';

import { ShieldAlert, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('userInfo');
    const role = localStorage.getItem('role');

    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        // Fallback to role
        if (role) {
          setUser({ role });
        }
      }
    } else if (role) {
      // If userInfo is not available but role is, create a minimal user object
      setUser({ role });
    }
  }, []);

  const handleGoBack = () => {
    window.history.back();
  };

  const handleGoHome = () => {
    if (user) {
      // Redirect based on user role
      switch (user.role.toLowerCase()) {
        case 'admin':
          window.location.href = '/DashView/admin';
          break;
        case 'store manager':
          window.location.href = '/DashView/storeManager';
          break;
        case 'sales associate':
          window.location.href = '/DashView/salesAssociate';
          break;
        case 'cashier':
          window.location.href = '/DashView/cashier';
          break;
        default:
          window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <ShieldAlert size={64} className="text-red-500" />
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>

        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>

          <button
            onClick={handleGoHome}
            className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
