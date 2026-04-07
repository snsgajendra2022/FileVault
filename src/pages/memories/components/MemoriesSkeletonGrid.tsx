import React from 'react';

export const MemoriesSkeletonGrid: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 animate-pulse"
      />
    ))}
  </div>
);
