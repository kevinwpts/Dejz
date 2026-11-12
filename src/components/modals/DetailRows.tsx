import React from 'react';

/**
 * Rader i detaljvyernas infokort (köp, fast utgift, inkomst).
 * Kort värde: grå etikett till vänster, värdet till höger (accentfärg om det går att trycka på).
 * Lång text: etiketten överst och värdet under.
 */

interface DetailLinkRowProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Liten ikon före värdet (kategori, betalsätt) */
  icon?: React.ReactNode;
  onClick: () => void;
  /** Färg på värdet: accent (standard) eller varning (t.ex. uppsagd) */
  tone?: 'accent' | 'caution';
}

export function DetailLinkRow({ label, value, icon, onClick, tone = 'accent' }: DetailLinkRowProps) {
  return (
    <button type="button" onClick={onClick} className="ui-detail-row-btn">
      <span className="ui-detail-label">{label}</span>
      <span className={tone === 'caution' ? 'ui-detail-value text-caution' : 'ui-detail-value-link'}>
        {icon}
        <span className="truncate">{value}</span>
      </span>
    </button>
  );
}

export function DetailRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ui-detail-row">
      <span className="ui-detail-label">{label}</span>
      {children}
    </div>
  );
}

export function DetailStackRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="ui-detail-stack">
      <span className="text-footnote font-normal text-[var(--text-secondary)]">{label}</span>
      {children}
    </div>
  );
}
