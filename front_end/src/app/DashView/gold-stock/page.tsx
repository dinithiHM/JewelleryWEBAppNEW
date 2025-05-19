"use client";

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Search, Filter, Plus, Download, RefreshCw, Calendar, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface GoldStock {
  stock_id: number;
  purity: string;
  quantity_in_grams: number;
  price_per_gram: number;
  last_updated: string;
  branch_id: number;
  branch_name?: string;
  description: string;
  status: string;
}

interface Branch {
  branch_id: number;
  branch_name: string;
}

const GoldStockPage = () => {
  const [goldStock, setGoldStock] = useState<GoldStock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userBranchId, setUserBranchId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Advanced filtering
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('All Branches');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // For the add/edit form
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [currentItem, setCurrentItem] = useState<GoldStock | null>(null);

  // For the details modal
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [detailsItem, setDetailsItem] = useState<GoldStock | null>(null);

  // Form fields
  const [purity, setPurity] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<string>('active');
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  // For tracking initial load
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);

  // Get user info from localStorage on component mount
  useEffect(() => {
    console.log('Getting user info from localStorage...');
    const storedUserRole = localStorage.getItem('userRole');
    const storedBranchId = localStorage.getItem('branchId');
    const token = localStorage.getItem('token');

    console.log('Raw localStorage values:', {
      storedUserRole,
      storedBranchId,
      hasToken: !!token
    });

    if (storedUserRole) {
      console.log(`Setting user role to: ${storedUserRole.toLowerCase()}`);
      setUserRole(storedUserRole.toLowerCase());
    } else {
      console.log('No user role found in localStorage');
    }

    if (storedBranchId) {
      const numericBranchId = parseInt(storedBranchId, 10);
      if (!isNaN(numericBranchId)) {
        console.log(`Setting branch ID to: ${numericBranchId}`);
        setUserBranchId(numericBranchId);
        setSelectedBranchId(numericBranchId);
      } else {
        console.log(`Invalid branch ID: ${storedBranchId}`);
      }
    } else {
      console.log('No branch ID found in localStorage');
    }

    setInitialLoadComplete(true);
  }, []);

  // Fetch branches for filtering (admin only)
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('http://localhost:3002/branches');
        if (response.ok) {
          const data = await response.json();
          setBranches(data);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };

    if (userRole === 'admin') {
      fetchBranches();
    }
  }, [userRole]);

  // Fetch gold stock data
  useEffect(() => {
    if (!initialLoadComplete) return;

    const fetchGoldStock = async () => {
      try {
        setLoading(true);

        // Log that we're fetching gold stock
        console.log('Fetching all gold stock...');

        // Use our helper function to refresh the gold stock list
        await refreshGoldStockList();

      } catch (err) {
        console.error('Error fetching gold stock:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoldStock();
  }, [userBranchId, userRole, initialLoadComplete]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle view details
  const handleViewDetails = (item: GoldStock) => {
    setDetailsItem(item);
    setShowDetails(true);
  };

  // Handle edit item
  const handleEditItem = (item: GoldStock) => {
    setCurrentItem(item);
    setPurity(item.purity);
    setQuantity(item.quantity_in_grams);
    setPrice(item.price_per_gram);
    setDescription(item.description || '');
    setStatus(item.status || 'active');
    setSelectedBranchId(item.branch_id);
    setFormMode('edit');
    setShowForm(true);
  };

  // Handle deactivate item
  const handleDeactivateItem = async (stockId: number) => {
    if (!window.confirm('Are you sure you want to deactivate this gold stock item?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/gold-stock/${stockId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: 'inactive' })
      });

      if (!response.ok) {
        throw new Error('Failed to deactivate gold stock item');
      }

      refreshGoldStockList();
      alert('Gold stock item deactivated successfully');
    } catch (err) {
      console.error('Error deactivating gold stock item:', err);
      alert('Failed to deactivate gold stock item');
    }
  };

  // Handle permanent delete item
  const handlePermanentDelete = async (stockId: number) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY DELETE this gold stock item? This action cannot be undone!')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/gold-stock/${stockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete gold stock item');
      }

      refreshGoldStockList();
      alert('Gold stock item permanently deleted successfully');
    } catch (err) {
      console.error('Error deleting gold stock item:', err);
      alert('Failed to delete gold stock item');
    }
  };

  // Helper function to refresh the gold stock list
  const refreshGoldStockList = async () => {
    try {
      // Refresh the list using the debug endpoint to get all items
      const debugUrl = 'http://localhost:3002/gold-stock/debug';
      console.log('Fetching all gold stock from:', debugUrl);
      const refreshResponse = await fetch(debugUrl);

      if (refreshResponse.ok) {
        const allData = await refreshResponse.json();
        console.log('Fetched all gold stock:', allData);

        // Log each item to debug
        if (allData.data && allData.data.length > 0) {
          console.log('All gold stock items:');
          allData.data.forEach((item: GoldStock, index: number) => {
            console.log(`Item ${index + 1}:`, item);
          });
        } else {
          console.log('No gold stock items returned from API');
        }

        let items = allData.data || [];
        console.log(`Total items before filtering: ${items.length}`);

        // For non-admin users, always filter by branch
        // For admin users, don't filter by branch - they see everything
        if (userRole !== 'admin' && userBranchId) {
          console.log(`Filtering by branch_id: ${userBranchId}, user role: ${userRole}`);
          const filteredItems = items.filter((item: GoldStock) => item.branch_id === userBranchId);
          console.log(`Items after branch filtering: ${filteredItems.length}`);

          // Log items that were filtered out
          const filteredOutItems = items.filter((item: GoldStock) => item.branch_id !== userBranchId);
          if (filteredOutItems.length > 0) {
            console.log('Items filtered out due to branch mismatch:');
            filteredOutItems.forEach((item: GoldStock) => {
              console.log(`- Item ID ${item.stock_id}, Purity: ${item.purity}, Branch: ${item.branch_id}`);
            });
          }

          items = filteredItems;
        } else {
          console.log('No branch filtering applied - admin user sees all branches');
        }

        // Sort by purity
        const sortedItems = items.sort((a: GoldStock, b: GoldStock) => {
          const purities: Record<string, number> = { '24KT': 1, '22KT': 2, '21KT': 3, '18KT': 4, '16KT': 5 };
          return (purities[a.purity] || 6) - (purities[b.purity] || 6);
        });

        console.log(`Final items to display: ${sortedItems.length}`);
        setGoldStock(sortedItems);
      }
    } catch (err) {
      console.error('Error refreshing gold stock list:', err);
    }
  };

  // Handle add new item
  const handleAddNewItem = () => {
    setCurrentItem(null);
    setPurity('');
    setQuantity(0);
    setPrice(0);
    setDescription('');
    setStatus('active');

    // Keep the current branch ID for non-admin users
    if (userRole !== 'admin' && userBranchId) {
      setSelectedBranchId(userBranchId);
    } else if (userRole === 'admin') {
      // Admin needs to select a branch
      setSelectedBranchId(null);
    }

    setFormMode('add');
    setShowForm(true);
  };

  // Handle form submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!purity || quantity < 0 || price < 0 || !selectedBranchId) {
      alert('Please fill all fields with valid values');
      return;
    }

    const itemData = {
      purity,
      quantity_in_grams: quantity,
      price_per_gram: price,
      branch_id: selectedBranchId,
      description,
      status
    };

    console.log('Submitting gold stock data:', itemData);

    try {
      let response;

      if (formMode === 'add') {
        response = await fetch('http://localhost:3002/gold-stock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(itemData)
        });
      } else {
        // Edit mode
        if (!currentItem) {
          throw new Error('No item selected for editing');
        }

        response = await fetch(`http://localhost:3002/gold-stock/${currentItem.stock_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(itemData)
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to ${formMode} gold stock item`);
      }

      // Refresh the gold stock list
      await refreshGoldStockList();

      alert(`Gold stock item ${formMode === 'add' ? 'added' : 'updated'} successfully`);
      setShowForm(false);
    } catch (err) {
      console.error(`Error ${formMode === 'add' ? 'adding' : 'updating'} gold stock item:`, err);
      alert(`Failed to ${formMode} gold stock item`);
    }
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setShowForm(false);
  };

  // Handle close details
  const handleCloseDetails = () => {
    setShowDetails(false);
    setDetailsItem(null);
  };

  // Add status filter state
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all', 'active', 'inactive'

  // Filter gold stock items based on search term, branch filter, and status filter
  const filteredItems = goldStock.filter(item => {
    // Apply search filter
    const matchesSearch =
      item.purity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // Apply branch filter
    const matchesBranch =
      branchFilter === 'All Branches' ||
      item.branch_name === branchFilter ||
      (item.branch_id.toString() === branchFilter);

    // Apply status filter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && item.status === 'active') ||
      (statusFilter === 'inactive' && item.status === 'inactive');

    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Gold Stock Management</h1>

      {/* Gold Stock Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Gold Stock</h2>
          <div className="flex gap-2">
            <button
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-md font-medium flex items-center"
              onClick={handleAddNewItem}
            >
              <Plus size={18} className="mr-1" />
              Add Gold Stock
            </button>
          </div>
        </div>

        {/* Search and Basic Filter */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search gold stock..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              className="border border-gray-300 rounded-md px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* Branch Filter (Admin only) */}
            {userRole === 'admin' && (
              <>
                <select
                  className="border border-gray-300 rounded-md px-3 py-2"
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                >
                  <option value="All Branches">All Branches</option>
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_name}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
                <button
                  className="bg-gray-100 hover:bg-gray-200 p-2 rounded-md"
                  onClick={() => setShowFilters(!showFilters)}
                  title="Advanced Filters"
                >
                  <Filter size={18} />
                </button>
              </>
            )}

            {/* Show current branch for non-admin users */}
            {userRole !== 'admin' && userBranchId && (
              <div className="text-sm text-gray-600">
                Showing items for your branch only
              </div>
            )}
          </div>
        </div>

        {/* Gold Stock Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-yellow-400">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Purity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Quantity (g)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Price per Gram
                </th>
                {userRole === 'admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Branch
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 6 : 5} className="px-6 py-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={userRole === 'admin' ? 6 : 5} className="px-6 py-4 text-center">
                    No gold stock items found
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr
                    key={item.stock_id}
                    className={`hover:bg-gray-50 ${item.status === 'inactive' ? 'bg-gray-100' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {item.purity}
                        {item.status === 'inactive' && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {typeof item.quantity_in_grams === 'number'
                        ? item.quantity_in_grams.toFixed(2)
                        : (parseFloat(item.quantity_in_grams) || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatCurrency(
                        typeof item.price_per_gram === 'number'
                          ? item.price_per_gram
                          : parseFloat(item.price_per_gram) || 0
                      )}
                    </td>
                    {userRole === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.branch_name || `Branch ${item.branch_id}`}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(item.last_updated)}
                    </td>
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
                        {item.status === 'active' ? (
                          <button
                            className="text-red-600 hover:text-red-900"
                            title="Deactivate Item"
                            onClick={() => handleDeactivateItem(item.stock_id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        ) : (
                          <button
                            className="text-red-800 hover:text-red-900"
                            title="Permanently Delete Item"
                            onClick={() => handlePermanentDelete(item.stock_id)}
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {formMode === 'add' ? 'Add New Gold Stock' : 'Edit Gold Stock'}
            </h2>
            <form onSubmit={handleSubmitForm}>
              {/* Purity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purity
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={purity}
                  onChange={(e) => setPurity(e.target.value)}
                  required
                >
                  <option value="">Select Purity</option>
                  <option value="24KT">24KT (99.9% pure)</option>
                  <option value="22KT">22KT (91.6% pure)</option>
                  <option value="21KT">21KT (87.5% pure)</option>
                  <option value="18KT">18KT (75.0% pure)</option>
                  <option value="16KT">16KT (66.6% pure)</option>
                </select>
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (grams)
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={isNaN(quantity) ? '' : quantity}
                  onChange={(e) => setQuantity(e.target.value ? parseFloat(e.target.value) : 0)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Price per Gram */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Gram
                </label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={isNaN(price) ? '' : price}
                  onChange={(e) => setPrice(e.target.value ? parseFloat(e.target.value) : 0)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* Branch (Admin only) */}
              {userRole === 'admin' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={selectedBranchId || ''}
                    onChange={(e) => setSelectedBranchId(e.target.value ? parseInt(e.target.value) : null)}
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches.map(branch => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.branch_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  {formMode === 'add' ? 'Add Gold Stock' : 'Update Gold Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      {showDetails && detailsItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-center">
              Gold Stock Details
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Purity</p>
                <p className="text-base">{detailsItem.purity}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Quantity</p>
                <p className="text-base">
                  {typeof detailsItem.quantity_in_grams === 'number'
                    ? detailsItem.quantity_in_grams.toFixed(2)
                    : (parseFloat(detailsItem.quantity_in_grams) || 0).toFixed(2)} grams
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Price per Gram</p>
                <p className="text-base">
                  {formatCurrency(
                    typeof detailsItem.price_per_gram === 'number'
                      ? detailsItem.price_per_gram
                      : parseFloat(detailsItem.price_per_gram) || 0
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Value</p>
                <p className="text-base">
                  {formatCurrency(
                    (typeof detailsItem.quantity_in_grams === 'number'
                      ? detailsItem.quantity_in_grams
                      : parseFloat(detailsItem.quantity_in_grams) || 0) *
                    (typeof detailsItem.price_per_gram === 'number'
                      ? detailsItem.price_per_gram
                      : parseFloat(detailsItem.price_per_gram) || 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Branch</p>
                <p className="text-base">{detailsItem.branch_name || `Branch ${detailsItem.branch_id}`}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="text-base">{formatDate(detailsItem.last_updated)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-500">Description</p>
                <p className="text-base">{detailsItem.description || 'No description available'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-base capitalize">{detailsItem.status}</p>
              </div>
            </div>

            <div className="flex justify-end mt-4">
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
    </div>
  );
};

export default GoldStockPage;
