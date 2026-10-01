import React from "react";
import { motion } from "motion/react";
import {
  Home,
  History,
  BarChart3,
  WalletCards,
  Plus,
} from "lucide-react";
import { Language } from "../i18n";

type Tab = "today" | "transactions" | "analysis" | "budget" | "profile" | "allocate";

interface CustomBottomNavigationProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  budgetSection?: string | null;
  onNavigateSection?: (tab: Tab, section?: string) => void;
  language: Language;
  onPlusClick?: () => void;
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
  onPlusClick,
}: CustomBottomNavigationProps) {
  const isAllocateActive = activeTab === "budget" && (budgetSection === "allocate" || budgetSection === "category-budgets");
  const isBudgetActive = activeTab === "budget" && !isAllocateActive;

  const isEn = language === 'en';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-[max(0.85rem,env(safe-area-inset-bottom,0px))] px-4 sm:px-6 pointer-events-none flex justify-center">
      <motion.div
        className="w-full max-w-[290px] h-[54px] rounded-full px-2.5 bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl text-[#6D6962] dark:text-[#A8A8A8] flex items-center justify-between pointer-events-auto border-none shadow-xl shadow-black/[0.06] dark:shadow-2xl dark:shadow-black/80"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
      >
        {/* 1. Hem */}
        <NavItem
          icon={Home}
          label={isEn ? "Home" : "Hem"}
          isActive={activeTab === "today"}
          onClick={() => setActiveTab("today")}
          fillOnActive
        />

        {/* 2. Historik */}
        <NavItem
          icon={History}
          label={isEn ? "History" : "Historik"}
          isActive={activeTab === "transactions"}
          onClick={() => setActiveTab("transactions")}
        />

        {/* 3. Centrerad Plusknapp */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              if (onPlusClick) onPlusClick();
            }}
            className="w-[38px] h-[38px] bg-[var(--accent-color)] hover:opacity-90 text-white rounded-full active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-[var(--accent-color)]/25"
            aria-label={isEn ? "Add transaction" : "Lägg till transaktion"}
            title={isEn ? "Add transaction" : "Lägg till transaktion"}
          >
            <Plus size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* 4. Analys */}
        <NavItem
          icon={BarChart3}
          label={isEn ? "Analysis" : "Analys"}
          isActive={activeTab === "analysis"}
          onClick={() => setActiveTab("analysis")}
        />

        {/* 5. Ekonomi */}
        <NavItem
          icon={WalletCards}
          label={isEn ? "Finances" : "Ekonomi"}
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
      title={label}
      className={`w-9 h-9 flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer select-none rounded-full ${
        isActive
          ? 'text-[var(--accent-color)] dark:text-white'
          : 'text-[#8C867C] hover:text-[#1C1917] dark:text-[#A8A8A8] dark:hover:text-white'
      }`}
    >
      <Icon 
        size={20} 
        strokeWidth={isActive ? 2.2 : 1.8} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
      />
    </button>
  );
}
