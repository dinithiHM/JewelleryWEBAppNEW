"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart, Eye } from 'lucide-react';

interface OrderImageThumbnailProps {
  imageUrl: string | null;
  orderId: number;
  size?: 'small' | 'medium' | 'large';
}

const OrderImageThumbnail: React.FC<OrderImageThumbnailProps> = ({
  imageUrl,
  orderId,
  size = 'medium' // Default size is medium
}) => {
  const [hasError, setHasError] = useState(false);

  // Determine size classes
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const iconSize = {
    small: 16,
    medium: 20,
    large: 24
  };

  // If no image URL or there was an error loading the image, show placeholder
  if (!imageUrl || hasError) {
    return (
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-yellow-400`}>
        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
          <div className="text-yellow-500">
            <ShoppingCart size={iconSize[size]} />
          </div>
        </div>
      </div>
    );
  }

  // Show the actual image
  return (
    <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-yellow-400 group`}>
      <Image
        src={imageUrl}
        alt={`Order ${orderId} design`}
        fill
        style={{ objectFit: 'cover' }}
        onError={() => setHasError(true)}
        unoptimized // Skip Next.js image optimization
      />

      {/* Hover overlay with zoom effect */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="text-white transform scale-0 group-hover:scale-100 transition-transform duration-300">
          <Eye size={iconSize[size]} />
        </div>
      </div>
    </div>
  );
};

export default OrderImageThumbnail;
