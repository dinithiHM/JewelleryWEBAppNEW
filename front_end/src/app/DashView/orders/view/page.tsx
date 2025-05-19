"use client";

import React, { useState, useEffect } from 'react';
import { Eye, Edit, Trash2, Search, Filter } from 'lucide-react';
import OrderImageThumbnail from '../../../../components/OrderImageThumbnail';
import OrderDetailsModal from '../../../../components/OrderDetailsModal';

interface PaymentRecord {
  payment_id: number;
  order_id: number;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_by?: number;
}

interface OrderItem {
  order_item_id: number;
  order_id: number;
  category: string;
  quantity: number;
  offer_gold: number;
  selected_karats: string;
  karat_values: string;
  design_image?: string;
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
  updated_at?: string;
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
  use_custom_estimate?: boolean;

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

const ViewOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierNames, setSupplierNames] = useState<{[key: string]: string}>({});
  const [supplierPhones, setSupplierPhones] = useState<{[key: string]: string}>({});
  const [orderCreators, setOrderCreators] = useState<{[key: number]: string}>({});
  const [userRole, setUserRole] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<number | null>(null);

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [branches, setBranches] = useState<{branch_id: number, branch_name: string}[]>([]);

  // Order details modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Get user role and branch ID from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('role');
      const branchId = localStorage.getItem('branchId');

      if (role) {
        // Normalize role to match what the backend expects
        let normalizedRole = role;
        const roleLower = normalizedRole.toLowerCase();

        if (roleLower.includes('store') && roleLower.includes('manager')) {
          normalizedRole = 'storemanager';
        } else if (roleLower.includes('sales') && roleLower.includes('associate')) {
          normalizedRole = 'salesassociate';
        } else if (roleLower.includes('admin')) {
          normalizedRole = 'admin';
        } else if (roleLower.includes('cashier')) {
          normalizedRole = 'cashier';
        }

        // Make sure we have a valid branch ID for non-admin users
        let parsedBranchId = branchId ? Number(branchId) : null;

        // If the role is not admin and we don't have a branch ID, use a default
        if (normalizedRole !== 'admin' && !parsedBranchId) {
          parsedBranchId = 1; // Default to branch ID 1 (Mahiyangana)
        }

        setUserRole(normalizedRole);
        setUserBranchId(parsedBranchId);
      } else {
        // Set default values if no role
        setUserRole('unknown');
        setUserBranchId(0);
      }
    }
  }, []);

  // Fetch orders from the backend
  useEffect(() => {
    // Only skip if we're still waiting for user data to load
    if (!userRole && userBranchId === null) {
      return;
    }

    // If we have a role but it's not admin and no branch ID, use a default
    if (userRole && !userRole.includes('admin') && userBranchId === null) {
      setUserBranchId(1); // Use branch ID 1 (Mahiyangana) as default
      return; // Will trigger another useEffect run with the updated branchId
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);

        // Construct URL with query parameters for branch filtering
        let url = 'http://localhost:3002/orders';
        const params = new URLSearchParams();

        // Always send the role parameter
        params.append('role', userRole || '');

        // For non-admin users, branch filtering is mandatory
        if (!userRole.includes('admin')) {
          // If branchId is not available, use a fallback to prevent seeing all orders
          const branchIdParam = userBranchId?.toString() || '1';
          params.append('branch_id', branchIdParam);
        }

        // Add the parameters to the URL
        url += `?${params.toString()}`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        const data = await response.json();

        // Process image URLs and extract gold karat/purity information
        const processedData = data.map((order: Order) => {
          // Process image URL
          if (order.design_image) {
            // Construct the full URL for the image
            // Make sure we don't duplicate the /uploads/ part
            const imagePath = order.design_image.startsWith('uploads/')
              ? order.design_image
              : `uploads/${order.design_image}`;

            order.design_image_url = `http://localhost:3002/${imagePath}`;
          }

          // Process gold karat information
          if (order.selected_karats && typeof order.selected_karats === 'string') {
            try {
              const selectedKarats = JSON.parse(order.selected_karats);
              if (selectedKarats && selectedKarats.length > 0) {
                // Use the first karat as the selectedKarat if not already set
                if (!order.selectedKarat) {
                  // Convert from "24KT" format to "24K" format if needed
                  const karat = selectedKarats[0];
                  order.selectedKarat = karat.endsWith('KT') ? karat.replace('KT', 'K') : karat;

                  // Set goldPurity based on karat if not already set
                  if (!order.goldPurity) {
                    // Extract the number part from the karat (e.g., "24" from "24KT")
                    const karatNumber = parseInt(karat.replace(/[^\d]/g, ''), 10);
                    if (!isNaN(karatNumber)) {
                      // Calculate purity (24K = 0.999, 22K = 0.916, etc.)
                      order.goldPurity = karatNumber / 24;
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error parsing selected_karats:', e);
            }
          }

          return order;
        });

        // Ensure all supplier_ids are strings
        const processedDataWithStringIds = processedData.map((order: Order) => ({
          ...order,
          supplier_id: order.supplier_id?.toString() || ''
        }));

        setOrders(processedDataWithStringIds);

        // Fetch supplier names for all unique supplier IDs
        const uniqueSupplierIds = [...new Set(processedDataWithStringIds.map((order: Order) => order.supplier_id))] as string[];
        console.log('Unique supplier IDs:', uniqueSupplierIds);
        fetchSupplierNames(uniqueSupplierIds);

        // Fetch order creators
        fetchOrderCreators();

      } catch (err) {
        console.error('Error fetching orders:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');

        // Use dummy data for development
        setOrders([
          {
            order_id: 1,
            category: 'Wedding Sets',
            supplier_id: '001',
            quantity: 10,
            offer_gold: 1,
            selected_karats: JSON.stringify(['24KT', '22KT']),
            karat_values: JSON.stringify({ '24KT': 50, '22KT': 45 }),
            design_image: 'images/sample_wedding_set.jpg',
            design_image_url: 'http://localhost:3002/uploads/images/sample_wedding_set.jpg',
            status: 'pending',
            created_at: new Date().toISOString(),
            // Gold and pricing details
            gold_price_per_gram: 31771.17,
            selectedKarat: '24KT',
            goldPurity: 0.999,
            weight_in_grams: 15.5,
            making_charges: 25000,
            additional_materials_charges: 1200,
            base_estimated_price: 492453.14, // gold_price_per_gram * weight_in_grams
            estimated_price: 525953.14, // base_estimated_price + making_charges + additional_materials_charges
            total_amount: 5259531.40, // estimated_price * quantity
            // Payment details
            advance_payment_amount: 1500000,
            total_payment_amount: 5259531.40,
            payment_status: 'Partial',
            payment_method: 'Bank Transfer',
            payment_notes: 'Remaining payment due on delivery'
          },
          {
            order_id: 2,
            category: 'Rings',
            supplier_id: '002',
            quantity: 20,
            offer_gold: 1,
            selected_karats: JSON.stringify(['22KT']),
            karat_values: JSON.stringify({ '22KT': 40 }),
            design_image: 'images/sample_ring.jpg',
            design_image_url: 'http://localhost:3002/uploads/images/sample_ring.jpg',
            status: 'completed',
            created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            // Gold and pricing details
            gold_price_per_gram: 29125.24,
            selectedKarat: '22KT',
            goldPurity: 0.916,
            weight_in_grams: 8.2,
            making_charges: 12000,
            additional_materials_charges: 1200,
            base_estimated_price: 238826.97, // gold_price_per_gram * weight_in_grams
            estimated_price: 254326.97, // base_estimated_price + making_charges + additional_materials_charges
            total_amount: 5086539.40, // estimated_price * quantity
            // Payment details
            advance_payment_amount: 5086539.40,
            total_payment_amount: 5086539.40,
            payment_status: 'Paid',
            payment_method: 'Cash'
          },
          {
            order_id: 3,
            category: 'Necklaces',
            supplier_id: '003',
            quantity: 5,
            offer_gold: 0,
            selected_karats: JSON.stringify([]),
            karat_values: JSON.stringify({}),
            design_image: 'images/sample_necklace.jpg',
            design_image_url: 'http://localhost:3002/uploads/images/sample_necklace.jpg',
            status: 'cancelled',
            created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
            // Gold and pricing details
            gold_price_per_gram: 30125.50,
            selectedKarat: '21KT',
            goldPurity: 0.875,
            weight_in_grams: 25.8,
            making_charges: 35000,
            additional_materials_charges: 1200,
            base_estimated_price: 777237.90, // gold_price_per_gram * weight_in_grams
            estimated_price: 824737.90, // base_estimated_price + making_charges + additional_materials_charges
            total_amount: 4123689.50, // estimated_price * quantity
            useCustomPrice: true,
            // Payment details
            advance_payment_amount: 1030922.38,
            total_payment_amount: 4123689.50,
            payment_status: 'Partial',
            payment_method: 'Credit Card'
          }
        ]);

        // Set dummy supplier names
        setSupplierNames({
          '001': 'Mohamad Nazeem',
          '002': 'Abdulla Nazeem',
          '003': 'Vaseem Akram',
          '004': 'Mohamad Sami'
        });

        // Set dummy supplier phone numbers
        setSupplierPhones({
          '001': '+94 77 123 4567',
          '002': '+94 76 234 5678',
          '003': '+94 75 345 6789',
          '004': '+94 74 456 7890'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userRole, userBranchId]);

  // Fetch branches for filtering
  useEffect(() => {
    // Only fetch branches for admin users
    if (userRole === 'admin') {
      const fetchBranches = async () => {
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
      };

      fetchBranches();
    }
  }, [userRole]);

  // Fetch supplier information
  const fetchSupplierNames = async (supplierIds: string[]) => {
    try {
      console.log('Fetching supplier information for IDs:', supplierIds);
      const response = await fetch('http://localhost:3002/suppliers');
      if (response.ok) {
        const suppliers = await response.json();
        console.log('Received suppliers data:', suppliers);

        const namesMap: {[key: string]: string} = {};
        const phonesMap: {[key: string]: string} = {};

        // First, initialize with the IDs we have to ensure all IDs have a value
        supplierIds.forEach(id => {
          namesMap[id] = `Supplier ${id}`;
          phonesMap[id] = 'Not available';
        });

        // Then update with actual data where available
        suppliers.forEach((supplier: any) => {
          // Convert supplier_id to string for consistent comparison
          const supplierId = supplier.supplier_id?.toString();

          // Check if this supplier's ID is in our list of IDs
          if (supplierId && supplierIds.includes(supplierId)) {
            namesMap[supplierId] = supplier.name || `Supplier ${supplierId}`;
            phonesMap[supplierId] = supplier.contact_no || supplier.phone || 'Not available';
          }
        });

        console.log('Mapped supplier names:', namesMap);
        setSupplierNames(namesMap);
        setSupplierPhones(phonesMap);
      }
    } catch (err) {
      console.error('Error fetching supplier information:', err);
    }
  };

  // Fetch order creators
  const fetchOrderCreators = async () => {
    try {
      // Set default values for testing
      const creatorsMap: {[key: number]: string} = {};

      // For each order, set a default creator name based on branch
      orders.forEach((order: Order) => {
        const orderId = order.order_id;

        if (order.branch_id === 1) {
          creatorsMap[orderId] = 'Mahiyangana Manager';
        } else if (order.branch_id === 2) {
          creatorsMap[orderId] = 'Mahaoya Manager';
        } else {
          creatorsMap[orderId] = 'System Admin';
        }
      });

      // Try to fetch real data if available
      try {
        const response = await fetch('http://localhost:3002/users');
        if (response.ok) {
          const users = await response.json();

          // Update with real data where possible
          orders.forEach((order: Order) => {
            // Skip if no created_by field
            if (!order.created_by) return;

            const orderId = order.order_id;
            const creator = users.find((user: any) => user.user_id === order.created_by);

            if (creator && creator.first_name && creator.last_name) {
              creatorsMap[orderId] = `${creator.first_name} ${creator.last_name}`;
            }
          });
        }
      } catch (innerErr) {
        console.log('Could not fetch real user data, using defaults');
      }

      console.log('Order creators map:', creatorsMap);
      setOrderCreators(creatorsMap);
    } catch (err) {
      console.error('Error in fetchOrderCreators:', err);
    }
  };

  // Handle order deletion
  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/orders/delete/${orderId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Remove the deleted order from the state
      setOrders(orders.filter(order => order.order_id !== orderId));
      alert('Order deleted successfully');
    } catch (err) {
      console.error('Error deleting order:', err);
      alert('Failed to delete order');
    }
  };

  // Apply filters function
  const applyFilters = () => {
    // Reset any existing filters
    setShowAdvancedFilters(false);
  };

  // Reset filters function
  const resetFilters = () => {
    setBranchFilter('all');
    setStartDate('');
    setEndDate('');
  };

  // Filter and search orders
  const filteredOrders = orders.filter(order => {
    // Apply status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // Apply branch filter (for admin only)
    if (userRole === 'admin' && branchFilter !== 'all') {
      const orderBranchId = order.branch_id?.toString() || '';
      if (orderBranchId !== branchFilter) {
        return false;
      }
    }

    // Apply date range filter
    if (startDate && endDate) {
      const orderDate = new Date(order.created_at);
      const filterStartDate = new Date(startDate);
      const filterEndDate = new Date(endDate);

      // Set end date to end of day
      filterEndDate.setHours(23, 59, 59, 999);

      if (orderDate < filterStartDate || orderDate > filterEndDate) {
        return false;
      }
    } else if (startDate) {
      const orderDate = new Date(order.created_at);
      const filterStartDate = new Date(startDate);
      if (orderDate < filterStartDate) {
        return false;
      }
    } else if (endDate) {
      const orderDate = new Date(order.created_at);
      const filterEndDate = new Date(endDate);
      // Set end date to end of day
      filterEndDate.setHours(23, 59, 59, 999);
      if (orderDate > filterEndDate) {
        return false;
      }
    }

    // Apply search term
    const searchLower = searchTerm.toLowerCase();
    return (
      order.order_id.toString().includes(searchLower) ||
      order.category.toLowerCase().includes(searchLower) ||
      (supplierNames[order.supplier_id] || '').toLowerCase().includes(searchLower) ||
      order.supplier_id.toLowerCase().includes(searchLower)
    );
  });

  // Handle view order details
  const handleViewOrderDetails = async (order: Order) => {
    try {
      // Fetch the complete order details including all items
      const response = await fetch(`http://localhost:3002/orders/${order.order_id}?role=${userRole}&branch_id=${userBranchId || ''}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch order details: ${response.status}`);
      }

      const orderDetails = await response.json();
      console.log('Fetched order details:', orderDetails);

      // Check if we have items in the response
      if (orderDetails.items && Array.isArray(orderDetails.items)) {
        console.log(`Found ${orderDetails.items.length} items for order #${order.order_id}`);
      } else {
        console.log(`No items found for order #${order.order_id}`);
        // Initialize empty items array if none exists
        orderDetails.items = [];
      }

      // Set the selected order with the complete details
      setSelectedOrder({
        ...order,
        ...orderDetails
      });
      setShowOrderDetails(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      // Fall back to using the existing order data but ensure it has an items array
      setSelectedOrder({
        ...order,
        items: order.items || []
      });
      setShowOrderDetails(true);
    }
  };

  // Close order details modal
  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status badge color
  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Paid':
      case 'Fully Paid':
        return 'bg-green-100 text-green-800';
      case 'Partial':
      case 'Partially Paid':
        return 'bg-blue-100 text-blue-800';
      case 'Pending':
      case 'Not Paid':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>Error loading orders: {error}</p>
        <p>Using sample data instead.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">View Orders</h2>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-md"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              className="p-2 border border-gray-300 rounded-md"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              title="Advanced Filters"
            >
              <Filter size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Advanced Filters - Only visible for admin users */}
        {showAdvancedFilters && userRole === 'admin' && (
          <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Advanced Filters</h3>
              <button
                onClick={resetFilters}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Branch Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="all">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_id.toString()}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.order_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      #{order.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrderImageThumbnail
                        imageUrl={order.design_image_url || order.design_image}
                        orderId={order.order_id}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {supplierNames[order.supplier_id] || `Supplier ${order.supplier_id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.branch_name ||
                       (order.branch_id === 1 ? 'Mahiyangana Branch' :
                        order.branch_id === 2 ? 'Mahaoya Branch' :
                        'Not assigned')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusBadgeColor(order.payment_status || 'Pending')}`}>
                        {order.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                          onClick={() => handleViewOrderDetails(order)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Edit Order"
                          onClick={() => alert(`Edit order #${order.order_id}`)}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          title="Delete Order"
                          onClick={() => handleDeleteOrder(order.order_id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination (simplified) */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50">
              Previous
            </button>
            <button className="px-3 py-1 bg-yellow-400 text-black rounded-md">
              1
            </button>
            <button className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {showOrderDetails && selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          supplierName={supplierNames[selectedOrder.supplier_id] || `Supplier ${selectedOrder.supplier_id}`}
          supplierPhone={supplierPhones[selectedOrder.supplier_id] || 'Not available'}
          createdByName={orderCreators[selectedOrder.order_id] || 'Not available'}
          onClose={handleCloseOrderDetails}
        />
      )}
    </div>
  );
};

export default ViewOrdersPage;