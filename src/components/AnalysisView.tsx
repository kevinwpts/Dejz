import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LayoutGrid, TrendingUp, Calendar } from 'lucide-react';
import { Transaction, FixedExpense, Config, Frequency } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
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

  // Format date range (e.g. "24 sep–22 okt")
  const periodDateRange = useMemo(() => {
    const start = currentPeriod?.start || stats?.periodStart;
    const end = currentPeriod?.end || stats?.periodEnd;
    if (!start || !end) return '';
    try {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const locale = isEn ? 'en-US' : 'sv-SE';
      const sStr = startDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '');
      const eStr = endDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '');
      return `${sStr} \u2013 ${eStr}`;
    } catch {
      return '';
    }
  }, [currentPeriod, stats?.periodStart, stats?.periodEnd, isEn]);

  const filterOptions = useMemo(() => [
    {
      id: 'all' as const,
      label: t('all' as TranslationKey) || (isEn ? 'All expenses' : 'Alla utgifter'),
      subtitle: isEn ? 'Variable and fixed expenses' : 'Både rörliga och fasta kostnader',
      icon: <LayoutGrid size={16} strokeWidth={2} />,
    },
    {
      id: 'variable' as const,
      label: t('variableExpenses' as TranslationKey) || (isEn ? 'Variable expenses' : 'Rörliga utgifter'),
      subtitle: isEn ? 'Purchases, groceries, daily spending' : 'Köp, mat och vardagskostnader',
      icon: <TrendingUp size={16} strokeWidth={2} />,
    },
    {
      id: 'fixed' as const,
      label: t('fixedExpenses' as TranslationKey) || (isEn ? 'Fixed expenses' : 'Fasta utgifter'),
      subtitle: isEn ? 'Rent, bills and recurring contracts' : 'Hyra, räkningar och abonnemang',
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

  // Horizontal bar chart data: Top 5 categories + "Övriga kategorier"
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
      <div className="space-y-1.5">
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

        {/* Selected date range directly under period selector */}
        {periodDateRange && (
          <div className="text-center pt-0.5">
            <span className="text-[14px] font-normal text-[#6D6962] dark:text-[#A8A8A8] select-none">
              {periodDateRange}
            </span>
          </div>
        )}
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
        subtitle={isEn ? 'Choose which expenses to include in analysis' : 'Välj vilka kostnader som ska visas i analysen'}
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

      {/* HORISONTELLT STAPELDIAGRAM (FÖRDELNING) */}
      <div className="bg-white dark:bg-[#242424] rounded-[20px] p-4 sm:p-5 border border-[#E2DDD4] dark:border-[#383838] shadow-none space-y-4">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-[18px] font-semibold text-[#211F1C] dark:text-white tracking-tight">
            {isEn ? 'Distribution' : 'Fördelning'}
          </h2>
          <span className="text-[13px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">
            {categoryData.filter(c => c.value > 0).length} {isEn ? 'categories' : 'kategorier'}
          </span>
        </div>

        {chartItems.length > 0 ? (
          <div className="space-y-3.5 pt-1">
            {chartItems.map((item) => {
              const barWidth = totalSpent > 0 ? Math.min(100, Math.max(4, (item.value / totalSpent) * 100)) : 0;
              const isSelected = expandedCategory === item.name;

              return (
                <div 
                  key={item.name}
                  onClick={() => {
                    if (!item.isOther) {
                      setExpandedCategory(expandedCategory === item.name ? null : item.name);
                    }
                  }}
                  className={`space-y-1.5 transition-all ${item.isOther ? '' : 'cursor-pointer hover:opacity-90'}`}
                >
                  <div className="flex items-center justify-between text-[13px] gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon icon={item.icon} color={item.color} size="xs" />
                      <span className={`font-normal truncate ${isSelected ? 'text-[#635BFF] dark:text-[#7C75FF] font-medium' : 'text-[#211F1C] dark:text-white'}`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                      <span className="font-medium text-[#211F1C] dark:text-white text-[13.5px]">
                        {formatAmount(Math.round(item.value), config.language)} {config.currency}
                      </span>
                      <span className="font-normal text-[#6D6962] dark:text-[#A8A8A8] text-[12px]">
                        ({item.pct}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--surface-muted)] dark:bg-[#2D2D2D] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barWidth}%` }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-[13px] text-[#6D6962] dark:text-[#A8A8A8]">
            {isEn ? 'No spending recorded for this period' : 'Inga utgifter registrerade för denna period'}
          </div>
        )}
      </div>

      {/* FULLSTÄNDIG KATEGORILISTA */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[18px] font-semibold text-[#211F1C] dark:text-white tracking-tight">
            {t('categories')} ({categoryData.length})
          </h3>
        </div>

        {categoryData.length > 0 ? (
          <div className="bg-white/80 dark:bg-white/[0.06] backdrop-blur-xl rounded-[20px] border-none shadow-none divide-y divide-black/5 dark:divide-white/[0.04] overflow-hidden">
            {categoryData.map((item) => {
              const isExpanded = expandedCategory === item.name;
              
              // Get transactions for this category
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
                
              // Get fixed expenses for this category
              const categoryFixedExpenses = analysisFilter === 'variable' ? [] : fixedExpenses
                  .filter(e => {
                    const catName = e.category || t('fixedExpenses');
                    return catName === item.name;
                  });

              const totalItemCount = categoryTransactions.length + categoryFixedExpenses.length;

              return (
                <div key={item.name} className="transition-colors">
                  <div 
                    className="p-4 flex flex-col justify-center group hover:bg-[var(--surface-muted)]/50 dark:hover:bg-[#2D2D2D] transition-colors cursor-pointer"
                    onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <CategoryIcon icon={item.icon} color={item.color} size="md" />

                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-[14px] font-medium text-[#211F1C] dark:text-white leading-tight truncate tracking-tight">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 text-[12px] text-[#6D6962] dark:text-[#A8A8A8]">
                            <span>
                              {totalItemCount} {isEn ? (totalItemCount === 1 ? 'item' : 'items') : 'st'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap pl-2">
                        <div className="text-right flex flex-col items-end justify-center">
                          <p className="text-[14px] font-medium font-amount tabular-nums text-[#211F1C] dark:text-white leading-tight">
                            {formatAmount(Math.round(item.value), config.language)}
                            <span className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-[2.5px]">{config.currency}</span>
                          </p>
                        </div>
                        <div className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-[#211F1C] dark:text-white' : 'text-[#6D6962] dark:text-[#A8A8A8]'}`}>
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
                        className="overflow-hidden bg-[var(--surface-muted)]/30 dark:bg-white/[0.02] border-t border-[#E2DDD4] dark:border-[#383838]"
                      >
                        <div className="p-3 sm:p-4 space-y-2">
                          {/* Transactions list */}
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

                          {/* Fixed expenses list */}
                          {categoryFixedExpenses.length > 0 && (
                            <div className="space-y-1.5">
                              {categoryFixedExpenses.map((fe) => (
                                <div
                                  key={fe.id}
                                  onClick={() => onViewFixedExpense?.(fe)}
                                  className="flex items-center justify-between p-3 rounded-[12px] bg-white dark:bg-[#242424] hover:bg-[var(--surface-muted)] dark:hover:bg-[#333333] transition-colors cursor-pointer border border-[#E2DDD4]/60 dark:border-[#383838]"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[14px] font-medium text-[#211F1C] dark:text-white leading-snug truncate tracking-tight">
                                      {fe.name}
                                    </p>
                                    <p className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] truncate mt-0.5 tracking-tight">
                                      {isEn ? 'Fixed expense' : 'Fast utgift'}
                                    </p>
                                  </div>
                                  <p className="text-[14px] font-medium whitespace-nowrap tracking-tight text-[#211F1C] dark:text-white pl-2">
                                    <span className="opacity-75 mr-0.5">−</span>
                                    <span className="font-amount tabular-nums font-medium tracking-tight">{formatAmount(Math.round(fe.amount), config.language)}</span>
                                    <span className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] ml-[2.5px]">{config.currency}</span>
                                  </p>
                                </div>
                              ))}
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
