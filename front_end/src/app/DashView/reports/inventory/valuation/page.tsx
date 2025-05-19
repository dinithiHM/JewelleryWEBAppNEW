"use client";

import React, { useState, useEffect } from 'react';
import { PieChart, Filter, Download, Printer, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getInventoryValuationReport, exportReportCSV, exportReportPDF } from '@/services/reportService';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Branch {
  branch_id: number;
  branch_name: string;
}

interface CategoryValuation {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalSellingValue: number;
  totalCostValue: number;
  totalPotentialProfit: number;
}

interface BranchValuation {
  branch_id: number;
  branch_name: string;
  itemCount: number;
  totalQuantity: number;
  totalSellingValue: number;
  totalCostValue: number;
  totalPotentialProfit: number;
}

interface ValuationData {
  branches: Branch[];
  selectedBranch: number | null;
  summary: {
    totalItems: number;
    totalQuantity: number;
    totalSellingValue: number;
    totalCostValue: number;
    totalPotentialProfit: number;
  };
  categories: CategoryValuation[];
  branchValuation: BranchValuation[];
}

// Colors for pie chart
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export default function InventoryValuationReportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [valuationData, setValuationData] = useState<ValuationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch valuation data
  const fetchValuationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params: any = {};
      if (selectedBranch) {
        params.branchId = selectedBranch;
      }

      const data = await getInventoryValuationReport(params);
      setValuationData(data);
    } catch (err) {
      console.error('Error fetching inventory valuation data:', err);
      setError('Failed to load inventory valuation data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on initial load and when branch filter changes
  useEffect(() => {
    fetchValuationData();
  }, [selectedBranch]);

  const handleRefresh = () => {
    fetchValuationData();
  };

  // Prepare category pie chart data
  const prepareCategoryChartData = () => {
    if (!valuationData?.categories) return [];

    // Use filtered categories if a category is selected
    const categoriesToUse = selectedCategory
      ? valuationData.categories.filter(cat => cat.category === selectedCategory)
      : valuationData.categories;

    return categoriesToUse.map(category => ({
      name: category.category,
      value: category.totalSellingValue
    }));
  };

  // Prepare branch pie chart data
  const prepareBranchChartData = () => {
    if (!valuationData?.branchValuation) return [];

    return valuationData.branchValuation.map(branch => ({
      name: branch.branch_name,
      value: branch.totalSellingValue
    }));
  };

  // Calculate profit margin
  const calculateProfitMargin = (sellingValue: number, costValue: number) => {
    if (costValue === 0) return 0;
    return ((sellingValue - costValue) / sellingValue) * 100;
  };

  // Get filtered categories based on selected category
  const getFilteredCategories = () => {
    if (!valuationData?.categories) return [];

    if (!selectedCategory) {
      return valuationData.categories;
    }

    return valuationData.categories.filter(
      category => category.category === selectedCategory
    );
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);

      // Create params object with filters
      const params: any = {};
      if (selectedBranch) {
        params.branchId = selectedBranch;
      }

      // If category filter is active, pass the filtered data directly
      if (selectedCategory) {
        // Store filtered data in window object for CSV generation
        (window as any).filteredValuationData = getFilteredCategories();
        params.useFilteredData = true;
        params.categoryFilter = selectedCategory;
      }

      await exportReportCSV('valuation', params);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export to PDF
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);

      // Create params object with filters
      const params: any = {};
      if (selectedBranch) {
        params.branchId = selectedBranch;
      }

      // If category filter is active, pass the filtered data directly
      if (selectedCategory) {
        // Store filtered data in window object for PDF generation
        (window as any).filteredValuationData = getFilteredCategories();
        params.useFilteredData = true;
        params.categoryFilter = selectedCategory;

        // Store chart data for PDF generation
        (window as any).chartData = prepareCategoryChartData().filter(
          item => item.name === selectedCategory
        );
      } else {
        // Store all chart data
        (window as any).chartData = prepareCategoryChartData();
      }

      await exportReportPDF('valuation', params);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      setError('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <Link href="/DashView/reports/inventory" className="mr-4">
            <ArrowLeft className="h-5 w-5 text-gray-500 hover:text-gray-700" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Valuation Report</h1>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center space-x-3">
          <button
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            onClick={handleRefresh}
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
          <div className="relative inline-block text-left">
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="branch-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <select
              id="branch-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
              value={selectedBranch || ''}
              onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Branches</option>
              {valuationData?.branches.map((branch) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category-filter"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {valuationData?.categories.map((category, index) => (
                <option key={index} value={category.category}>
                  {category.category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : valuationData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Total Items</h3>
                  <p className="text-2xl font-semibold text-gray-900">{valuationData.summary.totalItems}</p>
                  <p className="text-sm text-gray-500">Quantity: {valuationData.summary.totalQuantity}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Total Value</h3>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(valuationData.summary.totalSellingValue)}</p>
                  <p className="text-sm text-gray-500">Cost: {formatCurrency(valuationData.summary.totalCostValue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <PieChart className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5">
                  <h3 className="text-lg font-medium text-gray-900">Potential Profit</h3>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(valuationData.summary.totalPotentialProfit)}</p>
                  <p className="text-sm text-gray-500">
                    Margin: {calculateProfitMargin(valuationData.summary.totalSellingValue, valuationData.summary.totalCostValue).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Category Valuation */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Valuation by Category</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit Margin
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredCategories().map((category, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.itemCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(category.totalSellingValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {calculateProfitMargin(category.totalSellingValue, category.totalCostValue).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="h-80 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={prepareCategoryChartData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {prepareCategoryChartData().map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Branch Valuation (only if no branch filter) */}
          {!selectedBranch && valuationData.branchValuation.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Valuation by Branch</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                <div className="overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-100">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Branch
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {valuationData.branchValuation.map((branch) => (
                        <tr key={branch.branch_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {branch.branch_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {branch.itemCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(branch.totalSellingValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {calculateProfitMargin(branch.totalSellingValue, branch.totalCostValue).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="h-80 bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={prepareBranchChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareBranchChartData().map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">No inventory valuation data available. Please try refreshing.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
