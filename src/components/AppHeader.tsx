import React, { useEffect, useState, useRef, useMemo } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";

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
  isDemoMode?: boolean;
  language?: string;
  activeTab?: string;
}

export function AppHeader({
  _userName,
  date,
  avatarUrl,
  onNavigate,
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
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);

  const formattedDate = useMemo(() => {
    const d = date || new Date();
    const isSwedish = !language || language.startsWith("sv");
    const weekday = d.toLocaleDateString(isSwedish ? "sv-SE" : "en-US", { weekday: "long" });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = d.getDate();
    const month = d.toLocaleDateString(isSwedish ? "sv-SE" : "en-US", { month: "short" }).replace(".", "");
    return `${capitalizedWeekday} ${day} ${month}`;
  }, [date, language]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. Utgångsläget: Längst upp integreras headern sömlöst utan bakgrund
      if (currentScrollY <= 10) {
        setIsAtTop(true);
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      setIsAtTop(false);

      // Skydd mot iOS bounce/rubber-banding
      if (currentScrollY < 0) {
        setIsVisible(true);
        return;
      }

      const diff = currentScrollY - lastScrollY.current;

      // Scrolla ner (> 8px) efter toppen -> göm headern
      if (diff > 8 && currentScrollY > 50) {
        setIsVisible(false);
      } else if (diff < -8) {
        // Scrolla upp -> visa headern
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    setIsAtTop(window.scrollY <= 10);
    lastScrollY.current = window.scrollY;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Visa alltid headern vid sidbyte eller titeländring
  useEffect(() => {
    setIsVisible(true);
  }, [_navTrigger, title]);

  return (
    <header
      className={`fixed ${isDemoMode ? 'top-[calc(2.6rem+env(safe-area-inset-top))]' : 'top-0'} left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isVisible
          ? "translate-y-0 opacity-100"
          : isDemoMode
          ? "-translate-y-[200%] opacity-0 pointer-events-none"
          : "-translate-y-full opacity-0 pointer-events-none"
      } ${
        !isAtTop
          ? "bg-[var(--bg-color)]/85 backdrop-blur-xl border-b border-[var(--border-color)]/60 shadow-xs"
          : "bg-transparent border-b border-transparent shadow-none"
      }`}
    >
      <div className={`max-w-2xl mx-auto px-4 sm:px-6 py-3.5 ${isDemoMode ? '' : 'pt-[calc(0.85rem+env(safe-area-inset-top))]'} flex justify-between items-center w-full gap-2`}>
        {/* Left: Back button + Title OR Tab Title / Date */}
        <div className="flex items-center min-w-0">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 group active:scale-95 transition-all py-0.5 -ml-1 pr-2 cursor-pointer text-[var(--text-primary)] min-w-0"
            >
              <ChevronLeft size={20} strokeWidth={2.2} className="shrink-0" />
              {title && (
                <h1 className="text-[15px] sm:text-[16px] font-bold text-[var(--text-primary)] tracking-tight truncate">
                  {title}
                </h1>
              )}
            </button>
          ) : title ? (
            <div className="flex items-center py-0.5 min-w-0">
              <h1 className="text-[16px] sm:text-[17px] font-bold text-[var(--text-primary)] tracking-tight truncate">
                {title}
              </h1>
            </div>
          ) : (
            <div className="flex items-center py-0.5 min-w-0">
              <span className="text-[15px] sm:text-[16px] font-bold text-[var(--text-primary)] tracking-tight truncate">
                {formattedDate}
              </span>
            </div>
          )}
        </div>

        {/* Right Actions: Notifications, Search, Profile */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors relative cursor-pointer active:scale-95"
              aria-label="Notiser"
            >
              <Bell
                size={19}
                strokeWidth={2}
              />
              {notificationCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-xs">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => onNavigate("search")}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer active:scale-95"
            aria-label="Sök"
          >
            <Search size={19} strokeWidth={2} />
          </button>

          <button
            onClick={() => onNavigate("profile")}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer active:scale-95 overflow-hidden ${
              activeTab === "profile" ? "ring-2 ring-[var(--accent-color)]" : ""
            }`}
            aria-label="Profil"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-7 h-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={19} strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
