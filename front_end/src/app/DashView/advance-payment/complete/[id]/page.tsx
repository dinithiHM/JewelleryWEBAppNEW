"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  CreditCard,
  FileText,
  CheckCircle,
  X,
  ArrowLeft
} from 'lucide-react';
import LKRIcon from '@/components/icons/LKRIcon';
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
  payment_status: string;
  payment_method: string;
  is_custom_order: boolean;
  order_reference: string | null;
  item_name: string | null;
  item_category: string | null;
  item_quantity: number | null;
  // Additional fields for payment history
  total_paid?: number;
  actual_balance?: number;
  order_id?: number;
}

const CompleteAdvancePaymentPage = () => {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id;

  // State for data
  const [payment, setPayment] = useState<AdvancePayment | null>(null);

  // State for form fields
  const [additionalAmount, setAdditionalAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  // State for UI
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch payment details on component mount
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3002/advance-payments/${paymentId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch payment details: ${response.status}`);
        }

        const data = await response.json();
        setPayment(data);

        // Set default additional amount to the balance
        setAdditionalAmount(data.balance_amount);

        // If this is a custom order, fetch the payment history to get the correct total paid amount
        if (data.is_custom_order && data.order_id) {
          try {
            const historyResponse = await fetch(`http://localhost:3002/advance-payments/history/order/${data.order_id}`);
            if (historyResponse.ok) {
              const historyData = await historyResponse.json();

              // Update the payment data with the correct total paid amount from history
              if (historyData && historyData.total_paid && payment) {
                setPayment({
                  ...payment,
                  total_paid: historyData.total_paid,
                  actual_balance: historyData.remaining_balance
                });
              }
            }
          } catch (historyErr) {
            console.error('Error fetching payment history:', historyErr);
            // Continue with the original payment data
          }
        }
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching payment details');
      } finally {
        setLoading(false);
      }
    };

    if (paymentId) {
      fetchPaymentDetails();
    }
  }, [paymentId]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (additionalAmount <= 0) {
      setError('Additional amount must be greater than zero');
      return;
    }

    if (payment && additionalAmount > payment.balance_amount) {
      setError('Additional amount cannot be greater than the balance amount');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:3002/advance-payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          additional_payment: additionalAmount,
          notes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update payment');
      }

      const result = await response.json();

      // Show success message
      setSuccess('Payment updated successfully!');
      setShowSuccessModal(true);

      // Update payment data with new values
      if (payment) {
        setPayment({
          ...payment,
          advance_amount: result.new_advance_amount,
          balance_amount: result.new_balance_amount,
          payment_status: result.payment_status
        });
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating the payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">Payment not found</span>
        </div>
        <button
          onClick={() => router.push('/DashView/advance-payment/view')}
          className="mt-4 flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft size={16} className="mr-1" />
          Back to Advance Payments
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push('/DashView/advance-payment/view')}
          className="mr-4 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Complete Advance Payment</h1>
      </div>

      {/* Order Status Information */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Payment Information</h2>
        <div className="grid grid-cols-1 gap-2">
          <p className="text-blue-700">
            <strong>Order Status:</strong> {payment.payment_status}
          </p>
          <p className="text-green-700">
            <strong>Current advance payment:</strong> {formatCurrency(payment.total_paid || payment.advance_amount)}
          </p>
          <p className="text-red-700">
            <strong>Remaining balance:</strong> {formatCurrency(payment.actual_balance || payment.balance_amount)}
          </p>
          <p className="text-gray-700 italic mt-2">
            Any amount entered below will be an additional payment.
          </p>
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

      {/* Payment Details */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4">Payment Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-500">Reference</p>
            <p className="font-medium">{payment.payment_reference}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Date</p>
            <p className="font-medium">{formatDate(payment.payment_date)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <p className="font-medium">{payment.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Type</p>
            <p className="font-medium">
              {payment.is_custom_order ? 'Custom Order' : 'Inventory Item'}
            </p>
          </div>
          {payment.is_custom_order && payment.order_reference && (
            <div>
              <p className="text-sm text-gray-500">Order Reference</p>
              <p className="font-medium">{payment.order_reference}</p>
            </div>
          )}
          {!payment.is_custom_order && payment.item_name && (
            <div>
              <p className="text-sm text-gray-500">Item</p>
              <p className="font-medium">{payment.item_name}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-md">
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-lg font-semibold">{formatCurrency(payment.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Paid Amount</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(payment.total_paid || payment.advance_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-lg font-semibold text-red-600">{formatCurrency(payment.actual_balance || payment.balance_amount)}</p>
          </div>
        </div>
      </div>

      {/* Additional Payment Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Make Additional Payment</h2>

        <div className="mb-4">
          <label htmlFor="additionalAmount" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LKRIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              id="additionalAmount"
              className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              value={additionalAmount || ''}
              onChange={(e) => setAdditionalAmount(parseFloat(e.target.value) || 0)}
              min="0.01"
              max={payment.balance_amount}
              step="0.01"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Maximum amount: {formatCurrency(payment.balance_amount)}
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
            Payment Method
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <CreditCard className="h-5 w-5 text-gray-400" />
            </div>
            <select
              id="paymentMethod"
              className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
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
              className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional notes here"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={submitting || payment.balance_amount <= 0}
          >
            {submitting ? 'Processing...' : 'Complete Payment'}
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
            <p className="text-center mb-2">Your payment has been processed successfully.</p>
            <p className="text-center mb-6">
              {payment.balance_amount === 0 ? (
                <span className="font-semibold text-green-600">Payment completed in full!</span>
              ) : (
                <>
                  <span>Remaining balance: </span>
                  <span className="font-semibold">{formatCurrency(payment.balance_amount)}</span>
                </>
              )}
            </p>
            <div className="flex flex-col space-y-3">
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    // Refresh the page first to update inventory data, then navigate
                    window.location.href = '/DashView/advance-payment/view';
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  View All Payments
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

              {payment.is_custom_order && (
                <div className="flex justify-center">
                  <button
                    onClick={() => router.push('/DashView/custom-orders')}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    View Custom Orders
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompleteAdvancePaymentPage;
