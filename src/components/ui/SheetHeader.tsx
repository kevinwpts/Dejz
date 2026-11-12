import React, { useEffect, useRef, useState } from 'react';
import { CaretLeft, X } from '@phosphor-icons/react';

/**
 * Ett och samma huvud för alla ark och dialoger.
 *
 * - variant "view" (standard – detaljvyer, väljare, lägg till):
 *   [‹ tillbaka] Rubrik (vänster, 17 px)  ·····  [åtgärder] [✕]
 * - variant "edit" (redigering): samma utseende – rubrik till vänster och ✕ som avbryter
 *   (onCancel, tillgängligt namn "Avbryt"). Spara-knappen ligger längst ner i arket.
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
  /** ✕-knappen i variant "edit": avbryter redigeringen utan att spara */
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
  const rootRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolledUnder(rootRef);
  const base = `${flush ? 'ui-sheet-sub-header' : 'ui-sheet-header'} ${
    scrolled ? 'ui-header-scrolled' : ''
  } ${className}`;

  // Redigering ser ut som alla andra ark: rubrik till vänster + ✕ (som avbryter utan att spara).
  const closeAction = variant === 'edit' ? onCancel : onClose;
  const closeLabel = variant === 'edit' ? cancelLabel : 'Stäng';

  return (
    <div ref={rootRef} className={`${base} gap-2`}>
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
      {(actions || closeAction) && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          {closeAction && (
            <button
              type="button"
              onClick={closeAction}
              aria-label={closeLabel}
              title={closeLabel}
              className="ui-icon-btn"
            >
              <X size={14} weight="bold" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/** Sant när innehållet i närmaste scrollbara förälder har scrollats in under huvudet (för hårfin linje). */
function useScrolledUnder(ref: React.RefObject<HTMLElement | null>): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;
    // Bara fasta (sticky) huvuden behöver linjen
    if (window.getComputedStyle(el).position !== 'sticky') return;
    let scroller: HTMLElement | null = el.parentElement;
    while (scroller) {
      const oy = window.getComputedStyle(scroller).overflowY;
      if (oy === 'auto' || oy === 'scroll') break;
      scroller = scroller.parentElement;
    }
    if (!scroller) return;
    const target = scroller;
    const update = () => setScrolled(target.scrollTop > 4);
    target.addEventListener('scroll', update, { passive: true });
    return () => target.removeEventListener('scroll', update);
  }, [ref]);
  return scrolled;
}
