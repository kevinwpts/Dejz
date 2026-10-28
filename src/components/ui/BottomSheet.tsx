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
        <span className={`text-[13px] sm:text-sm block truncate ${isSelected ? 'font-bold' : 'font-semibold'}`}>
          {label}
        </span>
        {subtitle && (
          <span className="text-[11px] text-[var(--text-muted)] block truncate mt-0.5">
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
  document.documentElement.setAttribute('data-sheet-open', 'true');
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
  maxHeightClass = 'max-h-[92dvh]',
  surfaceClass = 'bg-[var(--surface-color)]',
  paddingClass = 'p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]',
  contentClassName,
  zIndexClass = 'z-[110]',
  disablePadding = false,
}) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartTimeRef = useRef<number>(0);
  const canDragCurrentGestureRef = useRef<boolean>(false);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsRendered(true);
      setIsClosing(false);
      setDragY(0);
    } else if (isRendered) {
      setIsClosing(true);
      closeTimeoutRef.current = window.setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
        setDragY(0);
      }, 240);
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
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 220);
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

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(
      target.closest('input, textarea, select, [data-no-sheet-drag="true"]')
    );
  };

  const findScrollableParent = (target: EventTarget | null): HTMLElement | null => {
    let el = target instanceof HTMLElement ? target : null;
    while (el && el !== sheetRef.current) {
      const style = window.getComputedStyle(el);
      const overflowY = style.overflowY;
      if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
        return el;
      }
      el = el.parentElement;
    }
    if (
      sheetRef.current &&
      sheetRef.current.scrollHeight > sheetRef.current.clientHeight
    ) {
      return sheetRef.current;
    }
    return null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isClosing || e.touches.length !== 1) return;
    if (isInteractiveTarget(e.target)) {
      canDragCurrentGestureRef.current = false;
      return;
    }

    const scrollable = findScrollableParent(e.target);
    const isOnDragHandle =
      e.target instanceof HTMLElement && Boolean(e.target.closest('[data-sheet-handle="true"]'));

    if (!isOnDragHandle && scrollable && scrollable.scrollTop > 2) {
      canDragCurrentGestureRef.current = false;
      return;
    }

    dragStartYRef.current = e.touches[0].clientY;
    dragStartTimeRef.current = performance.now();
    canDragCurrentGestureRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canDragCurrentGestureRef.current || dragStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartYRef.current;

    if (!isDragging) {
      if (deltaY > 6) {
        setIsDragging(true);
      } else if (deltaY < -6) {
        // User is scrolling down inside the sheet
        canDragCurrentGestureRef.current = false;
        dragStartYRef.current = null;
        return;
      } else {
        return;
      }
    }

    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      // Subtle upward rubber-banding
      setDragY(deltaY * 0.16);
    }
  };

  const finishDrag = () => {
    if (!isDragging || dragStartYRef.current === null) {
      dragStartYRef.current = null;
      canDragCurrentGestureRef.current = false;
      setIsDragging(false);
      return;
    }

    const elapsed = Math.max(1, performance.now() - dragStartTimeRef.current);
    const velocity = dragY / elapsed; // px per ms

    setIsDragging(false);
    dragStartYRef.current = null;
    canDragCurrentGestureRef.current = false;

    if (dragY > 95 || (dragY > 35 && velocity > 0.48)) {
      triggerAnimatedClose();
    } else {
      setDragY(0);
    }
  };

  // Pointer events for desktop drag on the handle bar
  const handleHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || isClosing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = performance.now();
    canDragCurrentGestureRef.current = true;
    setIsDragging(true);
  };

  const handleHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || !isDragging || dragStartYRef.current === null) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (deltaY > 0) {
      setDragY(deltaY);
    } else {
      setDragY(deltaY * 0.16);
    }
  };

  const handleHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    finishDrag();
  };

  if (!isRendered) return null;

  const backdropProgress = Math.max(0, Math.min(1, 1 - Math.max(0, dragY) / 340));
  const computedBackdropOpacity = isClosing ? 0 : backdropProgress;

  const effectivePaddingClass = contentClassName
    ? contentClassName
    : disablePadding
    ? ''
    : paddingClass;

  const sheetElement = (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center p-0`}
      onClick={triggerAnimatedClose}
    >
      {/* Dynamic Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs pointer-events-none"
        style={{
          opacity: computedBackdropOpacity,
          transition: isDragging ? 'none' : 'opacity 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />

      {/* Sheet Container */}
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={finishDrag}
        onTouchCancel={finishDrag}
        style={{
          transform: isClosing
            ? 'translateY(105%)'
            : dragY !== 0
            ? `translateY(${dragY}px)`
            : undefined,
          transition: isDragging
            ? 'none'
            : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), height 240ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        className={`relative z-10 w-full ${maxWidthClass} mt-auto ${surfaceClass} rounded-t-[28px] rounded-b-none ${effectivePaddingClass} border-t border-x border-[var(--border-subtle)] shadow-modal ${maxHeightClass} overflow-y-auto overflow-x-hidden ${
          !isClosing && dragY === 0 ? 'animate-sheet-up' : ''
        }`}
      >
        {/* Interactive Drag Handle Area */}
        <div
          data-sheet-handle="true"
          onPointerDown={handleHandlePointerDown}
          onPointerMove={handleHandlePointerMove}
          onPointerUp={handleHandlePointerUp}
          onPointerCancel={handleHandlePointerUp}
          className={`w-full flex justify-center cursor-grab active:cursor-grabbing select-none touch-none ${
            disablePadding || contentClassName ? 'pt-3 pb-1.5' : '-mt-2 pt-2 pb-3'
          }`}
          title="Svep nedåt för att stänga"
        >
          <div className="w-10 h-1.5 rounded-full bg-[var(--border-control)] transition-transform active:scale-x-110" />
        </div>

        {title && (
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] mb-3">
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

        {bodyClassName ? <div className={bodyClassName}>{children}</div> : children}

        {footer && <div className="pt-3 mt-2 border-t border-[var(--border-subtle)]">{footer}</div>}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(sheetElement, document.body);
  }
  return sheetElement;
};
