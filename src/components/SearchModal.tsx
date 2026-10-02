import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TransactionItem } from './TransactionItem';
import { EmptyState } from './EmptyState';
import { useScrollLock } from '../hooks/useScrollLock';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  config: Config;
  onNavigate: (tab: string, section?: string) => void;
  onViewTransaction: (transaction: Transaction) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export function SearchModal({ 
  isOpen, 
  onClose, 
  transactions, 
  config, 
  onViewTransaction,
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
    if (isOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const trimmedQuery = query.trim().toLowerCase();

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
            className="bg-[#EFECE6] dark:bg-[#141414] w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[85vh] sm:rounded-[28px] border-0 sm:border border-black/[0.08] dark:border-white/[0.08] shadow-2xl flex flex-col overflow-hidden font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Search Bar */}
            <div className="p-3.5 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#EFECE6] dark:bg-[#141414] flex items-center gap-2.5 shrink-0">
              <div className="flex-1 relative flex items-center bg-white dark:bg-[#2D2D2D] rounded-full border border-black/10 dark:border-white/10 px-3.5 h-[44px] transition-all focus-within:border-[var(--accent-color)] dark:focus-within:border-white/40 shadow-none">
                <Search size={18} className="text-[#8C867C] dark:text-[#71717A] shrink-0 mr-2.5" />
                <input 
                  ref={inputRef}
                  autoFocus
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoComplete="off"
                  placeholder={getL10n(
                    "Sök transaktion, butik, kategori...",
                    "Search transaction, merchant, category...",
                    "Søk transaksjon, butikk, kategori...",
                    "Søg transaktion, butik, kategori...",
                    "Etsi tilitapahtumaa, kauppaa, kategoriaa..."
                  )}
                  className="w-full h-full bg-transparent text-sm font-semibold text-[#1C1917] dark:text-white placeholder-[#8C867C] dark:placeholder-[#71717A] outline-none"
                />
                {query && (
                  <button 
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="w-6 h-6 rounded-full bg-black/5 dark:bg-[#2D2D2D] text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 active:scale-90"
                    title={getL10n("Rensa", "Clear", "Tøm", "Ryd", "Tyhjennä")}
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>

              <button 
                type="button"
                onClick={onClose} 
                className="h-10 px-3 rounded-full text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                {getL10n("Avbryt", "Cancel", "Avbryt", "Annuller", "Peruuta")}
              </button>
            </div>

            {/* Results Scroll Container */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-4 space-y-6 custom-scrollbar touch-pan-y overscroll-contain bg-[#EFECE6] dark:bg-[#141414]">
              {!trimmedQuery ? (
                <div className="text-center py-16 px-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] opacity-60 flex items-center justify-center mx-auto mb-3">
                    <Search size={22} />
                  </div>
                  <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {getL10n(
                      'Sök i din ekonomi',
                      'Search your finances',
                      'Søk i økonomien din',
                      'Søg i din økonomi',
                      'Hae taloudestasi'
                    )}
                  </p>
                  <p className="text-[12.5px] font-medium text-[var(--text-secondary)] opacity-70 mt-1 max-w-xs mx-auto">
                    {getL10n(
                      'Skriv in butik, anteckning, kategori eller belopp för att söka.',
                      'Type a store, note, category or amount to search.',
                      'Skriv inn butikk, notat, kategori eller beløp for å søke.',
                      'Indtast butik, note, kategori eller beløb for at søge.',
                      'Kirjoita kauppa, muistiinpano, kategoria tai summa hakeaksesi.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] opacity-70">
                      {getL10n("Transaktioner", "Transactions", "Transaksjoner", "Transaktioner", "Tapahtumat")} ({matchingTransactions.length})
                    </span>
                  </div>

                  {matchingTransactions.length > 0 ? (
                    <div className="space-y-2.5">
                      {matchingTransactions.map(t => (
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
                  ) : (
                    <EmptyState
                      icon={Search}
                      title={getL10n(
                        `Inga resultat för "${query}"`,
                        `No results for "${query}"`,
                        `Ingen resultater for "${query}"`,
                        `Ingen resultater for "${query}"`,
                        `Ei tuloksia haulle "${query}"`
                      )}
                      description={getL10n(
                        'Testa att söka på butiksnamn, kategori eller belopp',
                        'Try searching for merchant, category or amount',
                        'Prøv å søke etter butikk, kategori eller beløp',
                        'Prøv at søge efter butik, kategori eller beløb',
                        'Kokeile hakea kaupan nimeä, kategoriaa tai summaa'
                      )}
                    />
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
