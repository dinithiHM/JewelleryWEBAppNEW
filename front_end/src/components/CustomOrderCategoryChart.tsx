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

interface Category {
  category_id: number;
  category_name: string;
}

interface Supplier {
  supplier_id: number;
  supplier_name: string;
}

const CustomOrderCategoryChart = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories, suppliers, and order counts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Add a timestamp to prevent caching
        const timestamp = new Date().getTime();

        // Fetch categories
        const categoriesResponse = await fetch(`http://localhost:3002/categories?t=${timestamp}`);
        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }

        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
        console.log('Fetched categories:', categoriesData);

        // Fetch suppliers
        const suppliersResponse = await fetch(`http://localhost:3002/suppliers?t=${timestamp}`);
        if (!suppliersResponse.ok) {
          throw new Error(`Failed to fetch suppliers: ${suppliersResponse.status}`);
        }

        const suppliersData = await suppliersResponse.json();
        setSuppliers(suppliersData);
        console.log('Fetched suppliers:', suppliersData);

        // Fetch supplier order counts by category
        const supplierCountsResponse = await fetch(`http://localhost:3002/categories/supplier-counts?t=${timestamp}`);
        if (!supplierCountsResponse.ok) {
          throw new Error(`Failed to fetch supplier counts: ${supplierCountsResponse.status}`);
        }

        const supplierCountsData = await supplierCountsResponse.json();
        console.log('Fetched supplier counts by category:', supplierCountsData);

        // Create chart data using real order counts
        const chartData = categoriesData.map((category: Category) => {
          const result: any = {
            name: category.category_name,
            categoryId: category.category_id
          };

          // Find this category in the supplier counts data
          const categoryData = supplierCountsData.find(
            (item: any) => item.category_id === category.category_id
          );

          // Add real order counts for each supplier
          suppliersData.forEach((supplier: Supplier) => {
            // Default to 0 orders
            let orderCount = 0;

            // If we have data for this category and this supplier has orders in it
            if (categoryData && categoryData.suppliers) {
              const supplierData = categoryData.suppliers.find(
                (s: any) => s.supplier_id === supplier.supplier_id
              );

              if (supplierData) {
                orderCount = supplierData.order_count;
              }
            }

            result[supplier.supplier_name] = orderCount;
          });

          console.log(`Real data for category ${category.category_name}:`, result);
          return result;
        });

        setChartData(chartData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        Error loading chart: {error}
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        No categories or suppliers available
      </div>
    );
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
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-center">Supplier Order Count by Category</h2>
      <div className="text-center text-sm text-gray-500 mb-4">
        Showing actual order counts for each supplier by category
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
            {suppliers.map((supplier, index) => (
              <Bar
                key={supplier.supplier_id}
                dataKey={supplier.supplier_name}
                fill={colors[index]}
                name={supplier.supplier_name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CustomOrderCategoryChart;
