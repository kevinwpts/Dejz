import React, { useState } from 'react';
import { UserCircle, MagnifyingGlass, Bell } from '@phosphor-icons/react';

interface NavbarProps {
  userEmail: string | null;
  userAvatar?: string | null;
  onLogoClick?: () => void;
  onProfileClick: () => void;
  onSearchClick: () => void;
  onNotificationsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  userEmail,
  userAvatar,
  onLogoClick,
  onProfileClick,
  onSearchClick,
  onNotificationsClick,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--surface-color)]/90 backdrop-blur-md border-b border-[var(--border-subtle)] pt-[var(--safe-top,env(safe-area-inset-top,0px))]">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Vänster: Dejz-loggan */}
        <button
          type="button"
          onClick={onLogoClick}
          className="flex items-center focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer"
          aria-label="Dejz Hem"
        >
          <img
            src="/dejz_mork.png"
            alt="dejz"
            className="h-6 w-auto object-contain dark:invert"
          />
        </button>

        {/* Höger: Sök, Notiser och Profilbild */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSearchClick}
            title="Sök i Dejz"
            className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-primary)] flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <MagnifyingGlass size={17} />
          </button>

          <button
            type="button"
            onClick={onNotificationsClick}
            title="Notiser"
            className="relative w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-primary)] flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Bell size={17} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--surface-color)]" />
          </button>

          <button
            type="button"
            onClick={onProfileClick}
            title={userEmail ? `Inloggad som ${userEmail}` : 'Profil & konto'}
            className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-primary)] flex items-center justify-center overflow-hidden transition-all active:scale-95 cursor-pointer shrink-0"
          >
            {userAvatar && !imgError ? (
              <img
                src={userAvatar}
                alt="Profilbild"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : userEmail ? (
              <span className="font-display font-bold text-xs uppercase text-[var(--text-primary)]">
                {userEmail.charAt(0)}
              </span>
            ) : (
              <UserCircle size={22} weight="duotone" className="text-[var(--text-secondary)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
