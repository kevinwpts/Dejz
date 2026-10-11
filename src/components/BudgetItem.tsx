import React from "react";
import { Language, TranslationKey } from "../i18n";
import { Config, Transaction, Frequency } from "../types";
import { TransactionItem } from "./TransactionItem";
import { TransactionLogo } from "./TransactionLogo";

interface BudgetItemProps {
  item: any;
  onClick: () => void;
  currency: string;
  type?: "income" | "expense";
  language: Language;
  t: (key: TranslationKey) => string;
  config?: Config;
  currentPeriodId?: string;
  isGrouped?: boolean;
}

export function BudgetItemLogo({ item, type, config }: { item: any; type: "income" | "expense"; config?: Config }) {
  const isItemVariable = Boolean(item?.isVariable || item?.is_variable);
  const tx = {
    ...item,
    merchant: item?.name || item?.merchant || item?.category,
    type: type,
    isVariable: isItemVariable,
  };
  return (
    <div className="relative inline-flex shrink-0">
      <TransactionLogo transaction={tx} config={config} />
      {isItemVariable && (
        <span
          title="Varierande belopp"
          className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-micro-label font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--surface-color)] shadow-xs pointer-events-none z-20 select-none font-sans"
        >
          R
        </span>
      )}
    </div>
  );
}

export function BudgetItem({
  item,
  onClick,
  currency,
  type = "expense",
  language,
  t,
  config,
  currentPeriodId,
  isGrouped,
}: BudgetItemProps) {
  const isItemVariable = Boolean(item?.isVariable || item?.is_variable);
  const isFixed = Boolean(item.frequency || item.deductionDay || isItemVariable);
  const displayName = item.name || (isFixed ? item.category : t("savings" as any));

  const hasOverride = Boolean(
    isItemVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined
  );
  const rawAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);

  // Standardize to monthly equivalent
  let monthlyAmount = rawAmount;
  const freq = item.frequency;
  if (freq === Frequency.QUARTERLY || freq === "Kvartalsvis") {
    monthlyAmount = rawAmount / 3;
  } else if (freq === Frequency.SEMI_ANNUALLY || freq === "Halvårsvis") {
    monthlyAmount = rawAmount / 6;
  } else if (freq === Frequency.ANNUALLY || freq === "Årsvis") {
    monthlyAmount = rawAmount / 12;
  }

  const finalDisplayAmount = Math.round(monthlyAmount);

  const tx: Transaction = {
    id: item.id,
    amount: finalDisplayAmount,
    category:
      item.category ||
      (type === "income"
        ? language === "en" ? "Income" : "Inkomst"
        : language === "en" ? "Savings" : "Sparande"),
    merchant: displayName,
    type: type === "income" ? "income" : "expense",
    timestamp: Date.now(),
    logo: item.logo,
    icon: item.icon,
    paymentMethod: item.paymentMethod as any,
    deductionDay: item.deductionDay,
    frequency: item.frequency,
    isCancelled: item.isCancelled,
    originalAmount: rawAmount !== finalDisplayAmount ? rawAmount : undefined,
    isVariable: isItemVariable,
  } as any;

  return (
    <TransactionItem
      transaction={tx}
      config={config || ({ currency, language } as any)}
      isFixed={true}
      hideFixedBadge={true}
      isVariable={isItemVariable}
      onClick={onClick}
      isGrouped={isGrouped}
      displayAmount={finalDisplayAmount}
    />
  );
}
