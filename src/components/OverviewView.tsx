import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogView } from './LogView';
import { Transaction, Config, FixedExpense } from '../types';
import { TranslationKey, Language } from '../i18n';


interface OverviewViewProps {
  transactions: Transaction[];
  stats: any;
  config: Config;
  onAddTransaction: () => void;
  onAddIncome: () => void;
  onViewTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
  fixedExpenses: FixedExpense[];
  initialTab?: 'log' | 'analysis';
  periods?: any[];
  setCurrentPeriodDate?: (date: Date) => void;
  isCurrentPeriod?: boolean;
  isPro?: boolean;
  onUpgrade?: () => void;
  onViewFixedExpense?: (expense: FixedExpense) => void;
}

const AnalysisView = React.lazy(() => import('./AnalysisView').then(module => ({ default: module.AnalysisView })));

export function OverviewView({
  transactions,
  stats,
  config,
  onAddTransaction,
  onAddIncome,
  onViewTransaction,
  onDeleteTransaction,
  t,
  currentLang,
  fixedExpenses,
  initialTab = 'analysis',
  periods: _periods,
  setCurrentPeriodDate: _setCurrentPeriodDate,
  isCurrentPeriod: _isCurrentPeriod,
  isPro: _isPro,
  onUpgrade: _onUpgrade,
  onViewFixedExpense
}: OverviewViewProps) {
  const activeTab = initialTab;

  return (
    <div className="page-container">
      

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'log' ? (
            <LogView
              transactions={transactions}
              stats={stats}
              config={config}
              onAddTransaction={onAddTransaction}
              onAddIncome={onAddIncome}
              onViewTransaction={onViewTransaction}
              onDeleteTransaction={onDeleteTransaction}
              t={t}
              currentLang={currentLang}
            />
          ) : (
            <React.Suspense fallback={<div className="h-64 flex items-center justify-center text-[var(--text-secondary)] text-metadata uppercase tracking-tight">Laddar...</div>}>
              <AnalysisView
                transactions={transactions}
                stats={stats}
                config={config}
                t={t}
                fixedExpenses={fixedExpenses}
                currentLang={currentLang}
                onViewTransaction={onViewTransaction}
                onDeleteTransaction={onDeleteTransaction}
                onViewFixedExpense={onViewFixedExpense}
              />
            </React.Suspense>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
