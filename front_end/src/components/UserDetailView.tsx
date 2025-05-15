"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Building, Mail, Phone, User, CreditCard, MapPin } from "lucide-react";
import Link from "next/link";

interface UserData {
  id?: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  username?: string;
  branch_id?: number;
  branch_name?: string;
  nic?: string;
  phone?: string;
  contact_no?: string;
  address?: string;
  role?: string;
  created_at?: string;
  manufacturing_items?: string;
  category?: string;
  supplier_id?: string;
}

interface UserDetailViewProps {
  userId: string;
  userType: "store-manager" | "sales-associate" | "cashier" | "supplier";
  backUrl: string;
}

const UserDetailView = ({ userId, userType, backUrl }: UserDetailViewProps) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      setError(null);

      // Check if userId is valid
      if (!userId) {
        setError("Invalid user ID");
        setIsLoading(false);
        return;
      }

      try {
        // Determine the API endpoint based on userType
        let endpoint = "";
        switch (userType) {
          case "store-manager":
            endpoint = `http://localhost:3002/store-managers/${userId}`;
            break;
          case "sales-associate":
            endpoint = `http://localhost:3002/sales-associates/${userId}`;
            break;
          case "cashier":
            endpoint = `http://localhost:3002/cashiers/${userId}`;
            break;
          case "supplier":
            endpoint = `http://localhost:3002/suppliers/${userId}`;
            break;
          default:
            throw new Error("Invalid user type");
        }

        console.log(`Fetching user data from: ${endpoint}`);
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received user data:", data);

        // Normalize the data structure
        const normalizedData: UserData = {
          id: data.user_id || data.id || data.supplier_id,
          user_id: data.user_id,
          supplier_id: data.supplier_id,
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          username: data.username || "",
          branch_id: data.branch_id,
          branch_name: data.branch_name,
          nic: data.nic || "",
          phone: data.phone || "",
          contact_no: data.contact_no || "",
          address: data.address || "",
          role: data.role || userType,
          created_at: data.created_at,
          manufacturing_items: data.manufacturing_items || "",
          category: data.category || ""
        };

        setUserData(normalizedData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(error instanceof Error ? error.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [userId, userType]);

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="p-4 bg-red-100 text-red-700 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{error}</p>
        </div>
        <div className="mt-4">
          <Link href={backUrl} className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft size={16} className="mr-1" /> Back to list
          </Link>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="p-4 bg-yellow-100 text-yellow-700 rounded-md">
          <h2 className="text-lg font-semibold mb-2">User Not Found</h2>
          <p>The requested user could not be found.</p>
        </div>
        <div className="mt-4">
          <Link href={backUrl} className="flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeft size={16} className="mr-1" /> Back to list
          </Link>
        </div>
      </div>
    );
  }

  // Format the role name for display
  const formatRoleName = (role: string) => {
    return role
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-6 flex justify-between items-center">
        <Link href={backUrl} className="flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft size={16} className="mr-1" /> Back to list
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {userData.first_name} {userData.last_name}
        </h1>
        <div className="text-sm text-gray-500 flex items-center">
          <User size={16} className="mr-1" />
          <span className="capitalize">{formatRoleName(userData.role || userType)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Personal Information</h2>

          <div className="space-y-4">
            {/* Only show full name if either first or last name exists */}
            {(userData.first_name || userData.last_name) && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Full Name</h3>
                <p className="mt-1 text-gray-900">{userData.first_name} {userData.last_name}</p>
              </div>
            )}

            {/* Only show username if it exists */}
            {userData.username && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Username</h3>
                <p className="mt-1 text-gray-900">{userData.username}</p>
              </div>
            )}

            {/* Only show email if it exists */}
            {userData.email && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-gray-900 flex items-center">
                  <Mail size={16} className="mr-1 text-gray-400" />
                  {userData.email}
                </p>
              </div>
            )}

            {userData.nic && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">NIC</h3>
                <p className="mt-1 text-gray-900 flex items-center">
                  <CreditCard size={16} className="mr-1 text-gray-400" />
                  {userData.nic}
                </p>
              </div>
            )}

            {userData.manufacturing_items && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Manufacturing Items</h3>
                <p className="mt-1 text-gray-900">
                  {userData.manufacturing_items}
                </p>
              </div>
            )}

            {userData.category && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Category</h3>
                <p className="mt-1 text-gray-900">
                  {userData.category}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Contact Information</h2>

          <div className="space-y-4">
            {userData.phone && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <p className="mt-1 text-gray-900 flex items-center">
                  <Phone size={16} className="mr-1 text-gray-400" />
                  {userData.phone}
                </p>
              </div>
            )}

            {userData.contact_no && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Contact Number</h3>
                <p className="mt-1 text-gray-900 flex items-center">
                  <Phone size={16} className="mr-1 text-gray-400" />
                  {userData.contact_no}
                </p>
              </div>
            )}

            {userData.address && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p className="mt-1 text-gray-900 flex items-start">
                  <MapPin size={16} className="mr-1 text-gray-400 mt-1" />
                  <span>{userData.address}</span>
                </p>
              </div>
            )}

            {userData.branch_name && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Branch</h3>
                <p className="mt-1 text-gray-900 flex items-center">
                  <Building size={16} className="mr-1 text-gray-400" />
                  {userData.branch_name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailView;
