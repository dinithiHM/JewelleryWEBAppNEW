'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StoreManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['Store Manager']}>
      {children}
    </ProtectedRoute>
  );
}
