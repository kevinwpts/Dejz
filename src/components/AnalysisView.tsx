import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
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
  if (!stats) return null;

  const _paydaySetting = config.payday || 25;
  const _adjustment = config.paydayBeforeWeekend ? WeekendAdjustment.BEFORE : WeekendAdjustment.NONE;
  
  const _currentPeriod = useMemo(() => {
    return { start: stats.periodStart, end: stats.periodEnd };
  }, [stats.periodStart, stats.periodEnd]);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'variable' | 'fixed'>('all');

  const filteredExpenses = useMemo(() => {
    return transactions
      .filter(e => {
        const inPeriod = e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime() + 86399999;
        if (!inPeriod) return false;
        return e.type === 'expense' || e.type === 'savings';
      });
  }, [transactions, stats.periodStart, stats.periodEnd]);

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
        // Robust matching: trim and lowercase both sides
        const searchName = name.trim().toLowerCase();
        const cat = [...(config.categories || []), ...(config.incomeCategories || [])].find(
          c => c.name.trim().toLowerCase() === searchName
        );
        
        // Use the icon from settings if found, otherwise fall back to default emoji
        const icon = cat?.icon || getCategoryIconName(name);
        return { name, value, color: cat?.color, icon, budget: cat?.budget };
      })
      .sort((a, b) => b.value - a.value);
      
    return { 
      categoryData: data, 
      totalFixed: fixedSum, 
      totalSpentInPeriod: spentSum,
    };
  }, [filteredExpenses, fixedExpenses, t, analysisFilter, config.categories, config.incomeCategories]);

  const totalSpent = (analysisFilter === 'fixed' ? 0 : totalSpentInPeriod) + 
    (analysisFilter !== 'variable' ? totalFixed : 0);
  const COLORS = ['#2A2A2A', '#3A3A3A', '#4A4A4A', '#5A5A5A', '#6A6A6A', '#333333', '#222222', '#555555', '#444444'];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Period Selector on Page */}
      {periods && onPeriodChange && currentPeriodDate && (
        <UniversalPeriodSelector
          periods={periods}
          currentDate={currentPeriodDate}
          onChange={onPeriodChange}
          periodName={stats.periodName}
          isCurrentPeriod={stats.isCurrentPeriod}
          variant="standalone"
          allowFuture={false}
        />
      )}

      <BudgetSummaryModule
        stats={stats}
        config={config}
        transactions={transactions}
        fixedExpenses={fixedExpenses}
        t={t}
      />

      {/* Analysis Filter - Segmented Control */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-full shadow-xs">
        <button
          onClick={() => {
            setAnalysisFilter('all');
            setExpandedCategory(null);
          }}
          className={`h-9 px-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer text-center truncate flex items-center justify-center ${
            analysisFilter === 'all'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('all' as TranslationKey)}
        </button>
        <button
          onClick={() => {
            setAnalysisFilter('variable');
            setExpandedCategory(null);
          }}
          className={`h-9 px-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer text-center truncate flex items-center justify-center ${
            analysisFilter === 'variable'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('variableExpenses' as TranslationKey)}
        </button>
        <button
          onClick={() => {
            setAnalysisFilter('fixed');
            setExpandedCategory(null);
          }}
          className={`h-9 px-1.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer text-center truncate flex items-center justify-center ${
            analysisFilter === 'fixed'
              ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
          }`}
        >
          {t('fixedExpenses' as TranslationKey)}
        </button>
      </div>

      <div className="p-6 sm:p-7 rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-color)] shadow-sm flex flex-col items-center relative overflow-hidden">
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight self-start mb-4 relative z-10">{t('distribution')}</h3>
        <div className="w-full h-72 relative z-10">
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
            <AnimatePresence mode="wait">
              {expandedCategory ? (
                <motion.div 
                  key={expandedCategory}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center text-center px-12"
                >
                  <span className="text-xs font-semibold text-[var(--accent-color)] mb-1">
                    {expandedCategory}
                  </span>
                  <span className="text-2xl font-bold text-[var(--text-primary)] font-amount tabular-nums leading-none">
                    <span className="font-amount tabular-nums">{Math.round(categoryData.find(c => c.name === expandedCategory)?.value || 0).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] opacity-70 mt-1">
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
                  <span className="text-xs font-semibold text-[var(--text-secondary)] mb-1 opacity-80">
                    {t('total')}
                  </span>
                  <span className="text-2xl font-bold text-[var(--text-primary)] font-amount tabular-nums leading-none">
                    <span className="font-amount tabular-nums">{Math.round(totalSpent).toLocaleString(config.language === 'en' ? 'en-US' : 'sv-SE')}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] opacity-70 mt-1">
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
                innerRadius={75}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
                onClick={(data) => {
                  const categoryName = data?.name || data?.payload?.name;
                  if (categoryName) {
                    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
                  }
                }}
                animationBegin={0}
                animationDuration={800}
              >
                {categoryData.map((entry: any, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color || COLORS[index % COLORS.length]} 
                    opacity={expandedCategory ? (expandedCategory === entry.name ? 1 : 0.3) : 1}
                    style={{ 
                      transition: 'all 0.3s ease'
                    }}
                    strokeWidth={expandedCategory === entry.name ? 2 : 0}
                    stroke={expandedCategory === entry.name ? 'var(--surface-color)' : 'none'}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={() => null}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight px-2">{t('categories')}</h3>
        <div className="space-y-2.5">
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
              <motion.div 
                id={`category-${item.name}`} 
                key={item.name} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={isExpanded ? "rounded-[16px] border border-[var(--border-color)] shadow-xs overflow-hidden bg-[var(--surface-color)] transition-all duration-200" : ""}
              >
                <motion.div 
                  whileHover={isExpanded ? undefined : { scale: 1.002 }}
                  whileTap={isExpanded ? undefined : { scale: 0.99 }}
                  className={`px-[16px] py-[12px] min-h-[72px] flex flex-col gap-2.5 group transition-all duration-200 cursor-pointer ${
                    isExpanded 
                      ? 'bg-[var(--surface-color)] border-b border-[var(--border-color)]/30' 
                      : 'bg-[var(--transaction-bg)] border border-[var(--border-color)] rounded-[16px] shadow-xs hover:bg-[var(--surface-muted)]'
                  }`}
                  onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                >
                  <div className="flex items-center justify-between gap-[12px] w-full">
                    <div className="flex items-center gap-[12px] min-w-0 flex-1">
                      <div 
                        className="w-[42px] h-[42px] rounded-full flex items-center justify-center shadow-xs shrink-0"
                        style={{ 
                          backgroundColor: item.color || (isEmojiString(iconName) ? getEmojiSolidColor(iconName) : COLORS[index % COLORS.length]),
                          color: '#fff'
                        }}
                      >
                        {isEmojiString(iconName) ? (
                          <span className="text-[19px] leading-none">{iconName}</span>
                        ) : Icon ? (
                          <Icon size={20} strokeWidth={1.75} />
                        ) : (
                          <div className="w-2 h-2 rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-center">
                        <p className={`text-[13.5px] font-medium leading-none whitespace-nowrap overflow-hidden text-ellipsis tracking-tight transition-colors ${
                          isExpanded ? 'text-[var(--accent-color)] font-semibold' : 'text-[var(--text-primary)] group-hover:text-[var(--accent-color)]'
                        }`}>
                          {item.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap pl-2">
                      <div className="text-right flex flex-col items-end justify-center">
                        <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight whitespace-nowrap tracking-tight">
                          <span className="font-amount tabular-nums font-semibold">{formatAmount(Math.round(item.value), config.language)}</span>
                          <span className="text-[10px] font-normal opacity-50 ml-1">{config.currency}</span>
                        </p>
                        <p className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5 tabular-nums">
                          {totalItemCount} {config.language === 'en' ? (totalItemCount === 1 ? 'item' : 'items') : 'st'}
                        </p>
                      </div>
                      <div className={`transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180 text-[var(--accent-color)]' : 'text-[var(--text-tertiary)]'}`}>
                        <ChevronDown size={18} strokeWidth={2.2} />
                      </div>
                    </div>
                  </div>

                  {/* Elegant Category Budget Progress Bar */}
                  {(() => {
                    if (!item.budget || item.budget <= 0) return null;
                    const totalIncome = stats?.totalIncome || 0;
                    const budgetInKronor = Math.round((item.budget / 100) * totalIncome);
                    if (budgetInKronor <= 0) return null;
                    
                    return (
                      <div className="w-full pt-1 px-1 border-t border-[var(--border-color)]/20 mt-1">
                        <div className="flex justify-between items-center text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                          <span className="opacity-85">Spenderat: {formatAmount(Math.round(item.value), config.language)} {config.currency}</span>
                          <span className="text-[var(--text-tertiary)] font-normal">Kategoribudget: {formatAmount(budgetInKronor, config.language)} {config.currency} ({item.budget}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--border-color)]/50 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.min((item.value / budgetInKronor) * 100, 100)}%`,
                              backgroundColor: item.value <= budgetInKronor ? (item.color || 'var(--accent-color)') : '#f59e0b'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </motion.div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {(categoryTransactions.length > 0 || categoryFixedExpenses.length > 0) ? (
                        <div className="bg-[var(--surface-color)] divide-y divide-[var(--border-color)]/30 overflow-hidden">
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
              </motion.div>
            );
          })}
          {(categoryData?.length || 0) === 0 && (
            <EmptyState title={t('noDataAvailable')} />
          )}
        </div>
      </div>
    </div>
  );
}
