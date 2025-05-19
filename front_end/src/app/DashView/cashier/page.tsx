"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, Clock } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "@/components/TranslatedText";
import GoldPriceTable from "@/components/GoldPriceTable";
import axios from 'axios';

const CashierPage: React.FC = () => {
    // Use language context to trigger re-renders when language changes
    useLanguage();
    const [userName, setUserName] = useState<string>('');
    const [branchName, setBranchName] = useState<string>('');
    const [branchId, setBranchId] = useState<string | null>(null);
    const [todaySalesAmount, setTodaySalesAmount] = useState<string>('0');
    const [todayTransactions, setTodayTransactions] = useState<string>('0');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [recentSales, setRecentSales] = useState<any[]>([]);

    // Fetch dashboard data
    const fetchDashboardData = async (branchId: string | null) => {
        setIsLoading(true);
        try {
            // Fetch today's sales amount
            let url = 'http://localhost:3002/dashboard-counts/today-sales';
            if (branchId) {
                url += `?branch_id=${branchId}`;
            }

            const salesResponse = await fetch(url);
            if (salesResponse.ok) {
                const salesData = await salesResponse.json();
                // Format the sales amount with commas
                setTodaySalesAmount(`LKR ${Number(salesData.total_amount).toLocaleString()}`);
            }

            // Fetch today's transactions count
            let recentSalesUrl = 'http://localhost:3002/sales/recent';
            const params: any = {};

            if (branchId) {
                params.branch_id = branchId;
            }

            const transactionsResponse = await axios.get(recentSalesUrl, { params });
            if (transactionsResponse.data && Array.isArray(transactionsResponse.data)) {
                // Count unique sale_ids to get the number of transactions
                const uniqueSaleIds = new Set();
                transactionsResponse.data.forEach((sale: any) => {
                    if (sale.sale_id) {
                        uniqueSaleIds.add(sale.sale_id);
                    }
                });
                setTodayTransactions(uniqueSaleIds.size.toString());

                // Store recent sales for display in the table
                setRecentSales(transactionsResponse.data.slice(0, 5)); // Limit to 5 most recent
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setTodaySalesAmount('LKR 0');
            setTodayTransactions('0');
            setRecentSales([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Get user info from localStorage if available
        const storedName = localStorage.getItem('userName');
        const storedBranch = localStorage.getItem('branchName');
        const storedBranchId = localStorage.getItem('branchId');

        if (storedName) {
            setUserName(storedName);
        }

        if (storedBranch) {
            setBranchName(storedBranch);
        } else {
            // Fallback: Try to get branch ID and map it
            if (storedBranchId === '1') {
                setBranchName('Mahiyangana Branch');
            } else if (storedBranchId === '2') {
                setBranchName('Mahaoya Branch');
            }
        }

        // Check if there's a branch parameter in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const branchParam = urlParams.get('branch');

        // Use branch from URL if available, otherwise use from localStorage
        const branchToUse = branchParam || storedBranchId;

        if (branchToUse) {
            setBranchId(branchToUse);
            // Fetch dashboard data for this branch
            fetchDashboardData(branchToUse);

            // If branch name isn't set yet, set it based on the branch ID
            if (!storedBranch) {
                if (branchToUse === '1') {
                    setBranchName('Mahiyangana Branch');
                } else if (branchToUse === '2') {
                    setBranchName('Mahaoya Branch');
                }
            }
        } else {
            // Fetch dashboard data without branch filter
            fetchDashboardData(null);
        }
    }, []);

    // Dashboard card component
    const DashboardCard = ({ icon: Icon, title, value, color }: { icon: any, title: string, value: string, color: string }) => (
        <div className={`bg-white p-6 rounded-lg shadow-md border-l-4 ${color}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-gray-500 text-sm font-medium">
                        <TranslatedText textKey={`dashboard.${title.toLowerCase().replace(/[^a-zA-Z0-9]/g, '')}`} fallback={title} />
                    </h3>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${color.replace('border-l-4 border', 'bg').replace('-500', '-100')}`}>
                    <Icon className={color.replace('border-l-4 border', 'text')} size={24} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Cashier Dashboard</h1>
                        <p className="text-gray-600 mt-1">
                            Welcome back{userName ? `, ${userName}` : ''}!
                            {branchName && <span> You are assigned to <strong>{branchName}</strong>.</span>}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (branchId) {
                                fetchDashboardData(branchId);
                            } else {
                                fetchDashboardData(null);
                            }
                        }}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md flex items-center hover:bg-blue-100 transition-colors"
                        title="Refresh dashboard data"
                    >
                        <Clock className="mr-1" size={16} />
                        Refresh Data
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
                <DashboardCard
                    icon={ShoppingCart}
                    title="Today's Transactions"
                    value={isLoading ? "Loading..." : todayTransactions}
                    color="border-l-4 border-blue-500"
                />
                <DashboardCard
                    icon={CreditCard}
                    title="Total Sales"
                    value={isLoading ? "Loading..." : todaySalesAmount}
                    color="border-l-4 border-green-500"
                />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Recent Transactions</h2>
                    <button
                        onClick={() => {
                            // Navigate to sales view page
                            window.location.href = '/DashView/sales/view';
                        }}
                        className="text-blue-500 hover:text-blue-700"
                    >
                        View All
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center">
                                        <div className="flex justify-center items-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                                            Loading transactions...
                                        </div>
                                    </td>
                                </tr>
                            ) : recentSales.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        No transactions found for today
                                    </td>
                                </tr>
                            ) : (
                                recentSales.map((sale, index) => (
                                    <tr key={`${sale.sale_id}-${index}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">#{sale.sale_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{sale.customer_name || 'Walk-in Customer'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            Rs. {Number(sale.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{sale.payment_method || 'Cash'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{sale.sale_time || new Date(sale.sale_date).toLocaleTimeString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{sale.product_title || 'Multiple Items'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="w-full">
                <div className="bg-white rounded-lg shadow-md">
                    <GoldPriceTable />
                </div>
            </div>
        </div>
    );
};

export default CashierPage;