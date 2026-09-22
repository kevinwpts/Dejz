import React, { useEffect, useState, useRef } from "react";
import { User, Search, ChevronLeft, Bell } from "lucide-react";
import { DejzLogo } from "./DejzLogo";

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
}

export function AppHeader({
  _userName,
  _date,
  avatarUrl,
  onNavigate,
  navTrigger: _navTrigger,
  title,
  onBack,
  notificationCount = 0,
  onOpenNotifications,
  isDemoMode,
}: AppHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);

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
      <div className={`max-w-2xl mx-auto px-4 sm:px-6 py-3.5 ${isDemoMode ? '' : 'pt-[calc(0.85rem+env(safe-area-inset-top))]'} flex justify-between items-center w-full`}>
        {/* Left: Back button + Title OR Brand Logo */}
        <div className="flex items-center gap-2.5">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex items-center gap-2 group active:scale-95 transition-all py-0.5 -ml-1 pr-2 cursor-pointer text-[var(--text-primary)] dark:text-white"
            >
              <ChevronLeft size={24} strokeWidth={3} />
              {title && (
                <h1 className="text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h1>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <DejzLogo className="text-xl sm:text-2xl font-black" textColor="var(--logo-color)" />
            </div>
          )}
        </div>

        {/* Right Actions: Notifications, Search, Profile with solid filled styles */}
        <div className="flex items-center gap-4">
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="text-[var(--text-primary)] dark:text-white hover:opacity-75 transition-opacity relative flex items-center justify-center cursor-pointer p-1"
              aria-label="Notiser"
            >
              <Bell
                size={24}
                strokeWidth={0}
                fill="currentColor"
              />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center leading-none shadow-sm">
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => onNavigate("search")}
            className="text-[var(--text-primary)] dark:text-white hover:opacity-75 transition-opacity flex items-center justify-center cursor-pointer p-1"
            aria-label="Sök"
          >
            <Search size={24} strokeWidth={3} />
          </button>

          <button
            onClick={() => onNavigate("profile")}
            className="text-[var(--text-primary)] dark:text-white hover:opacity-75 transition-opacity flex items-center justify-center cursor-pointer p-1"
            aria-label="Profil"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={24} strokeWidth={0} fill="currentColor" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
