'use client';

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={['Admin']}>
      {children}
    </ProtectedRoute>
  );
}
