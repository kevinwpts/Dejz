import React from "react";
import { Language, TranslationKey } from "../i18n";
import { Config, Transaction, Frequency } from "../types";
import { TransactionItem } from "./TransactionItem";
import { TransactionLogo } from "./TransactionLogo";
import { CategoryIcon } from "./CategoryIcon";
import { getCategoryIconName } from "../utils/icons";
import { capitalize, formatAmount, formatDeductionDayDisplay } from "../utils/format";
import {
  formatShortDate,
  getLastPaymentDate,
  getNextFixedExpensePaymentDate,
} from "../utils/cancellation";

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
  isFixedExpenseList?: boolean;
}

export function formatFixedExpensePaymentMethod(
  rawMethod: any,
  t: (key: TranslationKey) => string
): string {
  const raw =
    typeof rawMethod === "object"
      ? rawMethod?.name || ""
      : typeof rawMethod === "string"
      ? rawMethod
      : "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const lower = trimmed.toLowerCase();
  if (
    lower === "kortbetalning" ||
    lower === "kortdragning" ||
    lower === "kort" ||
    lower === "card payment" ||
    lower === "card"
  ) {
    return t("paymentMethodCardShort");
  }

  return capitalize(trimmed);
}

export function BudgetItemLogo({
  item,
  type,
  config,
}: {
  item: any;
  type: "income" | "expense";
  config?: Config;
}) {
  const isItemVariable = Boolean(item?.isVariable || item?.is_variable);
  const tx = {
    ...item,
    merchant: item?.name || item?.merchant || item?.category,
    type: type,
    isVariable: isItemVariable,
  };
  return (
    <div className="relative inline-flex shrink-0 w-[42px] h-[42px] items-center justify-center">
      <TransactionLogo transaction={tx} config={config} />
      {isItemVariable && (
        <span
          title="Varierande belopp"
          className="absolute bottom-0 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--accent-color)] text-[var(--on-accent)] text-micro-label font-bold flex items-center justify-center leading-none border-[1.5px] border-[var(--surface-color)] shadow-xs pointer-events-none z-20 select-none font-sans"
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
  isFixedExpenseList,
}: BudgetItemProps) {
  const isItemVariable = Boolean(item?.isVariable || item?.is_variable);
  const isFixed = Boolean(item.frequency || item.deductionDay || isItemVariable);
  const displayName = item.name || (isFixed ? item.category : t("savings" as any));

  const hasOverride = Boolean(
    isItemVariable &&
      currentPeriodId &&
      item.periodOverrides &&
      item.periodOverrides[currentPeriodId] !== undefined
  );
  const rawAmount = hasOverride ? item.periodOverrides[currentPeriodId] : (item.amount || 0);

  // Standardize to monthly equivalent
  let monthlyAmount = rawAmount;
  const freq = item.frequency;
  const isQuarterly = freq === Frequency.QUARTERLY || freq === "Kvartalsvis" || freq === "QUARTERLY";
  const isSemiAnnual =
    freq === Frequency.SEMI_ANNUALLY || freq === "Halvårsvis" || freq === "SEMI_ANNUALLY";
  const isAnnual = freq === Frequency.ANNUALLY || freq === "Årsvis" || freq === "ANNUALLY";
  const isNonMonthly = isQuarterly || isSemiAnnual || isAnnual;

  if (isQuarterly) {
    monthlyAmount = rawAmount / 3;
  } else if (isSemiAnnual) {
    monthlyAmount = rawAmount / 6;
  } else if (isAnnual) {
    monthlyAmount = rawAmount / 12;
  }

  const finalDisplayAmount = Math.round(monthlyAmount);

  const tx: Transaction = {
    id: item.id,
    amount: finalDisplayAmount,
    category:
      item.category ||
      (type === "income"
        ? language === "en"
          ? "Income"
          : "Inkomst"
        : language === "en"
        ? "Savings"
        : "Sparande"),
    merchant: displayName,
    type: type === "income" ? "income" : "expense",
    timestamp: Date.now(),
    logo: item.logo,
    icon: item.icon,
    paymentMethod: item.paymentMethod as any,
    deductionDay: item.deductionDay,
    frequency: item.frequency,
    isCancelled: item.isCancelled,
    cancellationDate: item.cancellationDate,
    cancelledAt: item.cancelledAt,
    lastPaymentDate: item.lastPaymentDate,
    originalAmount: rawAmount !== finalDisplayAmount ? rawAmount : undefined,
    isVariable: isItemVariable,
  } as any;

  if (isFixedExpenseList) {
    const isCancelled = Boolean(item?.isCancelled);
    const cancelledStatusText = t("cancelledStatus");
    const lastPayIso = isCancelled ? getLastPaymentDate(item) || item.cancellationDate : null;
    const lastPayShort = lastPayIso ? formatShortDate(lastPayIso, language) : "";
    const cancelledDatePart = lastPayShort
      ? `${t("lastPaymentDateLabel")} ${lastPayShort}`
      : "";
    const fullCancelledLine = [cancelledStatusText, cancelledDatePart]
      .filter(Boolean)
      .join(" · ");

    const methodText = formatFixedExpensePaymentMethod(item?.paymentMethod, t);
    const rawCat =
      typeof item?.category === "object"
        ? item?.category?.name || ""
        : item?.category || "";
    const rawCatStr = String(rawCat).trim();
    const categoryText = rawCatStr ? capitalize(rawCatStr) : "";
    const searchCat = rawCatStr.toLowerCase();
    const matchedCategory = (config?.categories || [])
      .concat(config?.incomeCategories || [])
      .find(
        (c) =>
          (c?.name || "").trim().toLowerCase() === searchCat ||
          c?.id === rawCatStr ||
          (c?.id || "").toLowerCase() === searchCat
      );
    const categoryIconKey =
      matchedCategory?.icon || (rawCatStr ? getCategoryIconName(rawCatStr) : "");

    const nextPaymentDateObj = isNonMonthly ? getNextFixedExpensePaymentDate(item) : null;
    const nextPaymentDateText = nextPaymentDateObj
      ? formatShortDate(nextPaymentDateObj, language)
      : "";

    const monthlyDayText = item?.deductionDay
      ? formatDeductionDayDisplay(item.deductionDay, language, true)
      : "";

    const paymentDateText = isNonMonthly ? nextPaymentDateText : monthlyDayText;
    const rightMetadataText = [methodText, paymentDateText].filter(Boolean).join(" · ");

    return (
      <div
        onClick={onClick}
        className={`px-4 py-3 sm:py-3.5 min-h-[56px] relative z-10 flex items-center gap-3 group transition-colors duration-150 ${
          isGrouped
            ? "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-none shadow-none border-none"
            : "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-card shadow-subtle border border-subtle"
        } cursor-pointer select-none`}
      >
        <BudgetItemLogo item={item} type={type} config={config || ({ currency, language } as any)} />

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          {/* Rad 1: Namn till vänster, beräknat månadsbelopp högerställt inkl. kr/mån */}
          <div className="flex items-baseline justify-between gap-3 min-w-0">
            <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug truncate min-w-0 flex-1">
              {displayName}
            </p>
            <p className="text-list-amount whitespace-nowrap shrink-0 text-[var(--text-primary)]">
              <span className="opacity-80 mr-0.5">−</span>
              <span className="tabular-nums">{formatAmount(finalDisplayAmount, language)}</span>
              <span className="text-secondary opacity-80 font-normal ml-1">
                {currency}
                <span className="text-micro-label opacity-70 ml-0.5">
                  {t("perMonthSuffix")}
                </span>
              </span>
            </p>
          </div>

          {/* Rad 2: Uppsagda utgifter använder hela radens bredd; aktiva har alltid kategoriikon + kategori till vänster och betalningsmetod + datum till höger */}
          {isCancelled ? (
            <div className="mt-0.5 min-w-0 w-full">
              <p className="text-secondary leading-snug text-amber-600 dark:text-amber-400 font-medium tabular-nums truncate w-full">
                {fullCancelledLine}
              </p>
            </div>
          ) : (
            <div className="mt-0.5 flex items-center justify-between gap-3 min-w-0 w-full">
              <div className="flex items-end gap-1 min-w-0 flex-1 text-[var(--text-secondary)]">
                {categoryIconKey ? (
                  <CategoryIcon
                    icon={categoryIconKey}
                    categoryName={rawCatStr}
                    variant="minimal"
                    size="2xs"
                  />
                ) : null}
                <span className="text-secondary leading-snug text-[var(--text-secondary)] truncate min-w-0">
                  {categoryText}
                </span>
              </div>
              {rightMetadataText ? (
                <p className="text-secondary leading-snug text-[var(--text-secondary)] tabular-nums whitespace-nowrap shrink-0 text-right">
                  {rightMetadataText}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

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

