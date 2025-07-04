"use client";

declare global {
  interface Window {
    chartData?: any[];
    categoryQuantities?: { [key: string]: number };
  }
}

import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Filter, Download, Printer, PieChart as PieChartIcon, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getSalesReport, exportReportCSV, exportReportPDF } from '@/services/reportService';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

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
  paymentMethods: {
    payment_method: string;
    count: number;
    total: number;
  }[];
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Gold-themed colors for the pie chart
const COLORS = ['#D4AF37', '#CFB53B', '#B8860B', '#DAA520', '#FFD700', '#FFC125', '#FFBF00', '#F0E68C'];

export default function SalesByCategoryReportPage() {
  const [dateRange, setDateRange] = useState('last30');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const chartRef = useRef(null);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

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

  // Force re-render of chart when data changes
  useEffect(() => {
    if (salesData && salesData.topCategories && salesData.topCategories.length > 0) {
      // Store chart data in window object for PDF export
      if (typeof window !== 'undefined') {
        // Store chart data for the pie chart
        window.chartData = salesData.topCategories.map(category => ({
          name: category.category_name,
           value: parseFloat(category.totalAmount.toString()) || 0
        }));

        // Store quantity data separately for PDF export
        if (!window.categoryQuantities) {
          window.categoryQuantities = {};
        }
        salesData.topCategories.forEach(category => {
          window.categoryQuantities![category.category_name] = category.totalQuantity;
        });

        // Force a re-render of the chart
        const timer = setTimeout(() => {
          // This empty state update will trigger a re-render
          setSalesData({...salesData});
        }, 100);

        return () => clearTimeout(timer);
      }
    }
  }, [salesData]);

  const handleRefresh = () => {
    fetchSalesData();
  };

  // Prepare chart data for categories
  const prepareCategoryChartData = () => {
    if (!salesData?.topCategories || salesData.topCategories.length === 0) {
      return [{ name: 'No Data', value: 1 }];
    }

    // Parse the totalAmount as a number to ensure it's treated as a numeric value
    return salesData.topCategories.map(category => ({
      name: category.category_name,
      value: parseFloat(category.totalAmount.toString()) || 0
    }));
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      setError(null);
      await exportReportCSV('sales-category', {
        period: dateRange,
        branchId: selectedBranch || undefined
      });
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export report. Please try again.');
    }
  };

  // Handle export to PDF
  const handleExportPDF = async () => {
    try {
      setError(null);
      await exportReportPDF('sales-category', {
        period: dateRange,
        branchId: selectedBranch || undefined
      }, chartRef);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Failed to export report. Please try again.');
    }
  };

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{payload[0].name}</p>
          <p className="text-sm font-bold text-yellow-600">{formatCurrency(payload[0].value)}</p>
          {salesData?.summary?.totalSales && (
            <p className="text-xs text-gray-500 mt-1">
              {((payload[0].value / salesData.summary.totalSales) * 100).toFixed(2)}% of total sales
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <Link href="/DashView/reports/sales" className="mr-4">
          <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Sales by Category Report</h1>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Export Button */}
          <div className="relative inline-block text-left">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </button>
          </div>

          {/* PDF Button */}
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <Printer className="h-4 w-4 mr-1" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
              <h3 className="text-gray-500 text-sm font-medium">Total Sales</h3>
              <p className="text-2xl font-bold mt-1">{formatCurrency(salesData?.summary?.totalSales || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {salesData?.dateRange?.startDate} to {salesData?.dateRange?.endDate}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <h3 className="text-gray-500 text-sm font-medium">Categories</h3>
              <p className="text-2xl font-bold mt-1">{salesData?.topCategories?.length || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Total categories with sales</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
              <h3 className="text-gray-500 text-sm font-medium">Top Category</h3>
              <p className="text-2xl font-bold mt-1">
                {salesData?.topCategories && salesData.topCategories.length > 0
                  ? salesData.topCategories[0].category_name
                  : 'No data'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {salesData?.topCategories && salesData.topCategories.length > 0
                  ? formatCurrency(salesData.topCategories[0].totalAmount)
                  : ''}
              </p>
            </div>
          </div>

          {/* Category Distribution Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Sales Distribution by Category</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%" ref={chartRef}>
                <PieChart>
                  <Pie
                    data={prepareCategoryChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={120}
                    innerRadius={0}
                    paddingAngle={0}
                    fill="#D4AF37"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    isAnimationActive={true}
                  >
                    {prepareCategoryChartData().map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Category Sales Details</h3>
              <span className="text-sm text-gray-500">
                {salesData?.topCategories?.length || 0} categories
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity Sold
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sales Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total Sales
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData?.topCategories?.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No category data available
                      </td>
                    </tr>
                  ) : (
                    salesData?.topCategories?.map((category) => (
                      <tr key={category.category_name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {category.category_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.totalQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(category.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {((category.totalAmount / (salesData?.summary?.totalSales || 1)) * 100).toFixed(2)}%
                        </td>
                      </tr>
                    ))
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
