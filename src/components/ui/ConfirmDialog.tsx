import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Ta bort',
  cancelLabel = 'Avbryt',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!isOpen || loading) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-black/45 backdrop-blur-[3px] animate-fade-in"
      onClick={(e) => {
        e.stopPropagation();
        if (!loading) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-[310px] rounded-[26px] bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 shadow-2xl text-center space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5 px-1">
          <h3 className="font-display font-semibold text-[16px] text-[var(--text-primary)] leading-snug">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="py-2.5 px-3 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer active:scale-[0.98]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`py-2.5 px-3 rounded-2xl text-xs font-semibold text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-[var(--text-primary)] text-[var(--bg-color)] hover:opacity-90'
            }`}
          >
            {loading && (
              <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{loading ? 'Bearbetar...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
