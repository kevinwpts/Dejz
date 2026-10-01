import React from "react";
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
    <footer 
      className="fixed bottom-0 left-0 right-0 z-40 w-full bg-[var(--bg-color)] select-none overflow-visible rounded-none m-0 p-0 border-none shadow-none pb-[min(14px,env(safe-area-inset-bottom,0px))]"
    >
      {/* Konvex rund upphöjning (kulle) på 76 × 76 px bakom knappen i exakt samma bakgrundsfärg som appen */}
      <div 
        className="absolute left-1/2 -top-[23px] -translate-x-1/2 w-[76px] h-[76px] rounded-full bg-[var(--bg-color)] pointer-events-none z-0 border-none shadow-none"
        aria-hidden="true"
      />

      {/* Upphöjd rund mittknapp på 56 × 56 px flyttad upp typ 2 mm */}
      <div className="absolute left-1/2 -top-[13px] -translate-x-1/2 z-20">
        <button
          type="button"
          onClick={() => {
            if (onPlusClick) onPlusClick();
          }}
          className="w-[56px] h-[56px] rounded-full bg-[var(--accent-color)] text-white flex items-center justify-center cursor-pointer active:scale-95 transition-transform border-none outline-none shadow-none"
          aria-label={isEn ? "Add transaction" : "Lägg till transaktion"}
          title={isEn ? "Add transaction" : "Lägg till transaktion"}
        >
          <Plus size={28} strokeWidth={3.3} className="text-white" />
        </button>
      </div>

      {/* 5 lika breda kolumner indragna från sidokanterna med ca 2 mm mer luft i botten */}
      <nav className="relative z-10 w-full max-w-lg mx-auto h-[62px] grid grid-cols-5 items-end pb-3.5 px-3.5 sm:px-6">
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

        {/* 3. Mittkolumn spacer (mittknappen ligger absolut centrerad över denna) */}
        <div className="w-full h-full pointer-events-none" aria-hidden="true" />

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
      </nav>
    </footer>
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
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-full flex flex-col items-center justify-center transition-colors active:scale-95 cursor-pointer select-none ${
        isActive
          ? 'text-[var(--accent-color)] dark:text-white font-semibold'
          : 'text-[#8C867C] dark:text-white/80 hover:text-[#1C1917] dark:hover:text-white font-medium'
      }`}
    >
      <Icon 
        size={20} 
        strokeWidth={isActive ? 2.2 : 1.8} 
        fill={isActive && fillOnActive ? "currentColor" : "none"}
        className="transition-colors dark:text-white"
      />
      <span className="text-[10.5px] leading-none tracking-tight mt-[3px]">
        {label}
      </span>
    </button>
  );
}
