import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, FileText, LayoutGrid } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { UniversalPeriodSelector } from './UniversalPeriodSelector';

interface LogViewProps {
  transactions: Transaction[];
  stats: any;
  config: Config;
  onAddTransaction: () => void;
  onAddIncome: () => void;
  onViewTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  t: (key: TranslationKey) => string;
  currentLang: Language;
  periods?: any[];
  currentPeriodDate?: Date;
  onPeriodChange?: (date: Date) => void;
  onOpenCalendarPicker?: () => void;
}

export function LogView({ 
  transactions, 
  stats, 
  config, 
  onAddTransaction, 
  _onAddIncome, 
  onViewTransaction, 
  onDeleteTransaction, 
  t, 
  currentLang,
  periods,
  currentPeriodDate,
  onPeriodChange,
  _onOpenCalendarPicker
}: LogViewProps) {
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

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'receipt'>('all');

  const filteredExpenses = useMemo(() => {
    if (!stats || !transactions) return [];
    return transactions
      .filter(e => {
        const inPeriod = e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime();
        if (!inPeriod) return false;
        
        let matchesType = false;
        if (typeFilter === 'all') matchesType = true;
        else if (typeFilter === 'receipt') matchesType = !!e.receiptUrl;
        else matchesType = e.type === typeFilter;
        
        return matchesType;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, stats?.periodStart, stats?.periodEnd, typeFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredExpenses.forEach(e => {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  if (!stats) return null;

  return (
    <div className="space-y-6 font-sans">
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

      {/* Type Filters (Alla, Utgift, Inkomst, Kvitto) */}
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.035] backdrop-blur-[18px] rounded-full border border-white/[0.035]">
          {(['all', 'expense', 'income', 'receipt'] as const).map(type => {
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex items-center justify-center gap-1.5 h-10 sm:h-11 px-1 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#818cf8]/[0.16] text-white border border-[#8B9CFF]/30 shadow-none' 
                    : 'text-[#9CA6BC] hover:text-[#C7CDDC] hover:bg-white/[0.04]'
                }`}
              >
                {type === 'all' && <LayoutGrid size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
                {type === 'expense' && <ArrowDownLeft size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
                {type === 'income' && <ArrowUpRight size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
                {type === 'receipt' && <FileText size={13} strokeWidth={1.75} className={isActive ? 'text-white' : 'text-[#9CA6BC]'} />}
                <span className="truncate">{t(type as TranslationKey)}</span>
              </button>
            );
          })}
        </div>
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
        {(filteredExpenses?.length || 0) === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <EmptyState
              icon={Wallet}
              title={(transactions?.length || 0) === 0 ? t('noTransactions') : t('noTransactionsSubtle')}
              description={(transactions?.length || 0) > 0 && typeFilter !== 'all' ? getL10n(
                'Inga transaktioner matchar det valda filtret.',
                'No transactions match the selected filter.',
                'Ingen transaksjoner samsvarer med det valgte filteret.',
                'Ingen transaktioner matcher det valgte filter.',
                'Ei tapahtumia valitulla suodattimella.'
              ) : undefined}
              actionLabel={(transactions?.length || 0) === 0 ? t('addExpense') : undefined}
              onAction={(transactions?.length || 0) === 0 ? onAddTransaction : undefined}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
