'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication from localStorage
    const checkAuth = () => {
      const userInfo = localStorage.getItem('userInfo');
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('role');

      if (userInfo && token && role) {
        try {
          const userData = JSON.parse(userInfo);
          setUserRole(userData.role || role);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          // Fallback to role from localStorage
          if (role) {
            setUserRole(role);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } else {
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, []);

  useEffect(() => {
    // Wait until auth state is loaded
    if (!isLoading) {
      // If not authenticated, redirect to login
      if (!isAuthenticated) {
        router.push('/login');
      }
      // If authenticated but not authorized for this route
      else if (!checkAccess(allowedRoles)) {
        router.push('/unauthorized');
      }
    }
  }, [isLoading, isAuthenticated, allowedRoles, router]);

  // Check if the user has access to a route based on their role
  const checkAccess = (allowedRoles: string[]): boolean => {
    if (!userRole) return false;
    return allowedRoles.some(role =>
      userRole.toLowerCase() === role.toLowerCase()
    );
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  // If not authenticated or not authorized, don't render children
  if (!isAuthenticated || !checkAccess(allowedRoles)) {
    return null;
  }

  // If authenticated and authorized, render children
  return <>{children}</>;
};

export default ProtectedRoute;
