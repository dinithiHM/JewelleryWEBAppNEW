"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Store, Package, AlertTriangle, Clock, CheckCircle, AlertCircle, Mail, Calendar, Plus, ArrowRight, Filter, CheckSquare, Clipboard } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
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

// Define types for order items
interface OrderItem {
  order_item_id?: number;
  order_id: number;
  category: string;
  quantity: number;
  offer_gold: number;
  selected_karats: string;
  karat_values: string;
  design_image?: string | null;
  design_image_url?: string;
  status: string;
  gold_price_per_gram?: number;
  weight_in_grams?: number;
  making_charges?: number;
  additional_materials_charges?: number;
  base_estimated_price?: number;
  estimated_price?: number;
  total_amount?: number;
  selectedKarat?: string;
  goldPurity?: number;
  offered_gold_value?: number;
  created_at: string;
  updated_at?: string;
  supplier_notes?: string;
}

interface Order {
  order_id: number;
  category?: string;
  supplier_id: string;
  quantity?: number;
  offer_gold?: number;
  selected_karats?: string;
  karat_values?: string;
  design_image?: string | null;
  design_image_url?: string;
  status?: string;
  created_at?: string;
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

  // Order items
  items?: OrderItem[];
  itemsCount?: number;
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

  // State for sorting and filtering
  const [sortOption, setSortOption] = useState<string>('overdue');
  const [filterOption, setFilterOption] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Define types for custom orders
interface CustomOrder {
  order_id: number;
  order_reference: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_date: string;
  estimated_completion_date: string;
  estimated_amount: number;
  advance_amount: number;
  balance_amount: number;
  order_status: string;
  payment_status: string;
  category_id: number;
  category_name: string;
  supplier_id: number;
  supplier_name: string;
  description: string;
  branch_id: number;
  branch_name: string;
  pickup_date?: string;
  pickup_notes?: string;
}

// State for completed orders
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [orderError, setOrderError] = useState<string | null>(null);

// State for completed custom orders
  const [completedCustomOrders, setCompletedCustomOrders] = useState<CustomOrder[]>([]);
  const [loadingCustomOrders, setLoadingCustomOrders] = useState<boolean>(true);
  const [customOrderError, setCustomOrderError] = useState<string | null>(null);
  const [sendingNotification, setSendingNotification] = useState<boolean>(false);
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [showPickedUpOrders, setShowPickedUpOrders] = useState<boolean>(false);

  // State for marking orders as picked up
  const [markingAsPickedUp, setMarkingAsPickedUp] = useState<boolean>(false);
  const [pickupSuccess, setPickupSuccess] = useState<string | null>(null);
  const [pickupError, setPickupError] = useState<string | null>(null);
  const [showPickupModal, setShowPickupModal] = useState<boolean>(false);
  const [selectedOrderForPickup, setSelectedOrderForPickup] = useState<CustomOrder | null>(null);
  const [pickupNotes, setPickupNotes] = useState<string>('');

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

  // State for dashboard cards
  const [todaySales, setTodaySales] = useState<string>("LKR 0");
  const [inventoryCount, setInventoryCount] = useState<string>("0");
  const [lowStockCount, setLowStockCount] = useState<string>("0");
  const [loadingDashboardCounts, setLoadingDashboardCounts] = useState<boolean>(true);

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

