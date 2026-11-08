import React, { useState } from 'react';
import { ChatTeardropText, X } from '@phosphor-icons/react';
import { openFeedback } from '../utils/sendFeedback';
import { isDemoMode } from '../utils/demoUtils';

const DISMISSED_KEY = 'dejz_welcome_card_dismissed';
const FIRST_SEEN_KEY = 'dejz_welcome_card_first_seen';
const SHOW_DAYS = 7;

/** Ska kortet visas? Första veckan efter att man kom in i appen, tills man stänger det. */
function shouldShow(): boolean {
  try {
    if (isDemoMode()) return false; // syns inte på skärmbilderna till startsidan
    if (localStorage.getItem(DISMISSED_KEY) === '1') return false;
    let firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY));
    if (!firstSeen) {
      firstSeen = Date.now();
      localStorage.setItem(FIRST_SEEN_KEY, String(firstSeen));
    }
    return Date.now() - firstSeen < SHOW_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Litet välkomstkort på hemskärmen för nya användare: Dejz är nytt, berätta vad du tycker.
 * Kan stängas med ✕ och försvinner av sig självt efter en vecka.
 */
export const WelcomeBetaCard: React.FC = () => {
  const [visible, setVisible] = useState(shouldShow);
  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <section className="ui-card-p relative animate-fade-in" aria-label="Välkommen till Dejz">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Stäng"
        className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
      >
        <X size={14} weight="bold" />
      </button>
      <div className="pr-8">
        <p className="font-display font-semibold text-[15px] text-[var(--text-primary)]">👋 Välkommen till Dejz!</p>
        <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)] text-pretty">
          Dejz är nytt och jag bygger det just nu. Saknar du något eller strular något? Berätta – jag läser allt.
        </p>
      </div>
      <button
        type="button"
        onClick={() => openFeedback('idea')}
        className="mt-3 h-10 px-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-[13px] font-semibold inline-flex items-center gap-2 active:scale-[0.97] transition-all cursor-pointer"
      >
        <ChatTeardropText size={16} weight="bold" />
        Ge feedback
      </button>
    </section>
  );
};
