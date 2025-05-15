"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Package,
  ShoppingBag,
  User,
  FileText,
  CheckCircle,
  X
} from 'lucide-react';
import LKRIcon from '@/components/icons/LKRIcon';
import { formatCurrency } from '@/utils/formatters';

// Define types
interface JewelleryItem {
  item_id: number;
  product_title: string;
  category: string;
  selling_price: number;
  in_stock: number;
}

interface CustomOrder {
  order_id: number;
  order_reference: string;
  customer_name: string;
  total_amount: number;
  estimated_amount?: number;
  advance_amount?: number;
  balance_amount?: number;
  status: string;
  payment_status?: string;
  customer_phone?: string;
  customer_email?: string;
  description?: string;
  special_requirements?: string;
  actual_advance_amount?: number;
  actual_balance_amount?: number;
}

// Payment type enum
enum PaymentType {
  INVENTORY_ITEM = 'inventory_item',
  CUSTOM_ORDER = 'custom_order'
}

const AdvancePaymentPage = () => {
  const router = useRouter();

  // State for form fields
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.INVENTORY_ITEM);
  const [customerName, setCustomerName] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState<number>(1);

  // State for selected items
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // State for data
  const [availableItems, setAvailableItems] = useState<JewelleryItem[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [selectedItem, setSelectedItem] = useState<JewelleryItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CustomOrder | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredItems, setFilteredItems] = useState<JewelleryItem[]>([]);

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Check for URL query parameters
  useEffect(() => {
    // Get the URL search params
    const searchParams = new URLSearchParams(window.location.search);
    const typeParam = searchParams.get('type');

    // Handle custom order parameters
    if (typeParam === 'custom') {
      const orderIdParam = searchParams.get('order_id');
      if (orderIdParam) {
        // If order ID is in URL, set payment type to custom order
        setPaymentType(PaymentType.CUSTOM_ORDER);
        console.log(`Custom order ID found in URL: ${orderIdParam}`);

        // Wait for custom orders to load before selecting
        const checkAndSelectOrder = () => {
          if (customOrders.length > 0) {
            const orderId = parseInt(orderIdParam);
            setSelectedOrderId(orderId);

            // Scroll to the payment form
            const paymentForm = document.getElementById('payment-form');
            if (paymentForm) {
              paymentForm.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            // If custom orders not loaded yet, try again in 500ms
            setTimeout(checkAndSelectOrder, 500);
          }
        };

        checkAndSelectOrder();
      }
    }
    // Handle inventory item parameters
    else if (typeParam === 'inventory') {
      setPaymentType(PaymentType.INVENTORY_ITEM);

      const itemIdParam = searchParams.get('item_id');
      const customerNameParam = searchParams.get('customer_name');
      const totalAmountParam = searchParams.get('total_amount');
      const balanceParam = searchParams.get('balance');
      const advanceParam = searchParams.get('advance');
      const paymentIdParam = searchParams.get('payment_id');
      const quantityParam = searchParams.get('quantity');

      console.log(`Inventory item parameters found in URL: item_id=${itemIdParam}, customer=${customerNameParam}`);

      // Set customer name if provided
      if (customerNameParam) {
        setCustomerName(customerNameParam);
      }

      // Set total amount if provided
      if (totalAmountParam) {
        setTotalAmount(parseFloat(totalAmountParam));
      }

      // Set quantity if provided
      if (quantityParam) {
        const qty = parseInt(quantityParam);
        if (qty > 0) {
          setQuantity(qty);
        }
      }

      // Set up for additional payments
      // If we have both balance and advance, use them to calculate the correct amount
      if (balanceParam && advanceParam) {
        // Get the remaining balance and previous advance
        const balance = parseFloat(balanceParam);
        const previousAdvance = parseFloat(advanceParam);

        // For additional payments, we set advance amount to 0 (empty field for user to enter)
        setAdvanceAmount(0);

        // Set the balance to the remaining balance
        setBalanceAmount(balance);

        console.log(`Setting advance amount to 0 and balance to remaining balance: ${balance}`);
        console.log(`Previous advance payment: ${previousAdvance}`);
      }

      // Add note about the previous payment
      if (paymentIdParam && advanceParam) {
        const previousAdvance = parseFloat(advanceParam);
        setNotes(`Additional payment for previous payment ID: ${paymentIdParam}. Previous advance payment: ${previousAdvance.toFixed(2)}`);
      } else if (paymentIdParam) {
        setNotes(`Additional payment for previous payment ID: ${paymentIdParam}`);
      }

      // Wait for items to load before selecting
      if (itemIdParam) {
        const checkAndSelectItem = () => {
          if (availableItems.length > 0) {
            const itemId = parseInt(itemIdParam);

            // Find the item to get its category
            const item = availableItems.find(i => i.item_id === itemId);
            if (item) {
              // Set the category first
              setSelectedCategory(item.category);

              // Then set the item ID after a short delay to ensure the filtered items are updated
              setTimeout(() => {
                setSelectedItemId(itemId);

                // Scroll to the payment form
                const paymentForm = document.getElementById('payment-form');
                if (paymentForm) {
                  paymentForm.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }
          } else {
            // If items not loaded yet, try again in 500ms
            setTimeout(checkAndSelectItem, 500);
          }
        };

        checkAndSelectItem();
      }
    }
    // Legacy support for old URL format
    else {
      const orderIdParam = searchParams.get('order');
      if (orderIdParam) {
        setPaymentType(PaymentType.CUSTOM_ORDER);
        console.log(`Legacy order ID found in URL: ${orderIdParam}`);

        // Wait for custom orders to load before selecting
        const checkAndSelectOrder = () => {
          if (customOrders.length > 0) {
            const orderId = parseInt(orderIdParam);
            setSelectedOrderId(orderId);

            // Scroll to the payment form
            const paymentForm = document.getElementById('payment-form');
            if (paymentForm) {
              paymentForm.scrollIntoView({ behavior: 'smooth' });
            }
          } else {
            // If custom orders not loaded yet, try again in 500ms
            setTimeout(checkAndSelectOrder, 500);
          }
        };

        checkAndSelectOrder();
      }
    }
  }, [customOrders, availableItems]);

  // Fetch available items and custom orders on component mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch available items
        const itemsResponse = await fetch('http://localhost:3002/advance-payments/items/available');
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json();
          setAvailableItems(itemsData);

          // Fetch categories from the database instead of extracting from items
          try {
            const categoriesResponse = await fetch('http://localhost:3002/categories');
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json();
              // Extract category names from the response
              const categoryNames = categoriesData.map((cat: any) => cat.category_name);
              console.log('Fetched categories from database:', categoryNames);
              setCategories(categoryNames);

              if (categoryNames.length > 0) {
                setSelectedCategory(categoryNames[0]);
              }
            } else {
              // Fallback to extracting from items if API fails
              console.warn('Failed to fetch categories, falling back to item categories');
              const uniqueCategories = Array.from(new Set(itemsData.map((item: JewelleryItem) => item.category))) as string[];
              setCategories(uniqueCategories);
              if (uniqueCategories.length > 0) {
                setSelectedCategory(uniqueCategories[0]);
              }
            }
          } catch (catErr) {
            console.error('Error fetching categories:', catErr);
            // Fallback to extracting from items
            const uniqueCategories = Array.from(new Set(itemsData.map((item: JewelleryItem) => item.category))) as string[];
            setCategories(uniqueCategories);
            if (uniqueCategories.length > 0) {
              setSelectedCategory(uniqueCategories[0]);
            }
          }
        }

        // Fetch custom orders
        const ordersResponse = await fetch('http://localhost:3002/advance-payments/orders/custom');
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();

          // The backend now filters out completed orders
          setCustomOrders(ordersData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter items by selected category
  useEffect(() => {
    if (selectedCategory) {
      const filtered = availableItems.filter(item => item.category === selectedCategory);
      setFilteredItems(filtered);
    } else {
      setFilteredItems(availableItems);
    }
  }, [selectedCategory, availableItems]);

  // Update selected item when item ID changes
  useEffect(() => {
    if (selectedItemId) {
      const item = availableItems.find(item => item.item_id === selectedItemId);
      setSelectedItem(item || null);

      if (item) {
        // Calculate total amount based on item price and quantity
        const total = item.selling_price * quantity;
        setTotalAmount(total);
      }
    } else {
      setSelectedItem(null);
    }
  }, [selectedItemId, availableItems, quantity]);

  // Update selected order when order ID changes
  useEffect(() => {
    if (selectedOrderId) {
      // First, find the order in the customOrders array
      const order = customOrders.find(order => order.order_id === selectedOrderId);

      if (order) {
        console.log('Selected order from dropdown:', order);

        // Set customer name from the order
        setCustomerName(order.customer_name);

        // Set total amount from the estimated amount
        if (order.estimated_amount) {
          const totalAmt = typeof order.estimated_amount === 'string' ?
            parseFloat(order.estimated_amount) : order.estimated_amount;
          setTotalAmount(totalAmt);
          console.log(`Set total amount to ${totalAmt}`);
        }

        // Fetch the complete order details from the server to get accurate payment information
        fetchOrderDetails(selectedOrderId);
      } else {
        setSelectedOrder(null);
      }
    } else {
      setSelectedOrder(null);
    }
  }, [selectedOrderId, customOrders]);

  // Function to fetch more details about a custom order
  const fetchOrderDetails = async (orderId: number) => {
    try {
      // First, fetch the basic order details
      const response = await fetch(`http://localhost:3002/custom-orders/${orderId}`);
      if (response.ok) {
        const orderDetails = await response.json();
        console.log('Fetched order details from server:', orderDetails);

        // Update the selected order with the accurate data from the server
        setSelectedOrder(orderDetails);

        // Now fetch the payment history to get the most accurate payment information
        try {
          const historyResponse = await fetch(`http://localhost:3002/advance-payments/history/order/${orderId}`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            console.log('Fetched payment history from server:', historyData);

            if (historyData && historyData.total_paid !== undefined) {
              // Update the order details with the accurate payment information from history
              const updatedOrderDetails = {
                ...orderDetails,
                actual_advance_amount: historyData.total_paid,
                actual_balance_amount: historyData.remaining_balance
              };

              console.log('Updated order details with payment history:', updatedOrderDetails);
              setSelectedOrder(updatedOrderDetails);

              // Update the balance amount field with the correct remaining balance
              setBalanceAmount(historyData.remaining_balance);
              console.log(`Setting balance from payment history: ${historyData.remaining_balance}`);

              // Force update the balance amount input field
              setTimeout(() => {
                const balanceInput = document.getElementById('balanceAmount') as HTMLInputElement;
                if (balanceInput) {
                  balanceInput.value = historyData.remaining_balance.toString();
                  console.log('Directly updated balance input field to:', historyData.remaining_balance);
                }
              }, 100);

              // Add payment history information to notes
              let paymentNotes = '';
              if (historyData.payments && historyData.payments.length > 0) {
                paymentNotes = `Previous Payments:\n`;
                historyData.payments.forEach((payment: any, index: number) => {
                  paymentNotes += `${index + 1}. ${payment.payment_reference}: ${formatCurrency(payment.advance_amount)} (${new Date(payment.payment_date).toLocaleDateString()})\n`;
                });

                if (orderDetails.description) {
                  paymentNotes += `\nDescription: ${orderDetails.description}\n`;
                }
                if (orderDetails.special_requirements) {
                  paymentNotes += `Special Requirements: ${orderDetails.special_requirements}\n`;
                }

                setNotes(paymentNotes);
              }

              return; // Skip the standard calculation below since we have accurate data
            }
          }
        } catch (historyErr) {
          console.error('Error fetching payment history:', historyErr);
          // Continue with standard calculation if history fetch fails
        }

        // If payment history fetch failed or didn't have the data we need,
        // fall back to the standard calculation using order details
        if (orderDetails.advance_amount && orderDetails.advance_amount > 0) {
          const advanceAmount = typeof orderDetails.advance_amount === 'string' ?
            parseFloat(orderDetails.advance_amount) : orderDetails.advance_amount;

          console.log(`Server reports this order has an advance payment of ${advanceAmount}`);

          // Calculate the remaining balance (total - advance)
          const totalAmt = typeof orderDetails.estimated_amount === 'string' ?
            parseFloat(orderDetails.estimated_amount) : (orderDetails.estimated_amount || 0);

          const remainingBalance = totalAmt - advanceAmount;
          console.log(`Server calculation: Total: ${totalAmt}, Advance: ${advanceAmount}, Remaining: ${remainingBalance}`);

          // Update the balance amount field with the server's calculation
          setBalanceAmount(remainingBalance);

          // Force update the balance amount input field
          setTimeout(() => {
            const balanceInput = document.getElementById('balanceAmount') as HTMLInputElement;
            if (balanceInput) {
              balanceInput.value = remainingBalance.toString();
              console.log('Directly updated balance input field to:', remainingBalance);
            }
          }, 100);
        }

        // Add any notes about the order
        let orderNotes = '';
        if (orderDetails.description) {
          orderNotes += `Description: ${orderDetails.description}\n`;
        }
        if (orderDetails.special_requirements) {
          orderNotes += `Special Requirements: ${orderDetails.special_requirements}\n`;
        }
        if (orderNotes) {
          setNotes(orderNotes);
        }
      }
    } catch (err) {
      console.error('Error fetching order details:', err);
    }
  };

  // Add a special effect to handle the initial setup for inventory items with existing payments
  useEffect(() => {
    const paymentIdParam = new URLSearchParams(window.location.search).get('payment_id');
    const balanceParam = new URLSearchParams(window.location.search).get('balance');
    const advanceParam = new URLSearchParams(window.location.search).get('advance');
    const totalAmountParam = new URLSearchParams(window.location.search).get('total_amount');

    if (paymentIdParam && balanceParam && paymentType === PaymentType.INVENTORY_ITEM) {
      // This is for an inventory item with an existing payment
      const remainingBalance = parseFloat(balanceParam);
      const totalAmount = totalAmountParam ? parseFloat(totalAmountParam) : 0;
      const previousAdvance = advanceParam ? parseFloat(advanceParam) : 0;

      console.log(`Initial setup for inventory item with payment ID ${paymentIdParam}:`);
      console.log(`Total amount: ${totalAmount}, Previous advance: ${previousAdvance}, Remaining balance: ${remainingBalance}`);

      // Set the advance amount to 0 (empty field for user to enter)
      setAdvanceAmount(0);

      // Set the balance to the remaining balance
      setBalanceAmount(remainingBalance);

      console.log(`Setting advance amount to 0`);
      console.log(`Setting balance amount to remaining balance: ${remainingBalance}`);

      // Force update the form fields after a short delay to ensure they're set correctly
      setTimeout(() => {
        const advanceInput = document.getElementById('advanceAmount') as HTMLInputElement;
        const balanceInput = document.getElementById('balanceAmount') as HTMLInputElement;

        if (advanceInput && balanceInput) {
          console.log('Directly updating form fields');
          advanceInput.value = '0';
          balanceInput.value = remainingBalance.toString();
        }
      }, 500);
    }
  }, []); // Empty dependency array means this runs once on mount

  // Calculate balance amount when total or advance amount changes
  useEffect(() => {
    // Check if this is an additional payment for an inventory item
    const paymentIdParam = new URLSearchParams(window.location.search).get('payment_id');
    const balanceParam = new URLSearchParams(window.location.search).get('balance');

    if (paymentType === PaymentType.INVENTORY_ITEM && paymentIdParam && balanceParam) {
      // This is an additional payment for an inventory item
      // For inventory items with existing payments, we don't auto-update the balance
      // This matches the custom order behavior
      const remainingBalance = parseFloat(balanceParam);
      console.log(`For inventory item with existing payment, keeping balance at: ${remainingBalance}`);

      // Only set the balance once when the component mounts
      if (advanceAmount === 0) {
        setBalanceAmount(remainingBalance);
      }
    }
    // If this is a custom order with existing advance payment, account for it
    else if (selectedOrder && selectedOrder.advance_amount && selectedOrder.advance_amount > 0) {
      // Get the existing advance amount from the server data
      const existingAdvance = typeof selectedOrder.advance_amount === 'string' ?
        parseFloat(selectedOrder.advance_amount) : selectedOrder.advance_amount;

      // Get the total amount
      const totalAmt = typeof selectedOrder.estimated_amount === 'string' ?
        parseFloat(selectedOrder.estimated_amount) : (selectedOrder.estimated_amount || 0);

      // For custom orders, we don't auto-update the balance when the advance amount changes
      // Only set it once when the component mounts
      if (advanceAmount === 0) {
        const remainingBalance = totalAmt - existingAdvance;
        setBalanceAmount(remainingBalance);
        console.log(`Setting initial balance for custom order: ${totalAmt} - ${existingAdvance} = ${remainingBalance}`);
      }
    } else {
      // Normal calculation for new payments
      setBalanceAmount(totalAmount - advanceAmount);
      console.log(`Standard balance calculation: ${totalAmount} - ${advanceAmount} = ${totalAmount - advanceAmount}`);
    }
  }, [totalAmount, advanceAmount, selectedOrder, paymentType]);

  // Handle payment type change
  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    // Reset selections
    setSelectedItemId(null);
    setSelectedOrderId(null);
    setCustomerName('');
    setTotalAmount(0);
    setAdvanceAmount(0);
    setQuantity(1);
  };

  // Handle category change
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setSelectedItemId(null);
  };

  // Handle item selection
  const handleItemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const itemId = parseInt(e.target.value);
    setSelectedItemId(itemId);
  };

  // Handle order selection
  const handleOrderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orderId = parseInt(e.target.value);
    setSelectedOrderId(orderId);
  };

  // Handle quantity change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const qty = parseInt(e.target.value);
    if (qty > 0) {
      setQuantity(qty);

      // Update total amount if item is selected
      if (selectedItem) {
        setTotalAmount(selectedItem.selling_price * qty);
      }
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!customerName.trim()) {
      setError('Please enter customer name');
      return;
    }

    if (totalAmount <= 0) {
      setError('Total amount must be greater than zero');
      return;
    }

    if (advanceAmount <= 0) {
      setError('Advance amount must be greater than zero');
      return;
    }

    if (advanceAmount > totalAmount) {
      setError('Advance amount cannot be greater than total amount');
      return;
    }

    if (paymentType === PaymentType.INVENTORY_ITEM && !selectedItemId) {
      setError('Please select an item');
      return;
    }

    if (paymentType === PaymentType.CUSTOM_ORDER && !selectedOrderId) {
      setError('Please select a custom order');
      return;
    }

    // Get user info from localStorage
    const userId = localStorage.getItem('userId');
    const branchId = localStorage.getItem('branchId');

    // Prepare data for submission
    const paymentData: any = {
      customer_name: customerName,
      total_amount: totalAmount,
      advance_amount: advanceAmount,
      payment_method: paymentMethod,
      notes,
      created_by: userId ? parseInt(userId) : null,
      branch_id: branchId ? parseInt(branchId) : null,
      is_custom_order: paymentType === PaymentType.CUSTOM_ORDER,
      order_id: paymentType === PaymentType.CUSTOM_ORDER ? parseInt(selectedOrderId as unknown as string) : null,
      item_id: paymentType === PaymentType.INVENTORY_ITEM ? selectedItemId : null,
      item_quantity: paymentType === PaymentType.INVENTORY_ITEM ? quantity : null
    };

    // Check if this is an additional payment for an inventory item
    const paymentIdParam = new URLSearchParams(window.location.search).get('payment_id');
    const advanceParam = new URLSearchParams(window.location.search).get('advance');
    const balanceParam = new URLSearchParams(window.location.search).get('balance');

    if (paymentType === PaymentType.INVENTORY_ITEM && paymentIdParam && advanceParam && balanceParam) {
      // This is an additional payment for an inventory item
      const previousAdvance = parseFloat(advanceParam);
      const remainingBalance = parseFloat(balanceParam);

      // Include the existing payment ID and advance amount
      paymentData.previous_payment_id = parseInt(paymentIdParam);
      paymentData.existing_advance_amount = previousAdvance;
      console.log(`Including existing advance amount for inventory item: ${previousAdvance}`);

      // Calculate the new balance amount: remaining balance - new advance
      const calculatedBalance = remainingBalance - advanceAmount;
      paymentData.balance_amount = calculatedBalance;
      console.log(`Calculated balance for inventory item: ${remainingBalance} - ${advanceAmount} = ${calculatedBalance}`);
    }
    // If this is a custom order with existing advance payment, include it
    else if (paymentType === PaymentType.CUSTOM_ORDER && selectedOrder?.advance_amount) {
      const existingAdvance = typeof selectedOrder.advance_amount === 'string' ?
        parseFloat(selectedOrder.advance_amount) : selectedOrder.advance_amount;

      // Include the existing advance amount from the server
      paymentData.existing_advance_amount = existingAdvance;
      console.log(`Including existing advance amount from server: ${existingAdvance}`);

      // Get the total amount from the server data
      const totalAmt = typeof selectedOrder.estimated_amount === 'string' ?
        parseFloat(selectedOrder.estimated_amount) : (selectedOrder.estimated_amount || 0);

      // Calculate the balance amount: total - (existing + new)
      const calculatedBalance = totalAmt - (existingAdvance + advanceAmount);
      paymentData.balance_amount = calculatedBalance;
      console.log(`Calculated balance for submission: ${totalAmt} - (${existingAdvance} + ${advanceAmount}) = ${calculatedBalance}`);
    } else {
      // Standard calculation for new payments
      paymentData.balance_amount = totalAmount - advanceAmount;
      console.log(`Standard balance calculation for submission: ${totalAmount} - ${advanceAmount} = ${paymentData.balance_amount}`);
    }

    // Log the data being sent
    console.log('Sending payment data:', paymentData);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3002/advance-payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create advance payment');
      }

      const result = await response.json();

      // Show success message
      setSuccess('Advance payment created successfully!');
      setPaymentReference(result.payment_reference);
      setShowSuccessModal(true);

      // Reset form after successful submission
      if (paymentType === PaymentType.INVENTORY_ITEM) {
        setSelectedItemId(null);
        setQuantity(1);
      } else {
        setSelectedOrderId(null);
      }

      setCustomerName('');
      setTotalAmount(0);
      setAdvanceAmount(0);
      setNotes('');

    } catch (err) {
      console.error('Error creating advance payment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the advance payment');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Advance Payment</h1>
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
            onClick={() => router.push('/DashView/advance-payment/view')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <FileText className="mr-2 h-5 w-5" />
            View All Payments
          </button>
        </div>
      </div>



      {/* Error message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Success message */}
      {success && !showSuccessModal && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{success}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setSuccess(null)}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Payment type selection */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Payment Type</h2>
        <div className="flex space-x-4">
          <button
            type="button"
            className={`flex items-center px-4 py-2 rounded-md ${
              paymentType === PaymentType.INVENTORY_ITEM
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePaymentTypeChange(PaymentType.INVENTORY_ITEM)}
          >
            <ShoppingBag className="mr-2" size={18} />
            Inventory Item
          </button>
          <button
            type="button"
            className={`flex items-center px-4 py-2 rounded-md ${
              paymentType === PaymentType.CUSTOM_ORDER
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => handlePaymentTypeChange(PaymentType.CUSTOM_ORDER)}
          >
            <Package className="mr-2" size={18} />
            Custom Order
          </button>
        </div>
      </div>

      <form id="payment-form" onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        {/* Item or Order Selection */}
        {paymentType === PaymentType.INVENTORY_ITEM ? (
          <div className="mb-6 space-y-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div className="relative">
                <select
                  id="category"
                  className="block w-full p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <div className="relative">
                <select
                  id="item"
                  className="block w-full p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                  value={selectedItemId || ''}
                  onChange={handleItemChange}
                >
                  <option value="">Select an item</option>
                  {filteredItems.map(item => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.product_title} - {formatCurrency(item.selling_price)} ({item.in_stock} in stock)
                    </option>
                  ))}
                </select>
              </div>

              {/* Show notification for additional payment */}
              {selectedItem && new URLSearchParams(window.location.search).get('payment_id') && (
                <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded-md text-sm">
                  <strong>Order Status: Partially Paid</strong>
                  <br />
                  <span>Current advance payment: {formatCurrency(parseFloat(new URLSearchParams(window.location.search).get('total_amount') || '0') - parseFloat(new URLSearchParams(window.location.search).get('balance') || '0'))}</span>
                  <br />
                  <span>Remaining balance: {formatCurrency(parseFloat(new URLSearchParams(window.location.search).get('balance') || '0'))}</span>
                  <br />
                  <span className="text-green-700">Any amount entered below will be an additional payment.</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                id="quantity"
                min="1"
                className="block w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={quantity}
                onChange={handleQuantityChange}
                disabled={!selectedItem}
                max={selectedItem?.in_stock || 1}
              />
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-1">
              Custom Order <span className="text-xs text-gray-500">(Only showing orders that need payment)</span>
            </label>
            <div className="relative">
              <select
                id="order"
                className="block w-full p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                value={selectedOrderId || ''}
                onChange={handleOrderChange}
              >
                <option value="">Select a custom order</option>
                {customOrders.length > 0 ? (
                  customOrders.map(order => (
                    <option key={order.order_id} value={order.order_id}>
                      {order.order_reference} - {order.customer_name} - {formatCurrency(order.estimated_amount || order.total_amount)}
                      {order.advance_amount && order.advance_amount > 0 ? ` (Advance: ${formatCurrency(order.advance_amount)})` : ''}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>No orders requiring payment found</option>
               )}
              </select>
            </div>

            {selectedOrder && (
              <div className="mt-2 p-2 bg-blue-50 text-blue-800 rounded-md text-sm">
                <strong>Order Status:</strong> {selectedOrder.payment_status || 'Not Paid'}
                <br />
                <strong>Current advance payment:</strong> {formatCurrency(selectedOrder.actual_advance_amount || selectedOrder.advance_amount || 0)}
                <br />
                <strong>Remaining balance:</strong> {formatCurrency(selectedOrder.actual_balance_amount || (selectedOrder.estimated_amount - (selectedOrder.advance_amount || 0)) || 0)}
                <br />
                <span className="text-green-700">Any amount entered below will be an additional payment.</span>
              </div>
            )}
          </div>
        )}

        {/* Customer Information */}
        <div className="mb-6">
          <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="customerName"
              className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Enter customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              readOnly={paymentType === PaymentType.CUSTOM_ORDER && !!selectedOrder}
            />
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LKRIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="totalAmount"
                className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="0.00"
                value={totalAmount || ''}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                readOnly={
                  (paymentType === PaymentType.INVENTORY_ITEM && !!selectedItem) ||
                  (paymentType === PaymentType.CUSTOM_ORDER && !!selectedOrder)
                }
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Advance Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LKRIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="advanceAmount"
                className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="0.00"
                value={advanceAmount || ''}
                onChange={(e) => {
                  const newAdvance = parseFloat(e.target.value) || 0;
                  setAdvanceAmount(newAdvance);

                  // Check if this is an additional payment
                  const paymentIdParam = new URLSearchParams(window.location.search).get('payment_id');
                  const balanceParam = new URLSearchParams(window.location.search).get('balance');

                  if (paymentIdParam && balanceParam) {
                    // For additional payments, balance remains the same - we don't auto-update it
                    // This matches the custom order behavior
                    const remainingBalance = parseFloat(balanceParam);
                    console.log(`Keeping balance at: ${remainingBalance} (not auto-updating)`);
                  } else {
                    // Standard calculation for new payments
                    setBalanceAmount(totalAmount - newAdvance);
                  }
                }}
                min="0"
                max={totalAmount}
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label htmlFor="balanceAmount" className="block text-sm font-medium text-gray-700 mb-1">
              Balance Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LKRIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                id="balanceAmount"
                className="block w-full pl-10 p-2 border border-gray-300 rounded-md bg-gray-50 focus:ring-yellow-500 focus:border-yellow-500"
                value={selectedOrder?.actual_balance_amount || balanceAmount || ''}
                readOnly
                // Add key to force re-render when balance changes
                key={`balance-${selectedOrder?.actual_balance_amount || balanceAmount}-${Date.now()}`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="paymentMethod"
                className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <textarea
              id="notes"
              className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Add any additional notes here"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Payment Successful!</h2>
            <p className="text-center mb-2">Your advance payment has been processed successfully.</p>
            {paymentReference && (
              <p className="text-center font-semibold mb-6">Reference: {paymentReference}</p>
            )}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  // Refresh the page to update inventory data
                  window.location.reload();
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // Implement print functionality here
                  window.print();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancePaymentPage;