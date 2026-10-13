import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  shimmer?: boolean;
}

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded-[var(--radius-sm,6px)]',
  md: 'rounded-[var(--radius-xs,8px)]',
  lg: 'rounded-card-nested',
  xl: 'rounded-card-nested',
  '2xl': 'rounded-card',
  '3xl': 'rounded-modal',
  full: 'rounded-full',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  rounded = 'md',
  shimmer = true,
  ...props
}) => {
  return (
    <div
      className={`relative overflow-hidden bg-black/[0.06] dark:bg-white/[0.06] ${roundedMap[rounded]} ${
        shimmer ? 'animate-pulse' : ''
      } ${className}`}
      {...props}
    >
      {shimmer && (
        <div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-[shimmer_1.6s_infinite]"
          style={{
            animationDuration: '1.6s',
          }}
        />
      )}
    </div>
  );
};

export const TransactionItemSkeleton: React.FC = () => {
  return (
    <div className="bg-[var(--surface-color)] rounded-card p-4 flex items-center justify-between gap-3 shadow-none border-none select-none">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Logo skeleton */}
        <Skeleton className="w-[42px] h-[42px] shrink-0" rounded="full" />
        
        {/* Name and category skeleton */}
        <div className="space-y-1.5 min-w-0 flex-1">
          <Skeleton className="h-3.5 w-28 sm:w-36" rounded="sm" />
          <Skeleton className="h-2.5 w-16 sm:w-20" rounded="sm" />
        </div>
      </div>

      {/* Amount skeleton */}
      <div className="flex flex-col items-end space-y-1 shrink-0">
        <Skeleton className="h-4 w-16" rounded="sm" />
      </div>
    </div>
  );
};

export const AppSkeleton: React.FC<{ language?: string }> = ({ language: _language = 'sv' }) => {
  return (
    <div className="min-h-dvh font-sans text-[var(--text-primary)] relative pt-[env(safe-area-inset-top)] bg-[var(--bg-color)]">
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-3 pb-28 space-y-6">
        
        {/* 1. App Header Skeleton */}
        <div className="flex items-center justify-between h-12">
          {/* Avatar pill skeleton */}
          <div className="flex items-center gap-2.5 bg-[var(--surface-color)] rounded-full p-1.5 pr-3.5 shadow-none border-none">
            <Skeleton className="w-8 h-8" rounded="full" />
            <Skeleton className="w-16 h-3" rounded="sm" />
          </div>

          {/* Period selector pill skeleton */}
          <Skeleton className="h-8 w-28" rounded="full" />

          {/* Action icon skeletons */}
          <div className="flex items-center gap-1.5">
            <Skeleton className="w-8 h-8" rounded="full" />
            <Skeleton className="w-8 h-8" rounded="full" />
          </div>
        </div>

        {/* 2. Hero Greeting & Gauge Skeleton Card */}
        <div className="bg-[var(--surface-color)] rounded-card p-5 sm:p-6 shadow-none border-none space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-24" rounded="sm" />
              <Skeleton className="h-5 w-36" rounded="sm" />
            </div>
            <Skeleton className="h-7 w-20" rounded="full" />
          </div>

          {/* Gauge Arc representation */}
          <div className="py-3 flex flex-col items-center justify-center space-y-3">
            <Skeleton className="w-40 h-40" rounded="full" />
            <div className="space-y-1 flex flex-col items-center">
              <Skeleton className="h-7 w-32" rounded="sm" />
              <Skeleton className="h-3 w-20" rounded="sm" />
            </div>
          </div>

          {/* Bottom stats row */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-subtle">
            <div className="space-y-1">
              <Skeleton className="h-2.5 w-16" rounded="sm" />
              <Skeleton className="h-4 w-20" rounded="sm" />
            </div>
            <div className="space-y-1 text-right flex flex-col items-end">
              <Skeleton className="h-2.5 w-16" rounded="sm" />
              <Skeleton className="h-4 w-20" rounded="sm" />
            </div>
          </div>
        </div>

        {/* 3. Period Timeline horizontal tracker skeleton */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-3 w-28" rounded="sm" />
            <Skeleton className="h-3 w-16" rounded="sm" />
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="bg-[var(--surface-color)] rounded-card-nested p-2 flex flex-col items-center gap-1.5 py-3 shadow-none border-none"
              >
                <Skeleton className="w-3 h-2" rounded="sm" />
                <Skeleton className="w-6 h-4" rounded="sm" />
                <Skeleton className="w-4 h-1.5" rounded="full" />
              </div>
            ))}
          </div>
        </div>

        {/* 4. Transactions List Skeleton */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-3.5 w-36" rounded="sm" />
            <Skeleton className="h-3 w-12" rounded="sm" />
          </div>
          <div className="space-y-2">
            <TransactionItemSkeleton />
            <TransactionItemSkeleton />
            <TransactionItemSkeleton />
          </div>
        </div>

      </div>

      {/* Floating Bottom Navigation Skeleton Dock */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] pointer-events-none flex justify-center">
        <div className="bg-[var(--surface-color)]/80 backdrop-blur-xl rounded-full h-14 w-72 flex items-center justify-around px-4 shadow-none border-none">
          <Skeleton className="w-6 h-6" rounded="full" />
          <Skeleton className="w-6 h-6" rounded="full" />
          <Skeleton className="w-10 h-10 -mt-3 shadow-none" rounded="full" />
          <Skeleton className="w-6 h-6" rounded="full" />
          <Skeleton className="w-6 h-6" rounded="full" />
        </div>
      </div>
    </div>
  );
};
