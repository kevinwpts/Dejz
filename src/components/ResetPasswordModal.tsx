import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useScrollLock } from '../hooks/useScrollLock';
import { Button, Input, IconButton } from './ui';

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
          className="bg-white dark:bg-[#242424] border border-[#E6E2D8] dark:border-[#383838] rounded-[24px] p-6 sm:p-7 w-full max-w-md shadow-2xl relative"
        >
          <div className="absolute top-5 right-5">
            <IconButton
              icon={<X size={16} />}
              onClick={onClose}
              variant="muted"
              size="sm"
              aria-label="Stäng"
            />
          </div>

          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-[#E8F8F0] dark:bg-[#0D2E1F] text-[#05B862] rounded-full flex items-center justify-center mx-auto border border-[#05B862]/20">
                <CheckCircle2 size={30} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg sm:text-xl font-bold text-[#1C1917] dark:text-white">
                  Lösenord uppdaterat!
                </h3>
                <p className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8]">
                  Ditt nya lösenord har sparats och du kan nu fortsätta använda appen.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1 text-left pr-8">
                <div className="w-10 h-10 rounded-[14px] bg-[#EFECE6] dark:bg-[#2D2D2D] text-[#1C1917] dark:text-white flex items-center justify-center mb-3">
                  <Lock size={20} />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#1C1917] dark:text-white">
                  Välj ett nytt lösenord
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Ange ditt nya lösenord nedan för att slutföra återställningen.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Input
                  label="Nytt lösenord"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minst 6 tecken"
                  icon={<Lock size={15} />}
                />

                <Input
                  label="Bekräfta lösenord"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Upprepa lösenordet"
                  icon={<Lock size={15} />}
                  error={error}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  fullWidth
                  variant="primary"
                  loading={loading}
                >
                  Spara nytt lösenord
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