  // Check if a payment is due today
  const isDueToday = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  };

  // Check if a payment is due this week
  const isDueThisWeek = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  // Sort and filter outstanding payments
  const getSortedAndFilteredPayments = () => {
    // Apply filter
    let filtered = [...outstandingPayments];

    if (filterOption === 'overdue') {
      filtered = filtered.filter(payment => isOlderThan10Days(payment.payment_date));
    } else if (filterOption === 'today') {
      filtered = filtered.filter(payment => isDueToday(payment.payment_date));
    } else if (filterOption === 'this-week') {
      filtered = filtered.filter(payment => isDueThisWeek(payment.payment_date));
    }

    // Apply sorting
    if (sortOption === 'overdue') {
      // Sort by overdue first, then by date (oldest first)
      filtered.sort((a, b) => {
        const aIsOverdue = isOlderThan10Days(a.payment_date);
        const bIsOverdue = isOlderThan10Days(b.payment_date);

        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;

        // If both are overdue or both are not overdue, sort by date (oldest first)
        return new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      });
    } else if (sortOption === 'amount-high') {
      // Sort by balance amount (highest first)
      filtered.sort((a, b) => b.balance_amount - a.balance_amount);
    } else if (sortOption === 'amount-low') {
      // Sort by balance amount (lowest first)
      filtered.sort((a, b) => a.balance_amount - b.balance_amount);
    } else if (sortOption === 'date-new') {
      // Sort by date (newest first)
      filtered.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
    } else if (sortOption === 'date-old') {
      // Sort by date (oldest first)
      filtered.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    }

    return filtered;
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

  // State for email modal
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [selectedPaymentForEmail, setSelectedPaymentForEmail] = useState<AdvancePayment | null>(null);
  const [emailInput, setEmailInput] = useState<string>('');
  const [updatingEmail, setUpdatingEmail] = useState<boolean>(false);

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
        // For inventory items
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
        // If the error is about missing email, show the email input modal
        if (data.message && data.message.includes('Customer email is not available')) {
          setSelectedPaymentForEmail(payment);
          setShowEmailModal(true);
          setEmailInput('');
        } else {
          setEmailError(data.message || 'Failed to send payment reminder');
        }
      }
    } catch (err) {
      console.error('Error sending payment reminder:', err);
      setEmailError(err instanceof Error ? err.message : 'An error occurred while sending the reminder');
    } finally {
      setSendingEmail(false);
    }
  };

  // Update customer email and then send reminder
  const updateEmailAndSendReminder = async () => {
    if (!selectedPaymentForEmail || !emailInput || !emailInput.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setUpdatingEmail(true);
    setEmailError(null);

    try {
      // First update the email
      const updateResponse = await fetch(`http://localhost:3002/advance-payments/${selectedPaymentForEmail.payment_id}/update-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ customer_email: emailInput })
      });

      const updateData = await updateResponse.json();

      if (updateResponse.ok && updateData.success) {
        // Now send the reminder
        const reminderResponse = await fetch(`http://localhost:3002/advance-payments/${selectedPaymentForEmail.payment_id}/send-reminder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const reminderData = await reminderResponse.json();

        if (reminderResponse.ok && reminderData.success) {
          setEmailSuccess(`Email updated and payment reminder sent to ${selectedPaymentForEmail.customer_name}`);

          // Update the payment in the state with the new email
          const updatedPayments = outstandingPayments.map(p =>
            p.payment_id === selectedPaymentForEmail.payment_id
              ? { ...p, customer_email: emailInput }
              : p
          );
          setOutstandingPayments(updatedPayments);

          // Close the modal
          setShowEmailModal(false);

          // Auto-hide success message after 5 seconds
          setTimeout(() => setEmailSuccess(null), 5000);
        } else {
          setEmailError(reminderData.message || 'Failed to send payment reminder');
        }
      } else {
        setEmailError(updateData.message || 'Failed to update email address');
      }
    } catch (err) {
      console.error('Error updating email and sending reminder:', err);
      setEmailError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdatingEmail(false);
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

  // Fetch dashboard counts
  const fetchDashboardCounts = async (branchId: string) => {
    setLoadingDashboardCounts(true);

    try {
      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/dashboard-counts/all';
      const params = new URLSearchParams();

      // Filter by branch
      if (branchId) {
        params.append('branch_id', branchId);
      }

      // Add the parameters to the URL
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log('Fetching dashboard counts from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard counts: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received dashboard counts:', data);

      // Update state with the fetched data
      if (data.todaysales) {
        const formattedSales = `LKR ${Number(data.todaysales.total_amount).toLocaleString()}`;
        setTodaySales(formattedSales);
      }

      if (data.jewelleryitem) {
        // Use total_stock instead of count for inventory items
        setInventoryCount(data.jewelleryitem.total_stock.toString());
      }

      if (data.lowstock) {
        setLowStockCount(data.lowstock.count.toString());
      }
    } catch (err) {
      console.error('Error fetching dashboard counts:', err);
    } finally {
      setLoadingDashboardCounts(false);
    }
  };

  // Fetch completed orders
  const fetchCompletedOrders = async (branchId: string) => {
    setLoadingOrders(true);
    setOrderError(null);

    try {
      // Construct URL with query parameters for branch filtering
      let url = 'http://localhost:3002/orders/completed-items';
      const params = new URLSearchParams();

      // Set role parameter (store manager)
      params.append('role', 'store_manager');

      // Filter by branch
      params.append('branch_id', branchId);

      // Add the parameters to the URL
      url += `?${params.toString()}`;

      console.log('Fetching completed order items from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch completed order items: ${response.status}`);
      }

      const data = await response.json();

      // Log the data for debugging
      console.log('Received completed order items:', data);

      // The data is already processed by the server into orders with items
      setCompletedOrders(data);
    } catch (err) {
      console.error('Error fetching completed order items:', err);
      setOrderError(err instanceof Error ? err.message : 'An error occurred while fetching order items');

      // Use dummy data for development
      setCompletedOrders([
        {
          order_id: 1,
          supplier_id: '001',
          branch_id: 1,
          branch_name: 'Mahiyanganaya Branch',
          items: [
            {
              order_item_id: 1,
              order_id: 1,
              category: 'Wedding Sets',
              quantity: 5,
              offer_gold: 1,
              selected_karats: JSON.stringify(['24KT']),
              karat_values: JSON.stringify({ '24KT': 50 }),
              design_image: null,
              status: 'completed',
              gold_price_per_gram: 31771.17,
              selectedKarat: '24KT',
              weight_in_grams: 15.5,
              making_charges: 25000,
              estimated_price: 525953.14,
              total_amount: 2629765.70,
              created_at: new Date().toISOString()
            }
          ],
          itemsCount: 1
        },
        {
          order_id: 2,
          supplier_id: '002',
          branch_id: 1,
          branch_name: 'Mahiyanganaya Branch',
          items: [
            {
              order_item_id: 2,
              order_id: 2,
              category: 'Rings',
              quantity: 10,
              offer_gold: 1,
              selected_karats: JSON.stringify(['22KT']),
              karat_values: JSON.stringify({ '22KT': 40 }),
              design_image: null,
              status: 'completed',
              gold_price_per_gram: 29125.24,
              selectedKarat: '22KT',
              weight_in_grams: 8.2,
              making_charges: 12000,
              estimated_price: 254326.97,
              total_amount: 2543269.70,
              created_at: new Date(Date.now() - 86400000).toISOString()
            }
          ],
          itemsCount: 1
        }
      ]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch completed custom orders
  const fetchCompletedCustomOrders = async (branchId: string, includePickedUp: boolean = false) => {
    setLoadingCustomOrders(true);
    setCustomOrderError(null);

    try {
      // Start building query parameters
      const params = new URLSearchParams();

      // Add branch filter if provided
      if (branchId) {
        params.append('branch_id', branchId);
      }

      // Add option to include picked up orders
      if (includePickedUp) {
        params.append('include_picked_up', 'true');
      }

      // Construct URL with query parameters
      const url = `http://localhost:3002/custom-orders/completed-orders?${params.toString()}`;

      console.log('Fetching completed custom orders from:', url);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch completed custom orders: ${response.status}`);
      }

      const data = await response.json();

      // Log the data for debugging
      console.log('Received completed custom orders:', data);

      // Process the data to ensure numeric values
      const processedOrders = data.map((order: CustomOrder) => {
        return {
          ...order,
          estimated_amount: Number(order.estimated_amount),
          advance_amount: Number(order.advance_amount),
          balance_amount: Number(order.balance_amount),
          category_id: Number(order.category_id),
          supplier_id: Number(order.supplier_id),
          branch_id: Number(order.branch_id)
        };
      });

      setCompletedCustomOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching completed custom orders:', err);
      setCustomOrderError(err instanceof Error ? err.message : 'An error occurred while fetching custom orders');

      // Use dummy data for development
      setCompletedCustomOrders([
        {
          order_id: 101,
          order_reference: 'CUST-2023-0001',
          customer_name: 'John Smith',
          customer_phone: '0771234567',
          customer_email: 'john@example.com',
          order_date: new Date().toISOString(),
          estimated_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_amount: 150000,
          advance_amount: 50000,
          balance_amount: 100000,
          order_status: 'Completed',
          payment_status: 'Partially Paid',
          category_id: 1,
          category_name: 'Rings',
          supplier_id: 1,
          supplier_name: 'Mohamad Nazeem',
          description: 'Custom gold ring with diamond',
          branch_id: 1,
          branch_name: 'Mahiyanganaya Branch'
        },
        {
          order_id: 102,
          order_reference: 'CUST-2023-0002',
          customer_name: 'Sarah Johnson',
          customer_phone: '0777654321',
          customer_email: 'sarah@example.com',
          order_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_completion_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          estimated_amount: 250000,
          advance_amount: 250000,
          balance_amount: 0,
          order_status: 'Completed',
          payment_status: 'Fully Paid',
          category_id: 2,
          category_name: 'Necklaces',
          supplier_id: 2,
          supplier_name: 'Abdulla Nazeem',
          description: 'Custom gold necklace with pendant',
          branch_id: 1,
          branch_name: 'Mahiyanganaya Branch'
        }
      ]);
    } finally {
      setLoadingCustomOrders(false);
    }
  };

  // Send completion notification to customer
  const sendCompletionNotification = async (order: CustomOrder) => {
    setSendingNotification(true);
    setNotificationSuccess(null);
    setNotificationError(null);

    try {
      const response = await fetch(`http://localhost:3002/custom-orders/${order.order_id}/send-completion-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup_location: order.branch_name
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setNotificationSuccess(`Notification sent to ${order.customer_name}`);

        // Auto-hide success message after 5 seconds
        setTimeout(() => setNotificationSuccess(null), 5000);
      } else {
        setNotificationError(data.message || 'Failed to send notification');
      }
    } catch (err) {
      console.error('Error sending completion notification:', err);
      setNotificationError(err instanceof Error ? err.message : 'An error occurred while sending the notification');
    } finally {
      setSendingNotification(false);
    }
  };

  // Open the pickup modal for a specific order
  const openPickupModal = (order: CustomOrder) => {
    setSelectedOrderForPickup(order);
    setPickupNotes('');
    setPickupSuccess(null);
    setPickupError(null);
    setShowPickupModal(true);
  };

  // Mark an order as picked up
  const markOrderAsPickedUp = async () => {
    if (!selectedOrderForPickup) return;

    setMarkingAsPickedUp(true);
    setPickupSuccess(null);
    setPickupError(null);

    try {
      const response = await fetch(`http://localhost:3002/custom-orders/${selectedOrderForPickup.order_id}/mark-as-picked-up`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pickup_notes: pickupNotes
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPickupSuccess(`Order marked as picked up successfully`);

        // Remove the order from the list of completed orders
        setCompletedCustomOrders(prevOrders =>
          prevOrders.filter(order => order.order_id !== selectedOrderForPickup.order_id)
        );

        // Close the modal after a short delay
        setTimeout(() => {
          setShowPickupModal(false);
          // Auto-hide success message after 5 seconds
          setTimeout(() => setPickupSuccess(null), 5000);
        }, 1500);
      } else {
        setPickupError(data.message || 'Failed to mark order as picked up');
      }
    } catch (err) {
      console.error('Error marking order as picked up:', err);
      setPickupError(err instanceof Error ? err.message : 'An error occurred while updating the order');
    } finally {
      setMarkingAsPickedUp(false);
    }
  };

  // Handle adding to stock
  const handleAddToStock = async (order: Order & Partial<OrderItem>) => {
    // Check if this is an order item (has order_item_id) or a regular order
    const isOrderItem = !!order.order_item_id;

    try {
      let response;

      if (isOrderItem) {
        // Update the order item status to "added_to_stock"
        response = await fetch(`http://localhost:3002/suppliers/update-order-item-status/${order.order_item_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'added_to_stock' })
        });
      } else {
        // Update the order status to "added_to_stock"
        response = await fetch(`http://localhost:3002/orders/update-status/${order.order_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'added_to_stock' })
        });
      }

      if (!response.ok) {
        console.error('Failed to update status:', response.statusText);
        // Continue with navigation even if status update fails
      } else {
        console.log(`${isOrderItem ? `Order item #${order.order_item_id}` : `Order #${order.order_id}`} status updated to 'added_to_stock'`);

        // Remove the order or order item from the local state
        if (isOrderItem) {
          // If it's an order item, update the items array for the parent order
          setCompletedOrders(prevOrders =>
            prevOrders.map(o => {
              if (o.order_id === order.order_id && o.items) {
                // Filter out the processed item
                const updatedItems = o.items.filter(item => item.order_item_id !== order.order_item_id);

                // If no items left, remove the whole order
                if (updatedItems.length === 0) {
                  return null;
                }

                // Otherwise, return the order with updated items
                return { ...o, items: updatedItems, itemsCount: updatedItems.length };
              }
              return o;
            }).filter(Boolean) as Order[] // Remove null entries
          );
        } else {
          // If it's a regular order, remove it completely
          setCompletedOrders(prevOrders =>
            prevOrders.filter(o => o.order_id !== order.order_id)
          );
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
      // Continue with navigation even if status update fails
    }

    // Create query parameters for auto-filling the form
    const params = new URLSearchParams();

    // Map order fields to jewellery item fields, preferring item fields if available
    if (order.category) params.append('category', order.category);
    if (order.quantity) params.append('in_stock', order.quantity.toString());

    // Use the item's estimated price if available, otherwise use the order's
    const estimatedPrice = isOrderItem && order.estimated_price
      ? order.estimated_price
      : order.estimated_price;
    if (estimatedPrice) params.append('buying_price', estimatedPrice.toString());

    // Use the item's selectedKarat if available, otherwise use the order's
    const selectedKarat = isOrderItem && order.selectedKarat
      ? order.selectedKarat
      : order.selectedKarat;
    if (selectedKarat) {
      // Remove "KT" suffix if present
      const karat = selectedKarat.replace('KT', '');
      params.append('gold_carat', karat);
    }

    // Use the item's weight if available, otherwise use the order's
    const weight = isOrderItem && order.weight_in_grams
      ? order.weight_in_grams
      : order.weight_in_grams;
    if (weight) params.append('weight', weight.toString());

    // Add making charges and additional materials charges if they exist
    const makingCharges = isOrderItem && order.making_charges
      ? order.making_charges
      : order.making_charges;
    if (makingCharges) params.append('making_charges', makingCharges.toString());

    const additionalCharges = isOrderItem && order.additional_materials_charges
      ? order.additional_materials_charges
      : order.additional_materials_charges;
    if (additionalCharges) params.append('additional_materials_charges', additionalCharges.toString());

    // Add order ID and item ID (if applicable) to track which order this came from
    params.append('order_id', order.order_id.toString());
    if (isOrderItem && order.order_item_id) {
      params.append('order_item_id', order.order_item_id.toString());
    }

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

      // Fetch dashboard counts for this branch
      fetchDashboardCounts(storedBranchId);

      // Fetch outstanding payments for this branch
      fetchOutstandingPayments(storedBranchId);

      // Fetch supplier liabilities for this branch
      fetchSupplierLiabilities(storedBranchId);

      // Fetch completed orders for this branch
      fetchCompletedOrders(storedBranchId);

      // Fetch completed custom orders for this branch
      fetchCompletedCustomOrders(storedBranchId, showPickedUpOrders);
    }
  }, []);

  // Dashboard card component
  const DashboardCard = ({ icon: Icon, title, value, color }: { icon: any, title: string, value: string, color: string }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color}`}>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-500 text-sm font-medium">
            {title}
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Store Manager Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back{userName ? `, ${userName}` : ''}!
            </p>
          </div>
          <button
            onClick={() => {
              if (branchId) {
                fetchDashboardCounts(branchId);
              }
            }}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md flex items-center hover:bg-blue-100 transition-colors"
            title="Refresh dashboard data"
          >
            <Clock className="mr-1" size={16} />
            Refresh Data
          </button>
        </div>

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
          value={loadingDashboardCounts ? "Loading..." : todaySales}
          color="border-l-4 border-blue-500"
        />

        <DashboardCard
          icon={Package}
          title="Inventory Items"
          value={loadingDashboardCounts ? "Loading..." : inventoryCount}
          color="border-l-4 border-purple-500"
        />
        <DashboardCard
          icon={AlertTriangle}
          title="Low Stock Items"
          value={loadingDashboardCounts ? "Loading..." : lowStockCount}
          color="border-l-4 border-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <h2 className="text-xl font-bold">Customers with Outstanding Payments</h2>
              {!loadingPayments && outstandingPayments.filter(payment => isOlderThan10Days(payment.payment_date)).length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                  {outstandingPayments.filter(payment => isOlderThan10Days(payment.payment_date)).length} overdue
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-gray-600 hover:text-gray-800 flex items-center"
                title="Filter options"
              >
                <Filter className="mr-1" size={16} />
              </button>
              <button
                onClick={() => fetchOutstandingPayments(branchId)}
                className="text-blue-500 hover:text-blue-700 flex items-center"
              >
                <Clock className="mr-1" size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Sorting and filtering options */}
          {showFilters && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="overdue">Overdue first</option>
                    <option value="amount-high">Amount (High to Low)</option>
                    <option value="amount-low">Amount (Low to High)</option>
                    <option value="date-new">Date (Newest first)</option>
                    <option value="date-old">Date (Oldest first)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter</label>
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">All payments</option>
                    <option value="overdue">Overdue only</option>
                    <option value="today">Due today</option>
                    <option value="this-week">Due this week</option>
                  </select>
                </div>
              </div>

              {/* Display count of filtered payments */}
              {!loadingPayments && (
                <div className="mt-3 text-sm text-gray-600">
                  Showing {getSortedAndFilteredPayments().length} of {outstandingPayments.length} payments
                  {filterOption !== 'all' && (
                    <span> ({filterOption === 'overdue' ? 'overdue' : filterOption === 'today' ? 'due today' : 'due this week'})</span>
                  )}
                </div>
              )}
            </div>
          )}

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
              {getSortedAndFilteredPayments().map((payment) => (
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
                        <span className={
                          isOlderThan10Days(payment.payment_date)
                            ? 'text-red-600 font-medium'
                            : isDueToday(payment.payment_date)
                              ? 'text-orange-600 font-medium'
                              : isDueThisWeek(payment.payment_date)
                                ? 'text-yellow-600 font-medium'
                                : ''
                        }>
                          {formatDate(payment.payment_date)}
                          {isOlderThan10Days(payment.payment_date) && ' (Overdue)'}
                          {isDueToday(payment.payment_date) && ' (Due Today)'}
                          {!isOlderThan10Days(payment.payment_date) && !isDueToday(payment.payment_date) && isDueThisWeek(payment.payment_date) && ' (Due This Week)'}
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
                  {completedOrders.map((order) => {
                    // If order has items, render a row for each item
                    if (order.items && order.items.length > 0) {
                      return order.items.map((item, index) => (
                        <tr key={`${order.order_id}-item-${item.order_item_id || index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            #{order.order_id}{order.items && order.items.length > 1 ? `-${index + 1}` : ''}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.category || order.category}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.quantity || order.quantity}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.selectedKarat || order.selectedKarat || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.weight_in_grams ? `${Number(item.weight_in_grams).toFixed(2)}` :
                             order.weight_in_grams && typeof order.weight_in_grams === 'number' ? order.weight_in_grams.toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {item.estimated_price ? `LKR ${Number(item.estimated_price).toLocaleString()}` :
                             order.estimated_price && typeof order.estimated_price === 'number' ? `LKR ${order.estimated_price.toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleAddToStock({
                                ...order,
                                ...item,
                                design_image: item.design_image || order.design_image
                              })}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded-md flex items-center text-sm hover:bg-green-200"
                            >
                              <Plus size={14} className="mr-1" />
                              Add to Stock
                            </button>
                          </td>
                        </tr>
                      ));
                    } else {
                      // Render a single row for orders without items
                      return (
                        <tr key={order.order_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">#{order.order_id}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{order.category}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{order.quantity}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{order.selectedKarat || 'N/A'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {order.weight_in_grams && typeof order.weight_in_grams === 'number' ? order.weight_in_grams.toFixed(2) : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {order.estimated_price && typeof order.estimated_price === 'number' ? `LKR ${order.estimated_price.toLocaleString()}` : 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleAddToStock({
                                ...order,
                                design_image: order.design_image
                              })}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded-md flex items-center text-sm hover:bg-green-200"
                            >
                              <Plus size={14} className="mr-1" />
                              Add to Stock
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Completed Custom Orders</h2>
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="show-picked-up"
                  checked={showPickedUpOrders}
                  onChange={(e) => {
                    setShowPickedUpOrders(e.target.checked);
                    fetchCompletedCustomOrders(branchId, e.target.checked);
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="show-picked-up" className="text-sm text-gray-600">
                  Show picked up
                </label>
              </div>
              <button
                onClick={() => fetchCompletedCustomOrders(branchId, showPickedUpOrders)}
                className="text-blue-500 hover:text-blue-700 flex items-center"
              >
                <Clock className="mr-1" size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Notification success/error messages */}
          {notificationSuccess && (
            <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
              {notificationSuccess}
            </div>
          )}

          {notificationError && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {notificationError}
            </div>
          )}

          {/* Loading state */}
          {loadingCustomOrders ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : customOrderError ? (
            <div className="p-4 text-center text-red-500">
              Error loading data: {customOrderError}
            </div>
          ) : completedCustomOrders.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No completed custom orders found.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-96">
              {completedCustomOrders.map((order) => (
                <div
                  key={order.order_id}
                  className={`mb-3 p-3 border rounded-lg ${
                    order.order_status === 'Picked Up'
                      ? 'border-purple-300 bg-purple-50'
                      : order.payment_status === 'Fully Paid'
                        ? 'border-green-300 bg-green-50'
                        : 'border-yellow-300 bg-yellow-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {order.customer_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {order.order_reference || `Order #${order.order_id}`}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {order.category_name} - {order.description.substring(0, 30)}{order.description.length > 30 ? '...' : ''}
                      </div>
                      <div className="flex items-center text-sm mt-1">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span>
                          Completed: {formatDate(order.order_date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          order.payment_status === 'Fully Paid'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.payment_status}
                        </span>
                        {order.order_status === 'Picked Up' && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">
                            Picked Up {order.pickup_date && `(${formatDate(order.pickup_date)})`}
                          </span>
                        )}
                      </div>
                      {order.balance_amount > 0 && (
                        <div className="text-sm font-bold mt-1 text-red-600">
                          Balance: LKR {order.balance_amount.toLocaleString()}
                        </div>
                      )}
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => sendCompletionNotification(order)}
                          disabled={sendingNotification}
                          className={`px-2 py-1 text-xs rounded flex items-center justify-center ${
                            sendingNotification
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Send Email
                        </button>

                        {order.order_status !== 'Picked Up' && (
                          <button
                            onClick={() => openPickupModal(order)}
                            className="px-2 py-1 text-xs rounded flex items-center justify-center bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            <CheckSquare className="h-3 w-3 mr-1" />
                            Mark as Picked Up
                          </button>
                        )}
                        {order.order_status === 'Picked Up' && order.pickup_notes && (
                          <button
                            onClick={() => alert(`Pickup Notes: ${order.pickup_notes}`)}
                            className="px-2 py-1 text-xs rounded flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            <Clipboard className="h-3 w-3 mr-1" />
                            View Notes
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pickup Modal */}
      {showPickupModal && selectedOrderForPickup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Mark Order as Picked Up</h3>

            {pickupSuccess && (
              <div className="mb-4 p-2 bg-green-100 border border-green-400 text-green-700 rounded">
                {pickupSuccess}
              </div>
            )}

            {pickupError && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {pickupError}
              </div>
            )}

            <div className="mb-4">
              <p className="font-medium">{selectedOrderForPickup.customer_name}</p>
              <p className="text-sm text-gray-600">
                {selectedOrderForPickup.order_reference || `Order #${selectedOrderForPickup.order_id}`}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {selectedOrderForPickup.category_name}
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="pickup-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Notes (optional)
              </label>
              <textarea
                id="pickup-notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Enter any notes about the pickup (e.g., picked up by family member)"
                value={pickupNotes}
                onChange={(e) => setPickupNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPickupModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={markOrderAsPickedUp}
                disabled={markingAsPickedUp}
                className={`px-4 py-2 rounded-md text-sm text-white ${
                  markingAsPickedUp
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {markingAsPickedUp ? 'Processing...' : 'Confirm Pickup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && selectedPaymentForEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Add Customer Email</h3>

            <div className="mb-4">
              <p>To send a payment reminder to <strong>{selectedPaymentForEmail.customer_name}</strong>, please add their email address:</p>
            </div>

            <div className="mb-4">
              <label htmlFor="customer-email" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                id="customer-email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateEmailAndSendReminder}
                disabled={updatingEmail || !emailInput.includes('@')}
                className={`px-4 py-2 rounded-md text-sm text-white ${
                  updatingEmail || !emailInput.includes('@')
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {updatingEmail ? 'Processing...' : 'Save & Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreManagerDashboard;
