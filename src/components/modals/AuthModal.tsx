import React, { useState } from 'react';
import { X, Lock, Envelope, SpinnerGap } from '@phosphor-icons/react';
import { supabase, isSupabaseConfigured } from '../../supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setSuccessMsg('Supabase konfigurerad i preview-läge. Inloggning godkänd.');
        onSuccess(email.trim());
        setTimeout(() => onClose(), 800);
        return;
      }

      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setSuccessMsg('Konto skapat! Kontrollera din e-post för bekräftelselänk.');
        if (data.user?.email) onSuccess(data.user.email);
        setTimeout(() => onClose(), 1500);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setSuccessMsg('Inloggad!');
        if (data.user?.email) onSuccess(data.user.email);
        setTimeout(() => onClose(), 600);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Kunde inte logga in. Kontrollera dina uppgifter.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-[var(--text-primary)]">
            {isSignUp ? 'Skapa konto med Supabase' : 'Logga in med Supabase'}
          </h3>
          <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={20} />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">E-postadress</label>
            <div className="relative">
              <Envelope size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                required
                placeholder="namn@exempel.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">Lösenord</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <SpinnerGap size={16} className="animate-spin" />}
            <span>{isSignUp ? 'Skapa konto' : 'Logga in'}</span>
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
          >
            {isSignUp ? 'Har du redan ett konto? Logga in' : 'Inget konto än? Skapa ett här'}
          </button>
        </div>
      </div>
    </div>
  );
};
