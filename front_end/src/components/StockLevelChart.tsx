"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "./TranslatedText";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

interface StockData {
  name: string;
  originalName: string;
  Mahiyangana: number;
  MahaOya: number;
}

const StockLevelChart = () => {
  // Use language context to trigger re-renders when language changes
  useLanguage();
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        // Fetch stock data for Mahiyangana (branch_id = 1) and MahaOya (branch_id = 2)
        console.log("Fetching stock data...");
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
        console.log("API URL:", apiUrl);

        // Skip the test endpoint and go directly to the main data endpoint
        const response = await axios.get(`${apiUrl}/jewellery-items/stock-by-branch`);
        console.log("API Response:", response.data);

        if (response.data && response.data.categories) {
          // Transform the data for the chart
          const formattedData = response.data.categories.map((category: string) => {
            // Format category name for better display - always use multiple lines for better readability
            let displayName = category;

            // Always break long category names into multiple lines
            // Split into words
            const words = category.split(' ');

            if (words.length > 1) {
              // For categories with multiple words, always break into multiple lines
              if (category.length > 10) {
                // For longer categories, try to balance the lines
                let firstLine = '';
                let secondLine = '';
                let currentLineLength = 0;

                // Distribute words to balance line lengths
                words.forEach(word => {
                  if (currentLineLength < category.length / 2) {
                    firstLine += (firstLine ? ' ' : '') + word;
                    currentLineLength += word.length + 1;
                  } else {
                    secondLine += (secondLine ? ' ' : '') + word;
                  }
                });

                displayName = `${firstLine}\n${secondLine}`;
              }
            } else if (category.length > 8) {
              // For single long words, break in the middle
              const midPoint = Math.ceil(category.length / 2);
              displayName = `${category.substring(0, midPoint)}-\n${category.substring(midPoint)}`;
            }

            return {
              name: displayName,
              originalName: category, // Keep original for tooltip
              Mahiyangana: response.data.stockByBranch[1]?.[category] || 0, // Branch ID 1
              MahaOya: response.data.stockByBranch[2]?.[category] || 0,     // Branch ID 2
            };
          });

          console.log("Formatted data for chart:", formattedData);
          setStockData(formattedData);
          setError(null); // Clear any previous errors
        } else {
          console.log("No categories found in response data");
          setError("No category data available");
        }
      } catch (error) {
        console.error("Error fetching stock data:", error);

        // Set a user-friendly error message
        if (axios.isAxiosError(error) && error.response) {
          if (error.response.status === 404) {
            setError("Stock data endpoint not found. Please check server configuration.");
          } else {
            setError(`Server error: ${error.response.status}`);
          }
        } else {
          setError("Failed to fetch stock data. Please check your connection.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, []);

  return (
    <div className="bg-[#FFF6BD] rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold text-black">
          <TranslatedText textKey="dashboard.stockLevels" fallback="Stock Levels" />
        </h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-[80%]">
          <p>Loading stock data...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-[80%]">
          <p className="text-red-600 font-semibold mb-2">{error}</p>
          <p className="text-sm text-gray-600 text-center">
            Please check the server connection and database configuration.
          </p>
        </div>
      ) : stockData.length === 0 ? (
        <div className="flex flex-col justify-center items-center h-[80%]">
          <p className="text-red-600 font-semibold mb-2">No stock data available</p>
          <p className="text-sm text-gray-600 text-center">
            Please ensure jewellery items have branch_id values assigned and in_stock values are set.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="90%" minHeight={350}>
          <BarChart
            width={500}
            height={350}
            data={stockData}
            barSize={25}
            barGap={8}
            maxBarSize={30}
            margin={{ top: 20, right: 20, left: 20, bottom: 30 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ddd" />
            <XAxis
              dataKey="name"
              axisLine={{ stroke: '#ddd', strokeWidth: 1 }}
              tick={({ x, y, payload }) => {
                // Use a simple approach - just show the first few characters
                // This avoids any complex logic that might cause errors
                const value = payload && typeof payload.value === 'string' ? payload.value : '';
                const shortName = value.substring(0, 6) + (value.length > 6 ? "..." : "");

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={16}
                      textAnchor="middle"
                      fill="#555"
                      fontSize={10}
                      fontWeight={500}
                    >
                      {shortName}
                    </text>
                  </g>
                );
              }}
              tickLine={false}
              height={40}
              tickMargin={10}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "#000000" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "10px",
                borderColor: "lightgray",
                padding: "10px",
                backgroundColor: "rgba(255, 255, 240, 0.95)"
              }}
              formatter={(value, name) => [`${value} items`, name]}
              labelFormatter={(label, data) => {
                // Safe access with multiple fallbacks
                const category = data && data[0] && data[0].payload && data[0].payload.originalName
                  ? data[0].payload.originalName
                  : label || 'Unknown';
                return `Category: ${category}`;
              }}
              cursor={{ fill: 'rgba(212, 175, 55, 0.1)' }}
            />
            <Legend
              align="left"
              verticalAlign="top"
              formatter={(value) => <span style={{ color: "black" }}>{value}</span>}
              wrapperStyle={{ paddingTop: "20px", paddingBottom: "40px" }}
            />
            <Bar
              dataKey="Mahiyangana"
              fill="#D4AF37" // Metallic gold
              legendType="circle"
              radius={[8, 8, 0, 0]}
              animationDuration={1500}
              name="Mahiyangana Branch"
            />
            <Bar
              dataKey="MahaOya"
              fill="#B8860B" // Dark goldenrod
              legendType="circle"
              radius={[8, 8, 0, 0]}
              animationDuration={1500}
              name="MahaOya Branch"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default StockLevelChart;
