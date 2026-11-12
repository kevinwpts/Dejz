import type { RefObject, SetStateAction } from 'react';
import React, { useState } from 'react';
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
import { setPrivacyBlurMode } from '../../utils/cache/itemMeta';
import { BottomSheet } from '../ui/BottomSheet';
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
  fileInputRef: RefObject<HTMLInputElement | null>;
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
}) => {
  // Sparat mobilnummer – jämförs med fältet så att "Spara uppgifter" bara går att trycka på efter en ändring
  const [savedPhone, setSavedPhone] = useState(() => {
    try {
      return localStorage.getItem('dejz_user_phone') || '';
    } catch {
      return '';
    }
  });
  const hasProfileChanges =
    editName.trim() !== (userName || '').trim() ||
    editEmail.trim() !== (userEmail || '').trim() ||
    editPhone.trim() !== savedPhone.trim();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasProfileChanges) return;
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
    setSavedPhone(editPhone.trim());
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

      {/* Profilbild, namn och e-post – centrerat som i iOS */}
      <section className="flex flex-col items-center text-center pt-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-24 h-24 rounded-full bg-[var(--fill-grouped)] overflow-hidden flex items-center justify-center cursor-pointer active:scale-[0.97] transition-transform"
          title="Byt profilbild"
          aria-label={userAvatar ? 'Byt profilbild' : 'Välj profilbild'}
        >
          {userAvatar ? (
            <img src={userAvatar} alt="" className="w-full h-full object-cover" />
          ) : initialChar ? (
            <span className="font-display font-semibold text-3xl uppercase text-[var(--text-primary)]">
              {initialChar}
            </span>
          ) : (
            <UserCircle size={44} weight="regular" className="text-[var(--text-secondary)]" />
          )}
        </button>

        <span className="mt-3 font-display font-semibold text-xl tracking-[-0.02em] text-[var(--text-primary)] max-w-full truncate">
          {editName || userName || 'Mitt konto'}
        </span>
        {userEmail && !isDemoMode() && <EmailVerificationStatus />}

        <div className="flex items-center justify-center gap-2 mt-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="ui-pill-btn">
            <Camera size={14} weight="regular" />
            <span>{userAvatar ? 'Byt bild' : 'Välj bild'}</span>
          </button>
          {userAvatar && onUpdateAvatar && (
            <button
              type="button"
              onClick={() => onUpdateAvatar(null)}
              className="ui-pill-btn text-[var(--text-secondary)]"
            >
              Ta bort bild
            </button>
          )}
        </div>
      </section>

      {/* Samtycke till nyhetsbrev (opt-in) – kan ändras när som helst */}
      {userEmail && !isDemoMode() && <NewsletterToggle />}

      {/* Personuppgifter */}
      <section>
        <span className="ui-settings-label">Personuppgifter</span>
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div className="ui-admin-card ui-inset-divide [--row-inset:16px]">
            <label className="px-4 py-3 block cursor-text">
              <span className="ui-field-label block mb-0.5">Namn</span>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ditt för- och efternamn"
                className="w-full bg-transparent border-0 p-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </label>

            <label className="px-4 py-3 block cursor-text">
              <span className="ui-field-label block mb-0.5">E-postadress</span>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="namn@exempel.se"
                className="w-full bg-transparent border-0 p-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </label>

            <label className="px-4 py-3 block cursor-text">
              <span className="ui-field-label block mb-0.5">Mobilnummer (valfritt)</span>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="070-123 45 67"
                className="w-full bg-transparent border-0 p-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none tabular-nums"
              />
            </label>
          </div>

          <button type="submit" disabled={!hasProfileChanges && !profileSaved} className="w-full ui-btn-primary">
            {profileSaved ? (
              <>
                <Check size={16} />
                <span>Sparat</span>
              </>
            ) : (
              <span>Spara uppgifter</span>
            )}
          </button>
        </form>
      </section>

      {/* Lösenord & sekretess */}
      <section>
        <span className="ui-settings-label">Lösenord & sekretess</span>
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
              <span className="ui-list-row-title">Ändra lösenord</span>
            </div>
            <span className="ui-admin-chevron">
              <CaretRight size={13} />
            </span>
          </button>

          <button type="button" onClick={handleSendPasswordResetEmail} className="ui-admin-row">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <EnvelopeSimple size={18} weight="regular" />
              </span>
              <span className="ui-list-row-title">Mejla en återställningslänk</span>
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
              <div className="min-w-0 flex-1">
                <span className="ui-list-row-title block">Dölj belopp</span>
                <span className="text-footnote text-[var(--text-secondary)] block mt-0.5">
                  Bra när någon tittar på skärmen
                </span>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={privacyBlurProfile}
              aria-label="Sekretessläge (dölj belopp)"
              onClick={() => {
                const next = !privacyBlurProfile;
                setPrivacyBlurProfile(next);
                setPrivacyBlurMode(next);
                if (typeof document !== 'undefined') {
                  document.documentElement.classList.toggle('privacy-blur', next);
                }
              }}
              className={`ui-switch ${privacyBlurProfile ? 'ui-switch-on' : 'ui-switch-off'}`}
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
          <p className="px-4 pt-2 text-footnote text-[var(--text-secondary)] animate-fade-in" role="status">
            {resetEmailStatus}
          </p>
        )}
      </section>

      {/* Ark för att ändra lösenord */}
      <BottomSheet
        isOpen={isPasswordSheetOpen}
        onClose={() => {
          setIsPasswordSheetOpen(false);
          setPasswordStatus(null);
        }}
        title="Ändra lösenord"
      >
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="ui-sheet-group">
            <div className="px-4 py-3 flex items-center justify-between gap-2">
              <label className="flex-1 cursor-text">
                <span className="ui-field-label block mb-0.5">Nytt lösenord</span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  autoFocus
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minst 6 tecken"
                  className="w-full bg-transparent border-0 p-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
              </label>
              <button
                aria-label={showNewPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                title={showNewPassword ? 'Dölj lösenord' : 'Visa lösenord'}
              >
                {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <label className="px-4 py-3 block cursor-text">
              <span className="ui-field-label block mb-0.5">Upprepa lösenordet</span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Samma lösenord igen"
                className="w-full bg-transparent border-0 p-0 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </label>
          </div>

          {passwordStatus && (
            <p
              role="status"
              className={`px-1 text-footnote font-medium ${
                passwordStatus.type === 'success' ? 'text-positive' : 'text-negative'
              }`}
            >
              {passwordStatus.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!newPassword || !confirmPassword || passwordSaving}
            className="ui-btn-primary"
          >
            <span>{passwordSaving ? 'Sparar…' : 'Spara nytt lösenord'}</span>
          </button>
        </form>
      </BottomSheet>
    </div>
  );
};
