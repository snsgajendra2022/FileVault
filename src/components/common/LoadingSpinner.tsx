import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  /** Light surfaces (default) vs dark embedded panels */
  variant?: 'light' | 'dark';
}

const LoadingSpinner = ({ size = 'md', text = 'Loading...', variant = 'light' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
  };

  const ringClass =
    variant === 'dark'
      ? 'border-white/15 border-t-violet-300'
      : 'border-slate-200 border-t-violet-600';

  const textClass = variant === 'dark' ? 'text-slate-300' : 'text-slate-600';

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-1">
      <div
        className={`animate-spin rounded-full ${ringClass} ${sizeClasses[size]}`}
        aria-hidden
      />
      {text ? <p className={`text-sm font-medium ${textClass}`}>{text}</p> : null}
    </div>
  );
};

export default LoadingSpinner;
