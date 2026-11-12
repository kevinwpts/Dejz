import React, { useEffect, useState } from 'react';
import { CheckCircle, SpinnerGap } from '@phosphor-icons/react';
import { FeedbackType, OPEN_FEEDBACK_EVENT, sendFeedback } from '../utils/sendFeedback';
import { SheetHeader } from './ui/SheetHeader';

const TYPES: { id: Exclude<FeedbackType, 'crash'>; label: string; placeholder: string }[] = [
  { id: 'idea', label: 'Idé', placeholder: 'Vad skulle göra Dejz bättre för dig?' },
  { id: 'bug', label: 'Något är fel', placeholder: 'Vad hände? Vad gjorde du precis innan?' },
  { id: 'praise', label: 'Beröm', placeholder: 'Vad gillar du med Dejz?' },
];

/**
 * Snabb feedback från var som helst i appen. Öppnas med openFeedback() (t.ex. pratbubblan i toppen).
 */
export const FeedbackSheet: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Exclude<FeedbackType, 'crash'>>('idea');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const t = (e as CustomEvent).detail?.type;
      if (t === 'idea' || t === 'bug' || t === 'praise') setType(t);
      setSent(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_FEEDBACK_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_FEEDBACK_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const current = TYPES.find((t) => t.id === type) || TYPES[0];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    await sendFeedback(type, message);
    setSending(false);
    setSent(true);
    setMessage('');
  };

  return (
    <div className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Skicka feedback">
      <div className="absolute inset-0 bg-[var(--scrim-color)] animate-fade-in" onClick={() => setOpen(false)} />
      <div className="relative w-full sm:max-w-md bg-[var(--surface-color)] rounded-t-modal sm:rounded-modal px-5 sm:px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-[var(--shadow-modal)] animate-scale-in">
        <SheetHeader
          title={sent ? 'Tack för din feedback' : 'Hjälp oss göra Dejz bättre'}
          subtitle={sent ? undefined : 'Allt du skriver läses av en riktig människa.'}
          onClose={() => setOpen(false)}
          className="!static !mx-0 !px-0 !bg-transparent"
        />

        {sent ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 ui-field-card">
              <CheckCircle size={22} weight="fill" className="text-positive-solid shrink-0 mt-0.5" />
              <p className="text-callout text-[var(--text-secondary)] leading-[1.5]">
                Din feedback har skickats. Jag läser allt som kommer in och hör av mig om jag har en fråga.
                <span className="block mt-1 text-[var(--text-primary)] font-medium">– Kevin, grundare av Dejz</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ui-btn-primary"
            >
              Klar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="ui-segmented grid-cols-3">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  aria-pressed={type === t.id}
                  className={type === t.id ? 'ui-segmented-tab-active' : 'ui-segmented-tab'}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <textarea
              aria-label="Meddelande"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={current.placeholder}
              rows={4}
              autoFocus
              maxLength={2000}
              className="w-full rounded-card-nested bg-[var(--fill-grouped)] px-4 py-3 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-color)] resize-none"
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="ui-btn-primary"
            >
              {sending && <SpinnerGap size={16} className="animate-spin" />}
              Skicka
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
