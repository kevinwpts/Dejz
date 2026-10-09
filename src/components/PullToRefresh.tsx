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

  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // Don't intercept touches if a modal is open or not at the very top of the page
      if (document.body.style.overflow === 'hidden' || window.scrollY > 2) {
        isPulling.current = false;
        return;
      }
      if (window.scrollY <= 0 && e.touches.length === 1) {
        startY.current = e.touches[0].pageY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing || document.body.style.overflow === 'hidden') {
        isPulling.current = false;
        return;
      }
      
      const currentY = e.touches[0].pageY;
      const diff = currentY - startY.current;
      
      if (diff > 0 && window.scrollY <= 0) {
        // Apply a resistance factor that increases as we pull further
        const resistance = Math.max(0.2, 0.5 - (diff / 1000));
        const move = diff * resistance;
        pullDistance.set(move);
        if (contentRef.current) {
          contentRef.current.style.transform = `translate3d(0, ${move}px, 0)`;
        }
        
        // Prevent default scrolling only when actively pulling down at the top
        if (diff > 10 && e.cancelable) e.preventDefault();
      } else {
        isPulling.current = false;
        if (contentRef.current) {
          contentRef.current.style.transform = '';
        }
        animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling.current || isRefreshing) {
        isPulling.current = false;
        return;
      }
      isPulling.current = false;
      
      if (pullDistance.get() >= threshold) {
        setIsRefreshing(true);
        if (contentRef.current) {
          contentRef.current.style.transition = 'transform 0.2s ease-out';
          contentRef.current.style.transform = `translate3d(0, ${threshold}px, 0)`;
        }
        animate(pullDistance, threshold, { type: 'spring', stiffness: 300, damping: 30 });
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          if (contentRef.current) {
            contentRef.current.style.transition = 'transform 0.25s ease-out';
            contentRef.current.style.transform = '';
            setTimeout(() => {
              if (contentRef.current) contentRef.current.style.transition = '';
            }, 300);
          }
          animate(pullDistance, 0, { type: 'spring', stiffness: 200, damping: 25 });
        }
      } else {
        if (contentRef.current) {
          contentRef.current.style.transition = 'transform 0.25s ease-out';
          contentRef.current.style.transform = '';
          setTimeout(() => {
            if (contentRef.current) contentRef.current.style.transition = '';
          }, 300);
        }
        animate(pullDistance, 0, { type: 'spring', stiffness: 300, damping: 30 });
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isRefreshing, pullDistance, onRefresh]);

  return (
    <div ref={containerRef} className="relative min-h-dvh">
      {/* Pull Indicator */}
      <motion.div 
        style={{ opacity, scale, y: pullDistance }}
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-16 pointer-events-none z-50"
      >
        <div className="w-8 h-8 rounded-full bg-[var(--surface-elevated)] text-[var(--text-secondary)] flex items-center justify-center border border-subtle">
          <motion.div style={{ rotate }}>
            <RefreshCw size={16} strokeWidth={2.5} />
          </motion.div>
        </div>
      </motion.div>

      {/* Content: clean DOM div with no persistent transforms so sticky children work natively */}
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}
