import React, { useState, useRef } from 'react';
import { Heart, Package, EyeSlash, Eye } from '@phosphor-icons/react';

interface SwipeableTxRowProps {
  children: React.ReactNode;
  isHearted?: boolean;
  isWaitingForPackage?: boolean;
  isExcluded?: boolean;
  onToggleHeart?: () => void;
  onTogglePackage?: () => void;
  onToggleExclude?: () => void;
  className?: string;
}

export const SwipeableTxRow: React.FC<SwipeableTxRowProps> = ({
  children,
  isHearted = false,
  isWaitingForPackage = false,
  isExcluded = false,
  onToggleHeart,
  onTogglePackage,
  onToggleExclude,
  className = '',
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; startOffset: number } | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const ACTION_WIDTH = onToggleExclude ? 148 : 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onToggleHeart && !onTogglePackage && !onToggleExclude) return;
    const t = e.touches[0];
    touchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      startOffset: offsetX,
    };
    isHorizontalSwipeRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy) * 1.2;
      }
    }

    if (isHorizontalSwipeRef.current) {
      const next = Math.max(-ACTION_WIDTH - 16, Math.min(0, touchStartRef.current.startOffset + dx));
      setOffsetX(next);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current) return;
    touchStartRef.current = null;

    if (offsetX < -ACTION_WIDTH / 2.2) {
      setOffsetX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  const closeActions = () => {
    setOffsetX(0);
    setIsOpen(false);
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Bakgrundsknappar som visas vid svep åt vänster */}
      {(isOpen || offsetX < -4) && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-1.5 pr-2 z-0"
          style={{ width: `${ACTION_WIDTH}px` }}
        >
          {onToggleHeart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleHeart();
                closeActions();
              }}
              title={isHearted ? 'Ta bort sparat köp' : 'Spara köp'}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
                isHearted
                  ? 'bg-rose-500 text-white'
                  : 'bg-[var(--bg-color)] border border-[var(--border-subtle)] text-rose-500'
              }`}
            >
              <Heart size={16} weight={isHearted ? 'fill' : 'bold'} />
            </button>
          )}
          {onTogglePackage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePackage();
                closeActions();
              }}
              title={isWaitingForPackage ? 'Markera paket mottaget' : 'Väntar på paket'}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
                isWaitingForPackage
                  ? 'bg-amber-500 text-white'
                  : 'bg-[var(--bg-color)] border border-[var(--border-subtle)] text-amber-500'
              }`}
            >
              <Package size={16} weight={isWaitingForPackage ? 'fill' : 'bold'} />
            </button>
          )}
          {onToggleExclude && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExclude();
                closeActions();
              }}
              title={isExcluded ? 'Inkludera i budget' : 'Exkludera ur budget'}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors cursor-pointer ${
                isExcluded
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                  : 'bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}
            >
              {isExcluded ? <Eye size={16} weight="bold" /> : <EyeSlash size={16} weight="bold" />}
            </button>
          )}
        </div>
      )}

      {/* Framsida */}
      <div
        onClickCapture={(e) => {
          if (isOpen) {
            e.stopPropagation();
            closeActions();
          }
        }}
        style={{
          transform: offsetX !== 0 ? `translateX(${offsetX}px)` : undefined,
          transition: touchStartRef.current ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative z-10 bg-[var(--surface-color)]"
      >
        {children}
      </div>
    </div>
  );
};
