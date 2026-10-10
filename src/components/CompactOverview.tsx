import React from 'react';
import { TranslationKey } from '../i18n';
import { Transaction, Config, Income } from '../types';
import { formatAmount } from '../utils/format';
import { TransactionItem } from './TransactionItem';
import { Card } from './ui';

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
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-label font-semibold text-[var(--text-secondary)]">
            {t('budgetUsage')}
          </h3>
          <span className="text-label font-bold text-[var(--success-color)] bg-[var(--success-container)] px-2.5 py-0.5 rounded-full">
            {budgetUsage.toFixed(0)}%
          </span>
        </div>
        
        <div className="relative h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden mb-3.5">
          <div 
            className="absolute top-0 left-0 h-full bg-[var(--success-color)] transition-all duration-1000 ease-out rounded-full"
            style={{ width: `${Math.min(budgetUsage, 100)}%` }}
          />
        </div>
        
        <p className="text-secondary">
          <span className="text-[var(--text-primary)] font-medium font-amount tabular-nums">
            {formatAmount(totalExpenses, config.language)}
          </span>
          {' '}{t('ofBudgetUsed')}
        </p>
      </Card>

      {/* Category Totals */}
      <div className="space-y-3">
        <h3 className="text-card-title ml-1">
          {t('categories')}
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {Object.entries(categoryTotals).slice(0, 4).map(([cat, amount]) => (
            <Card key={cat} variant="default" padding="md" className="flex items-center justify-between">
              <span className="text-body-medium leading-tight truncate">
                {cat}
              </span>
              <span className="text-body-medium tabular-nums">
                {formatAmount(amount, config.language)}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h3 className="text-label opacity-70 ml-1">
          {t('recentTransactions')}
        </h3>
        <div className="space-y-3">
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
