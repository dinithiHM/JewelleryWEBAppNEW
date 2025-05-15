'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CashierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['Cashier']}>
      {children}
    </ProtectedRoute>
  );
}
