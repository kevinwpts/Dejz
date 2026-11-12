import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { SheetHeader } from './SheetHeader';

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
  paddingClass = 'px-5 pt-0 pb-[calc(2rem+env(safe-area-inset-bottom,0px))]',
  contentClassName,
  zIndexClass = 'z-[110]',
  disablePadding = false,
  fullScreen = false,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Hårfin linje under arkets huvud när innehållet har scrollats in under det
  const [bodyScrolled, setBodyScrolled] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeTimeoutRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);

  // Justera state direkt i renderingen när isOpen ändras (i stället för i en effect).
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
      setDragOffsetY(0);
      setIsDragging(false);
      setBodyScrolled(false);
    } else if (isRendered) {
      setIsClosing(true);
    }
  }

  // Avbryt en väntande animerad stängning när isOpen ändras eller arket avmonteras.
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  // Ta bort arket från DOM:en när stängningsanimationen är klar.
  useEffect(() => {
    if (isOpen || !isRendered) return;
    const unmountTimer = window.setTimeout(() => {
      setIsRendered(false);
      setIsClosing(false);
      setDragOffsetY(0);
      setIsDragging(false);
    }, 200);
    return () => window.clearTimeout(unmountTimer);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
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
            ? 'h-[100dvh] max-h-[100dvh] rounded-none'
            : `mt-auto rounded-t-sheet rounded-b-none ${maxHeightClass}`
        } ${surfaceClass} shadow-modal ${
          !isClosing && dragOffsetY === 0 ? 'animate-sheet-up' : ''
        }`}
      >
        {/* Sticky Top Handle & Optional Header */}
        <div
          className={`shrink-0 ${surfaceClass} z-20 transition-shadow ${
            disablePadding ? '' : 'px-5 pt-2'
          } ${title && bodyScrolled ? 'ui-header-scrolled' : ''}`}
        >
          <div
            className={
              fullScreen
                ? 'pt-[max(0.5rem,env(safe-area-inset-top,0.5rem))]'
                : 'w-full flex justify-center pt-1.5 pb-2.5 cursor-grab active:cursor-grabbing'
            }
          >
            {!fullScreen && (
              <div className="w-9 h-[5px] rounded-full bg-[var(--border-strong)]" />
            )}
          </div>

          {title && (
            <SheetHeader
              title={title}
              titleId={titleId}
              subtitle={subtitle}
              onClose={triggerAnimatedClose}
              flush
              className="!static !mx-0 !px-0 !bg-transparent"
            />
          )}
        </div>

        {/* Scrollable Middle Content */}
        <div
          ref={scrollBodyRef}
          onScroll={title ? (e) => setBodyScrolled(e.currentTarget.scrollTop > 4) : undefined}
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${effectivePaddingClass} ${
            title && !disablePadding ? 'pt-2' : ''
          }`}
        >
          {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}
        </div>

        {/* Sticky Bottom Footer */}
        {footer && (
          <div
            className={`shrink-0 z-20 ${surfaceClass} ${
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
