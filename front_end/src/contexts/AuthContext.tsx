'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Define the user type
interface User {
  id: number;
  email: string;
  role: string;
  branch_id?: number;
  branch_name?: string;
  name?: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAccess: (allowedRoles: string[]) => boolean;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Create the auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if the user is authenticated
  const isAuthenticated = !!user;

  // Initialize auth state from localStorage on component mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    // IMPORTANT: We're completely disabling any redirects for the login page
    // This ensures users can stay on the login page to enter their credentials

    // Only apply redirects for protected routes, not for login pages or supplier pages
    if (!isLoading &&
        pathname !== '/login' &&
        !pathname.startsWith('/supplier/')) {
      const isLandingPage = pathname === '/';
      const isPublicPage = isLandingPage ||
                          pathname === '/unauthorized' ||
                          pathname.startsWith('/supplier/');

      if (!isAuthenticated && !isPublicPage) {
        // Redirect to login if not authenticated and not on a public page
        router.push('/login');
      }
      // Don't redirect from landing page even if authenticated
      // This allows users to see the landing page and choose to go to login
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Redirect to the appropriate dashboard based on user role
  const redirectToDashboard = () => {
    if (!user) return;

    // Add a small delay to ensure the user state is properly set
    setTimeout(() => {
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
          window.location.href = '/DashView/user';
      }
    }, 100);
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      // For testing purposes, let's add a simple mock login
      // This will allow us to test the authentication flow without a backend
      // You can remove this and use the real login endpoints when ready
      if (email === 'admin@test.com' && password === 'admin123') {
        const userData: User = {
          id: 1,
          email: email,
          role: 'Admin',
          name: 'Admin User',
        };

        // Store auth data
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', 'mock-token-admin');
        localStorage.setItem('role', userData.role);

        // Update state
        setUser(userData);
        setIsLoading(false);

        // Redirect to appropriate dashboard
        redirectToDashboard();
        return true;
      }

      if (email === 'manager@test.com' && password === 'manager123') {
        const userData: User = {
          id: 2,
          email: email,
          role: 'Store Manager',
          branch_id: 1,
          branch_name: 'Mahiyanganaya Branch',
          name: 'Store Manager',
        };

        // Store auth data
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', 'mock-token-manager');
        localStorage.setItem('role', userData.role);

        // Update state
        setUser(userData);
        setIsLoading(false);

        // Redirect to appropriate dashboard
        redirectToDashboard();
        return true;
      }

      // Try real login endpoints if mock login fails
      // First try admin login, then employee login
      let loginSuccess = false;

      // Try admin login first
      try {
        const adminResponse = await fetch('http://localhost:3002/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });

        const adminData = await adminResponse.json();

        if (adminResponse.ok && adminData.loginStatus) {
          // Extract user data from response
          const userData: User = {
            id: adminData.id || 0,
            email: email,
            role: 'Admin',
            name: 'Administrator',
          };

          // Store auth data
          localStorage.setItem('userInfo', JSON.stringify(userData));
          localStorage.setItem('token', adminData.token || 'admin-token');
          localStorage.setItem('role', userData.role);

          // Update state
          setUser(userData);
          setIsLoading(false);

          // Redirect to admin dashboard
          window.location.href = '/DashView/admin';
          return true;
        }
      } catch (adminError) {
        console.error('Admin login error:', adminError);
      }

      // If admin login fails, try employee login
      const loginEndpoint = 'http://localhost:3002/users/userlogin';

      const response = await fetch(loginEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.loginStatus) {
        console.log("Employee login successful with role:", data.role);

        // Store individual items first for backward compatibility
        if (data.userName) {
          localStorage.setItem("userName", data.userName);
        }

        if (data.userId) {
          localStorage.setItem("userId", data.userId.toString());
        }

        if (data.branchName) {
          localStorage.setItem("branchName", data.branchName);
        }

        if (data.branchId) {
          localStorage.setItem("branchId", data.branchId.toString());
        }

        // For Store Managers, set a hardcoded branch name based on branch ID if not provided
        if (data.role === "Store Manager" && data.branchId && !data.branchName) {
          const branchId = data.branchId;
          let branchName = "";

          if (branchId === 1) {
            branchName = "Mahiyanganaya Branch";
          } else if (branchId === 2) {
            branchName = "Mahaoya Branch";
          } else {
            branchName = `Branch ${branchId}`;
          }

          localStorage.setItem("branchName", branchName);
        }

        // Extract user data from response
        const userData: User = {
          id: data.userId || 0,
          email: email,
          role: data.role || 'Guest',
          branch_id: data.branchId,
          branch_name: data.branchName || localStorage.getItem("branchName") || '',
          name: data.userName || email.split('@')[0],
        };

        // Store auth data
        localStorage.setItem('userInfo', JSON.stringify(userData));
        localStorage.setItem('token', data.accessToken || 'dummy-token');
        localStorage.setItem('role', userData.role);

        // Update state
        setUser(userData);
        setIsLoading(false);

        // Special handling for Admin users coming from employee login
        if (data.role.toLowerCase() === 'admin') {
          window.location.href = '/DashView/admin';
          return true;
        }

        // Redirect to appropriate dashboard for other roles
        redirectToDashboard();
        return true;
      } else {
        console.error('Login failed:', data.Error || 'Unknown error');
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = () => {
    // Clear all auth data
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('branchId');

    // For backward compatibility
    localStorage.removeItem('user');

    // Update state
    setUser(null);

    // Redirect to login
    window.location.href = '/login';
  };

  // Check if the user has access to a route based on their role
  const checkAccess = (allowedRoles: string[]): boolean => {
    if (!user) return false;
    return allowedRoles.some(role =>
      user.role.toLowerCase() === role.toLowerCase()
    );
  };

  // Context value
  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAccess,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
