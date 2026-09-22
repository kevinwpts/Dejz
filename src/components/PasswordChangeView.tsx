import React, { useState } from 'react';
import { Loader2, ChevronLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { TranslationKey } from '../i18n';

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
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)]">
        <ChevronLeft size={16} />
        {t('back' as any)}
      </button>

      <div className="space-y-5">
        <div className="space-y-2 text-left">
          <label className="text-label-caps text-[var(--text-secondary)] ml-1">
            {t('currentPassword' as any)}
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full bg-[var(--surface-muted)] hover:bg-[var(--surface-color)]/55 focus:bg-[var(--surface-color)] border border-[var(--border-color)] focus:border-[var(--accent-color)]/40 rounded-[14px] px-6 py-4 text-body-md font-semibold text-[var(--text-primary)] transition-all duration-300 outline-none shadow-xs placeholder:text-[var(--text-secondary)]/30 tracking-tight"
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2 text-left">
          <label className="text-label-caps text-[var(--text-secondary)] ml-1">
            {t('newPassword' as any)}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-[var(--surface-muted)] hover:bg-[var(--surface-color)]/55 focus:bg-[var(--surface-color)] border border-[var(--border-color)] focus:border-[var(--accent-color)]/40 rounded-[14px] px-6 py-4 text-body-md font-semibold text-[var(--text-primary)] transition-all duration-300 outline-none shadow-xs placeholder:text-[var(--text-secondary)]/30 tracking-tight"
            placeholder="••••••••"
          />
        </div>

        <div className="space-y-2 text-left">
          <label className="text-label-caps text-[var(--text-secondary)] ml-1">
            {t('confirmNewPassword' as any)}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-[var(--surface-muted)] hover:bg-[var(--surface-color)]/55 focus:bg-[var(--surface-color)] border border-[var(--border-color)] focus:border-[var(--accent-color)]/40 rounded-[14px] px-6 py-4 text-body-md font-semibold text-[var(--text-primary)] transition-all duration-300 outline-none shadow-xs placeholder:text-[var(--text-secondary)]/30 tracking-tight"
            placeholder="••••••••"
          />
          {error && (
            <p className="text-xs font-semibold text-danger ml-1 uppercase tracking-tight">{error}</p>
          )}
        </div>

        <button 
          onClick={handleUpdatePassword}
          disabled={isUpdating}
          className="btn-primary w-full py-4 h-auto text-sm shadow-xs uppercase font-bold"
        >
          {isUpdating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {t('updating' as any)}
            </>
          ) : (
            t('updatePassword' as any)
          )}
        </button>
      </div>
    </div>
  );
}
