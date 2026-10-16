import React from "react";
import { motion } from "motion/react";
import { Language } from "../i18n";
import { Icon, IconName } from "./ui/Icon";

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
  const isAllocateActive =
    activeTab === "budget" &&
    (budgetSection === "allocate" || budgetSection === "category-budgets");
  const isBudgetActive = activeTab === "budget" && !isAllocateActive;

  const isEn = language === "en";

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 w-full select-none pointer-events-none px-4 pt-2 pb-[max(14px,env(safe-area-inset-bottom,14px))]">
      <div className="w-full max-w-[440px] mx-auto flex items-center gap-2.5 sm:gap-3 pointer-events-auto">
        {/* Modern Floating Pill Dock (Left) */}
        <nav
          aria-label={isEn ? "Main navigation" : "Huvudnavigering"}
          className="flex-1 h-[60px] rounded-full bg-[var(--surface-color)]/92 dark:bg-[var(--surface-raised)]/92 backdrop-blur-2xl border border-[var(--border-divider)] shadow-subtle p-1.5 grid grid-cols-4 items-center relative"
        >
          {/* 1. Hem */}
          <NavItem
            iconName="house"
            label={isEn ? "Home" : "Hem"}
            isActive={activeTab === "today"}
            onClick={() => setActiveTab("today")}
          />

          {/* 2. Historik */}
          <NavItem
            iconName="clock-counter-clockwise"
            label={isEn ? "History" : "Historik"}
            isActive={activeTab === "transactions"}
            onClick={() => setActiveTab("transactions")}
          />

          {/* 3. Analys */}
          <NavItem
            iconName="chart-bar"
            label={isEn ? "Analysis" : "Analys"}
            isActive={activeTab === "analysis"}
            onClick={() => setActiveTab("analysis")}
          />

          {/* 4. Ekonomi */}
          <NavItem
            iconName="wallet"
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

        {/* Detached Circular Plus Button to the Right of the Footer */}
        <button
          type="button"
          onClick={() => {
            if (onPlusClick) onPlusClick();
          }}
          className="shrink-0 w-[60px] h-[60px] rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] flex items-center justify-center cursor-pointer touch-press active:scale-95 transition-all border border-white/12 shadow-subtle outline-none"
          aria-label={isEn ? "Add transaction" : "Lägg till transaktion"}
          title={isEn ? "Add transaction" : "Lägg till transaktion"}
        >
          <Icon
            name="plus"
            size={25}
            weight="bold"
            className="text-[var(--on-accent)]"
          />
        </button>
      </div>
    </footer>
  );
}

function NavItem({
  iconName,
  label,
  isActive,
  onClick,
}: {
  iconName: IconName;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative h-full w-full rounded-full flex flex-col items-center justify-center transition-colors touch-press-subtle cursor-pointer select-none z-10 ${
        isActive
          ? "text-[var(--accent-color)] font-semibold"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium"
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="modern-footer-active-pill"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="absolute inset-0 rounded-full bg-[var(--accent-color)]/[0.08] dark:bg-white/[0.09] -z-10"
          aria-hidden="true"
        />
      )}
      <Icon
        name={iconName}
        size={21}
        weight={isActive ? "fill" : "regular"}
        className="transition-transform duration-150"
      />
      <span className="text-[10px] leading-none mt-[3px] tracking-[-0.01em]">
        {label}
      </span>
    </button>
  );
}

