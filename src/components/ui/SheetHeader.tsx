import React from 'react';
import { CaretLeft, X } from '@phosphor-icons/react';

/**
 * Ett och samma huvud för alla ark och dialoger.
 *
 * - variant "view" (standard – detaljvyer, väljare, lägg till):
 *   [‹ tillbaka] Rubrik (vänster, 17 px)  ·····  [åtgärder] [✕]
 * - variant "edit" (redigering): Avbryt · Rubrik (centrerad) · [åtgärd]
 */
interface SheetHeaderProps {
  title: React.ReactNode;
  titleId?: string;
  subtitle?: React.ReactNode;
  variant?: 'view' | 'edit';
  /** Visar en tillbakapil före rubriken (undervyer i ett ark) */
  onBack?: () => void;
  /** Den runda stängknappen längst till höger (variant "view") */
  onClose?: () => void;
  /** "Avbryt" till vänster (variant "edit") */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Knappar till höger – före stängknappen (view) eller i högerfältet (edit) */
  actions?: React.ReactNode;
  /** Utan avstånd under huvudet (t.ex. när ett kvitto-huvud följer direkt) */
  flush?: boolean;
  className?: string;
}

export const SheetHeader: React.FC<SheetHeaderProps> = ({
  title,
  titleId,
  subtitle,
  variant = 'view',
  onBack,
  onClose,
  onCancel,
  cancelLabel = 'Avbryt',
  actions,
  flush = false,
  className = '',
}) => {
  const base = `${flush ? 'ui-sheet-sub-header' : 'ui-sheet-header'} ${className}`;

  if (variant === 'edit') {
    return (
      <div className={`${base} !grid grid-cols-[1fr_auto_1fr] gap-2`}>
        <div className="flex items-center justify-start min-w-0">
          {onCancel && (
            <button type="button" onClick={onCancel} className="ui-text-btn">
              {cancelLabel}
            </button>
          )}
        </div>
        <h2 id={titleId} className="ui-sheet-title text-center max-w-[220px]">
          {title}
        </h2>
        <div className="flex items-center justify-end gap-2 min-w-0">{actions}</div>
      </div>
    );
  }

  return (
    <div className={`${base} gap-2`}>
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            title="Tillbaka"
            aria-label="Tillbaka"
            className="ui-icon-btn"
          >
            <CaretLeft size={15} weight="bold" />
          </button>
        )}
        <div className="min-w-0">
          <h2 id={titleId} className="ui-sheet-title block">
            {title}
          </h2>
          {subtitle && (
            <span className="text-footnote text-[var(--text-tertiary)] block truncate mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      </div>
      {(actions || onClose) && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {onClose && (
            <button type="button" onClick={onClose} aria-label="Stäng" className="ui-icon-btn">
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
