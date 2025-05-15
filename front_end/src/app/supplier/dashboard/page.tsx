"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, LogOut, RefreshCw } from 'lucide-react';

// Regular order interface
interface RegularOrder {
  order_id: number;
  category: string;
  quantity?: number;
  status?: string;
  created_at?: string;
  design_image_url?: string;
  supplier_notes?: string;
  order_type: 'regular';
}

// Custom order interface
interface CustomOrder {
  order_id: number;
  category: string;
  order_status?: string;
  order_date?: string;
  supplier_notes?: string;
  order_type: 'custom';
  customer_name?: string;
  estimated_amount?: number;
  advance_amount?: number;
  balance_amount?: number;
  payment_status?: string;
  description?: string;
  special_requirements?: string;
  order_reference?: string;
}

// Combined type for order operations
type Order = RegularOrder | CustomOrder;

interface Supplier {
  supplier_id: string;
  name: string;
  address: string;
  contact_no: string;
  manufacturing_items: string;
  category: string;
}

export default function SupplierDashboard() {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [regularOrders, setRegularOrders] = useState<RegularOrder[]>([]);
  const [customOrders, setCustomOrders] = useState<CustomOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState('');
  const [notes, setNotes] = useState('');
  const router = useRouter();

  // Check if user is logged in
  useEffect(() => {
    const supplierData = localStorage.getItem('supplierData');
    const supplierToken = localStorage.getItem('supplierToken');

    if (!supplierData || !supplierToken) {
      console.log('No supplier data or token found, redirecting to login');
      router.push('/supplier/login');
      return;
    }

    try {
      const parsedSupplier = JSON.parse(supplierData);
      console.log('Supplier data loaded successfully:', parsedSupplier.name);
      setSupplier(parsedSupplier);
      fetchOrders(parsedSupplier.supplier_id);
    } catch (err) {
      console.error('Error parsing supplier data:', err);
      localStorage.removeItem('supplierData');
      localStorage.removeItem('supplierToken');
      router.push('/supplier/login');
    }
  }, [router]);

  const fetchOrders = async (supplierId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3002/suppliers/my-orders/${supplierId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Separate orders by type
      const regular = data.filter(order => order.order_type === 'regular') as RegularOrder[];
      const custom = data.filter(order => order.order_type === 'custom') as CustomOrder[];

      setRegularOrders(regular);
      setCustomOrders(custom);

      console.log(`Fetched ${regular.length} regular orders and ${custom.length} custom orders`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching orders');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('supplierData');
    localStorage.removeItem('supplierToken');
    router.push('/supplier/login');
  };

  const handleRefresh = () => {
    if (supplier) {
      fetchOrders(supplier.supplier_id);
    }
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);

    // Use order_status for custom orders, status for regular orders
    if (order.order_type === 'custom') {
      const customOrder = order as CustomOrder;
      setStatusUpdate(customOrder.order_status || 'Pending');
    } else {
      const regularOrder = order as RegularOrder;
      setStatusUpdate(regularOrder.status || 'Pending');
    }

    setNotes(order.supplier_notes || '');
    setShowOrderModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;

    try {
      // Different endpoints for regular vs custom orders
      const endpoint = selectedOrder.order_type === 'custom'
        ? `http://localhost:3002/custom-orders/update-status/${selectedOrder.order_id}`
        : `http://localhost:3002/suppliers/update-order-status/${selectedOrder.order_id}`;

      // Different payload structure for each type
      const payload = selectedOrder.order_type === 'custom'
        ? {
            order_status: statusUpdate,
            supplier_notes: notes,
          }
        : {
            status: statusUpdate,
            supplier_notes: notes,
          };

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${selectedOrder.order_type} order status`);
      }

      // Update the order in the local state
      setOrders(orders.map(order => {
        if (order.order_id === selectedOrder.order_id) {
          if (order.order_type === 'custom') {
            return { ...order, order_status: statusUpdate, supplier_notes: notes };
          } else {
            return { ...order, status: statusUpdate, supplier_notes: notes };
          }
        }
        return order;
      }));

      setShowOrderModal(false);

      // Show success message
      alert('Order status updated successfully');
    } catch (err: any) {
      alert(err.message || 'An error occurred while updating the order');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading && !supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
            {supplier && (
              <p className="text-sm text-gray-500">Welcome, {supplier.name}</p>
            )}
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Supplier Info Card */}
        {supplier && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Supplier Information</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{supplier.name}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{supplier.contact_no}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{supplier.address}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Category</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{supplier.category}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Manufacturing Items</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{supplier.manufacturing_items}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="px-4 py-5 sm:p-6 flex justify-center">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Regular Orders Section */}
        {!loading && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Your Regular Orders</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {regularOrders.length} Orders
              </span>
            </div>

            {regularOrders.length === 0 ? (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                No regular orders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {regularOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getStatusBadgeColor(order.status || 'Pending')
                          }`}>
                            {(order.status || 'Pending').charAt(0).toUpperCase() +
                             (order.status || 'Pending').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at || '')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Custom Orders Section */}
        {!loading && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Your Custom Orders</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                {customOrders.length} Orders
              </span>
            </div>

            {customOrders.length === 0 ? (
              <div className="px-4 py-5 sm:p-6 text-center text-gray-500">
                No custom orders found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{order.order_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.order_reference || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.customer_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getStatusBadgeColor(order.order_status || 'Pending')
                          }`}>
                            {(order.order_status || 'Pending').charAt(0).toUpperCase() +
                             (order.order_status || 'Pending').slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.order_date || '')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="text-yellow-600 hover:text-yellow-900"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 overflow-y-auto z-50">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Order #{selectedOrder.order_id}
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Category</p>
                        <p className="font-medium">{selectedOrder.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Order Type</p>
                        <p className="font-medium">{selectedOrder.order_type === 'custom' ? 'Custom Order' : 'Regular Order'}</p>
                      </div>

                      {selectedOrder.order_type === 'custom' ? (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Customer</p>
                            <p className="font-medium">{selectedOrder.customer_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Estimated Amount</p>
                            <p className="font-medium">Rs. {selectedOrder.estimated_amount?.toLocaleString() || '0'}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Quantity</p>
                            <p className="font-medium">{selectedOrder.quantity || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-medium">{formatDate(selectedOrder.created_at || '')}</p>
                          </div>
                        </>
                      )}

                      <div>
                        <p className="text-sm text-gray-500">Date</p>
                        <p className="font-medium">
                          {formatDate(selectedOrder.order_type === 'custom' ? selectedOrder.order_date || '' : selectedOrder.created_at || '')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Current Status</p>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          getStatusBadgeColor(selectedOrder.order_type === 'custom' ? selectedOrder.order_status || 'Pending' : selectedOrder.status || 'Pending')
                        }`}>
                          {(selectedOrder.order_type === 'custom'
                            ? (selectedOrder.order_status || 'Pending')
                            : (selectedOrder.status || 'Pending')).charAt(0).toUpperCase() +
                           (selectedOrder.order_type === 'custom'
                            ? (selectedOrder.order_status || 'Pending')
                            : (selectedOrder.status || 'Pending')).slice(1)}
                        </span>
                      </div>

                      {selectedOrder.order_type === 'custom' && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Payment Status</p>
                            <p className="font-medium">{selectedOrder.payment_status || 'Not Paid'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Description</p>
                            <p className="font-medium">{selectedOrder.description || 'N/A'}</p>
                          </div>
                        </>
                      )}
                    </div>

                    {selectedOrder.design_image_url && (
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">Design Image</p>
                        <div className="relative h-48 w-full">
                          <Image
                            src={selectedOrder.design_image_url}
                            alt={`Design for order #${selectedOrder.order_id}`}
                            fill
                            style={{ objectFit: 'contain' }}
                            className="rounded-md"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Update Status
                      </label>
                      <select
                        id="status"
                        name="status"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
                        value={statusUpdate}
                        onChange={(e) => setStatusUpdate(e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                        placeholder="Add any notes about this order..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleUpdateStatus}
                >
                  Update Order
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
