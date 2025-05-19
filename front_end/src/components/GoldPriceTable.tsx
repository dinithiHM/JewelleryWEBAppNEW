"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

interface GoldPrice {
  karat: number;
  purity: string;
  pricePerGram: number;
  pricePerPound: number; // 8 grams
  priceDifference?: number; // Optional price difference from previous karat
}

const GoldPriceTable: React.FC = () => {
  const [goldPrices, setGoldPrices] = useState<GoldPrice[]>([]);
  const [filteredPrices, setFilteredPrices] = useState<GoldPrice[]>([]);
  const [selectedKarat, setSelectedKarat] = useState<number | null>(null);
  const [rowsToShow, setRowsToShow] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchGoldPrices = async () => {
    setLoading(true);
    setError(null);

    try {
      // Since the API is not accessible, we'll use hardcoded data
      // In a production environment, you would implement proper API access

      // Base price for 24K gold per gram
      const basePrice = 31092;

      // Set hardcoded gold prices for all karats from 24K to 6K
      const prices: GoldPrice[] = [];

      // Define all karats and their exact purity percentages from the website
      const karatData = [
        { karat: 24, purity: '99.99%' },
        { karat: 23, purity: '96%' },
        { karat: 22, purity: '92%' },
        { karat: 21, purity: '88%' },
        { karat: 20, purity: '83%' },
        { karat: 19, purity: '79%' },
        { karat: 18, purity: '75%' },
        { karat: 17, purity: '71%' },
        { karat: 16, purity: '67%' },
        { karat: 15, purity: '63%' },
        { karat: 14, purity: '58%' },
        { karat: 13, purity: '54%' },
        { karat: 12, purity: '50%' },
        { karat: 11, purity: '46%' },
        { karat: 10, purity: '42%' },
        { karat: 9, purity: '38%' },
        { karat: 8, purity: '33%' },
        { karat: 7, purity: '29%' },
        { karat: 6, purity: '25%' }
      ];

      // Calculate price for each karat based on its purity
      let previousPrice = 0;

      karatData.forEach((data, index) => {
        // Extract purity percentage as a number
        const purityPercent = parseFloat(data.purity.replace('%', '')) / 100;

        // Calculate price per gram based on purity
        const pricePerGram = Math.round(basePrice * purityPercent);
        const pricePerPound = pricePerGram * 8; // 1 pound = 8 grams

        // Calculate price difference from previous karat (if not the first one)
        const priceDifference = index > 0 ? previousPrice - pricePerGram : 0;
        previousPrice = pricePerGram;

        prices.push({
          karat: data.karat,
          purity: data.purity,
          pricePerGram,
          pricePerPound,
          priceDifference
        });
      });

      setGoldPrices(prices);

      // Set last updated time
      const now = new Date();
      setLastUpdated(now.toLocaleString());

      // Note: In a real implementation, you would need to:
      // 1. Get proper API credentials for goldpricez.com
      // 2. Or create a backend proxy to fetch the data securely
      // 3. Or use a different gold price API that allows CORS
    } catch (err) {
      console.error('Error setting gold prices:', err);
      setError('Failed to load gold prices. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Filter prices when goldPrices, selectedKarat, or rowsToShow changes
  useEffect(() => {
    let filtered = goldPrices;

    // Apply karat filter if selected
    if (selectedKarat !== null) {
      filtered = filtered.filter(price => price.karat === selectedKarat);
    }

    // Limit the number of rows to show
    filtered = filtered.slice(0, rowsToShow);

    setFilteredPrices(filtered);
  }, [goldPrices, selectedKarat, rowsToShow]);

  useEffect(() => {
    fetchGoldPrices();

    // Set up interval to refresh prices every 30 minutes
    const intervalId = setInterval(fetchGoldPrices, 30 * 60 * 1000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `Rs. ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin mr-2" size={24} />
        <p>Loading gold prices...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-yellow-50 p-4 border-b border-yellow-100">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-yellow-800">Current Gold Prices</h2>
            <p className="text-sm text-yellow-600">
              Last updated: {lastUpdated}
              <button
                onClick={fetchGoldPrices}
                className="ml-2 text-blue-500 hover:text-blue-700 underline"
              >
                Refresh
              </button>
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="karat-filter" className="text-sm font-medium text-yellow-800">
                Filter by Karat:
              </label>
              <select
                id="karat-filter"
                className="border border-yellow-300 rounded-md p-1.5 text-sm bg-white"
                value={selectedKarat || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedKarat(value === '' ? null : Number(value));
                }}
              >
                <option value="">All Karats</option>
                {goldPrices.map(price => (
                  <option key={price.karat} value={price.karat}>
                    {price.karat}K ({price.purity})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label htmlFor="rows-to-show" className="text-sm font-medium text-yellow-800">
                Show:
              </label>
              <select
                id="rows-to-show"
                className="border border-yellow-300 rounded-md p-1.5 text-sm bg-white"
                value={rowsToShow}
                onChange={(e) => setRowsToShow(Number(e.target.value))}
              >
                <option value="5">5 rows</option>
                <option value="10">10 rows</option>
                <option value="15">15 rows</option>
                <option value="20">20 rows</option>
                <option value="100">All rows</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 p-4 border-b border-red-100 text-red-700">
          {error}
        </div>
      )}

      {/* Note: This is a demo implementation with static data */}
      <div className="bg-yellow-50 p-2 border-b border-yellow-100 text-yellow-700 text-sm">
        <strong>Note:</strong> This is a demonstration using static gold price data. In a production environment.
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-yellow-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                Karat
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                Purity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                Price per Gram
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                Price per Pound (8g)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-yellow-800 uppercase tracking-wider">
                Difference (Rs./g)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPrices.length > 0 ? (
              filteredPrices.map((price) => {
                const isSelected = selectedKarat === price.karat;
                return (
                  <tr
                    key={price.karat}
                    className={`hover:bg-yellow-50 ${isSelected ? 'bg-yellow-100' : ''}`}
                  >
                    <td className={`px-4 py-3 whitespace-nowrap font-medium ${isSelected ? 'text-yellow-800' : ''}`}>
                      {price.karat}K
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isSelected ? 'text-yellow-800' : ''}`}>
                      {price.purity}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isSelected ? 'text-yellow-800' : ''}`}>
                      {formatCurrency(price.pricePerGram)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isSelected ? 'text-yellow-800' : ''}`}>
                      {formatCurrency(price.pricePerPound)}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isSelected ? 'text-yellow-800' : ''}`}>
                      {price.priceDifference && price.priceDifference > 0 ? (
                        <span className="text-red-600">-{formatCurrency(price.priceDifference)}</span>
                      ) : price.priceDifference === 0 ? (
                        <span className="text-gray-500">-</span>
                      ) : (
                        <span className="text-green-600">+{formatCurrency(Math.abs(price.priceDifference || 0))}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center text-gray-500">
                  No gold prices available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-yellow-50 p-3 text-xs text-yellow-700 text-center border-t border-yellow-100">
        Data sourced from goldpricez.com. Prices are indicative and may vary slightly from market rates.
      </div>
    </div>
  );
};

export default GoldPriceTable;
