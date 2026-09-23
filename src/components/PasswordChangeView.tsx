import React, { useState } from 'react';
import { ChevronLeft, Lock } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TranslationKey } from '../i18n';
import { Button, Input, IconButton } from './ui';

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
    <div className="space-y-6 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <IconButton
          icon={<ChevronLeft size={18} />}
          onClick={onBack}
          variant="muted"
          size="sm"
          aria-label="Tillbaka"
        />
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
            {t('changePassword' as any) || 'Ändra lösenord'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] opacity-80">
            {userEmail}
          </p>
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
