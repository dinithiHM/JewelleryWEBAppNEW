"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Mail,
  Tag,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Send,
  Percent,
  Hash,
  Download
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import LKRIcon from '@/components/LKRIcon';
import { generateCustomOrderReceipt } from '@/utils/customOrderReceipt';

// Define types
interface CustomOrderDetail {
  order_id: number;
  order_reference: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  order_date: string;
  estimated_completion_date: string;
  order_status: string;
  payment_status: string;
  category_id: number;
  category_name: string;
  supplier_id: number | null;
  supplier_name: string | null;
  description: string | null;
  special_requirements: string | null;
  estimated_amount: number;
  profit_percentage?: number;
  advance_amount: number;
  balance_amount: number;
  total_amount_with_profit?: number;
  balance_with_profit?: number;
  branch_id: number;
  branch_name: string;
  created_by_id: number;
  created_by_first_name: string;
  created_by_last_name: string;
  images?: string;
  imageDetails?: {
    image_id: number;
    order_id: number;
    image_path: string;
    image_type: string;
    upload_date: string;
  }[];
  isFromOtherBranch?: boolean; // Added for branch visibility feature
  quantity?: number; // Added for quantity-based pricing
}

const CustomOrderDetailPage = ({ params }: { params: Promise<{ id: string }> | { id: string } }) => {
  const router = useRouter();
  // Use React.use to unwrap the params if it's a Promise
  const unwrappedParams = 'then' in params ? use(params) : params;
  const orderId = unwrappedParams.id;

  // State
  const [order, setOrder] = useState<CustomOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderSuccess, setReminderSuccess] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  // State for user role and branch
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<number | null>(null);

  // Function to fetch order details
  const fetchOrderDetails = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Add a timestamp to prevent caching
      const timestamp = new Date().getTime();

      // Construct URL with query parameters
      let url = `http://localhost:3002/custom-orders/${orderId}`;
      const params = new URLSearchParams();

      // Always send the role parameter
      params.append('role', userRole || '');

      // Always send branch_id if available (for checking if order is from another branch)
      if (userBranchId) {
        params.append('branch_id', userBranchId.toString());
      }

      // Add timestamp to prevent caching
      params.append('t', timestamp.toString());

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching custom order details from:', url);
      const response = await fetch(url);

      if (response.status === 403) {
        throw new Error('You do not have permission to view this order');
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch order details: ${response.status}`);
      }

      const data = await response.json();
      setLastRefreshed(new Date());
      console.log('Raw order data received:', data);

      // Check for images in the response
      console.log('Images in response:', data.images);
      console.log('ImageDetails in response:', data.imageDetails);

      // If we have images as a string but no imageDetails array, create one
      if (data.images && (!data.imageDetails || data.imageDetails.length === 0)) {
        const imagesList = data.images.split(',').filter((img: string) => img.trim());
        console.log('Creating imageDetails from images string:', imagesList);

        if (imagesList.length > 0) {
          // Create imageDetails array from images string
          data.imageDetails = imagesList.map((imagePath: string, index: number) => {
            // Clean up the path to ensure it's just the filename
            let cleanPath = imagePath;
            if (cleanPath.includes('/')) {
              cleanPath = cleanPath.split('/').pop() || cleanPath;
            }
            if (cleanPath.startsWith('uploads/')) {
              cleanPath = cleanPath.replace('uploads/', '');
            }
            if (cleanPath.startsWith('custom_orders/')) {
              cleanPath = cleanPath.replace('custom_orders/', '');
            }

            console.log(`Original path: ${imagePath}, Clean path: ${cleanPath}`);

            return {
              image_id: index + 1,
              order_id: data.order_id,
              image_path: cleanPath,
              image_type: 'Reference',
              upload_date: data.order_date
            };
          });
          console.log('Created imageDetails:', data.imageDetails);
        }
      }

      // Also fetch payment history to get the most accurate payment information
      try {
        const historyResponse = await fetch(`http://localhost:3002/advance-payments/history/order/${orderId}`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          console.log('Payment history data:', historyData);

          // Update the order data with the correct payment information
          if (historyData && historyData.total_paid !== undefined) {
            data.advance_amount = historyData.total_paid;
            data.balance_amount = historyData.remaining_balance;
            console.log('Updated payment data from history:', {
              total_paid: historyData.total_paid,
              remaining_balance: historyData.remaining_balance
            });
          }
        }
      } catch (historyErr) {
        console.error('Error fetching payment history:', historyErr);
        // Continue with the original order data
      }

      setOrder(data);

      // Set the first image as selected if available
      if (data.imageDetails && data.imageDetails.length > 0) {
        // Clean up the path to ensure it's just the filename
        let cleanPath = data.imageDetails[0].image_path;
        if (cleanPath.includes('/')) {
          cleanPath = cleanPath.split('/').pop() || cleanPath;
        }
        if (cleanPath.startsWith('uploads/')) {
          cleanPath = cleanPath.replace('uploads/', '');
        }
        if (cleanPath.startsWith('custom_orders/')) {
          cleanPath = cleanPath.replace('custom_orders/', '');
        }

        setSelectedImage(cleanPath);
        console.log('Selected image:', cleanPath, 'Original:', data.imageDetails[0].image_path);
      } else if (data.images) {
        const imagesList = data.images.split(',').filter((img: string) => img.trim());
        if (imagesList.length > 0) {
          // Clean up the path to ensure it's just the filename
          let cleanPath = imagesList[0];
          if (cleanPath.includes('/')) {
            cleanPath = cleanPath.split('/').pop() || cleanPath;
          }
          if (cleanPath.startsWith('uploads/')) {
            cleanPath = cleanPath.replace('uploads/', '');
          }
          if (cleanPath.startsWith('custom_orders/')) {
            cleanPath = cleanPath.replace('custom_orders/', '');
          }

          setSelectedImage(cleanPath);
          console.log('Selected image from string:', cleanPath, 'Original:', imagesList[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

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
  }, []);

  // Initial fetch only, auto-refresh disabled
  useEffect(() => {
    if (orderId && userRole) {
      fetchOrderDetails();

      // Auto-refresh disabled
      // const refreshInterval = setInterval(() => {
      //   console.log('Auto-refreshing order details...');
      //   fetchOrderDetails();
      // }, 30000); // 30 seconds

      // Clean up function (no interval to clear)
      return () => {
        // No interval to clear
      };
    }
  }, [orderId, userRole, userBranchId]);

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

  // Format date with time - Kept for future use
  // const formatDateTime = (dateString: string | null) => {
  //   if (!dateString) return 'Not set';
  //
  //   const date = new Date(dateString);
  //   return date.toLocaleDateString('en-US', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   });
  // };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status badge color - Kept for future use
  // const getPaymentStatusBadgeColor = (status: string) => {
  //   switch (status) {
  //     case 'Fully Paid':
  //       return 'bg-green-100 text-green-800';
  //     case 'Partially Paid':
  //       return 'bg-yellow-100 text-yellow-800';
  //     case 'Unpaid':
  //       return 'bg-red-100 text-red-800';
  //     default:
  //       return 'bg-gray-100 text-gray-800';
  //   }
  // };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle size={16} className="mr-1" />;
      case 'In Progress':
        return <Clock size={16} className="mr-1" />;
      case 'Pending':
        return <AlertCircle size={16} className="mr-1" />;
      case 'Cancelled':
        return <X size={16} className="mr-1" />;
      default:
        return null;
    }
  };

  // Handle back button
  const handleBack = () => {
    router.push('/DashView/custom-orders');
  };

  // Handle sending payment reminder
  const handleSendReminder = async () => {
    if (!order || !order.customer_email) {
      setReminderError('Cannot send reminder: Customer email is not available');
      return;
    }

    // Clear previous messages
    setReminderSuccess(null);
    setReminderError(null);
    setSendingReminder(true);

    try {
      const response = await fetch(`http://localhost:3002/custom-orders/${orderId}/send-reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Use the message from the server, which will indicate if it's a mock email
        setReminderSuccess(data.message);

        // If it's a mock email, add a note about installing nodemailer
        if (data.isMockEmail) {
          console.log('Mock email was generated. To send real emails, install nodemailer in the server.');
        }

        // Auto-hide success message after 5 seconds
        setTimeout(() => setReminderSuccess(null), 5000);
      } else {
        setReminderError(data.message || 'Failed to send payment reminder');
      }
    } catch (err) {
      console.error('Error sending payment reminder:', err);
      setReminderError(err instanceof Error ? err.message : 'An error occurred while sending the reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle download receipt
  const handleDownloadReceipt = async () => {
    try {
      if (!order) return;

      // Generate PDF receipt
      const pdfBlob = await generateCustomOrderReceipt(order);

      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Custom_Order_Receipt_${order.order_reference}.pdf`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating receipt:', err);
      alert('Failed to generate receipt. Please try again.');
    }
  };

  // Handle image selection
  const handleImageSelect = (imagePath: string) => {
    // Clean up the path to ensure it's just the filename
    let cleanPath = imagePath;
    if (cleanPath.includes('/')) {
      cleanPath = cleanPath.split('/').pop() || cleanPath;
    }
    if (cleanPath.startsWith('uploads/')) {
      cleanPath = cleanPath.replace('uploads/', '');
    }
    if (cleanPath.startsWith('custom_orders/')) {
      cleanPath = cleanPath.replace('custom_orders/', '');
    }

    setSelectedImage(cleanPath);
    console.log('Selected image:', cleanPath, 'Original:', imagePath);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X size={18} />
          </button>
        </div>
        <button
          onClick={() => fetchOrderDetails()}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">Order not found</span>
        </div>
        <button
          onClick={() => router.push('/DashView/custom-orders')}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={handleBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Order Details</h1>
            <p className="text-sm text-gray-500">
              Reference: <span className="font-medium">{order.order_reference}</span>
            </p>
            {order.isFromOtherBranch && (
              <div className="mt-1 flex items-center text-blue-600">
                <Building className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">This order is from {order.branch_name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDownloadReceipt}
            className="flex items-center px-3 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-md text-white"
          >
            <Download size={16} className="mr-1" />
            Download Receipt
          </button>
          <button
            onClick={() => fetchOrderDetails(true)}
            className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-700 border-t-transparent rounded-full animate-spin mr-1"></div>
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-1" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(order.order_status)}`}>
          {getStatusIcon(order.order_status)}
          {order.order_status}
        </span>
        <span className="text-xs text-gray-500 ml-4">
          Last updated: {lastRefreshed.toLocaleTimeString()}
        </span>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Customer and Order Info */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-sm text-gray-900">{order.customer_name}</p>
                </div>
              </div>
              {order.customer_phone && (
                <div className="flex items-start">
                  <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{order.customer_phone}</p>
                  </div>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-start">
                  <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{order.customer_email}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Information */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Order Information</h2>
            <div className="space-y-3">
              <div className="flex items-start">
                <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p className="text-sm text-gray-900">{formatDate(order.estimated_completion_date)}</p>
                </div>
              </div>
              {order.category_name && (
                <div className="flex items-start">
                  <Tag className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Category</p>
                    <p className="text-sm text-gray-900">{order.category_name}</p>
                  </div>
                </div>
              )}
              {order.supplier_name && (
                <div className="flex items-start">
                  <Building className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Supplier</p>
                    <p className="text-sm text-gray-900">{order.supplier_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start">
                <Building className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Branch</p>
                  <p className="text-sm text-gray-900">{order.branch_name}</p>
                </div>
              </div>
              <div className="flex items-start">
                <User className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Created By</p>
                  <p className="text-sm text-gray-900">{`${order.created_by_first_name} ${order.created_by_last_name}`}</p>
                </div>
              </div>
              {order.quantity && order.quantity > 0 && (
                <div className="flex items-start">
                  <Hash className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Quantity</p>
                    <p className="text-sm text-gray-900">{order.quantity}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Payment Information</h2>
              <button
                onClick={() => fetchOrderDetails(true)}
                className="flex items-center text-sm px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
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
            <div className="text-xs text-gray-500 mb-3">
              Last updated: {lastRefreshed.toLocaleTimeString()}
            </div>
            <div className="space-y-3">
              {/* Show different information based on user role */}
              {userRole === 'supplier' ? (
                // Supplier only sees the estimated amount (without profit)
                <div className="flex items-start">
                  <LKRIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Estimated Amount</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(order.estimated_amount)}</p>
                  </div>
                </div>
               ) : (
                // Other users see the total amount with profit
                <>
                  {order.profit_percentage !== undefined && (
                    <div className="flex items-start">
                      <LKRIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Supplier Cost</p>
                        <p className="text-sm text-gray-900">{formatCurrency(order.estimated_amount * (order.quantity || 1))}</p>
                        {order.quantity && order.quantity > 1 && (
                          <p className="text-xs text-gray-500">
                            {formatCurrency(order.estimated_amount)} × {order.quantity} items
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {order.profit_percentage !== undefined && (
                    <div className="flex items-start">
                      <Percent className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Profit Percentage</p>
                        <p className="text-sm text-gray-900">{order.profit_percentage}%</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start">
                    <LKRIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    {/* <div>
                      <p className="text-sm font-medium text-gray-500">Total Amount (Customer Price)</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(
                          order.total_amount_with_profit !== undefined
                            ? order.total_amount_with_profit
                            : (order.profit_percentage !== undefined
                                ? ((order.estimated_amount * (order.profit_percentage / 100)) + order.estimated_amount) * (order.quantity || 1)
                                : order.estimated_amount * (order.quantity || 1))
                        )}

               
                      </p>
                      {order.profit_percentage !== undefined && (
                        <p className="text-xs text-gray-500">
                          Includes {order.profit_percentage}% profit: {formatCurrency(order.estimated_amount * (order.profit_percentage / 100))} × {order.quantity || 1} items
                        </p>
                      )}
                    </div> */}

                    <div>
              <p className="text-sm font-medium text-gray-500">Total Amount (Customer Price)</p>
              <p className="text-sm font-semibold text-gray-900">
                  {(() => {
                    const quantity = order.quantity || 1;
                    const supplierTotal = order.estimated_amount * quantity;
                    const profitPerItem = order.estimated_amount * (order.profit_percentage ? order.profit_percentage / 100 : 0);
                    const profitTotal = profitPerItem * quantity;
                    const totalAmount = supplierTotal + profitTotal;
                    return formatCurrency(totalAmount);
                  })()}
                  </p>
                  {order.profit_percentage !== undefined && (
                    <p className="text-xs text-gray-500">
                      (Supplier: {formatCurrency(order.estimated_amount * (order.quantity || 1))} + Profit: {formatCurrency((order.estimated_amount * (order.profit_percentage / 100)) * (order.quantity || 1))})
                    </p>
                       )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-start">
                <LKRIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Advance Payment</p>
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(order.advance_amount)}</p>
                </div>
              </div>

              <div className="flex items-start">
                <LKRIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Balance</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatCurrency(
                      (() => {
                        // Calculate the total amount with profit
                        const totalAmount = order.total_amount_with_profit !== undefined
                          ? order.total_amount_with_profit
                          : (order.profit_percentage !== undefined
                              ? ((order.estimated_amount * (1 + order.profit_percentage / 100)) * (order.quantity || 1))
                              : (order.estimated_amount * (order.quantity || 1)));

                        // Calculate the balance (total amount - advance payment)
                        return userRole === 'supplier'
                          ? order.balance_amount
                          : totalAmount - order.advance_amount;
                      })()
                    )}
                  </p>
                </div>
              </div>

              {/* Payment Status */}
              <div className="flex items-start">
                <div className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Payment Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      (() => {
                        // Calculate the total amount with profit
                        const totalAmount = order.total_amount_with_profit !== undefined
                          ? order.total_amount_with_profit
                          : (order.profit_percentage !== undefined
                              ? ((order.estimated_amount * (1 + order.profit_percentage / 100)) * (order.quantity || 1))
                              : (order.estimated_amount * (order.quantity || 1)));

                        // Calculate the balance (total amount - advance payment)
                        const balance = totalAmount - order.advance_amount;

                        return balance <= 0
                          ? 'bg-green-100 text-green-800'
                          : order.advance_amount > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800';
                      })()
                    }`}>
                      {(() => {
                        // Calculate the total amount with profit
                        const totalAmount = order.total_amount_with_profit !== undefined
                          ? order.total_amount_with_profit
                          : (order.profit_percentage !== undefined
                              ? ((order.estimated_amount * (1 + order.profit_percentage / 100)) * (order.quantity || 1))
                              : (order.estimated_amount * (order.quantity || 1)));

                        // Calculate the balance (total amount - advance payment)
                        const balance = totalAmount - order.advance_amount;

                        return balance <= 0
                          ? 'Fully Paid'
                          : order.advance_amount > 0
                            ? 'Partially Paid'
                            : 'Unpaid';
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Reminder Button - Only show if there's a balance and customer email */}
              {(() => {
                // Calculate the total amount with profit
                const totalAmount = order.total_amount_with_profit !== undefined
                  ? order.total_amount_with_profit
                  : (order.profit_percentage !== undefined
                      ? ((order.estimated_amount * (1 + order.profit_percentage / 100)) * (order.quantity || 1))
                      : (order.estimated_amount * (order.quantity || 1)));

                // Calculate the balance (total amount - advance payment)
                const balance = totalAmount - order.advance_amount;

                return balance > 0 && order.customer_email;
              })() && (
                <div className="mt-4">
                  <button
                    onClick={handleSendReminder}
                    disabled={sendingReminder}
                    className={`w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium
                      ${sendingReminder
                        ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                        : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                  >
                    {sendingReminder ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Payment Reminder
                      </>
                    )}
                  </button>

                  {/* Success Message */}
                  {reminderSuccess && (
                    <div className="mt-2 p-2 bg-green-100 border border-green-400 text-green-700 rounded-md text-sm">
                      <CheckCircle className="h-4 w-4 inline-block mr-1" />
                      {reminderSuccess}
                    </div>
                  )}

                  {/* Error Message */}
                  {reminderError && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                      <AlertCircle className="h-4 w-4 inline-block mr-1" />
                      {reminderError}
                    </div>
                  )}
                </div>
              )}

              {/* Show message if customer email is missing */}
              {(() => {
                // Calculate the total amount with profit
                const totalAmount = order.total_amount_with_profit !== undefined
                  ? order.total_amount_with_profit
                  : (order.profit_percentage !== undefined
                      ? ((order.estimated_amount * (1 + order.profit_percentage / 100)) * (order.quantity || 1))
                      : (order.estimated_amount * (order.quantity || 1)));

                // Calculate the balance (total amount - advance payment)
                const balance = totalAmount - order.advance_amount;

                return balance > 0 && !order.customer_email;
              })() && (
                <div className="mt-4 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-md text-sm">
                  <AlertCircle className="h-4 w-4 inline-block mr-1" />
                  Cannot send reminder: Customer email is not available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle and Right columns - Images and Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images Gallery */}
          {order.imageDetails && order.imageDetails.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-md">
              <h2 className="text-lg font-semibold mb-4">Design Images</h2>

              {/* Main selected image */}
              {selectedImage && (
                <div className="mb-4 flex justify-center">
                  <div className="relative w-full max-w-md h-80 bg-gray-100 rounded-lg overflow-hidden shadow-md">
                    <Image
                      src={`http://localhost:3002/uploads/custom_orders/${selectedImage}`}
                      alt="Selected design"
                      fill
                      style={{ objectFit: 'contain' }}
                      className="p-2"
                      onError={(e) => {
                        console.error('Error loading image:', e);
                        // Try alternative path if the first one fails
                        const imgElement = e.target as HTMLImageElement;
                        if (!imgElement.src.includes('?retry=true')) {
                          imgElement.src = `${imgElement.src}?retry=true`;
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Thumbnails - only show if there are multiple images */}
              {order.imageDetails.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {order.imageDetails.map((image) => (
                    <div
                      key={image.image_id}
                      className={`relative h-20 bg-gray-200 rounded-md overflow-hidden cursor-pointer ${
                        selectedImage === image.image_path ? 'ring-2 ring-yellow-500' : ''
                      }`}
                      onClick={() => handleImageSelect(image.image_path)}
                    >
                      <Image
                        src={`http://localhost:3002/uploads/custom_orders/${image.image_path}`}
                        alt="Design thumbnail"
                        fill
                        style={{ objectFit: 'cover' }}
                        onError={(e) => {
                          console.error('Error loading thumbnail:', e);
                          // Try alternative path if the first one fails
                          const imgElement = e.target as HTMLImageElement;
                          if (!imgElement.src.includes('?retry=true')) {
                            imgElement.src = `${imgElement.src}?retry=true`;
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Order Details */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-4">Order Details</h2>

            {order.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-md border border-gray-200">
                  {order.description}
                </p>
              </div>
            )}

            {order.special_requirements && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Special Requirements</h3>
                <p className="text-sm text-gray-600 bg-white p-3 rounded-md border border-gray-200">
                  {order.special_requirements}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomOrderDetailPage;
