"use client";

import React from 'react';
import { useLanguage } from "@/contexts/LanguageContext";

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { language } = useLanguage();
  
  return (
    <div className="flex flex-col w-full">
      {/* Header with title */}
      <div className="bg-yellow-300 p-4 mb-4 rounded-t-md">
        <h1 className="text-xl font-bold">
          {language === 'ta' ? 'வகைகள் மேலாண்மை' : 'Categories Management'}
        </h1>
        
        <div className="mt-2 ml-4">
          <div className="flex items-center mb-1">
            <div className="w-5 h-0.5 bg-black mr-2"></div>
            <span className="text-yellow-600 font-bold">
              {language === 'ta' ? 'வகைகள் பட்டியல்' : 'Categories List'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
