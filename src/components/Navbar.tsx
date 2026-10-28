import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, MagnifyingGlass, Bell, CaretLeft, Eye, EyeSlash } from '@phosphor-icons/react';
import { getPrivacyBlurMode, setPrivacyBlurMode } from '../utils/appCache';

interface NavbarProps {
  userEmail: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  pageTitle?: string | null;
  hasUnreadNotifications?: boolean;
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
  hasUnreadNotifications = false,
  onBack,
  onLogoClick,
  onProfileClick,
  onSearchClick,
  onNotificationsClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isHidden, setIsHidden] = useState(false);
  const [privacyBlur, setPrivacyBlur] = useState<boolean>(() => getPrivacyBlurMode());
  const lastScrollYRef = useRef(0);
  const initialChar = (userName || userEmail || '').trim().charAt(0);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('privacy-blur', privacyBlur);
    }
  }, [privacyBlur]);

  const togglePrivacyBlur = () => {
    const next = !privacyBlur;
    setPrivacyBlur(next);
    setPrivacyBlurMode(next);
  };

  useEffect(() => {
    setIsHidden(false);
    if (typeof window !== 'undefined') {
      const y = Math.max(
        0,
        window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0
      );
      setIsAtTop(y <= 12);
      lastScrollYRef.current = y;
    }
  }, [pageTitle]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getScrollY = () =>
      Math.max(
        0,
        window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0
      );

    const handleScroll = (e?: Event) => {
      if (e && e.target) {
        const t = e.target as Node;
        if (
          t !== document &&
          t !== document.documentElement &&
          t !== document.body &&
          t !== (window as unknown as Node)
        ) {
          // Ignorera horisontell scroll på t.ex. tidslinjen
          return;
        }
      }

      const currentY = getScrollY();
      const prevY = lastScrollYRef.current;
      const delta = currentY - prevY;

      if (currentY <= 12) {
        setIsAtTop(true);
        setIsHidden(false);
        lastScrollYRef.current = currentY;
        return;
      }

      setIsAtTop(false);

      if (delta > 3 && currentY > 36) {
        // Scrollar nedåt -> dölj headern
        setIsHidden(true);
        lastScrollYRef.current = currentY;
      } else if (delta < -3) {
        // Scrollar uppåt -> visa headern direkt med bakgrund
        setIsHidden(false);
        lastScrollYRef.current = currentY;
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          height: 'calc(3.5rem + var(--safe-top, env(safe-area-inset-top, 0px)) + 8px)',
        }}
        className="w-full shrink-0"
      />
      <header
        style={{
          paddingTop: 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 8px)',
          backgroundColor: isAtTop ? 'transparent' : 'var(--surface-color)',
          backdropFilter: isAtTop ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isAtTop ? 'none' : 'blur(20px)',
        }}
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-250 ease-out ${
          isHidden
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        } ${
          isAtTop
            ? 'border-b border-transparent'
            : 'border-b border-[var(--border-subtle)] shadow-subtle'
        }`}
      >
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Vänster: Tillbakapil + Sidrubrik på undersidor, annars Dejz-loggan */}
          {pageTitle ? (
            <button
              type="button"
              onClick={onBack || onLogoClick}
              className="flex items-center gap-2.5 min-w-0 py-1 pr-2 focus:outline-none hover:opacity-85 active:scale-95 transition-all cursor-pointer text-[var(--text-primary)]"
              aria-label="Tillbaka"
            >
              <span className="w-8 h-8 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                <CaretLeft size={15} weight="bold" />
              </span>
              <span className="font-display font-bold text-base tracking-tight truncate">
                {pageTitle}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogoClick}
              className="flex items-center py-1.5 pr-2 focus:outline-none hover:opacity-80 active:scale-95 transition-all cursor-pointer"
              aria-label="Dejz Hem"
            >
              <img
                src="/dejz_mork.png"
                alt="dejz"
                className="dejz-logo h-6 w-auto object-contain dark:invert"
              />
            </button>
          )}

          {/* Höger: Sekretessläge, Sök, Notiser och Profilbild */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePrivacyBlur}
              title={privacyBlur ? 'Visa belopp (Sekretessläge aktivt)' : 'Dölj belopp (Sekretessläge)'}
              aria-label="Sekretessläge"
              className={`w-9 h-9 rounded-full hover:bg-[var(--surface-color)]/60 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                privacyBlur ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--text-primary)]'
              }`}
            >
              {privacyBlur ? <EyeSlash size={20} weight="fill" /> : <Eye size={20} weight="regular" />}
            </button>

            <button
              type="button"
              onClick={onSearchClick}
              title="Sök i Dejz"
              aria-label="Sök"
              className="w-9 h-9 rounded-full text-[var(--text-primary)] hover:bg-[var(--surface-color)]/60 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
            >
              <MagnifyingGlass size={20} weight="regular" />
            </button>

            <button
              type="button"
              onClick={onNotificationsClick}
              title="Notiser & insikter"
              aria-label="Notiser"
              className="relative w-9 h-9 rounded-full text-[var(--text-primary)] hover:bg-[var(--surface-color)]/60 active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
            >
              <Bell size={20} weight="regular" />
              {hasUnreadNotifications && (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-[var(--bg-color)]"
                />
              )}
            </button>

            <button
              type="button"
              onClick={onProfileClick}
              title={userName || userEmail || 'Profil & konto'}
              className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-primary)] flex items-center justify-center overflow-hidden transition-all active:scale-95 cursor-pointer shrink-0 ml-1"
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
                <UserCircle size={22} weight="duotone" className="text-[var(--text-secondary)]" />
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

