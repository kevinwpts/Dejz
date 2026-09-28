import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, LayoutGrid, TrendingUp, Calendar } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Transaction, FixedExpense, Config, WeekendAdjustment, Frequency } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { BudgetSummaryModule } from './BudgetSummaryModule';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';
import { formatAmount } from '../utils/format';
import { ICON_MAP, getCategoryIconName, isEmojiString } from '../utils/icons';
import { getEmojiSolidColor } from '../utils/ui';

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
  const _paydaySetting = config.payday || 25;
  const _adjustment = config.paydayBeforeWeekend ? WeekendAdjustment.BEFORE : WeekendAdjustment.NONE;
  
  const _currentPeriod = useMemo(() => {
    if (!stats) return { start: new Date(), end: new Date() };
    return { start: stats.periodStart, end: stats.periodEnd };
  }, [stats?.periodStart, stats?.periodEnd]);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'variable' | 'fixed'>('all');

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

    const data = Object.entries(breakdown)
      .map(([name, value]) => {
        const searchName = name.trim().toLowerCase();
        const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
          c => c.name.trim().toLowerCase() === searchName
        );
        
        const icon = cat?.icon || getCategoryIconName(name);
        const budgetValue = cat?.budget !== undefined && cat?.budget !== null 
          ? Number(String(cat.budget).replace(/[^0-9.]/g, "")) 
          : 0;
        const budgetInKronor = !isNaN(budgetValue) && budgetValue > 0 ? Math.round(budgetValue) : 0;

        return { name, value, color: cat?.color, icon, budget: cat?.budget, budgetInKronor };
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
  const COLORS = ['#05b862', '#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#64748b', '#8b5cf6'];

  const daysElapsed = useMemo(() => {
    if (!stats) return 0;
    const now = new Date();
    const realToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startMidnight = new Date(stats.periodStart.getFullYear(), stats.periodStart.getMonth(), stats.periodStart.getDate()).getTime();
    const endMidnight = new Date(stats.periodEnd.getFullYear(), stats.periodEnd.getMonth(), stats.periodEnd.getDate()).getTime();
    const oneDay = 24 * 60 * 60 * 1000;
    
    if (realToday.getTime() > endMidnight) return Math.round((endMidnight - startMidnight) / oneDay) + 1;
    if (realToday.getTime() < startMidnight) return 0;
    return Math.round((realToday.getTime() - startMidnight) / oneDay);
  }, [stats?.periodStart, stats?.periodEnd]);

  const dailyAvg = daysElapsed > 0 ? Math.round(totalSpent / daysElapsed) : 0;

  const largestCategory = useMemo(() => {
    if (categoryData.length === 0) return { name: "", amount: 0 };
    const first = categoryData[0];
    return { name: first.name, amount: first.value };
  }, [categoryData]);

  const budgetUsedPct = stats.totalIncome > 0 ? Math.round((totalSpent / stats.totalIncome) * 100) : 0;

  if (!stats) return null;

  return (
    <div className="space-y-6 sm:space-y-7 font-sans">
      {/* Analysis Filter - Clean horizontal row directly on background */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {periods && onPeriodChange && currentPeriodDate && (
          <>
            <UniversalPeriodSelector
              periods={periods}
              currentDate={currentPeriodDate}
              onChange={onPeriodChange}
              periodName={stats.periodName}
              isCurrentPeriod={stats.isCurrentPeriod}
              variant="header"
              allowFuture={false}
            />
            <div className="w-px h-4 bg-white/[0.08] mx-0.5 shrink-0" />
          </>
        )}

        <button
          onClick={() => {
            setAnalysisFilter('all');
            setExpandedCategory(null);
          }}
          className={`flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            analysisFilter === 'all'
              ? 'bg-[#1C1917] dark:bg-white dark:text-[#1C1917] text-white font-semibold border-transparent shadow-xs'
              : 'text-[#6E6961] hover:text-[#1C1917] hover:bg-black/5 dark:text-[#9CA6BC] dark:hover:text-white dark:hover:bg-white/[0.06]'
          }`}
        >
          <LayoutGrid size={13} strokeWidth={1.75} className={analysisFilter === 'all' ? 'text-white dark:text-[#1C1917]' : 'text-[#6E6961] dark:text-[#9CA6BC]'} />
          <span>{t('all' as TranslationKey)}</span>
        </button>
        <button
          onClick={() => {
            setAnalysisFilter('variable');
            setExpandedCategory(null);
          }}
          className={`flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            analysisFilter === 'variable'
              ? 'bg-[#1C1917] dark:bg-white dark:text-[#1C1917] text-white font-semibold border-transparent shadow-xs'
              : 'text-[#6E6961] hover:text-[#1C1917] hover:bg-black/5 dark:text-[#9CA6BC] dark:hover:text-white dark:hover:bg-white/[0.06]'
          }`}
        >
          <TrendingUp size={13} strokeWidth={1.75} className={analysisFilter === 'variable' ? 'text-white dark:text-[#1C1917]' : 'text-[#6E6961] dark:text-[#9CA6BC]'} />
          <span>{t('variableExpenses' as TranslationKey)}</span>
        </button>
        <button
          onClick={() => {
            setAnalysisFilter('fixed');
            setExpandedCategory(null);
          }}
          className={`flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
            analysisFilter === 'fixed'
              ? 'bg-[#1C1917] dark:bg-white dark:text-[#1C1917] text-white font-semibold border-transparent shadow-xs'
              : 'text-[#6E6961] hover:text-[#1C1917] hover:bg-black/5 dark:text-[#9CA6BC] dark:hover:text-white dark:hover:bg-white/[0.06]'
          }`}
        >
          <Calendar size={13} strokeWidth={1.75} className={analysisFilter === 'fixed' ? 'text-white dark:text-[#1C1917]' : 'text-[#6E6961] dark:text-[#9CA6BC]'} />
          <span>{t('fixedExpenses' as TranslationKey)}</span>
        </button>
      </div>

      {/* Budget Summary Metrics */}
      <BudgetSummaryModule
        stats={stats}
        config={config}
        transactions={transactions}
        fixedExpenses={fixedExpenses}
        t={t}
        totalSpentOverride={totalSpent}
        dailyAvgOverride={dailyAvg}
        largestCategoryOverride={largestCategory}
        budgetUsedPctOverride={budgetUsedPct}
      />

      {/* Donut Chart Distribution Card */}
      <div className="p-5 sm:p-6 rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.02] bg-[#FFFFFF] dark:bg-white/[0.025] backdrop-blur-[18px] shadow-none flex flex-col items-center relative overflow-hidden">
        <div className="flex items-center justify-between w-full mb-3 px-1">
          <span className="text-sm font-semibold text-[#1C1917] dark:text-white tracking-tight">{t('distribution')}</span>
          <span className="text-[11px] font-normal text-[#6E6961] dark:text-[#9CA6BC] tabular-nums">
            {categoryData.filter(c => c.value > 0).length} {config.language === 'en' ? 'categories' : 'kategorier'}
          </span>
        </div>

        <div className="w-full h-64 sm:h-72 relative z-10">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <AnimatePresence mode="wait">
              {expandedCategory ? (
                <motion.div 
                  key={expandedCategory}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="flex flex-col items-center text-center px-8"
                >
                  <span className="text-xs font-medium text-neutral-900 dark:text-white dark:text-[#1C1917] dark:text-white mb-1 truncate max-w-[140px]">
                    {expandedCategory}
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-white font-amount tabular-nums leading-none">
                    {Math.round(categoryData.find(c => c.name === expandedCategory)?.value || 0).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
                  </span>
                  <span className="text-[11px] font-normal text-[#6E6961] dark:text-[#9CA6BC] mt-1">
                    {config.currency}
                  </span>
                </motion.div>
              ) : (
                <motion.div 
                  key="total"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center text-center"
                >
                  <span className="text-xs font-medium text-[#6E6961] dark:text-[#9CA6BC] mb-1">
                    {t('total')}
                  </span>
                  <span className="text-2xl sm:text-3xl font-semibold text-[#1C1917] dark:text-white font-amount tabular-nums leading-none">
                    {Math.round(totalSpent).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}
                  </span>
                  <span className="text-[11px] font-normal text-[#6E6961] dark:text-[#9CA6BC] mt-1">
                    {config.currency}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                innerRadius={72}
                outerRadius={92}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                onClick={(data) => {
                  const categoryName = data?.name || data?.payload?.name;
                  if (categoryName) {
                    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
                  }
                }}
                animationBegin={0}
                animationDuration={600}
              >
                {categoryData.map((entry: any, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || COLORS[index % COLORS.length]} 
                    opacity={expandedCategory ? (expandedCategory === entry.name ? 1 : 0.25) : 0.9}
                    style={{ 
                       transition: 'all 0.25s ease'
                    }}
                    strokeWidth={expandedCategory === entry.name ? 2 : 0}
                    stroke={expandedCategory === entry.name ? '#232323' : 'none'}
                  />
                ))}
              </Pie>
              <Tooltip content={() => null} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Categories Breakdown - Single Unified Cohesive List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6E6961] dark:text-[#9CA6BC]">
            {t('categories')} ({categoryData.length})
          </span>
        </div>

        {categoryData.length > 0 ? (
          <div className="bg-[#FFFFFF] dark:bg-white/[0.035] rounded-[18px] border border-[#E6E2D8] dark:border-white/[0.025] divide-y divide-[#EDE9DF] dark:divide-white/[0.035] overflow-hidden">
            {categoryData.map((item: any, index) => {
              const isExpanded = expandedCategory === item.name;
              const iconName = item.icon || getCategoryIconName(item.name);
              const Icon = ICON_MAP[iconName];
              
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
                    className="p-3.5 sm:p-4 min-h-[68px] flex flex-col justify-center group hover:bg-black/5 dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                    onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                  >
                    <div className="flex items-center justify-between gap-3 w-full">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Category Icon */}
                        <div 
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0"
                          style={{ 
                            backgroundColor: item.color || (isEmojiString(iconName) ? getEmojiSolidColor(iconName) : COLORS[index % COLORS.length]),
                            color: '#fff'
                          }}
                        >
                          {isEmojiString(iconName) ? (
                            <span className="text-[17px] leading-none">{iconName}</span>
                          ) : Icon ? (
                            <Icon size={16} strokeWidth={1.75} />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-[14px] sm:text-[14.5px] font-medium text-[#1C1917] dark:text-white leading-tight truncate tracking-tight">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 min-w-0 overflow-hidden text-[#6E6961] dark:text-[#9CA6BC]">
                            <span className="text-xs font-normal">
                              {totalItemCount} {config.language === 'en' ? (totalItemCount === 1 ? 'item' : 'items') : 'st'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap pl-2">
                        <div className="text-right flex flex-col items-end justify-center">
                          <p className="text-[14px] sm:text-[14.5px] font-semibold font-amount tabular-nums text-[#1C1917] dark:text-white leading-tight">
                            {formatAmount(Math.round(item.value), config.language)}
                            <span className="text-[11px] font-normal text-[#6E6961] dark:text-[#9CA6BC] ml-1">{config.currency}</span>
                          </p>
                        </div>
                        <div className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-neutral-900 dark:text-white dark:text-[#1C1917] dark:text-white' : 'text-[#6E6961] dark:text-[#9CA6BC]'}`}>
                          <ChevronDown size={16} strokeWidth={2} />
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
                        className="overflow-hidden bg-black/[0.02] dark:bg-white/[0.015] border-t border-[#EDE9DF] dark:border-white/[0.03]"
                      >
                        {(categoryTransactions.length > 0 || categoryFixedExpenses.length > 0) ? (
                          <div className="divide-y divide-[#EDE9DF] dark:divide-white/[0.035] overflow-hidden">
                            {categoryTransactions.map(t => {
                              let displayAmount = t.amount;
                              const transactionSplits = (t as any).splits;
                              if (transactionSplits && transactionSplits.length > 0) {
                                const relevantSplits = transactionSplits.filter((s: any) => 
                                  (s.category || '').trim() === item.name.trim()
                                );
                                if (relevantSplits.length > 0) {
                                  displayAmount = relevantSplits.reduce((sum: number, s: any) => sum + s.amount, 0);
                                } else {
                                  displayAmount = 0;
                                }
                              }
                              
                              return (
                                <TransactionItem
                                  key={t.id}
                                  transaction={t}
                                  config={config}
                                  displayAmount={displayAmount}
                                  onView={onViewTransaction}
                                  onDelete={onDeleteTransaction}
                                  showAllCategories={false}
                                  showDate={true}
                                  variant="transparent"
                                />
                              );
                            })}

                            {categoryFixedExpenses.map(e => {
                              let amount = Number(e.amount) || 0;
                              switch (e.frequency) {
                                case Frequency.QUARTERLY: amount = amount / 3; break;
                                case Frequency.SEMI_ANNUALLY: amount = amount / 6; break;
                                case Frequency.ANNUALLY: amount = amount / 12; break;
                                default: break;
                              }
                              
                              const mockTransaction: Transaction = {
                                id: e.id,
                                amount: amount,
                                category: e.category || t('fixedExpenses'),
                                type: 'expense',
                                timestamp: stats?.periodStart ? new Date(stats.periodStart).getTime() : Date.now(),
                                note: e.name,
                                merchant: e.name,
                                logo: e.logo,
                                icon: e.icon,
                                tags: [],
                              };
                              
                              return (
                                <TransactionItem
                                  key={`fixed-${e.id}`}
                                  transaction={mockTransaction}
                                  config={config}
                                  isFixed={true}
                                  onClick={() => {
                                    onViewFixedExpense?.(e);
                                  }}
                                  variant="transparent"
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <EmptyState title={t('noDataAvailable')} className="py-6" />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title={t('noDataAvailable')} />
        )}
      </div>
    </div>
  );
}
