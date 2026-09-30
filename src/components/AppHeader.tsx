import React, { useEffect, useState } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";
import { DejziAvatar } from "./DejziSummaryModal";

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
  userName,
  date,
  avatarUrl,
  onNavigate,
  onOpenSearch,
  navTrigger: _navTrigger,
  title,
  onBack,
  notificationCount = 0,
  onOpenNotifications,
  onOpenDejzi,
  isDemoMode,
  language = "sv",
  activeTab,
}: AppHeaderProps) {
  const [isAtTop, setIsAtTop] = useState(true);

  const isProfileOrSettings = activeTab === "profile" || activeTab === "settings";
  const isHomeTab = activeTab === "today" || !activeTab;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY <= 10);
    };

    setIsAtTop(window.scrollY <= 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Compute date string
  const formattedDate = React.useMemo(() => {
    try {
      const d = date || new Date();
      const locale = language === 'en' ? 'en-US' : language === 'no' ? 'nb-NO' : language === 'da' ? 'da-DK' : 'sv-SE';
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(d);
      const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(d);
      const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
      return `${capWeekday}, ${dayMonth}`;
    } catch {
      return '';
    }
  }, [date, language]);

  // Compute display title for header in standard capitalization (Ekonomi, Analys, Historik)
  const getFallbackTitle = () => {
    switch (activeTab) {
      case "today":
        return language === "en" ? "Overview" : "Överblick";
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
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-200 ease-in-out ${
        !isAtTop || isProfileOrSettings
          ? "bg-[#F2EFE8]/95 dark:bg-[#181818]/95 backdrop-blur-md border-b border-[#E2DDD4] dark:border-[#383838]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className={`max-w-xl mx-auto px-4 h-16 ${isDemoMode ? '' : 'pt-[env(safe-area-inset-top)]'} flex justify-between items-center w-full gap-2 relative`}>
        {/* Left: Back button OR Profile Picture + Title/Greeting */}
        <div className="flex items-center gap-2.5 shrink-0 z-10 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-[12px] bg-white dark:bg-[#242424] border border-[#E2DDD4] dark:border-[#383838] flex items-center justify-center text-[#211F1C] dark:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-[#2D2D2D] active:scale-95 transition-all cursor-pointer shrink-0"
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
              <div className={`w-8 h-8 rounded-full overflow-hidden border border-[#E2DDD4] dark:border-[#383838] bg-white dark:bg-[#242424] flex items-center justify-center ${
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

          {/* Title / Greeting */}
          <div className="min-w-0 text-left flex flex-col justify-center">
            {isHomeTab ? (
              <>
                <h1 className="text-[17px] font-semibold tracking-tight truncate select-none leading-tight text-[#211F1C] dark:text-white">
                  {language === 'en' ? 'Hi' : 'Hej'} {userName || 'Kevin'}
                </h1>
                <p className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] leading-none mt-0.5 select-none truncate">
                  {formattedDate}
                </p>
              </>
            ) : (
              <h1 className="text-[24px] font-semibold tracking-tight truncate select-none leading-none text-[#211F1C] dark:text-white">
                {displayTitle}
              </h1>
            )}
          </div>
        </div>

        {/* Right Actions: Notifications + Search + Dejzi Coach */}
        <div className="flex items-center gap-1 shrink-0 z-10">
          {/* 1. Notifications */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 text-[#211F1C] dark:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-[#2D2D2D]"
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
            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[#211F1C] dark:text-white hover:bg-[var(--surface-muted)] dark:hover:bg-[#2D2D2D]"
            aria-label={language === 'en' ? 'Search' : 'Sök'}
            title={language === 'en' ? 'Search' : 'Sök'}
          >
            <Search size={22} strokeWidth={1.8} />
          </button>

          {/* 3. Toned down Dejzi mascot button (24px mascot image, no large background circle, 44x44px touch target) */}
          {onOpenDejzi && (
            <button
              type="button"
              onClick={onOpenDejzi}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 hover:bg-[var(--surface-muted)] dark:hover:bg-[#2D2D2D]"
              aria-label="Dejzi sammanfattning"
              title="Dejzi sammanfattning"
            >
              <DejziAvatar size="sm" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
