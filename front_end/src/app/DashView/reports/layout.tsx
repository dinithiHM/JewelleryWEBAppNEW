"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, BarChart2, DollarSign, Package, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  
  // Report categories
  const reportCategories = [
    { 
      name: 'Sales Reports', 
      icon: <DollarSign className="w-5 h-5" />, 
      path: '/DashView/reports/sales',
      description: 'Sales performance by period, product, branch, and employee'
    },
    { 
      name: 'Inventory Reports', 
      icon: <Package className="w-5 h-5" />, 
      path: '/DashView/reports/inventory',
      description: 'Stock levels, valuation, and gold inventory analysis'
    },
    { 
      name: 'Financial Reports', 
      icon: <TrendingUp className="w-5 h-5" />, 
      path: '/DashView/reports/financial',
      description: 'Revenue, profit margins, and payment analysis'
    },
    // { 
    //   name: 'Customer Reports', 
    //   icon: <Users className="w-5 h-5" />, 
    //   path: '/DashView/reports/customer',
    //   description: 'Customer purchase history and outstanding payments'
    // },
    // { 
    //   name: 'Custom Reports', 
    //   icon: <FileText className="w-5 h-5" />, 
    //   path: '/DashView/reports/custom',
    //   description: 'Build your own custom reports'
    // },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart2 className="mr-2" /> Reports Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate and view comprehensive reports for your jewelry business
          </p>
        </div>
      </div>
      
      <div className="flex-grow flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-white shadow-md md:min-h-screen p-4">
          <nav className="space-y-1">
            {reportCategories.map((category) => (
              <Link 
                key={category.name}
                href={category.path}
                className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-yellow-50 hover:text-yellow-700"
              >
                <div className="mr-3 text-gray-500">{category.icon}</div>
                <span>{category.name}</span>
              </Link>
            ))}
          </nav>
          
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h3 className="text-sm font-medium text-yellow-800">Need Help?</h3>
            <p className="mt-1 text-xs text-yellow-700">
              Learn how to create and customize reports for your specific needs.
            </p>
            <button 
              className="mt-2 text-xs text-yellow-800 font-medium hover:text-yellow-900"
              onClick={() => {/* Add help documentation link */}}
            >
              View Documentation →
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1 p-6 bg-gray-50">
          {children}
        </div>
      </div>
    </div>
  );
}
