"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Users, ShoppingCart, Tag, Coins, Store, Package, TrendingUp, AlertTriangle, Clock, CheckCircle, AlertCircle, Mail, Calendar, Plus, ArrowRight } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "@/components/TranslatedText";
import { useRouter } from 'next/navigation';

// Define types for advance payments
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
}

// Define types for orders
interface PaymentRecord {
  payment_id: number;
  order_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_by?: number;
}

interface Order {
  order_id: number;
  category: string;
  supplier_id: string;
  quantity: number;
  offer_gold: number;
  selected_karats: string;
  karat_values: string;
  design_image: string | null;
  design_image_url?: string;
  status: string;
  created_at: string;
  branch_id?: number;
  branch_name?: string;
  created_by?: number;
  store_manager_name?: string;

  // Gold and pricing details
  gold_price_per_gram?: number;
  selectedKarat?: string;
  goldPurity?: number;
  weight_in_grams?: number;
  making_charges?: number;
  additional_materials_charges?: number;
  base_estimated_price?: number;
  estimated_price?: number;
  total_amount?: number;
  useCustomPrice?: boolean;

  // Payment details
  advance_payment_amount?: number;
  total_payment_amount?: number;
  payment_status?: string;
  payment_method?: string;
  payment_notes?: string;

  // Payment history
  payment_history?: PaymentRecord[];
}

