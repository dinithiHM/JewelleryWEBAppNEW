'use client';

import { X } from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Use dynamic import to avoid SSR issues with Image component
const DynamicImage = dynamic(() => Promise.resolve(Image), { ssr: false });

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

interface OrderDetailsModalProps {
  order: Order;
  supplierName: string;
  supplierPhone?: string;
  createdByName?: string;
  onClose: () => void;
}

const OrderDetailsModal = ({ order, supplierName, supplierPhone = 'Not available', createdByName = 'Not available', onClose }: OrderDetailsModalProps) => {
  const router = useRouter();
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0); // For item tabs

  // Parse JSON strings if needed
  const selectedKarats = order.selected_karats ?
    (typeof order.selected_karats === 'string' ?
      JSON.parse(order.selected_karats) :
      order.selected_karats) :
    [];

  const karatValues = order.karat_values ?
    (typeof order.karat_values === 'string' ?
      JSON.parse(order.karat_values) :
      order.karat_values) :
    {};

  // Fetch payment history when modal opens
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (!order.order_id) return;

      setLoadingPayments(true);
      setPaymentError(null);

      try {
        const response = await fetch(`http://localhost:3002/supplier-payments/order/${order.order_id}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch payment history: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
          setPaymentHistory(data.data);
        } else {
          // If the API returns a different structure, try to adapt
          setPaymentHistory(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Error fetching payment history:', err);
        setPaymentError(err instanceof Error ? err.message : 'An unknown error occurred');
        // Set empty array to avoid undefined errors
        setPaymentHistory([]);
      } finally {
        setLoadingPayments(false);
      }
    };

    fetchPaymentHistory();
  }, [order.order_id]);

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Handle proceed to payment
  const handleProceedToPayment = () => {
    // Parse selected karats if needed
    const selectedKaratsArray = selectedKarats.length > 0 ? selectedKarats : [];

    // Create query parameters with order details
    const queryParams = new URLSearchParams({
      order_id: order.order_id.toString(),
      category: order.category,
      supplier_id: order.supplier_id,
      quantity: order.quantity.toString(),
      offer_gold: order.offer_gold ? '1' : '0',
      selected_karats: JSON.stringify(selectedKaratsArray),
      karat_values: JSON.stringify(karatValues),

      // Gold and pricing details
      gold_price_per_gram: order.gold_price_per_gram ? order.gold_price_per_gram.toString() : '0',
      selected_karat: order.selectedKarat || '24K',
      gold_purity: order.goldPurity ? order.goldPurity.toString() : '0.999',
      weight_in_grams: order.weight_in_grams ? order.weight_in_grams.toString() : '0',
      making_charges: order.making_charges ? order.making_charges.toString() : '0',
      additional_materials_charges: order.additional_materials_charges ? order.additional_materials_charges.toString() : '0',
      base_estimated_price: order.base_estimated_price ? order.base_estimated_price.toString() : '0',
      estimated_price: order.estimated_price ? order.estimated_price.toString() : '0',
      total_amount: order.total_amount ? order.total_amount.toString() : '0',

      // Payment information
      advance_payment: order.advance_payment_amount ? order.advance_payment_amount.toString() : '0',
      remaining_balance: order.total_amount && order.advance_payment_amount
        ? (Number(order.total_amount) - Number(order.advance_payment_amount)).toString()
        : '0',
      payment_status: order.payment_status || 'Partial',

      // Design image URL if available
      design_image_url: order.design_image_url || ''
    }).toString();

    // Navigate to the dedicated payment page with query parameters
    router.push(`/DashView/orders/pay?${queryParams}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Order Details #{order.order_id}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Basic Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left column */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Order Information</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Order ID</p>
                  <p className="font-medium">#{order.order_id}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="font-medium">{order.category}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="font-medium">{order.quantity}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Created At</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="font-medium">{order.updated_at ? formatDate(order.updated_at) : 'Not updated'}</p>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Supplier Details</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Supplier</p>
                  <p className="font-medium">{supplierName}</p>
                  <p className="text-xs text-gray-500 mt-1">ID: {order.supplier_id}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Supplier Phone</p>
                  <p className="font-medium">{supplierPhone}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Branch</p>
                  <p className="font-medium">
                    {order.branch_name ||
                     (order.branch_id === 1 ? 'Mahiyangana Branch' :
                      order.branch_id === 2 ? 'Mahaoya Branch' :
                      'Not assigned')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Gold Provided</p>
                  <p className="font-medium">{order.offer_gold ? 'Yes' : 'No'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="font-medium">{createdByName}</p>
                </div>

                {order.store_manager_name && (
                  <div>
                    <p className="text-sm text-gray-500">Store Manager</p>
                    <p className="font-medium">{order.store_manager_name}</p>
                  </div>
                )}
              </div>
            </div>
          </div>



          {/* Payment Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Supplier Payment Details</h3>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Advance Payment Amount</p>
                  <p className="font-medium">
                    {order.advance_payment_amount ? `Rs. ${Number(order.advance_payment_amount).toLocaleString()}` : 'N/A'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  <p className="font-medium">{order.payment_method || 'Cash'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${order.payment_status === 'Paid' ? 'bg-green-100 text-green-800' :
                      order.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'}`}
                  >
                    {order.payment_status || 'Pending'}
                  </span>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Remaining Balance</p>
                  <p className="font-medium text-red-600">
                    {order.total_amount && order.advance_payment_amount ?
                      `Rs. ${(Number(order.total_amount) - Number(order.advance_payment_amount)).toLocaleString()}` :
                      'N/A'}
                  </p>
                </div>

                {order.payment_notes && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Payment Notes</p>
                    <p className="font-medium">{order.payment_notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment History Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Payment History</h3>

            {loadingPayments ? (
              <div className="flex justify-center items-center py-4">
                <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : paymentError ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                <p>Error loading payment history: {paymentError}</p>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                No payment records found for this order.
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentHistory.map((payment) => (
                        <tr key={payment.payment_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{payment.payment_id}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            Rs. {Number(payment.amount_paid).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {payment.payment_method || 'Cash'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {payment.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          Total
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900">
                          Rs. {paymentHistory.reduce((sum, payment) => sum + Number(payment.amount_paid), 0).toLocaleString()}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Order Items Tabs */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>

            {order.items && order.items.length > 0 ? (
              <div>
                {/* Tabs Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="flex -mb-px overflow-x-auto">
                    {order.items.map((item: any, index: number) => (
                      <button
                        key={item.order_item_id || index}
                        className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm ${
                          index === activeTab
                            ? 'border-yellow-500 text-yellow-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab(index)}
                      >
                        Item #{index + 1} - {item.category}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Tab Content */}
                {order.items.map((item: any, index: number) => (
                  <div
                    key={item.order_item_id || index}
                    className={`mt-4 ${index === activeTab ? 'block' : 'hidden'}`}
                  >
                    <div className="bg-gray-50 rounded-lg p-4">
                      {/* Item Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-500">Category</p>
                          <p className="font-medium">{item.category}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Quantity</p>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                            ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'completed' ? 'bg-green-100 text-green-800' :
                              item.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'}`}
                          >
                            {item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Gold Specifications */}
                      <div className="mb-4">
                        <h4 className="text-md font-medium mb-2">Gold Specifications</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Gold Karat</p>
                            <p className="font-medium">
                              {item.selectedKarat || (item.selected_karats && typeof item.selected_karats === 'string' &&
                                JSON.parse(item.selected_karats).length > 0 ?
                                JSON.parse(item.selected_karats)[0].replace('KT', 'K') : 'N/A')}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Gold Purity</p>
                            <p className="font-medium">
                              {item.goldPurity ?
                                `${(item.goldPurity * 100).toFixed(2)}%` :
                                (item.selectedKarat ?
                                  `${(parseInt(item.selectedKarat.replace(/[^\d]/g, ''), 10) / 24 * 100).toFixed(2)}%` :
                                  'N/A')}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Gold Price (per gram)</p>
                            <p className="font-medium">
                              {item.gold_price_per_gram ? `Rs. ${Number(item.gold_price_per_gram).toLocaleString()}` : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Weight (g)</p>
                            <p className="font-medium">
                              {item.weight_in_grams ? `${Number(item.weight_in_grams).toLocaleString()} g` : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Selected Karats (if gold is provided) */}
                      {item.offer_gold === 1 && item.selected_karats && (
                        <div className="mb-4">
                          <h4 className="text-md font-medium mb-2">Selected Karats</h4>
                          <div className="flex flex-wrap gap-2">
                            {(typeof item.selected_karats === 'string' ?
                              JSON.parse(item.selected_karats) :
                              item.selected_karats).map((karat: string, idx: number) => (
                              <span key={idx} className="px-2 py-1 bg-white border border-gray-200 rounded text-sm">
                                {karat} ({item.karat_values && typeof item.karat_values === 'string' ?
                                  (JSON.parse(item.karat_values)[karat] || 0) : 0}g)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Price Breakdown */}
                      <div>
                        <h4 className="text-md font-medium mb-2">Price Breakdown</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Base Gold Price</p>
                            <p className="font-medium">
                              {item.base_estimated_price ? `Rs. ${Number(item.base_estimated_price).toLocaleString()}` : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">Gold price × weight</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Making Charges</p>
                            <p className="font-medium">
                              {item.making_charges ? `Rs. ${Number(item.making_charges).toLocaleString()}` : 'N/A'}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">Additional Materials Charges</p>
                            <p className="font-medium">
                              {item.additional_materials_charges ? `Rs. ${Number(item.additional_materials_charges).toLocaleString()}` : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">For copper, other metals</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">
                              {item.use_custom_estimate ? 'Custom Estimate Price' : 'Total Estimate Price'}
                            </p>
                            <p className="font-medium">
                              {item.estimated_price ? `Rs. ${Number(item.estimated_price).toLocaleString()}` : 'N/A'}
                            </p>
                            {item.use_custom_estimate && (
                              <p className="text-xs text-green-600">(Custom price set by staff)</p>
                            )}
                          </div>

                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500">Total Item Amount</p>
                            <p className="font-medium text-yellow-700">
                              {item.total_amount ? `Rs. ${Number(item.total_amount).toLocaleString()}` : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.quantity} {item.quantity === 1 ? 'unit' : 'units'} ×
                              {item.estimated_price ? ` Rs. ${Number(item.estimated_price).toLocaleString()}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Item Design Image */}
                      {item.design_image_url && (
                        <div className="mt-4">
                          <h4 className="text-md font-medium mb-2">Design Image</h4>
                          <div className="flex justify-center">
                            <div className="relative w-64 h-64 border border-gray-200 rounded-lg overflow-hidden">
                              <DynamicImage
                                src={item.design_image_url}
                                alt={`Design for item #${index + 1}`}
                                fill
                                style={{ objectFit: 'contain' }}
                                className="p-2"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                No items found for this order.
              </div>
            )}
          </div>

          {/* Order Total Amount */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Order Total</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Total Order Amount</p>
                  <p className="font-medium text-yellow-700 text-xl">
                    {order.total_amount ? `Rs. ${Number(order.total_amount).toLocaleString()}` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Total for all {order.items?.length || 0} items in this order
                  </p>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t">
          <button
            onClick={handleProceedToPayment}
            className="px-4 py-2 bg-yellow-400 text-black rounded-md hover:bg-yellow-500 font-medium"
          >
            Proceed to Payment
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
