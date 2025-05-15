'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function SalesAssociateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['Sales Associate']}>
      {children}
    </ProtectedRoute>
  );
}
