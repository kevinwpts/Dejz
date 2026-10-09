import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  ChevronLeft,
  ChevronRight,
  Layers
} from 'lucide-react';
import { Transaction, Config, FixedExpense, Income, Frequency } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { FilterSelectButton, FilterButtonGroup } from './ui';
import { PeriodSelectorModal } from './PeriodSelectorModal';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatFullDate } from '../utils/date';
import { feedback } from '../utils/feedback';

interface LogViewProps {
  transactions: Transaction[];
  fixedExpenses?: FixedExpense[];
  incomes?: Income[];
  stats?: any;
  config: Config;
  periods?: any[];
  onAddTransaction: () => void;
  onAddIncome: () => void;
  onViewTransaction: (t: Transaction) => void;
  onViewFixedExpense?: (expense: FixedExpense) => void;
  onViewIncome?: (income: Income) => void;
  onViewMonthlySaving?: (saving: any) => void;
  onDeleteTransaction: (id: string) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
}

export function LogView({ 
  transactions, 
  fixedExpenses = [],
  incomes = [],
  stats,
  config, 
  onAddTransaction, 
  _onAddIncome, 
  onViewTransaction, 
  onViewFixedExpense,
  onViewIncome,
  onViewMonthlySaving,
  onDeleteTransaction, 
  t, 
  currentLang,
  periods
}: LogViewProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);
  const [modalPeriod, setModalPeriod] = useState<any | null>(null);

  useScrollLock(isPeriodPickerOpen);

  const getLocale = () => {
    const lang = currentLang || 'sv';
    const mapping: Record<string, string> = {
      sv: 'sv-SE',
      en: 'en-US',
      no: 'no-NO',
      da: 'da-DK',
      fi: 'fi-FI'
    };
    return mapping[lang] || 'sv-SE';
  };

  const getL10n = (sv: string, en: string, no?: string, da?: string, fi?: string) => {
    const lang = currentLang || 'sv';
    if (lang === 'sv') return sv;
    if (lang === 'no') return no || sv;
    if (lang === 'da') return da || sv;
    if (lang === 'fi') return fi || sv;
    return en;
  };

  // Chronological list of past and current periods (earliest to latest)
  const chronologicalPeriods = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    return periods.filter(p => !p.isFuture || p.isCurrent);
  }, [periods]);

  // Generate virtual transactions for fixed expenses, incomes, and savings goals if option enabled
  const fixedItemsAsTransactions = useMemo(() => {
    if (!config?.showFixedExpensesInHistory) return [];
    const items: (Transaction & { isFixed: boolean; originalItem: any })[] = [];
    const isEn = currentLang === 'en';

    // Helper to check if a recurring item is active in a given month (0-11)
    const isItemActiveInMonth = (item: { frequency?: Frequency; startMonth?: number }, monthIndex: number) => {
      if (!item.frequency || item.frequency === Frequency.MONTHLY) return true;
      if (item.startMonth === undefined) return true;
      const startM = item.startMonth;
      if (item.frequency === Frequency.QUARTERLY) return (monthIndex - startM + 12) % 3 === 0;
      if (item.frequency === Frequency.SEMI_ANNUALLY) return (monthIndex - startM + 12) % 6 === 0;
      if (item.frequency === Frequency.ANNUALLY) return monthIndex === startM;
      return true;
    };

    // Determine the month range to generate for
    const targetMonths: { year: number; month: number; periodId?: string }[] = [];
    const seenYearMonths = new Set<string>();

    if (chronologicalPeriods.length > 0) {
      chronologicalPeriods.forEach(p => {
        const pStart = new Date(p.start);
        const pEnd = new Date(p.end);
        
        let curr = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
        const endMonthDate = new Date(pEnd.getFullYear(), pEnd.getMonth(), 1);
        
        while (curr <= endMonthDate) {
          const ymKey = `${curr.getFullYear()}-${curr.getMonth()}`;
          if (!seenYearMonths.has(ymKey)) {
            seenYearMonths.add(ymKey);
            targetMonths.push({ year: curr.getFullYear(), month: curr.getMonth(), periodId: p.id });
          }
          curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
        }
      });
    } else {
      // Fallback: past 12 months up to current month
      const now = new Date();
      for (let i = -12; i <= 1; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const ymKey = `${d.getFullYear()}-${d.getMonth()}`;
        if (!seenYearMonths.has(ymKey)) {
          seenYearMonths.add(ymKey);
          targetMonths.push({ year: d.getFullYear(), month: d.getMonth() });
        }
      }
    }

    // Generate entries for each target month
    targetMonths.forEach(({ year, month, periodId }) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // 1. Incomes
      (incomes || []).forEach(inc => {
        if (!isItemActiveInMonth(inc, month)) return;
        const rawDay = inc.deductionDay || config?.payday || 25;
        const day = Math.min(rawDay, daysInMonth);
        const itemDate = new Date(year, month, day, 12, 0, 0);

        const amount = inc.isVariable && periodId && inc.periodOverrides && inc.periodOverrides[periodId] !== undefined
          ? inc.periodOverrides[periodId]
          : inc.amount;

        items.push({
          id: `fixed-income-${inc.id}-${year}-${month}-${day}`,
          merchant: inc.name,
          category: inc.category || (isEn ? 'Income' : 'Inkomst'),
          amount: amount || 0,
          type: 'income',
          timestamp: itemDate.getTime(),
          date: itemDate.toISOString(),
          isFixed: true,
          originalItem: inc,
          icon: inc.icon,
          logo: inc.logo,
        } as any);
      });

      // 2. Fixed Expenses
      (fixedExpenses || []).forEach(fe => {
        if (!isItemActiveInMonth(fe, month)) return;
        const rawDay = fe.deductionDay || config?.payday || 25;
        const day = Math.min(rawDay, daysInMonth);
        const itemDate = new Date(year, month, day, 12, 0, 0);

        const amount = fe.isVariable && periodId && fe.periodOverrides && fe.periodOverrides[periodId] !== undefined
          ? fe.periodOverrides[periodId]
          : fe.amount;

        items.push({
          id: `fixed-expense-${fe.id}-${year}-${month}-${day}`,
          merchant: fe.name,
          category: fe.category || (isEn ? 'Fixed Expense' : 'Fast utgift'),
          amount: amount || 0,
          type: 'expense',
          timestamp: itemDate.getTime(),
          date: itemDate.toISOString(),
          isFixed: true,
          originalItem: fe,
          icon: fe.icon,
          logo: fe.logo,
        } as any);
      });

      // 3. Monthly Savings
      const savingsList = config?.monthlySavingsItems && config.monthlySavingsItems.length > 0
        ? config.monthlySavingsItems
        : (stats?.savingsGoals || []).filter((g: any) => Number(g.targetAmount) > 0);

      savingsList.forEach((ms: any) => {
        if (!isItemActiveInMonth(ms, month)) return;
        const rawDay = ms.deductionDay || config?.payday || 25;
        const day = Math.min(rawDay, daysInMonth);
        const itemDate = new Date(year, month, day, 12, 0, 0);

        const amount = ms.isVariable && periodId && ms.periodOverrides && ms.periodOverrides[periodId] !== undefined
          ? ms.periodOverrides[periodId]
          : (ms.amount !== undefined ? ms.amount : (ms.targetAmount || 0));

        items.push({
          id: `fixed-saving-${ms.id}-${year}-${month}-${day}`,
          merchant: ms.name || (isEn ? 'Monthly Saving' : 'Månadssparande'),
          category: isEn ? 'Monthly Saving' : 'Månadssparande',
          amount: Number(amount) || 0,
          type: 'expense',
          timestamp: itemDate.getTime(),
          date: itemDate.toISOString(),
          isFixed: true,
          originalItem: ms,
          icon: ms.icon || 'PiggyBank',
          logo: ms.logo,
        } as any);
      });
    });

    return items;
  }, [config?.showFixedExpensesInHistory, config?.monthlySavingsItems, config?.payday, chronologicalPeriods, incomes, fixedExpenses, stats?.savingsGoals, currentLang]);

  // Combined transactions list (regular + fixed if option enabled)
  const allCombinedTransactions = useMemo(() => {
    if (!transactions) return fixedItemsAsTransactions;
    if (fixedItemsAsTransactions.length === 0) return transactions;
    return [...transactions, ...fixedItemsAsTransactions];
  }, [transactions, fixedItemsAsTransactions]);

  const selectedMonthName = useMemo(() => {
    if (!selectedPeriod?.name) return '';
    return selectedPeriod.name.includes('(')
      ? selectedPeriod.name.split('(')[0].trim()
      : selectedPeriod.name;
  }, [selectedPeriod]);

  const activeFilterLabel = useMemo(() => {
    if (selectedDate) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      
      if (selectedDate.toDateString() === today.toDateString()) {
        return getL10n('Idag', 'Today', 'I dag', 'I dag', 'Tänään');
      }
      if (selectedDate.toDateString() === yesterday.toDateString()) {
        return getL10n('Igår', 'Yesterday', 'I går', 'I går', 'Eilen');
      }
      
      return selectedDate.toLocaleDateString(getLocale(), {
        day: 'numeric',
        month: 'short',
        year: selectedDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }

    if (selectedPeriod) {
      return selectedMonthName;
    }

    return getL10n('Alla perioder', 'All periods', 'Alle perioder', 'Alle perioder', 'Kaikki jaksot');
  }, [selectedDate, selectedPeriod, selectedMonthName, currentLang]);

  // Filter transactions by date / period / type
  const filteredExpenses = useMemo(() => {
    if (!allCombinedTransactions) return [];
    return allCombinedTransactions
      .filter((e: any) => {
        // 1. Day filter has top priority if user chose a specific day
        if (selectedDate) {
          const startOfDay = new Date(selectedDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(selectedDate);
          endOfDay.setHours(23, 59, 59, 999);
          if (e.timestamp < startOfDay.getTime() || e.timestamp > endOfDay.getTime()) {
            return false;
          }
        } 
        // 2. Period filter if selected
        else if (selectedPeriod?.start && selectedPeriod?.end) {
          const startTime = new Date(selectedPeriod.start).getTime();
          const endTime = new Date(selectedPeriod.end).getTime() + 86399999;
          if (e.timestamp < startTime || e.timestamp > endTime) {
            return false;
          }
        }

        // 3. Type filter
        let matchesType = false;
        if (typeFilter === 'all') matchesType = true;
        else matchesType = e.type === typeFilter;
        
        return matchesType;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [allCombinedTransactions, typeFilter, selectedPeriod, selectedDate]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, (Transaction & { isFixed?: boolean; originalItem?: any })[]> = {};
    filteredExpenses.forEach((e: any) => {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  // Modal Calendar logic
  const modalIndex = useMemo(() => {
    if (!modalPeriod || chronologicalPeriods.length === 0) return -1;
    return chronologicalPeriods.findIndex(p => p.name === modalPeriod.name);
  }, [modalPeriod, chronologicalPeriods]);

  const canModalGoPrev = modalIndex > 0;
  const canModalGoNext = modalIndex >= 0 && modalIndex < chronologicalPeriods.length - 1;

  const handleModalPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canModalGoPrev) {
      const prevP = chronologicalPeriods[modalIndex - 1];
      setModalPeriod(prevP);
      setSelectedPeriod(prevP);
      setSelectedDate(null);
    }
  };

  const handleModalNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canModalGoNext) {
      const nextP = chronologicalPeriods[modalIndex + 1];
      setModalPeriod(nextP);
      setSelectedPeriod(nextP);
      setSelectedDate(null);
    }
  };

  const modalPeriodDate = useMemo(() => {
    if (modalPeriod?.date) return new Date(modalPeriod.date);
    if (modalPeriod?.start) return new Date(modalPeriod.start);
    return new Date();
  }, [modalPeriod]);

  const calendarMonthData = useMemo(() => {
    const year = modalPeriodDate.getFullYear();
    const month = modalPeriodDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    // Pre-calculate transactions per day in this month
    const txByDay: Record<number, { hasIncome: boolean; hasExpense: boolean; count: number }> = {};
    if (allCombinedTransactions) {
      allCombinedTransactions.forEach((tx: any) => {
        const d = new Date(tx.timestamp);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const dayNum = d.getDate();
          if (!txByDay[dayNum]) {
            txByDay[dayNum] = { hasIncome: false, hasExpense: false, count: 0 };
          }
          txByDay[dayNum].count++;
          if (tx.type === 'income') txByDay[dayNum].hasIncome = true;
          if (tx.type === 'expense') txByDay[dayNum].hasExpense = true;
        }
      });
    }

    return {
      year,
      month,
      daysInMonth,
      firstDayWeekday,
      txByDay
    };
  }, [modalPeriodDate, allCombinedTransactions]);

  const weekdayNames = useMemo(() => {
    if (currentLang === 'en') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (currentLang === 'no' || currentLang === 'da') return ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
    if (currentLang === 'fi') return ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
    return ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
  }, [currentLang]);

  const today = useMemo(() => new Date(), []);

  if (!transactions && (!fixedExpenses || fixedExpenses.length === 0)) return null;

  return (
    <div className="space-y-5 font-sans">
      {/* Top Controls: Period Dropdown (Main) & Direct Type Filter Buttons */}
      <div className="space-y-2.5">
        {/* Main Period Selector Dropdown */}
        <FilterSelectButton
          icon={<CalendarIcon size={15} strokeWidth={2} />}
          value={activeFilterLabel || getL10n('Alla perioder', 'All periods')}
          badge={
            selectedPeriod?.isCurrent ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)] tracking-tight">
                {getL10n('Nu', 'Current', 'Nå', 'Nu', 'Nyt')}
              </span>
            ) : undefined
          }
          onClick={() => {
            const initial = selectedPeriod || chronologicalPeriods.find(p => p.isCurrent) || chronologicalPeriods[chronologicalPeriods.length - 1] || null;
            setModalPeriod(initial);
            setIsPeriodPickerOpen(true);
          }}
          className="w-full"
        />

        {/* Direct Type Filter Buttons */}
        <FilterButtonGroup
          options={[
            {
              id: 'all',
              label: t('all' as TranslationKey) || (config.language === 'en' ? 'All' : 'Alla'),
              icon: <LayoutGrid size={14} strokeWidth={2} />,
            },
            {
              id: 'expense',
              label: t('expense' as TranslationKey) || (config.language === 'en' ? 'Expenses' : 'Utgifter'),
              icon: <ArrowDownLeft size={14} strokeWidth={2.5} />,
            },
            {
              id: 'income',
              label: t('income' as TranslationKey) || (config.language === 'en' ? 'Income' : 'Inkomster'),
              icon: <ArrowUpRight size={14} strokeWidth={2.5} />,
            },
          ]}
          selectedId={typeFilter}
          onSelect={(id) => setTypeFilter(id as 'all' | 'expense' | 'income')}
          ariaLabel={getL10n('Filtrera transaktioner', 'Filter transactions')}
        />
      </div>

      {/* Transactions List */}
      <div className="space-y-5">
        <div className="space-y-5">
          {groupedExpenses.map(([date, dayTransactions], index) => (
            <motion.div 
              key={date} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="space-y-2"
            >
              <div className="px-1 flex items-center justify-between">
                <span className="text-label font-medium text-[var(--text-secondary)]">
                  {formatFullDate(date, currentLang)}
                </span>
                <span className="text-micro-label font-medium text-[var(--text-tertiary)] tabular-nums font-amount">
                  {dayTransactions.length} {getL10n(
                    dayTransactions.length === 1 ? 'transaktion' : 'transaktioner',
                    dayTransactions.length === 1 ? 'transaction' : 'transactions',
                    dayTransactions.length === 1 ? 'transaksjon' : 'transaksjoner',
                    dayTransactions.length === 1 ? 'transaktion' : 'transaktioner',
                    dayTransactions.length === 1 ? 'tapahtuma' : 'tapahtumaa'
                  )}
                </span>
              </div>
              <div className="space-y-2">
                {dayTransactions.map((transaction: any) => (
                  <TransactionItem 
                    key={transaction.id}
                    transaction={transaction}
                    isFixed={Boolean(transaction.isFixed)}
                    config={config}
                    onView={transaction.isFixed ? undefined : onViewTransaction}
                    onDelete={transaction.isFixed ? undefined : onDeleteTransaction}
                    onClick={() => {
                      if (transaction.isFixed) {
                        if (transaction.type === 'income' && onViewIncome) {
                          onViewIncome(transaction.originalItem);
                        } else if (transaction.originalItem?.targetAmount && onViewMonthlySaving) {
                          onViewMonthlySaving(transaction.originalItem);
                        } else if (onViewFixedExpense) {
                          onViewFixedExpense(transaction.originalItem);
                        }
                      } else if (onViewTransaction) {
                        onViewTransaction(transaction);
                      }
                    }}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {(filteredExpenses?.length || 0) === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <EmptyState
              icon={Wallet}
              title={
                selectedDate 
                  ? getL10n(
                      `Inga transaktioner för ${activeFilterLabel}`, 
                      `No transactions for ${activeFilterLabel}`,
                      `Ingen transaksjoner for ${activeFilterLabel}`,
                      `Ingen transaktioner for ${activeFilterLabel}`,
                      `Ei tapahtumia päivälle ${activeFilterLabel}`
                    )
                  : selectedPeriod 
                  ? getL10n(
                      `Inga transaktioner för ${selectedMonthName}`, 
                      `No transactions for ${selectedMonthName}`,
                      `Ingen transaksjoner for ${selectedMonthName}`,
                      `Ingen transaktioner for ${selectedMonthName}`,
                      `Ei tapahtumia kaudelle ${selectedMonthName}`
                    )
                  : (transactions?.length || 0) === 0 ? t('noTransactions') : t('noTransactionsSubtle')
              }
              description={
                selectedDate || selectedPeriod ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(null);
                      setSelectedPeriod(null);
                    }}
                    className="text-xs font-medium text-[#1C1917] dark:text-white hover:underline cursor-pointer mt-1"
                  >
                    {getL10n('Visa alla transaktioner istället', 'Show all transactions instead', 'Vis alle transaksjoner i stedet', 'Vis alle transaktioner i stedet', 'Näytä kaikki tapahtumat sen sijaan')}
                  </button>
                ) : (transactions?.length || 0) > 0 && typeFilter !== 'all' ? (
                  getL10n(
                    'Inga transaktioner matchar det valda filtret.',
                    'No transactions match the selected filter.',
                    'Ingen transaksjoner samsvarer med det valgte filteret.',
                    'Ingen transaktioner matcher det valgte filter.',
                    'Ei tapahtumia valitulla suodattimella.'
                  )
                ) : undefined
              }
              actionLabel={(transactions?.length || 0) === 0 ? t('addExpense') : undefined}
              onAction={(transactions?.length || 0) === 0 ? onAddTransaction : undefined}
            />
          </motion.div>
        )}
      </div>

      {/* Calendar & Period Modal */}
      <PeriodSelectorModal
        isOpen={isPeriodPickerOpen}
        onClose={() => setIsPeriodPickerOpen(false)}
        periods={chronologicalPeriods}
        selectedPeriod={selectedPeriod}
        selectedDate={selectedDate}
        onSelectPeriod={(p) => {
          setSelectedPeriod(p);
          setSelectedDate(null);
          setModalPeriod(p);
        }}
        onSelectDate={(d) => {
          setSelectedDate(d);
        }}
        showCalendarOption={true}
        currentLang={currentLang}
        calendarContent={
          <div className="space-y-2.5">
            {/* Period Stepper (Left / Right) */}
            <div className="flex items-center justify-between bg-[var(--surface-color)] border-none shadow-none rounded-card p-1.5">
              <button
                type="button"
                onClick={handleModalPrev}
                disabled={!canModalGoPrev}
                className={`w-8 h-8 rounded-[var(--radius-button-sm,10px)] flex items-center justify-center transition-all cursor-pointer ${
                  canModalGoPrev
                    ? 'text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 active:scale-90'
                    : 'text-[var(--text-tertiary)]/30 cursor-not-allowed'
                }`}
                aria-label="Föregående period"
                title="Föregående period"
              >
                <ChevronLeft size={17} strokeWidth={2} />
              </button>

              <div className="flex flex-col items-center text-center px-2 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] tracking-tight truncate capitalize">
                    {modalPeriod?.name?.split('(')[0]?.trim() || modalPeriodDate.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}
                  </span>
                  {modalPeriod?.isCurrent && (
                    <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] border-none">
                      {getL10n('Nu', 'Now', 'Nå', 'Nu', 'Nyt')}
                    </span>
                  )}
                </div>
                {modalPeriod?.name?.includes('(') && (
                  <span className="text-[10.5px] text-[var(--text-tertiary)] font-normal truncate mt-0.5">
                    {modalPeriod.name.split('(')[1]?.replace(')', '').trim()}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleModalNext}
                disabled={!canModalGoNext}
                className={`w-8 h-8 rounded-[var(--radius-button-sm,10px)] flex items-center justify-center transition-all cursor-pointer ${
                  canModalGoNext
                    ? 'text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10 active:scale-90'
                    : 'text-[var(--text-tertiary)]/30 cursor-not-allowed'
                }`}
                aria-label="Nästa period"
                title="Nästa period"
              >
                <ChevronRight size={17} strokeWidth={2} />
              </button>
            </div>

            {/* Quick Action: View whole period */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  if (typeof feedback?.selection === 'function') feedback.selection();
                  else if (typeof feedback?.tap === 'function') feedback.tap();
                  setSelectedPeriod(modalPeriod);
                  setSelectedDate(null);
                  setIsPeriodPickerOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-none active:scale-95 ${
                  selectedPeriod?.name === modalPeriod?.name && !selectedDate
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs'
                    : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Layers size={13} strokeWidth={2} />
                <span>{getL10n('Visa hela perioden', 'View full period', 'Vis hele perioden', 'Vis hele perioden', 'Koko jakso')}</span>
              </button>
            </div>

            {/* Interactive Calendar Days Grid */}
            <div className="select-none pt-1">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-1 text-center">
                {weekdayNames.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-[#8C867C] dark:text-[#71717A] tracking-wider py-0.5">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: calendarMonthData.firstDayWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square opacity-0 pointer-events-none" />
                ))}
                
                {Array.from({ length: calendarMonthData.daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayDate = new Date(calendarMonthData.year, calendarMonthData.month, dayNum);
                  const isSelected = selectedDate && dayDate.toDateString() === selectedDate.toDateString();
                  const isToday = dayDate.toDateString() === today.toDateString();
                  const dayTx = calendarMonthData.txByDay[dayNum];

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => {
                        if (typeof feedback?.selection === 'function') feedback.selection();
                        else if (typeof feedback?.tap === 'function') feedback.tap();
                        setSelectedDate(dayDate);
                        setSelectedPeriod(modalPeriod);
                        setIsPeriodPickerOpen(false);
                      }}
                      className={`aspect-square w-full rounded-[var(--radius-button-sm,10px)] flex flex-col items-center justify-center gap-0.5 transition-all relative active:scale-95 cursor-pointer text-center ${
                        isSelected 
                          ? 'bg-[var(--accent-color)] text-[var(--on-accent)] font-bold shadow-xs z-10' 
                          : isToday
                          ? 'bg-black/5 dark:bg-white/5 text-[#1C1917] dark:text-white border-none font-bold'
                          : 'bg-transparent text-[#1C1917] dark:text-[#A8A8A8] hover:bg-black/5 dark:hover:bg-white/[0.06] hover:text-[#1C1917] dark:hover:text-white font-medium'
                      }`}
                    >
                      <span className={`text-xs sm:text-[13px] leading-none tabular-nums ${
                        isSelected ? 'text-[var(--on-accent)]' : isToday ? 'text-[#1C1917] dark:text-white font-bold' : 'text-[#1C1917] dark:text-white'
                      }`}>
                        {dayNum}
                      </span>
                      
                      {/* Transaction Dots */}
                      <div className="flex items-center justify-center gap-0.5 pointer-events-none h-1 w-full">
                        {dayTx?.hasIncome && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]' : 'bg-emerald-500'}`} />
                        )}
                        {dayTx?.hasExpense && (
                          <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-[var(--on-accent)]' : 'bg-rose-500'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
