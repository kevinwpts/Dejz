import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag } from 'lucide-react';
import { Transaction, Config } from '../types';
import { formatAmount } from '../utils/format';
import { ICON_MAP, getCategoryIconName, isEmojiString } from '../utils/icons';
import { feedback } from '../utils/feedback';
import { TransactionItem } from './TransactionItem';
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

  // Total sum calculation: if split, add split amount for this category, else tx.amount
  const totalDisplaySum = useMemo(() => {
    if (!targetCategoryName) return 0;
    const normCat = targetCategoryName.trim().toLowerCase();

    return periodTransactions.reduce((acc, t) => {
      const splits = (t as any).splits;
      if (splits && Array.isArray(splits) && splits.length > 0) {
        const splitAmount = splits
          .filter((s: any) => (s.category || '').trim().toLowerCase() === normCat)
          .reduce((sSum: number, s: any) => sSum + (Number(s.amount) || 0), 0);
        return acc + splitAmount;
      }
      return acc + (Number(t.amount) || 0);
    }, 0);
  }, [periodTransactions, targetCategoryName]);

  // Icon calculation
  const iconKey = categoryData?.iconName || (targetCategoryName ? getCategoryIconName(targetCategoryName) : 'Tag');
  const IconComponent = ICON_MAP[iconKey] || ICON_MAP['Tag'];

  const spentPct = useMemo(() => {
    if (!categoryData?.hasBudget || !categoryData?.budget || categoryData.budget <= 0) return 0;
    return Math.min(100, Math.round((categoryData.spent / categoryData.budget) * 100));
  }, [categoryData]);

  if (!targetCategoryName) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto">
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Bottom Sheet Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-[#F7F5F0] dark:bg-[#232323] border-t border-[#E6E2D8] dark:border-white/[0.1] rounded-t-[22px] shadow-2xl max-h-[88vh] flex flex-col z-10 overflow-hidden font-sans text-[var(--text-primary)]"
          >
            {/* Top Grab Handle */}
            <div className="w-12 h-1.5 rounded-full bg-black/20 dark:bg-white/25 mx-auto mt-3 mb-1 shrink-0" />

            {/* Header: Category Identity & Close Button */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-[#E6E2D8] dark:border-white/[0.05] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/[0.08] border border-[#E6E2D8] dark:border-white/[0.1] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                  {isEmojiString(iconKey) ? (
                    <span className="text-xl leading-none">{iconKey}</span>
                  ) : IconComponent ? (
                    <IconComponent size={20} className="text-[var(--text-primary)]" />
                  ) : (
                    <ShoppingBag size={20} className="text-[var(--text-primary)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold font-display uppercase tracking-wider text-[#1C1917] dark:text-white truncate">
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
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/[0.06] hover:bg-black/10 dark:hover:bg-white/[0.12] text-[#6E6961] dark:text-white/80 hover:text-[#1C1917] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Stäng"
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 space-y-4 no-scrollbar">
              {/* Category Budget Status Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.04] border border-[#E6E2D8] dark:border-white/[0.06] space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    {categoryData?.hasBudget ? (
                      categoryData.isOverBudget ? (
                        <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-500 font-amount tabular-nums">
                          +{formatAmount(Math.abs(categoryData.remaining), language)} kr
                        </span>
                      ) : (
                        <span className="text-2xl sm:text-3xl font-black text-[#1C1917] dark:text-white font-amount tabular-nums">
                          {formatAmount(categoryData.remaining, language)} kr
                        </span>
                      )
                    ) : (
                      <span className="text-2xl sm:text-3xl font-black text-[#1C1917] dark:text-white font-amount tabular-nums">
                        {formatAmount(categoryData?.spent || 0, language)} kr
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#6E6961] dark:text-[#9CA6BC]">
                      {categoryData?.hasBudget
                        ? (categoryData.isOverBudget ? (isEn ? 'over' : 'över budget') : (isEn ? 'left' : 'kvar'))
                        : (isEn ? 'spent this period' : 'totalt spenderat')}
                    </span>
                  </div>
                </div>

                {categoryData?.hasBudget && (
                  <div className="w-full h-2 bg-black/10 dark:bg-white/[0.08] rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        categoryData.isOverBudget ? 'bg-rose-500' : 'bg-emerald-500 dark:bg-emerald-400'
                      }`}
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Transactions List using standard TransactionItem */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E6961] dark:text-[#9CA6BC] font-display">
                    {isEn ? 'Purchases this period' : 'Periodens utgifter'} ({periodTransactions.length})
                  </span>

                  {totalDisplaySum > 0 && (
                    <span className="text-[11px] font-semibold text-[#6E6961] dark:text-[#9CA6BC]">
                      {isEn ? 'Sum:' : 'Summa:'}{' '}
                      <span className="font-bold text-[#1C1917] dark:text-white font-amount tabular-nums">
                        {formatAmount(totalDisplaySum, language)} kr
                      </span>
                    </span>
                  )}
                </div>

                {displayTransactions.length > 0 ? (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar pr-0.5">
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
                  <div className="py-6 px-4 text-center rounded-2xl bg-white dark:bg-white/[0.02] border border-dashed border-[#E6E2D8] dark:border-white/[0.06] space-y-1">
                    <p className="text-xs font-semibold text-[#6E6961] dark:text-white/80">
                      {isEn ? 'No expenses in this category during this period' : 'Inga utgifter registrerade i denna kategori under perioden'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
