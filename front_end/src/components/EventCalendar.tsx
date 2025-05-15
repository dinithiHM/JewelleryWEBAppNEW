"use client";

// Removed unused import
import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { formatCurrency } from "@/utils/formatters";
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "./TranslatedText";

type ValuePiece = Date | null;

type Value = ValuePiece | [ValuePiece, ValuePiece];

// Define types for sales data
interface Sale {
  sale_id: number;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  sale_date: string;
  cashier_name: string;
  sold_items: string;
}

interface BranchSales {
  branch_id: number;
  branch_name: string;
  sales: Sale[];
}

const EventCalendar = () => {
  // Use language context to trigger re-renders when language changes
  useLanguage();
  const [value, onChange] = useState<Value>(new Date());
  const [salesData, setSalesData] = useState<BranchSales[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Format date as YYYY-MM-DD for API calls
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch sales data based on selected date
  const fetchSalesData = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);

      const formattedDate = formatDateForAPI(date);

      // Use the regular sales endpoint with date filtering instead
      const response = await fetch(`http://localhost:3002/sales?date=${formattedDate}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch sales data: ${response.status}`);
      }

      const salesList = await response.json();

      // Process the data to group by branch
      const branchMap: Record<string, BranchSales> = {};

      // Process each sale
      const salesPromises = salesList.map(async (sale: any) => {
        // Fetch sale items for this sale
        try {
          const itemsResponse = await fetch(`http://localhost:3002/sales/${sale.sale_id}`);
          if (itemsResponse.ok) {
            const saleDetails = await itemsResponse.json();
            // Extract item names
            const itemNames = saleDetails.items?.map((item: any) => item.product_title).join(', ') || 'No items';

            return {
              ...sale,
              sold_items: itemNames
            };
          }
          return sale;
        } catch (err) {
          console.error(`Error fetching items for sale ${sale.sale_id}:`, err);
          return sale;
        }
      });

      // Wait for all item fetches to complete
      const salesWithItems = await Promise.all(salesPromises);

      // Now process the sales with items
      salesWithItems.forEach((sale: any) => {
        const branchId = sale.branch_id;

        // Initialize branch if not exists
        if (!branchMap[branchId]) {
          branchMap[branchId] = {
            branch_id: branchId,
            branch_name: sale.branch_name || `Branch ${branchId}`,
            sales: []
          };
        }

        // Only add if we haven't reached the limit for this branch (5 sales)
        if (branchMap[branchId].sales.length < 5) {
          branchMap[branchId].sales.push({
            sale_id: sale.sale_id,
            customer_name: sale.customer_name,
            total_amount: sale.total_amount,
            payment_method: sale.payment_method,
            sale_date: sale.sale_date,
            cashier_name: `${sale.cashier_first_name || ''} ${sale.cashier_last_name || ''}`.trim(),
            sold_items: sale.sold_items || 'Various items'
          });
        }
      });

      // Convert to array
      const branchSalesArray = Object.values(branchMap);
      setSalesData(branchSalesArray);
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Handle date change in calendar
  const handleDateChange = (value: Value) => {
    onChange(value);
    if (value instanceof Date) {
      fetchSalesData(value);
    }
  };

  // Fetch initial data on component mount
  useEffect(() => {
    fetchSalesData(new Date());
  }, []);

  return (
    <div style={{ backgroundColor: "#FFF6BD" }} className="p-4 rounded-md"> {/* Set background color here */}
      <Calendar onChange={handleDateChange} value={value} />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold my-4">
          <TranslatedText textKey="dashboard.recentSales" fallback="Recent Sales" />
        </h1>
        <div className="text-sm text-gray-500">
          {value instanceof Date && (
            <span>{value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      ) : salesData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <TranslatedText textKey="dashboard.noSalesFound" fallback="No sales found for this date" />
        </div>
      ) : (
        <div className="space-y-6">
          {salesData.map((branchData) => (
            <div key={branchData.branch_id} className="mb-4">
              <h2 className="text-md font-semibold text-gray-700 mb-2">{branchData.branch_name}</h2>

              {branchData.sales.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No sales for this branch today</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {branchData.sales.map((sale) => (
                    <div
                      className="p-4 rounded-md border border-gray-200 shadow-sm bg-white border-l-4"
                      style={{ borderLeftColor: branchData.branch_id === 1 ? '#4ECDC4' : '#FF6B6B' }}
                      key={sale.sale_id}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-800">
                            {sale.customer_name}
                            <span className="ml-2 text-sm font-normal text-gray-500">({sale.payment_method})</span>
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Cashier:</span> {sale.cashier_name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Items:</span> {sale.sold_items}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(sale.total_amount)}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(sale.sale_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventCalendar;
