"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Printer, BarChart, PieChart, LineChart, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getSalesReport } from '@/services/reportService';

interface SalesData {
  summary: {
    totalSales: number;
    totalTransactions: number;
    averageOrderValue: number;
  };
  salesByDay: {
    date: string;
    amount: number;
    transactions: number;
  }[];
  topCategories: {
    category_name: string;
    totalQuantity: number;
    totalAmount: number;
  }[];
  topProducts: {
    item_name: string;
    totalQuantity: number;
    totalAmount: number;
  }[];
  recentSales: {
    sale_id: number;
    customer_name: string;
    total_amount: number;
    payment_method: string;
    sale_date: string;
    branch_id: number;
    branch_name: string;
  }[];
  branches: {
    branch_id: number;
    branch_name: string;
  }[];
}

export default function SalesReportsPage() {
  const [dateRange, setDateRange] = useState('last30');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Report types
  const reportTypes = [
    {
      name: 'Daily Sales',
      path: '/DashView/reports/sales/daily',
      description: 'View sales data for each day with detailed breakdowns',
      icon: <BarChart className="w-5 h-5" />
    },
    {
      name: 'Monthly Sales',
      path: '/DashView/reports/sales/monthly',
      description: 'Monthly sales trends and comparisons',
      icon: <LineChart className="w-5 h-5" />
    },
    {
      name: 'Sales by Category',
      path: '/DashView/reports/sales/by-category',
      description: 'Sales distribution across different product categories',
      icon: <PieChart className="w-5 h-5" />
    },
    {
      name: 'Sales by Branch',
      path: '/DashView/reports/sales/by-branch',
      description: 'Compare performance across different store locations',
      icon: <BarChart className="w-5 h-5" />
    },
  ];

  // Fetch sales data
  const fetchSalesData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params: any = { period: dateRange };
      if (selectedBranch) {
        params.branchId = selectedBranch;
      }

      // Use the reportService to fetch data with authentication
      const data = await getSalesReport(params);
      setSalesData(data);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Failed to load sales data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on initial load and when filters change
  useEffect(() => {
    fetchSalesData();
  }, [dateRange, selectedBranch]);

  const handleRefresh = () => {
    fetchSalesData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>

        <div className="mt-3 sm:mt-0 flex items-center space-x-3">
          {/* Branch Filter */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All Branches</option>
              {salesData?.branches?.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          {/* Date Range Filter */}
          <div className="relative">
            <select
              className="appearance-none pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
            <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>

          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {isLoading && !salesData ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Report Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTypes.map((report) => (
              <Link
                key={report.name}
                href={report.path}
                className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                      {report.icon}
                    </div>
                    <div className="ml-5">
                      <h3 className="text-lg font-medium text-gray-900">{report.name}</h3>
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Sales Overview */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Sales Overview</h3>
              <div className="flex space-x-2">
                <button className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4" />
                </button>
                <button className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-yellow-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-yellow-800 truncate">Total Sales</dt>
                  <dd className="mt-1 text-3xl font-semibold text-yellow-900">
                    LKR {salesData?.summary?.totalSales?.toLocaleString() || '0.00'}
                  </dd>
                  <dd className="mt-3 text-sm text-yellow-700">
                    {salesData?.summary?.totalTransactions || 0} transactions
                  </dd>
                </div>

                <div className="bg-blue-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-blue-800 truncate">Average Order Value</dt>
                  <dd className="mt-1 text-3xl font-semibold text-blue-900">
                    LKR {salesData?.summary?.averageOrderValue?.toLocaleString() || '0.00'}
                  </dd>
                  <dd className="mt-3 text-sm text-blue-700">
                    Per transaction
                  </dd>
                </div>

                <div className="bg-green-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-green-800 truncate">Top Selling Category</dt>
                  <dd className="mt-1 text-2xl font-semibold text-green-900">
                    {salesData?.topCategories?.[0]?.category_name || 'No data'}
                  </dd>
                  <dd className="mt-3 text-sm text-green-700">
                    Best product: {salesData?.topProducts?.[0]?.item_name || 'No data'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Recent Sales Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Sales</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sale ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Branch
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData?.recentSales?.map((sale) => (
                    <tr key={sale.sale_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.sale_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sale.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        LKR {sale.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sale.branch_name}
                      </td>
                    </tr>
                  ))}

                  {(!salesData?.recentSales || salesData.recentSales.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No sales data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sales by Day Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Sales by Day</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData?.salesByDay?.map((day) => (
                    <tr key={day.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        LKR {day.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {day.transactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        LKR {(day.amount / day.transactions).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {(!salesData?.salesByDay || salesData.salesByDay.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No daily sales data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
