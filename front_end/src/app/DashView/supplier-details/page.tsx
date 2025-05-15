"use client";

import React, { useState, useEffect } from 'react';
import SupplierCategoryChart from '@/components/SupplierCategoryChart';
import { ChevronDown } from 'lucide-react';

interface Supplier {
  id: number;
  supplier_id: string;
  name: string;
  address: string;
  contact_no: string;
  manufacturing_items: string;
  category: string;
}

const SupplierDetailsPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoading(true);
        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const response = await fetch(`http://localhost:3002/suppliers?t=${timestamp}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch suppliers: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setSuppliers(data);

          // Fetch categories from the database
          try {
            const categoriesResponse = await fetch(`http://localhost:3002/categories?t=${timestamp}`);
            if (categoriesResponse.ok) {
              const categoriesData = await categoriesResponse.json();

              // Create an array with 'All' as the first option, followed by category names
              const categoryNames = ['All', ...categoriesData.map((cat: any) => cat.category_name)];
              setCategories(categoryNames);
            } else {
              console.error('Failed to fetch categories');

              // Fallback: Extract unique categories from suppliers
              const uniqueCategories = new Set<string>();
              uniqueCategories.add('All'); // Add 'All' as default option

              data.forEach((supplier) => {
                if (supplier.category) {
                  uniqueCategories.add(supplier.category);
                }
              });

              setCategories(Array.from(uniqueCategories));
            }
          } catch (error) {
            console.error('Error fetching categories:', error);

            // Fallback: Extract unique categories from suppliers
            const uniqueCategories = new Set<string>();
            uniqueCategories.add('All'); // Add 'All' as default option

            data.forEach((supplier) => {
              if (supplier.category) {
                uniqueCategories.add(supplier.category);
              }
            });

            setCategories(Array.from(uniqueCategories));
          }
        } else {
          throw new Error("Unexpected data format");
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch suppliers");
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Supplier Details Table */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Supplier Details</h2>
          <button className="bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-full font-medium">
            Add new Supplier
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {supplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {supplier.supplier_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {supplier.address}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {supplier.contact_no}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {supplier.category || 'Not specified'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Selection and Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-8">
          <div className="flex items-center">
            <h3 className="text-xl font-medium mr-4">Select Category</h3>
            <div className="relative">
              <select
                className="appearance-none bg-gray-100 border border-gray-300 rounded-md py-2 pl-4 pr-10 text-gray-700 leading-tight focus:outline-none focus:bg-white focus:border-yellow-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Category Chart - with key to force re-render when category changes */}
        <SupplierCategoryChart
          key={`supplier-chart-${selectedCategory}-${new Date().getTime()}`}
          selectedCategory={selectedCategory}
        />
      </div>
    </div>
  );
};

export default SupplierDetailsPage;
