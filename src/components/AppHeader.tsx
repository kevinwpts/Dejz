import React, { useEffect, useState } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";
import { DejziAvatar } from "./DejziSummaryModal";

interface AppHeaderProps {
  userName?: string;
  date: Date;
  avatarUrl?: string | null;
  onNavigate: (tab: string, section?: string) => void;
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
  userName: _userName,
  date: _date,
  avatarUrl,
  onNavigate,
  navTrigger: _navTrigger,
  title,
  onBack,
  notificationCount = 0,
  onOpenNotifications,
  onOpenDejzi,
  isDemoMode,
  language: _language = "sv",
  activeTab,
}: AppHeaderProps) {
  const [isAtTop, setIsAtTop] = useState(true);

  const isProfileOrSettings = activeTab === "profile" || activeTab === "settings";
  const useWhiteHeader = false;

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
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 ease-in-out translate-y-0 opacity-100 ${
        !isAtTop || isProfileOrSettings
          ? "bg-[#232323]/85 backdrop-blur-xl border-b border-white/[0.018] shadow-none"
          : "bg-transparent border-b border-transparent shadow-none"
      }`}
    >
      <div className={`max-w-2xl mx-auto px-4 sm:px-6 py-3.5 ${isDemoMode ? '' : 'pt-[calc(0.85rem+env(safe-area-inset-top))]'} flex justify-between items-center w-full gap-2.5 sm:gap-3.5 relative`}>
        {/* Left: Back button OR Profile Picture */}
        <div className="flex items-center gap-3 shrink-0 z-10">
          {onBack ? (
            <button
              onClick={onBack}
              className={`flex items-center gap-1 group active:scale-95 transition-all py-0.5 -ml-1 pr-2 cursor-pointer ${
                useWhiteHeader ? "text-white" : "text-[var(--text-primary)]"
              }`}
              aria-label="Tillbaka"
            >
              <ChevronLeft size={24} strokeWidth={2.4} className="shrink-0" />
            </button>
          ) : (
            <>
              {/* Profile Avatar Trigger Button */}
              <button
                onClick={() => onNavigate("profile")}
                className={`w-[38px] h-[38px] sm:w-[40px] sm:h-[40px] rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 overflow-hidden shrink-0 border border-white/[0.045] bg-white/[0.035] hover:bg-white/[0.07] text-slate-200 ${
                  activeTab === "profile" ? "ring-2 ring-indigo-400/50" : ""
                }`}
                aria-label="Profil"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={18} strokeWidth={1.8} className="text-slate-300" />
                )}
              </button>
            </>
          )}
        </div>

        {/* Middle: Title (when onBack is active) OR Search Input Box */}
        {onBack && title ? (
          <div className="flex-1 min-w-0 text-center px-2">
            <h1 className="text-[17px] sm:text-[19px] font-bold font-shoulders tracking-tight truncate text-[var(--text-primary)]">
              {title}
            </h1>
          </div>
        ) : (
          <div className="flex-1 min-w-0 max-w-md mx-1 sm:mx-2">
            <button
              type="button"
              onClick={() => onNavigate("search")}
              className="w-full h-10 sm:h-[42px] px-3.5 sm:px-4 rounded-full flex items-center gap-2.5 bg-white/[0.035] hover:bg-white/[0.055] border border-white/[0.035] hover:border-white/[0.07] text-[#C7CDDC] hover:text-white backdrop-blur-[20px] transition-all cursor-pointer shadow-none group text-left select-none"
              aria-label="Sök"
            >
              <Search size={16} strokeWidth={1.75} className="shrink-0 text-[#C7CDDC] group-hover:text-white transition-colors" />
              <span className="text-[13.5px] sm:text-[14px] font-medium text-[#C7CDDC] group-hover:text-white transition-colors truncate">
                {_language === 'en' ? 'Search' : 'Sök'}
              </span>
            </button>
          </div>
        )}
  
        {/* Right Actions: Dejzi Coach Button + Notifications Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onOpenDejzi && (
            <button
              type="button"
              onClick={onOpenDejzi}
              className={`w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 ${
                useWhiteHeader 
                  ? "text-white/95 hover:bg-white/10" 
                  : "hover:bg-[var(--surface-muted)]"
              }`}
              aria-label="Dejzi sammanfattning"
              title="Dejzi sammanfattning"
            >
              <DejziAvatar size="sm" />
            </button>
          )}

          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className={`w-10 h-10 sm:w-[42px] sm:h-[42px] rounded-full flex items-center justify-center transition-all relative cursor-pointer active:scale-95 ${
                useWhiteHeader 
                  ? "text-white/95 hover:bg-white/10" 
                  : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
              }`}
              aria-label="Notiser"
            >
              <Bell
                size={22}
                strokeWidth={2.2}
              />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {notificationCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
