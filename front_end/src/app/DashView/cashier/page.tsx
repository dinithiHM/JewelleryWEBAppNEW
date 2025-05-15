"use client";

import React, { useState, useEffect } from 'react';
import { BarChart, Users, ShoppingCart, Tag, Coins, CreditCard, Calculator } from 'lucide-react';
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "@/components/TranslatedText";

const CashierPage: React.FC = () => {
    // Use language context to trigger re-renders when language changes
    useLanguage();
    const [userName, setUserName] = useState<string>('');
    const [branchName, setBranchName] = useState<string>('');

    useEffect(() => {
        // Get user info from localStorage if available
        const storedName = localStorage.getItem('userName');
        const storedBranch = localStorage.getItem('branchName');

        if (storedName) {
            setUserName(storedName);
        }

        if (storedBranch) {
            setBranchName(storedBranch);
        } else {
            // Fallback: Try to get branch ID and map it
            const branchId = localStorage.getItem('branchId');
            if (branchId === '1') {
                setBranchName('Mahiyangana Branch');
            } else if (branchId === '2') {
                setBranchName('Mahaoya Branch');
            }
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
                <h1 className="text-2xl font-bold text-gray-800">Cashier Dashboard</h1>
                <p className="text-gray-600 mt-1">
                    Welcome back{userName ? `, ${userName}` : ''}!
                    {branchName && <span> You are assigned to <strong>{branchName}</strong>.</span>}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <DashboardCard
                    icon={ShoppingCart}
                    title="Today's Transactions"
                    value="32"
                    color="border-l-4 border-blue-500"
                />
                <DashboardCard
                    icon={CreditCard}
                    title="Total Sales"
                    value="LKR 78,500"
                    color="border-l-4 border-green-500"
                />
                <DashboardCard
                    icon={Calculator}
                    title="Cash Balance"
                    value="LKR 45,200"
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
                    <h2 className="text-xl font-bold">Recent Transactions</h2>
                    <button className="text-blue-500 hover:text-blue-700">View All</button>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">TRX-2023-001</td>
                                <td className="px-6 py-4 whitespace-nowrap">Amal Perera</td>
                                <td className="px-6 py-4 whitespace-nowrap">LKR 12,500</td>
                                <td className="px-6 py-4 whitespace-nowrap">Cash</td>
                                <td className="px-6 py-4 whitespace-nowrap">10:30 AM</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span></td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">TRX-2023-002</td>
                                <td className="px-6 py-4 whitespace-nowrap">Nimal Silva</td>
                                <td className="px-6 py-4 whitespace-nowrap">LKR 8,750</td>
                                <td className="px-6 py-4 whitespace-nowrap">Credit Card</td>
                                <td className="px-6 py-4 whitespace-nowrap">11:45 AM</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Completed</span></td>
                            </tr>
                            <tr>
                                <td className="px-6 py-4 whitespace-nowrap">TRX-2023-003</td>
                                <td className="px-6 py-4 whitespace-nowrap">Kamala Jayawardene</td>
                                <td className="px-6 py-4 whitespace-nowrap">LKR 3,250</td>
                                <td className="px-6 py-4 whitespace-nowrap">Debit Card</td>
                                <td className="px-6 py-4 whitespace-nowrap">1:15 PM</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Payment Methods Summary</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                                    <CreditCard className="text-blue-500" size={24} />
                                </div>
                                <div>
                                    <p className="font-medium">Credit Card</p>
                                    <p className="text-sm text-gray-500">12 transactions</p>
                                </div>
                            </div>
                            <p className="font-bold">LKR 45,000</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                                    <Coins className="text-green-500" size={24} />
                                </div>
                                <div>
                                    <p className="font-medium">Cash</p>
                                    <p className="text-sm text-gray-500">15 transactions</p>
                                </div>
                            </div>
                            <p className="font-bold">LKR 28,500</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                                    <CreditCard className="text-purple-500" size={24} />
                                </div>
                                <div>
                                    <p className="font-medium">Debit Card</p>
                                    <p className="text-sm text-gray-500">5 transactions</p>
                                </div>
                            </div>
                            <p className="font-bold">LKR 5,000</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="p-4 bg-blue-50 rounded-lg flex flex-col items-center justify-center hover:bg-blue-100 transition duration-200">
                            <ShoppingCart className="text-blue-500 mb-2" size={24} />
                            <span className="text-sm font-medium">New Sale</span>
                        </button>
                        <button className="p-4 bg-green-50 rounded-lg flex flex-col items-center justify-center hover:bg-green-100 transition duration-200">
                            <Calculator className="text-green-500 mb-2" size={24} />
                            <span className="text-sm font-medium">Cash Register</span>
                        </button>
                        <button className="p-4 bg-purple-50 rounded-lg flex flex-col items-center justify-center hover:bg-purple-100 transition duration-200">
                            <CreditCard className="text-purple-500 mb-2" size={24} />
                            <span className="text-sm font-medium">Payment</span>
                        </button>
                        <button className="p-4 bg-yellow-50 rounded-lg flex flex-col items-center justify-center hover:bg-yellow-100 transition duration-200">
                            <BarChart className="text-yellow-500 mb-2" size={24} />
                            <span className="text-sm font-medium">Daily Report</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CashierPage;