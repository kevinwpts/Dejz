import React, { useEffect, useState } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";
import { DejziAvatar } from "./DejziSummaryModal";
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
  onOpenDejzi = () => {},
  isDemoMode,
  language = "sv",
  activeTab,
}: AppHeaderProps) {
  const [isAtTop, setIsAtTop] = useState(true);

  const isProfileOrSettings = activeTab === "profile" || activeTab === "settings" || activeTab === "notifications";
  const showTabTitle = onBack || isProfileOrSettings;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY <= 10);
    };

    setIsAtTop(window.scrollY <= 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute display title for header
  const getFallbackTitle = () => {
    switch (activeTab) {
      case "profile":
        return language === "en" ? "Profile" : "Profil";
      case "settings":
        return language === "en" ? "Settings" : "Inställningar";
      case "notifications":
        return language === "en" ? "Notifications" : "Notiser";
      default:
        return "Dejz";
    }
  };

  const displayTitle = title || getFallbackTitle();

  return (
    <header
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top,0px))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-200 ease-in-out ${
        isDemoMode ? '' : 'pt-[env(safe-area-inset-top,0px)]'
      } ${
        !isAtTop || isProfileOrSettings
          ? "bg-[#F7F6F3]/95 dark:bg-[#181818]/95 backdrop-blur-md border-b border-[#E5E2DC] dark:border-[#383838]"
          : "bg-[#F7F6F3]/80 dark:bg-[#181818]/80 backdrop-blur-xs border-b border-[#E5E2DC]/50 dark:border-[#383838]/50"
      }`}
    >
      <div className="max-w-2xl mx-auto px-3.5 sm:px-4 h-13 sm:h-14 flex justify-between items-center w-full gap-2 relative">
        {/* Left: Back button OR Dejz Logo */}
        <div className="flex items-center gap-2 shrink-0 z-10 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-[12px] bg-white dark:bg-[#242424] border border-[#E5E2DC] dark:border-[#383838] flex items-center justify-center text-[#242321] dark:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-[#2D2D2D] active:scale-95 transition-all cursor-pointer shrink-0"
              aria-label="Tillbaka"
            >
              <ChevronLeft size={19} strokeWidth={2} />
            </button>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <DejzLogo className="h-5 sm:h-5.5 w-auto" textColor="var(--logo-color)" />
            </div>
          )}

          {/* Subpage Title (only when onBack or settings/profile/notifications) */}
          {showTabTitle && (
            <div className="min-w-0 text-left flex flex-col justify-center ml-1">
              <h1 className="text-[17px] sm:text-[18px] font-semibold tracking-tight truncate select-none leading-none text-[#242321] dark:text-white">
                {displayTitle}
              </h1>
            </div>
          )}
        </div>

        {/* Right Actions: Notifications + Search + (AI Mascot on non-Home) + Profile Avatar */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 z-10">
          {/* AI Mascot button (Only on Historik, Ekonomi, etc. - Requirement 3) */}
          {activeTab !== 'today' && onOpenDejzi && (
            <button
              type="button"
              onClick={onOpenDejzi}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 hover:bg-[#F0EEEA] dark:hover:bg-[#2D2D2D]"
              aria-label={language === 'en' ? 'Show AI overview' : 'Visa AI-överblick'}
              title={language === 'en' ? 'Show AI overview' : 'Visa AI-överblick'}
            >
              <DejziAvatar size="sm" />
            </button>
          )}

          {/* Search Icon */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) {
                onOpenSearch();
              } else {
                onNavigate("search");
              }
            }}
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[#242321] dark:text-white hover:bg-[#F0EEEA] dark:hover:bg-[#2D2D2D]"
            aria-label={language === 'en' ? 'Search' : 'Sök'}
            title={language === 'en' ? 'Search' : 'Sök'}
          >
            <Search size={20} strokeWidth={1.8} />
          </button>

          {/* Notifications */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 text-[#242321] dark:text-white hover:bg-[#F0EEEA] dark:hover:bg-[#2D2D2D]"
              aria-label="Notiser"
              title="Notiser"
            >
              <Bell size={20} strokeWidth={1.8} />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-semibold flex items-center justify-center leading-none">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          {/* Profile Avatar (Far Right - Requirement 2) */}
          <button
            onClick={() => onNavigate("profile")}
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
            aria-label="Profil"
            title="Profil"
          >
            <div className={`w-8 h-8 rounded-full overflow-hidden border border-[#E5E2DC] dark:border-[#383838] bg-white dark:bg-[#242424] flex items-center justify-center ${
              activeTab === "profile" ? "ring-2 ring-[#242321] dark:ring-white" : ""
            }`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={16} strokeWidth={2} className="text-[#716E68] dark:text-[#A8A8A8]" />
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
