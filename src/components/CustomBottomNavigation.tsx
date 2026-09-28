import React from "react";
import { motion } from "motion/react";
import {
  Home,
  History,
  BarChart3,
  WalletCards,
  Plus,
} from "lucide-react";
import { Language, translations, TranslationKey } from "../i18n";

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
  const t = (key: TranslationKey) => translations[language]?.[key] || translations["sv"]?.[key] || key;

  const isAllocateActive = activeTab === "budget" && (budgetSection === "allocate" || budgetSection === "category-budgets");
  const isBudgetActive = activeTab === "budget" && !isAllocateActive;

  return (
    <div className="fixed bottom-[18px] sm:bottom-[22px] left-0 right-0 z-40 px-2.5 sm:px-6 pointer-events-none flex justify-center">
      <motion.div
        className="w-[94%] sm:w-[86%] max-w-[430px] sm:max-w-[450px] h-[64px] sm:h-[68px] rounded-[18px] px-2 sm:px-3 bg-white dark:bg-[#242424] text-[#6E6961] dark:text-[#C7CDDC] backdrop-blur-[24px] flex items-center justify-between pointer-events-auto border border-[#E6E2D8] dark:border-white/[0.04] shadow-lg shadow-black/[0.03] dark:shadow-none"
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

        {/* 3. Central Plus Button */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-0.5">
          <button
            onClick={() => {
              if (onPlusClick) onPlusClick();
            }}
            className="w-11 h-11 sm:w-12 sm:h-12 bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] rounded-full active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-md shadow-black/10 hover:opacity-95"
            aria-label="Lägg till transaktion"
            title="Lägg till transaktion"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>

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
      title={label}
      className={`flex-1 h-full flex items-center justify-center py-2 px-1 transition-all duration-200 active:scale-90 cursor-pointer select-none rounded-2xl relative ${
        isActive
          ? 'text-[#1C1917] dark:text-white'
          : 'text-[#8C867C] hover:text-[#1C1917] dark:text-[#C7CDDC]/60 dark:hover:text-[#C7CDDC]'
      }`}
    >
      <Icon 
        size={23} 
        strokeWidth={isActive ? 2.3 : 1.85} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
        className="transition-transform duration-200"
      />
    </button>
  );
}
