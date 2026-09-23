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
      <div className="p-5 rounded-[16px] bg-[var(--surface-color)] border border-[var(--border-color)] shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] opacity-70">
            {t('budgetUsage')}
          </h3>
          <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {budgetUsage.toFixed(0)}%
          </span>
        </div>
        
        <div className="relative h-2.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden mb-3.5">
          <div 
            className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${Math.min(budgetUsage, 100)}%` }}
          />
        </div>
        
        <p className="text-[13px] text-[var(--text-secondary)] font-normal">
          <span className="text-[var(--text-primary)] font-medium font-amount">
            {formatAmount(totalExpenses, config.language)}
          </span>
          {' '}{t('ofBudgetUsed')}
        </p>
      </div>

      {/* Category Totals */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-[var(--text-secondary)] opacity-70 ml-1">
          {t('categories')}
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(categoryTotals).slice(0, 4).map(([cat, amount]) => (
            <div key={cat} className="flex items-center justify-between p-3.5 rounded-[16px] bg-[var(--surface-color)] border border-[var(--border-color)] hover:bg-[var(--surface-muted)] hover:scale-[1.005] active:scale-[0.99] transition-all group shadow-2xs">
              <span className="text-[12px] font-medium text-[var(--text-primary)] leading-tight truncate tracking-tight">
                {cat}
              </span>
              <span className="text-[13.5px] font-bold text-[var(--text-primary)] font-amount tabular-nums">
                {formatAmount(amount, config.language)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] opacity-70 ml-1">
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
