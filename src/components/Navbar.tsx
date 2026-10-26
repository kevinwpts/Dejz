import React, { useState } from 'react';
import { UserCircle, MagnifyingGlass, Bell, CaretLeft } from '@phosphor-icons/react';

interface NavbarProps {
  userEmail: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  pageTitle?: string | null;
  onBack?: (() => void) | null;
  onLogoClick?: () => void;
  onProfileClick: () => void;
  onSearchClick: () => void;
  onNotificationsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userEmail,
  userName,
  userAvatar,
  pageTitle,
  onBack,
  onLogoClick,
  onProfileClick,
  onSearchClick,
  onNotificationsClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const initialChar = (userName || userEmail || '').trim().charAt(0);

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-top-color)]/90 backdrop-blur-md pt-[var(--safe-top,env(safe-area-inset-top,0px))]">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Vänster: Tillbakapil + Sidrubrik på undersidor, annars Dejz-loggan */}
        {pageTitle ? (
          <button
            type="button"
            onClick={onBack || onLogoClick}
            className="flex items-center gap-2 min-w-0 focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer text-[var(--text-primary)]"
            aria-label="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" className="shrink-0 -ml-1" />
            <span className="font-display font-bold text-base tracking-tight truncate">
              {pageTitle}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer"
            aria-label="Dejz Hem"
          >
            <img
              src="/dejz_mork.png"
              alt="dejz"
              className="dejz-logo h-6 w-auto object-contain dark:invert"
            />
          </button>
        )}

        {/* Höger: Sök, Notiser (utan cirklar runt sig) och Profilbild */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSearchClick}
            title="Sök i Dejz"
            aria-label="Sök"
            className="p-1.5 text-[var(--text-primary)] hover:opacity-70 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
          >
            <MagnifyingGlass size={20} weight="regular" />
          </button>

          <button
            type="button"
            onClick={onNotificationsClick}
            title="Notiser"
            aria-label="Notiser"
            className="relative p-1.5 text-[var(--text-primary)] hover:opacity-70 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
          >
            <Bell size={20} weight="regular" />
          </button>

          <button
            type="button"
            onClick={onProfileClick}
            title={userName || userEmail || 'Profil & konto'}
            className="w-8 h-8 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-primary)] flex items-center justify-center overflow-hidden transition-all active:scale-95 cursor-pointer shrink-0 ml-0.5"
          >
            {userAvatar && !imgError ? (
              <img
                src={userAvatar}
                alt="Profilbild"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : initialChar ? (
              <span className="font-display font-bold text-xs uppercase text-[var(--text-primary)]">
                {initialChar}
              </span>
            ) : (
              <UserCircle size={20} weight="duotone" className="text-[var(--text-secondary)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
