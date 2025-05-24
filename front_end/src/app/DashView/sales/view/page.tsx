"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Search, Filter, Download, Printer } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';

interface Sale {
  sale_id: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  invoice_number: string | null;
  user_id?: number;
  cashier_first_name?: string;
  cashier_last_name?: string;
  branch_id?: number;
  branch_name?: string;
}

const ViewSalesPage = () => {
  const router = useRouter();

  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSalesCount, setTotalSalesCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);

  // Filtering and search
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch sales data
  useEffect(() => {
    const fetchSales = async () => {
      try {
        setLoading(true);
        setLoadingCount(true);

        // Get user role and ID from localStorage
        const userRole = localStorage.getItem('role');
        const userId = localStorage.getItem('userId');
        const branchId = localStorage.getItem('branchId');

        console.log('Current user role:', userRole);
        console.log('Current user ID:', userId);
        console.log('Current branch ID:', branchId);

        // Construct URL based on role and branch
        let url = 'http://localhost:3002/sales';
        const queryParams = [];

        // If user is a cashier, only show their own sales
        if (userRole === 'Cashier' && userId) {
          queryParams.push(`user_id=${userId}`);
        }

        // Filter by branch_id for all non-admin users
        if (userRole !== 'Admin' && branchId) {
          queryParams.push(`branch_id=${branchId}`);
        }

        // Add query parameters to URL
        if (queryParams.length > 0) {
          url += '?' + queryParams.join('&');
        }

        console.log('Filtering sales by branch_id:', branchId);

        // Fetch total count first
        let countUrl = 'http://localhost:3002/sales/count';
        const countQueryParams = [];

        // Apply the same filters to the count endpoint
        if (userRole === 'Cashier' && userId) {
          countQueryParams.push(`user_id=${userId}`);
        }

        if (userRole !== 'Admin' && branchId) {
          countQueryParams.push(`branch_id=${branchId}`);
        }

        if (countQueryParams.length > 0) {
          countUrl += '?' + countQueryParams.join('&');
        }

        console.log('Fetching sales count from:', countUrl);
        const countResponse = await fetch(countUrl);

        if (countResponse.ok) {
          const countData = await countResponse.json();
          console.log('Sales count received:', countData);
          setTotalSalesCount(countData.total);
        } else {
          console.error('Failed to fetch sales count');
        }

        setLoadingCount(false);

        // Now fetch the sales data
        console.log('Fetching sales from:', url);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch sales: ${response.status}`);
        }

        const data = await response.json();
        console.log('Sales data received:', data);
        setSales(data);
      } catch (err) {
        console.error('Error fetching sales:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');

        // Use sample data for development
        setSales([
          {
            sale_id: 1,
            customer_name: 'John Smith',
            total_amount: 22000,
            payment_method: 'Cash',
            sale_date: '2024-11-01 14:30:00',
            invoice_number: 'INV-2024-001'
          },
          {
            sale_id: 2,
            customer_name: 'Mary Johnson',
            total_amount: 9000,
            payment_method: 'Credit Card',
            sale_date: '2024-11-02 10:15:00',
            invoice_number: 'INV-2024-002'
          },
          {
            sale_id: 3,
            customer_name: 'Robert Brown',
            total_amount: 4700,
            payment_method: 'Debit Card',
            sale_date: '2024-11-03 16:45:00',
            invoice_number: 'INV-2024-003'
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  // Get unique payment methods
  const paymentMethods = ['all', ...new Set(sales.map(sale => sale.payment_method))];

  // Filter sales based on search term and filters
  const filteredSales = sales.filter(sale => {
    // Apply search term
    if (searchTerm && !sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !sale.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Apply payment method filter
    if (paymentFilter !== 'all' && sale.payment_method !== paymentFilter) {
      return false;
    }

    // Apply date filter
    if (dateFilter === 'custom') {
      const saleDate = new Date(sale.sale_date);

      if (startDate && new Date(startDate) > saleDate) {
        return false;
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59);
        if (endDateTime < saleDate) {
          return false;
        }
      }
    } else if (dateFilter !== 'all') {
      const saleDate = new Date(sale.sale_date);
      const today = new Date();

      if (dateFilter === 'today') {
        return saleDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return saleDate.toDateString() === yesterday.toDateString();
      } else if (dateFilter === 'thisWeek') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return saleDate >= startOfWeek;
      } else if (dateFilter === 'thisMonth') {
        return saleDate.getMonth() === today.getMonth() && saleDate.getFullYear() === today.getFullYear();
      }
    }

    return true;
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };

  // Handle view sale details
  const handleViewSale = (saleId: number) => {
    router.push(`/DashView/sales/details/${saleId}`);
  };

  // Handle add new sale
  const handleAddSale = () => {
    router.push('/DashView/sales/add');
  };

  // Handle generate invoice
  const handleGenerateInvoice = async (saleId: number) => {
    try {
      const response = await fetch(`http://localhost:3002/sales/generate-invoice/${saleId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      const result = await response.json();
      alert(`Invoice generated: ${result.invoice_number}`);

      // Refresh sales data
      // Get user role, ID, and branch from localStorage
      const userRole = localStorage.getItem('role');
      const userId = localStorage.getItem('userId');
      const branchId = localStorage.getItem('branchId');

      // Refresh the count first
      setLoadingCount(true);
      let countUrl = 'http://localhost:3002/sales/count';
      const countQueryParams = [];

      // Apply the same filters to the count endpoint
      if (userRole === 'Cashier' && userId) {
        countQueryParams.push(`user_id=${userId}`);
      }

      if (userRole !== 'Admin' && branchId) {
        countQueryParams.push(`branch_id=${branchId}`);
      }

      if (countQueryParams.length > 0) {
        countUrl += '?' + countQueryParams.join('&');
      }

      const countResponse = await fetch(countUrl);
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setTotalSalesCount(countData.total);
      }
      setLoadingCount(false);

      // Now refresh the sales data
      // Construct URL based on role and branch
      let refreshUrl = 'http://localhost:3002/sales';
      const queryParams = [];

      // If user is a cashier, only show their own sales
      if (userRole === 'Cashier' && userId) {
        queryParams.push(`user_id=${userId}`);
      }

      // Filter by branch_id for all non-admin users
      if (userRole !== 'Admin' && branchId) {
        queryParams.push(`branch_id=${branchId}`);
      }

      // Add query parameters to URL
      if (queryParams.length > 0) {
        refreshUrl += '?' + queryParams.join('&');
      }

      const salesResponse = await fetch(refreshUrl);
      if (salesResponse.ok) {
        const data = await salesResponse.json();
        setSales(data);
      }
    } catch (err) {
      console.error('Error generating invoice:', err);
      alert('Failed to generate invoice');
    }
  };

  // Calculate total sales amount
  const totalSalesAmount = filteredSales.reduce((sum, sale) => {
    // Ensure total_amount is a number
    const amount = typeof sale.total_amount === 'string'
      ? parseFloat(sale.total_amount)
      : sale.total_amount;

    // Log each sale amount for debugging
    console.log(`Sale ID: ${sale.sale_id}, Amount: ${amount}, Running Total: ${sum + amount}`);

    return sum + amount;
  }, 0);

  // Log the final total
  console.log('Total Sales Amount:', totalSalesAmount);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Sales</h2>
          <button
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-full font-medium"
            onClick={handleAddSale}
          >
            Add New Sale
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by customer or invoice..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Payment Method Filter */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-md"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method === 'all' ? 'All Payment Methods' : method}
                </option>
              ))}
            </select>

            {/* Date Filter */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-md"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="flex gap-2">
                <input
                  type="date"
                  className="px-4 py-2 border border-gray-300 rounded-md"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="self-center">to</span>
                <input
                  type="date"
                  className="px-4 py-2 border border-gray-300 rounded-md"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}

            <button className="p-2 border border-gray-300 rounded-md">
              <Filter size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Sales Summary */}
        <div className="bg-gray-100 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold">Total Sales Amount</h3>
              <p className="text-2xl font-bold">{formatCurrency(totalSalesAmount)}</p>
            </div>
            <div>
              <h3 className="font-bold">Number of Sales</h3>
              {loadingCount ? (
                <p className="text-2xl font-bold">Loading...</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{totalSalesCount}</p>
                  {filteredSales.length !== totalSalesCount && (
                    <p className="text-xs text-gray-500">Showing {filteredSales.length} filtered sales</p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button className="bg-white p-2 rounded-md border border-gray-300">
                <Printer size={20} className="text-gray-700" />
              </button>
              <button className="bg-white p-2 rounded-md border border-gray-300">
                <Download size={20} className="text-gray-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  {localStorage.getItem('role') === 'Admin' && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Branch
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cashier
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={localStorage.getItem('role') === 'Admin' ? 9 : 7} className="px-6 py-4 text-center text-gray-500">
                      No sales found
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.sale_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        #{sale.sale_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sale.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatCurrency(sale.total_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sale.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sale.sale_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {sale.invoice_number || (
                          <button
                            className="text-blue-600 hover:text-blue-900 text-sm"
                            onClick={() => handleGenerateInvoice(sale.sale_id)}
                          >
                            Generate
                          </button>
                        )}
                      </td>
                      {localStorage.getItem('role') === 'Admin' && (
                        <>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {sale.branch_name || `Branch ${sale.branch_id}` || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {sale.cashier_first_name && sale.cashier_last_name
                              ? `${sale.cashier_first_name} ${sale.cashier_last_name}`
                              : (sale.user_id ? `User ${sale.user_id}` : 'N/A')}
                          </td>
                        </>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                          onClick={() => handleViewSale(sale.sale_id)}
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewSalesPage;
