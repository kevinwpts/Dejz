import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, ArrowUpRight, ArrowDownLeft, FileText, LayoutGrid, Wallet } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TranslationKey, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';

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
  currentLang 
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

  if (!stats) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'receipt'>('all');

  const filteredExpenses = useMemo(() => {
    return transactions
      .filter(e => {
        const inPeriod = e.timestamp >= stats.periodStart.getTime() && e.timestamp <= stats.periodEnd.getTime();
        if (!inPeriod) return false;
        
        let matchesType = false;
        if (typeFilter === 'all') matchesType = true;
        else if (typeFilter === 'receipt') matchesType = !!e.receiptUrl;
        else matchesType = e.type === typeFilter;
        
        if (!matchesType) return false;

        if (!searchTerm.trim()) return true;

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (e.category && e.category.toLowerCase().includes(searchLower)) || 
                             (e.note && e.note.toLowerCase().includes(searchLower)) ||
                             (e.merchant && e.merchant.toLowerCase().includes(searchLower)) ||
                             (e.tags && e.tags.some(t => t.toLowerCase().includes(searchLower)));
        return matchesSearch;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, stats.periodStart, stats.periodEnd, searchTerm, typeFilter]);

  const groupedExpenses = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredExpenses.forEach(e => {
      const dateKey = new Date(e.timestamp).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [filteredExpenses]);

  return (
    <div className="space-y-6">
      <div className="space-y-3 bg-transparent p-0">
        <div className="relative group bg-[var(--surface-color)] rounded-full border border-[var(--border-color)] dark:border-white/10 shadow-xs h-11 flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-50 w-4 h-4 transition-all group-focus-within:text-[var(--accent-color)] group-focus-within:opacity-100" />
          <input 
            type="text" 
            placeholder={t('searchTransactions')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-full bg-transparent pl-11 pr-11 text-[13px] sm:text-[14px] font-medium text-[var(--text-primary)] outline-none transition-all placeholder-[var(--text-tertiary)]"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <Plus className="rotate-45" size={14} />
            </button>
          )}
        </div>

        {/* Type Filters (Alla, Utgift, Inkomst, Kvitto) */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[var(--surface-color)] rounded-full border border-[var(--border-color)] dark:border-white/10 shadow-xs">
          {(['all', 'expense', 'income', 'receipt'] as const).map(type => {
            const isActive = typeFilter === type;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex items-center justify-center gap-1.5 h-8 sm:h-8.5 px-1 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60'
                }`}
              >
                {type === 'all' && <LayoutGrid size={13} strokeWidth={2.2} className={isActive ? 'opacity-100' : 'opacity-70'} />}
                {type === 'expense' && <ArrowDownLeft size={13} strokeWidth={2.2} className={isActive ? 'opacity-100' : 'opacity-70'} />}
                {type === 'income' && <ArrowUpRight size={13} strokeWidth={2.2} className={isActive ? 'opacity-100' : 'opacity-70'} />}
                {type === 'receipt' && <FileText size={13} strokeWidth={2.2} className={isActive ? 'opacity-100' : 'opacity-70'} />}
                <span className="truncate">{t(type as TranslationKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-5">
          {groupedExpenses.map(([date, dayTransactions], index) => (
            <motion.div 
              key={date} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="space-y-2"
            >
              <div className="px-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--text-secondary)] tracking-tight capitalize">
                  {new Date(date).toLocaleDateString(getLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="bg-[var(--surface-color)] rounded-[16px] border border-[var(--border-color)] dark:border-white/10 shadow-xs divide-y divide-[var(--border-color)]/30 overflow-hidden">
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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-8"
          >
            <EmptyState
              icon={Wallet}
              title={(transactions?.length || 0) === 0 ? t('noTransactions') : t('noTransactionsSubtle')}
              description={(transactions?.length || 0) > 0 && searchTerm ? getL10n(
                'Vi kunde inte hitta några matchande transaktioner för din sökning.',
                'No matching transactions found for your search.',
                'Vi fant ingen samsvarende transaksjoner for søket ditt.',
                'Vi fandt ingen matchende transaktioner til din søgning.',
                'Hakuasi vastaavia tapahtumia ei löytynyt.'
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
