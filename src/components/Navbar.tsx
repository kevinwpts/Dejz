import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, MagnifyingGlass, Bell, CaretLeft, Eye, EyeSlash } from '@phosphor-icons/react';
import { getPrivacyBlurMode, setPrivacyBlurMode } from '../utils/appCache';

interface NavbarProps {
  userEmail: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  pageTitle?: string | null;
  navigationKey?: string;
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
  navigationKey,
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
  const suppressScrollHideUntilRef = useRef(0);
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
    suppressScrollHideUntilRef.current = Date.now() + 220;
    setIsHidden(false);
    setIsAtTop(true);
    lastScrollYRef.current = 0;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pageTitle, navigationKey]);

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

      // På undersidor med sidrubrik/tillbakaknapp hålls headern alltid synlig längst upp,
      // och under pågående sidbyte ignoreras layout-scroll så att headern aldrig döljs av misstag.
      if (pageTitle || Date.now() < suppressScrollHideUntilRef.current) {
        setIsHidden(false);
        lastScrollYRef.current = currentY;
        return;
      }

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
  }, [pageTitle]);

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
        <div className="relative max-w-md mx-auto px-4 h-14 flex items-center justify-between gap-2">
          {/* Vänster: Tillbakaknapp + centrerad sidrubrik på undersidor, annars Profilbild */}
          {pageTitle ? (
            <>
              <button
                type="button"
                onClick={onBack || onLogoClick}
                className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center focus:outline-none hover:opacity-75 active:scale-95 transition-all cursor-pointer text-[var(--text-primary)] shrink-0 z-10"
                aria-label="Tillbaka"
              >
                <CaretLeft size={20} weight="regular" />
              </button>
              <span className="absolute left-12 right-12 text-center font-display font-semibold text-[15px] tracking-[-0.01em] text-[var(--text-primary)] truncate pointer-events-none">
                {pageTitle}
              </span>
              <div className="w-9 shrink-0" aria-hidden="true" />
            </>
          ) : (
            <button
              type="button"
              onClick={onProfileClick}
              title={userName || userEmail || 'Profil & inställningar'}
              aria-label="Profil & inställningar"
              className="flex items-center gap-2.5 py-1 pr-1 focus:outline-none hover:opacity-90 active:scale-95 transition-all cursor-pointer group shrink-0"
            >
              <span className="w-9 h-9 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center overflow-hidden shrink-0">
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

          {/* Höger: Rena ikonknappar utan vit cirkelbakgrund (döljs på undersidor med pageTitle) */}
          {!hideActions && !pageTitle && (
            <div className="flex items-center gap-1 -mr-1.5">
              <button
                type="button"
                onClick={togglePrivacyBlur}
                title={privacyBlur ? 'Visa belopp (Sekretessläge aktivt)' : 'Dölj belopp (Sekretessläge)'}
                aria-label="Sekretessläge"
                className={`w-9 h-9 rounded-full active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                  privacyBlur
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {privacyBlur ? <EyeSlash size={20} weight="fill" /> : <Eye size={20} weight="regular" />}
              </button>

              {!hideSearch && (
                <button
                  type="button"
                  onClick={onSearchClick}
                  title="Sök"
                  aria-label="Sök"
                  className="w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                >
                  <MagnifyingGlass size={20} weight="regular" />
                </button>
              )}

              <button
                type="button"
                onClick={onNotificationsClick}
                title="Notiser & insikter"
                aria-label="Notiser"
                className="relative w-9 h-9 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
              >
                <Bell size={20} weight="regular" />
                {hasUnreadNotifications && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[var(--bg-color)]"
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

