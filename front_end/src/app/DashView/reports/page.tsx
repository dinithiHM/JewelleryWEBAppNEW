"use client";

import React from 'react';
import { FileText, BarChart2, DollarSign, Package, Users, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  
  // Report categories with their respective reports
  const reportCategories = [
    { 
      name: 'Sales Reports', 
      icon: <DollarSign className="w-6 h-6" />, 
      path: '/DashView/reports/sales',
      color: 'bg-blue-50 text-blue-700',
      iconBg: 'bg-blue-100',
      reports: [
        { name: 'Daily Sales', path: '/DashView/reports/sales/daily' },
        { name: 'Monthly Sales', path: '/DashView/reports/sales/monthly' },
        { name: 'Sales by Category', path: '/DashView/reports/sales/by-category' },
        { name: 'Sales by Branch', path: '/DashView/reports/sales/by-branch' },
      ]
    },
    { 
      name: 'Inventory Reports', 
      icon: <Package className="w-6 h-6" />, 
      path: '/DashView/reports/inventory',
      color: 'bg-green-50 text-green-700',
      iconBg: 'bg-green-100',
      reports: [
        { name: 'Current Stock', path: '/DashView/reports/inventory/current-stock' },
        { name: 'Gold Inventory', path: '/DashView/reports/inventory/gold-stock' },
        { name: 'Low Stock Items', path: '/DashView/reports/inventory/low-stock' },
        { name: 'Inventory Valuation', path: '/DashView/reports/inventory/valuation' },
      ]
    },
    { 
      name: 'Financial Reports', 
      icon: <TrendingUp className="w-6 h-6" />, 
      path: '/DashView/reports/financial',
      color: 'bg-purple-50 text-purple-700',
      iconBg: 'bg-purple-100',
      reports: [
        { name: 'Revenue Analysis', path: '/DashView/reports/financial/revenue' },
        { name: 'Profit Margins', path: '/DashView/reports/financial/profit-margins' },
        { name: 'Payment Methods', path: '/DashView/reports/financial/payment-methods' },
        { name: 'Discount Analysis', path: '/DashView/reports/financial/discounts' },
      ]
    },
    // { 
    //   name: 'Customer Reports', 
    //   icon: <Users className="w-6 h-6" />, 
    //   path: '/DashView/reports/customer',
    //   color: 'bg-yellow-50 text-yellow-700',
    //   iconBg: 'bg-yellow-100',
    //   reports: [
    //     { name: 'Customer Purchases', path: '/DashView/reports/customer/purchases' },
    //     { name: 'Outstanding Payments', path: '/DashView/reports/customer/outstanding' },
    //     { name: 'Customer Loyalty', path: '/DashView/reports/customer/loyalty' },
    //   ]
    // },
    // { 
    //   name: 'Custom Reports', 
    //   icon: <FileText className="w-6 h-6" />, 
    //   path: '/DashView/reports/custom',
    //   color: 'bg-red-50 text-red-700',
    //   iconBg: 'bg-red-100',
    //   reports: [
    //     { name: 'Report Builder', path: '/DashView/reports/custom/builder' },
    //     { name: 'Saved Reports', path: '/DashView/reports/custom/saved' },
    //   ]
    // },
  ];

  // Recent reports (would be fetched from API in a real implementation)
  const recentReports = [
    { name: 'Monthly Sales - April 2024', path: '/DashView/reports/sales/monthly', date: '2024-04-30' },
    { name: 'Gold Inventory Status', path: '/DashView/reports/inventory/gold-stock', date: '2024-04-28' },
   
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Report Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCategories.map((category) => (
            <div 
              key={category.name}
              className={`p-6 rounded-lg shadow-sm border ${category.color} hover:shadow-md transition-shadow cursor-pointer`}
              onClick={() => router.push(category.path)}
            >
              <div className="flex items-start">
                <div className={`p-3 rounded-full ${category.iconBg} mr-4`}>
                  {category.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium">{category.name}</h3>
                  <ul className="mt-2 space-y-1">
                    {category.reports.slice(0, 3).map((report) => (
                      <li key={report.name} className="text-sm">
                        • {report.name}
                      </li>
                    ))}
                    {category.reports.length > 3 && (
                      <li className="text-sm text-gray-500">
                        • And more...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2" /> Recent Reports
        </h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {recentReports.map((report) => (
              <li key={report.name}>
                <Link 
                  href={report.path}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{report.name}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(report.date).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
