"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const OrdersPage = () => {
  const router = useRouter();

  // Redirect to the Add Order page by default
  useEffect(() => {
    router.push('/DashView/orders/add');
  }, [router]);

  // Show a loading state while redirecting
  return (
    <div className="flex justify-center items-center h-64">
      <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default OrdersPage;