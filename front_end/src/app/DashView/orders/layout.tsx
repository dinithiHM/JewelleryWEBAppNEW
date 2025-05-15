"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Define the navigation items
  const navItems = [
    { name: 'Add Order', path: '/DashView/orders/add' },
    { name: 'View Orders', path: '/DashView/orders/view' },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* Header with title */}
      <div className="bg-yellow-300 p-4 mb-4 rounded-t-md">
        <h1 className="text-xl font-bold">Order Management</h1>
        
        {/* Navigation links */}
        <div className="mt-2 ml-4">
          {navItems.map((item) => (
            <div key={item.path} className="flex items-center mb-1">
              <div className="w-5 h-0.5 bg-black mr-2"></div>
              <Link 
                href={item.path}
                className={`${
                  pathname === item.path 
                    ? 'text-yellow-600 font-bold' 
                    : 'text-black hover:text-yellow-600'
                }`}
              >
                {item.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
