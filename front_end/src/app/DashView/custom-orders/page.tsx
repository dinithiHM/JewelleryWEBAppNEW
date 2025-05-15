"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  X,
  Building
} from 'lucide-react';
// import Image from 'next/image'; // Not needed after removing the modal
import { formatCurrency } from '@/utils/formatters';
import LKRIcon from '@/components/LKRIcon';

// Define types
interface CustomOrder {
  order_id: number;
  order_reference: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  order_date: string;
  estimated_completion_date: string | null;
  estimated_amount: number;
  advance_amount: number;
  balance_amount: number;
  order_status: 'Pending' | 'In Progress' | 'Completed' | 'Delivered' | 'Cancelled';
  payment_status: 'Not Paid' | 'Partially Paid' | 'Fully Paid' | 'Completed';
  category_name: string | null;
  description: string | null;
  special_requirements: string | null;
  branch_id: number;
  branch_name: string;
  created_by_first_name: string;
  created_by_last_name: string;
  images: string | null;
  payment_count: number;
  total_paid: number;
  min_balance?: number | null;
  latest_payment_status?: string | null;
  current_payment_status?: string | null;
}

const CustomOrdersPage = () => {
  const router = useRouter();

  // State for data
  const [orders, setOrders] = useState<CustomOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<CustomOrder[]>([]);

  // State for user role and branch
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<{branch_id: number, branch_name: string}[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [filterByBranch, setFilterByBranch] = useState<boolean>(true); // Default to filtering by branch for admin
  const [showAllBranches, setShowAllBranches] = useState<boolean>(false); // Default to showing only user's branch for non-admin

  // State for UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('order_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // These states are kept for future use if we add a quick view feature
  // const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  // const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'info' | 'warning' | 'error'} | null>(null);
  const [previousOrders, setPreviousOrders] = useState<CustomOrder[]>([]);
  const [recentlyChangedOrders, setRecentlyChangedOrders] = useState<number[]>([]);

  // Function to fetch custom orders
  const fetchOrders = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();

      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/custom-orders';
      const params = new URLSearchParams();

      // Always send the role parameter
      params.append('role', userRole || '');

      // Add branch_id parameter if we have one
      if (userRole === 'admin' && selectedBranchId && filterByBranch) {
        // Admin with selected branch and filtering enabled
        params.append('branch_id', selectedBranchId.toString());
        params.append('filter_branch', 'true');
      } else if (userRole !== 'admin' && userBranchId && !showAllBranches) {
        // Non-admin showing only their branch
        params.append('branch_id', userBranchId.toString());
        params.append('filter_branch', 'true');
      } else {
        // No branch filtering
        params.append('filter_branch', 'false');
      }

      // Add timestamp to prevent caching
      params.append('t', timestamp.toString());

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching custom orders from:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();

      // Check for payment status changes
      if (previousOrders.length > 0) {
        const paymentChanges = data.filter((newOrder: CustomOrder) => {
          const oldOrder = previousOrders.find(o => o.order_id === newOrder.order_id);
          return oldOrder && (
            oldOrder.payment_status !== newOrder.payment_status ||
            oldOrder.advance_amount !== newOrder.advance_amount ||
            oldOrder.total_paid !== newOrder.total_paid
          );
        });

        if (paymentChanges.length > 0) {
          // Track recently changed orders for highlighting
          const changedOrderIds = paymentChanges.map((order: CustomOrder) => order.order_id);
          setRecentlyChangedOrders(changedOrderIds);

          // Clear the highlight after 15 seconds
          setTimeout(() => setRecentlyChangedOrders([]), 15000);

          // Show notification for payment status changes
          const changedOrder = paymentChanges[0]; // Just show the first one if multiple changed
          const statusText =
            (changedOrder.payment_status === 'Completed' || changedOrder.payment_status === 'Fully Paid') ? 'Completed' :
            changedOrder.payment_status === 'Partially Paid' ? 'Partially Paid' : 'Not Paid';

          setNotification({
            message: `Payment status updated: ${changedOrder.order_reference} is now ${statusText}`,
            type: (changedOrder.payment_status === 'Completed' || changedOrder.payment_status === 'Fully Paid') ? 'success' : 'info'
          });

          // Auto-dismiss notification after 5 seconds
          setTimeout(() => setNotification(null), 5000);
        }
      }

      // Save current orders for future comparison
      setPreviousOrders(data);

      // Update state
      setOrders(data);
      setFilteredOrders(data);
      setLastRefreshed(new Date());
      console.log('Orders refreshed at:', new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching custom orders:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userRole, userBranchId, selectedBranchId, filterByBranch, showAllBranches]);

  // Fetch branches for admin filtering
  const fetchBranches = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3002/branches');
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      // Set default branches if fetch fails
      setBranches([
        { branch_id: 1, branch_name: 'Mahiyangana Branch' },
        { branch_id: 2, branch_name: 'Mahaoya Branch' }
      ]);
    }
  }, []);

  // Get user role and branch ID from localStorage
  useEffect(() => {
    // Get user info from localStorage
    const role = localStorage.getItem('role');
    const branchId = localStorage.getItem('branchId');
    console.log('Retrieved from localStorage - Role:', role, 'Branch ID:', branchId);

    // Set user role (convert to lowercase for consistency)
    const normalizedRole = role === 'Admin' ? 'admin' : role?.toLowerCase() || '';
    setUserRole(normalizedRole);

    // Set branch ID
    const numericBranchId = branchId ? Number(branchId) : null;
    setUserBranchId(numericBranchId);
    setSelectedBranchId(numericBranchId);

    // Fetch branches if admin
    if (normalizedRole === 'admin') {
      fetchBranches();
    }

    // We'll let the other useEffect handle the initial fetch
    // after these state values are set
  }, [fetchBranches]);

  // Fetch custom orders on component mount and set up auto-refresh
  useEffect(() => {
    // Only proceed if userRole and userBranchId are set
    if (!userRole || userBranchId === null) {
      return;
    }

    console.log('Setting up auto-refresh with filters - showAllBranches:', showAllBranches);

    // Initial fetch
    fetchOrders();

    // Auto-refresh disabled
    // const refreshInterval = setInterval(() => {
    //   console.log('Auto-refreshing orders...');
    //   fetchOrders();
    // }, 10000); // 10 seconds

    // Add visibility change listener to refresh when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible, refreshing orders...');
        fetchOrders();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listeners on unmount
    return () => {
      // clearInterval(refreshInterval); // Auto-refresh disabled
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [filterByBranch, showAllBranches, userBranchId, selectedBranchId, userRole, fetchOrders]);

  // This effect will run whenever the component is mounted or remounted
  useEffect(() => {
    // Only proceed if userRole and userBranchId are set
    if (!userRole || userBranchId === null) {
      return;
    }

    console.log('Custom orders component mounted, refreshing data with showAllBranches:', showAllBranches);
    fetchOrders();
  }, [filterByBranch, showAllBranches, userBranchId, selectedBranchId, userRole, fetchOrders]);

  // Apply filters and search
  useEffect(() => {
    let result = [...orders];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order =>
        order.order_reference.toLowerCase().includes(term) ||
        order.customer_name.toLowerCase().includes(term) ||
        (order.category_name && order.category_name.toLowerCase().includes(term)) ||
        (order.description && order.description.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(order => order.order_status === statusFilter);
    }

    // Apply payment status filter
    if (paymentStatusFilter !== 'all') {
      result = result.filter(order => order.payment_status === paymentStatusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'order_date') {
        comparison = new Date(a.order_date).getTime() - new Date(b.order_date).getTime();
      } else if (sortField === 'estimated_amount') {
        comparison = a.estimated_amount - b.estimated_amount;
      } else if (sortField === 'balance_amount') {
        comparison = a.balance_amount - b.balance_amount;
      } else if (sortField === 'customer_name') {
        comparison = a.customer_name.localeCompare(b.customer_name);
      } else if (sortField === 'estimated_completion_date') {
        // Handle null dates
        if (!a.estimated_completion_date && !b.estimated_completion_date) {
          comparison = 0;
        } else if (!a.estimated_completion_date) {
          comparison = 1;
        } else if (!b.estimated_completion_date) {
          comparison = -1;
        } else {
          comparison = new Date(a.estimated_completion_date).getTime() - new Date(b.estimated_completion_date).getTime();
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredOrders(result);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, sortField, sortDirection]);

  // Handle sort change
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Delivered':
        return 'bg-purple-100 text-purple-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      case 'Pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  // Get payment status badge color
  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Fully Paid':
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Partially Paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Paid':
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={16} className="mr-1" />;
      case 'In Progress':
        return <Clock size={16} className="mr-1" />;
      case 'Delivered':
        return <Truck size={16} className="mr-1" />;
      case 'Cancelled':
        return <X size={16} className="mr-1" />;
      case 'Pending':
      default:
        return <AlertCircle size={16} className="mr-1" />;
    }
  };

  // This function is used in the modal when clicking on an order
  // It's kept for future use if we add a quick view feature
  // const handleViewDetails = (order: CustomOrder) => {
  //   setSelectedOrder(order);
  //   setShowDetailsModal(true);
  // };

  // Handle create new order
  const handleCreateOrder = () => {
    router.push('/DashView/custom-orders/create');
  };

  // Handle view order details
  const handleViewOrder = (orderId: number) => {
    router.push(`/DashView/custom-orders/${orderId}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Custom Orders</h1>
          {userRole !== 'admin' && userBranchId && (
            <div className="flex items-center mt-1">
              <Building className="h-4 w-4 text-gray-500 mr-1" />
              <span className="text-sm text-gray-600">
                {branches.find(b => b.branch_id === userBranchId)?.branch_name ||
                 (userBranchId === 1 ? 'Mahiyangana Branch' :
                  userBranchId === 2 ? 'Mahaoya Branch' : `Branch ${userBranchId}`)}
              </span>
            </div>
          )}
          {userRole === 'admin' && selectedBranchId && (
            <div className="flex items-center mt-1">
              <Building className="h-4 w-4 text-gray-500 mr-1" />
              <span className="text-sm text-gray-600">
                Viewing: {branches.find(b => b.branch_id === selectedBranchId)?.branch_name ||
                         (selectedBranchId === 1 ? 'Mahiyangana Branch' :
                          selectedBranchId === 2 ? 'Mahaoya Branch' : `Branch ${selectedBranchId}`)}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchOrders(true)}
            className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 text-sm"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                Refreshing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-lg transition-all duration-300 transform translate-x-0 ${
          notification.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          notification.type === 'info' ? 'bg-blue-100 border border-blue-400 text-blue-700' :
          notification.type === 'warning' ? 'bg-yellow-100 border border-yellow-400 text-yellow-700' :
          'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="flex items-center">
            <div className="mr-2">
              {notification.type === 'success' && <CheckCircle size={18} />}
              {notification.type === 'info' && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {notification.type === 'warning' && <AlertCircle size={18} />}
              {notification.type === 'error' && <X size={18} />}
            </div>
            <span>{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search orders..."
                className="pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  className="p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <select
                  className="p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Fully Paid">Fully Paid</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Not Paid">Not Paid</option>
                </select>
              </div>

              {/* Branch filter for all users */}
              <div className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-gray-400" />
                {userRole === 'admin' ? (
                  <div className="flex items-center space-x-2">
                    <select
                      className="p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                      value={selectedBranchId || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedBranchId(value ? Number(value) : null);
                        fetchOrders(true); // Refresh with new branch filter
                      }}
                    >
                      <option value="">All Branches</option>
                      {branches.map(branch => (
                        <option key={branch.branch_id} value={branch.branch_id}>
                          {branch.branch_name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center ml-4">
                      <input
                        type="checkbox"
                        id="adminFilterByBranch"
                        className="h-4 w-4 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                        checked={filterByBranch}
                        onChange={(e) => {
                          setFilterByBranch(e.target.checked);
                          fetchOrders(true); // Refresh with new filter setting
                        }}
                      />
                      <label htmlFor="adminFilterByBranch" className="ml-2 block text-sm text-gray-700">
                        Filter by branch
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">
                      {branches.find(b => b.branch_id === userBranchId)?.branch_name ||
                      (userBranchId === 1 ? 'Mahiyangana Branch' :
                      userBranchId === 2 ? 'Mahaoya Branch' : `Branch ${userBranchId}`)}
                    </span>
                    <div className="flex items-center ml-4">
                      <input
                        type="checkbox"
                        id="showAllBranches"
                        className="h-4 w-4 text-yellow-500 focus:ring-yellow-400 border-gray-300 rounded"
                        checked={showAllBranches}
                        onChange={(e) => {
                          setShowAllBranches(e.target.checked);
                          fetchOrders(true); // Refresh with new filter setting
                        }}
                      />
                      <label htmlFor="showAllBranches" className="ml-2 block text-sm text-gray-700">
                        Show all branches
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleCreateOrder}
              className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              <Plus size={18} className="mr-2" />
              New Custom Order
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No custom orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('order_date')}
                  >
                    <div className="flex items-center">
                      <span>Date</span>
                      {sortField === 'order_date' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center">
                      <span>Customer</span>
                      {sortField === 'customer_name' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('estimated_amount')}
                  >
                    <div className="flex items-center">
                      <span>Amount</span>
                      {sortField === 'estimated_amount' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('estimated_completion_date')}
                  >
                    <div className="flex items-center">
                      <span>Due Date</span>
                      {sortField === 'estimated_completion_date' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  {(userRole === 'admin' && !filterByBranch) || (userRole !== 'admin' && showAllBranches) ? (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                  ) : null}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.order_id}
                    className={`hover:bg-gray-50 transition-colors duration-300 ${recentlyChangedOrders.includes(order.order_id) ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <span>{formatDate(order.order_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.order_reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <span>{order.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.category_name || 'Not specified'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <LKRIcon className="h-5 w-5 text-gray-400 mr-1" />
                        <span>{formatCurrency(order.estimated_amount)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(order.estimated_completion_date)}
                    </td>
                    {(userRole === 'admin' && !filterByBranch) || (userRole !== 'admin' && showAllBranches) ? (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm text-gray-900">
                            {order.branch_name || (order.branch_id === 1 ? 'Mahiyangana' : order.branch_id === 2 ? 'Mahaoya' : `Branch ${order.branch_id}`)}
                          </span>
                          {userBranchId && order.branch_id !== userBranchId && (
                            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              Other
                            </span>
                          )}
                        </div>
                      </td>
                    ) : null}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(order.order_status)}`}>
                        <div className="flex items-center">
                          {getStatusIcon(order.order_status)}
                          {order.order_status}
                        </div>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className={`px-3 py-1 rounded-md ${getPaymentStatusBadgeColor(order.payment_status).split(' ')[0]} ${recentlyChangedOrders.includes(order.order_id) ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}>
                          <span className={`font-semibold ${getPaymentStatusBadgeColor(order.payment_status).split(' ')[1]}`}>
                            {/* Display the payment status directly from the database */}
                            {order.payment_status}
                            {recentlyChangedOrders.includes(order.order_id) && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <div className="text-xs mt-1">
                            <span className="flex items-center">
                              <LKRIcon className="h-3 w-3 mr-1" />
                              {formatCurrency(order.total_paid || order.advance_amount)} / {formatCurrency(order.estimated_amount)}
                            </span>
                            {order.payment_count > 0 && (
                              <span className="text-xs text-gray-600 mt-0.5">{order.payment_count} {order.payment_count === 1 ? 'payment' : 'payments'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => handleViewOrder(order.order_id)}
                          className="text-yellow-600 hover:text-yellow-900 flex items-center"
                        >
                          <Eye size={16} className="mr-1" />
                          View
                        </button>

                        <button
                          onClick={() => router.push(`/DashView/advance-payment?order=${order.order_id}`)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Payments
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal - Removed as we're using the dedicated detail page instead */}
    </div>
  );
};

export default CustomOrdersPage;