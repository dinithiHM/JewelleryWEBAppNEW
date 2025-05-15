'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['Admin', 'Store Manager', 'Sales Associate', 'Cashier']}>
      {children}
    </ProtectedRoute>
  );
}
