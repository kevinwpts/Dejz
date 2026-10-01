import React, { useEffect, useState } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";

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

  // Compute display title for header
  const getFallbackTitle = () => {
    switch (activeTab) {
      case "today":
        return "";
      case "transactions":
        return language === "en" ? "Transactions" : "Historik";
      case "analysis":
        return language === "en" ? "Analysis" : "Analys";
      case "budget":
        return language === "en" ? "Finances" : "Ekonomi";
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
        !isAtTop
          ? isProfileOrSettings
            ? "bg-[#141118]/90 backdrop-blur-xl border-b border-white/[0.08]"
            : "bg-[#F2EFE8]/90 dark:bg-[#141118]/90 backdrop-blur-xl border-b border-[#E2DDD4]/80 dark:border-white/[0.08]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-xl mx-auto px-4 h-14 sm:h-16 flex justify-between items-center w-full gap-2 relative">
        {/* Left: Back button OR Profile Picture + Title/Greeting */}
        <div className="flex items-center gap-2.5 shrink-0 z-10 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[12px] bg-white/80 dark:bg-white/[0.06] border border-[#E2DDD4] dark:border-white/[0.08] flex items-center justify-center text-[#211F1C] dark:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer shrink-0"
              aria-label="Tillbaka"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          ) : (
            <button
              onClick={() => onNavigate("profile")}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0`}
              aria-label="Profil"
              title="Profil"
            >
              <div className={`w-8 h-8 rounded-full overflow-hidden border border-[#E2DDD4] dark:border-white/[0.12] bg-white dark:bg-white/[0.06] flex items-center justify-center ${
                activeTab === "profile" ? "ring-2 ring-[#211F1C] dark:ring-white" : ""
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
          )}

          {/* Title */}
          <div className="min-w-0 text-left flex flex-col justify-center">
            <h1 className="text-[15px] sm:text-[16px] font-semibold tracking-tight truncate select-none leading-tight text-[#211F1C] dark:text-white">
              {displayTitle}
            </h1>
          </div>
        </div>

        {/* Right Actions: Notifications + Search */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          {/* 1. Notifications */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 text-[#211F1C] dark:text-white hover:bg-[#EAE6DE]/60 dark:hover:bg-white/[0.08]"
              aria-label="Notiser"
              title="Notiser"
            >
              <Bell size={22} strokeWidth={1.8} />
              {notificationCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-semibold flex items-center justify-center leading-none">
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
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[#211F1C] dark:text-white hover:bg-[#EAE6DE]/60 dark:hover:bg-white/[0.08]"
            aria-label={language === 'en' ? 'Search' : 'Sök'}
            title={language === 'en' ? 'Search' : 'Sök'}
          >
            <Search size={22} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
