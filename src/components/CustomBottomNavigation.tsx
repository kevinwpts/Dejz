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
    <div className="fixed bottom-[calc(1px+env(safe-area-inset-bottom,0px))] sm:bottom-2 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none flex justify-center">
      <motion.div
        className="w-[92%] sm:w-[84%] max-w-[410px] sm:max-w-[430px] h-[64px] sm:h-[68px] rounded-full px-2.5 sm:px-4 bg-white/95 text-neutral-900 border border-black/8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:bg-[#141619]/95 dark:text-white dark:border-white/10 dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-2xl flex items-center justify-between gap-1 sm:gap-2 pointer-events-auto transition-colors duration-200"
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
        <div className="flex items-center justify-center shrink-0 px-1">
          <button
            onClick={() => onAddTransaction("expense")}
            className="w-[42px] h-[42px] sm:w-[44px] sm:h-[44px] rounded-full bg-gradient-to-tr from-[#ff3860] via-[#ff4c4c] to-[#ff7a45] text-white flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-105 shadow-[0_4px_14px_rgba(255,76,76,0.35)] hover:shadow-[0_6px_20px_rgba(255,76,76,0.45)] cursor-pointer shrink-0 border-none outline-none"
            aria-label={language === "sv" ? "Skapa ny utgift" : "New expense"}
          >
            <Plus 
              size={22} 
              strokeWidth={2.6} 
              className="text-white"
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
      className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 transition-all duration-200 active:scale-95 cursor-pointer select-none rounded-2xl ${
        isActive
          ? 'text-neutral-900 dark:text-white'
          : 'text-neutral-400 hover:text-neutral-800 dark:text-white/45 dark:hover:text-white/80'
      }`}
    >
      <Icon 
        size={20} 
        strokeWidth={isActive ? (fillOnActive ? 1.5 : 2.2) : 1.8} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
        className="transition-transform duration-200 mb-0.5"
      />
      <span className={`text-[10px] sm:text-[11px] leading-tight text-center tracking-tight truncate max-w-[62px] sm:max-w-[70px] ${
        isActive ? 'text-neutral-900 dark:text-white font-semibold' : 'text-neutral-500 dark:text-white/60 font-medium'
      }`}>
        {label}
      </span>
    </button>
  );
}
