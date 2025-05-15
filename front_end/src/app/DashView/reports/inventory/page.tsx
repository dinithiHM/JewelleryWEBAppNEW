"use client";

import React, { useState, useEffect } from 'react';
import { Package, Filter, Download, Printer, BarChart, PieChart, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getInventoryReport } from '@/services/reportService';

interface GoldStockItem {
  purity: string;
  weight: number;
  value: number;
}

interface CategoryItem {
  category_name: string;
  count: number;
  value: number;
}

interface InventoryData {
  summary: {
    totalItems: number;
    totalValue: number;
  };
  lowStockItems: {
    item_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    category_name: string;
  }[];
  goldStock: {
    items: GoldStockItem[];
    total: number;
    totalValue: number;
  };
  inventoryByCategory: CategoryItem[];
}

export default function InventoryReportsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [inventoryData, setInventoryData] = useState<InventoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Report types
  const reportTypes = [
    {
      name: 'Current Stock',
      path: '/DashView/reports/inventory/current-stock',
      description: 'Complete inventory with quantities and values',
      icon: <Package className="w-5 h-5" />
    },
    {
      name: 'Gold Inventory',
      path: '/DashView/reports/inventory/gold-stock',
      description: 'Gold stock by purity and weight',
      icon: <BarChart className="w-5 h-5" />
    },
    {
      name: 'Low Stock Items',
      path: '/DashView/reports/inventory/low-stock',
      description: 'Products that need to be restocked soon',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    {
      name: 'Inventory Valuation',
      path: '/DashView/reports/inventory/valuation',
      description: 'Total value of current inventory',
      icon: <PieChart className="w-5 h-5" />
    },
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch inventory data
  const fetchInventoryData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await getInventoryReport();
      setInventoryData(data);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
      setError('Failed to load inventory data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data on initial load
  useEffect(() => {
    fetchInventoryData();
  }, []);

  const handleRefresh = () => {
    fetchInventoryData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>

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
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : inventoryData ? (
        <>
          {/* Inventory Overview */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Inventory Overview</h3>
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
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-green-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-green-800 truncate">Total Items</dt>
                  <dd className="mt-1 text-3xl font-semibold text-green-900">
                    {inventoryData.summary.totalItems}
                  </dd>
                  <dd className="mt-3 text-sm text-green-700">
                    In stock
                  </dd>
                </div>

                <div className="bg-blue-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-blue-800 truncate">Total Value</dt>
                  <dd className="mt-1 text-3xl font-semibold text-blue-900">
                    {formatCurrency(inventoryData.summary.totalValue)}
                  </dd>
                  <dd className="mt-3 text-sm text-blue-700">
                    At current prices
                  </dd>
                </div>

                <div className="bg-yellow-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-yellow-800 truncate">Gold Stock</dt>
                  <dd className="mt-1 text-3xl font-semibold text-yellow-900">
                    {inventoryData.goldStock.total}g
                  </dd>
                  <dd className="mt-3 text-sm text-yellow-700">
                    Across all purities
                  </dd>
                </div>

                <div className="bg-red-50 px-4 py-5 sm:p-6 rounded-lg">
                  <dt className="text-sm font-medium text-red-800 truncate">Low Stock Items</dt>
                  <dd className="mt-1 text-3xl font-semibold text-red-900">
                    {inventoryData.lowStockItems.length}
                  </dd>
                  <dd className="mt-3 text-sm text-red-700">
                    Need attention
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Gold Stock Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Gold Stock by Purity</h3>
              <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="h-3 w-3 mr-1" />
                Filter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gold Purity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weight (g)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.goldStock.items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No gold stock data available
                      </td>
                    </tr>
                  ) : (
                    inventoryData.goldStock.items.map((item) => (
                      <tr key={item.purity} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.purity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.weight}g
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {((item.weight / inventoryData.goldStock.total) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Inventory by Category</h3>
            </div>
            <div className="overflow-x-auto">
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
                      % of Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inventoryData.inventoryByCategory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        No category data available
                      </td>
                    </tr>
                  ) : (
                    inventoryData.inventoryByCategory.map((category) => (
                      <tr key={category.category_name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {category.category_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {category.count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(category.value)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {((category.value / inventoryData.summary.totalValue) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">No inventory data available. Please try refreshing.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
