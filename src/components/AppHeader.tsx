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
  const _useWhiteHeader = false;
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

  // Compute uppercase display title for header
  const getFallbackTitle = () => {
    switch (activeTab) {
      case "today":
        return language === "en" ? "OVERVIEW" : "ÖVERBLICK";
      case "transactions":
        return language === "en" ? "TRANSACTIONS" : "TRANSAKTIONER";
      case "analysis":
        return language === "en" ? "ANALYSIS" : "ANALYS";
      case "budget":
        return language === "en" ? "FINANCES" : "EKONOMI";
      case "profile":
        return language === "en" ? "PROFILE" : "PROFIL";
      case "settings":
        return language === "en" ? "SETTINGS" : "INSTÄLLNINGAR";
      case "notifications":
        return language === "en" ? "NOTIFICATIONS" : "NOTISER";
      default:
        return "DEJZ";
    }
  };

  const displayTitle = (title || getFallbackTitle()).toUpperCase();

  const _isHomeAtTop = isHomeTab && isAtTop;

  return (
    <header
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 ease-in-out translate-y-0 opacity-100 ${
        !isAtTop || isProfileOrSettings
          ? "bg-[#F7F5F0]/90 dark:bg-[#232323]/85 backdrop-blur-xl border-b border-[#E6E2D8] dark:border-white/[0.018] shadow-none"
          : "bg-transparent border-b border-transparent shadow-none"
      }`}
    >
      <div className={`max-w-2xl mx-auto px-4 sm:px-6 py-3.5 ${isDemoMode ? '' : 'pt-[calc(0.85rem+env(safe-area-inset-top))]'} flex justify-between items-center w-full gap-2 relative`}>
        {/* Left: Back button OR Profile Picture + Title/Greeting right next to it */}
        <div className="flex items-center gap-3 shrink-0 z-10 min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1 group active:scale-95 transition-all py-0.5 -ml-1 pr-1 cursor-pointer text-[var(--text-primary)]"
              aria-label="Tillbaka"
            >
              <ChevronLeft size={24} strokeWidth={2.4} className="shrink-0" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate("profile")}
              className={`w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 overflow-hidden shrink-0 border border-[#E6E2D8] dark:border-white/[0.045] bg-[#FFFFFF] dark:bg-white/[0.035] hover:bg-[#EDE9DF] dark:hover:bg-white/[0.07] text-[var(--text-primary)] ${
                activeTab === "profile" ? "ring-2 ring-emerald-400/50" : ""
              }`}
              aria-label="Profil"
              title="Profil"
            >
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
            </button>
          )}

          {/* Title right next to profile picture */}
          <div className="min-w-0 text-left flex flex-col justify-center pl-1">
            {isHomeTab ? (
              <>
                <h1 className="text-[17px] sm:text-[19px] font-extrabold font-display tracking-tight truncate select-none leading-tight text-[var(--text-primary)]">
                  {language === 'en' ? 'Hi' : 'Hej'} {userName || 'Kevin'}
                </h1>
                <p className="text-[11px] font-medium text-[var(--text-tertiary)] leading-none mt-0.5 select-none truncate">
                  {formattedDate}
                </p>
              </>
            ) : (
              <h1 className="text-[19px] sm:text-[22px] font-extrabold font-display uppercase tracking-[0.05em] truncate select-none leading-none text-[var(--text-primary)]">
                {displayTitle}
              </h1>
            )}
          </div>
        </div>

        {/* Empty flex-1 spacer if needed or let right actions push */}
        <div className="flex-1" />
  
        {/* Right Actions: Notifications + Search Icon (between notifications and dejzi) + Dejzi Coach */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 z-10">
          {/* 1. Notisikonen */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 text-[var(--text-primary)] hover:bg-[#EDE9DF] dark:hover:bg-white/10"
              aria-label="Notiser"
              title="Notiser"
            >
              <Bell
                size={20}
                strokeWidth={2.2}
              />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[8.5px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          {/* 2. Sökikonen (mellan notisikonen och Dejzi) */}
          <button
            type="button"
            onClick={() => {
              if (onOpenSearch) {
                onOpenSearch();
              } else {
                onNavigate("search");
              }
            }}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 text-[var(--text-primary)] hover:bg-[#EDE9DF] dark:hover:bg-white/10"
            aria-label={language === 'en' ? 'Search' : 'Sök'}
            title={language === 'en' ? 'Search' : 'Sök'}
          >
            <Search size={19} strokeWidth={2.2} />
          </button>

          {/* 3. Dejzi */}
          {onOpenDejzi && (
            <button
              type="button"
              onClick={onOpenDejzi}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 hover:bg-[#EDE9DF] dark:hover:bg-white/[0.06]"
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
