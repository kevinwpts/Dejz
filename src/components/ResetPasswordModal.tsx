import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useScrollLock } from '../hooks/useScrollLock';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
}

export function ResetPasswordModal({
  isOpen,
  onClose,
  onShowToast,
}: ResetPasswordModalProps) {
  useScrollLock(isOpen);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken långt.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Lösenorden matchar inte.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      onShowToast('Ditt lösenord har uppdaterats!', 'success');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Kunde inte uppdatera lösenordet. Försök igen.');
      onShowToast(err.message || 'Ett fel uppstod', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[26px] p-6 sm:p-7 w-full max-w-md shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>

          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 size={30} />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Lösenord uppdaterat!
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ditt nya lösenord har sparats och du kan nu fortsätta använda appen.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-left">
                <div className="w-10 h-10 rounded-[14px] bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                  Välj ett nytt lösenord
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ange ditt nya lösenord nedan för att slutföra återställningen.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 p-3 rounded-[14px] border border-red-500/20 flex items-center gap-2 text-red-500 text-xs font-semibold">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] ml-1">
                    Nytt lösenord
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-60" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minst 6 tecken"
                      className="w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[14px] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-color)] outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] ml-1">
                    Bekräfta lösenord
                  </label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-60" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Upprepa lösenordet"
                      className="w-full bg-[var(--surface-muted)] focus:bg-[var(--surface-color)] border border-[var(--border-color)] rounded-[14px] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-color)] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[var(--accent-color)] text-[var(--text-on-accent)] py-3 px-4 rounded-[14px] font-bold text-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <span>Spara nytt lösenord</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
