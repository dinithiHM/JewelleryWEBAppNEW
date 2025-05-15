"use client";

import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ChartProps {
  selectedCategory: string;
}

interface Supplier {
  supplier_id: string;
  supplier_name: string;
  name?: string;
  category?: string;
  manufacturing_items?: string;
}

interface Order {
  supplier_id: string;
  [key: string]: any;
}

interface ChartDataItem {
  supplier_id: string;
  name: string;
  orderCount: number;
}

const SupplierCategoryChart: React.FC<ChartProps> = ({ selectedCategory }) => {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
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

        let suppliers = await suppliersResponse.json() as Supplier[];
        console.log('Fetched suppliers:', suppliers);

        // Log each supplier's name and ID for debugging
        suppliers.forEach(supplier => {
          console.log(`Supplier ID: ${supplier.supplier_id}, Name: ${supplier.supplier_name || supplier.name || 'No name'}, Category: ${supplier.category || 'No category'}`);
        });

        // Filter suppliers by category if a specific category is selected
        if (selectedCategory !== 'All') {
          suppliers = suppliers.filter(supplier =>
            supplier.category === selectedCategory ||
            (supplier.manufacturing_items && supplier.manufacturing_items.includes(selectedCategory))
          );
          console.log(`Filtered suppliers for category ${selectedCategory}:`, suppliers);
        }

        // Then, fetch all orders to count them manually (with timestamp to prevent caching)
        const ordersResponse = await fetch(`http://localhost:3002/suppliers/check-orders-data?t=${timestamp}`);
        let orders: Order[] = [];

        if (ordersResponse.ok) {
          orders = await ordersResponse.json();
          console.log('Fetched orders:', orders);
        } else {
          console.warn('Could not fetch orders, will show suppliers with zero orders');
        }

        // Count orders for each supplier
        const orderCountMap: Record<string, number> = {};
        if (orders && orders.length > 0) {
          orders.forEach((order: Order) => {
            if (order.supplier_id) {
              orderCountMap[order.supplier_id] = (orderCountMap[order.supplier_id] || 0) + 1;
            }
          });
        }

        console.log('Order counts by supplier:', orderCountMap);

        // Create chart data with real suppliers and their order counts
        const realData: ChartDataItem[] = suppliers.map((supplier: Supplier) => {
          // Get the actual name from the supplier data
          // Check all possible name fields and use the first one that exists
          let supplierName = '';

          if (supplier.name && supplier.name !== '') {
            supplierName = supplier.name;
          } else if (supplier.supplier_name && supplier.supplier_name !== '') {
            supplierName = supplier.supplier_name;
          } else {
            // If no name is found, use a generic name but log this issue
            supplierName = `Unknown Supplier ${supplier.supplier_id}`;
            console.warn(`No name found for supplier with ID ${supplier.supplier_id}`);
          }

          // Log the name we're using
          console.log(`Using name "${supplierName}" for supplier ID ${supplier.supplier_id}`);

          return {
            supplier_id: supplier.supplier_id || 'unknown',
            name: supplierName,
            orderCount: supplier.supplier_id ? (orderCountMap[supplier.supplier_id] || 0) : 0
          };
        });

        // Sort by order count (highest first)
        realData.sort((a: ChartDataItem, b: ChartDataItem) => b.orderCount - a.orderCount);

        // For a specific category, show ALL suppliers in that category
        // For 'All' categories, show suppliers with orders or top suppliers
        let finalData: ChartDataItem[] = [];

        if (selectedCategory !== 'All') {
          // For a specific category, show ALL suppliers regardless of order count
          // This ensures new suppliers are always displayed
          finalData = [...realData];
          console.log(`Showing all ${finalData.length} suppliers in the ${selectedCategory} category`);
        } else {
          // For 'All' categories, show suppliers with orders
          const suppliersWithOrders = realData.filter((item: ChartDataItem) => item.orderCount > 0);

          if (suppliersWithOrders.length > 0) {
            // We have suppliers with orders, show them
            finalData = suppliersWithOrders;
          } else {
            // No suppliers with orders, show top suppliers
            finalData = realData.slice(0, 5);
          }
        }

        console.log('Final chart data:', finalData);

        // Log each item in the final chart data for debugging
        finalData.forEach(item => {
          console.log(`Chart item - ID: ${item.supplier_id}, Name: ${item.name}, Orders: ${item.orderCount}`);
        });

        setChartData(finalData);
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
      <h2 className="text-xl font-bold mb-6 text-center">Leading Supplier Experts by Order Count</h2>
      <div className="text-right mb-2">
        <span className="inline-block bg-yellow-400 w-4 h-4 mr-2"></span>
        <span className="text-sm">{selectedCategory === 'All' ? 'All Categories' : selectedCategory}</span>
      </div>
      <div className="text-center py-10 text-gray-500">
        {selectedCategory ?
          `No suppliers found for ${selectedCategory === 'All' ? 'any category' : `the ${selectedCategory} category`}. Please select a different category or add suppliers for this category.` :
          'Please select a category to see supplier performance'}
      </div>
    </div>;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-6 text-center">Leading Supplier Experts by Order Count</h2>
      <div className="text-right mb-2">
        <span className="inline-block bg-yellow-400 w-4 h-4 mr-2"></span>
        <span className="text-sm">{selectedCategory === 'All' ? 'All Categories' : selectedCategory}</span>
      </div>
      <div className="text-center text-sm text-gray-500 mb-2">
        Showing suppliers ranked by number of orders in {selectedCategory === 'All' ? 'all categories' : `the ${selectedCategory} category`}
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis type="number" domain={[0, 'dataMax + 5']} label={{ value: 'Order Times', position: 'bottom', offset: 0 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              label={{ value: 'Supplier Name', angle: -90, position: 'left' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [`${value} orders`, 'Orders']}
              labelFormatter={(label) => {
                // Find the supplier by name
                const supplier = chartData.find(item => item.name === label);
                if (!supplier) return label;

                // Just return the supplier name as is
                return label;
              }}
            />
            <Bar dataKey="orderCount" fill="#FFDD00" barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SupplierCategoryChart;
