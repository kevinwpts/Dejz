import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  X, 
  Check, 
  Layers
} from 'lucide-react';
import { Transaction, Config } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { useScrollLock } from '../hooks/useScrollLock';

interface LogViewProps {
  transactions: Transaction[];
  config: Config;
  onAddTransaction: () => void;
  onAddIncome: () => void;
  onViewTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
  periods?: any[];
}

export function LogView({ 
  transactions, 
  config, 
  onAddTransaction, 
  _onAddIncome, 
  onViewTransaction, 
  onDeleteTransaction, 
  t, 
  currentLang,
  periods
}: LogViewProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'receipt'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<any | null>(null);
  const [isPeriodPickerOpen, setIsPeriodPickerOpen] = useState(false);

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

  // Prepare available periods: current and past periods first, newest at the top for the modal
  const selectablePeriods = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    return periods
      .filter(p => !p.isFuture || p.isCurrent)
      .slice()
      .reverse();
  }, [periods]);

  // Chronological list of past and current periods (earliest to latest) for arrow navigation
  const chronologicalPeriods = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    return periods.filter(p => !p.isFuture || p.isCurrent);
  }, [periods]);

  const currentIndex = useMemo(() => {
    if (!selectedPeriod || chronologicalPeriods.length === 0) return -1;
    return chronologicalPeriods.findIndex(p => p.name === selectedPeriod.name);
  }, [selectedPeriod, chronologicalPeriods]);

  const canGoPrev = chronologicalPeriods.length > 0 && (selectedPeriod === null || currentIndex > 0);
  const canGoNext = selectedPeriod !== null;

  const handlePrevPeriod = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (chronologicalPeriods.length === 0) return;
    if (selectedPeriod === null) {
      // From all periods, step into current / latest period
      setSelectedPeriod(chronologicalPeriods[chronologicalPeriods.length - 1]);
    } else if (currentIndex > 0) {
      setSelectedPeriod(chronologicalPeriods[currentIndex - 1]);
    }
  };

  const handleNextPeriod = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (chronologicalPeriods.length === 0 || selectedPeriod === null) return;
    if (currentIndex < chronologicalPeriods.length - 1) {
      setSelectedPeriod(chronologicalPeriods[currentIndex + 1]);
    } else {
      // Stepping forward from latest period returns to "All periods"
      setSelectedPeriod(null);
    }
  };

  const selectedMonthName = useMemo(() => {
    if (!selectedPeriod?.name) return '';
    return selectedPeriod.name.includes('(')
      ? selectedPeriod.name.split('(')[0].trim()
      : selectedPeriod.name;
  }, [selectedPeriod]);

  const filteredExpenses = useMemo(() => {
    if (!transactions) return [];
    return transactions
      .filter(e => {
        // Filter by period if user specifically selected one
        if (selectedPeriod?.start && selectedPeriod?.end) {
          const startTime = new Date(selectedPeriod.start).getTime();
          const endTime = new Date(selectedPeriod.end).getTime() + 86399999;
          if (e.timestamp < startTime || e.timestamp > endTime) {
            return false;
          }
        }

        let matchesType = false;
        if (typeFilter === 'all') matchesType = true;
        else if (typeFilter === 'receipt') matchesType = !!e.receiptUrl;
        else matchesType = e.type === typeFilter;
        
        return matchesType;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, typeFilter, selectedPeriod]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredExpenses.forEach(e => {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  if (!transactions) return null;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Filter Bar: Period Selector with Left/Right Arrows + Type Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {/* Period Selector with Left & Right Arrows (like in Analysis) */}
        {periods && periods.length > 0 && (
          <>
            <div className={`inline-flex items-center gap-0.5 sm:gap-1 rounded-full px-1 sm:px-1.5 h-8 sm:h-9 transition-all select-none border backdrop-blur-[16px] ${
              selectedPeriod
                ? 'bg-[#818cf8]/[0.18] border-[#8B9CFF]/35 text-white shadow-none'
                : 'bg-white/[0.035] border-white/[0.035] text-[#C7CDDC]'
            }`}>
              <button
                type="button"
                onClick={handlePrevPeriod}
                disabled={!canGoPrev}
                className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
                  canGoPrev 
                    ? 'text-[#9CA6BC] hover:text-white hover:bg-white/[0.06]' 
                    : 'text-[#9CA6BC] opacity-25 cursor-not-allowed'
                }`}
                aria-label="Föregående period"
                title="Föregående period"
              >
                <ChevronLeft size={15} strokeWidth={2} />
              </button>

              <button
                type="button"
                onClick={() => setIsPeriodPickerOpen(true)}
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-full hover:bg-white/[0.05] transition-all cursor-pointer group min-w-0"
                title={selectedPeriod ? selectedMonthName : getL10n('Alla perioder', 'All periods', 'Alle perioder', 'Alle perioder', 'Kaikki jaksot')}
              >
                <CalendarIcon 
                  size={13} 
                  strokeWidth={1.8} 
                  className={selectedPeriod ? 'text-[#8B9CFF]' : 'text-[#9CA6BC] group-hover:text-white transition-colors'} 
                />
                <span className="text-xs sm:text-[13px] font-semibold tracking-tight truncate">
                  {selectedPeriod 
                    ? selectedMonthName 
                    : getL10n('Alla perioder', 'All periods', 'Alle perioder', 'Alle perioder', 'Kaikki jaksot')}
                </span>
                {selectedPeriod ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPeriod(null);
                    }}
                    className="p-0.5 hover:bg-white/20 rounded-full transition-colors ml-0.5"
                    title={getL10n('Rensa filter (visa alla)', 'Clear filter (show all)', 'Fjern filter', 'Ryd filter', 'Tyhjennä')}
                  >
                    <X size={11} strokeWidth={2.5} className="text-[#C7CDDC] hover:text-white" />
                  </span>
                ) : (
                  <ChevronDown size={12} strokeWidth={2} className="text-[#9CA6BC] group-hover:text-white transition-colors shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={handleNextPeriod}
                disabled={!canGoNext}
                className={`p-1 sm:p-1.5 rounded-full transition-all active:scale-90 cursor-pointer ${
                  canGoNext 
                    ? 'text-[#9CA6BC] hover:text-white hover:bg-white/[0.06]' 
                    : 'text-[#9CA6BC] opacity-25 cursor-not-allowed'
                }`}
                aria-label="Nästa period"
                title="Nästa period"
              >
                <ChevronRight size={15} strokeWidth={2} />
              </button>
            </div>

            <div className="w-px h-4 bg-white/[0.08] mx-0.5 shrink-0" />
          </>
        )}

        {/* Type Filters (Alla, Utgift, Inkomst) */}
        {(['all', 'expense', 'income'] as const).map(type => {
          const isActive = typeFilter === type;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`flex items-center justify-center gap-1.5 h-8 sm:h-9 px-3 sm:px-3.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive 
                  ? 'bg-[#818cf8]/[0.16] text-white border border-[#8B9CFF]/30 shadow-none' 
                  : 'text-[#9CA6BC] hover:text-[#C7CDDC] hover:bg-white/[0.03]'
              }`}
            >
              {type === 'all' && <LayoutGrid size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
              {type === 'expense' && <ArrowDownLeft size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
              {type === 'income' && <ArrowUpRight size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
              {type === 'receipt' && <FileText size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
              <span>{t(type as TranslationKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
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
                <span className="text-xs font-medium text-[#9CA6BC] tracking-tight capitalize">
                  {new Date(date).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="bg-white/[0.035] backdrop-blur-[18px] rounded-[24px] border border-white/[0.025] divide-y divide-white/[0.035] overflow-hidden">
                {dayTransactions.map((transaction: Transaction) => (
                  <TransactionItem 
                    key={transaction.id}
                    transaction={transaction}
                    config={config}
                    onView={onViewTransaction}
                    onDelete={onDeleteTransaction}
                    variant="transparent"
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
                selectedPeriod 
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
                selectedPeriod ? (
                  <button
                    type="button"
                    onClick={() => setSelectedPeriod(null)}
                    className="text-xs font-medium text-[#8B9CFF] hover:underline cursor-pointer mt-1"
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

      {/* Period Selection Modal */}
      <AnimatePresence>
        {isPeriodPickerOpen && (
          <div 
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm"
            onClick={() => setIsPeriodPickerOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#232323] border-t sm:border border-white/[0.08] w-full max-w-md rounded-t-[28px] rounded-b-none sm:rounded-[24px] p-5 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-5 shadow-2xl relative max-h-[82vh] flex flex-col overflow-hidden text-white"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-[#8B9CFF]">
                    <CalendarIcon size={16} strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white leading-tight">
                      {getL10n('Välj period', 'Select period', 'Velg periode', 'Vælg periode', 'Valitse jakso')}
                    </h3>
                    <p className="text-[11px] text-[#9CA6BC] mt-0.5">
                      {getL10n(
                        'Visa alla eller zooma in på en månad', 
                        'View all or zoom in on a specific month',
                        'Vis alle eller zoom inn på en måned',
                        'Vis alle eller zoom ind på en måned',
                        'Näytä kaikki tai rajaa tiettyyn kuukauteen'
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPeriodPickerOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA6BC] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  aria-label="Stäng"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>

              {/* Scrollable Options List */}
              <div className="overflow-y-auto space-y-1.5 py-3 pr-1 scrollbar-thin">
                {/* Option: All periods (Infinite scroll) */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPeriod(null);
                    setIsPeriodPickerOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                    selectedPeriod === null
                      ? 'bg-[#818cf8]/[0.16] border-[#8B9CFF]/35 text-white'
                      : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.04] text-[#C7CDDC]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedPeriod === null 
                        ? 'bg-[#818cf8]/25 text-[#8B9CFF]' 
                        : 'bg-white/[0.04] text-[#9CA6BC]'
                    }`}>
                      <Layers size={16} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-white tracking-tight">
                        {getL10n('Alla perioder', 'All periods', 'Alle perioder', 'Alle perioder', 'Kaikki jaksot')}
                      </div>
                      <div className="text-[11px] text-[#9CA6BC] truncate">
                        {getL10n(
                          'Oändligt rullande flöde (standard)', 
                          'Infinite flowing feed (default)',
                          'Uendelig rullende feed (standard)',
                          'Uendelig rullende feed (standard)',
                          'Loputon selausnäkymä (oletus)'
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedPeriod === null && (
                    <div className="w-5 h-5 rounded-full bg-[#8B9CFF] flex items-center justify-center text-[#080A14] shrink-0 ml-2">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>

                {/* Divider */}
                <div className="pt-2 pb-1 px-1 flex items-center gap-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#9CA6BC]/70">
                    {getL10n('Månader & Budgetperioder', 'Months & Periods', 'Måneder & perioder', 'Måneder & perioder', 'Kuukaudet & jaksot')}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.04]" />
                </div>

                {/* List of specific periods */}
                {selectablePeriods.map((p, idx) => {
                  const [mPart, dRange] = p.name.includes('(')
                    ? p.name.split('(').map((s: string) => s.replace(')', '').trim())
                    : [p.name, ''];

                  const isSelected = selectedPeriod?.name === p.name;

                  return (
                    <button
                      key={p.name || idx}
                      type="button"
                      onClick={() => {
                        setSelectedPeriod(p);
                        setIsPeriodPickerOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left border ${
                        isSelected
                          ? 'bg-[#818cf8]/[0.16] border-[#8B9CFF]/35 text-white'
                          : 'bg-white/[0.025] hover:bg-white/[0.05] border-white/[0.04] text-[#C7CDDC]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected 
                            ? 'bg-[#818cf8]/25 text-[#8B9CFF]' 
                            : 'bg-white/[0.04] text-[#9CA6BC]'
                        }`}>
                          <CalendarIcon size={15} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13.5px] font-semibold text-white tracking-tight truncate">
                              {mPart}
                            </span>
                            {p.isCurrent && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#8B9CFF]/20 text-[#8B9CFF] tracking-tight">
                                {getL10n('Nuvarande', 'Current', 'Nåværende', 'Nuværende', 'Nykyinen')}
                              </span>
                            )}
                          </div>
                          {dRange && (
                            <div className="text-[11px] text-[#9CA6BC] truncate mt-0.5">
                              {dRange}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-[#8B9CFF] flex items-center justify-center text-[#080A14] shrink-0 ml-2">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
