import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, FileText } from 'lucide-react';
import { Transaction, Config } from '../types';
import { formatAmount, capitalize } from '../utils/format';
import { formatShortDate } from '../utils/date';
import { Card, Input, EmptyState } from './ui';
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
  const receiptTransactions = (transactions || [])
    .filter((t) => t.receiptUrl && typeof t.receiptUrl === 'string' && t.receiptUrl.trim() !== '')
    .sort((a, b) => b.timestamp - a.timestamp);

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

  const getCountText = (count: number) => {
    if (isEn) {
      if (count === 1) return '1 receipt';
      return `${count} receipts`;
    }
    if (count === 1) return '1 kvitto';
    return `${count} kvitton`;
  };

  const formatDate = (timestamp: number) => {
    return formatShortDate(timestamp, config.language || 'sv');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-[var(--menu-content-gap)] pb-24 page-max mx-auto w-full min-w-0 font-sans"
    >
      {/* 1. Standalone Search Bar matching Historik */}
      <div className="w-full">
        <Input
          variant="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search merchant, category, or amount...' : 'Sök köpställe, kategori eller belopp...'}
          onClear={() => setSearchQuery('')}
          id="receipts_search_input"
        />
      </div>

      {/* 2. Receipts List matching Dejz Card and TransactionItem hierarchy */}
      <div className="space-y-[var(--card-gap)] min-w-0 w-full">
        {receiptTransactions.length > 0 && (
          <p className="text-secondary text-[var(--text-secondary)] font-medium px-0.5 select-none">
            {getCountText(filteredTransactions.length)}
          </p>
        )}

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

                        {/* Middle: Payee + Category */}
                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                          <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug truncate">
                            {item.merchant || item.category || (isEn ? 'Receipt' : 'Kvitto')}
                          </p>

                          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[var(--text-secondary)]">
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
                              <span className="text-secondary text-[var(--text-secondary)] whitespace-nowrap truncate max-w-[140px] sm:max-w-[180px]">
                                {capitalize(item.category || '')}
                              </span>
                            </div>
                          </div>

                          {/* Optional note */}
                          {item.note && (
                            <p className="text-secondary text-[var(--text-tertiary)] opacity-80 mt-0.5 truncate">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Amount + Date under amount */}
                      <div className="flex flex-col items-end justify-center shrink-0 whitespace-nowrap pl-1 text-right">
                        <p
                          className={`text-list-amount font-amount tabular-nums font-semibold whitespace-nowrap ${
                            item.type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          <span className="opacity-80 mr-0.5">{item.type === 'income' ? '+' : '−'}</span>
                          {formatAmount(item.amount, config.language)} {curr}
                        </p>

                        <p className="text-secondary text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                          {formatDate(item.timestamp)}
                        </p>
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
