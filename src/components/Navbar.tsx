import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, MagnifyingGlass, Bell, CaretLeft, Eye, EyeSlash } from '@phosphor-icons/react';
import { getPrivacyBlurMode, setPrivacyBlurMode } from '../utils/appCache';

interface NavbarProps {
  userEmail: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  pageTitle?: string | null;
  hasUnreadNotifications?: boolean;
  hideActions?: boolean;
  hideSearch?: boolean;
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
  hideActions = false,
  hideSearch = false,
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
          height: 'env(safe-area-inset-top, 0px)',
          backgroundColor: 'var(--bg-color)',
        }}
        className="fixed top-0 left-0 right-0 z-[60] pointer-events-none bg-[var(--bg-color)]"
      />
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
          backgroundColor: 'var(--bg-color)',
        }}
        className={`fixed top-0 left-0 right-0 z-50 w-full transition-all duration-250 ease-out ${
          isHidden
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        } ${isAtTop ? 'app-header-top' : 'app-header-scrolled'}`}
      >
        <div className="relative max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Vänster: Rund tillbakaknapp + centrerad sidrubrik på undersidor, annars Profilbild */}
          {pageTitle ? (
            <>
              <button
                type="button"
                onClick={onBack || onLogoClick}
                className="w-10 h-10 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-subtle flex items-center justify-center focus:outline-none hover:bg-[var(--surface-hover)] active:scale-95 transition-all cursor-pointer text-[var(--text-primary)] shrink-0 z-10"
                aria-label="Tillbaka"
              >
                <CaretLeft size={18} weight="regular" />
              </button>
              <span className="absolute left-14 right-14 text-center font-display font-semibold text-[16px] tracking-[-0.01em] text-[var(--text-primary)] truncate pointer-events-none">
                {pageTitle}
              </span>
            </>
          ) : (
            <button
              type="button"
              onClick={onProfileClick}
              title={userName || userEmail || 'Profil & inställningar'}
              aria-label="Profil & inställningar"
              className="flex items-center gap-2.5 py-1 pr-2 focus:outline-none hover:opacity-90 active:scale-95 transition-all cursor-pointer group"
            >
              <span className="w-9 h-9 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-subtle text-[var(--text-primary)] flex items-center justify-center overflow-hidden shrink-0">
                {userAvatar && !imgError ? (
                  <img
                    src={userAvatar}
                    alt="Profilbild"
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                  />
                ) : initialChar ? (
                  <span className="font-display font-semibold text-[13.5px] uppercase text-[var(--text-primary)]">
                    {initialChar}
                  </span>
                ) : (
                  <UserCircle size={22} weight="duotone" className="text-[var(--text-secondary)]" />
                )}
              </span>
            </button>
          )}

          {/* Höger: Samlad kapsel för Sekretessläge, Sök och Notiser (utan 3 separata runda ramar) */}
          {!hideActions && (
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-subtle">
              <button
                type="button"
                onClick={togglePrivacyBlur}
                title={privacyBlur ? 'Visa belopp (Sekretessläge aktivt)' : 'Dölj belopp (Sekretessläge)'}
                aria-label="Sekretessläge"
                className={`w-8 h-8 rounded-full active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  privacyBlur
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                {privacyBlur ? <EyeSlash size={17} weight="fill" /> : <Eye size={17} weight="regular" />}
              </button>

              {!hideSearch && (
                <button
                  type="button"
                  onClick={onSearchClick}
                  title="Sök"
                  aria-label="Sök"
                  className="w-8 h-8 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                  <MagnifyingGlass size={17} weight="regular" />
                </button>
              )}

              <button
                type="button"
                onClick={onNotificationsClick}
                title="Notiser & insikter"
                aria-label="Notiser"
                className="relative w-8 h-8 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={17} weight="regular" />
                {hasUnreadNotifications && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--surface-color)]"
                  />
                )}
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
};

