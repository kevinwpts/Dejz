import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TranslationKey } from '../i18n';
import { Button, IconButton, Card } from './ui';

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
    <div className="space-y-5 w-full font-sans">
      <div className="flex items-center gap-3.5 py-1">
        <IconButton
          icon={<ChevronLeft size={20} strokeWidth={2} />}
          onClick={onBack}
          aria-label={t('back') || 'Tillbaka'}
          variant="secondary"
          size="sm"
        />
        <div className="min-w-0">
          <h1 className="text-page-title font-bold text-[var(--text-primary)] truncate">
            {t('changePassword' as any) || 'Ändra lösenord'}
          </h1>
          {userEmail && (
            <p className="text-label font-normal text-[var(--text-secondary)] opacity-75 truncate">
              {userEmail}
            </p>
          )}
        </div>
      </div>

      <Card variant="default" padding="none" className="divide-y divide-menu">
        <div className="px-4 py-3.5 flex items-center justify-between gap-3 min-h-[54px]">
          <span className="text-body font-medium text-[var(--text-primary)] shrink-0">
            {t('currentPassword' as any) || 'Nuvarande lösenord'}
          </span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none flex-1 min-w-0 placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="px-4 py-3.5 flex items-center justify-between gap-3 min-h-[54px]">
          <span className="text-body font-medium text-[var(--text-primary)] shrink-0">
            {t('newPassword' as any) || 'Nytt lösenord'}
          </span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none flex-1 min-w-0 placeholder:text-[var(--text-tertiary)]"
          />
        </div>

        <div className="px-4 py-3.5 flex items-center justify-between gap-3 min-h-[54px]">
          <span className="text-body font-medium text-[var(--text-primary)] shrink-0">
            {t('confirmNewPassword' as any) || 'Bekräfta lösenord'}
          </span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="text-sm font-medium text-[var(--text-primary)] text-right bg-transparent outline-none flex-1 min-w-0 placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </Card>

      {error && (
        <p className="text-label text-[var(--danger-color)] px-1">
          {error}
        </p>
      )}

      <div className="pt-1">
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
  );
}
