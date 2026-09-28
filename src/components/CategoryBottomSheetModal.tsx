import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { Transaction } from '../types';
import { formatAmount } from '../utils/format';
import { ICON_MAP, getCategoryIconName, isEmojiString } from '../utils/icons';
import { feedback } from '../utils/feedback';

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
  language?: string;
  onViewTransaction: (transaction: Transaction) => void;
  onAddTransaction: (type?: string, prefill?: any) => void;
  onNavigate: (tab: string, section?: string) => void;
}

export function CategoryBottomSheetModal({
  isOpen,
  onClose,
  categoryName,
  categoryData,
  selectedDate,
  allTransactions = [],
  language = 'sv',
  onViewTransaction,
  onAddTransaction,
  onNavigate,
}: CategoryBottomSheetModalProps) {
  const [activeScope, setActiveScope] = useState<'day' | 'period'>('period');
  const isEn = language === 'en';

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

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

  // Filter transactions for this category
  const { periodTransactions, dayTransactions } = useMemo(() => {
    if (!targetCategoryName) return { periodTransactions: [], dayTransactions: [] };

    const normSelected = new Date(selectedDate);
    normSelected.setHours(0, 0, 0, 0);

    const normCat = targetCategoryName.trim().toLowerCase();

    const periodList = allTransactions.filter((tx) => {
      if (tx.isExcludedFromBudget || tx.isInternalTransfer || tx.isTransfer) return false;
      if (tx.type === 'income') return false;
      const txCat = (tx.category || '').trim().toLowerCase();
      return txCat === normCat;
    });

    const dayList = periodList.filter((tx) => {
      const txDate = new Date(tx.date);
      txDate.setHours(0, 0, 0, 0);
      return txDate.getTime() === normSelected.getTime();
    });

    // Sort descending by date
    periodList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    dayList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { periodTransactions: periodList, dayTransactions: dayList };
  }, [targetCategoryName, allTransactions, selectedDate]);

  const displayTransactions = activeScope === 'day' ? dayTransactions : periodTransactions;

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
            className="relative w-full max-w-lg bg-[#232323] border-t border-white/[0.1] rounded-t-[32px] shadow-2xl max-h-[88vh] flex flex-col z-10 overflow-hidden font-sans text-white"
          >
            {/* Top Grab Handle */}
            <div className="w-12 h-1.5 rounded-full bg-white/25 mx-auto mt-3 mb-1 shrink-0" />

            {/* Header: Category Identity & Close Button */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-white/[0.05] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/[0.08] border border-white/[0.1] text-white flex items-center justify-center shrink-0">
                  {isEmojiString(iconKey) ? (
                    <span className="text-xl leading-none">{iconKey}</span>
                  ) : IconComponent ? (
                    <IconComponent size={20} className="text-white" />
                  ) : (
                    <ShoppingBag size={20} className="text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold font-display uppercase tracking-wider text-white truncate">
                    {targetCategoryName}
                  </h2>
                  <p className="text-[11.5px] font-medium text-[#9CA6BC]">
                    {categoryData?.hasBudget
                      ? (isEn ? `Budget: ${formatAmount(categoryData.budget, language)} kr` : `Budgetgräns: ${formatAmount(categoryData.budget, language)} kr`)
                      : (isEn ? 'No budget limit set' : 'Ingen budgetgräns satt')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (typeof feedback.light === 'function') feedback.light();
                  onClose();
                }}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Stäng"
              >
                <X size={17} strokeWidth={2.2} />
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 space-y-4 no-scrollbar">
              {/* Category Budget Status Card */}
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-[#9CA6BC] uppercase tracking-wider font-display">
                    {isEn ? 'Remaining in budget' : 'Kvar i kategorin'}
                  </span>
                  <span className="text-xs font-bold text-white/70">
                    {spentPct}% {isEn ? 'spent' : 'använt'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-1.5">
                    {categoryData?.hasBudget ? (
                      categoryData.isOverBudget ? (
                        <span className="text-2xl sm:text-3xl font-black text-rose-500 font-amount tabular-nums">
                          +{formatAmount(Math.abs(categoryData.remaining), language)} kr
                        </span>
                      ) : (
                        <span className="text-2xl sm:text-3xl font-black text-white font-amount tabular-nums">
                          {formatAmount(categoryData.remaining, language)} kr
                        </span>
                      )
                    ) : (
                      <span className="text-2xl sm:text-3xl font-black text-white font-amount tabular-nums">
                        {formatAmount(categoryData?.spent || 0, language)} kr
                      </span>
                    )}
                    <span className="text-xs font-semibold text-[#9CA6BC]">
                      {categoryData?.hasBudget
                        ? (categoryData.isOverBudget ? (isEn ? 'over' : 'över budget') : (isEn ? 'left' : 'kvar'))
                        : (isEn ? 'spent this period' : 'totalt spenderat')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-white/80 tabular-nums">
                      {formatAmount(categoryData?.spent || 0, language)} kr
                    </span>
                    <span className="text-[10.5px] text-[#9CA6BC] block">
                      {isEn ? 'spent' : 'spenderat'}
                    </span>
                  </div>
                </div>

                {categoryData?.hasBudget && (
                  <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        categoryData.isOverBudget ? 'bg-rose-500' : 'bg-white'
                      }`}
                      style={{ width: `${spentPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Segmented Filter Pills: Valt Datum vs Hela Perioden */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback.selection === 'function') feedback.selection();
                      setActiveScope('period');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeScope === 'period'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-[#9CA6BC] hover:text-white'
                    }`}
                  >
                    {isEn ? 'Entire period' : 'Hela perioden'} ({periodTransactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback.selection === 'function') feedback.selection();
                      setActiveScope('day');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeScope === 'day'
                        ? 'bg-white text-black shadow-xs'
                        : 'text-[#9CA6BC] hover:text-white'
                    }`}
                  >
                    {isEn ? 'Selected date' : 'Valt datum'} ({dayTransactions.length})
                  </button>
                </div>

                <span className="text-[11px] font-semibold text-[#9CA6BC]">
                  {displayTransactions.reduce((acc, t) => acc + (t.amountCents || 0), 0) > 0 && (
                    <>
                      {isEn ? 'Sum:' : 'Summa:'}{' '}
                      <span className="font-bold text-white">
                        {formatAmount(displayTransactions.reduce((acc, t) => acc + (t.amountCents || 0), 0), language)} kr
                      </span>
                    </>
                  )}
                </span>
              </div>

              {/* Transactions List for this category */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA6BC] font-display">
                  {isEn ? 'Category Purchases' : 'Utgifter i kategorin'}
                </span>

                {displayTransactions.length > 0 ? (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar pr-0.5">
                    {displayTransactions.map((tx) => {
                      const txDate = new Date(tx.date);
                      const dateFormatted = txDate.toLocaleDateString(language === 'en' ? 'en-US' : 'sv-SE', {
                        day: 'numeric',
                        month: 'short',
                      });

                      return (
                        <div
                          key={tx.id}
                          onClick={() => {
                            if (typeof feedback.light === 'function') feedback.light();
                            onViewTransaction(tx);
                          }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.04] transition-all group cursor-pointer active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-white/[0.06] text-white flex items-center justify-center shrink-0">
                              <Calendar size={13} className="text-[#9CA6BC]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-white transition-colors">
                                {tx.merchant || tx.description || tx.category || (isEn ? 'Expense' : 'Utgift')}
                              </p>
                              <p className="text-[10.5px] font-medium text-[#9CA6BC]">
                                {dateFormatted} {tx.note ? `• ${tx.note}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pl-2">
                            <span className="text-xs sm:text-sm font-black text-white font-amount tabular-nums">
                              {formatAmount(tx.amountCents || 0, language)} kr
                            </span>
                            <ArrowUpRight size={13} className="text-[#9CA6BC] opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 px-4 text-center rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.06] space-y-1">
                    <p className="text-xs font-semibold text-white/80">
                      {activeScope === 'day'
                        ? (isEn ? 'No expenses in this category on the selected date' : 'Inga utgifter i denna kategori på det valda datumet')
                        : (isEn ? 'No expenses in this category during this period' : 'Inga utgifter registrerade i denna kategori under perioden')}
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
