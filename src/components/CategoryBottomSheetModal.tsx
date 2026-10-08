import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag } from 'lucide-react';
import { Transaction, Config, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { formatAmount } from '../utils/format';
import { ICON_MAP, getCategoryIconName, isEmojiString } from '../utils/icons';
import { feedback } from '../utils/feedback';
import { TransactionItem } from './TransactionItem';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { useScrollLock } from '../hooks/useScrollLock';

interface CategoryBottomSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string | null;
  categoryData: {
    name: string;
    iconName?: string;
    spent: number;
    budget: number;
    variableSpent?: number;
    fixedSpent?: number;
    remaining: number;
    hasBudget: boolean;
    isOverBudget: boolean;
    color?: string;
  } | null;
  selectedDate: Date;
  allTransactions: Transaction[];
  fixedExpenses?: FixedExpense[];
  onViewFixedExpense?: (expense: FixedExpense) => void;
  stats?: any;
  config: Config;
  language?: string;
  onViewTransaction: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onAddTransaction?: (type?: string, prefill?: any) => void;
  onNavigate?: (tab: string, section?: string) => void;
  t?: (key: TranslationKey) => string;
}

export function CategoryBottomSheetModal({
  isOpen,
  onClose,
  categoryName,
  categoryData,
  selectedDate: _selectedDate,
  allTransactions = [],
  fixedExpenses = [],
  onViewFixedExpense,
  stats,
  config,
  language = 'sv',
  onViewTransaction,
  onDeleteTransaction,
  t,
}: CategoryBottomSheetModalProps) {
  const isEn = language === 'en';
  const curr = config?.currency || 'kr';

  useScrollLock(isOpen);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const targetCategoryName = categoryName || categoryData?.name;

  const matchedCategory = useMemo(() => {
    if (!targetCategoryName || !config?.categories) return null;
    const norm = targetCategoryName.trim().toLowerCase();
    return config.categories.find((c) => (c.name || '').trim().toLowerCase() === norm);
  }, [targetCategoryName, config?.categories]);

  const categoryColor = categoryData?.color || matchedCategory?.color || '#6E6961';

  // Filter transactions for this category strictly within the current period
  const periodTransactions = useMemo(() => {
    if (!targetCategoryName) return [];

    const normCat = targetCategoryName.trim().toLowerCase();
    const periodStartMs = stats?.periodStart ? new Date(stats.periodStart).getTime() : null;
    const periodEndMs = stats?.periodEnd ? new Date(stats.periodEnd).getTime() + 86399999 : null;

    const periodList = allTransactions.filter((tx) => {
      if (!tx) return false;
      if (tx.isExcludedFromBudget || tx.isInternalTransfer || tx.isTransfer) return false;
      if (tx.type === 'income') return false;

      // Period filter: strictly within current period
      if (periodStartMs !== null && periodEndMs !== null) {
        const txTime = tx.timestamp || (tx.date ? new Date(tx.date).getTime() : 0);
        if (txTime < periodStartMs || txTime > periodEndMs) {
          return false;
        }
      }

      const txCat = (tx.category || '').trim().toLowerCase();
      if (txCat === normCat) return true;

      // Handle split transactions
      const splits = (tx as any).splits;
      if (splits && Array.isArray(splits) && splits.length > 0) {
        return splits.some((s: any) => (s.category || '').trim().toLowerCase() === normCat);
      }

      return false;
    });

    // Sort descending by timestamp / date
    return periodList.sort((a, b) => {
      const timeA = a.timestamp || (a.date ? new Date(a.date).getTime() : 0);
      const timeB = b.timestamp || (b.date ? new Date(b.date).getTime() : 0);
      return timeB - timeA;
    });
  }, [targetCategoryName, allTransactions, stats?.periodStart, stats?.periodEnd]);

  const displayTransactions = periodTransactions;

  // Filter fixed expenses for this category
  const matchingFixedExpenses = useMemo(() => {
    if (!targetCategoryName || !fixedExpenses || fixedExpenses.length === 0) return [];
    const normCat = targetCategoryName.trim().toLowerCase();
    return fixedExpenses.filter((fe) => {
      if (!fe || fe.isCancelled) return false;
      const feCat = (fe.category || '').trim().toLowerCase();
      return feCat === normCat;
    });
  }, [targetCategoryName, fixedExpenses]);

  const totalFixedAmount = useMemo(() => {
    return matchingFixedExpenses.reduce((sum, fe) => {
      const amount =
        fe.isVariable && stats?.periodId && fe.periodOverrides && fe.periodOverrides[stats.periodId] !== undefined
          ? fe.periodOverrides[stats.periodId]
          : Number(fe.amount) || 0;
      return sum + amount;
    }, 0);
  }, [matchingFixedExpenses, stats?.periodId]);

  // Icon calculation
  const iconKey = categoryData?.iconName || matchedCategory?.icon || (targetCategoryName ? getCategoryIconName(targetCategoryName) : 'Tag');
  const IconComponent = ICON_MAP[iconKey] || ICON_MAP['Tag'];

  const actualFixedSpent = categoryData?.fixedSpent !== undefined 
    ? Math.round(categoryData.fixedSpent) 
    : Math.round(totalFixedAmount);

  const actualVariableSpent = categoryData?.variableSpent !== undefined
    ? Math.round(categoryData.variableSpent)
    : Math.round(displayTransactions.reduce((s, tx) => s + (Number(tx.amount) || 0), 0));

  const actualTotalSpent = categoryData?.spent !== undefined
    ? Math.round(categoryData.spent)
    : Math.round(actualFixedSpent + actualVariableSpent);

  const budget = categoryData?.budget !== undefined 
    ? Math.round(categoryData.budget) 
    : Math.round(Number(matchedCategory?.budget) || 0);

  const hasBudget = budget > 0;
  const remaining = budget - actualTotalSpent;

  const usedPercentage = hasBudget
    ? Math.round((actualTotalSpent / budget) * 100)
    : 0;

  if (!targetCategoryName || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-auto p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => {
              if (typeof feedback.light === 'function') feedback.light();
              onClose();
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full sm:max-w-lg bg-[var(--bg-color)] border-none rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col z-10 overflow-hidden font-sans text-[var(--text-primary)]"
          >
            {/* Top Grab Handle */}
            <div className="w-10 h-1 rounded-full bg-black/20 dark:bg-white/20 mx-auto mt-2.5 mb-1 shrink-0 sm:hidden" />

            {/* Header: Category Identity & Close Button */}
            <div className="flex items-center justify-between px-5 sm:px-6 pt-3 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 text-white shadow-xs"
                  style={{ backgroundColor: categoryColor }}
                >
                  {isEmojiString(iconKey) ? (
                    <span className="text-xl leading-none">{iconKey}</span>
                  ) : IconComponent ? (
                    <IconComponent size={20} className="text-white" strokeWidth={2} />
                  ) : (
                    <ShoppingBag size={20} className="text-white" strokeWidth={2} />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)] truncate">
                    {targetCategoryName}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border-none shadow-none"
                aria-label="Stäng"
              >
                <X size={17} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-6 space-y-3.5 no-scrollbar flex flex-col min-h-0">
              {/* Category Budget Status Card */}
              <div className="p-4 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.04] dark:border-white/[0.06] shrink-0 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Main text + Subtext */}
                  <div className="flex flex-col min-w-0">
                    {hasBudget ? (
                      <>
                        <span
                          className={`text-xl sm:text-2xl font-bold font-amount tabular-nums tracking-tight ${
                            remaining < 0
                              ? 'text-rose-600 dark:text-rose-500'
                              : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {remaining < 0
                            ? `${formatAmount(Math.abs(remaining), language)} ${curr} ${isEn ? 'over budget' : 'över budget'}`
                            : remaining === 0
                            ? `0 ${curr} ${isEn ? 'left' : 'kvar'}`
                            : `${formatAmount(remaining, language)} ${curr} ${isEn ? 'left' : 'kvar'}`}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-0.5">
                          {remaining < 0
                            ? `Budget: ${formatAmount(budget, language)} ${curr}`
                            : `${isEn ? 'of' : 'av'} ${formatAmount(budget, language)} ${curr}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] tracking-tight">
                          {isEn ? 'No budget set' : 'Ingen budget satt'}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-0.5">
                          {actualTotalSpent > 0
                            ? `${formatAmount(actualTotalSpent, language)} ${curr} ${isEn ? 'total spent' : 'totalt spenderat'}`
                            : (isEn ? 'No expenses recorded' : 'Inga utgifter registrerade')}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Right: Percentage pill (only when hasBudget) */}
                  {hasBudget && (
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border tabular-nums shrink-0 whitespace-nowrap mt-0.5 ${
                        remaining < 0
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : remaining === 0
                          ? 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border-black/5 dark:border-white/10'
                          : actualTotalSpent === 0
                          ? 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border-black/5 dark:border-white/10'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {usedPercentage} % {isEn ? 'used' : 'använt'}
                    </span>
                  )}
                </div>

                {/* Progress Bar (only when hasBudget) */}
                {hasBudget && (
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden transition-colors ${
                      remaining < 0
                        ? 'bg-rose-500/15 dark:bg-rose-500/20'
                        : 'bg-black/[0.05] dark:bg-white/[0.08]'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        remaining < 0
                          ? 'bg-rose-500 dark:bg-rose-500'
                          : remaining === 0
                          ? 'bg-neutral-400 dark:bg-neutral-500'
                          : 'bg-emerald-500 dark:bg-emerald-400'
                      }`}
                      style={{
                        width: `${remaining < 0 ? 100 : Math.min(100, Math.max(0, usedPercentage))}%`,
                      }}
                    />
                  </div>
                )}

                {/* Fixed vs Variable Breakdown under summary */}
                {(actualFixedSpent > 0 || actualVariableSpent > 0) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.04] text-[11px] text-[var(--text-secondary)] flex-wrap">
                    <span className="font-medium">
                      {isEn ? 'Fixed: ' : 'Varav fasta: '}
                      <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                        {formatAmount(actualFixedSpent, language)} {curr}
                      </span>
                    </span>
                    <span>•</span>
                    <span className="font-medium">
                      {isEn ? 'Variable: ' : 'Rörliga: '}
                      <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                        {formatAmount(actualVariableSpent, language)} {curr}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Expenses List: Fixed Expenses and Variable Transactions */}
              <div className="space-y-3.5 flex-1 flex flex-col min-h-0 pt-0.5">
                {/* 1. Fasta utgifter (om det finns för denna kategori) */}
                {matchingFixedExpenses.length > 0 && (
                  <div className="space-y-1.5 shrink-0">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[12px] font-bold text-[var(--text-secondary)] tracking-tight">
                        {isEn ? 'Fixed expenses' : 'Fasta utgifter'} ({matchingFixedExpenses.length})
                      </span>
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-amount tabular-nums">
                        {formatAmount(totalFixedAmount, language)} {curr}
                      </span>
                    </div>

                    <div className="bg-[var(--surface-color)] rounded-[20px] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                      {matchingFixedExpenses.map((fe) => (
                        <BudgetItem
                          key={fe.id}
                          item={fe}
                          onClick={() => {
                            if (typeof feedback.light === 'function') feedback.light();
                            if (onViewFixedExpense) onViewFixedExpense(fe);
                          }}
                          currency={curr}
                          type="expense"
                          language={language as any}
                          t={t || ((k: any) => k)}
                          config={config}
                          currentPeriodId={stats?.periodId}
                          isGrouped={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Rörliga transaktioner */}
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  {matchingFixedExpenses.length > 0 && (
                    <div className="flex items-center justify-between px-1 pt-1">
                      <span className="text-[12px] font-bold text-[var(--text-secondary)] tracking-tight">
                        {isEn ? 'Variable transactions' : 'Rörliga utgifter'} ({displayTransactions.length})
                      </span>
                      {displayTransactions.length > 0 && (
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] font-amount tabular-nums">
                          {formatAmount(
                            displayTransactions.reduce((s, tx) => s + (Number(tx.amount) || 0), 0),
                            language
                          )} {curr}
                        </span>
                      )}
                    </div>
                  )}

                  {displayTransactions.length > 0 ? (
                    <div className="space-y-2.5 overflow-y-auto no-scrollbar pr-0.5 flex-1">
                      {displayTransactions.map((tx) => (
                        <TransactionItem
                          key={tx.id}
                          transaction={tx}
                          config={config}
                          onView={onViewTransaction}
                          onDelete={onDeleteTransaction}
                          showDate={true}
                        />
                      ))}
                    </div>
                  ) : matchingFixedExpenses.length > 0 ? (
                    <div className="p-4 rounded-[18px] bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.04] text-center">
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {isEn ? 'No variable expenses recorded in this period' : 'Inga rörliga utgifter registrerade denna period'}
                      </p>
                    </div>
                  ) : (
                    <EmptyState
                      title={isEn ? 'No expenses in this category' : 'Inga utgifter i denna kategori'}
                      description={isEn ? 'No expenses recorded in this category during the selected period.' : 'Inga utgifter registrerade i denna kategori under den valda perioden.'}
                      className="py-6"
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
