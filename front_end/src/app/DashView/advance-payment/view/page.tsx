"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  Package,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Building
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

// Define types
interface AdvancePayment {
  payment_id: number;
  payment_reference: string;
  customer_name: string;
  payment_date: string;
  total_amount: number;
  advance_amount: number;
  balance_amount: number;
  payment_status: 'Pending' | 'Partially Paid' | 'Completed';
  payment_method: string;
  is_custom_order: boolean;
  order_id: number | null;
  order_reference: string | null;
  item_id: number | null;
  item_name: string | null;
  item_category: string | null;
  item_quantity: number | null;
  branch_name: string;
  branch_id: number;
  created_by_first_name: string;
  created_by_last_name: string;
  // Additional properties for payment history
  total_paid_amount?: number;
  actual_balance_amount?: number;
  actual_payment_status?: string;
  running_total_paid?: number;
  balance_after?: number;
}

// Response type for payment history API
interface PaymentHistoryResponse {
  order_id: number;
  order_reference: string;
  customer_name: string;
  total_amount: number;
  payments: (AdvancePayment & {
    balance_after: number;
    running_total_paid: number;
  })[];
  total_payments: number;
  total_paid: number;
  remaining_balance: number;
  payment_status: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
}

const ViewAdvancePaymentsPage = () => {
  const router = useRouter();

  // State for data
  const [payments, setPayments] = useState<AdvancePayment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<AdvancePayment[]>([]);

  // State for user role and branch
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [filterByBranch, setFilterByBranch] = useState<boolean>(true); // Default to filtering by branch for admin

  // State for UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<string>('payment_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedPayment, setSelectedPayment] = useState<AdvancePayment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<AdvancePayment[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

    // Fetch branches
    fetchBranches();
  }, []);

  // Fetch branches from the backend
  const fetchBranches = async () => {
    try {
      console.log('Fetching branches...');
      const response = await fetch('http://localhost:3002/branches');
      if (response.ok) {
        const data = await response.json();
        console.log('Branches fetched successfully:', data);
        setBranches(data);
      } else {
        console.error('Failed to fetch branches:', response.status);
        // Set default branches if API fails
        setBranches([
          { branch_id: 1, branch_name: 'Mahiyangana Branch' },
          { branch_id: 2, branch_name: 'Mahaoya Branch' }
        ]);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      // Set default branches if API fails
      setBranches([
        { branch_id: 1, branch_name: 'Mahiyangana Branch' },
        { branch_id: 2, branch_name: 'Mahaoya Branch' }
      ]);
    }
  };

  // Fetch advance payments when user role or branch ID changes
  useEffect(() => {
    // Skip if we're still waiting for user data to load
    if (!userRole && userBranchId === null) {
      return;
    }

    console.log('Effect triggered - Role:', userRole, 'Branch ID:', userBranchId, 'Filter By Branch:', filterByBranch, 'Selected Branch:', selectedBranchId);
    fetchPayments();
  }, [userRole, userBranchId, filterByBranch, selectedBranchId]);

  // Fetch advance payments from the backend
  const fetchPayments = async () => {
    setLoading(true);
    try {
      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/advance-payments';
      const params = new URLSearchParams();

      // Always send the role parameter
      params.append('role', userRole || '');

      // Use grouped endpoint to get latest payment for each order/customer
      params.append('grouped', 'true');

      // Add branch_id parameter if we have one
      if (userRole === 'admin' && selectedBranchId && filterByBranch) {
        // Admin with selected branch and filtering enabled
        params.append('branch_id', selectedBranchId.toString());
        params.append('filter_branch', 'true');
        console.log('Admin filtering by branch:', selectedBranchId);
      } else if (userRole !== 'admin' && userBranchId) {
        // Non-admin users always filter by their branch
        params.append('branch_id', userBranchId.toString());
        params.append('filter_branch', 'true');
        console.log('Non-admin filtering by branch:', userBranchId);
      } else {
        // No branch filtering (admin with no branch selected or filter disabled)
        params.append('filter_branch', 'false');
        console.log('No branch filtering applied');
      }

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching advance payments from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.status}`);
      }

      const data = await response.json();

      // For each payment, fetch the payment history to get accurate balance and total paid amount
      const updatedPayments = await Promise.all(data.map(async (payment: AdvancePayment) => {
        try {
          if (payment.is_custom_order && payment.order_id) {
            // Fetch payment history for custom orders
            const historyResponse = await fetch(`http://localhost:3002/advance-payments/history/order/${payment.order_id}`);

            if (historyResponse.ok) {
              const historyData = await historyResponse.json();

              // Update the payment with accurate data from history
              return {
                ...payment,
                total_amount: historyData.total_amount, // Use the correct total amount from history
                total_paid_amount: historyData.total_paid,
                actual_balance_amount: historyData.remaining_balance,
                actual_payment_status: historyData.payment_status
              };
            }
          } else if (!payment.is_custom_order && payment.item_id) {
            // Fetch payment history for inventory items
            const historyResponse = await fetch(`http://localhost:3002/advance-payments/history/item/${payment.item_id}?customer=${encodeURIComponent(payment.customer_name)}`);

            if (historyResponse.ok) {
              const historyData = await historyResponse.json();

              // Update the payment with accurate data from history
              return {
                ...payment,
                total_paid_amount: historyData.total_paid,
                actual_balance_amount: historyData.remaining_balance,
                actual_payment_status: historyData.remaining_balance <= 0 ? 'Completed' : 'Partially Paid'
              };
            }
          }

          // For custom orders, also fetch the order details to get the correct total amount
          if (payment.is_custom_order && payment.order_id) {
            try {
              const orderResponse = await fetch(`http://localhost:3002/custom-orders/${payment.order_id}`);
              if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                if (orderData.total_amount_with_profit) {
                  // Update the payment with the correct total amount from the order
                  return {
                    ...payment,
                    total_amount: orderData.total_amount_with_profit
                  };
                }
              }
            } catch (orderErr) {
              console.error(`Error fetching order details for payment ${payment.payment_id}:`, orderErr);
            }
          }
        } catch (err) {
          console.error(`Error fetching history for payment ${payment.payment_id}:`, err);
        }

        // Return the original payment if we couldn't fetch history
        return payment;
      }));

      console.log('Updated payments with history data:', updatedPayments);
      setPayments(updatedPayments);
      setFilteredPayments(updatedPayments);
    } catch (err) {
      console.error('Error fetching advance payments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching payments');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and search
  useEffect(() => {
    let result = [...payments];

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(payment =>
        payment.payment_reference.toLowerCase().includes(term) ||
        payment.customer_name.toLowerCase().includes(term) ||
        (payment.order_reference && payment.order_reference.toLowerCase().includes(term)) ||
        (payment.item_name && payment.item_name.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(payment => payment.payment_status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      if (typeFilter === 'custom') {
        result = result.filter(payment => payment.is_custom_order);
      } else if (typeFilter === 'inventory') {
        result = result.filter(payment => !payment.is_custom_order);
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'payment_date') {
        comparison = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      } else if (sortField === 'total_amount') {
        comparison = a.total_amount - b.total_amount;
      } else if (sortField === 'balance_amount') {
        comparison = a.balance_amount - b.balance_amount;
      } else if (sortField === 'customer_name') {
        comparison = a.customer_name.localeCompare(b.customer_name);
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredPayments(result);
  }, [payments, searchTerm, statusFilter, typeFilter, sortField, sortDirection]);

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
  const formatDate = (dateString: string) => {
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
      case 'Partially Paid':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={16} className="mr-1" />;
      case 'Partially Paid':
        return <Clock size={16} className="mr-1" />;
      case 'Pending':
        return <AlertCircle size={16} className="mr-1" />;
      default:
        return null;
    }
  };

  // This function has been replaced by fetchCustomOrderPaymentHistory and fetchInventoryItemPaymentHistory

  // Handle view details
  const handleViewDetails = async (payment: AdvancePayment) => {
    // First set the payment to show the modal quickly
    setSelectedPayment(payment);
    setShowDetailsModal(true);

    try {
      // If this is a custom order, fetch the payment history to get accurate balance
      if (payment.is_custom_order && payment.order_id) {
        const response = await fetch(`http://localhost:3002/advance-payments/history/order/${payment.order_id}`);

        if (response.ok) {
          const historyData = await response.json();
          console.log('Fetched payment history for details modal:', historyData);

          // Update the payment with accurate data from history
          const updatedPayment = {
            ...payment,
            total_amount: historyData.total_amount || payment.total_amount, // Use the correct total amount from history
            total_paid_amount: historyData.total_paid,
            actual_balance_amount: historyData.remaining_balance,
            actual_payment_status: historyData.payment_status
          };

          setSelectedPayment(updatedPayment);
        }
      } else if (!payment.is_custom_order && payment.item_id) {
        // For inventory items, fetch payment history
        const response = await fetch(`http://localhost:3002/advance-payments/history/item/${payment.item_id}?customer=${encodeURIComponent(payment.customer_name)}`);

        if (response.ok) {
          const historyData = await response.json();
          console.log('Fetched inventory payment history for details modal:', historyData);

          // Update the payment with accurate data from history
          const updatedPayment = {
            ...payment,
            total_paid_amount: historyData.total_paid,
            actual_balance_amount: historyData.remaining_balance,
            actual_payment_status: historyData.remaining_balance <= 0 ? 'Completed' : 'Partially Paid'
          };

          setSelectedPayment(updatedPayment);

          // Log the updated payment for debugging
          console.log('Updated payment with total paid amount:', updatedPayment);
        }
      }
    } catch (err) {
      console.error('Error fetching payment details:', err);
      // Continue with the original payment data
    }
  };

  // Handle view payment history
  const handleViewHistory = (payment: AdvancePayment) => {
    if (payment.is_custom_order && payment.order_id) {
      fetchCustomOrderPaymentHistory(payment.order_id);
    } else if (payment.item_id) {
      // For inventory items, fetch all payments for this item and customer
      fetchInventoryItemPaymentHistory(payment.item_id, payment.customer_name);
    } else {
      // Fallback to just showing the single payment
      setPaymentHistory([payment]);
      setShowHistoryModal(true);
    }
  };

  // Fetch payment history for a custom order
  const fetchCustomOrderPaymentHistory = async (orderId: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`http://localhost:3002/advance-payments/history/order/${orderId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch payment history: ${response.status}`);
      }

      const data = await response.json() as PaymentHistoryResponse;
      setPaymentHistory(data.payments);
      setShowHistoryModal(true);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch payment history for an inventory item
  const fetchInventoryItemPaymentHistory = async (itemId: number, customerName: string) => {
    setLoadingHistory(true);
    try {
      // First try to get all payments for this item and customer
      const response = await fetch(`http://localhost:3002/advance-payments/history/item/${itemId}?customer=${encodeURIComponent(customerName)}`);

      if (!response.ok) {
        // If the endpoint doesn't exist, fall back to customer history
        console.log('Item history endpoint not available, falling back to customer history');
        const customerResponse = await fetch(`http://localhost:3002/advance-payments/history/customer/${encodeURIComponent(customerName)}`);

        if (!customerResponse.ok) {
          throw new Error(`Failed to fetch payment history: ${customerResponse.status}`);
        }

        const data = await customerResponse.json();
        // Filter to only include payments for this item
        const filteredPayments = data.payments.filter((p: AdvancePayment) => p.item_id === itemId);
        setPaymentHistory(filteredPayments);
      } else {
        const data = await response.json();
        setPaymentHistory(data.payments);
      }

      setShowHistoryModal(true);
    } catch (err) {
      console.error('Error fetching inventory item payment history:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle make additional payment
  const handleMakeAdditionalPayment = (payment: AdvancePayment) => {
    // Navigate to the advance payment page with query parameters
    if (payment.is_custom_order && payment.order_id) {
      // For custom orders
      router.push(`/DashView/advance-payment?type=custom&order_id=${payment.order_id}`);
    } else if (!payment.is_custom_order && payment.item_name) {
      // For inventory items
      const queryParams = new URLSearchParams({
        type: 'inventory',
        item_id: payment.item_id?.toString() || '',
        customer_name: payment.customer_name,
        total_amount: payment.total_amount.toString(),
        balance: payment.balance_amount.toString(),
        advance: payment.advance_amount.toString(),
        payment_id: payment.payment_id.toString(),
        quantity: payment.item_quantity?.toString() || '1'
      }).toString();

      console.log('Navigating to make additional payment with params:', {
        total: payment.total_amount,
        balance: payment.balance_amount,
        advance: payment.advance_amount,
        payment_id: payment.payment_id
      });

      router.push(`/DashView/advance-payment?${queryParams}`);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Advance Payments</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            title="Refresh inventory data"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={() => router.push('/DashView/advance-payment')}
            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center"
          >
            <CreditCard className="mr-2 h-5 w-5" />
            New Advance Payment
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-wrap items-center gap-4 w-full">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search payments..."
                className="pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 mr-2">Status:</span>
              </div>
              <select
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm font-medium text-gray-700 mr-2">Type:</span>
              </div>
              <select
                className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="custom">Custom Orders</option>
                <option value="inventory">Inventory Items</option>
              </select>
            </div>

            {/* Branch filter for all users */}
            <div className="flex items-center space-x-2 border-l-2 border-blue-200 pl-2 ml-2">
              <div className="flex items-center">
                <Building className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm font-medium text-blue-700 mr-2">Branch:</span>
              </div>

              {userRole === 'admin' ? (
                <div className="flex items-center space-x-2">
                  <select
                    className="p-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 min-w-[180px] z-50 bg-blue-50"
                    value={selectedBranchId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedBranchId(value ? Number(value) : null);
                      // Don't call fetchPayments here as it will be triggered by the useEffect
                    }}
                  >
                    <option value="">All Branches</option>
                    {branches.length > 0 ? (
                      branches.map(branch => (
                        <option key={branch.branch_id} value={branch.branch_id}>
                          {branch.branch_name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="1">Mahiyangana Branch</option>
                        <option value="2">Mahaoya Branch</option>
                      </>
                    )}
                  </select>
                  <div className="flex items-center ml-2">
                    <input
                      type="checkbox"
                      id="adminFilterByBranch"
                      className="h-4 w-4 text-blue-500 focus:ring-blue-400 border-gray-300 rounded"
                      checked={filterByBranch}
                      onChange={(e) => {
                        setFilterByBranch(e.target.checked);
                        // Don't call fetchPayments here as it will be triggered by the useEffect
                      }}
                    />
                    <label htmlFor="adminFilterByBranch" className="ml-2 block text-sm text-gray-700">
                      Filter by branch
                    </label>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <span className="p-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-gray-700">
                    {branches.find(b => b.branch_id === userBranchId)?.branch_name ||
                    (userBranchId === 1 ? 'Mahiyangana Branch' :
                    userBranchId === 2 ? 'Mahaoya Branch' : `Branch ${userBranchId}`)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={fetchPayments}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex items-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No advance payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('payment_date')}
                  >
                    <div className="flex items-center">
                      <span>Date</span>
                      {sortField === 'payment_date' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
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
                    Reference
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('total_amount')}
                  >
                    <div className="flex items-center">
                      <span>Total</span>
                      {sortField === 'total_amount' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advance
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('balance_amount')}
                  >
                    <div className="flex items-center">
                      <span>Balance</span>
                      {sortField === 'balance_amount' && (
                        sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                        <span>{formatDate(payment.payment_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-2" />
                        <span>{payment.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.payment_reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-2" />
                        <span>{payment.branch_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {payment.is_custom_order ? (
                          <>
                            <Package className="h-5 w-5 text-purple-500 mr-2" />
                            <span>Custom Order</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-5 w-5 text-blue-500 mr-2" />
                            <span>Inventory Item</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span>{formatCurrency(payment.total_amount)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span>{formatCurrency(payment.total_paid_amount || payment.advance_amount)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span>{formatCurrency(payment.actual_balance_amount || payment.balance_amount)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(payment.actual_payment_status || ((payment.actual_balance_amount !== undefined && payment.actual_balance_amount <= 0) ? 'Completed' : payment.payment_status))}`}>
                        <div className="flex items-center">
                          {getStatusIcon(payment.actual_payment_status || ((payment.actual_balance_amount !== undefined && payment.actual_balance_amount <= 0) ? 'Completed' : payment.payment_status))}
                          {payment.actual_payment_status || ((payment.actual_balance_amount !== undefined && payment.actual_balance_amount <= 0) ? 'Completed' : payment.payment_status)}
                        </div>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(payment)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleViewHistory(payment)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          History
                        </button>
                        {(payment.actual_payment_status || ((payment.actual_balance_amount !== undefined && payment.actual_balance_amount <= 0) ? 'Completed' : payment.payment_status)) !== 'Completed' && (
                          <button
                            onClick={() => handleMakeAdditionalPayment(payment)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {showDetailsModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Payment Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Reference</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedPayment.payment_reference}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Date</h3>
                <p className="mt-1 text-sm text-gray-900">{formatDate(selectedPayment.payment_date)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Customer</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedPayment.customer_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Branch</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedPayment.branch_name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created By</h3>
                <p className="mt-1 text-sm text-gray-900">{`${selectedPayment.created_by_first_name} ${selectedPayment.created_by_last_name}`}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Payment Method</h3>
                <p className="mt-1 text-sm text-gray-900 flex items-center">
                  <CreditCard className="h-4 w-4 mr-1 text-gray-500" />
                  {selectedPayment.payment_method}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Item Details</h3>
              {selectedPayment.is_custom_order ? (
                <div className="bg-purple-50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <Package className="h-5 w-5 text-purple-500 mr-2" />
                    <span className="font-medium">Custom Order</span>
                  </div>
                  {selectedPayment.order_reference && (
                    <p className="text-sm text-gray-700">Order Reference: {selectedPayment.order_reference}</p>
                  )}
                </div>
              ) : (
                <div className="bg-blue-50 p-3 rounded-md">
                  <div className="flex items-center mb-2">
                    <ShoppingBag className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="font-medium">Inventory Item</span>
                  </div>
                  {selectedPayment.item_name && (
                    <>
                      <p className="text-sm text-gray-700">Item: {selectedPayment.item_name}</p>
                      <p className="text-sm text-gray-700">Category: {selectedPayment.item_category}</p>
                      <p className="text-sm text-gray-700">Quantity: {selectedPayment.item_quantity}</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(selectedPayment.total_amount)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Advance Paid</h3>
                  <p className="mt-1 text-lg font-semibold text-green-600">{formatCurrency(selectedPayment.total_paid_amount || selectedPayment.advance_amount)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Balance</h3>
                  <p className="mt-1 text-lg font-semibold text-red-600">{formatCurrency(selectedPayment.actual_balance_amount !== undefined ? selectedPayment.actual_balance_amount : selectedPayment.balance_amount)}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedPayment.actual_payment_status || ((selectedPayment.actual_balance_amount !== undefined && selectedPayment.actual_balance_amount <= 0) ? 'Completed' : selectedPayment.payment_status))}`}>
                <div className="flex items-center">
                  {getStatusIcon(selectedPayment.actual_payment_status || ((selectedPayment.actual_balance_amount !== undefined && selectedPayment.actual_balance_amount <= 0) ? 'Completed' : selectedPayment.payment_status))}
                  {selectedPayment.actual_payment_status || ((selectedPayment.actual_balance_amount !== undefined && selectedPayment.actual_balance_amount <= 0) ? 'Completed' : selectedPayment.payment_status)}
                </div>
              </span>

              {(selectedPayment.actual_payment_status || ((selectedPayment.actual_balance_amount !== undefined && selectedPayment.actual_balance_amount <= 0) ? 'Completed' : selectedPayment.payment_status)) !== 'Completed' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleMakeAdditionalPayment(selectedPayment);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Make Additional Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Payment History</h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No payment history found.
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-gray-50 rounded-md">
                  <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">{paymentHistory[0].customer_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order Reference</p>
                      <p className="font-medium">{paymentHistory[0].order_reference || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="font-medium">{formatCurrency(paymentHistory[0].total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Payments</p>
                      <p className="font-medium">{paymentHistory.length}</p>
                    </div>
                  </div>

                  {/* Payment Progress */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Payment Progress</span>
                      <span className="text-sm font-medium text-gray-700">
                        {(() => {
                          // Calculate percentage safely
                          const lastPayment = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;
                          const firstPayment = paymentHistory.length > 0 ? paymentHistory[0] : null;
                          const totalAmount = firstPayment?.total_amount || 1;

                          if (lastPayment && 'running_total_paid' in lastPayment && typeof lastPayment.running_total_paid === 'number') {
                            return `${((lastPayment.running_total_paid / totalAmount) * 100).toFixed(1)}%`;
                          } else {
                            const totalPaid = paymentHistory.reduce((sum, p) => sum + parseFloat((p.advance_amount || 0).toString()), 0);
                            return `${((totalPaid / totalAmount) * 100).toFixed(1)}%`;
                          }
                        })()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                          width: (() => {
                            // Calculate width percentage safely
                            const lastPayment = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;
                            const firstPayment = paymentHistory.length > 0 ? paymentHistory[0] : null;
                            const totalAmount = firstPayment?.total_amount || 1;

                            if (lastPayment && 'running_total_paid' in lastPayment && typeof lastPayment.running_total_paid === 'number') {
                              return `${Math.min(100, (lastPayment.running_total_paid / totalAmount) * 100)}%`;
                            } else {
                              const totalPaid = paymentHistory.reduce((sum, p) => sum + parseFloat((p.advance_amount || 0).toString()), 0);
                              return `${Math.min(100, (totalPaid / totalAmount) * 100)}%`;
                            }
                          })()
                        }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-sm text-gray-500">Total Paid</p>
                        <p className="font-medium text-green-600">
                          {(() => {
                            // Calculate total paid safely
                            const lastPayment = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;

                            if (lastPayment && 'running_total_paid' in lastPayment && typeof lastPayment.running_total_paid === 'number') {
                              return formatCurrency(lastPayment.running_total_paid);
                            } else {
                              const totalPaid = paymentHistory.reduce((sum, p) => sum + parseFloat((p.advance_amount || 0).toString()), 0);
                              return formatCurrency(totalPaid);
                            }
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Remaining Balance</p>
                        <p className="font-medium text-red-600">
                          {(() => {
                            // Calculate remaining balance safely
                            const lastPayment = paymentHistory.length > 0 ? paymentHistory[paymentHistory.length - 1] : null;
                            const firstPayment = paymentHistory.length > 0 ? paymentHistory[0] : null;
                            const totalAmount = firstPayment?.total_amount || 0;

                            if (lastPayment && 'balance_after' in lastPayment && typeof lastPayment.balance_after === 'number') {
                              return formatCurrency(lastPayment.balance_after);
                            } else {
                              const totalPaid = paymentHistory.reduce((sum, p) => sum + parseFloat((p.advance_amount || 0).toString()), 0);
                              return formatCurrency(totalAmount - totalPaid);
                            }
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Payment Limit Warning */}
                    {paymentHistory.length >= 2 && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-700 flex items-center">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          {paymentHistory.length >= 3 ?
                            "Payment limit reached. Custom orders can have a maximum of 3 payments." :
                            `You have made ${paymentHistory.length} of 3 allowed payments. ${3 - paymentHistory.length} payment(s) remaining.`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance After</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment, index) => (
                        <tr key={payment.payment_id} className={index === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                              <span>{formatDate(payment.payment_date)}</span>
                              {index === 0 && <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Latest</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{payment.payment_reference}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                              <span>{payment.payment_method}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span>{formatCurrency(payment.advance_amount)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span>{formatCurrency('balance_after' in payment && payment.balance_after !== undefined ? payment.balance_after : payment.balance_amount)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(payment.payment_status)}`}>
                              <div className="flex items-center">
                                {getStatusIcon(payment.payment_status)}
                                {payment.payment_status}
                              </div>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewAdvancePaymentsPage;
