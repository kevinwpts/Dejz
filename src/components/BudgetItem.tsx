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
  getCancelledListSecondaryText,
  getNextFixedExpensePaymentDate,
  isExpenseCancelledAndExpired,
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
  size = "md",
}: {
  item: any;
  type: "income" | "expense";
  config?: Config;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const isItemVariable = Boolean(item?.isVariable || item?.is_variable);
  const tx = {
    ...item,
    merchant: item?.name || item?.merchant || item?.category,
    type: type,
    isVariable: isItemVariable,
  };
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <TransactionLogo transaction={tx} config={config} size={size} />
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

  const freq = item.frequency;
  const isQuarterly = freq === Frequency.QUARTERLY || freq === "Kvartalsvis" || freq === "QUARTERLY";
  const isSemiAnnual =
    freq === Frequency.SEMI_ANNUALLY || freq === "Halvårsvis" || freq === "SEMI_ANNUALLY";
  const isAnnual = freq === Frequency.ANNUALLY || freq === "Årsvis" || freq === "ANNUALLY";
  const isNonMonthly = isQuarterly || isSemiAnnual || isAnnual;

  // On the card, when listed under frequency groups (kvartalsvis, årsvis, etc.),
  // show the actual sum for that period with the matching frequency suffix.
  const displayAmount = rawAmount;
  let frequencySuffix = t("perMonthSuffix");
  if (isQuarterly) {
    frequencySuffix = t("perQuarterSuffix");
  } else if (isSemiAnnual) {
    frequencySuffix = t("perHalfYearSuffix");
  } else if (isAnnual) {
    frequencySuffix = t("perYearSuffix");
  }

  const tx: Transaction = {
    id: item.id,
    amount: displayAmount,
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
    isVariable: isItemVariable,
  } as any;

  if (isFixedExpenseList) {
    const isCancelled = Boolean(item?.isCancelled);
    const isExpired = isCancelled && isExpenseCancelledAndExpired(item);
    const fullCancelledLine = isCancelled
      ? getCancelledListSecondaryText(item, language)
      : "";

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
        className={`px-3.5 sm:px-4 py-2.5 sm:py-3 min-h-[54px] relative z-10 flex items-center gap-2.5 sm:gap-3 group transition-colors duration-150 ${
          isGrouped
            ? "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-none shadow-none border-none"
            : "bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] rounded-card shadow-subtle border-none"
        } cursor-pointer select-none`}
      >
        <BudgetItemLogo item={item} type={type} config={config || ({ currency, language } as any)} />

        <div className="min-w-0 flex-1 flex flex-col justify-center">
          {/* Rad 1: Namn till vänster, beräknat månadsbelopp högerställt inkl. kr/mån */}
          <div className="flex items-baseline justify-between gap-3 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <p className="text-list-name text-[var(--text-primary)] leading-snug truncate min-w-0">
                {displayName}
              </p>
              {isCancelled && !isExpired && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-micro-label font-medium leading-none bg-[var(--surface-muted)] text-[var(--text-secondary)] shrink-0">
                  {language === "en" ? "Cancelled" : "Uppsagd"}
                </span>
              )}
            </div>
            <p className="text-list-amount whitespace-nowrap shrink-0 text-[var(--text-primary)]">
              {isItemVariable && <span className="opacity-70 mr-0.5">~</span>}
              <span className="tabular-nums">{formatAmount(displayAmount, language)}</span>
              <span className="text-unit text-[var(--text-secondary)] font-normal ml-1">
                {currency}
                <span className="text-micro-label text-[var(--text-tertiary)] ml-0.5">
                  {frequencySuffix}
                </span>
              </span>
            </p>
          </div>

          {/* Rad 2: Uppsagda utgifter använder hela radens bredd; aktiva har alltid kategoriikon + kategori till vänster och betalningsmetod + datum till höger */}
          {isCancelled ? (
            <div className="mt-0.5 min-w-0 w-full">
              <p className="text-secondary leading-snug text-[var(--text-secondary)] tabular-nums break-words w-full">
                {fullCancelledLine}
              </p>
            </div>
          ) : (
            <div className="mt-0.5 flex items-center justify-between gap-2 min-w-0 w-full">
              <div className="flex items-center gap-1 min-w-0 flex-1 text-[var(--text-secondary)]">
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
                <p className="text-secondary leading-snug text-[var(--text-tertiary)] tabular-nums whitespace-nowrap shrink-0 text-right">
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
      hideSign={true}
      isVariable={isItemVariable}
      onClick={onClick}
      isGrouped={isGrouped}
      displayAmount={displayAmount}
    />
  );
}

