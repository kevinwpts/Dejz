import React, { useState } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Button, Input, Modal } from './ui';

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      center
      size="sm"
      showCloseButton={true}
      bodyClassName="p-6 sm:p-7"
    >
      {success ? (
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-[14px] flex items-center justify-center mx-auto border border-emerald-500/20 shadow-xs">
            <CheckCircle2 size={30} strokeWidth={2} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
              Lösenord uppdaterat!
            </h3>
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Ditt nya lösenord har sparats och du kan nu fortsätta använda appen.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left pr-8">
            <div className="w-10 h-10 rounded-[14px] bg-[var(--surface-color)] text-[var(--text-primary)] flex items-center justify-center mb-3 border-none">
              <Lock size={18} strokeWidth={2} />
            </div>
            <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
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
              icon={<Lock size={15} strokeWidth={2} />}
            />

            <Input
              label="Bekräfta lösenord"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Upprepa lösenordet"
              icon={<Lock size={15} strokeWidth={2} />}
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
    </Modal>
  );
}
