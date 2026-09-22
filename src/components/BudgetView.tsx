import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { RefreshCw } from 'lucide-react';
import { Frequency, Config, Income, FixedExpense } from '../types';
import { TranslationKey, Language } from '../i18n';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { formatAmount } from '../utils/format';
import { AnimatedNumber } from './AnimatedNumber';

interface BudgetViewProps {
  stats: any;
  config: Config;
  setConfig: (c: Config) => void;
  incomes: Income[];
  setIncomes: React.Dispatch<React.SetStateAction<Income[]>>;
  fixedExpenses: FixedExpense[];
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpense[]>>;
  onAddIncome: () => void;
  onEditIncome: (i: Income) => void;
  onAddFixedExpense: () => void;
  onEditFixedExpense: (e: FixedExpense) => void;
  onViewFixedExpense: (e: FixedExpense) => void;
  onViewIncome: (i: Income) => void;
  onAddMonthlySaving: () => void;
  onEditMonthlySaving: (s: any) => void;
  onViewMonthlySaving: (s: any) => void;
  onResetSavingsPot: () => void;
  t: (key: TranslationKey) => string;
  currentPeriodId: string;
}

export function BudgetView({ 
  stats,
  config, _setConfig, 
  incomes, _setIncomes, 
  fixedExpenses, _setFixedExpenses, 
  onAddIncome, _onEditIncome,
  onAddFixedExpense, _onEditFixedExpense,
  onViewFixedExpense, onViewIncome,
  onAddMonthlySaving, _onEditMonthlySaving, onViewMonthlySaving,
  _onResetSavingsPot,
  t,
  currentPeriodId
}: BudgetViewProps) {
  if (!stats) return null;

  const totalSavings = (config.monthlySavingsItems?.reduce((sum, item) => {
    const amount = (item.isVariable && item.periodOverrides && item.periodOverrides[currentPeriodId] !== undefined)
      ? item.periodOverrides[currentPeriodId]
      : (Number(item.amount) || 0);
    return sum + amount;
  }, 0) || 0) + (Number(config.monthlySavings) || 0);
  const _totalOut = stats.totalFixed + totalSavings;
  const _retentionRate = stats.totalIncome > 0 ? (stats.remainingPeriodCents / stats.totalIncome) * 100 : 0;
  const _expensesPercent = stats.totalIncome > 0 ? (stats.totalFixed / stats.totalIncome) * 100 : 0;
  const _savingsPercent = stats.totalIncome > 0 ? (totalSavings / stats.totalIncome) * 100 : 0;

  // sortItems removed

  const sortedIncomes = incomes || [];
  const sortedFixedExpenses = fixedExpenses || [];
  const sortedSavings = config?.monthlySavingsItems || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 sm:space-y-10"
    >
      {/* Overview Section - Clean & Simple */}
      <div className="space-y-3.5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="p-6 sm:p-7 rounded-[28px] border border-[var(--border-color)] dark:border-white/10 bg-[var(--surface-color)] shadow-sm flex flex-col items-center text-center"
        >
          <span className="text-xs font-semibold text-[var(--text-secondary)] opacity-85 mb-2.5 block">
            {t('monthlyDisposable')}
          </span>
          <div className="flex items-baseline justify-center gap-1.5">
            <AnimatedNumber 
                value={stats.disposablePot || 0} 
                className="text-3xl sm:text-4xl md:text-5xl leading-none font-bold text-[var(--text-primary)] font-amount tabular-nums tracking-tight"
                formatter={(val) => formatAmount(val, config.language)}
            />
            <span className="text-base sm:text-lg font-light opacity-60 text-[var(--text-secondary)]">
              {config.currency}
            </span>
          </div>

        </motion.div>

        {/* Core Stats Modules - Standardized & Compact */}
        <div className="grid grid-cols-3 gap-2.5">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-xs border border-[var(--border-color)] dark:border-white/10 bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] tracking-tight opacity-75 text-center truncate w-full">{t('incomes') || 'Inkomster'}</span>
            <span className="text-[15px] sm:text-[17px] font-semibold font-amount tabular-nums text-success text-center truncate w-full">+{formatAmount(stats.totalIncome)}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-xs border border-[var(--border-color)] dark:border-white/10 bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] tracking-tight opacity-75 text-center truncate w-full">{t('fixedExpenses') || 'Fasta utgifter'}</span>
            <span className="text-[15px] sm:text-[17px] font-semibold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">-{formatAmount(stats.totalFixed)}</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="py-2.5 px-2 sm:py-3 sm:px-3 min-h-[68px] sm:min-h-[74px] rounded-[16px] flex flex-col items-center justify-center space-y-1 shadow-xs border border-[var(--border-color)] dark:border-white/10 bg-[var(--surface-color)] overflow-hidden"
          >
            <span className="text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] tracking-tight opacity-75 text-center truncate w-full">{t('monthlySavings') || 'Månadssparande'}</span>
            <span className="text-[15px] sm:text-[17px] font-semibold font-amount tabular-nums text-[var(--text-primary)] text-center truncate w-full">-{formatAmount(totalSavings)}</span>
          </motion.div>
        </div>
      </div>

      {/* Incomes Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center">
            <div className="flex flex-col">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight leading-none">{t('incomes')}</h3>
            </div>
          </div>
          <button onClick={onAddIncome} className="h-7 px-2.5 rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center justify-center">
            + {t('newIncome')}
          </button>
        </div>
        <div className="space-y-3.5">
          {sortedIncomes.length > 0 ? (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {sortedIncomes.map((income, index) => (
                  <motion.div
                    key={`${income.id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <BudgetItem 
                      item={income} 
                      onClick={() => onViewIncome(income)} 
                      currency={config.currency} 
                      type="income"
                      language={config.language as Language}
                      t={t}
                      config={config}
                      currentPeriodId={currentPeriodId}
                      isGrouped={false}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState title={t('noDataAvailable')} />
          )}
        </div>
      </div>

      {/* Fixed Expenses Section */}
      <div className="space-y-3.5 pt-2 sm:pt-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center">
            <div className="flex flex-col">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight leading-none">{t('fixedExpenses')}</h3>
            </div>
          </div>
          <button onClick={onAddFixedExpense} className="h-7 px-2.5 rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center justify-center">
            + {t('newFixedExpense')}
          </button>
        </div>

        {sortedFixedExpenses.length > 0 ? (
          Object.entries(
            sortedFixedExpenses.reduce((acc, exp) => {
              const freq = exp.frequency || Frequency.MONTHLY;
              if (!acc[freq]) acc[freq] = [];
              acc[freq].push(exp);
              return acc;
            }, {} as Record<string, FixedExpense[]>)
          ).map(([freq, items]) => (
            <div key={freq} className="space-y-2.5">
              <div className="flex items-center gap-3 px-2">
                <span className="text-xs font-semibold text-[var(--accent-color)] opacity-90">
                  {Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq) 
                    ? t(`freq_${Object.keys(Frequency).find(k => Frequency[k as keyof typeof Frequency] === freq)!.toLowerCase()}` as TranslationKey)
                    : freq}
                </span>
                <div className="h-[0.5px] flex-1 bg-[var(--border-color)]" />
              </div>
              <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {items.map((expense, index) => (
                    <motion.div
                      key={`${expense.id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <BudgetItem 
                        item={expense} 
                        onClick={() => onViewFixedExpense(expense)} 
                        currency={config.currency} 
                        type="expense"
                        language={config.language as Language}
                        t={t}
                        config={config}
                        currentPeriodId={currentPeriodId}
                        isGrouped={false}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title={t('noDataAvailable')} />
        )}
      </div>

      {/* Monthly Savings Section */}
      <div className="space-y-3.5 pt-2 sm:pt-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center">
            <div className="flex flex-col">
              <h3 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight leading-none">{t('monthlySavings')}</h3>
            </div>
          </div>
          <button onClick={onAddMonthlySaving} className="h-7 px-2.5 rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-color)] border border-[var(--border-color)] transition-all cursor-pointer inline-flex items-center justify-center">
            + {t('newMonthlySaving')}
          </button>
        </div>
        <div className="space-y-3.5">
          {sortedSavings.length > 0 ? (
            <div className="space-y-2.5">
              <AnimatePresence mode="popLayout">
                {sortedSavings.map((saving, index) => (
                  <motion.div
                    key={`${saving.id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <BudgetItem 
                      item={saving} 
                      onClick={() => onViewMonthlySaving(saving)} 
                      currency={config.currency} 
                      type="expense"
                      language={config.language as Language}
                      t={t}
                      config={config}
                      currentPeriodId={currentPeriodId}
                      isGrouped={false}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : config.monthlySavings > 0 ? (
            <button 
              type="button"
              onClick={onAddMonthlySaving}
              className="w-full bg-[var(--surface-color)] p-4 sm:p-5 rounded-[16px] border border-[var(--border-color)] dark:border-white/10 hover:bg-[var(--surface-muted)] transition-all flex items-center justify-between text-left group shadow-xs cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform shrink-0">
                  <RefreshCw size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] sm:text-[15px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
                    Migrera månadssparande
                  </p>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                    Lägg till sparande på <span className="font-amount tabular-nums font-bold text-[var(--text-primary)]">{formatAmount(config.monthlySavings)}</span> <span className="font-sans text-[11px] font-bold text-[var(--text-secondary)]">{config.currency}</span>
                  </p>
                </div>
              </div>
              <div className="h-7 px-2.5 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] text-[11px] font-semibold shrink-0 ml-3 flex items-center justify-center group-hover:opacity-90 transition-opacity">
                Lägg till
              </div>
            </button>
          ) : (
            <EmptyState title={t('noDataAvailable')} />
          )}
        </div>
      </div>
      
    </motion.div>
  );
}
