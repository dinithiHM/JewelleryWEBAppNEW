"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Tag,
  Upload,
  CheckCircle,
  X
} from 'lucide-react';
import Image from 'next/image';
import { formatCurrency } from '@/utils/formatters';
import ImprovedCategoryChart from '@/components/ImprovedCategoryChart';
import LKRIcon from '@/components/LKRIcon';

// Define types
interface Category {
  category_id: number;
  category_name: string;
}

const CreateCustomOrderPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for form fields
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [balanceAmount, setBalanceAmount] = useState<number>(0);
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');

  // State for file uploads
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Define Supplier interface
  interface Supplier {
    supplier_id: number | string;
    name: string;
    supplier_name?: string; // Some suppliers might use this field instead of name
    category?: string;
    manufacturing_items?: string; // Items the supplier manufactures
    order_count?: number; // Number of orders for this supplier
  }

  // State for data
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [orderReference, setOrderReference] = useState<string | null>(null);

  // Fetch categories and suppliers on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('http://localhost:3002/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData);
        } else {
          console.error('Failed to fetch categories');
        }

        // Fetch suppliers
        const suppliersResponse = await fetch('http://localhost:3002/suppliers');
        if (suppliersResponse.ok) {
          const suppliersData = await suppliersResponse.json();
          setSuppliers(suppliersData);
        } else {
          console.error('Failed to fetch suppliers');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  // Calculate balance amount and minimum advance payment when estimated amount changes
  useEffect(() => {
    setBalanceAmount(estimatedAmount - advanceAmount);
  }, [estimatedAmount, advanceAmount]);

  // Calculate minimum advance payment (25% of estimated amount)
  const minAdvancePayment = estimatedAmount * 0.25;

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);

      // Limit to 5 files
      const newFiles = files.slice(0, 5 - selectedFiles.length);

      setSelectedFiles(prev => [...prev, ...newFiles]);

      // Create preview URLs
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls]);
    }
  };

  // Handle file removal
  const handleRemoveFile = (index: number) => {
    // Revoke object URL to avoid memory leaks
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!customerName.trim()) {
      setError('Please enter customer name');
      return;
    }

    if (estimatedAmount <= 0) {
      setError('Estimated amount must be greater than zero');
      return;
    }

    if (advanceAmount < 0) {
      setError('Advance amount cannot be negative');
      return;
    }

    if (advanceAmount > estimatedAmount) {
      setError('Advance amount cannot be greater than estimated amount');
      return;
    }

    // Check if advance payment meets the minimum 25% requirement
    if (advanceAmount < minAdvancePayment) {
      const confirmProceed = window.confirm(
        `Warning: The advance payment (Rs. ${advanceAmount.toLocaleString()}) is below the minimum required amount of Rs. ${minAdvancePayment.toLocaleString()} (25% of the estimated amount).\n\n` +
        `According to the payment policy, the first payment must be at least 25% of the total amount, and the remaining balance must be paid within the next 2 payments.\n\n` +
        `Do you want to proceed anyway?`
      );

      if (!confirmProceed) {
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // Get user info from localStorage
      const userId = localStorage.getItem('userId');
      const branchId = localStorage.getItem('branchId');

      // Create FormData object
      const formData = new FormData();
      formData.append('customer_name', customerName);
      formData.append('customer_phone', customerPhone);
      formData.append('customer_email', customerEmail);
      formData.append('estimated_amount', estimatedAmount.toString());
      formData.append('advance_amount', advanceAmount.toString());

      if (estimatedCompletionDate) {
        formData.append('estimated_completion_date', estimatedCompletionDate);
      }

      if (categoryId) {
        formData.append('category_id', categoryId.toString());
      }

      // Add selected supplier if available
      if (selectedSupplierId) {
        // Try to convert to a number if it's a string
        const numericId = parseInt(selectedSupplierId, 10);
        if (!isNaN(numericId)) {
          formData.append('supplier_id', numericId.toString());
          console.log(`Adding supplier ID ${numericId} (numeric) to the form submission`);
        } else {
          formData.append('supplier_id', selectedSupplierId);
          console.log(`Adding supplier ID ${selectedSupplierId} (string) to the form submission`);
        }
      }

      formData.append('description', description);
      formData.append('special_requirements', specialRequirements);

      if (userId) {
        formData.append('created_by', userId);
      }

      if (branchId) {
        formData.append('branch_id', branchId);
      }

      // File uploads are now handled separately to avoid form submission issues
      console.log('File uploads are now handled separately');

      // Log all form data for debugging
      console.log('Form data being sent to server:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
      }

      // Double-check if supplier_id is included
      if (selectedSupplierId && !formData.has('supplier_id')) {
        console.log(`Adding supplier_id ${selectedSupplierId} to form data (double-check)`);
        formData.append('supplier_id', selectedSupplierId);
      }

      // Convert FormData to a regular object for JSON submission
      const formDataObj: Record<string, any> = {};
      for (const [key, value] of formData.entries()) {
        // Convert numeric strings to numbers for the database
        if (key === 'supplier_id' || key === 'category_id' || key === 'created_by' || key === 'branch_id') {
          const numValue = parseInt(value.toString(), 10);
          if (!isNaN(numValue)) {
            formDataObj[key] = numValue; // Store as number, not string
            console.log(`Converting ${key} from string "${value}" to number ${numValue}`);
          } else {
            formDataObj[key] = value;
          }
        } else {
          formDataObj[key] = value;
        }
      }

      // ALWAYS include supplier_id if it's selected - ensure it's a number for the database
      if (selectedSupplierId) {
        const numericId = parseInt(selectedSupplierId, 10);
        if (!isNaN(numericId)) {
          console.log(`Adding supplier_id ${numericId} (numeric) to JSON data`);
          formDataObj.supplier_id = numericId; // Store as number, not string
        } else {
          console.log(`Adding supplier_id ${selectedSupplierId} (string) to JSON data`);
          formDataObj.supplier_id = selectedSupplierId;
        }

        // Log the supplier details for debugging
        const supplier = suppliers.find(s => s.supplier_id.toString() === selectedSupplierId);
        console.log('Selected supplier details:', supplier);
      }

      // Final check to ensure supplier_id is included
      console.log('Final formDataObj with supplier_id:', formDataObj);

      console.log('Sending JSON data to server:', formDataObj);

      // Ensure supplier_id is included in the request body
      if (selectedSupplierId) {
        const numericId = parseInt(selectedSupplierId, 10);
        if (!isNaN(numericId)) {
          formDataObj.supplier_id = numericId;
        }
      }

      // Send request as JSON instead of FormData
      const response = await fetch('http://localhost:3002/custom-orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formDataObj)
      });

      // Clone the response so we can read it multiple times if needed
      const responseClone = response.clone();

      if (!response.ok) {
        // First try to get the response as text
        const errorText = await responseClone.text();
        console.error('Server error response:', errorText);

        // Then try to parse it as JSON if possible
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to create custom order');
        } catch (jsonError) {
          // If it's not valid JSON, use the status text
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        console.error('Error parsing success response:', jsonError);
        throw new Error('Invalid response from server');
      }

      // Show success message
      setSuccess('Custom order created successfully!');
      setOrderReference(result.order_reference);
      setShowSuccessModal(true);

      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setEstimatedAmount(0);
      setAdvanceAmount(0);
      setEstimatedCompletionDate('');
      setCategoryId(null);
      setDescription('');
      setSpecialRequirements('');
      setSelectedSupplierId('');
      setSelectedFiles([]);
      setPreviewUrls([]);

    } catch (err) {
      console.error('Error creating custom order:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating the custom order');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Custom Order</h1>

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Order Details</h2>

            {/* Customer Information */}
            <div className="mb-6 space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
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
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    id="customerPhone"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="customerEmail"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Enter email address"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="mb-6 space-y-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Tag className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="category"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    value={categoryId || ''}
                    onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.category_id} value={category.category_id}>
                        {category.category_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Supplier Selection Dropdown */}
              <div>
                <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="supplier"
                    name="supplier_id"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    value={selectedSupplierId || ''}
                    onChange={(e) => {
                      const supplierId = e.target.value;
                      setSelectedSupplierId(supplierId);
                      console.log(`Selected supplier ID from dropdown: ${supplierId}`);
                    }}
                  >
                    <option value="">Select a supplier</option>
                    {suppliers
                      .filter(supplier =>
                        !categoryId ||
                        supplier.category === categories.find(c => c.category_id === categoryId)?.category_name ||
                        (supplier.manufacturing_items && categories.find(c => c.category_id === categoryId)?.category_name &&
                         supplier.manufacturing_items.includes(categories.find(c => c.category_id === categoryId)?.category_name || ''))
                      )
                      .map(supplier => (
                        <option key={supplier.supplier_id} value={supplier.supplier_id}>
                          {supplier.name || supplier.supplier_name || `Supplier ${supplier.supplier_id}`}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>

              {/* Selected Supplier Display */}
              {selectedSupplierId && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">Selected Supplier:</span> {
                      // Find the supplier name from the ID
                      (() => {
                        const supplier = suppliers.find(s => s.supplier_id.toString() === selectedSupplierId);
                        return supplier ? supplier.name : `Supplier ID: ${selectedSupplierId}`;
                      })()
                    }
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="estimatedCompletionDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Completion Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    id="estimatedCompletionDate"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    value={estimatedCompletionDate}
                    onChange={(e) => setEstimatedCompletionDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    id="description"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Describe the custom order"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="specialRequirements" className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requirements
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    id="specialRequirements"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Any special requirements or instructions"
                    value={specialRequirements}
                    onChange={(e) => setSpecialRequirements(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="mb-6 space-y-4">
              <div>
                <label htmlFor="estimatedAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Amount *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LKRIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="estimatedAmount"
                    className="block w-full pl-10 p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="0.00"
                    value={estimatedAmount || ''}
                    onChange={(e) => setEstimatedAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="advanceAmount" className="block text-sm font-medium text-gray-700 mb-1">
                  Advance Payment <span className="text-xs text-yellow-600">(Min: 25% of Estimated Amount)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LKRIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    id="advanceAmount"
                    className={`block w-full pl-10 p-2 border ${advanceAmount < minAdvancePayment && estimatedAmount > 0 ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300'} rounded-md focus:ring-yellow-500 focus:border-yellow-500`}
                    placeholder="0.00"
                    value={advanceAmount || ''}
                    onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    max={estimatedAmount}
                    step="0.01"
                  />
                </div>
                {estimatedAmount > 0 && (
                  <p className={`mt-1 text-sm ${advanceAmount < minAdvancePayment ? 'text-yellow-600' : 'text-gray-500'}`}>
                    Recommended minimum: {formatCurrency(minAdvancePayment)}
                    {advanceAmount < minAdvancePayment && advanceAmount > 0 && (
                      <span className="ml-1 text-yellow-600">
                        (Current: {((advanceAmount / estimatedAmount) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </p>
                )}
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
                    value={balanceAmount || ''}
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference Images (Optional)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="fileUpload"
                    className="flex flex-col items-center justify-center w-full h-32 cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-lg"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or GIF (MAX. 5 files, 5MB each)
                      </p>
                    </div>
                    <input
                      id="fileUpload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={selectedFiles.length >= 5}
                    />
                  </label>
                </div>

                {/* Preview selected images */}
                {previewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 w-full">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        <div className="relative h-24 w-full rounded-md overflow-hidden border border-gray-200">
                          <Image
                            src={url}
                            alt={`Preview ${index + 1}`}
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Supplier ID is now handled by the dropdown */}

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
                {loading ? 'Processing...' : 'Create Custom Order'}
              </button>
            </div>
          </form>
        </div>

        {/* Supplier vs Category Graph */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Supplier Order Counts by Category</h2>
          <ImprovedCategoryChart
            selectedCategory={categoryId ? categories.find(c => c.category_id === categoryId)?.category_name || 'All' : 'All'}
          />
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-center mb-4 text-green-500">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-center mb-4">Order Created!</h2>
            <p className="text-center mb-2">Your custom order has been created successfully.</p>
            {orderReference && (
              <p className="text-center font-semibold mb-6">Reference: {orderReference}</p>
            )}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/DashView/custom-orders');
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                View All Orders
              </button>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCustomOrderPage;
