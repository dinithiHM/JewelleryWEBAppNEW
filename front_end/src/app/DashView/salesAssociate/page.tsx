"use client";

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Tag, Coins } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "@/components/TranslatedText";
import axios from 'axios';

const SalesAssociatePage: React.FC = () => {
    // Use language context to trigger re-renders when language changes
    useLanguage();
    const [userName, setUserName] = useState<string>('');
    const [todaySales, setTodaySales] = useState<string>('LKR 0');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [recentSales, setRecentSales] = useState<any[]>([]);
    const [topSellingItems, setTopSellingItems] = useState<any[]>([]);

    useEffect(() => {
        // Get user info from localStorage if available
        const storedName = localStorage.getItem('userName');
        if (storedName) {
            setUserName(storedName);
        }

        // Get branch ID from localStorage if available
        const branchId = localStorage.getItem('branchId');
        console.log('Branch ID from localStorage:', branchId);

        // Fetch today's sales data, recent sales, and top selling items
        const fetchSalesData = async () => {
            setIsLoading(true);

            try {
                // Get today's date in YYYY-MM-DD format
                const today = new Date().toISOString().split('T')[0];
                console.log('Today\'s date for filtering:', today);

                // Prepare params for sales
                const salesParams: any = { limit: 100 }; // Get more sales to calculate total accurately

                // Only add branch_id if it exists
                if (branchId) {
                    salesParams.branch_id = branchId;
                }

                // Fetch recent sales which will include today's sales
                const salesResponse = await axios.get('http://localhost:3002/sales/recent', { params: salesParams });
                console.log('Response from recent sales API:', salesResponse.data);

                if (salesResponse.data && Array.isArray(salesResponse.data)) {
                    // Set recent sales for display (limit to 5)
                    setRecentSales(salesResponse.data.slice(0, 5));

                    // Calculate total sales amount for today
                    const totalSales = salesResponse.data.reduce((sum, sale) =>
                        sum + parseFloat(sale.total_amount || '0'), 0);

                    setTodaySales(`LKR ${totalSales.toLocaleString()}`);
                } else {
                    setRecentSales([]);
                    setTodaySales('LKR 0');
                }

                // Fetch top selling items
                const topItemsParams: any = { limit: 3 }; // Get top 3 items

                // Only add branch_id if it exists
                if (branchId) {
                    topItemsParams.branch_id = branchId;
                }

                // Fetch all-time top selling items
                const topItemsResponse = await axios.get('http://localhost:3002/sales/top-selling-items', { params: topItemsParams });
                console.log('Response from top selling items API:', topItemsResponse.data);

                if (topItemsResponse.data && Array.isArray(topItemsResponse.data)) {
                    setTopSellingItems(topItemsResponse.data);
                } else {
                    setTopSellingItems([]);
                }
            } catch (error) {
                console.error('Error fetching sales data:', error);
                setRecentSales([]);
                setTodaySales('LKR 0');
                setTopSellingItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSalesData();
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
                <div className={`p-3 rounded-full ${color.replace('border-l-4', 'bg').replace('-500', '-100')}`}>
                    <Icon className={color.replace('border-l-4 border', 'text')} size={24} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Sales Associate Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back{userName ? `, ${userName}` : ''}! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardCard
                    icon={ShoppingCart}
                    title="Today's Sales"
                    value={isLoading ? "Loading..." : todaySales}
                    color="border-l-4 border-blue-500"
                />

                <DashboardCard
                    icon={Tag}
                    title="Top Category"
                    value={topSellingItems.length > 0 ? topSellingItems[0].category : "No data"}
                    color="border-l-4 border-purple-500"
                />
                <DashboardCard
                    icon={Coins}
                    title="Gold Price"
                    value="LKR 5,842/g"
                    color="border-l-4 border-yellow-500"
                />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Today's Sales</h2>
                    <button className="text-blue-500 hover:text-blue-700">View All</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sale ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {recentSales.length > 0 ? (
                                recentSales.map((sale) => (
                                    <tr key={sale.sale_id}>
                                        <td className="px-6 py-4 whitespace-nowrap">#{sale.sale_id}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{sale.customer_name || 'Walk-in Customer'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {sale.items && sale.items.length > 0
                                                ? (sale.items.length === 1
                                                    ? sale.items[0].product_title
                                                    : `${sale.items[0].product_title} +${sale.items.length - 1} more`)
                                                : 'No items'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            LKR {parseFloat(sale.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{sale.sale_time}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                sale.payment_method === 'Cash' ? 'bg-green-100 text-green-800' :
                                                sale.payment_method === 'Card' ? 'bg-blue-100 text-blue-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {sale.payment_method || 'Unknown'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        {isLoading ? 'Loading sales data...' : 'No sales recorded today'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Top Selling Items</h2>
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-4">Loading top selling items...</div>
                    ) : topSellingItems.length > 0 ? (
                        topSellingItems.map((item, index) => (
                            <div key={item.item_id} className="flex justify-between items-center">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                                        <span className="text-blue-500 font-bold">{index + 1}</span>
                                    </div>
                                    <div>
                                        <p className="font-medium">{item.product_title}</p>
                                        <p className="text-sm text-gray-500">
                                            {item.category}
                                            {item.gold_carat ? ` • ${item.gold_carat}K Gold` : ''}
                                        </p>
                                    </div>
                                </div>
                                <p className="font-bold">LKR {parseFloat(item.total_amount).toLocaleString()}</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4">No sales data available</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesAssociatePage;