import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, ChevronRight, FileText } from 'lucide-react';
import { Transaction, Config } from '../types';
import { EmptyState } from './EmptyState';
import { formatAmount, capitalize } from '../utils/format';
import { Card, Input } from './ui';
import { CategoryIcon } from './CategoryIcon';
import { getCategoryIconName } from '../utils/icons';

interface ReceiptsViewProps {
  onBack: () => void;
  transactions: Transaction[];
  config: Config;
  onViewTransaction: (t: Transaction) => void;
}

export function ReceiptsView({
  onBack: _onBack,
  transactions,
  config,
  onViewTransaction
}: ReceiptsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const isEn = config.language === 'en';
  const curr = config.currency || 'kr';

  // Filter transactions that have a receiptUrl
  const receiptTransactions = (transactions || []).filter(
    (t) => t.receiptUrl && typeof t.receiptUrl === 'string' && t.receiptUrl.trim() !== ''
  );

  // Filter by search query
  const filteredTransactions = receiptTransactions.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const merchantMatch = item.merchant?.toLowerCase().includes(query) || false;
    const categoryMatch = item.category?.toLowerCase().includes(query) || false;
    const noteMatch = item.note?.toLowerCase().includes(query) || false;
    const amountMatch = item.amount.toString().includes(query);
    return merchantMatch || categoryMatch || noteMatch || amountMatch;
  });

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const getLocale = () => {
    const lang = config?.language || 'sv';
    const mapping: Record<string, string> = {
      sv: 'sv-SE',
      en: 'en-US',
      no: 'no-NO',
      da: 'da-DK',
      fi: 'fi-FI'
    };
    return mapping[lang] || 'sv-SE';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(getLocale(), {
      day: 'numeric',
      month: 'short',
      year: new Date(timestamp).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-[var(--menu-content-gap)] pb-24 page-max mx-auto w-full min-w-0"
    >
      {/* 1. Metric Summary Cards matching AnalysisView standard */}
      {receiptTransactions.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 select-none">
          {/* Card 1: Totalt belopp */}
          <Card variant="default" padding="sm" className="select-none flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
                {isEn ? 'Total amount' : 'Totalt belopp'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 pt-1.5 min-w-0">
              <span className="text-large-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] truncate max-w-full">
                {formatAmount(totalAmount, config.language)}
              </span>
              <span className="text-label font-medium text-[var(--text-secondary)] shrink-0">
                {curr}
              </span>
            </div>
          </Card>

          {/* Card 2: Sparade kvitton */}
          <Card variant="default" padding="sm" className="select-none flex flex-col justify-between min-w-0">
            <span className="text-metric-label font-medium text-[var(--text-secondary)] truncate">
              {isEn ? 'Saved receipts' : 'Sparade kvitton'}
            </span>
            <div className="flex items-baseline gap-1 pt-1.5 min-w-0">
              <span className="text-large-amount font-bold tabular-nums tracking-tight text-[var(--text-primary)] truncate max-w-full">
                {filteredTransactions.length}
              </span>
              <span className="text-label font-medium text-[var(--text-secondary)] shrink-0">
                {isEn ? 'st' : 'st'}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* 2. Search Input adhering to standard Input search variant */}
      {receiptTransactions.length > 0 && (
        <Input
          variant="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search merchant, category, or amount...' : 'Sök köpställe, kategori eller belopp...'}
          onClear={() => setSearchQuery('')}
          id="receipts_search_input"
          className="w-full"
        />
      )}

      {/* 3. Receipts List matching Dejz Card and TransactionItem hierarchy */}
      <div className="space-y-[var(--card-gap)] min-w-0 w-full">
        {filteredTransactions.length > 0 ? (
          <div className="space-y-[var(--card-gap)] min-w-0 w-full">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((item) => {
                const searchCat = (item.category || '').trim().toLowerCase();
                const matchedCategory = (config?.categories || []).concat(config?.incomeCategories || []).find(
                  (c) => (c?.name || '').trim().toLowerCase() === searchCat || c?.id === item.category || (c?.id || '').toLowerCase() === searchCat
                );
                const iconKey = matchedCategory?.icon || getCategoryIconName(item.category || '');
                const isPdf = item.receiptUrl ? item.receiptUrl.toLowerCase().includes('.pdf') : false;

                return (
                  <motion.div
                    key={item.id}
                    layoutId={`receipt-card-${item.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    id={`receipt_item_${item.id}`}
                    className="min-w-0 w-full"
                  >
                    <Card
                      variant="default"
                      padding="sm"
                      isInteractive
                      onClick={() => onViewTransaction(item)}
                      className="group flex items-center justify-between gap-3 min-w-0 w-full transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                        {/* Receipt Thumbnail Container */}
                        <div className="w-11 h-11 rounded-[var(--radius-card-nested,12px)] overflow-hidden relative shrink-0 bg-[var(--surface-muted)] border border-subtle flex items-center justify-center">
                          {item.receiptUrl && !isPdf ? (
                            <img
                              src={item.receiptUrl}
                              alt={item.merchant || 'Kvitto'}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <Receipt size={20} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
                          )}
                        </div>

                        {/* Middle: Payee + Category + Date */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug truncate">
                            {item.merchant || item.category || (isEn ? 'Receipt' : 'Kvitto')}
                          </p>

                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-secondary text-[var(--text-secondary)] flex-wrap">
                            {/* Category with Icon */}
                            <div className="flex items-center gap-1 shrink-0">
                              {iconKey && (
                                <CategoryIcon
                                  icon={iconKey}
                                  categoryName={item.category}
                                  variant="minimal"
                                  size="2xs"
                                />
                              )}
                              <span className="truncate max-w-[120px] sm:max-w-[160px]">
                                {capitalize(item.category || '')}
                              </span>
                            </div>

                            <span className="text-[var(--text-tertiary)] opacity-60">•</span>

                            {/* Date */}
                            <span className="text-[var(--text-tertiary)] tabular-nums shrink-0">
                              {formatDate(item.timestamp)}
                            </span>
                          </div>

                          {/* Optional note */}
                          {item.note && (
                            <p className="text-secondary text-[var(--text-tertiary)] opacity-80 mt-0.5 truncate">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount + Chevron */}
                      <div className="flex items-center gap-2 shrink-0 text-right pl-2">
                        <span
                          className={`text-list-amount font-amount tabular-nums font-semibold whitespace-nowrap ${
                            item.type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="opacity-80 mr-0.5">{item.type === 'income' ? '+' : '−'}</span>
                          {formatAmount(item.amount, config.language)} {curr}
                        </span>

                        <ChevronRight
                          size={16}
                          className="text-[var(--text-tertiary)] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
                        />
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={
              receiptTransactions.length === 0
                ? isEn
                  ? 'No receipts saved yet'
                  : 'Inga kvitton sparade än'
                : isEn
                ? 'No matches found'
                : 'Inga träffar'
            }
            description={
              receiptTransactions.length === 0
                ? isEn
                  ? 'Take a photo or upload receipts when logging a purchase to collect them here.'
                  : 'Fotografera eller ladda upp kvitton när du registrerar ett köp så samlas de här.'
                : isEn
                ? 'Your search did not match any receipts. Try searching for something else.'
                : 'Din sökning matchade inga kvitton. Testa att söka på något annat.'
            }
          />
        )}
      </div>
    </motion.div>
  );
}
