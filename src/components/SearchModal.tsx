import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { Transaction, Config, FixedExpense, Income } from '../types';
import { TransactionItem } from './TransactionItem';
import { BudgetItem } from './BudgetItem';
import { EmptyState } from './EmptyState';
import { useScrollLock } from '../hooks/useScrollLock';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  fixedExpenses?: FixedExpense[];
  incomes?: Income[];
  config: Config;
  onNavigate: (tab: string, section?: string) => void;
  onViewTransaction: (transaction: Transaction) => void;
  onViewFixedExpense?: (expense: FixedExpense) => void;
  onViewIncome?: (income: Income) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export function SearchModal({ 
  isOpen, 
  onClose, 
  transactions, 
  fixedExpenses = [],
  incomes = [],
  config, 
  onViewTransaction,
  onViewFixedExpense,
  onViewIncome,
  searchQuery = '',
  setSearchQuery
}: SearchModalProps) {
  useScrollLock(isOpen);
  const [internalQuery, setInternalQuery] = useState(searchQuery);

  useEffect(() => {
    setInternalQuery(searchQuery);
  }, [searchQuery]);

  const query = searchQuery !== undefined && setSearchQuery ? searchQuery : internalQuery;
  const setQuery = setSearchQuery || setInternalQuery;

  const inputRef = useRef<HTMLInputElement>(null);
  const getL10n = (sv: string, en: string, no?: string, da?: string, fi?: string) => {
    const lang = config.language || 'sv';
    if (lang === 'sv') return sv;
    if (lang === 'no') return no || sv;
    if (lang === 'da') return da || sv;
    if (lang === 'fi') return fi || sv;
    return en;
  };

  const _isSv = config.language === 'sv';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const trimmedQuery = query.trim().toLowerCase();

  const matchingFixedExpenses = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }
    return (fixedExpenses || [])
      .filter((fe) => {
        if (fe.isCancelled) return false;
        const name = (fe.name || '').toLowerCase();
        const category = (fe.category || '').toLowerCase();
        const note = (fe.note || '').toLowerCase();
        const amountStr = String(Math.abs(fe.amount));
        const deductionDayStr = fe.deductionDay ? String(fe.deductionDay) : '';

        return (
          name.includes(trimmedQuery) ||
          category.includes(trimmedQuery) ||
          note.includes(trimmedQuery) ||
          amountStr.includes(trimmedQuery) ||
          (deductionDayStr && (deductionDayStr === trimmedQuery || `${deductionDayStr}:e`.includes(trimmedQuery)))
        );
      });
  }, [fixedExpenses, trimmedQuery]);

  const matchingIncomes = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }
    return (incomes || [])
      .filter((inc) => {
        const source = ((inc as any).source || (inc as any).name || '').toLowerCase();
        const category = (inc.category || '').toLowerCase();
        const note = (inc.note || '').toLowerCase();
        const amountStr = String(Math.abs(inc.amount));

        return (
          source.includes(trimmedQuery) ||
          category.includes(trimmedQuery) ||
          note.includes(trimmedQuery) ||
          amountStr.includes(trimmedQuery)
        );
      });
  }, [incomes, trimmedQuery]);

  const matchingTransactions = useMemo(() => {
    if (!trimmedQuery) {
      return [];
    }
    return (transactions || [])
      .filter(t => {
        const merchant = (t.merchant || '').toLowerCase();
        const note = (t.note || '').toLowerCase();
        const category = (t.category || '').toLowerCase();
        const tags = (t.tags || []).map(tag => tag.toLowerCase());
        const amountStr = String(Math.abs(t.amount));

        return merchant.includes(trimmedQuery) ||
               note.includes(trimmedQuery) ||
               category.includes(trimmedQuery) ||
               amountStr.includes(trimmedQuery) ||
               tags.some(tag => tag.includes(trimmedQuery));
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, trimmedQuery]);

  const totalMatches = matchingFixedExpenses.length + matchingIncomes.length + matchingTransactions.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm sm:items-center sm:justify-start sm:p-4 sm:pt-14"
          onClick={onClose}
        >
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-[var(--bg-color)] w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[85vh] sm:rounded-[var(--radius-modal,24px)] border-none shadow-modal flex flex-col overflow-hidden font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Search Bar */}
            <div className="p-3.5 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4 border-b border-subtle bg-[var(--bg-color)] flex items-center gap-2.5 shrink-0">
              <div className="flex-1 relative flex items-center bg-white dark:bg-white/5 rounded-full border border-subtle px-3.5 h-[44px] transition-all shadow-none">
                <Search size={18} className="text-[var(--text-tertiary)] shrink-0 mr-2.5" />
                <input 
                  ref={inputRef}
                  autoFocus
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  placeholder={getL10n(
                    "Sök transaktion, fast utgift, butik...",
                    "Search transactions, fixed expenses, stores...",
                    "Søk transaksjon, fast utgift, butikk...",
                    "Søg transaktion, fast udgift, butik...",
                    "Etsi tapahtumaa, kiinteää kulua, kauppaa..."
                  )}
                  className="w-full h-full bg-transparent text-body-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
                />
                {query && (
                  <button 
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 active:scale-90"
                    title={getL10n("Rensa", "Clear", "Tøm", "Ryd", "Tyhjennä")}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <button 
                type="button"
                onClick={onClose} 
                className="h-10 px-3 rounded-full text-secondary font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                {getL10n("Avbryt", "Cancel", "Avbryt", "Annuller", "Peruuta")}
              </button>
            </div>

            {/* Results Scroll Container */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-4 space-y-4 custom-scrollbar touch-pan-y overscroll-contain bg-canvas">
              {!trimmedQuery ? (
                <div className="py-8 px-2">
                  <EmptyState
                    icon="search"
                    title={getL10n(
                      'Sök i din ekonomi',
                      'Search your finances',
                      'Søk i økonomien din',
                      'Søg i din økonomi',
                      'Hae taloudestasi'
                    )}
                    description={getL10n(
                      'Skriv in fast utgift, butik, anteckning, kategori eller belopp för att söka.',
                      'Type a fixed expense, store, note, category or amount to search.',
                      'Skriv inn fast utgift, butikk, notat, kategori eller beløp for å søke.',
                      'Indtast fast udgift, butik, note, kategori eller beløb for at søge.',
                      'Kirjoita kiinteä kulu, kauppa, muistiinpano, kategoria tai summa hakeaksesi.'
                    )}
                  />
                </div>
              ) : totalMatches === 0 ? (
                <EmptyState
                  icon="search"
                  title={getL10n(
                    'Inga sökresultat',
                    'No search results',
                    'Ingen søkeresultater',
                    'Ingen søgeresultater',
                    'Ei hakutuloksia'
                  )}
                  description={getL10n(
                    'Prova ett annat sökord.',
                    'Try another search term.',
                    'Prøv et annet søkeord.',
                    'Prøv et andet søgeord.',
                    'Kokeile toista hakusanaa.'
                  )}
                />
              ) : (
                <div className="space-y-4">
                  {/* Fixed Expenses Section */}
                  {matchingFixedExpenses.length > 0 && (
                    <div className="space-y-[var(--card-gap)]">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-micro-label font-bold tracking-wider text-[var(--text-secondary)] opacity-70 uppercase">
                          {getL10n("Fasta utgifter", "Fixed expenses", "Faste utgifter", "Faste udgifter", "Kiinteät kulut")} ({matchingFixedExpenses.length})
                        </span>
                      </div>
                      <div className="space-y-[var(--card-gap)]">
                        {matchingFixedExpenses.map((fe) => (
                          <BudgetItem
                            key={fe.id}
                            item={fe}
                            currency={config.currency}
                            type="expense"
                            language={config.language as any}
                            t={(k: any) => k}
                            config={config}
                            onClick={() => {
                              if (onViewFixedExpense) {
                                onViewFixedExpense(fe);
                              }
                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fixed Incomes Section */}
                  {matchingIncomes.length > 0 && (
                    <div className="space-y-[var(--card-gap)]">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-micro-label font-bold tracking-wider text-[var(--text-secondary)] opacity-70 uppercase">
                          {getL10n("Inkomster", "Incomes", "Inntekter", "Indkomster", "Tulot")} ({matchingIncomes.length})
                        </span>
                      </div>
                      <div className="space-y-[var(--card-gap)]">
                        {matchingIncomes.map((inc) => (
                          <BudgetItem
                            key={inc.id}
                            item={inc}
                            currency={config.currency}
                            type="income"
                            language={config.language as any}
                            t={(k: any) => k}
                            config={config}
                            onClick={() => {
                              if (onViewIncome) {
                                onViewIncome(inc);
                              }
                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transactions Section */}
                  {matchingTransactions.length > 0 && (
                    <div className="space-y-[var(--card-gap)]">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-micro-label font-bold tracking-wider text-[var(--text-secondary)] opacity-70 uppercase">
                          {getL10n("Transaktioner", "Transactions", "Transaksjoner", "Transaktioner", "Tapahtumat")} ({matchingTransactions.length})
                        </span>
                      </div>
                      <div className="space-y-[var(--card-gap)]">
                        {matchingTransactions.map((t) => (
                          <TransactionItem 
                            key={t.id} 
                            transaction={t} 
                            config={config} 
                            showDate={true}
                            onView={(trans) => {
                              onViewTransaction(trans);
                              onClose();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
