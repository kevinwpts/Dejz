import React from "react";
import { motion } from "motion/react";
import {
  Home,
  History,
  BarChart3,
  Plus,
  WalletCards,
} from "lucide-react";
import { Language, translations, TranslationKey } from "../i18n";

type Tab = "today" | "transactions" | "analysis" | "budget" | "profile";

interface CustomBottomNavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  language: Language;
  onAddTransaction: (type: "income" | "expense", prefill?: any) => void;
  logoUrl?: string;
  avatarUrl?: string | null;
  currency?: string;
  onQuickAdd?: (item: any) => void;
  addToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export function CustomBottomNavigation({
  activeTab,
  setActiveTab,
  language,
  onAddTransaction,
}: CustomBottomNavigationProps) {
  const t = (key: TranslationKey) => translations[language]?.[key] || translations["sv"]?.[key] || key;

  return (
    <div className="fixed bottom-[calc(3px+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(6px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 px-4 sm:px-6 pointer-events-none flex justify-center">
      <motion.div
        className="w-[84%] sm:w-[76%] max-w-[380px] sm:max-w-[400px] h-[56px] sm:h-[60px] rounded-full px-4 sm:px-5 bg-black/95 text-white backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] flex items-center justify-between gap-2 pointer-events-auto border border-white/10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        {/* 1. Hem */}
        <NavItem
          icon={Home}
          label={t("today")}
          isActive={activeTab === "today"}
          onClick={() => setActiveTab("today")}
          fillOnActive
        />

        {/* 2. Historik */}
        <NavItem
          icon={History}
          label={t("log")}
          isActive={activeTab === "transactions"}
          onClick={() => setActiveTab("transactions")}
        />

        {/* 3. Plus Button (Center) */}
        <div className="flex items-center justify-center shrink-0 px-0.5">
          <button
            onClick={() => onAddTransaction("expense")}
            className="w-[38px] h-[38px] sm:w-[42px] sm:h-[42px] rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-105 cursor-pointer shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.4)]"
            aria-label={language === "sv" ? "Skapa ny utgift" : "New expense"}
          >
            <Plus 
              size={20} 
              strokeWidth={2.4} 
              className="text-[var(--text-on-accent)]"
            />
          </button>
        </div>

        {/* 4. Analys */}
        <NavItem
          icon={BarChart3}
          label={t("analysis")}
          isActive={activeTab === "analysis"}
          onClick={() => setActiveTab("analysis")}
        />

        {/* 5. Budget */}
        <NavItem
          icon={WalletCards}
          label={t("budget")}
          isActive={activeTab === "budget"}
          onClick={() => setActiveTab("budget")}
        />
      </motion.div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  isActive,
  onClick,
  fillOnActive = false,
}: {
  icon: React.ComponentType<any>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  fillOnActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`flex-1 max-w-[52px] h-[44px] sm:h-[48px] flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer select-none rounded-full ${
        isActive
          ? 'text-white font-semibold'
          : 'text-white/40 hover:text-white/80'
      }`}
    >
      <Icon 
        size={22} 
        strokeWidth={isActive ? (fillOnActive ? 1.5 : 2.2) : 1.8} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
        className="transition-transform duration-200"
      />
    </button>
  );
}
