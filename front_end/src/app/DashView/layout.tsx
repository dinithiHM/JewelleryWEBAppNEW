'use client';

import Menu from "@/components/Menu";
import Image from "next/image";
import Link from "next/link";
import LanguageSelector from "@/components/LanguageSelector";
import TranslationProvider from "@/components/TranslationProvider";
import TranslatedText from "@/components/TranslatedText";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // All possible roles that can access the dashboard
  const allRoles = ["Admin", "Store Manager", "Sales Associate", "Cashier"];

  return (
    <ProtectedRoute allowedRoles={allRoles}>
      <TranslationProvider>
        <div className="h-screen flex bg-white">
        {/* LEFT - Scrollable Menu */}
        <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[20%] p-4 bg-[#FFE569] h-screen overflow-y-auto">
          <Link
            href="/"
            className="flex items-center justify-center lg:justify-start gap-2"
          >
            <Image src="/logo.png" alt="logo" width={32} height={80} />
            <span className="hidden lg:block font-bold text-black">
              <TranslatedText textKey="app.name" fallback="S Lanka Jewellery" />
            </span>
          </Link>
          <Menu />
        </div>

        {/* RIGHT - Main Content */}
        <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[80%] bg-white overflow-y-auto flex flex-col p-6">
          <div className="flex justify-between mb-4">
            <UserInfo />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                <TranslatedText textKey="language" fallback="Language" />:
              </span>
              <LanguageSelector />
            </div>
          </div>
          {children}
        </div>
        </div>
      </TranslationProvider>
    </ProtectedRoute>
  );
}

// Component to display user info
function UserInfo() {
  const [user, setUser] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('userInfo');
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const logout = () => {
    // Clear all auth data
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    localStorage.removeItem('branchName');
    localStorage.removeItem('branchId');

    // Redirect to login
    window.location.href = '/login';
  };

  if (!user) return null;

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
          {user.userName ? user.userName.charAt(0).toUpperCase() : 'U'}
        </div>
        <div>
          <div className="text-sm font-medium">{user.userName || 'User'}</div>
          <div className="text-xs text-gray-500">{user.role}</div>
        </div>
      </div>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <div className="py-1">
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setShowDropdown(false)}
            >
              Profile
            </Link>
            <button
              onClick={() => {
                logout();
                setShowDropdown(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
