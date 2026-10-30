import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from '@phosphor-icons/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  bodyClassName?: string;
  footer?: React.ReactNode;
  maxWidthClass?: string;
  maxHeightClass?: string;
  surfaceClass?: string;
  paddingClass?: string;
  contentClassName?: string;
  zIndexClass?: string;
  disablePadding?: boolean;
  fullScreen?: boolean;
}

export interface BottomSheetOptionProps {
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  isSelected?: boolean;
  onClick: () => void;
}

export const BottomSheetOption: React.FC<BottomSheetOptionProps> = ({
  label,
  subtitle,
  icon,
  badge,
  isSelected,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-3.5 py-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
      isSelected
        ? 'bg-[var(--surface-raised)] text-[var(--text-primary)]'
        : 'hover:bg-[var(--surface-hover)] text-[var(--text-primary)]'
    }`}
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {icon && <div className="shrink-0 text-[var(--text-secondary)]">{icon}</div>}
      <div className="min-w-0 flex-1">
        <span className={`text-[14px] sm:text-[14.5px] block truncate ${isSelected ? 'font-semibold' : 'font-medium'}`}>
          {label}
        </span>
        {subtitle && (
          <span className="text-[11.5px] text-[var(--text-muted)] block truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {badge && (
        <span className="text-xs font-display font-semibold text-[var(--text-muted)] tabular-nums">
          {badge}
        </span>
      )}
      {isSelected && <Check size={14} weight="bold" className="text-[var(--text-primary)]" />}
    </div>
  </button>
);

let openSheetsCount = 0;

function incrementSheetLock() {
  if (typeof document === 'undefined') return;
  openSheetsCount += 1;
  document.body.style.overflow = 'hidden';
}

function decrementSheetLock() {
  if (typeof document === 'undefined') return;
  openSheetsCount = Math.max(0, openSheetsCount - 1);
  if (openSheetsCount === 0) {
    document.documentElement.removeAttribute('data-sheet-open');
    document.body.style.overflow = '';
  }
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  bodyClassName,
  footer,
  maxWidthClass = 'max-w-md',
  maxHeightClass = 'max-h-[90dvh]',
  surfaceClass = 'bg-[var(--surface-color)]',
  paddingClass = 'px-5 pt-2 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]',
  contentClassName,
  zIndexClass = 'z-[110]',
  disablePadding = false,
  fullScreen = false,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsRendered(true);
      setIsClosing(false);
      setDragOffsetY(0);
      setIsDragging(false);
    } else if (isRendered) {
      setIsClosing(true);
      closeTimeoutRef.current = window.setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
        setDragOffsetY(0);
        setIsDragging(false);
      }, 200);
    }
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [isOpen, isRendered]);

  useEffect(() => {
    if (!isRendered) return;
    incrementSheetLock();
    return () => {
      decrementSheetLock();
    };
  }, [isRendered]);

  const triggerAnimatedClose = useCallback(() => {
    setIsClosing(true);
    setIsDragging(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 180);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        triggerAnimatedClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, triggerAnimatedClose]);

  const scrollBodyRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (fullScreen) return;
    const scrollEl = scrollBodyRef.current || sheetRef.current;
    if (scrollEl && scrollEl.scrollTop > 2) return;
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select')) return;
    dragStartYRef.current = e.touches[0].clientY;
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (fullScreen || dragStartYRef.current === null) return;
    const scrollEl = scrollBodyRef.current || sheetRef.current;
    if (scrollEl && scrollEl.scrollTop > 2) {
      dragStartYRef.current = null;
      setDragOffsetY(0);
      setIsDragging(false);
      return;
    }
    const deltaY = e.touches[0].clientY - dragStartYRef.current;
    if (deltaY > 6) {
      setIsDragging(true);
      setDragOffsetY(deltaY);
    } else if (deltaY < 0) {
      setDragOffsetY(0);
    }
  };

  const handleTouchEnd = () => {
    if (dragStartYRef.current === null) return;
    dragStartYRef.current = null;
    if (dragOffsetY > 95) {
      triggerAnimatedClose();
    } else {
      setIsDragging(false);
      setDragOffsetY(0);
    }
  };

  if (!isRendered) return null;

  const effectivePaddingClass = contentClassName
    ? contentClassName
    : disablePadding
    ? ''
    : footer
    ? 'px-5 pb-4'
    : paddingClass;

  const sheetElement = (
    <div
      className={`fixed inset-0 ${zIndexClass} flex ${
        fullScreen ? 'items-stretch' : 'items-end'
      } justify-center p-0`}
      onClick={triggerAnimatedClose}
    >
      {/* Dynamic Backdrop */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-xs pointer-events-none"
        style={{
          opacity: isClosing ? 0 : Math.max(0.2, 1 - dragOffsetY / 380),
          transition: isDragging
            ? 'none'
            : 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Bottom Sheet / Fullscreen Container */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isClosing
            ? 'translateY(100%)'
            : dragOffsetY > 0
            ? `translateY(${dragOffsetY}px)`
            : undefined,
          opacity: isClosing ? 0 : 1,
          transition: isDragging
            ? 'none'
            : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`relative z-10 w-full flex flex-col overflow-hidden ${maxWidthClass} ${
          fullScreen
            ? 'h-[100dvh] max-h-[100dvh] rounded-none border-x border-[var(--border-subtle)]'
            : `mt-auto rounded-t-[28px] rounded-b-none border-t border-x border-[var(--border-subtle)] ${maxHeightClass}`
        } ${surfaceClass} shadow-modal ${
          !isClosing && dragOffsetY === 0 ? 'animate-sheet-up' : ''
        }`}
      >
        {/* Sticky Top Handle & Optional Header */}
        <div
          className={`shrink-0 ${surfaceClass} z-20 ${
            disablePadding ? '' : 'px-5 pt-2'
          }`}
        >
          <div
            className={
              fullScreen
                ? 'pt-[max(0.5rem,env(safe-area-inset-top,0.5rem))]'
                : 'w-full flex justify-center pt-1.5 pb-2.5 cursor-grab active:cursor-grabbing'
            }
          >
            {!fullScreen && (
              <div className="w-10 h-1.5 rounded-full bg-[var(--border-control)]" />
            )}
          </div>

          {title && (
            <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)]">
              <div className="min-w-0">
                <span className="ui-sheet-title block">
                  {title}
                </span>
                {subtitle && (
                  <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
                    {subtitle}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={triggerAnimatedClose}
                className="ui-icon-btn"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Middle Content */}
        <div
          ref={scrollBodyRef}
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${effectivePaddingClass} ${
            title && !disablePadding ? 'pt-4' : ''
          }`}
        >
          {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
        </div>

        {/* Sticky Bottom Footer */}
        {footer && (
          <div
            className={`shrink-0 z-20 ${surfaceClass} border-t border-[var(--border-subtle)] ${
              disablePadding
                ? ''
                : 'px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]'
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sheetElement, document.body);
  }
  return sheetElement;
};