const StoreManagerDashboard = () => {
  // Use language context to trigger re-renders when language changes
  useLanguage();
  const router = useRouter();
  const [userName, setUserName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('');

  // State for outstanding payments
  const [outstandingPayments, setOutstandingPayments] = useState<AdvancePayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // State for completed orders
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [orderError, setOrderError] = useState<string | null>(null);

  // State for supplier liabilities
  interface SupplierLiability {
    supplier_id: string;
    name: string;
    order_count: number;
    total_debt: number;
    payment_status: string;
    orders: {
      order_id: number;
      total_amount: number;
      paid_amount: number;
      remaining: number;
    }[];
  }

  const [supplierLiabilities, setSupplierLiabilities] = useState<SupplierLiability[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(true);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState<string>('');

  // Branch mapping function
  const getBranchNameById = (id: string | null): string => {
    if (!id) return "";

    const branchMap: {[key: string]: string} = {
      "1": "Mahiyanganaya Branch",
      "2": "Mahaoya Branch"
    };

    return branchMap[id] || `Branch ${id}`;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if a date is older than 10 days
  const isOlderThan10Days = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 10;
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

  // Fetch outstanding payments
  const fetchOutstandingPayments = async (branchId: string) => {
    setLoadingPayments(true);
    setPaymentError(null);

    try {
      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/advance-payments';
      const params = new URLSearchParams();

      // Set role parameter (store manager)
      params.append('role', 'store_manager');

      // Use grouped endpoint to get latest payment for each order/customer
      params.append('grouped', 'true');

      // Filter by branch
      params.append('branch_id', branchId);

      // Only get payments that are not completed
      params.append('status', 'outstanding');

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching outstanding payments from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch payments: ${response.status}`);
      }

      const data = await response.json();

      // Log the data for debugging
      console.log('Received outstanding payments:', data);

      // Create a map to ensure we only have one entry per customer-order combination
      const uniquePayments = new Map();

      // Process each payment
      data.forEach((payment: AdvancePayment) => {
        // Create a unique key for each customer-order combination
        const key = payment.is_custom_order
          ? `${payment.customer_name}-${payment.order_id}`
          : `${payment.customer_name}-${payment.item_id}`;

        // If we already have this combination, only keep the one with the latest payment_id
        if (!uniquePayments.has(key) || payment.payment_id > uniquePayments.get(key).payment_id) {
          uniquePayments.set(key, payment);
        }
      });

      // Convert the map values back to an array
      const uniquePaymentsArray = Array.from(uniquePayments.values());
      console.log('Filtered to unique customer-order combinations:', uniquePaymentsArray);

      setOutstandingPayments(uniquePaymentsArray);
    } catch (err) {
      console.error('Error fetching outstanding payments:', err);
      setPaymentError(err instanceof Error ? err.message : 'An error occurred while fetching payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  // Send payment reminder email
  const sendPaymentReminder = async (payment: AdvancePayment) => {
    setSendingEmail(true);
    setEmailSuccess(null);
    setEmailError(null);

    try {
      let endpoint = '';

      if (payment.is_custom_order && payment.order_id) {
        // For custom orders
        endpoint = `http://localhost:3002/custom-orders/${payment.order_id}/send-reminder`;
      } else {
        // For inventory items, we'll need to create a new endpoint or use a generic one
        endpoint = `http://localhost:3002/advance-payments/${payment.payment_id}/send-reminder`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmailSuccess(`Payment reminder sent to ${payment.customer_name}`);

        // Auto-hide success message after 5 seconds
        setTimeout(() => setEmailSuccess(null), 5000);
      } else {
        setEmailError(data.message || 'Failed to send payment reminder');
      }
    } catch (err) {
      console.error('Error sending payment reminder:', err);
      setEmailError(err instanceof Error ? err.message : 'An error occurred while sending the reminder');
    } finally {
      setSendingEmail(false);
    }
  };

  // Fetch supplier liabilities
  const fetchSupplierLiabilities = async (branchId: string) => {
    setLoadingSuppliers(true);
    setSupplierError(null);

    try {
      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/supplier-payments/liabilities';
      const params = new URLSearchParams();

      // Set role parameter (store manager)
      params.append('role', 'store_manager');

      // Filter by branch
      params.append('branch_id', branchId);

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching supplier liabilities from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch supplier liabilities: ${response.status}`);
      }

      const data = await response.json();

      // Log the data for debugging
      console.log('Received supplier liabilities:', data);

      // Process the data
      const processedData = data.map((supplier: any) => ({
        supplier_id: supplier.supplier_id,
        name: supplier.name,
        order_count: supplier.order_count,
        total_debt: supplier.total_debt || 0,
        payment_status: supplier.payment_status || 'Pending',
        orders: supplier.orders || []
      }));

      setSupplierLiabilities(processedData);
    } catch (err) {
      console.error('Error fetching supplier liabilities:', err);

      // Use dummy data for development
      const dummyData: SupplierLiability[] = [
        {
          supplier_id: '1',
          name: 'Mohamad Nazeem',
          order_count: 3,
          total_debt: 250000,
          payment_status: 'Partial',
          orders: [
            { order_id: 1, total_amount: 150000, paid_amount: 50000, remaining: 100000 },
            { order_id: 2, total_amount: 100000, paid_amount: 0, remaining: 100000 },
            { order_id: 3, total_amount: 50000, paid_amount: 0, remaining: 50000 }
          ]
        },
        {
          supplier_id: '2',
          name: 'Abdulla Nazeem',
          order_count: 2,
          total_debt: 180000,
          payment_status: 'Pending',
          orders: [
            { order_id: 4, total_amount: 80000, paid_amount: 0, remaining: 80000 },
            { order_id: 5, total_amount: 100000, paid_amount: 0, remaining: 100000 }
          ]
        },
        {
          supplier_id: '3',
          name: 'Vaseem Akram',
          order_count: 1,
          total_debt: 0,
          payment_status: 'Completed',
          orders: [
            { order_id: 6, total_amount: 75000, paid_amount: 75000, remaining: 0 }
          ]
        }
      ];

      setSupplierLiabilities(dummyData);
      setSupplierError(err instanceof Error ? err.message : 'An error occurred while fetching supplier liabilities');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  // Filter supplier liabilities based on search term
  const filteredSupplierLiabilities = supplierLiabilities.filter(supplier => {
    if (!supplierSearchTerm) return true;

    const searchLower = supplierSearchTerm.toLowerCase();

    // Search by supplier name
    if (supplier.name.toLowerCase().includes(searchLower)) return true;

    // Search by supplier ID
    if (supplier.supplier_id.toString().includes(searchLower)) return true;

    // Search by order ID
    if (supplier.orders && supplier.orders.some(order =>
      order.order_id.toString().includes(searchLower)
    )) return true;

    return false;
  });

  // Fetch completed orders
  const fetchCompletedOrders = async (branchId: string) => {
    setLoadingOrders(true);
    setOrderError(null);

    try {
      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/orders';
      const params = new URLSearchParams();

      // Set role parameter (store manager)
      params.append('role', 'store_manager');

      // Filter by branch
      params.append('branch_id', branchId);

      // Filter by status (completed) - make sure this parameter is correctly handled by the backend
      params.append('status', 'completed');

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching completed orders with status filter:', url);

      console.log('Fetching completed orders from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch completed orders: ${response.status}`);
      }

      const data = await response.json();

      // Log the data for debugging
      console.log('Received completed orders:', data);

      // Process the data
      const processedOrders = data.map((order: Order) => {
        // Process image URL if needed
        if (order.design_image) {
          const imagePath = order.design_image.startsWith('uploads/')
            ? order.design_image
            : `uploads/${order.design_image}`;

          order.design_image_url = `http://localhost:3002/${imagePath}`;
        }

        // Process selected karats if needed
        if (order.selected_karats && typeof order.selected_karats === 'string') {
          try {
            const selectedKarats = JSON.parse(order.selected_karats);
            if (selectedKarats && selectedKarats.length > 0) {
              // Use the first karat as the selectedKarat if not already set
              if (!order.selectedKarat) {
                order.selectedKarat = selectedKarats[0];
              }
            }
          } catch (e) {
            console.error('Error parsing selected_karats:', e);
          }
        }

        // Ensure numeric values are properly converted to numbers
        if (order.weight_in_grams) {
          order.weight_in_grams = Number(order.weight_in_grams);
        }

        if (order.estimated_price) {
          order.estimated_price = Number(order.estimated_price);
        }

        if (order.quantity) {
          order.quantity = Number(order.quantity);
        }

        return order;
      });

      setCompletedOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching completed orders:', err);
      setOrderError(err instanceof Error ? err.message : 'An error occurred while fetching orders');

      // Use dummy data for development
      setCompletedOrders([
        {
          order_id: 1,
          category: 'Wedding Sets',
          supplier_id: '001',
          quantity: Number(5),
          offer_gold: 1,
          selected_karats: JSON.stringify(['24KT']),
          karat_values: JSON.stringify({ '24KT': 50 }),
          design_image: null,
          status: 'completed',
          created_at: new Date().toISOString(),
          gold_price_per_gram: Number(31771.17),
          selectedKarat: '24KT',
          weight_in_grams: Number(15.5),
          making_charges: Number(25000),
          estimated_price: Number(525953.14),
          total_amount: Number(2629765.70)
        },
        {
          order_id: 2,
          category: 'Rings',
          supplier_id: '002',
          quantity: Number(10),
          offer_gold: 1,
          selected_karats: JSON.stringify(['22KT']),
          karat_values: JSON.stringify({ '22KT': 40 }),
          design_image: null,
          status: 'completed',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          gold_price_per_gram: Number(29125.24),
          selectedKarat: '22KT',
          weight_in_grams: Number(8.2),
          making_charges: Number(12000),
          estimated_price: Number(254326.97),
          total_amount: Number(2543269.70)
        }
      ]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Handle adding to stock
  const handleAddToStock = async (order: Order) => {
    // First, update the order status to "added_to_stock"
    try {
      const response = await fetch(`http://localhost:3002/orders/update-status/${order.order_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'added_to_stock' })
      });

      if (!response.ok) {
        console.error('Failed to update order status:', response.statusText);
        // Continue with navigation even if status update fails
      } else {
        console.log(`Order #${order.order_id} status updated to 'added_to_stock'`);

        // Remove the order from the local state
        setCompletedOrders(prevOrders =>
          prevOrders.filter(o => o.order_id !== order.order_id)
        );
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      // Continue with navigation even if status update fails
    }

    // Create query parameters for auto-filling the form
    const params = new URLSearchParams();

    // Map order fields to jewellery item fields
    if (order.category) params.append('category', order.category);
    if (order.quantity) params.append('in_stock', order.quantity.toString());
    if (order.estimated_price) params.append('buying_price', order.estimated_price.toString());
    if (order.selectedKarat) {
      // Remove "KT" suffix if present
      const karat = order.selectedKarat.replace('KT', '');
      params.append('gold_carat', karat);
    }
    if (order.weight_in_grams) params.append('weight', order.weight_in_grams.toString());

    // Add making charges and additional materials charges if they exist
    if (order.making_charges) params.append('making_charges', order.making_charges.toString());
    if (order.additional_materials_charges) params.append('additional_materials_charges', order.additional_materials_charges.toString());

    // Add order ID to track which order this came from
    params.append('order_id', order.order_id.toString());

    // Navigate to jewellery-stock page with parameters
    router.push(`/DashView/jewellery-stock?${params.toString()}`);
  };

  useEffect(() => {
    // Get user info from localStorage if available
    const storedName = localStorage.getItem('userName');
    const storedBranch = localStorage.getItem('branchName');
    const storedBranchId = localStorage.getItem('branchId');

    console.log("StoreManager Dashboard - localStorage values:");
    console.log("userName:", storedName);
    console.log("branchName:", storedBranch);
    console.log("branchId:", storedBranchId);

    if (storedName) {
      setUserName(storedName);
    }

    // Use stored branch name if available, otherwise use the branch ID mapping
    if (storedBranch) {
      setBranchName(storedBranch);
      console.log("Using stored branch name:", storedBranch);
    } else if (storedBranchId) {
      const mappedBranchName = getBranchNameById(storedBranchId);
      setBranchName(mappedBranchName);
      console.log("Using mapped branch name:", mappedBranchName);

      // Also store it in localStorage for consistency
      if (typeof window !== 'undefined') {
        localStorage.setItem('branchName', mappedBranchName);
      }
    }

    // Set branch ID state
    if (storedBranchId) {
      setBranchId(storedBranchId);

      // Fetch outstanding payments for this branch
      fetchOutstandingPayments(storedBranchId);

      // Fetch supplier liabilities for this branch
      fetchSupplierLiabilities(storedBranchId);

      // Fetch completed orders for this branch
      fetchCompletedOrders(storedBranchId);
    }
  }, []);

  // Dashboard card component
  const DashboardCard = ({ icon: Icon, title, value, color }: { icon: any, title: string, value: string, color: string }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color}`}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">
            <TranslatedText textKey={`dashboard.${title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}`} fallback={title} />
          </h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-l-4', 'bg').replace('-500', '-100')}`}>
          <Icon className={color.replace('border-l-4 border', 'text')} size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Store Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back{userName ? `, ${userName}` : ''}!
        </p>

        {/* Branch information - more prominent display */}
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center">
          <Store className="text-blue-500 mr-2" size={20} />
          <div>
            <p className="font-medium text-blue-800">
              {branchName ? `Managing: ${branchName}` : "No branch assigned"}
            </p>
            <p className="text-xs text-blue-600">
              Branch ID: {branchId || "Not assigned"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <DashboardCard
          icon={ShoppingCart}
          title="Today's Sales"
          value="LKR 124,500"
          color="border-l-4 border-blue-500"
        />

        <DashboardCard
          icon={Package}
          title="Inventory Items"
          value="1,245"
          color="border-l-4 border-purple-500"
        />
        <DashboardCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value="12"
          color="border-l-4 border-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Customers with Outstanding Payments</h2>
            <button
              onClick={() => fetchOutstandingPayments(branchId)}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <Clock className="mr-1" size={16} />
              Refresh
            </button>
          </div>

          {/* Email success/error messages */}
          {emailSuccess && (
            <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
              {emailSuccess}
            </div>
          )}

          {emailError && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {emailError}
            </div>
          )}

          {/* Loading state */}
          {loadingPayments ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : paymentError ? (
            <div className="p-4 text-center text-red-500">
              Error loading data: {paymentError}
            </div>
          ) : outstandingPayments.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No customers with outstanding payments found.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-80">
              {outstandingPayments.map((payment) => (
                <div
                  key={payment.payment_id}
                  className={`mb-3 p-3 border rounded-lg ${
                    isOlderThan10Days(payment.payment_date)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  // Add a unique identifier as a data attribute for debugging
                  data-customer-order={payment.is_custom_order
                    ? `${payment.customer_name}-${payment.order_id}`
                    : `${payment.customer_name}-${payment.item_id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {payment.customer_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {payment.is_custom_order
                          ? `Custom Order #${payment.order_reference || payment.order_id}`
                          : `Item: ${payment.item_name}`
                        }
                      </div>
                      <div className="flex items-center text-sm mt-1">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span className={isOlderThan10Days(payment.payment_date) ? 'text-red-600 font-medium' : ''}>
                          {formatDate(payment.payment_date)}
                          {isOlderThan10Days(payment.payment_date) && ' (Overdue)'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center">
                        {getStatusIcon(payment.payment_status)}
                        <span className="text-sm font-medium">
                          {payment.payment_status}
                        </span>
                      </div>
                      <div className="text-sm font-bold mt-1">
                        Balance: LKR {payment.balance_amount.toLocaleString()}
                      </div>
                      <button
                        onClick={() => sendPaymentReminder(payment)}
                        disabled={sendingEmail}
                        className={`mt-2 px-2 py-1 text-xs rounded flex items-center ${
                          sendingEmail
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Send Reminder
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Supplier Liabilities</h2>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search supplier or order..."
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                value={supplierSearchTerm}
                onChange={(e) => setSupplierSearchTerm(e.target.value)}
              />
              <button
                onClick={() => fetchSupplierLiabilities(branchId)}
                className="text-blue-500 hover:text-blue-700 flex items-center"
              >
                <Clock className="mr-1" size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Loading state */}
          {loadingSuppliers ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : supplierError ? (
            <div className="p-4 text-center text-red-500">
              Error loading data: {supplierError}
            </div>
          ) : supplierLiabilities.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No supplier liabilities found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Debt</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSupplierLiabilities.map((supplier) => (
                    <tr key={supplier.supplier_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{supplier.name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {supplier.order_count}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        LKR {supplier.total_debt.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          supplier.payment_status === 'Completed' ? 'bg-green-100 text-green-800' :
                          supplier.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {supplier.payment_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Completed Orders</h2>
            <button
              onClick={() => fetchCompletedOrders(branchId)}
              className="text-blue-500 hover:text-blue-700 flex items-center"
            >
              <Clock className="mr-1" size={16} />
              Refresh
            </button>
          </div>

          {/* Loading state */}
          {loadingOrders ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : orderError ? (
            <div className="p-4 text-center text-red-500">
              Error loading data: {orderError}
            </div>
          ) : completedOrders.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No completed orders found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gold Karat</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (g)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedOrders.map((order) => (
                    <tr key={order.order_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">#{order.order_id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{order.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{order.quantity}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{order.selectedKarat || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{order.weight_in_grams && typeof order.weight_in_grams === 'number' ? order.weight_in_grams.toFixed(2) : 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {order.estimated_price && typeof order.estimated_price === 'number' ? `LKR ${order.estimated_price.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleAddToStock(order)}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-md flex items-center text-sm hover:bg-green-200"
                        >
                          <Plus size={14} className="mr-1" />
                          Add to Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 rounded-lg flex flex-col items-center justify-center hover:bg-blue-100 transition duration-200">
              <Store className="text-blue-500 mb-2" size={24} />
              <span className="text-sm font-medium">Inventory</span>
            </button>
            <button className="p-4 bg-green-50 rounded-lg flex flex-col items-center justify-center hover:bg-green-100 transition duration-200">
              <Users className="text-green-500 mb-2" size={24} />
              <span className="text-sm font-medium">Staff</span>
            </button>
            <button className="p-4 bg-purple-50 rounded-lg flex flex-col items-center justify-center hover:bg-purple-100 transition duration-200">
              <ShoppingCart className="text-purple-500 mb-2" size={24} />
              <span className="text-sm font-medium">Sales</span>
            </button>
            <button className="p-4 bg-yellow-50 rounded-lg flex flex-col items-center justify-center hover:bg-yellow-100 transition duration-200">
              <TrendingUp className="text-yellow-500 mb-2" size={24} />
              <span className="text-sm font-medium">Reports</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreManagerDashboard;
