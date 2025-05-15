import Image from "next/image";
import { useLanguage } from "@/contexts/LanguageContext";
import TranslatedText from "./TranslatedText";
import { useEffect, useState } from "react";

const UserCard = ({ type }: { type: string }) => {
  // Use language context to trigger re-renders when language changes
  useLanguage();

  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      setLoading(true);
      setError(null);

      try {
        // Convert type to lowercase and remove spaces for API endpoint
        const typeKey = type.toLowerCase().replace(/\s+/g, '');

        // Fetch count from API
        const response = await fetch(`http://localhost:3002/dashboard-counts/users/${typeKey}`);

        // Special case for jewellery items
        if (typeKey === 'jewelleryitem') {
          const response = await fetch(`http://localhost:3002/dashboard-counts/jewellery-items`);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${type} count`);
          }

          const data = await response.json();
          // Use total_stock for jewellery items
          setCount(data.total_stock || 0);
        } else {
          if (!response.ok) {
            throw new Error(`Failed to fetch ${type} count`);
          }

          const data = await response.json();
          setCount(data.count || 0);
        }
      } catch (err) {
        console.error(`Error fetching ${type} count:`, err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Set up interval to refresh data every 30 seconds
    const intervalId = setInterval(fetchCount, 30000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [type]);

  return (
    <div className="rounded-2xl p-4 flex-1 min-w-[130px]" style={{ backgroundColor: "#FFE569" }}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] bg-white px-2 py-1 rounded-full text-green-600">
          2024/25
        </span>
        <Image src="/more.png" alt="" width={20} height={20} />
      </div>
      <h1 className="text-2xl font-semibold my-4">
        {loading ? (
          <span className="text-gray-400">...</span>
        ) : error ? (
          <span className="text-red-500 text-sm">Error</span>
        ) : (
          count.toLocaleString()
        )}
      </h1>
      <h2 className="capitalize text-sm font-medium text-gray-500">
        <TranslatedText textKey={`dashboard.${type.toLowerCase().replace(/\s+/g, '')}`} fallback={`${type}s`} />
      </h2>
    </div>
  );
};

export default UserCard;
