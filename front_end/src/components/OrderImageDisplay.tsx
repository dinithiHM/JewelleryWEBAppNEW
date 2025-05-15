"use client";

import React, { useState } from 'react';
import Image from 'next/image';

interface OrderImageDisplayProps {
  imageUrl: string | null;
  altText?: string;
}

const OrderImageDisplay: React.FC<OrderImageDisplayProps> = ({ 
  imageUrl, 
  altText = "Order Design" 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center w-full h-32 bg-gray-100 rounded-md">
        <p className="text-gray-500">No image available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-32 bg-gray-50 rounded-md overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      )}
      
      <Image
        src={imageUrl}
        alt={altText}
        fill
        style={{ objectFit: 'contain' }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setError("Failed to load image");
        }}
      />
    </div>
  );
};

export default OrderImageDisplay;
