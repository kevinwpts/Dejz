import React, { useEffect, useId } from 'react';
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

/**
 * Bekräftelseruta ("Ta bort …?", "Logga ut?"). I mobilen ligger den som ett svävande kort
 * nere vid tummen (som moderna bankappar), på större skärmar mitt på.
 * Knapparna ligger staplade: handlingen först, Avbryt under.
 */
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
  const titleId = useId();
  const descriptionId = useId();

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
      className="ui-dialog-scrim animate-fade-in"
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
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="ui-dialog-card animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 px-1 pt-1 pb-6 text-center">
          <h3 id={titleId} className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug">
            {title}
          </h3>
          {description && (
            <p id={descriptionId} className="text-subhead text-[var(--text-secondary)] leading-normal text-balance">
              {description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`${variant === 'danger' ? 'ui-dialog-btn-danger' : 'ui-dialog-btn-primary'} flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{loading ? 'Vänta …' : confirmLabel}</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="ui-dialog-btn-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
