"use client";

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Search, Filter, Plus, Download, RefreshCw, Calendar, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { exportJewelleryItemsToCSV } from '@/utils/csvExport';
import { useSearchParams } from 'next/navigation';



interface JewelleryItem {
  item_id: number;
  product_title: string;
  category: string;
  category_name?: string; // From the categories table
  in_stock: number;
  buying_price: number;
  selling_price: number;
  product_added: string;
  branch_id?: number;
  branch_name?: string;
  gold_carat?: number;
  weight?: number;
  assay_certificate?: string;
  is_solid_gold?: number; // 1 for true, 0 for false
  making_charges?: number;
  additional_materials_charges?: number;
  profit_percentage?: number; // Profit percentage
}

interface Category {
  category_id: number;
  category_name: string;
  description?: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
}

const JewelleryStockPage = () => {
  const searchParams = useSearchParams();
  const [jewelleryItems, setJewelleryItems] = useState<JewelleryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All Categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Flag to check if we're coming from the "Add to Stock" action
  const [isAddingFromOrder, setIsAddingFromOrder] = useState<boolean>(false);

  // Advanced filtering
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('All Branches');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // For the add/edit form
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<JewelleryItem | null>(null);

  // For the details modal
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [detailsItem, setDetailsItem] = useState<JewelleryItem | null>(null);

  // For the report view
  const [showReport, setShowReport] = useState<boolean>(false);

  // Form fields
  const [productTitle, setProductTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [inStock, setInStock] = useState<number>(0);
  const [buyingPrice, setBuyingPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [profitPercentage, setProfitPercentage] = useState<number>(0);
  const [goldCarat, setGoldCarat] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [assayCertificate, setAssayCertificate] = useState<string>('');
  const [isSolidGold, setIsSolidGold] = useState<boolean>(true);
  const [makingCharges, setMakingCharges] = useState<number | null>(null);
  const [additionalMaterialsCharges, setAdditionalMaterialsCharges] = useState<number | null>(null);

  // State to track the order ID if coming from "Add to Stock"
  const [sourceOrderId, setSourceOrderId] = useState<number | null>(null);

  // Check for URL parameters from "Add to Stock" action
  useEffect(() => {
    // Check if we have URL parameters
    const category = searchParams.get('category');
    const inStockParam = searchParams.get('in_stock');
    const buyingPriceParam = searchParams.get('buying_price');
    const goldCaratParam = searchParams.get('gold_carat');
    const weightParam = searchParams.get('weight');
    const orderIdParam = searchParams.get('order_id');
    const makingChargesParam = searchParams.get('making_charges');
    const additionalMaterialsChargesParam = searchParams.get('additional_materials_charges');

    // If we have parameters, we're coming from "Add to Stock"
    if (category || inStockParam || buyingPriceParam || goldCaratParam || weightParam) {
      setIsAddingFromOrder(true);

      // Set form values from URL parameters
      if (category) setCategory(category);
      if (inStockParam) setInStock(parseInt(inStockParam, 10) || 0);
      if (buyingPriceParam) setBuyingPrice(parseFloat(buyingPriceParam) || 0);
      if (goldCaratParam) setGoldCarat(parseFloat(goldCaratParam) || null);
      if (weightParam) setWeight(parseFloat(weightParam) || null);
      if (makingChargesParam) setMakingCharges(parseFloat(makingChargesParam) || null);
      if (additionalMaterialsChargesParam) setAdditionalMaterialsCharges(parseFloat(additionalMaterialsChargesParam) || null);

      // Set solid gold to true if we have gold carat
      if (goldCaratParam) setIsSolidGold(true);

      // Store the source order ID if available
      if (orderIdParam) {
        const orderId = parseInt(orderIdParam, 10);
        if (!isNaN(orderId)) {
          setSourceOrderId(orderId);
          console.log(`Adding item from order #${orderId}`);
        }
      }

      // Show the form
      setFormMode('add');
      setShowForm(true);
    }
  }, [searchParams]);

  // Get user info from localStorage and fetch items immediately
  useEffect(() => {
    // Get individual items from localStorage
    const role = localStorage.getItem('role');
    const branchId = localStorage.getItem('branchId');

    console.log('Retrieved from localStorage - Role:', role, 'Branch ID:', branchId);

    // Set user role (convert to lowercase for consistency)
    const normalizedRole = role === 'Admin' ? 'admin' : (role?.toLowerCase() || '');
    setUserRole(normalizedRole);

    // Set branch ID
    const numericBranchId = branchId ? Number(branchId) : null;
    setUserBranchId(numericBranchId);

    // Immediately fetch items with proper filtering
    const fetchJewelleryItems = async () => {
      try {
        setLoading(true);

        // Construct URL with query parameters for branch filtering
        let url = 'http://localhost:3002/jewellery-items';
        const params = new URLSearchParams();

        if (numericBranchId && normalizedRole !== 'admin') {
          params.append('branch_id', numericBranchId.toString());
          params.append('role', normalizedRole);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        console.log('Initial fetch of jewellery items from:', url);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch jewellery items: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched jewellery items:', data.length);
        setJewelleryItems(data);
      } catch (err) {
        console.error('Error fetching jewellery items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJewelleryItems();
  }, []);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('http://localhost:3002/categories');
        if (!response.ok) {
          throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        const data = await response.json();
        // Add 'all' category at the beginning
        setCategories([{ category_id: 0, category_name: 'All Categories' }, ...data]);
      } catch (err) {
        console.error('Error fetching categories:', err);

        // Fallback categories
        setCategories([
          { category_id: 0, category_name: 'All Categories' },
          { category_id: 1, category_name: 'Rings' },
          { category_id: 2, category_name: 'Necklaces' },
          { category_id: 3, category_name: 'Earrings' },
          { category_id: 4, category_name: 'Bracelets' }
        ]);
      }
    };

    fetchCategories();
  }, []);

  // Fetch jewellery items when userRole or userBranchId changes after initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    // Skip the first render since we already fetched in the first useEffect
    if (!initialLoadComplete) {
      setInitialLoadComplete(true);
      return;
    }

    const fetchJewelleryItems = async () => {
      try {
        setLoading(true);

        // Construct URL with query parameters for branch filtering
        let url = 'http://localhost:3002/jewellery-items';
        const params = new URLSearchParams();

        if (userBranchId && userRole !== 'admin') {
          params.append('branch_id', userBranchId.toString());
          params.append('role', userRole);
        }

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        console.log('Fetching jewellery items after update from:', url);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch jewellery items: ${response.status}`);
        }

        const data = await response.json();
        console.log('Fetched jewellery items:', data.length);
        setJewelleryItems(data);

        // Check for low stock items and create notifications
        checkLowStockItems(data);
      } catch (err) {
        console.error('Error fetching jewellery items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchJewelleryItems();
  }, [userBranchId, userRole, initialLoadComplete]);

  // Function to check for low stock items and create notifications
  const checkLowStockItems = async (items: JewelleryItem[]) => {
    try {
      // Call the low stock notifications check endpoint
      const response = await fetch('http://localhost:3002/low-stock-notifications/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Low stock check result:', result);
      } else {
        console.error('Failed to check for low stock items');
      }
    } catch (error) {
      console.error('Error checking for low stock items:', error);
    }
  };

  // Filter jewellery items based on search term, category, branch, and date range
  const filteredItems = jewelleryItems.filter(item => {
    // Apply category filter - only filter if not "All Categories"
    if (categoryFilter !== 'All Categories' && categoryFilter !== '0' &&
        item.category_name !== categoryFilter && item.category !== categoryFilter) {
      return false;
    }

    // Apply branch filter (admin only)
    if (userRole === 'admin' && branchFilter !== 'All Branches' &&
        item.branch_name !== branchFilter &&
        (item.branch_id !== 1 || branchFilter !== 'Mahiyangana Branch') &&
        (item.branch_id !== 2 || branchFilter !== 'Mahaoya Branch')) {
      return false;
    }

    // Apply date range filter
    if (startDate && item.product_added) {
      const itemDate = new Date(item.product_added);
      const filterStartDate = new Date(startDate);
      if (itemDate < filterStartDate) {
        return false;
      }
    }

    if (endDate && item.product_added) {
      const itemDate = new Date(item.product_added);
      const filterEndDate = new Date(endDate);
      // Set end date to end of day
      filterEndDate.setHours(23, 59, 59, 999);
      if (itemDate > filterEndDate) {
        return false;
      }
    }

    // Apply search term
    const searchLower = searchTerm.toLowerCase();
    return (
      item.product_title.toLowerCase().includes(searchLower) ||
      (item.category_name || item.category).toLowerCase().includes(searchLower) ||
      (item.branch_name || '').toLowerCase().includes(searchLower)
    );
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Handle edit item
  const handleEditItem = (item: JewelleryItem) => {
    console.log('Editing item:', JSON.stringify(item, null, 2));

    // Store the complete item object
    setCurrentItem({...item});

    // Set individual form fields
    console.log('Setting product title to:', item.product_title);
    setProductTitle(item.product_title || '');
    setCategory(item.category_name || item.category || '');
    setInStock(item.in_stock || 0);
    setBuyingPrice(item.buying_price || 0);
    setSellingPrice(item.selling_price || 0);
    if (item.branch_id) {
      setUserBranchId(item.branch_id);
    }

    // Calculate profit percentage if not already set
    if (item.profit_percentage !== undefined) {
      setProfitPercentage(item.profit_percentage);
    } else if (item.buying_price > 0) {
      // Calculate profit percentage based on buying and selling price
      const calculatedProfit = ((item.selling_price - item.buying_price) / item.buying_price) * 100;
      setProfitPercentage(parseFloat(calculatedProfit.toFixed(2)));
    } else {
      setProfitPercentage(0);
    }

    // Set gold details if available
    setGoldCarat(item.gold_carat !== undefined ? item.gold_carat : null);
    setWeight(item.weight !== undefined ? item.weight : null);
    setAssayCertificate(item.assay_certificate || '');
    setIsSolidGold(item.is_solid_gold === 1);
    // Set making charges and additional materials charges if available
    setMakingCharges(item.making_charges !== undefined ? item.making_charges : null);
    setAdditionalMaterialsCharges(item.additional_materials_charges !== undefined ? item.additional_materials_charges : null);
    setFormMode('edit');
    setShowForm(true);
  };

  // Handle delete item
  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/jewellery-items/delete/${itemId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete item');
      }

      // Refresh the list with branch filtering
      let fetchUrl = 'http://localhost:3002/jewellery-items';
      const params = new URLSearchParams();

      if (userBranchId && userRole !== 'admin') {
        params.append('branch_id', userBranchId.toString());
        params.append('role', userRole);
      }

      if (params.toString()) {
        fetchUrl += `?${params.toString()}`;
      }

      console.log('Refreshing jewellery items after delete from:', fetchUrl);
      const refreshResponse = await fetch(fetchUrl);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setJewelleryItems(data);
      } else {
        // Fallback to client-side filtering if refresh fails
        setJewelleryItems(jewelleryItems.filter(item => item.item_id !== itemId));
      }

      alert('Item deleted successfully');
    } catch (err) {
      console.error('Error deleting item:', err);
      alert('Failed to delete item');
    }
  };

  // Handle add new item
  const handleAddNewItem = () => {
    setCurrentItem(null);
    setProductTitle('');
    setCategory('');
    setInStock(0);
    setBuyingPrice(0);
    setSellingPrice(0);
    setProfitPercentage(0);
    // Reset gold details
    setGoldCarat(null);
    setWeight(null);
    setAssayCertificate('');
    setIsSolidGold(true);
    // Reset making charges and additional materials charges
    setMakingCharges(null);
    setAdditionalMaterialsCharges(null);
    // Keep the current branch ID for non-admin users
    if (userRole !== 'admin' && userBranchId) {
      // Branch ID is already set from localStorage
    } else if (userRole === 'admin') {
      // Admin needs to select a branch
      setUserBranchId(null);
    }
    setFormMode('add');
    setShowForm(true);
  };

  // Handle form submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission started');
    console.log('Current form mode:', formMode);
    console.log('Current item ID:', currentItem?.item_id);
    console.log('Product title value:', productTitle);

    // Validate form
    if (!productTitle || !category || inStock < 0 || buyingPrice <= 0 || sellingPrice <= 0 || !userBranchId) {
      alert('Please fill all fields with valid values');
      return;
    }

    const itemData = {
      product_title: productTitle,
      category,
      in_stock: inStock,
      buying_price: buyingPrice,
      selling_price: sellingPrice,
      profit_percentage: profitPercentage,
      branch_id: userBranchId, // Include branch_id from user info
      gold_carat: goldCarat,
      weight: weight,
      assay_certificate: assayCertificate,
      is_solid_gold: isSolidGold ? 1 : 0,
      making_charges: makingCharges,
      additional_materials_charges: additionalMaterialsCharges
    };

    console.log('Submitting jewellery item data:', JSON.stringify(itemData, null, 2));

    try {
      let response;

      if (formMode === 'add') {
        // Create new item
        console.log('Creating new jewellery item');
        response = await fetch('http://localhost:3002/jewellery-items/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(itemData)
        });
      } else {
        // Update existing item
        console.log(`Updating jewellery item with ID: ${currentItem?.item_id}`);

        if (!currentItem?.item_id) {
          console.error('Error: Missing item ID for update operation');
          alert('Cannot update item: Missing item ID');
          return;
        }

        response = await fetch(`http://localhost:3002/jewellery-items/update/${currentItem.item_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(itemData)
        });
      }

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to ${formMode} item: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Response data:', responseData);

      // Refresh the list with branch filtering
      let fetchUrl = 'http://localhost:3002/jewellery-items';
      const params = new URLSearchParams();

      if (userBranchId && userRole !== 'admin') {
        params.append('branch_id', userBranchId.toString());
        params.append('role', userRole);
      }

      if (params.toString()) {
        fetchUrl += `?${params.toString()}`;
      }

      console.log('Refreshing jewellery items from:', fetchUrl);
      const refreshResponse = await fetch(fetchUrl);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setJewelleryItems(data);
      }

      // Check for low stock after adding/updating an item
      if (inStock <= 10) {
        try {
          // Call the low stock notifications check endpoint
          await fetch('http://localhost:3002/low-stock-notifications/check', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          console.log('Low stock check triggered after item update');
        } catch (error) {
          console.error('Error checking for low stock after item update:', error);
        }
      }

      // If this item was added from an order and we have the source order ID,
      // update the order status to ensure it doesn't appear in the completed orders list anymore
      if (formMode === 'add' && isAddingFromOrder && sourceOrderId) {
        try {
          // Double-check that the order status is updated to "added_to_stock"
          const orderResponse = await fetch(`http://localhost:3002/orders/update-status/${sourceOrderId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: 'added_to_stock' })
          });

          if (orderResponse.ok) {
            console.log(`Successfully updated order #${sourceOrderId} status to 'added_to_stock'`);
          } else {
            console.error(`Failed to update order #${sourceOrderId} status:`, orderResponse.statusText);
          }
        } catch (orderErr) {
          console.error(`Error updating order #${sourceOrderId} status:`, orderErr);
          // Continue even if this fails
        }
      }

      alert(`Item ${formMode === 'add' ? 'added' : 'updated'} successfully`);

      // Clear form state
      setCurrentItem(null);
      setProductTitle('');
      setCategory('');
      setInStock(0);
      setBuyingPrice(0);
      setSellingPrice(0);
      setProfitPercentage(0);
      setGoldCarat(null);
      setWeight(null);
      setAssayCertificate('');
      setIsSolidGold(true);
      setMakingCharges(null);
      setAdditionalMaterialsCharges(null);

      // Close the form
      setShowForm(false);

      // Reset the source order ID and isAddingFromOrder flag
      setSourceOrderId(null);
      setIsAddingFromOrder(false);
    } catch (err) {
      console.error(`Error ${formMode === 'add' ? 'adding' : 'updating'} item:`, err);
      alert(`Failed to ${formMode} item`);
    }
  };

  // Cancel form
  const handleCancelForm = () => {
    console.log('Cancelling form');
    setShowForm(false);

    // Reset the source order ID and isAddingFromOrder flag
    setSourceOrderId(null);
    setIsAddingFromOrder(false);

    // Clear form state
    setCurrentItem(null);
    setProductTitle('');
    setCategory('');
    setInStock(0);
    setBuyingPrice(0);
    setSellingPrice(0);
    setProfitPercentage(0);
    setGoldCarat(null);
    setWeight(null);
    setAssayCertificate('');
    setIsSolidGold(true);
    setMakingCharges(null);
    setAdditionalMaterialsCharges(null);
  };

  // View item details
  const handleViewDetails = (item: JewelleryItem) => {
    setDetailsItem(item);
    setShowDetails(true);
  };

  // Close details modal
  const handleCloseDetails = () => {
    setShowDetails(false);
    setDetailsItem(null);
  };

  // Fetch branches
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('http://localhost:3002/branches');
        if (!response.ok) {
          throw new Error(`Failed to fetch branches: ${response.status}`);
        }

        const data = await response.json();
        // Add 'all' branch at the beginning
        setBranches([{ branch_id: 0, branch_name: 'All Branches' }, ...data]);
      } catch (err) {
        console.error('Error fetching branches:', err);
        // Fallback branches
        setBranches([
          { branch_id: 0, branch_name: 'All Branches' },
          { branch_id: 1, branch_name: 'Mahiyangana Branch' },
          { branch_id: 2, branch_name: 'Mahaoya Branch' }
        ]);
      }
    };

    if (userRole === 'admin') {
      fetchBranches();
    }
  }, [userRole]);

  // Toggle filters
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Reset filters
  const resetFilters = () => {
    setBranchFilter('All Branches');
    setCategoryFilter('All Categories');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };



  // Export to CSV
  const exportToCSV = () => {
    try {
      // Call the utility function
      const success = exportJewelleryItemsToCSV(filteredItems, userRole);

      if (!success) {
        alert('Failed to generate CSV. Please try again.');
      }
    } catch (err) {
      console.error('Error exporting to CSV:', err);
      alert('An error occurred while generating the CSV.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Jewellery Items Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Jewellery Item</h2>
          <div className="flex gap-2">
            {userRole === 'admin' && (
              <>
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium flex items-center"
                  onClick={() => setShowReport(true)}
                >
                  <Eye size={18} className="mr-1" />
                  Generate Report
                </button>
                <button
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-medium flex items-center"
                  onClick={exportToCSV}
                >
                  <Download size={18} className="mr-1" />
                  CSV
                </button>
              </>
            )}
            {(userRole === 'admin' || userRole === 'store manager') && (
              <button
                className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md font-medium flex items-center"
                onClick={handleAddNewItem}
              >
                <Plus size={18} className="mr-1" />
                Add new Item
              </button>
            )}
          </div>
        </div>

        {/* Search and Basic Filter */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search items..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-md"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id === 0 ? 'All Categories' : cat.category_name}>
                  {cat.category_name}
                </option>
              ))}
            </select>

            <button
              className="p-2 border border-gray-300 rounded-md"
              onClick={toggleFilters}
              title="Advanced Filters"
            >
              <Filter size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && userRole === 'admin' && (
          <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Advanced Filters</h3>
              <button
                className="text-sm text-blue-500 hover:text-blue-700"
                onClick={resetFilters}
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  {branches.map((branch) => (
                    <option key={branch.branch_id} value={branch.branch_id === 0 ? 'All Branches' : branch.branch_name}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <button
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black p-2 rounded-md font-medium flex items-center justify-center"
                  onClick={() => {
                    // Apply filters logic here
                    // This would typically involve fetching data with the filters
                    console.log('Applying filters:', { branchFilter, categoryFilter, startDate, endDate });
                  }}
                >
                  <RefreshCw size={18} className="mr-1" />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                {userRole === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In-Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selling Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gold Carat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight
                </th>
                {userRole === 'admin' || userRole === 'store manager' ? (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      userRole === 'admin'
                        ? 8
                        : (userRole === 'store manager' ? 8 : 7)
                    }
                    className="px-6 py-4 text-center text-gray-500"
                  >
                    No jewellery items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.item_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.product_title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.category_name || item.category}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.branch_name ||
                         (item.branch_id === 1 ? 'Mahiyangana Branch' :
                          item.branch_id === 2 ? 'Mahaoya Branch' :
                          `Branch ${item.branch_id || 'Unknown'}`)}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.in_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(item.selling_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.gold_carat || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.weight ? `${item.weight} g` : '-'}
                    </td>
                    {(userRole === 'admin' || userRole === 'store manager') ? (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                            onClick={() => handleViewDetails(item)}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Edit Item"
                            onClick={() => handleEditItem(item)}
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900"
                            title="Delete Item"
                            onClick={() => handleDeleteItem(item.item_id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 w-full max-w-4xl">

            <h2 className="text-xl font-bold mb-3 text-center">
              {formMode === 'add' ? 'Add New Jewellery Item' : 'Edit Jewellery Item'}
            </h2>

            <form onSubmit={handleSubmitForm}>
              <div className="grid grid-cols-3 gap-x-5 gap-y-2">
                {/* Product Title */}
                <div className="mb-2 col-span-3">
                  <label className="block text-sm font-medium mb-1">Product Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={productTitle}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      console.log('Product title changed to:', newTitle);
                      setProductTitle(newTitle);
                    }}
                    required
                  />
                </div>

                {/* Category */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories
                      .filter(cat => cat.category_id !== 0) // Skip 'All Categories'
                      .map(cat => (
                        <option key={cat.category_id} value={cat.category_name} />
                      ))
                    }
                  </datalist>
                </div>

                {/* In Stock */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">In Stock</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={inStock}
                    onChange={(e) => setInStock(Number(e.target.value))}
                    min="0"
                    required
                  />
                </div>

                {/* Branch */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Branch</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={userBranchId || ''}
                    onChange={(e) => setUserBranchId(Number(e.target.value) || null)}
                    required
                    disabled={userRole !== 'admin'}
                  >
                    <option value="">Select Branch</option>
                    <option value="1">Mahiyangana Branch</option>
                    <option value="2">Mahaoya Branch</option>
                  </select>
                </div>

                {/* Making Charges */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Making Charges</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={makingCharges || ''}
                    onChange={(e) => setMakingCharges(e.target.value ? Number(e.target.value) : null)}
                    min="0"
                    step="0.01"
                    placeholder="e.g. 2000"
                  />
                </div>

                {/* Additional Materials Charges */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Additional Materials Charges</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={additionalMaterialsCharges || ''}
                    onChange={(e) => setAdditionalMaterialsCharges(e.target.value ? Number(e.target.value) : null)}
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1000"
                  />
                </div>

                {/* Buying Price */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Buying Price</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={buyingPrice}
                    onChange={(e) => {
                      const newBuyingPrice = Number(e.target.value);
                      setBuyingPrice(newBuyingPrice);

                      // Recalculate profit percentage when buying price changes
                      if (newBuyingPrice > 0) {
                        const profit = ((sellingPrice - newBuyingPrice) / newBuyingPrice) * 100;
                        // Limit profit to 15%
                        const limitedProfit = Math.min(profit, 15);
                        setProfitPercentage(parseFloat(limitedProfit.toFixed(2)));
                      }
                    }}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Selling Price */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Selling Price</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={sellingPrice}
                    onChange={(e) => {
                      const newSellingPrice = Number(e.target.value);
                      setSellingPrice(newSellingPrice);

                      // Calculate profit percentage when selling price changes
                      if (buyingPrice > 0) {
                        const profit = ((newSellingPrice - buyingPrice) / buyingPrice) * 100;
                        // Limit profit to 15%
                        const limitedProfit = Math.min(profit, 15);
                        setProfitPercentage(parseFloat(limitedProfit.toFixed(2)));
                      }
                    }}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Profit Percentage */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">
                    Profit Percentage (Max 15%)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={profitPercentage}
                      onChange={(e) => {
                        const newProfit = Number(e.target.value);
                        // Limit profit to 15%
                        const limitedProfit = Math.min(newProfit, 15);
                        setProfitPercentage(limitedProfit);

                        // Update selling price based on profit percentage
                        if (buyingPrice > 0) {
                          const newSellingPrice = buyingPrice * (1 + limitedProfit / 100);
                          setSellingPrice(parseFloat(newSellingPrice.toFixed(2)));
                        }
                      }}
                      min="0"
                      max="15"
                      step="0.01"
                    />
                    <span className="ml-2">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum allowed profit is 15%
                  </p>
                </div>

                {/* Gold Carat */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Gold Carat</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={goldCarat || ''}
                    onChange={(e) => setGoldCarat(e.target.value ? Number(e.target.value) : null)}
                    min="0"
                    step="0.1"
                    placeholder="e.g. 22.5"
                  />
                </div>

                {/* Weight */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Weight (grams)</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={weight || ''}
                    onChange={(e) => setWeight(e.target.value ? Number(e.target.value) : null)}
                    min="0"
                    step="0.001"
                    placeholder="e.g. 10.5"
                  />
                </div>

                {/* Assay Certificate */}
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">Assay Certificate</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={assayCertificate}
                    onChange={(e) => setAssayCertificate(e.target.value)}
                    placeholder="Certificate number"
                  />
                </div>

                {/* Is Solid Gold */}
                <div className="mb-2 flex items-center">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2 h-4 w-4"
                      checked={isSolidGold}
                      onChange={(e) => setIsSolidGold(e.target.checked)}
                    />
                    <span className="text-sm font-medium">Is Solid Gold</span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-4 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
                  onClick={handleCancelForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-md"
                >
                  {formMode === 'add' ? 'Add Item' : 'Update Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Item Details Modal */}
      {showDetails && detailsItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4 text-center">
              Jewellery Item Details
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Product Title</p>
                <p className="text-base">{detailsItem.product_title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Category</p>
                <p className="text-base">{detailsItem.category_name || detailsItem.category}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Branch</p>
                <p className="text-base">
                  {detailsItem.branch_name ||
                   (detailsItem.branch_id === 1 ? 'Mahiyangana Branch' :
                    detailsItem.branch_id === 2 ? 'Mahaoya Branch' :
                    `Branch ${detailsItem.branch_id || 'Unknown'}`)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">In Stock</p>
                <p className="text-base">{detailsItem.in_stock}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Buying Price</p>
                <p className="text-base">{formatCurrency(detailsItem.buying_price)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Selling Price</p>
                <p className="text-base">{formatCurrency(detailsItem.selling_price)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Profit Percentage</p>
                <p className="text-base">
                  {detailsItem.profit_percentage !== undefined
                    ? `${detailsItem.profit_percentage}%`
                    : detailsItem.buying_price > 0
                      ? `${((detailsItem.selling_price - detailsItem.buying_price) / detailsItem.buying_price * 100).toFixed(2)}%`
                      : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Gold Carat</p>
                <p className="text-base">{detailsItem.gold_carat || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Weight</p>
                <p className="text-base">{detailsItem.weight ? `${detailsItem.weight} g` : '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Assay Certificate</p>
                <p className="text-base">{detailsItem.assay_certificate || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Solid Gold</p>
                <p className="text-base">{detailsItem.is_solid_gold ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Product Added</p>
                <p className="text-base">{formatDate(detailsItem.product_added)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Making Charges</p>
                <p className="text-base">{detailsItem.making_charges ? formatCurrency(detailsItem.making_charges) : '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Additional Materials Charges</p>
                <p className="text-base">{detailsItem.additional_materials_charges ? formatCurrency(detailsItem.additional_materials_charges) : '-'}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
                onClick={handleCloseDetails}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report View Modal */}
      {showReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div id="jewellery-report-view">
              <h2 className="text-2xl font-bold mb-4 text-center">Jewellery Stock Report</h2>

              <div className="mb-4 flex justify-between items-center">
                <div>
                  <p className="text-sm"><span className="font-medium">Generated on:</span> {new Date().toLocaleDateString()}</p>
                  {branchFilter !== 'All Branches' && (
                    <p className="text-sm"><span className="font-medium">Branch:</span> {branchFilter}</p>
                  )}
                  {categoryFilter !== 'All Categories' && (
                    <p className="text-sm"><span className="font-medium">Category:</span> {categoryFilter}</p>
                  )}
                  {startDate && (
                    <p className="text-sm"><span className="font-medium">From:</span> {startDate}</p>
                  )}
                  {endDate && (
                    <p className="text-sm"><span className="font-medium">To:</span> {endDate}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: '#D4AF37' }}>SLanka Jewellery</div>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-yellow-400">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Product Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Category</th>
                      {userRole === 'admin' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Branch</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">In Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Buying Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Selling Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Gold Carat</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Date Added</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.item_id}>
                        <td className="px-6 py-4 whitespace-nowrap">{item.item_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.product_title}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.category_name || item.category}</td>
                        {userRole === 'admin' && (
                          <td className="px-6 py-4 whitespace-nowrap">{item.branch_name || `Branch ${item.branch_id}`}</td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">{item.in_stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.buying_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatCurrency(item.selling_price)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.gold_carat || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{item.weight ? `${item.weight} g` : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{formatDate(item.product_added)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 border-t pt-4">
                <p className="text-sm"><span className="font-medium">Total Items:</span> {filteredItems.length}</p>
                <p className="text-sm"><span className="font-medium">Total Stock:</span> {filteredItems.reduce((sum, item) => sum + item.in_stock, 0)}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center"
                onClick={() => {
                  try {
                    // Create a simplified version of the report for PDF generation
                    const reportElement = document.getElementById('jewellery-report-view');
                    if (!reportElement) return;

                    // Show loading indicator
                    const loadingIndicator = document.createElement('div');
                    loadingIndicator.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]';
                    loadingIndicator.innerHTML = `
                      <div class="bg-white p-4 rounded-lg shadow-lg flex items-center">
                        <div class="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                        <p>Generating PDF...</p>
                      </div>
                    `;
                    document.body.appendChild(loadingIndicator);

                    // Use a timeout to allow the loading indicator to render
                    setTimeout(() => {
                      // Generate PDF using jsPDF directly
                      import('jspdf').then(jsPDFModule => {
                        const jsPDF = jsPDFModule.default;
                        const pdf = new jsPDF('p', 'mm', 'a4');

                        // Add title
                        pdf.setFontSize(18);
                        pdf.text('Jewellery Stock Report', 14, 22);

                        // Add filters info
                        pdf.setFontSize(10);
                        const today = new Date().toLocaleDateString();
                        pdf.text(`Generated on: ${today}`, 14, 30);

                        let line = 35;
                        if (branchFilter !== 'All Branches') {
                          // Make branch name more prominent
                          pdf.setFontSize(12);
                          pdf.setFont('helvetica', 'bold');
                          pdf.text(`Branch: ${branchFilter}`, 14, line);
                          pdf.setFont('helvetica', 'normal');
                          pdf.setFontSize(10);
                          line += 5;
                        }

                        if (categoryFilter !== 'All Categories') {
                          pdf.text(`Category: ${categoryFilter}`, 14, line);
                          line += 5;
                        }

                        if (startDate) {
                          pdf.text(`From: ${startDate}`, 14, line);
                          line += 5;
                        }

                        if (endDate) {
                          pdf.text(`To: ${endDate}`, 14, line);
                          line += 5;
                        }

                        // Add SLanka Jewellery text
                        pdf.setTextColor(212, 175, 55); // #D4AF37 in RGB
                        pdf.setFontSize(16);
                        pdf.text('SLanka Jewellery', 170, 22, { align: 'right' });
                        pdf.setTextColor(0, 0, 0); // Reset to black

                        // Create table data
                        const tableColumn = [
                          'ID', 'Product Title', 'Category',
                          'In Stock', 'Buying Price', 'Selling Price', 'Gold Carat', 'Weight', 'Date Added'
                        ];

                        const tableRows = filteredItems.map(item => {
                          const row = [
                            item.item_id,
                            item.product_title,
                            item.category_name || item.category,
                            item.in_stock,
                            formatCurrency(item.buying_price),
                            formatCurrency(item.selling_price),
                            item.gold_carat || '-',
                            item.weight ? `${item.weight} g` : '-',
                            // Use a more compact date format for PDF
                            (() => {
                              const date = new Date(item.product_added);
                              return date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              }) + ' ' + date.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              });
                            })()
                          ];
                          return row;
                        });

                        // Create a simple table manually instead of using autoTable
                        // Set up table parameters
                        const startY = line + 5;
                        const cellPadding = 2;
                        const fontSize = 8;
                        const lineHeight = fontSize * 1.5;
                        const columnWidths = [
                          10, // ID
                          35, // Product Title
                          20, // Category
                          // Branch column removed since it's in the header
                          12, // In Stock
                          25, // Buying Price
                          25, // Selling Price
                          15, // Gold Carat
                          15, // Weight
                          35  // Date Added
                        ];

                        // Calculate total width and scale if needed
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
                        // Use a fixed scale to make columns more compact
                        const scale = Math.min(0.95, (pageWidth - 15) / tableWidth);

                        // Draw header
                        pdf.setFillColor(255, 204, 0);
                        pdf.setTextColor(0, 0, 0);
                        pdf.setFontSize(fontSize);

                        let currentX = 8;
                        let currentY = startY;

                        // Draw header cells
                        tableColumn.forEach((header, index) => {
                          const width = columnWidths[index] * scale;
                          pdf.setFillColor(255, 204, 0);
                          pdf.rect(currentX, currentY, width, lineHeight, 'F');

                          // Make header text bold
                          pdf.setFont('helvetica', 'bold');
                          pdf.text(header, currentX + cellPadding, currentY + lineHeight - cellPadding);
                          pdf.setFont('helvetica', 'normal');

                          currentX += width;
                        });

                        // Draw bottom line for header
                        pdf.setDrawColor(180, 180, 180);
                        pdf.line(8, currentY + lineHeight, 8 + tableWidth * scale, currentY + lineHeight);

                        currentY += lineHeight;

                        // Draw rows
                        pdf.setFillColor(255, 255, 255);

                        // Check if we need a new page
                        const checkAndAddPage = () => {
                          if (currentY > pdf.internal.pageSize.getHeight() - 20) {
                            pdf.addPage();
                            currentY = 20;
                            return true;
                          }
                          return false;
                        };

                        // Draw rows with alternating background
                        tableRows.forEach((row, rowIndex, allRows) => {
                          checkAndAddPage();
                          currentX = 8;

                          // Alternating row colors
                          if (rowIndex % 2 === 0) {
                            pdf.setFillColor(245, 245, 245);
                          } else {
                            pdf.setFillColor(255, 255, 255);
                          }

                          // Draw row background
                          pdf.rect(8, currentY, tableWidth * scale, lineHeight, 'F');

                          // Draw horizontal grid line (light gray)
                          pdf.setDrawColor(220, 220, 220);
                          pdf.line(8, currentY, 8 + tableWidth * scale, currentY);

                          // Draw cells
                          row.forEach((cell, cellIndex) => {
                            const width = columnWidths[cellIndex] * scale;

                            // Use the full text without truncation for important columns
                            let cellText = String(cell);

                            // Only truncate product title if extremely long
                            const textWidth = pdf.getStringUnitWidth(cellText) * fontSize / pdf.internal.scaleFactor;
                            if (cellIndex === 1 && textWidth > (width - 2 * cellPadding) && cellText.length > 30) {
                              // For product title, allow truncation only if very long
                              const ratio = (width - 2 * cellPadding) / textWidth;
                              const fitLength = Math.floor(cellText.length * ratio) - 2;
                              if (fitLength > 0) {
                                cellText = cellText.substring(0, fitLength) + '..';
                              }
                            }

                            pdf.text(cellText, currentX + cellPadding, currentY + lineHeight - cellPadding);
                            currentX += width;
                          });

                          currentY += lineHeight;

                          // Draw bottom line for the last row
                          if (rowIndex === allRows.length - 1) {
                            pdf.setDrawColor(180, 180, 180);
                            pdf.line(8, currentY, 8 + tableWidth * scale, currentY);
                          }
                        });

                        // Add summary at the bottom
                        currentY += 10;
                        checkAndAddPage();
                        pdf.setFontSize(10);
                        pdf.text(`Total Items: ${filteredItems.length}`, 8, currentY);
                        currentY += 5;
                        pdf.text(`Total Stock: ${filteredItems.reduce((sum, item) => sum + item.in_stock, 0)}`, 8, currentY);

                        // Save the PDF
                        pdf.save('jewellery-stock-report.pdf');

                        // Remove loading indicator
                        document.body.removeChild(loadingIndicator);
                      }).catch(err => {
                        console.error('Error loading jspdf:', err);
                        alert('Failed to generate PDF. Please try again.');
                        document.body.removeChild(loadingIndicator);
                      });
                    }, 100);
                  } catch (err) {
                    console.error('Error generating PDF:', err);
                    alert('An error occurred while generating the PDF.');
                  }
                }}
              >
                <Download size={18} className="mr-1" />
                Download PDF
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md"
                onClick={() => setShowReport(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JewelleryStockPage;
