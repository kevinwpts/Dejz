import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistance = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Threshold for triggering refresh
  const threshold = 70;
  
  // Transform pull distance to opacity and rotation
  const opacity = useTransform(pullDistance, [0, threshold], [0, 1]);
  const rotate = useTransform(pullDistance, [0, threshold], [0, 360]);
  const scale = useTransform(pullDistance, [0, threshold * 0.8], [0.6, 1]);

  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY <= 0) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;
      
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;
      
      if (diff > 0 && window.scrollY <= 0) {
        // Apply a resistance factor that increases as we pull further
        const resistance = Math.max(0.2, 0.5 - (diff / 1000));
        const move = diff * resistance;
        pullDistance.set(move);
        
        // Prevent default scrolling when pulling
        if (e.cancelable) e.preventDefault();
      } else {
        isPulling.current = false;
        animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) return;
      isPulling.current = false;
      
      if (pullDistance.get() >= threshold) {
        setIsRefreshing(true);
        animate(pullDistance, threshold, { type: 'spring', stiffness: 300, damping: 30 });
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          animate(pullDistance, 0, { type: 'spring', stiffness: 200, damping: 25 });
        }
      } else {
        animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, onRefresh]);

  return (
    <div ref={containerRef} className="relative min-h-dvh overflow-x-hidden">
      {/* Pull Indicator */}
      <motion.div 
        style={{ opacity, scale, y: pullDistance }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-50"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] flex items-center justify-center border border-white/10">
          <motion.div style={{ rotate }}>
            <RefreshCw size={16} strokeWidth={2.5} />
          </motion.div>
        </div>
      </motion.div>

      {/* Content */}
      <motion.div style={{ y: pullDistance }}>
        {children}
      </motion.div>
    </div>
  );
}
