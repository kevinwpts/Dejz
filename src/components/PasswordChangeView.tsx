import React, { useState } from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TranslationKey } from '../i18n';
import { Button, Input } from './ui';

interface PasswordChangeViewProps {
  onBack: () => void;
  t: (key: TranslationKey) => string;
  addToast: (message: string, type: 'success' | 'error') => void;
  userEmail?: string;
}

export function PasswordChangeView({ onBack, t, addToast, userEmail }: PasswordChangeViewProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t('passwordRequired' as any));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch' as any));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordTooShort' as any));
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail || '',
        password: currentPassword,
      });

      if (signInError) throw new Error(t('wrongPassword' as any));

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      addToast(t('passwordUpdated' as any), 'success');
      onBack();
    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || t('error' as any));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 w-full font-sans">
      <div className="flex items-center gap-3.5 py-1">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-black/[0.04] dark:border-white/[0.06] shadow-2xs shrink-0"
          aria-label={t('back') || 'Tillbaka'}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] truncate">
            {t('changePassword' as any) || 'Ändra lösenord'}
          </h1>
          {userEmail && (
            <p className="text-[12px] font-normal text-[var(--text-secondary)] opacity-75 truncate">
              {userEmail}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <Input
          label={t('currentPassword' as any) || 'Nuvarande lösenord'}
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          icon={<Lock size={16} />}
        />

        <Input
          label={t('newPassword' as any) || 'Nytt lösenord'}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="••••••••"
          icon={<Lock size={16} />}
        />

        <Input
          label={t('confirmNewPassword' as any) || 'Bekräfta nytt lösenord'}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          icon={<Lock size={16} />}
          error={error}
        />

        <div className="pt-2">
          <Button 
            onClick={handleUpdatePassword}
            loading={isUpdating}
            variant="primary"
            fullWidth
          >
            {t('updatePassword' as any) || 'Uppdatera lösenord'}
          </Button>
        </div>
      </div>
    </div>
  );
}
