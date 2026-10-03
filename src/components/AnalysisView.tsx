import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LayoutGrid, TrendingUp, Calendar } from 'lucide-react';
import { Transaction, FixedExpense, Config, Frequency } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { TransactionLogo } from './TransactionLogo';
import { EmptyState } from './EmptyState';
import { BudgetSummaryModule } from './BudgetSummaryModule';
import { FilterSelectButton, FilterMenuModal } from './ui';
import { PeriodSelectorModal } from './PeriodSelectorModal';
import { formatAmount } from '../utils/format';
import { getCategoryIconName } from '../utils/icons';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryColor } from '../utils/categoryColors';

interface AnalysisViewProps {
  transactions: Transaction[];
  stats: any;
  config: Config;
  t: (key: TranslationKey) => string;
  fixedExpenses: FixedExpense[];
  currentLang: Language;
  onViewTransaction?: (t: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onViewFixedExpense?: (expense: FixedExpense) => void;
  periods?: any[];
  currentPeriodDate?: Date;
  onPeriodChange?: (date: Date) => void;
  onOpenCalendarPicker?: () => void;
}

export function AnalysisView({ 
  transactions, 
  stats, 
  config, 
  t, 
  fixedExpenses, 
  _currentLang,
  onViewTransaction,
  onDeleteTransaction,
  onViewFixedExpense,
  periods,
  currentPeriodDate,
  onPeriodChange,
  _onOpenCalendarPicker
}: AnalysisViewProps) {
  const currentPeriod = useMemo(() => {
    if (!periods || periods.length === 0) return null;
    const refTime = currentPeriodDate ? new Date(currentPeriodDate).getTime() : Date.now();
    return periods.find(p => {
      if (!p.start || !p.end) return false;
      const start = new Date(p.start).getTime();
      const end = new Date(p.end).getTime() + 86399999;
      return refTime >= start && refTime <= end;
    }) || periods.find(p => p.isCurrent) || null;
  }, [periods, currentPeriodDate]);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'variable' | 'fixed'>('all');
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const isEn = config.language === 'en';



  const filterOptions = useMemo(() => [
    {
      id: 'all' as const,
      label: t('all' as TranslationKey) || (isEn ? 'All expenses' : 'Alla utgifter'),
      icon: <LayoutGrid size={16} strokeWidth={2} />,
    },
    {
      id: 'variable' as const,
      label: t('variableExpenses' as TranslationKey) || (isEn ? 'Variable expenses' : 'Rörliga utgifter'),
      icon: <TrendingUp size={16} strokeWidth={2} />,
    },
    {
      id: 'fixed' as const,
      label: t('fixedExpenses' as TranslationKey) || (isEn ? 'Fixed expenses' : 'Fasta utgifter'),
      icon: <Calendar size={16} strokeWidth={2} />,
    },
  ], [isEn, t]);

  const filteredExpenses = useMemo(() => {
    if (!stats || !transactions) return [];
    return transactions
      .filter(e => {
        const inPeriod = e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime() + 86399999;
        if (!inPeriod) return false;
        return e.type === 'expense' || e.type === 'savings';
      });
  }, [transactions, stats?.periodStart, stats?.periodEnd]);

  const { categoryData, totalFixed, totalSpentInPeriod } = useMemo(() => {
    const breakdown: Record<string, number> = {};
    let fixedSum = 0;
    let spentSum = 0;

    const includeVariable = analysisFilter === 'all' || analysisFilter === 'variable';
    const includeFixed = analysisFilter === 'all' || analysisFilter === 'fixed';

    if (includeVariable) {
      filteredExpenses.forEach((e: Transaction) => {
        if (e.type === 'income') return;
        
        if (e.category === 'Spargris') {
          const cat = 'Spargris';
          breakdown[cat] = (breakdown[cat] || 0) + e.amount;
          spentSum += e.amount;
        } else {
          const transactionSplits = (e as any).splits;
          if (transactionSplits && transactionSplits.length > 0) {
            transactionSplits.forEach((split: any) => {
              const splitCat = (split.category || '').trim();
              breakdown[splitCat] = (breakdown[splitCat] || 0) + split.amount;
            });
          } else {
            const cat = (e.category || '').trim();
            breakdown[cat] = (breakdown[cat] || 0) + e.amount;
          }
          spentSum += e.amount;
        }
      });
    }

    if (includeFixed) {
      fixedExpenses.forEach((e: FixedExpense) => {
        const category = e.category || t('fixedExpenses');
        let amount = Number(e.amount) || 0;
        switch (e.frequency) {
          case Frequency.QUARTERLY: amount = amount / 3; break;
          case Frequency.SEMI_ANNUALLY: amount = amount / 6; break;
          case Frequency.ANNUALLY: amount = amount / 12; break;
          default: break;
        }
        
        if (analysisFilter !== 'variable') {
          fixedSum += amount;
          breakdown[category] = (breakdown[category] || 0) + amount;
        }
      });
    }

    if (includeVariable) {
      (config.categories || []).forEach(c => {
        const nameTrimmed = c.name.trim();
        if (!(nameTrimmed in breakdown)) {
          breakdown[nameTrimmed] = 0;
        }
      });
    }

    const allCats = [...(config.categories || []), ...(config.incomeCategories || [])];

    const data = Object.entries(breakdown)
      .map(([name, value], index) => {
        const searchName = name.trim().toLowerCase();
        const cat = allCats.find(
          c => c.name.trim().toLowerCase() === searchName
        );
        
        const icon = cat?.icon || getCategoryIconName(name);
        const color = cat?.color || getCategoryColor(name, config.categories, index);
        const budgetValue = cat?.budget !== undefined && cat?.budget !== null 
          ? Number(String(cat.budget).replace(/[^0-9.]/g, "")) 
          : 0;
        const budgetInKronor = !isNaN(budgetValue) && budgetValue > 0 ? Math.round(budgetValue) : 0;

        return { name, value, color, icon, budget: cat?.budget, budgetInKronor };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
      
    return { 
      categoryData: data, 
      totalFixed: fixedSum, 
      totalSpentInPeriod: spentSum,
    };
  }, [filteredExpenses, fixedExpenses, t, analysisFilter, config.categories, config.incomeCategories]);

  const totalSpent = (analysisFilter === 'fixed' ? 0 : totalSpentInPeriod) + 
    (analysisFilter !== 'variable' ? totalFixed : 0);

  const effectiveBudget = useMemo(() => {
    if (!stats) return 0;
    if (analysisFilter === 'variable') {
      return stats.disposablePot || 0;
    }
    if (analysisFilter === 'fixed') {
      return stats.totalFixed || 0;
    }
    if (stats.totalIncome > 0) return Math.max(0, stats.totalIncome - (stats.totalSavings || 0));
    return (stats.disposablePot || 0) + (stats.totalFixed || 0);
  }, [stats, analysisFilter]);

  const remainingBudget = useMemo(() => {
    if (!stats) return 0;
    if (analysisFilter === 'variable') {
      return (stats.disposablePot || 0) - totalSpent;
    }
    if (analysisFilter === 'fixed') {
      return (stats.totalFixed || 0) - totalSpent;
    }
    if (stats.remainingPeriodCents !== undefined) {
      return stats.remainingPeriodCents;
    }
    return effectiveBudget - totalSpent;
  }, [stats, analysisFilter, totalSpent, effectiveBudget]);

  const largestCategory = useMemo(() => {
    if (categoryData.length === 0) return { name: "", amount: 0 };
    const first = categoryData[0];
    return { name: first.name, amount: first.value };
  }, [categoryData]);

  const budgetUsedPct = useMemo(() => {
    if (!stats) return 0;
    if (analysisFilter === 'all') {
      const pot = stats.disposablePot || 0;
      if (pot <= 0) return 0;
      const spent = pot - remainingBudget;
      return Math.max(0, Math.round((spent / pot) * 100));
    }
    return effectiveBudget > 0 ? Math.round((totalSpent / effectiveBudget) * 100) : 0;
  }, [stats, analysisFilter, effectiveBudget, remainingBudget, totalSpent]);

  // Donut chart / list items data: Top 5 categories + "Övriga kategorier"
  const chartItems = useMemo(() => {
    if (categoryData.length <= 5) {
      return categoryData.map(c => ({
        name: c.name,
        value: c.value,
        color: c.color,
        icon: c.icon,
        pct: totalSpent > 0 ? Math.round((c.value / totalSpent) * 100) : 0,
        isOther: false,
      }));
    }

    const top5 = categoryData.slice(0, 5).map(c => ({
      name: c.name,
      value: c.value,
      color: c.color,
      icon: c.icon,
      pct: totalSpent > 0 ? Math.round((c.value / totalSpent) * 100) : 0,
      isOther: false,
    }));

    const otherSum = categoryData.slice(5).reduce((acc, c) => acc + c.value, 0);
    const otherPct = totalSpent > 0 ? Math.max(0, 100 - top5.reduce((acc, c) => acc + c.pct, 0)) : 0;

    top5.push({
      name: isEn ? 'Other categories' : 'Övriga kategorier',
      value: otherSum,
      color: '#79728D',
      icon: 'morehorizontal',
      pct: otherPct,
      isOther: true,
    });

    return top5;
  }, [categoryData, totalSpent, isEn]);

  if (!stats) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Selectors: Period (Left) & Content Filter (Right) */}
      <div className="flex items-center gap-2 w-full">
        {/* Left: Period Button */}
        <FilterSelectButton
          icon={<Calendar size={15} strokeWidth={2} />}
          value={stats.periodName?.split('(')[0]?.trim() || (isEn ? 'Period' : 'Period')}
          onClick={() => setIsPeriodModalOpen(true)}
          className="flex-[1.25] min-w-0"
        />

        {/* Right: Content Filter Button */}
        <FilterSelectButton
          icon={
            analysisFilter === 'all' ? <LayoutGrid size={15} strokeWidth={2} /> :
            analysisFilter === 'variable' ? <TrendingUp size={15} strokeWidth={2} /> :
            <Calendar size={15} strokeWidth={2} />
          }
          value={
            analysisFilter === 'all' ? (t('all' as TranslationKey) || (isEn ? 'All' : 'Alla')) :
            analysisFilter === 'variable' ? (isEn ? 'Variable' : 'Rörliga') :
            (isEn ? 'Fixed' : 'Fasta')
          }
          onClick={() => setIsFilterModalOpen(true)}
          className="flex-1 min-w-0"
        />
      </div>

      {/* Period Selector Modal */}
      <PeriodSelectorModal
        isOpen={isPeriodModalOpen}
        onClose={() => setIsPeriodModalOpen(false)}
        periods={periods || []}
        selectedPeriod={currentPeriod}
        selectedDate={null}
        onSelectPeriod={(p) => {
          if (p.date && onPeriodChange) {
            onPeriodChange(new Date(p.date));
          }
        }}
        onSelectDate={() => {}}
        showCalendarOption={false}
        currentLang={config.language}
      />

      {/* Content Filter Modal */}
      <FilterMenuModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        title={isEn ? 'Filter spending' : 'Filtrera utgifter'}
        selectedId={analysisFilter}
        onSelect={(id) => {
          setAnalysisFilter(id as 'all' | 'variable' | 'fixed');
          setExpandedCategory(null);
        }}
        options={filterOptions}
      />

      {/* Unified Budget Summary Card */}
      <BudgetSummaryModule
        stats={stats}
        config={config}
        transactions={transactions}
        fixedExpenses={fixedExpenses}
        t={t}
        totalSpentOverride={totalSpent}
        largestCategoryOverride={largestCategory}
        budgetUsedPctOverride={budgetUsedPct}
        remainingBudgetOverride={remainingBudget}
        filterMode={analysisFilter}
      />

      {/* DONUT DIAGRAM & FÖRDELNING */}
      <div className="bg-white dark:bg-[#1C1C1C] rounded-[22px] p-5 sm:p-6 border-none shadow-none space-y-6">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Distribution' : 'Fördelning'}
          </h2>
          <span className="text-[13px] font-normal text-[var(--text-secondary)]">
            {categoryData.filter(c => c.value > 0).length} {isEn ? 'categories' : 'kategorier'}
          </span>
        </div>

        {chartItems.length > 0 ? (
          <div className="space-y-6">
            {/* Donut Chart */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {(() => {
                  const radius = 38;
                  const circumference = 2 * Math.PI * radius;
                  let accumulatedPercent = 0;

                  return chartItems.map((item) => {
                    const fraction = totalSpent > 0 ? item.value / totalSpent : 0;
                    const strokeLength = fraction * circumference;
                    const dashArray = `${Math.max(0, strokeLength - 2.5)} ${circumference}`;
                    const dashOffset = -accumulatedPercent * circumference;
                    accumulatedPercent += fraction;

                    return (
                      <circle
                        key={item.name}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="13"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 hover:opacity-85 cursor-pointer"
                        onClick={() => {
                          if (!item.isOther) {
                            setExpandedCategory(expandedCategory === item.name ? null : item.name);
                          }
                        }}
                      />
                    );
                  });
                })()}
              </svg>

              {/* Airy Center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                <span className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  {isEn ? 'Total' : 'Totalt'}
                </span>
                <span className="text-[16px] sm:text-[19px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
                  {formatAmount(Math.round(totalSpent), config.language)} {config.currency}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-[13px] text-[var(--text-secondary)]">
            {isEn ? 'No spending recorded for this period' : 'Inga utgifter registrerade för denna period'}
          </div>
        )}
      </div>

      {/* FULLSTÄNDIG KATEGORILISTA */}
      <div className="space-y-3 pb-8">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[18px] font-semibold text-[var(--text-primary)] tracking-tight">
            {t('categories')} ({categoryData.length})
          </h3>
        </div>

        {categoryData.length > 0 ? (
          <div className="bg-white dark:bg-[#1C1C1C] rounded-[22px] border-none shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04] overflow-hidden">
            {categoryData.map((item) => {
              const isExpanded = expandedCategory === item.name;
              
              const categoryTransactions = analysisFilter === 'fixed' ? [] : filteredExpenses
                .filter(t => {
                  const catName = item.name;
                  if (t.type === 'income') {
                    if (t.category === 'Budgetökning' && catName === 'Spargris') return true;
                    return false;
                  }
                  
                  const transactionSplits = (t as any).splits;
                  if (transactionSplits && transactionSplits.length > 0) {
                    return transactionSplits.some((s: any) => (s.category || '').trim() === catName.trim());
                  }
                  
                  return (t.category || '').trim() === catName.trim();
                })
                .sort((a, b) => b.timestamp - a.timestamp);
                
              const categoryFixedExpenses = analysisFilter === 'variable' ? [] : fixedExpenses
                  .filter(e => {
                    const catName = e.category || t('fixedExpenses');
                    return catName === item.name;
                  });

              const totalItemCount = categoryTransactions.length + categoryFixedExpenses.length;

              return (
                <div key={item.name} className="transition-colors">
                  <div 
                    className="p-4 flex flex-col justify-center group hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                    onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CategoryIcon icon={item.icon} color={item.color} size="md" />

                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-[14px] font-medium text-[var(--text-primary)] leading-tight truncate tracking-tight">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-[12px] text-[var(--text-secondary)]">
                            <span>
                              {totalItemCount} {isEn ? (totalItemCount === 1 ? 'item' : 'items') : 'st'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap pl-2">
                        <div className="text-right flex flex-col items-end justify-center">
                          <p className="text-[14px] font-medium font-amount tabular-nums text-[var(--text-primary)] leading-tight">
                            {formatAmount(Math.round(item.value), config.language)}
                            <span className="text-[12px] font-normal text-[var(--text-secondary)] ml-[2.5px]">{config.currency}</span>
                          </p>
                        </div>
                        <div className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          <ChevronDown size={18} strokeWidth={1.8} />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.04] dark:divide-white/[0.04]"
                      >
                        <div className="p-3 sm:p-4 space-y-2">
                          {categoryTransactions.length > 0 && (
                            <div className="space-y-1.5">
                              {categoryTransactions.map((t) => (
                                <TransactionItem 
                                  key={t.id}
                                  transaction={t}
                                  config={config}
                                  onView={onViewTransaction}
                                  onDelete={onDeleteTransaction}
                                  variant="nested"
                                  showDate
                                />
                              ))}
                            </div>
                          )}

                          {categoryFixedExpenses.length > 0 && (
                            <div className="space-y-1.5">
                              {categoryFixedExpenses.map((fe) => {
                                const feTransaction: Transaction = {
                                  id: fe.id,
                                  merchant: fe.name,
                                  category: fe.category,
                                  amount: fe.amount,
                                  type: 'expense',
                                  date: new Date().toISOString(),
                                };
                                return (
                                  <div key={fe.id}>
                                    <TransactionItem
                                      transaction={feTransaction}
                                      isFixed={true}
                                      config={config}
                                      language={config.language}
                                      currency={config.currency || 'kr'}
                                      onView={() => onViewFixedExpense?.(fe)}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {totalItemCount === 0 && (
                            <div className="py-4 text-center text-[13px] text-[#6D6962] dark:text-[#A8A8A8]">
                              {isEn ? 'No transactions in this category' : 'Inga transaktioner i denna kategori'}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={t('noData')}
            description={isEn ? 'No expenses recorded for this period' : 'Inga utgifter finns registrerade för den valda perioden'}
          />
        )}
      </div>
    </div>
  );
}
