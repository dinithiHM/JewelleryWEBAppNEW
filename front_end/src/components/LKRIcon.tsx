import React from 'react';

interface LKRIconProps {
  className?: string;
}

const LKRIcon: React.FC<LKRIconProps> = ({ className = 'h-5 w-5 text-gray-400' }) => {
  return (
    <div className={`flex items-center justify-center font-semibold ${className}`}>
      Rs.
    </div>
  );
};

export default LKRIcon;
