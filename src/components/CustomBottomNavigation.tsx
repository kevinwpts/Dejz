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
    <div className="fixed bottom-0 left-0 right-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] px-3 sm:px-6 pointer-events-none flex justify-center">
      <motion.div
        className="w-full max-w-[440px] h-[64px] rounded-[24px] px-2 bg-white dark:bg-[#242424] text-[#6D6962] dark:text-[#A8A8A8] flex items-center justify-between pointer-events-auto border border-[#E2DDD4] dark:border-[#383838] shadow-md shadow-black/[0.04]"
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

        {/* 3. Centrerad Plusknapp (cirka 48px) */}
        <div className="flex items-center justify-center px-1">
          <button
            onClick={() => {
              if (onPlusClick) onPlusClick();
            }}
            className="w-[48px] h-[48px] bg-[#635BFF] hover:bg-[#5148E5] text-white rounded-full active:scale-95 flex items-center justify-center transition-all cursor-pointer shadow-sm shadow-[#635BFF]/30"
            aria-label={isEn ? "Add transaction" : "Lägg till transaktion"}
            title={isEn ? "Add transaction" : "Lägg till transaktion"}
          >
            <Plus size={22} strokeWidth={2.2} />
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
      className={`min-w-[44px] min-h-[44px] flex-1 h-full flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 cursor-pointer select-none rounded-[16px] ${
        isActive
          ? 'text-[#635BFF] dark:text-[#7C75FF]'
          : 'text-[#6D6962] hover:text-[#211F1C] dark:text-[#A8A8A8] dark:hover:text-white'
      }`}
    >
      <Icon 
        size={22} 
        strokeWidth={isActive ? 2.2 : 1.8} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
      />
      <span className="text-[11px] font-medium leading-none tracking-tight">
        {label}
      </span>
    </button>
  );
}
