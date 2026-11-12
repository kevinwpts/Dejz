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
  // Fingret ligger på raden: ingen animation, raden följer fingret direkt
  const [isTouching, setIsTouching] = useState(false);

  // iOS-stil: varje åtgärd är en egen färgad ruta i radens fulla höjd, med ikon och text
  const ACTION_SLOT = 76;
  const actionCount = [onToggleHeart, onTogglePackage, onToggleExclude].filter(Boolean).length;
  const ACTION_WIDTH = actionCount * ACTION_SLOT;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onToggleHeart && !onTogglePackage && !onToggleExclude) return;
    const t = e.touches[0];
    touchStartRef.current = {
      x: t.clientX,
      y: t.clientY,
      startOffset: offsetX,
    };
    isHorizontalSwipeRef.current = null;
    setIsTouching(true);
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
    setIsTouching(false);

    if (offsetX < -ACTION_WIDTH / 2.2) {
      setOffsetX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  // Öppen rad vilar alltid exakt vid åtgärdernas bredd (även om antalet åtgärder ändras)
  const translateX = isOpen && !isTouching ? -ACTION_WIDTH : offsetX;

  const closeActions = () => {
    setOffsetX(0);
    setIsOpen(false);
  };

  return (
    <div
      className={`ui-swipe-row ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Åtgärderna ligger bakom raden och syns när raden glider åt vänster */}
      {(isOpen || offsetX < -4) && (
        <div
          className="absolute inset-y-0 right-0 flex items-stretch z-0"
          style={{ width: `${ACTION_WIDTH}px` }}
        >
          {onToggleHeart && (
            <button
              aria-label={isHearted ? 'Ta bort sparat köp' : 'Spara köp'}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleHeart();
                closeActions();
              }}
              title={isHearted ? 'Ta bort sparat köp' : 'Spara köp'}
              className="ui-swipe-action ui-swipe-action-heart"
            >
              <Heart size={20} weight="fill" />
              <span>{isHearted ? 'Ta bort' : 'Spara'}</span>
            </button>
          )}
          {onTogglePackage && (
            <button
              aria-label={isWaitingForPackage ? 'Markera paket mottaget' : 'Väntar på paket'}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePackage();
                closeActions();
              }}
              title={isWaitingForPackage ? 'Markera paket mottaget' : 'Väntar på paket'}
              className="ui-swipe-action ui-swipe-action-package"
            >
              <Package size={20} weight="fill" />
              <span>{isWaitingForPackage ? 'Mottaget' : 'Paket'}</span>
            </button>
          )}
          {onToggleExclude && (
            <button
              aria-label={isExcluded ? 'Inkludera i budget' : 'Exkludera ur budget'}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExclude();
                closeActions();
              }}
              title={isExcluded ? 'Inkludera i budget' : 'Exkludera ur budget'}
              className="ui-swipe-action ui-swipe-action-exclude"
            >
              {isExcluded ? <Eye size={20} weight="fill" /> : <EyeSlash size={20} weight="fill" />}
              <span>{isExcluded ? 'Räkna med' : 'Räkna inte'}</span>
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
          transform: translateX !== 0 ? `translateX(${translateX}px)` : undefined,
          transition: isTouching ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="ui-swipe-row-front"
      >
        {children}
      </div>
    </div>
  );
};
