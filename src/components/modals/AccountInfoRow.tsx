import { useState } from 'react';
import type { AccountDisplayInfo } from '../../utils/accountDisplay';

/** Raden "Konto" i detaljvyer. Nummer och Visa/Dölj syns bara när det riktiga numret är känt. */
export function AccountInfoRow({ info }: { info: AccountDisplayInfo }) {
  const [showFull, setShowFull] = useState(false);
  const number = showFull ? info.fullNumber : info.maskedNumber;
  const canReveal = info.fullNumber !== null && info.fullNumber !== info.maskedNumber;

  return (
    <div className="ui-row">
      <span className="ui-info-label">Konto</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className="ui-info-value truncate max-w-[190px] sm:max-w-[230px]">
          {info.label}
          {number && ` · ${number}`}
        </span>
        {canReveal && (
          <button
            type="button"
            onClick={() => setShowFull((prev) => !prev)}
            aria-label={showFull ? 'Dölj kontonummer' : 'Visa kontonummer'}
            className="px-2 py-0.5 rounded-md bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          >
            {showFull ? 'Dölj' : 'Visa'}
          </button>
        )}
      </div>
    </div>
  );
}
