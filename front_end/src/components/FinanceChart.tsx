"use client";

import { useState, useEffect } from "react";
// import Image from "next/image";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Menu, ChevronDown, Calendar, BarChart2, LineChart as LineChartIcon } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

// Define types for finance data
interface Branch {
  id: number;
  name: string;
}

interface ChartDataPoint {
  name: string;
  date: string;
  income: number;
  expense: number;
  [key: string]: any; // For branch-specific data like branch_1, branch_2, etc.
}

interface FinanceData {
  chartData: ChartDataPoint[];
  branches: Branch[];
}

const FinanceChart = () => {
  // State for finance data
  const [financeData, setFinanceData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [period, setPeriod] = useState<'daily' | 'monthly'>('monthly');
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Calculate current year and month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed

  // Fetch finance data
  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        // Construct URL with query parameters
        let url = `http://localhost:3002/sales/finance?period=${period}`;

        if (selectedBranch) {
          url += `&branch_id=${selectedBranch}`;
        }

        // If period is daily, include current month
        if (period === 'daily') {
          url += `&year=${currentYear}&month=${currentMonth}`;
        } else {
          url += `&year=${currentYear}`;
        }

        console.log('Fetching finance data from:', url);

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch finance data: ${response.status}`);
        }

        const data = await response.json();
        console.log('Finance data received:', data);

        setFinanceData(data);
      } catch (err) {
        console.error('Error fetching finance data:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [period, selectedBranch, currentYear, currentMonth]);

  // Calculate totals
  const totalIncome = financeData?.chartData.reduce((sum, item) => sum + (typeof item.income === 'string' ? parseFloat(item.income) : item.income), 0) || 0;
  const totalExpense = financeData?.chartData.reduce((sum, item) => sum + (typeof item.expense === 'string' ? parseFloat(item.expense) : item.expense), 0) || 0;
  const profit = totalIncome - totalExpense;

  // Toggle filter menu
  const toggleFilterMenu = () => setShowFilterMenu(!showFilterMenu);

  // Format currency for tooltip
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(typeof entry.value === 'string' ? parseFloat(entry.value) : entry.value)}
            </p>
          ))}

          {/* Show branch breakdown if available */}
          {payload[0].payload.branch_1 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="font-semibold text-xs">Branch Breakdown:</p>
              <p className="text-xs">
                {payload[0].payload.branch_1_name}: {formatCurrency(typeof payload[0].payload.branch_1 === 'string' ? parseFloat(payload[0].payload.branch_1) : payload[0].payload.branch_1)}
              </p>
              {payload[0].payload.branch_2 && (
                <p className="text-xs">
                  {payload[0].payload.branch_2_name}: {formatCurrency(typeof payload[0].payload.branch_2 === 'string' ? parseFloat(payload[0].payload.branch_2) : payload[0].payload.branch_2)}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#FFF6BD] rounded-xl w-full h-full p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-bold text-black">Finance</h1>
          <p className="text-sm text-gray-600">
            {period === 'monthly' ? 'Monthly' : 'Daily'} Overview - {currentYear}
            {period === 'daily' && ` (${new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long' })})`}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={toggleFilterMenu}
            className="flex items-center bg-white rounded-md px-3 py-1 shadow-sm hover:bg-gray-50"
          >
            <Menu size={16} className="mr-1" />
            Options
            <ChevronDown size={16} className="ml-1" />
          </button>

          {showFilterMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">Time Period</p>
                <div className="flex flex-col space-y-1">
                  <button
                    className={`flex items-center px-3 py-1 rounded-md text-left text-sm ${period === 'monthly' ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setPeriod('monthly')}
                  >
                    <Calendar size={14} className="mr-2" />
                    Monthly
                  </button>
                  <button
                    className={`flex items-center px-3 py-1 rounded-md text-left text-sm ${period === 'daily' ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setPeriod('daily')}
                  >
                    <Calendar size={14} className="mr-2" />
                    Daily
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 p-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">Branch</p>
                <div className="flex flex-col space-y-1">
                  <button
                    className={`px-3 py-1 rounded-md text-left text-sm ${selectedBranch === null ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setSelectedBranch(null)}
                  >
                    All Branches
                  </button>
                  {financeData?.branches.map(branch => (
                    <button
                      key={branch.id}
                      className={`px-3 py-1 rounded-md text-left text-sm ${selectedBranch === branch.id ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                      onClick={() => setSelectedBranch(branch.id)}
                    >
                      {branch.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 p-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">Chart Type</p>
                <div className="flex flex-col space-y-1">
                  <button
                    className={`flex items-center px-3 py-1 rounded-md text-left text-sm ${chartType === 'line' ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setChartType('line')}
                  >
                    <LineChartIcon size={14} className="mr-2" />
                    Line Chart
                  </button>
                  <button
                    className={`flex items-center px-3 py-1 rounded-md text-left text-sm ${chartType === 'bar' ? 'bg-yellow-100' : 'hover:bg-gray-100'}`}
                    onClick={() => setChartType('bar')}
                  >
                    <BarChart2 size={14} className="mr-2" />
                    Bar Chart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white p-2 rounded-md shadow-sm">
          <p className="text-xs text-gray-500">Total Income</p>
          <p className="text-lg font-bold">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white p-2 rounded-md shadow-sm">
          <p className="text-xs text-gray-500">Total Expenses</p>
          <p className="text-lg font-bold">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white p-2 rounded-md shadow-sm">
          <p className="text-xs text-gray-500">Net Profit</p>
          <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(profit)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'line' ? (
            <LineChart
              data={financeData?.chartData || []}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tick={{ fill: "#000000" }}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#000000" }}
                tickLine={false}
                tickMargin={20}
                tickFormatter={formatTooltipValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                align="center"
                verticalAlign="top"
                wrapperStyle={{ paddingTop: "10px", paddingBottom: "10px" }}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#D4AF37" // Metallic gold
                strokeWidth={3}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expense"
                stroke="#B8860B" // Dark goldenrod
                strokeWidth={3}
              />
            </LineChart>
          ) : (
            <BarChart
              data={financeData?.chartData || []}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tick={{ fill: "#000000" }}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tick={{ fill: "#000000" }}
                tickLine={false}
                tickMargin={20}
                tickFormatter={formatTooltipValue}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                align="center"
                verticalAlign="top"
                wrapperStyle={{ paddingTop: "10px", paddingBottom: "10px" }}
              />
              <Bar dataKey="income" name="Income" fill="#D4AF37" radius={[4, 4, 0, 0]} /> {/* Metallic gold */}
              <Bar dataKey="expense" name="Expense" fill="#B8860B" radius={[4, 4, 0, 0]} /> {/* Dark goldenrod */}
            </BarChart>
          )}
        </ResponsiveContainer>
      )}

      {/* Branch Breakdown */}
      {!loading && !error && !selectedBranch && financeData && financeData.branches.length > 1 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Branch Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {financeData?.branches.map(branch => {
              const branchKey = `branch_${branch.id}`;
              // Calculate the total for this branch across all periods
              const branchTotal = financeData?.chartData.reduce(
                (sum, item) => {
                  const value = item[branchKey];
                  return sum + (value ? (typeof value === 'string' ? parseFloat(value) : value) : 0);
                },
                0
              );

              // Calculate branch percentages correctly
              // We need to sum up all branch totals first to get the actual total
              const allBranchesTotals = financeData.branches.reduce((total, b) => {
                const bKey = `branch_${b.id}`;
                const bTotal = financeData.chartData.reduce(
                  (sum, item) => {
                    const value = item[bKey];
                    return sum + (value ? (typeof value === 'string' ? parseFloat(value) : value) : 0);
                  },
                  0
                );
                return total + bTotal;
              }, 0);

              // Now calculate the percentage based on the sum of all branch totals
              const percentage = allBranchesTotals > 0
                ? Math.round((branchTotal / allBranchesTotals) * 100)
                : 0;

              return (
                <div key={branch.id} className="bg-white p-3 rounded-md shadow-sm">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-sm text-gray-500">{percentage}%</p>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(branchTotal)}</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-[#D4AF37] h-2 rounded-full" /* Metallic gold */
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinanceChart;
