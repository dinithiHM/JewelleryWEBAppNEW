"use client";

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, List, PlusCircle, BarChart } from 'lucide-react';

const ManageSalePage = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-8 text-center">Manage Sales</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Sale */}
          <Link href="/DashView/sales/add">
            <div className="bg-yellow-100 p-6 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center cursor-pointer">
              <PlusCircle size={48} className="text-yellow-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Add Sale</h3>
              <p className="text-center text-gray-600">
                Create a new sale transaction and generate invoice
              </p>
            </div>
          </Link>
          
          {/* View Sales */}
          <Link href="/DashView/sales/view">
            <div className="bg-blue-100 p-6 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center cursor-pointer">
              <List size={48} className="text-blue-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">View Sales</h3>
              <p className="text-center text-gray-600">
                View all sales transactions and manage invoices
              </p>
            </div>
          </Link>
          
          {/* Sales Reports */}
          {/* <Link href="/DashView/reports">
            <div className="bg-green-100 p-6 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center cursor-pointer">
              <BarChart size={48} className="text-green-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Sales Reports</h3>
              <p className="text-center text-gray-600">
                View sales reports, analytics and statistics
              </p>
            </div>
          </Link> */}
          
          {/* Inventory */}
          {/* <Link href="/DashView/jewellery-stock">
            <div className="bg-purple-100 p-6 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col items-center cursor-pointer">
              <ShoppingBag size={48} className="text-purple-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">Inventory</h3>
              <p className="text-center text-gray-600">
                Manage jewellery inventory and stock levels
              </p>
            </div>
          </Link> */}
        </div>
      </div>
    </div>
  );
};

export default ManageSalePage;
