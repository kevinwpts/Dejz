import React, { useEffect, useState, useRef } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";
import { DejzLogo } from "./DejzLogo";
import { IconButton } from "./ui";

interface AppHeaderProps {
  userName?: string;
  date: Date;
  avatarUrl?: string | null;
  onNavigate: (tab: string, section?: string) => void;
  onOpenSearch?: () => void;
  navTrigger?: number;
  title?: string;
  onBack?: () => void;
  notificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenDejzi?: () => void;
  isDemoMode?: boolean;
  language?: string;
  activeTab?: string;
}

export function AppHeader({
  avatarUrl,
  onNavigate,
  onOpenSearch,
  navTrigger: _navTrigger,
  title,
  onBack,
  notificationCount = 0,
  onOpenNotifications,
  isDemoMode,
  language = "sv",
  activeTab,
}: AppHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(() => typeof window !== "undefined" ? window.scrollY > 15 : false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    setIsScrolled(window.scrollY > 15);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const lastScrollY = lastScrollYRef.current;
      const delta = currentScrollY - lastScrollY;

      setIsScrolled(currentScrollY > 15);

      // Always show when near the very top of the page
      if (currentScrollY <= 25) {
        setIsVisible(true);
      } else if (delta > 8) {
        // Scrolling down -> hide header
        setIsVisible(false);
      } else if (delta < -8) {
        // Scrolling up -> reveal header
        setIsVisible(true);
      }

      lastScrollYRef.current = Math.max(0, currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Reset visibility when changing tab or view title
  useEffect(() => {
    setIsVisible(true);
    setIsScrolled(window.scrollY > 15);
    lastScrollYRef.current = window.scrollY;
  }, [activeTab, title]);

  return (
    <header
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top,0px))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isDemoMode ? '' : 'pt-[env(safe-area-inset-top,0px)]'
      } ${
        isVisible
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : '-translate-y-full opacity-0 pointer-events-none'
      } ${
        isScrolled ? 'app-header-scrolled' : 'app-header-top'
      }`}
    >
      <div className="page-max mx-auto page-px h-14 sm:h-16 flex justify-between items-center w-full gap-2 relative">
        {/* Left: Back button with title for subpages OR Dejz brand logo for main tabs */}
        <div className="flex items-center gap-2.5 shrink-0 z-10 min-w-0">
          {onBack ? (
            <>
              <IconButton
                onClick={onBack}
                icon={<ChevronLeft size={18} strokeWidth={2} />}
                variant="surface"
                size="md"
                className="w-9 h-9 text-[var(--text-primary)]"
                aria-label="Tillbaka"
              />
              {title && (
                <h1 className="text-section-title truncate select-none text-[var(--text-primary)]">
                  {title}
                </h1>
              )}
            </>
          ) : (
            <button
              onClick={() => onNavigate("today")}
              className="flex items-center gap-2 transition-transform touch-press-subtle cursor-pointer py-1 select-none"
              aria-label="dejz"
              title="dejz"
            >
              <DejzLogo className="h-6 sm:h-7 w-auto" />
            </button>
          )}
        </div>

        {/* Right Actions: Notifications + Search + Profile Avatar */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          {/* 1. Notifications */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-all relative cursor-pointer touch-press-subtle text-[var(--text-primary)] hover:bg-[var(--surface-color)]/80 dark:hover:bg-white/[0.08]"
              aria-label="Notiser"
              title="Notiser"
            >
              <Bell size={20} strokeWidth={2} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[var(--danger-color)] text-white text-micro-label font-semibold flex items-center justify-center leading-none">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          {/* 2. Search Icon */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) {
                onOpenSearch();
              } else {
                onNavigate("search");
              }
            }}
            className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer touch-press-subtle text-[var(--text-primary)] hover:bg-[var(--surface-color)]/80 dark:hover:bg-white/[0.08]"
            aria-label={language === 'en' ? 'Search' : 'Sök'}
            title={language === 'en' ? 'Search' : 'Sök'}
          >
            <Search size={20} strokeWidth={2} />
          </button>

          {/* 3. Profile Avatar Button (Far Right) */}
          <button
            onClick={() => onNavigate("profile")}
            className="flex items-center justify-center transition-transform touch-press-subtle cursor-pointer p-0.5 select-none ml-1"
            aria-label="Profil"
            title="Profil"
          >
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-[var(--surface-color)]/95 dark:bg-[var(--surface-muted)] border border-[var(--border-divider)] shadow-subtle flex items-center justify-center ${
              activeTab === "profile" ? "ring-2 ring-[var(--accent-color)]" : ""
            }`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={18} strokeWidth={2} className="text-[var(--text-secondary)]" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
