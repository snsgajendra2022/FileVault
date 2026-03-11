import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const LoadingSpinner = ({ size = 'md', text = 'Loading...' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex flex-col items-center justify-center py-1">
      <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]}`} />
      {text && (
        <p className="mt-1 text-sm text-gray-600">{text}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
