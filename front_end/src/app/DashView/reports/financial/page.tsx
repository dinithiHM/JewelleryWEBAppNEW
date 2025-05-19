"use client";

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  Download,
  RefreshCw,
  CreditCard,
  Building,
  PieChart,
  BarChart2,
  LineChart,
  Percent,
  ShoppingBag,
  Package
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import axios from 'axios';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Define chart colors (gold-themed)
const chartColors = {
  gold: 'rgba(212, 175, 55, 0.7)',
  lightGold: 'rgba(218, 165, 32, 0.7)',
  darkGold: 'rgba(184, 134, 11, 0.7)',
  bronze: 'rgba(205, 127, 50, 0.7)',
  silver: 'rgba(192, 192, 192, 0.7)',
  platinum: 'rgba(229, 228, 226, 0.7)',
  background: 'rgba(255, 248, 220, 0.3)',
  border: 'rgba(184, 134, 11, 1)',
};

export default function FinancialReportPage() {
  // State variables
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [period, setPeriod] = useState('last30');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState('pdf');

  // Format currency
  const formatCurrency = (amount: number) => {
    // Check if amount is a valid number
    if (amount === undefined || amount === null || isNaN(amount)) {
      return 'LKR 0.00';
    }

    // Convert to number to ensure proper formatting
    const numAmount = Number(amount);

    // Format without currency symbol, then add LKR prefix
    return 'LKR ' + new Intl.NumberFormat('en-LK', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numAmount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = { period };
      if (selectedBranchId) params.branchId = selectedBranchId;

      console.log('Fetching financial report with params:', params);
      const response = await axios.get(`http://localhost:3002/api/reports/financial`, { params });
      console.log('Financial report data received:', response.data);

      // Ensure revenue values are numbers and calculate total manually
      if (response.data.revenue) {
        response.data.revenue.sales = Number(response.data.revenue.sales) || 0;
        response.data.revenue.advancePayments = Number(response.data.revenue.advancePayments) || 0;
        response.data.revenue.orders = Number(response.data.revenue.orders) || 0;

        // Calculate total manually to ensure it's correct
        response.data.revenue.total =
          response.data.revenue.sales +
          response.data.revenue.advancePayments +
          response.data.revenue.orders;

        console.log('Revenue components:', {
          sales: response.data.revenue.sales,
          advancePayments: response.data.revenue.advancePayments,
          orders: response.data.revenue.orders,
          calculatedTotal: response.data.revenue.total
        });
      }

      setReportData(response.data);
      setBranches(response.data.branches || []);
    } catch (err: any) {
      console.error('Error fetching financial report:', err);
      setError(err.response?.data?.message || 'Failed to fetch financial report data');
    } finally {
      setLoading(false);
    }
  };

  // Export report
  const exportReport = async (format: string) => {
    try {
      const params: any = {
        reportType: 'financial',
        period,
        format
      };

      if (selectedBranchId) params.branchId = selectedBranchId;

      const response = await axios.get(`http://localhost:3002/api/reports/export`, {
        params,
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Handle CSV download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `financial_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Handle PDF generation (client-side)
        // This would typically use a library like jsPDF or pdfmake
        alert('PDF export functionality would be implemented here');
      }
    } catch (err: any) {
      console.error('Error exporting report:', err);
      alert('Failed to export report');
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchReportData();
  }, [period, selectedBranchId]);

  // Prepare chart data for revenue by day
  const revenueByDayChartData = {
    labels: reportData?.revenueByDay?.map((item: any) => formatDate(item.date)) || [],
    datasets: [
      {
        label: 'Daily Revenue',
        data: reportData?.revenueByDay?.map((item: any) => item.amount) || [],
        borderColor: chartColors.border,
        backgroundColor: chartColors.background,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Prepare chart data for revenue by payment method
  const revenueByPaymentMethodChartData = {
    labels: reportData?.revenueByPaymentMethod?.map((item: any) => item.payment_method) || [],
    datasets: [
      {
        label: 'Revenue by Payment Method',
        data: reportData?.revenueByPaymentMethod?.map((item: any) => item.amount) || [],
        backgroundColor: [
          chartColors.gold,
          chartColors.lightGold,
          chartColors.darkGold,
          chartColors.bronze,
          chartColors.silver,
          chartColors.platinum,
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare chart data for revenue by branch
  const revenueByBranchChartData = {
    labels: reportData?.revenueByBranch?.map((item: any) => item.branch_name) || [],
    datasets: [
      {
        label: 'Revenue by Branch',
        data: reportData?.revenueByBranch?.map((item: any) => item.amount) || [],
        backgroundColor: [
          chartColors.gold,
          chartColors.lightGold,
          chartColors.darkGold,
          chartColors.bronze,
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare chart data for revenue sources
  const revenueSourcesChartData = {
    labels: ['Sales', 'Advance Payments', 'Orders'],
    datasets: [
      {
        label: 'Revenue Sources',
        data: reportData ? [
          reportData.revenue.sales,
          reportData.revenue.advancePayments,
          reportData.revenue.orders
        ] : [],
        backgroundColor: [
          chartColors.gold,
          chartColors.lightGold,
          chartColors.darkGold,
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <TrendingUp className="mr-2 h-6 w-6 text-yellow-600" />
            Financial Report
          </h1>
          <p className="text-gray-600 mt-1">
            Comprehensive financial analysis of your jewelry business
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchReportData()}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center text-sm"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Refresh
          </button>

          <div className="relative">
            <button
              onClick={() => exportReport(exportFormat)}
              className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md flex items-center text-sm"
            >
              <Download className="mr-1 h-4 w-4" />
              Export {exportFormat.toUpperCase()}
            </button>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="absolute right-0 top-0 w-10 h-full opacity-0 cursor-pointer"
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-gray-400" />
            <select
              className="p-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              value={selectedBranchId || ''}
              onChange={(e) => setSelectedBranchId(e.target.value || null)}
            >
              <option value="">All Branches</option>
              {branches.map((branch: any) => (
                <option key={branch.branch_id} value={branch.branch_id}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading and Error States */}
      {loading && (
        <div className="flex justify-center items-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-600"></div>
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Report Content */}
      {!loading && !error && reportData && (
        <div className="space-y-6">
          {/* Revenue Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {(() => {
                  const sales = Number(reportData.revenue?.sales) || 0;
                  const advancePayments = Number(reportData.revenue?.advancePayments) || 0;
                  const orders = Number(reportData.revenue?.orders) || 0;
                  const total = sales + advancePayments + orders;

                  console.log('Frontend revenue calculation:', { sales, advancePayments, orders, total });

                  return formatCurrency(total);
                })()}
              </p>
              <p className="mt-1 text-sm text-gray-600">{reportData.transactions?.total || 0} transactions</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Sales Revenue</h3>
                <ShoppingBag className="h-5 w-5 text-green-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(Number(reportData.revenue?.sales) || 0)}</p>
              <p className="mt-1 text-sm text-gray-600">{reportData.transactions?.sales || 0} sales</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Advance Payments</h3>
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(Number(reportData.revenue?.advancePayments) || 0)}</p>
              <p className="mt-1 text-sm text-gray-600">{reportData.transactions?.advancePayments || 0} payments</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-500">Orders Revenue</h3>
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatCurrency(Number(reportData.revenue?.orders) || 0)}</p>
              <p className="mt-1 text-sm text-gray-600">{reportData.transactions?.orders || 0} orders</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <LineChart className="mr-2 h-5 w-5 text-yellow-600" />
                Revenue Trend
              </h3>
              <div className="h-64">
                {reportData.revenueByDay && reportData.revenueByDay.length > 0 ? (
                  <Line
                    data={revenueByDayChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => formatCurrency(value as number)
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Revenue: ${formatCurrency(context.parsed.y)}`
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No data available for the selected period
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Sources Chart */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <PieChart className="mr-2 h-5 w-5 text-yellow-600" />
                Revenue Sources
              </h3>
              <div className="h-64">
                {reportData.revenue && (
                  reportData.revenue.total > 0 ? (
                    <Pie
                      data={revenueSourcesChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (context) => {
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No revenue data available for the selected period
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Payment Methods Chart */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <BarChart2 className="mr-2 h-5 w-5 text-yellow-600" />
                Revenue by Payment Method
              </h3>
              <div className="h-64">
                {reportData.revenueByPaymentMethod && reportData.revenueByPaymentMethod.length > 0 ? (
                  <Bar
                    data={revenueByPaymentMethodChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => formatCurrency(value as number)
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `Revenue: ${formatCurrency(context.parsed.y)}`
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No payment method data available for the selected period
                  </div>
                )}
              </div>
            </div>

            {/* Branch Revenue Chart */}
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                <Building className="mr-2 h-5 w-5 text-yellow-600" />
                Revenue by Branch
              </h3>
              <div className="h-64">
                {reportData.revenueByBranch && reportData.revenueByBranch.length > 0 ? (
                  <Pie
                    data={revenueByBranchChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.parsed;
                              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const percentage = Math.round((value / total) * 100);
                              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No branch data available for the selected period
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profit Margin Analysis */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <Percent className="mr-2 h-5 w-5 text-yellow-600" />
              Profit Margin Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Total Profit</h4>
                <p className="text-2xl font-semibold text-green-600">{formatCurrency(Number(reportData.profitMargin?.totalProfit) || 0)}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Average Profit Margin</h4>
                <p className="text-2xl font-semibold text-blue-600">
                  {(() => {
                    const avgMargin = Number(reportData.profitMargin?.averageProfitMargin);
                    return !isNaN(avgMargin) ? `${avgMargin.toFixed(2)}%` : '0.00%';
                  })()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
