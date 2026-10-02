import React, { useEffect, useState } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";
import { DejzLogo } from "./DejzLogo";

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
  const [isAtTop, setIsAtTop] = useState(true);

  const isProfileOrSettings = activeTab === "profile" || activeTab === "settings";

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY <= 10);
    };

    setIsAtTop(window.scrollY <= 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top,0px))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-200 ease-in-out ${
        isDemoMode ? '' : 'pt-[env(safe-area-inset-top,0px)]'
      } ${
        !isAtTop
          ? isProfileOrSettings
            ? "bg-[#141118]/90 backdrop-blur-xl border-b border-white/[0.08]"
            : "bg-[#F2EFE8]/90 dark:bg-[#141118]/90 backdrop-blur-xl border-b border-[#E2DDD4]/80 dark:border-white/[0.08]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-xl mx-auto px-4 h-14 sm:h-16 flex justify-between items-center w-full gap-2 relative">
        {/* Left: Back button with title for subpages OR Dejz brand logo for main tabs */}
        <div className="flex items-center gap-2.5 shrink-0 z-10 min-w-0">
          {onBack ? (
            <>
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-[#211F1C] dark:text-white flex items-center justify-center active:scale-90 transition-all cursor-pointer shrink-0"
                aria-label="Tillbaka"
              >
                <ChevronLeft size={18} strokeWidth={2.2} />
              </button>
              {title && (
                <h1 className="text-[16px] sm:text-[17px] font-semibold tracking-tight truncate select-none leading-tight text-[#211F1C] dark:text-white">
                  {title}
                </h1>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate("today")}
              className="flex items-center gap-2 transition-transform active:scale-95 cursor-pointer py-1 select-none"
              aria-label="Dejz"
              title="Dejz"
            >
              <DejzLogo className="h-5 sm:h-[22px] w-auto" textColor="var(--text-primary)" />
            </button>
          )}
        </div>

        {/* Right Actions: Notifications + Search + Profile Avatar at the far right */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          {/* 1. Notifications */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 text-[#211F1C] dark:text-white hover:bg-[#EAE6DE]/60 dark:hover:bg-white/[0.08]"
              aria-label="Notiser"
              title="Notiser"
            >
              <Bell size={20} strokeWidth={1.8} />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-semibold flex items-center justify-center leading-none">
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
            className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[#211F1C] dark:text-white hover:bg-[#EAE6DE]/60 dark:hover:bg-white/[0.08]"
            aria-label={language === 'en' ? 'Search' : 'Sök'}
            title={language === 'en' ? 'Search' : 'Sök'}
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          {/* 3. Profile Avatar completely to the far right */}
          <button
            onClick={() => onNavigate("profile")}
            className="min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 ml-0.5"
            aria-label="Profil"
            title="Profil"
          >
            <div className={`w-8 h-8 rounded-full overflow-hidden border border-[#E2DDD4] dark:border-white/[0.12] bg-white dark:bg-white/[0.06] flex items-center justify-center ${
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
                <User size={16} strokeWidth={2} className="text-[#6D6962] dark:text-[#A8A8A8]" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
