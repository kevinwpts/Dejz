import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Transaction, Config, Income, FixedExpense } from '../types';
import { GreetingModule } from './GreetingModule';
import { CompactOverview } from './CompactOverview';

interface TestHomeViewProps {
  t: (key: TranslationKey) => string;
  transactions: Transaction[];
  stats: any;
  config: Config;
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  userName: string;
  setCurrentPeriodDate: (date: Date) => void;
  periods: any[];
}

export function TestHomeView({ 
  t, 
  transactions, 
  stats, 
  config, 
  incomes, 
  _fixedExpenses, 
  userName,
  setCurrentPeriodDate,
  periods
}: TestHomeViewProps) {
  const handlePrevPeriod = () => {
    if (periods && setCurrentPeriodDate) {
      const currentIndex = periods.findIndex(p => p.start.getTime() === stats.periodStart.getTime());
      if (currentIndex > 0) {
        setCurrentPeriodDate(periods[currentIndex - 1].date);
      }
    }
  };

  const handleNextPeriod = () => {
    if (periods && setCurrentPeriodDate) {
      const currentIndex = periods.findIndex(p => p.start.getTime() === stats.periodStart.getTime());
      if (currentIndex !== -1 && currentIndex < periods.length - 1) {
        setCurrentPeriodDate(periods[currentIndex + 1].date);
      }
    }
  };

  const isCurrentPeriod = !stats.isFuturePeriod && !stats.isPastPeriod;

  return (
    <div className="relative min-h-dvh pb-24 overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 px-4 py-4 mb-2">
        <div className="flex items-center justify-between max-w-lg mx-auto bg-[var(--surface-color)]/40 border border-[var(--border-color)]/20 rounded-2xl px-4 py-2">
          <button 
            onClick={handlePrevPeriod}
            className="p-2 text-[var(--text-secondary)] hover:text-accent transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          
          <button 
            onClick={() => {
              if (!isCurrentPeriod) {
                setCurrentPeriodDate(new Date());
              }
            }}
            className="flex flex-col items-center group/label"
          >
            <span className={`text-[10px] font-medium transition-colors ${isCurrentPeriod ? 'text-accent' : 'text-[var(--text-tertiary)] group-hover/label:text-accent'}`}>
              {isCurrentPeriod ? 'Aktuell Period' : 'Period'}
            </span>
            <span className="text-xs font-semibold text-[var(--text-primary)]">
              {stats.periodName}
            </span>
          </button>

          <button 
            onClick={handleNextPeriod}
            className="p-2 text-[var(--text-secondary)] hover:text-accent transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-10%] w-[40%] h-[40%] bg-success/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-6 pt-4">
        <GreetingModule 
        userName={userName}
        availableForD={stats?.availableForD || 0}
        currency={config.currency}
        isToday={true}
        date={new Date()}
        language={config.language}
        stats={stats}
        t={t}
        calendarDays={stats?.days || []}
        setSelectedDate={() => {}}
        setCurrentPeriodDate={setCurrentPeriodDate}
        periodStart={stats?.periodStart}
        periodEnd={stats?.periodEnd}
        isFuturePeriod={stats?.isFuturePeriod}
        isPastPeriod={stats?.isPastPeriod}
        periods={periods}
        variant="compact"
        showPeriodSelector={false}
        onNavigate={() => {}}
      />
      <CompactOverview 
        t={t}
        transactions={transactions}
        config={config}
        incomes={incomes}
      />
      </div>
    </div>
  );
}
