"use client";

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface ChartProps {
  selectedCategory: string;
  onSupplierSelect?: (supplierId: string, supplierName: string) => void;
}

interface Supplier {
  supplier_id: string;
  name: string; // Primary name field from database
  supplier_name?: string; // For backward compatibility
  category?: string;
  manufacturing_items?: string;
  order_count?: number; // Number of orders for this supplier
}

interface OrderStat {
  supplier_id: string;
  name: string;
  category: string;
  order_count: number;
}

interface ChartDataItem {
  name: string;
  categoryId?: number;
  [key: string]: any;
}

const ImprovedCategoryChart: React.FC<ChartProps> = ({ selectedCategory, onSupplierSelect }) => {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Skip if no category is selected
        if (!selectedCategory) {
          setChartData([]);
          setLoading(false);
          return;
        }

        console.log(`Fetching suppliers for category: ${selectedCategory}`);

        // Add a timestamp to prevent caching and ensure fresh data
        const timestamp = new Date().getTime();

        // First, fetch all suppliers from the database
        const suppliersResponse = await fetch(`http://localhost:3002/suppliers?t=${timestamp}`);
        if (!suppliersResponse.ok) {
          throw new Error(`Failed to fetch suppliers: ${suppliersResponse.status}`);
        }

        let suppliersData = await suppliersResponse.json() as Supplier[];
        console.log('Fetched suppliers:', suppliersData);

        // Filter suppliers by category if a specific category is selected
        if (selectedCategory !== 'All') {
          suppliersData = suppliersData.filter(supplier =>
            supplier.category === selectedCategory ||
            (supplier.manufacturing_items && supplier.manufacturing_items.includes(selectedCategory))
          );
          console.log(`Filtered suppliers for category ${selectedCategory}:`, suppliersData);
        }

        // Fetch actual order counts for suppliers in this category
        const orderStatsResponse = await fetch(`http://localhost:3002/suppliers/actual-orders/${selectedCategory}`);
        if (!orderStatsResponse.ok) {
          throw new Error(`Failed to fetch order stats: ${orderStatsResponse.status}`);
        }

        const orderStatsData = await orderStatsResponse.json() as OrderStat[];
        console.log('Fetched order stats:', orderStatsData);

        // Create a map of supplier ID to order count
        const supplierOrderCounts = new Map<string, number>();
        orderStatsData.forEach((stat: OrderStat) => {
          if (stat.category === selectedCategory) {
            supplierOrderCounts.set(stat.supplier_id.toString(), stat.order_count);
          }
        });

        // Update suppliers with order counts and sort by order count (highest first)
        suppliersData = suppliersData.map(supplier => ({
          ...supplier,
          order_count: supplierOrderCounts.get(supplier.supplier_id.toString()) || 0
        })).sort((a, b) => (b.order_count || 0) - (a.order_count || 0));

        // Store the suppliers for the chart
        setSuppliers(suppliersData);

        // Create chart data for the selected category
        const item: ChartDataItem = {
          name: selectedCategory
        };

        // Add suppliers with their order counts
        suppliersData.forEach(supplier => {
          const supplierName = supplier.name || supplier.supplier_name || `Supplier ${supplier.supplier_id}`;
          item[supplierName] = supplier.order_count || 0;
        });

        const finalChartData = [item];
        console.log('Final chart data:', finalChartData);
        setChartData(finalChartData);
      } catch (err) {
        console.error('Error fetching chart data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data');

        // Fallback to empty data
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading chart: {error}</div>;
  }

  if (chartData.length === 0) {
    return <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-6 text-center">Supplier Order Counts by Category</h2>
      <div className="text-right mb-2">
        <span className="inline-block bg-yellow-400 w-4 h-4 mr-2"></span>
        <span className="text-sm">{selectedCategory === 'All' ? 'All Categories' : selectedCategory}</span>
      </div>
      <div className="text-center py-10 text-gray-500">
        {selectedCategory ?
          `No order data found for ${selectedCategory === 'All' ? 'any category' : `the ${selectedCategory} category`}. Please select a different category or check if there are orders for this category.` :
          'Please select a category to see supplier order counts'}
      </div>
    </div>;
  }

  // Generate colors for suppliers
  const colors = suppliers.map((_, index) => {
    const colorPalette = [
      '#FFDD00', // Yellow
      '#FFB347', // Pastel Orange
      '#FF6B6B', // Light Red
      '#4ECDC4', // Turquoise
      '#7FB800', // Apple Green
      '#9D81BA', // Light Purple
      '#FF8066', // Salmon
      '#45B7D1', // Sky Blue
      '#EF798A', // Pink
      '#7D82B8'  // Periwinkle
    ];
    return colorPalette[index % colorPalette.length];
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-6 text-center">Supplier Order Counts by Category</h2>

      <div className="text-right mb-2">
        <span className="inline-block bg-yellow-400 w-4 h-4 mr-2"></span>
        <span className="text-sm">{selectedCategory === 'All' ? 'All Categories' : selectedCategory}</span>
      </div>

      <div className="text-center text-sm text-gray-500 mb-4">
        Showing supplier order counts for {selectedCategory === 'All' ? 'all categories' : `the ${selectedCategory} category`}
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis label={{ value: 'Order Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend wrapperStyle={{ bottom: 0 }} />
            {suppliers.map((supplier, index) => {
              const supplierName = supplier.name || supplier.supplier_name || `Supplier ${supplier.supplier_id}`;
              return (
                <Bar
                  key={supplier.supplier_id}
                  dataKey={supplierName}
                  fill={colors[index]}
                  name={supplierName}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImprovedCategoryChart;
