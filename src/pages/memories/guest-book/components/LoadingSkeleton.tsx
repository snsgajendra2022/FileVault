import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="guest-book-masonry" aria-busy="true" aria-label="Loading memories">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl border border-white/10 overflow-hidden"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <div
            className={`gb-shimmer ${i % 3 === 0 ? 'h-48' : i % 3 === 1 ? 'h-64' : 'h-56'}`}
          />
          <div className="p-5 space-y-3 bg-white/[0.02]">
            <div className="h-4 w-1/3 rounded-lg gb-shimmer" />
            <div className="h-3 w-full rounded-lg gb-shimmer" />
            <div className="h-3 w-4/5 rounded-lg gb-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSkeleton;
