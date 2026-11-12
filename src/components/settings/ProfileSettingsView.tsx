import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import { isDemoMode } from '../../utils/demoUtils';
import { EmailVerificationStatus } from '../EmailVerification';
import { NewsletterToggle } from '../NewsletterToggle';
import {
  UserCircle,
  Camera,
  CaretRight,
  Check,
  Eye,
  EyeSlash,
  Key,
  EnvelopeSimple,
} from '@phosphor-icons/react';
import { supabase } from '../../supabaseClient';
import { setPrivacyBlurMode } from '../../utils/appCache';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { appOrigin } from '../../utils/platform';

export interface ProfileSettingsViewProps {
  onUpdateName?: (name: string) => void;
  editName: string;
  editEmail: string;
  onUpdateEmail?: (email: string) => void;
  userEmail: string | null;
  editPhone: string;
  setProfileSaved: (value: SetStateAction<boolean>) => void;
  newPassword: string;
  setPasswordStatus: (value: SetStateAction<{ type: "success" | "error"; text: string; } | null>) => void;
  confirmPassword: string;
  setPasswordSaving: (value: SetStateAction<boolean>) => void;
  setNewPassword: (value: SetStateAction<string>) => void;
  setConfirmPassword: (value: SetStateAction<string>) => void;
  setIsPasswordSheetOpen: (value: SetStateAction<boolean>) => void;
  setResetEmailStatus: (value: SetStateAction<string | null>) => void;
  userName?: string | null;
  hiddenAvatarInput: React.ReactElement;
  fileInputRef: RefObject<HTMLInputElement>;
  userAvatar?: string | null;
  onUpdateAvatar?: (avatarDataUrl: string | null) => void;
  setEditName: (value: SetStateAction<string>) => void;
  setEditEmail: (value: SetStateAction<string>) => void;
  setEditPhone: (value: SetStateAction<string>) => void;
  profileSaved: boolean;
  privacyBlurProfile: boolean;
  setPrivacyBlurProfile: (value: SetStateAction<boolean>) => void;
  resetEmailStatus: string | null;
  isPasswordSheetOpen: boolean;
  showNewPassword: boolean;
  setShowNewPassword: (value: SetStateAction<boolean>) => void;
  passwordStatus: { type: "success" | "error"; text: string; } | null;
  passwordSaving: boolean;
  securityConfirmAction: "reset" | "delete" | null;
  securityProcessing: boolean;
  setSecurityProcessing: (value: SetStateAction<boolean>) => void;
  onDeleteAccount: () => void;
  setSecurityConfirmAction: (value: SetStateAction<"reset" | "delete" | null>) => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  onUpdateName,
  editName,
  editEmail,
  onUpdateEmail,
  userEmail,
  editPhone,
  setProfileSaved,
  newPassword,
  setPasswordStatus,
  confirmPassword,
  setPasswordSaving,
  setNewPassword,
  setConfirmPassword,
  setIsPasswordSheetOpen,
  setResetEmailStatus,
  userName,
  hiddenAvatarInput,
  fileInputRef,
  userAvatar,
  onUpdateAvatar,
  setEditName,
  setEditEmail,
  setEditPhone,
  profileSaved,
  privacyBlurProfile,
  setPrivacyBlurProfile,
  resetEmailStatus,
  isPasswordSheetOpen,
  showNewPassword,
  setShowNewPassword,
  passwordStatus,
  passwordSaving,
  securityConfirmAction,
  securityProcessing,
  setSecurityProcessing,
  onDeleteAccount,
  setSecurityConfirmAction,
}) => {
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateName) {
      onUpdateName(editName.trim());
    }
    const trimmedEmail = editEmail.trim();
    if (onUpdateEmail && trimmedEmail && trimmedEmail !== userEmail) {
      onUpdateEmail(trimmedEmail);
      try {
        await supabase.auth.updateUser({ email: trimmedEmail });
      } catch {
        // ignore if offline or preview session
      }
    }
    try {
      localStorage.setItem('dejz_user_phone', editPhone.trim());
    } catch {
      // ignore
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1800);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordStatus({
        type: 'error',
        text: 'Lösenordet måste vara minst 6 tecken långt.',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({
        type: 'error',
        text: 'Lösenorden matchar inte.',
      });
      return;
    }

    setPasswordSaving(true);
    setPasswordStatus(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        setPasswordStatus({
          type: 'error',
          text: error.message || 'Kunde inte uppdatera lösenordet.',
        });
      } else {
        setPasswordStatus({
          type: 'success',
          text: 'Ditt lösenord har uppdaterats!',
        });
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setIsPasswordSheetOpen(false);
          setPasswordStatus(null);
        }, 1400);
      }
    } catch {
      setPasswordStatus({
        type: 'error',
        text: 'Ett oväntat fel uppstod. Försök igen.',
      });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    const targetEmail = (editEmail || userEmail || '').trim();
    if (!targetEmail) {
      setResetEmailStatus('Ange en e-postadress först.');
      setTimeout(() => setResetEmailStatus(null), 3000);
      return;
    }
    try {
      await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: appOrigin(),
      });
      setResetEmailStatus(`Återställningslänk skickad till ${targetEmail}`);
    } catch {
      setResetEmailStatus(`Återställningslänk skickad till ${targetEmail}`);
    }
    setTimeout(() => setResetEmailStatus(null), 4000);
  };

  const initialChar = (editName || userName || userEmail || '').trim().charAt(0);

  return (
    <div className="ui-page animate-slide-in-right">
      {hiddenAvatarInput}

      {/* Topp-kort: Profilbild & kontostatus */}
      <section className="ui-card-p flex items-center gap-4">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center relative group cursor-pointer"
            title="Byt profilbild"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
            ) : initialChar ? (
              <span className="font-display font-semibold text-xl uppercase text-[var(--text-primary)]">
                {initialChar}
              </span>
            ) : (
              <UserCircle size={34} weight="duotone" className="text-[var(--text-secondary)]" />
            )}
            <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
              <Camera size={18} weight="bold" />
            </span>
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <span className="font-display font-semibold text-base text-[var(--text-primary)] block truncate">
            {editName || userName || 'Mitt konto'}
          </span>
          <span className="text-xs text-[var(--text-secondary)] block truncate mt-0.5">
            {editEmail || userEmail || 'Ingen e-post angiven'}
          </span>
          {userEmail && !isDemoMode() && <EmailVerificationStatus />}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[12px] font-medium text-[var(--text-primary)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera size={12} weight="regular" />
              <span>{userAvatar ? 'Byt bild' : 'Välj bild'}</span>
            </button>
            {userAvatar && onUpdateAvatar && (
              <button
                type="button"
                onClick={() => onUpdateAvatar(null)}
                className="px-2.5 py-1 rounded-full text-[12px] font-medium text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                Ta bort
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Samtycke till nyhetsbrev (opt-in) – kan ändras när som helst */}
      {userEmail && !isDemoMode() && <NewsletterToggle />}

      {/* Sektion 1: Personuppgifter */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">Personuppgifter</h2>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="ui-admin-card divide-y divide-[var(--border-subtle)]">
            <label className="px-4 py-3 block cursor-text">
              <span className="text-[11px] font-normal text-[var(--text-secondary)] block mb-0.5">
                Namn
              </span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ditt för- och efternamn"
                className="w-full bg-transparent border-0 p-0 text-[14px] font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
              />
            </label>

            <label className="px-4 py-3 block cursor-text">
              <span className="text-[11px] font-normal text-[var(--text-secondary)] block mb-0.5">
                E-postadress
              </span>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="namn@exempel.se"
                className="w-full bg-transparent border-0 p-0 text-[14px] font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
              />
            </label>

            <label className="px-4 py-3 block cursor-text">
              <span className="text-[11px] font-normal text-[var(--text-secondary)] block mb-0.5">
                Mobilnummer
              </span>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="070-123 45 67"
                className="w-full bg-transparent border-0 p-0 text-[14px] font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none tabular-nums"
              />
            </label>
          </div>

          <button type="submit" className="w-full ui-btn-primary">
            {profileSaved ? (
              <>
                <Check size={14} weight="bold" />
                <span>Sparat</span>
              </>
            ) : (
              <span>Spara uppgifter</span>
            )}
          </button>
        </form>
      </section>

      {/* Sektion 2: Lösenord & säkerhet */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">Lösenord & säkerhet</h2>
        </div>

        <div className="ui-admin-card">
          <button
            type="button"
            onClick={() => {
              setNewPassword('');
              setConfirmPassword('');
              setPasswordStatus(null);
              setIsPasswordSheetOpen(true);
            }}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Key size={18} weight="regular" />
              </span>
              <span className="font-normal text-[13px] sm:text-[14px] text-[var(--text-primary)] truncate">
                Ändra lösenord
              </span>
            </div>
            <span className="ui-admin-chevron">
              <CaretRight size={13} />
            </span>
          </button>

          <button
            type="button"
            onClick={handleSendPasswordResetEmail}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <EnvelopeSimple size={18} weight="regular" />
              </span>
              <span className="font-normal text-[13px] sm:text-[14px] text-[var(--text-primary)] truncate">
                Skicka återställningslänk
              </span>
            </div>
            <span className="ui-admin-chevron">
              <CaretRight size={13} />
            </span>
          </button>

          <div className="ui-admin-row-static">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                {privacyBlurProfile ? (
                  <EyeSlash size={18} weight="regular" />
                ) : (
                  <Eye size={18} weight="regular" />
                )}
              </span>
              <span className="font-normal text-[13px] sm:text-[14px] text-[var(--text-primary)] truncate">
                Sekretessläge (dölj belopp)
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={privacyBlurProfile}
              onClick={() => {
                const next = !privacyBlurProfile;
                setPrivacyBlurProfile(next);
                setPrivacyBlurMode(next);
                if (typeof document !== 'undefined') {
                  document.documentElement.classList.toggle('privacy-blur', next);
                }
              }}
              className={`ui-switch ${
                privacyBlurProfile ? 'ui-switch-on' : 'ui-switch-off'
              }`}
            >
              <span
                className={`ui-switch-thumb ${
                  privacyBlurProfile ? 'ui-switch-thumb-on' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {resetEmailStatus && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium text-center animate-fade-in">
            {resetEmailStatus}
          </div>
        )}
      </section>

      {/* BottomSheet för att ändra lösenord */}
      <BottomSheet
        isOpen={isPasswordSheetOpen}
        onClose={() => {
          setIsPasswordSheetOpen(false);
          setPasswordStatus(null);
        }}
        title="Ändra lösenord"
      >
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between gap-2">
              <label className="flex-1 cursor-text">
                <span className="text-[11px] font-normal text-[var(--text-secondary)] block mb-0.5">
                  Nytt lösenord
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minst 6 tecken"
                  className="w-full bg-transparent border-0 p-0 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                title={showNewPassword ? 'Dölj lösenord' : 'Visa lösenord'}
              >
                {showNewPassword ? <EyeSlash size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <label className="px-4 py-3.5 block cursor-text">
              <span className="text-[11px] font-normal text-[var(--text-secondary)] block mb-0.5">
                Bekräfta nytt lösenord
              </span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Upprepa nytt lösenord"
                className="w-full bg-transparent border-0 p-0 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
              />
            </label>
          </div>

          {passwordStatus && (
            <div
              className={`p-3 rounded-xl text-xs font-medium text-center ${
                passwordStatus.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}
            >
              {passwordStatus.text}
            </div>
          )}

          <button
            type="submit"
            disabled={!newPassword || !confirmPassword || passwordSaving}
            className="ui-btn-primary"
          >
            <Check size={14} weight="bold" />
            <span>{passwordSaving ? 'Uppdaterar...' : 'Spara nytt lösenord'}</span>
          </button>
        </form>
      </BottomSheet>

      {/* Bekräftelsedialog för att radera konto inifrån Profil */}
      <ConfirmDialog
        isOpen={securityConfirmAction === 'delete'}
        loading={securityProcessing}
        title="Radera konto?"
        description="Ditt konto och all sparad data tas bort permanent. Detta går inte att ångra."
        confirmLabel="Radera"
        variant="danger"
        onConfirm={async () => {
          if (securityProcessing) return;
          setSecurityProcessing(true);
          try {
            await onDeleteAccount();
          } finally {
            setSecurityProcessing(false);
            setSecurityConfirmAction(null);
          }
        }}
        onCancel={() => {
          if (!securityProcessing) {
            setSecurityConfirmAction(null);
          }
        }}
      />
    </div>
  );
};
