import React from "react";
import { motion } from "motion/react";
import {
  Home,
  History,
  SlidersHorizontal,
  BarChart3,
  WalletCards,
} from "lucide-react";
import { Language, translations, TranslationKey } from "../i18n";

type Tab = "today" | "transactions" | "analysis" | "budget" | "profile" | "allocate";

interface CustomBottomNavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  budgetSection?: string | null;
  onNavigateSection?: (tab: Tab, section?: string) => void;
  language: Language;
  onAddTransaction?: (type: "income" | "expense", prefill?: any) => void;
  logoUrl?: string;
  avatarUrl?: string | null;
  currency?: string;
  onQuickAdd?: (item: any) => void;
  addToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export function CustomBottomNavigation({
  activeTab,
  setActiveTab,
  budgetSection,
  onNavigateSection,
  language,
}: CustomBottomNavigationProps) {
  const t = (key: TranslationKey) => translations[language]?.[key] || translations["sv"]?.[key] || key;

  const isAllocateActive = activeTab === "budget" && (budgetSection === "allocate" || budgetSection === "category-budgets");
  const isBudgetActive = activeTab === "budget" && !isAllocateActive;

  return (
    <div className="fixed bottom-[calc(6px+env(safe-area-inset-bottom,0px))] sm:bottom-3.5 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none flex justify-center">
      <motion.div
        className="w-[94%] sm:w-[86%] max-w-[430px] sm:max-w-[450px] h-[64px] sm:h-[68px] rounded-full px-2 sm:px-3 bg-white/[0.04] dark:bg-white/[0.04] text-slate-200 backdrop-blur-2xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_40px_rgba(0,0,0,0.4)] flex items-center justify-between pointer-events-auto border border-white/[0.08]"
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

        {/* 3. Budget */}
        <NavItem
          icon={SlidersHorizontal}
          label="Budget"
          isActive={isAllocateActive}
          onClick={() => {
            if (onNavigateSection) {
              onNavigateSection("budget", "allocate");
            } else {
              setActiveTab("budget");
            }
          }}
        />

        {/* 4. Analys */}
        <NavItem
          icon={BarChart3}
          label={t("analysis")}
          isActive={activeTab === "analysis"}
          onClick={() => setActiveTab("analysis")}
        />

        {/* 5. Ekonomi */}
        <NavItem
          icon={WalletCards}
          label={language === "en" ? "Finances" : "Ekonomi"}
          isActive={isBudgetActive}
          onClick={() => {
            if (onNavigateSection) {
              onNavigateSection("budget");
            } else {
              setActiveTab("budget");
            }
          }}
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
          ? 'text-white font-semibold'
          : 'text-slate-400 opacity-70 hover:opacity-100 font-medium'
      }`}
    >
      <Icon 
        size={19} 
        strokeWidth={isActive ? (fillOnActive ? 1.6 : 2.0) : 1.75} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
        className="transition-transform duration-200 mb-0.5"
      />
      <span className={`text-[10px] sm:text-[10.5px] leading-tight text-center tracking-tight truncate max-w-[62px] sm:max-w-[70px] ${
        isActive ? 'text-white font-semibold' : 'text-slate-400 font-medium'
      }`}>
        {label}
      </span>
    </button>
  );
}
