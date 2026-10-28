import React, { useState, useRef } from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ onRefresh, children }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5 && !refreshing) {
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!pullingRef.current || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      const damped = Math.min(diff * 0.4, 120);
      setPullDistance(damped);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!pullingRef.current || refreshing) return;
    pullingRef.current = false;
    if (pullDistance > 60) {
      setRefreshing(true);
      setPullDistance(60);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full"
    >
      {/* Pull indicator */}
      <div
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? Math.min(pullDistance / 60, 1) : 0,
        }}
        className="overflow-hidden transition-all duration-200 flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)] gap-2"
      >
        <ArrowClockwise
          size={18}
          className={`text-[var(--text-primary)] ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: !refreshing ? `rotate(${pullDistance * 3}deg)` : undefined }}
        />
      </div>

      <div>{children}</div>
    </div>
  );
};
