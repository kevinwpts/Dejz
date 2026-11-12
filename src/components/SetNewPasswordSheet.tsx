import React, { useState } from 'react';
import { Eye, EyeSlash, LockSimple, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { supabase } from '../supabaseClient';

/**
 * Visas när någon kommer från "Glömt lösenord"-mejlet. Personen är då redan inloggad
 * via länken – här väljer hen ett nytt lösenord så att vanlig inloggning fungerar igen.
 */
export const SetNewPasswordSheet: React.FC<{
  open: boolean;
  onDone: () => void;
  onSkip: () => void;
}> = ({ open, onDone, onSkip }) => {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Lösenordet behöver vara minst 6 tecken.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      onDone();
    } catch (err: unknown) {
      const msg = String((err as { message?: string } | null)?.message || '');
      setError(
        /different from the old|same password/i.test(msg)
          ? 'Välj ett lösenord som skiljer sig från det gamla.'
          : /weak|short|at least/i.test(msg)
          ? 'Lösenordet är för svagt. Prova ett längre.'
          : 'Det gick inte att spara. Försök igen om en stund.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Välj nytt lösenord"
    >
      <div className="absolute inset-0 bg-[var(--scrim-color)] animate-fade-in" />
      <form
        onSubmit={save}
        className="relative w-full sm:max-w-md bg-[var(--surface-color)] rounded-t-modal sm:rounded-modal px-5 sm:px-7 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-[var(--shadow-modal)] animate-scale-in space-y-5"
      >
        <div className="space-y-2">
          <span className="w-11 h-11 rounded-full bg-[var(--accent-soft)] text-[var(--accent-color)] flex items-center justify-center">
            <LockSimple size={20} weight="bold" />
          </span>
          <h2 className="font-display font-semibold text-xl text-[var(--text-primary)]">Välj nytt lösenord</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-[1.5]">
            Du är inloggad via länken i mejlet. Välj ett nytt lösenord så kan du logga in som vanligt nästa gång.
          </p>
        </div>

        <label className="block rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-3.5 cursor-text">
          <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Nytt lösenord</span>
          <span className="flex items-center gap-2">
            <input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Minst 6 tecken"
              className="w-full bg-transparent border-0 p-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="ui-clear-btn"
              aria-label={show ? 'Dölj lösenord' : 'Visa lösenord'}
            >
              {show ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>

        {error && (
          <p className="flex items-center gap-1.5 text-xs font-medium text-negative">
            <WarningCircle size={14} weight="bold" />
            {error}
          </p>
        )}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
          >
            {saving && <SpinnerGap size={16} className="animate-spin" />}
            Spara nytt lösenord
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Inte nu
          </button>
        </div>
      </form>
    </div>
  );
};
