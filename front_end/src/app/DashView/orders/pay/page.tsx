"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const OrderPaymentPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get query parameters
  const orderIdFromQuery = searchParams.get('order_id');
  const categoryFromQuery = searchParams.get('category');
  const supplierIdFromQuery = searchParams.get('supplier_id');
  const quantityFromQuery = searchParams.get('quantity');
  const offerGoldFromQuery = searchParams.get('offer_gold');
  const selectedKaratsFromQuery = searchParams.get('selected_karats');
  const karatValuesFromQuery = searchParams.get('karat_values');

  // Gold and pricing details
  const goldPricePerGramFromQuery = searchParams.get('gold_price_per_gram');
  const selectedKaratFromQuery = searchParams.get('selected_karat');
  const goldPurityFromQuery = searchParams.get('gold_purity');
  const weightInGramsFromQuery = searchParams.get('weight_in_grams');
  const makingChargesFromQuery = searchParams.get('making_charges');
  const additionalMaterialsChargesFromQuery = searchParams.get('additional_materials_charges');
  const baseEstimatedPriceFromQuery = searchParams.get('base_estimated_price');
  const estimatedPriceFromQuery = searchParams.get('estimated_price');
  const totalAmountFromQuery = searchParams.get('total_amount');

  // Payment information
  const advancePaymentFromQuery = searchParams.get('advance_payment');
  const remainingBalanceFromQuery = searchParams.get('remaining_balance');
  const paymentStatusFromQuery = searchParams.get('payment_status');
  const designImageUrlFromQuery = searchParams.get('design_image_url');

  // State for form fields
  const [orderId] = useState(orderIdFromQuery || '');
  const [category] = useState(categoryFromQuery || '');
  const [supplier] = useState(supplierIdFromQuery || '');
  const [quantity] = useState(quantityFromQuery ? parseInt(quantityFromQuery, 10) : 20);
  const [goldPricePerGram] = useState(goldPricePerGramFromQuery ? parseFloat(goldPricePerGramFromQuery) : 0);
  const [selectedKarat] = useState(selectedKaratFromQuery || '24K');
  const [goldPurity] = useState(goldPurityFromQuery ? parseFloat(goldPurityFromQuery) : 0.999);
  const [weightInGrams] = useState(weightInGramsFromQuery ? parseFloat(weightInGramsFromQuery) : 0);
  const [makingCharges, setMakingCharges] = useState(makingChargesFromQuery ? parseFloat(makingChargesFromQuery) : 0);
  const [additionalMaterialsCharges] = useState(additionalMaterialsChargesFromQuery ? parseFloat(additionalMaterialsChargesFromQuery) : 0);
  const [baseEstimatedPrice] = useState(baseEstimatedPriceFromQuery ? parseFloat(baseEstimatedPriceFromQuery) : 0);
  const [estimatedPrice, setEstimatedPrice] = useState(estimatedPriceFromQuery ? parseFloat(estimatedPriceFromQuery) : 0);
  const [totalAmount, setTotalAmount] = useState(totalAmountFromQuery ? parseFloat(totalAmountFromQuery) : 0);

  // For advance payments
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState(0); // The new payment being made now
  const [existingAdvancePayment, setExistingAdvancePayment] = useState(
    advancePaymentFromQuery ? parseFloat(advancePaymentFromQuery) : 0
  ); // Previously paid amount
  const [totalAdvancePayment, setTotalAdvancePayment] = useState(
    advancePaymentFromQuery ? parseFloat(advancePaymentFromQuery) : 0
  ); // Total of existing + current
  const [minAdvancePayment, setMinAdvancePayment] = useState(0); // 25% of total
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [imagePreview] = useState<string>(designImageUrlFromQuery || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [supplierName, setSupplierName] = useState('');

  // Fetch supplier name
  useEffect(() => {
    if (supplier) {
      const fetchSupplierName = async () => {
        try {
          const response = await fetch(`http://localhost:3002/suppliers/${supplier}`);
          if (response.ok) {
            const data = await response.json();
            setSupplierName(data.name || `Supplier ${supplier}`);
          }
        } catch (error) {
          console.error('Error fetching supplier name:', error);
          setSupplierName(`Supplier ${supplier}`);
        }
      };

      fetchSupplierName();
    }
  }, [supplier]);

  // State for custom estimate price
  const [customEstimatePrice, setCustomEstimatePrice] = useState(estimatedPriceFromQuery ? parseFloat(estimatedPriceFromQuery) : 0);
  const [useCustomEstimate, setUseCustomEstimate] = useState(true); // Default to using custom estimate

  // State for order items
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // Track active tab index

  // Fetch order items and existing payments for this order
  useEffect(() => {
    if (orderId) {
      const fetchOrderData = async () => {
        try {
          setIsLoadingItems(true);

          // Fetch order items
          console.log('Fetching order items for order:', orderId);
          const itemsResponse = await fetch(`http://localhost:3002/orders/${orderId}`);
          if (itemsResponse.ok) {
            const orderData = await itemsResponse.json();
            console.log('Order data:', orderData);
            console.log('Order items:', orderData.items);

            if (orderData.items && orderData.items.length > 0) {
              console.log(`Found ${orderData.items.length} items for order ${orderId}`);

              // Log each item's details
              orderData.items.forEach((item: any, index: number) => {
                console.log(`Item ${index + 1}:`, {
                  category: item.category,
                  quantity: item.quantity,
                  estimated_price: item.estimated_price,
                  weight_in_grams: item.weight_in_grams,
                  gold_price_per_gram: item.gold_price_per_gram,
                  selectedKarat: item.selectedKarat
                });
              });

              setOrderItems(orderData.items);

              // Calculate correct total amount based on individual items
              let calculatedTotal = 0;
              orderData.items.forEach((item: any) => {
                const itemPrice = parseFloat(item.estimated_price || 0);
                const itemQuantity = parseInt(item.quantity || 1);
                const itemSubtotal = itemPrice * itemQuantity;
                calculatedTotal += itemSubtotal;
                console.log(`Item subtotal: ${itemPrice} × ${itemQuantity} = ${itemSubtotal}`);
              });

              console.log('Calculated total from items:', calculatedTotal);
              if (calculatedTotal > 0) {
                setTotalAmount(calculatedTotal);
              }
            } else {
              console.log('No items found for order', orderId);
            }
          }

          // First try to use the advance payment from the query parameter
          if (advancePaymentFromQuery) {
            const advanceAmount = parseFloat(advancePaymentFromQuery);
            console.log('Using advance payment from query:', advanceAmount);
            setExistingAdvancePayment(advanceAmount);
          } else {
            // If not available in query, fetch from API
            console.log('Fetching payments for order:', orderId);
            const response = await fetch(`http://localhost:3002/supplier-payments/order/${orderId}`);
            if (response.ok) {
              const result = await response.json();
              console.log('Payment data:', result);

              if (result.success && result.summary) {
                // Use the summary data which includes the total paid amount
                const totalPaid = parseFloat(result.summary.total_paid || 0);
                console.log('Total paid from summary:', totalPaid);
                setExistingAdvancePayment(totalPaid);
              } else if (result.success && result.data) {
                // Calculate total from individual payments
                let totalPaid = 0;
                if (result.data && result.data.length > 0) {
                  totalPaid = result.data.reduce((sum: number, payment: any) => sum + parseFloat(payment.amount_paid), 0);
                }
                console.log('Calculated total paid:', totalPaid);
                setExistingAdvancePayment(totalPaid);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching order data:', error);
        } finally {
          setIsLoadingItems(false);
        }
      };

      fetchOrderData();
    }
  }, [orderId, advancePaymentFromQuery]);

  // Calculate minimum advance payment and total advance payment
  useEffect(() => {
    // We don't recalculate the total amount here anymore
    // It's calculated from the order items when they're fetched

    // Calculate remaining balance
    const remainingBalance = Math.max(0, totalAmount - existingAdvancePayment);

    // Calculate minimum advance payment (25% of remaining balance)
    // If this is the first payment (existingAdvancePayment === 0), then use 25% of total
    // Otherwise, use 25% of remaining balance
    const minPayment = existingAdvancePayment === 0
      ? totalAmount * 0.25  // First payment: 25% of total
      : remainingBalance * 0.25; // Subsequent payments: 25% of remaining

    setMinAdvancePayment(minPayment);

    // Calculate total advance payment (existing + current)
    const newTotalAdvancePayment = existingAdvancePayment + currentPaymentAmount;
    setTotalAdvancePayment(newTotalAdvancePayment);

    // We no longer auto-adjust the payment amount to the minimum
    // This allows users to enter any amount, even below the minimum
    // The validation will happen at form submission time

    console.log('Payment calculations updated:');
    console.log(`- Total amount: ${totalAmount}`);
    console.log(`- Existing advance: ${existingAdvancePayment}`);
    console.log(`- Remaining balance: ${remainingBalance}`);
    console.log(`- Minimum payment (25%): ${minPayment}`);
    console.log(`- Current payment: ${currentPaymentAmount}`);
    console.log(`- Total advance after payment: ${newTotalAdvancePayment}`);
  }, [totalAmount, currentPaymentAmount, existingAdvancePayment]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Calculate total advance payment (existing + current)
      const totalAdvance = existingAdvancePayment + currentPaymentAmount;

      // Calculate remaining balance for display purposes
      const remainingBalanceAfterPayment = totalAmount - totalAdvance;

      // Calculate the exact remaining balance
      const exactRemainingBalance = totalAmount - existingAdvancePayment;

      // Check if this payment is close to the remaining balance (within 1% or 100 rupees, whichever is smaller)
      const tolerance = Math.min(exactRemainingBalance * 0.01, 100);
      const isCloseToRemainingBalance = Math.abs(currentPaymentAmount - exactRemainingBalance) < tolerance;

      // If this payment is close to the remaining balance, adjust it to exactly match
      if (isCloseToRemainingBalance) {
        console.log(`Adjusting payment to exact remaining balance: ${currentPaymentAmount} -> ${exactRemainingBalance}`);
        // Use the exact remaining balance to avoid floating point issues
        setCurrentPaymentAmount(exactRemainingBalance);
      }

      // Validate current payment but allow to proceed with a confirmation
      if (currentPaymentAmount < minAdvancePayment) {
        // For first payment, minimum is 25% of total
        // For subsequent payments, minimum is 25% of remaining balance
        const paymentType = existingAdvancePayment === 0 ? 'initial advance payment' : 'payment';
        const baseAmount = existingAdvancePayment === 0 ? 'total amount' : 'remaining balance';

        const confirmProceed = window.confirm(
          `Warning: This ${paymentType} is below the recommended minimum of ${minAdvancePayment.toFixed(2).toLocaleString()} Rs. (25% of ${baseAmount}).\n\n` +
          `After this payment, the remaining balance will be Rs. ${remainingBalanceAfterPayment.toFixed(2).toLocaleString()}.\n\n` +
          `Do you want to proceed anyway?`
        );

        if (!confirmProceed) {
          setIsSubmitting(false);
          return;
        }
      }

      // Recalculate total advance after possible adjustment
      const finalTotalAdvance = existingAdvancePayment + currentPaymentAmount;

      // Check if this is a final payment (paying off the exact remaining balance)
      // We already calculated exactRemainingBalance above
      // Consider it a final payment if it's within 1% of the remaining balance or within 100 rupees
      const finalPaymentTolerance = Math.min(exactRemainingBalance * 0.01, 100);
      const isFinalPayment = Math.abs(currentPaymentAmount - exactRemainingBalance) < finalPaymentTolerance;

      // Log detailed payment information for debugging
      console.log('DEBUG - Payment details:');
      console.log(`- Total order amount: ${totalAmount}`);
      console.log(`- Existing advance payment: ${existingAdvancePayment}`);
      console.log(`- Current payment amount: ${currentPaymentAmount}`);
      console.log(`- Exact remaining balance: ${exactRemainingBalance}`);
      console.log(`- Final total advance: ${finalTotalAdvance}`);
      console.log(`- Is final payment: ${isFinalPayment ? 'Yes' : 'No'}`);
      console.log(`- Difference: ${Math.abs(currentPaymentAmount - exactRemainingBalance)}`);

      // Prepare the data to be sent
      const paymentData = {
        order_id: orderId,
        making_charges: makingCharges,
        // Use custom estimate price if enabled, otherwise use calculated price
        estimated_price: useCustomEstimate ? customEstimatePrice : estimatedPrice,
        total_amount: totalAmount,
        amount_paid: currentPaymentAmount, // Only the current payment amount
        existing_payment: existingAdvancePayment, // Previously paid amount
        total_advance_payment: finalTotalAdvance, // Total of all payments
        total_payment_amount: totalAmount,
        payment_status: isFinalPayment ? 'Completed' : 'Partial',
        payment_method: paymentMethod,
        payment_notes: paymentNotes,
        use_custom_estimate: useCustomEstimate,
        is_final_payment: isFinalPayment
      };

      // Send the data to the backend
      const response = await fetch('http://localhost:3002/supplier-payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to process payment');
      }

      setSubmitSuccess(true);
      alert('Payment processed successfully!');

      // Redirect to orders view page
      router.push('/DashView/orders/view');

    } catch (error) {
      console.error('Error processing payment:', error);
      setSubmitError(error instanceof Error ? error.message : 'An unknown error occurred');
      alert(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-center mb-6">Process Payment for Order #{orderId}</h2>

        <form onSubmit={handleSubmit}>
          {/* Order Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Order Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{category}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">{supplierName}</p>
              </div>

              {orderItems && orderItems.length > 0 ? (
                <div className="md:col-span-2 mt-2">
                  <p className="text-sm text-gray-500 mb-2">Order Summary</p>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="py-2 px-3 text-left border-b">Item</th>
                          <th className="py-2 px-3 text-left border-b">Karat</th>
                          <th className="py-2 px-3 text-right border-b">Weight (g)</th>
                          <th className="py-2 px-3 text-right border-b">Quantity</th>
                          <th className="py-2 px-3 text-right border-b">Price/Unit</th>
                          <th className="py-2 px-3 text-right border-b">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderItems.map((item, index) => {
                          const itemPrice = parseFloat(item.estimated_price || 0);
                          const itemQuantity = parseInt(item.quantity || 1);
                          const itemSubtotal = itemPrice * itemQuantity;

                          return (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="py-2 px-3 border-b">{item.category || `Item ${index + 1}`}</td>
                              <td className="py-2 px-3 border-b">{item.selectedKarat || 'N/A'}</td>
                              <td className="py-2 px-3 text-right border-b">{parseFloat(item.weight_in_grams || 0).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right border-b">{itemQuantity}</td>
                              <td className="py-2 px-3 text-right border-b">Rs. {itemPrice.toFixed(2).toLocaleString()}</td>
                              <td className="py-2 px-3 text-right border-b font-medium">Rs. {itemSubtotal.toFixed(2).toLocaleString()}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-gray-100 font-semibold">
                          <td colSpan={5} className="py-2 px-3 text-right border-b">Total Order Amount:</td>
                          <td className="py-2 px-3 text-right border-b text-yellow-700">Rs. {totalAmount.toFixed(2).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{quantity}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Gold Karat</p>
                    <p className="font-medium">{selectedKarat}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Price Calculation */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Price Calculation</h3>

            {orderItems && orderItems.length > 0 ? (
              <div className="mb-4">
                <h4 className="text-md font-medium mb-2">Order Summary</h4>
                <div className="p-4 bg-white border border-gray-200 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Items</p>
                      <p className="font-medium">{orderItems.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Quantity</p>
                      <p className="font-medium">
                        {orderItems.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Gold Weight</p>
                      <p className="font-medium">
                        {orderItems.reduce((sum, item) => {
                          const weight = parseFloat(item.weight_in_grams || 0);
                          const quantity = parseInt(item.quantity || 1);
                          return sum + (weight * quantity);
                        }, 0).toFixed(2)} g
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Average Gold Price</p>
                      <p className="font-medium">
                        Rs. {orderItems.reduce((sum, item) => sum + parseFloat(item.gold_price_per_gram || 0), 0) / orderItems.length > 0 ?
                          (orderItems.reduce((sum, item) => sum + parseFloat(item.gold_price_per_gram || 0), 0) / orderItems.length).toFixed(2) :
                          '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Gold Price Per Gram (Locked) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Gold Price (Rs./g)</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                    value={goldPricePerGram.toFixed(2)}
                    disabled
                  />
                </div>

                {/* Weight in Grams (Locked) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Weight (g)</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                    value={weightInGrams.toFixed(3)}
                    disabled
                  />
                </div>

                {/* Making Charges (Editable) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Making Charges (Rs.)</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={makingCharges}
                    onChange={(e) => {
                      const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      if (!isNaN(newValue)) {
                        setMakingCharges(newValue);
                      }
                    }}
                    min="0"
                    step="any"
                  />
                </div>

                {/* Additional Materials Charges (Locked) */}
                <div>
                  <label className="block text-sm font-medium mb-1">Additional Materials Charges (Rs.)</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                    value={additionalMaterialsCharges.toFixed(2)}
                    disabled
                  />
                </div>
              </div>
            )}

            {/* Calculated Prices */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
              {/* Custom Estimate Price Toggle */}
              <div className="md:col-span-2 mb-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="useCustomEstimate"
                    checked={useCustomEstimate}
                    onChange={() => setUseCustomEstimate(!useCustomEstimate)}
                    className="mr-2"
                  />
                  <label htmlFor="useCustomEstimate" className="text-sm font-medium">
                    Use custom estimate price (recommended)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Using custom estimate ensures the shop doesn't lose money on the order.
                </p>
              </div>

              {/* Total Order Amount (always shown) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Total Order Amount</label>
                <div className="p-3 bg-white border border-gray-300 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-yellow-700 text-lg">Rs. {totalAmount.toFixed(2).toLocaleString()}</span>
                  </div>
                  {orderItems && orderItems.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Total for {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'} with a total quantity of {
                        orderItems.reduce((sum, item) => sum + parseInt(item.quantity || 1), 0)
                      } pieces
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

              {/* Item Details (Collapsible) */}
              {orderItems && orderItems.length > 0 && (
                <div className="md:col-span-2 mb-4">
                  <details className="bg-white border border-gray-200 rounded-md">
                    <summary className="p-3 font-medium cursor-pointer hover:bg-gray-50">
                      View Detailed Item Breakdown
                    </summary>
                    <div className="p-4 border-t border-gray-200">
                      {/* Tabs Navigation */}
                      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
                        {orderItems.map((item, index) => (
                          <button
                            key={index}
                            className={`px-4 py-2 text-sm font-medium ${
                              activeTab === index
                                ? 'border-b-2 border-blue-500 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab(index)}
                          >
                            {item.category || `Item ${index + 1}`}
                          </button>
                        ))}
                      </div>

                      {/* Tab Content */}
                      {orderItems.map((item, index) => {
                        const itemPrice = parseFloat(item.estimated_price || 0);
                        const itemQuantity = parseInt(item.quantity || 1);
                        const itemSubtotal = itemPrice * itemQuantity;
                        const baseEstimatedPrice = parseFloat(item.base_estimated_price || 0);
                        const makingCharges = parseFloat(item.making_charges || 0);
                        const additionalMaterialsCharges = parseFloat(item.additional_materials_charges || 0);
                        const offeredGoldValue = parseFloat(item.offered_gold_value || 0);

                        return (
                          <div
                            key={index}
                            className={`bg-white border border-gray-200 rounded-md p-4 ${activeTab === index ? 'block' : 'hidden'}`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <h3 className="font-medium text-gray-900">{item.category || `Item ${index + 1}`}</h3>
                                <p className="text-sm text-gray-500">Order Item #{index + 1}</p>
                              </div>

                              {item.design_image_url && (
                                <div className="flex justify-end">
                                  <div className="relative h-20 w-20 border border-gray-200 rounded-md overflow-hidden">
                                    <img
                                      src={item.design_image_url}
                                      alt={`Design for ${item.category || `Item ${index + 1}`}`}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                </div>
                              )}

                              <div className="md:col-span-2">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="block text-gray-500">Quantity</span>
                                    <span className="font-medium">{itemQuantity}</span>
                                  </div>
                                  <div>
                                    <span className="block text-gray-500">Gold Karat</span>
                                    <span className="font-medium">{item.selectedKarat || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-gray-500">Weight (g)</span>
                                    <span className="font-medium">{parseFloat(item.weight_in_grams || 0).toFixed(2)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-gray-500">Gold Price (Rs./g)</span>
                                    <span className="font-medium">{parseFloat(item.gold_price_per_gram || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="md:col-span-2 mt-2">
                                <h4 className="font-medium text-gray-900 mb-2">Price Breakdown</h4>
                                <div className="bg-gray-50 p-3 rounded-md">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <span className="text-gray-500">Base Gold Price:</span>
                                      <span className="float-right font-medium">Rs. {baseEstimatedPrice.toFixed(2).toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Making Charges:</span>
                                      <span className="float-right font-medium">Rs. {makingCharges.toFixed(2).toLocaleString()}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500">Additional Materials:</span>
                                      <span className="float-right font-medium">Rs. {additionalMaterialsCharges.toFixed(2).toLocaleString()}</span>
                                    </div>
                                    {offeredGoldValue > 0 && (
                                      <div>
                                        <span className="text-gray-500">Offered Gold Value:</span>
                                        <span className="float-right font-medium text-red-600">- Rs. {offeredGoldValue.toFixed(2).toLocaleString()}</span>
                                      </div>
                                    )}
                                    <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                                      <span className="text-gray-700 font-medium">Price Per Unit:</span>
                                      <span className="float-right font-medium">Rs. {itemPrice.toFixed(2).toLocaleString()}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-gray-700 font-medium">Quantity:</span>
                                      <span className="float-right font-medium">× {itemQuantity}</span>
                                    </div>
                                    <div className="col-span-2 border-t border-gray-200 pt-2 mt-1">
                                      <span className="text-gray-700 font-medium">Subtotal:</span>
                                      <span className="float-right font-medium text-yellow-700">Rs. {itemSubtotal.toFixed(2).toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </div>
              )}

          {/* Supplier Payment Section */}
          <div id="supplier-payment-section" className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Supplier Payment</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Existing Advance Payment */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Existing Advance Payment (Rs.)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md bg-gray-100"
                  value={existingAdvancePayment.toFixed(2)}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Previously paid amount
                </p>
              </div>

              {/* New Payment Amount */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  New Payment Amount (Rs.)
                  <span className="text-red-500 ml-1">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    (Recommended Min: {minAdvancePayment.toFixed(2).toLocaleString()} Rs.)
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="current-payment-input"
                    type="text"
                    className={`w-full p-2 border ${currentPaymentAmount < minAdvancePayment ? 'border-yellow-300' : 'border-gray-300'} rounded-md`}
                    value={currentPaymentAmount.toString()}
                    onChange={(e) => {
                      // Allow direct typing of any value
                      let inputValue = e.target.value.replace(/[^\d.]/g, ''); // Remove non-numeric characters except decimal

                      // Ensure only one decimal point
                      const decimalCount = (inputValue.match(/\./g) || []).length;
                      if (decimalCount > 1) {
                        const parts = inputValue.split('.');
                        inputValue = parts[0] + '.' + parts.slice(1).join('');
                      }

                      // Update React state
                      const newValue = inputValue === '' ? 0 : parseFloat(inputValue);
                      if (!isNaN(newValue)) {
                        setCurrentPaymentAmount(newValue);
                      }
                    }}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-500 text-white px-2 py-1 rounded"
                    onClick={() => setCurrentPaymentAmount(minAdvancePayment)}
                    title="Set to minimum required amount"
                  >
                    Set Min
                  </button>
                </div>
                {currentPaymentAmount < minAdvancePayment && (
                  <p className="text-yellow-600 text-xs mt-1">
                    <span className="font-semibold">Warning:</span> {existingAdvancePayment === 0
                      ? `Recommended initial payment is at least ${minAdvancePayment.toFixed(2).toLocaleString()} Rs. (25% of total)`
                      : `Recommended payment is at least ${minAdvancePayment.toFixed(2).toLocaleString()} Rs. (25% of remaining balance)`
                    }
                  </p>
                )}
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Payment Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Payment Notes</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  placeholder="Add any notes about the payment"
                />
              </div>
            </div>

            {/* Payment Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium mb-1">Total Order Amount</label>
                <div className="p-2 bg-white border border-gray-300 rounded-md">
                  Rs. {totalAmount.toFixed(2).toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Total Advance Payment</label>
                <div className="p-2 bg-white border border-gray-300 rounded-md">
                  <div className="flex justify-between">
                    <span>Rs. {(existingAdvancePayment + currentPaymentAmount).toFixed(2).toLocaleString()}</span>
                    <span className="text-xs text-gray-500">
                      ({((existingAdvancePayment + currentPaymentAmount) / totalAmount * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Previous: Rs. {existingAdvancePayment.toFixed(2).toLocaleString()} +
                    New: Rs. {currentPaymentAmount.toFixed(2).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remaining Balance</label>
                <div className="p-2 bg-white border border-gray-300 rounded-md font-semibold text-red-600">
                  <div className="flex justify-between">
                    <span>Rs. {(totalAmount - (existingAdvancePayment + currentPaymentAmount)).toFixed(2).toLocaleString()}</span>
                    <span className="text-xs text-gray-500">
                      ({(100 - ((existingAdvancePayment + currentPaymentAmount) / totalAmount * 100)).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    After this payment
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Design Image */}
          {imagePreview && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Design Image</h3>
              <div className="flex justify-center">
                <div className="relative w-64 h-64 border border-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="Design Preview"
                    width={256}
                    height={256}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit and Cancel Buttons */}
          <div className="flex justify-between">
            <button
              type="submit"
              className="bg-yellow-400 text-black px-8 py-2 rounded-full font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Process Payment'}
            </button>
            <button
              type="button"
              className="bg-gray-200 text-black px-8 py-2 rounded-full font-medium"
              onClick={() => window.history.back()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>

          {/* Success/Error Messages */}
          {submitSuccess && (
            <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
              Payment processed successfully!
            </div>
          )}
          {submitError && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
              Error: {submitError}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default OrderPaymentPage;
