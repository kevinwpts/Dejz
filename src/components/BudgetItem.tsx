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
  const tx = {
    ...item,
    merchant: item.name || item.merchant || item.category,
    type: type,
  };
  return <TransactionLogo transaction={tx} config={config} />;
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
  const isFixed = Boolean(item.frequency || item.deductionDay || item.isVariable);
  const displayName = item.name || (isFixed ? item.category : t("savings" as any));

  const hasOverride = Boolean(
    item.isVariable && currentPeriodId && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined
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
  } as any;

  return (
    <TransactionItem
      transaction={tx}
      config={config || ({ currency, language } as any)}
      isFixed={true}
      hideFixedBadge={true}
      onClick={onClick}
      isGrouped={isGrouped}
      displayAmount={finalDisplayAmount}
    />
  );
}
