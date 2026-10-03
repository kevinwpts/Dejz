import React from 'react';
import { TranslationKey } from '../i18n';
import { Transaction, Config, Income } from '../types';
import { formatAmount } from '../utils/format';
import { TransactionItem } from './TransactionItem';

interface CompactOverviewProps {
  t: (key: TranslationKey) => string;
  transactions: Transaction[];
  config: Config;
  incomes: Income[];
}

export function CompactOverview({ t, transactions, config, incomes }: CompactOverviewProps) {
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const budgetUsage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

  const categoryTotals = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const recentTransactions = [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);

  return (
    <div className="space-y-8 px-4">
      {/* Budget Status */}
      <div className="p-5 rounded-[18px] bg-white dark:bg-[#1C1C1C] border-none shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8]">
            {t('budgetUsage')}
          </h3>
          <span className="text-xs font-medium text-[#05B862] bg-[#05B862]/10 px-2 py-0.5 rounded-full">
            {budgetUsage.toFixed(0)}%
          </span>
        </div>
        
        <div className="relative h-2 w-full bg-black/5 dark:bg-[#222222] rounded-full overflow-hidden mb-3.5">
          <div 
            className="absolute top-0 left-0 h-full bg-[#05B862] transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${Math.min(budgetUsage, 100)}%` }}
          />
        </div>
        
        <p className="text-[13px] text-[#6E6961] dark:text-[#A8A8A8] font-normal">
          <span className="text-[#1C1917] dark:text-white font-medium font-amount tabular-nums">
            {formatAmount(totalExpenses, config.language)}
          </span>
          {' '}{t('ofBudgetUsed')}
        </p>
      </div>

      {/* Category Totals */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8] ml-1">
          {t('categories')}
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(categoryTotals).slice(0, 4).map(([cat, amount]) => (
            <div key={cat} className="flex items-center justify-between p-3.5 sm:p-4 rounded-[20px] bg-white dark:bg-[#1C1C1C] hover:bg-black/[0.02] dark:hover:bg-[#222222] active:scale-[0.99] transition-all group border-none shadow-none">
              <span className="text-sm font-medium text-[#1C1917] dark:text-white leading-tight truncate tracking-tight">
                {cat}
              </span>
              <span className="text-sm font-medium text-[#1C1917] dark:text-white font-amount tabular-nums">
                {formatAmount(amount, config.language)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-[var(--text-secondary)] opacity-70 ml-1">
          {t('recentTransactions')}
        </h3>
        <div className="space-y-1">
          {recentTransactions.map(t => (
            <TransactionItem 
              key={t.id}
              transaction={t}
              config={config}
              squared={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
