import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag } from 'lucide-react';
import { Transaction, Config } from '../types';
import { formatAmount } from '../utils/format';
import { ICON_MAP, getCategoryIconName, isEmojiString } from '../utils/icons';
import { feedback } from '../utils/feedback';
import { TransactionItem } from './TransactionItem';
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
    remaining: number;
    hasBudget: boolean;
    isOverBudget: boolean;
    color?: string;
  } | null;
  selectedDate: Date;
  allTransactions: Transaction[];
  stats?: any;
  config: Config;
  language?: string;
  onViewTransaction: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onAddTransaction?: (type?: string, prefill?: any) => void;
  onNavigate?: (tab: string, section?: string) => void;
}

export function CategoryBottomSheetModal({
  isOpen,
  onClose,
  categoryName,
  categoryData,
  selectedDate: _selectedDate,
  allTransactions = [],
  stats,
  config,
  language = 'sv',
  onViewTransaction,
  onDeleteTransaction,
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

  // Icon calculation
  const iconKey = categoryData?.iconName || matchedCategory?.icon || (targetCategoryName ? getCategoryIconName(targetCategoryName) : 'Tag');
  const IconComponent = ICON_MAP[iconKey] || ICON_MAP['Tag'];

  const _spentPct = useMemo(() => {
    if (!categoryData?.hasBudget || !categoryData?.budget || categoryData.budget <= 0) return 0;
    return Math.min(100, Math.round((categoryData.spent / categoryData.budget) * 100));
  }, [categoryData]);

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
              {/* Category Budget Status Card - Clear context of spent vs total budget */}
              <div className="p-4 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.04] dark:border-white/[0.06] shrink-0 space-y-2.5">
                {categoryData?.hasBudget ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        {categoryData.isOverBudget ? (
                          <>
                            <span className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-500 font-amount tabular-nums">
                              +{formatAmount(Math.abs(categoryData.remaining), language)} {curr}
                            </span>
                            <span className="text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-500">
                              {isEn 
                                ? `over budget (budget: ${formatAmount(Math.round(categoryData.budget), language)} ${curr})` 
                                : `över budget (budget: ${formatAmount(Math.round(categoryData.budget), language)} ${curr})`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-amount tabular-nums">
                              {formatAmount(categoryData.remaining, language)} {curr}
                            </span>
                            <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
                              {isEn ? 'left of' : 'kvar av'}{' '}
                              <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                                {formatAmount(Math.round(categoryData.budget), language)} {curr}
                              </span>
                            </span>
                          </>
                        )}
                      </div>

                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border tabular-nums shrink-0 ${
                        categoryData.isOverBudget 
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                          : 'bg-black/[0.04] dark:bg-white/[0.06] text-[var(--text-secondary)] border-black/5 dark:border-white/10'
                      }`}>
                        {Math.round((categoryData.spent / (categoryData.budget || 1)) * 100)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-black/[0.05] dark:bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          categoryData.isOverBudget ? 'bg-rose-500' : ''
                        }`}
                        style={{
                          width: `${Math.min(100, Math.round((categoryData.spent / (categoryData.budget || 1)) * 100))}%`,
                          backgroundColor: !categoryData.isOverBudget ? categoryColor : undefined,
                        }}
                      />
                    </div>

                    {/* Clear Context: Spenderat X kr av Y kr budget */}
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium pt-0.5">
                      <div className="flex items-center gap-1">
                        <span className="opacity-80">{isEn ? 'Spent' : 'Spenderat'}:</span>
                        <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                          {formatAmount(Math.round(categoryData.spent), language)} {curr}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="opacity-80">{isEn ? 'Budget' : 'Satt budget'}:</span>
                        <span className="font-semibold text-[var(--text-primary)] font-amount tabular-nums">
                          {formatAmount(Math.round(categoryData.budget), language)} {curr}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-amount tabular-nums">
                        {formatAmount(categoryData?.spent || 0, language)} {curr}
                      </span>
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        {isEn ? 'total spent' : 'totalt spenderat'}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-[var(--text-tertiary)] mt-1">
                      {isEn ? 'No budget set for this category' : 'Ingen budget satt för denna kategori'}
                    </p>
                  </div>
                )}
              </div>

              {/* Transactions List */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0 pt-0.5">
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
                ) : (
                  <EmptyState
                    title={isEn ? 'No expenses in this category' : 'Inga utgifter i denna kategori'}
                    description={isEn ? 'No expenses recorded in this category during the selected period.' : 'Inga utgifter registrerade i denna kategori under den valda perioden.'}
                    className="py-6"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
