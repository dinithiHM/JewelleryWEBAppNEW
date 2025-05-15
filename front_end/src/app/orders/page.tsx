"use client";

import React, { useState, useEffect } from "react";

interface Order {
  order_id: number;
  category: string;
  supplier_id: number;
  quantity: number;
  offer_gold: number;
  selected_karats: string;
  karat_values: string;
  design_image: string;
  design_image_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  branch_id?: number;
  branch_name?: string;
}

const OrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<number | null>(null);

  useEffect(() => {
    // Get user info from localStorage
    const role = localStorage.getItem('role');
    const branchId = localStorage.getItem('branchId');

    console.log('Retrieved from localStorage - Role:', role, 'Branch ID:', branchId);

    // Set user role (convert to lowercase for consistency)
    const normalizedRole = role === 'Admin' ? 'admin' : (role?.toLowerCase() || '');
    setUserRole(normalizedRole);

    // Set branch ID
    const numericBranchId = branchId ? Number(branchId) : null;
    setUserBranchId(numericBranchId);

    // Fetch orders with proper filtering
    fetchOrders(normalizedRole, numericBranchId);
  }, []);

  const fetchOrders = async (role: string, branchId: number | null) => {
    try {
      setLoading(true);

      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/orders';
      const params = new URLSearchParams();

      // Always send the role parameter
      params.append('role', role || '');

      // For non-admin users, branch filtering is mandatory
      if (role !== 'admin') {
        // If branchId is not available, use a fallback to prevent seeing all orders
        params.append('branch_id', branchId?.toString() || '0');
      }

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching orders from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      console.log('Fetched orders:', data.length);
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:px-20 xl:px-40">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-3">
            <thead>
              <tr className="text-left bg-gray-100">
                <th className="py-3 px-4 rounded-tl-lg">Order ID</th>
                <th className="py-3 px-4">Category</th>
                {userRole === 'admin' && (
                  <th className="py-3 px-4">Branch</th>
                )}
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 rounded-tr-lg">Image</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id} className="text-sm md:text-base hover:bg-gray-50">
                  <td className="py-4 px-4 border-b border-gray-200">{order.order_id}</td>
                  <td className="py-4 px-4 border-b border-gray-200">{order.category}</td>
                  {userRole === 'admin' && (
                    <td className="py-4 px-4 border-b border-gray-200">
                      {order.branch_name ||
                      (order.branch_id === 1 ? 'Mahiyangana Branch' :
                       order.branch_id === 2 ? 'Mahaoya Branch' :
                       'Not assigned')}
                    </td>
                  )}
                  <td className="py-4 px-4 border-b border-gray-200">{order.quantity}</td>
                  <td className="py-4 px-4 border-b border-gray-200">
                    <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                      'bg-blue-100 text-blue-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 border-b border-gray-200">{formatDate(order.created_at)}</td>
                  <td className="py-4 px-4 border-b border-gray-200">
                    {order.design_image_url ? (
                      <img
                        src={order.design_image_url}
                        alt="Design"
                        className="w-12 h-12 object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-gray-400">No image</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
