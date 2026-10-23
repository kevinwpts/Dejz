import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Receipt, FileText } from 'lucide-react';
import { Transaction, Config } from '../types';
import { formatAmount, capitalize, getTransactionReceipts } from '../utils/format';
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

  // Filter transactions that have at least one receipt/attachment
  const receiptTransactions = (transactions || [])
    .filter((t) => getTransactionReceipts(t).length > 0)
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
          <Card variant="default" padding="none" className="divide-y divide-subtle overflow-hidden">
            {filteredTransactions.map((item) => {
              const searchCat = (item.category || '').trim().toLowerCase();
              const matchedCategory = (config?.categories || []).concat(config?.incomeCategories || []).find(
                (c) => (c?.name || '').trim().toLowerCase() === searchCat || c?.id === item.category || (c?.id || '').toLowerCase() === searchCat
              );
              const iconKey = matchedCategory?.icon || getCategoryIconName(item.category || '');
              const urls = getTransactionReceipts(item);
              const primaryUrl = urls[0];
              const isPdf = primaryUrl ? primaryUrl.toLowerCase().includes('.pdf') : false;

              return (
                <div
                  key={item.id}
                  id={`receipt_item_${item.id}`}
                  onClick={() => onViewTransaction(item)}
                  className="group px-4 py-3 flex items-center justify-between gap-3 min-w-0 w-full hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    {/* Receipt Thumbnail Container */}
                    <div className="w-10 h-10 rounded-card-nested overflow-hidden relative shrink-0 bg-[var(--surface-muted)] flex items-center justify-center">
                      {primaryUrl && !isPdf ? (
                        <img
                          src={primaryUrl}
                          alt={item.merchant || 'Kvitto'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                      ) : (
                        <Receipt size={18} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
                      )}
                      {urls.length > 1 && (
                        <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded-full bg-black/75 text-[9px] font-bold text-white tabular-nums leading-tight">
                          +{urls.length - 1}
                        </span>
                      )}
                    </div>

                    {/* Middle: Payee + Category */}
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug truncate">
                        {item.merchant || item.category || (isEn ? 'Receipt' : 'Kvitto')}
                      </p>

                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[var(--text-secondary)]">
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
                        {item.note && (
                          <span className="text-secondary text-[var(--text-tertiary)] truncate">
                            · {item.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount + Date under amount */}
                  <div className="flex flex-col items-end justify-center shrink-0 whitespace-nowrap pl-1 text-right">
                    <p
                      className={`text-list-amount font-amount tabular-nums font-semibold whitespace-nowrap ${
                        item.type === 'income' ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {item.type === 'income' ? '+' : ''}
                      {formatAmount(item.amount, config.language)} {curr}
                    </p>

                    <p className="text-secondary text-[var(--text-tertiary)] mt-0.5 tabular-nums">
                      {formatDate(item.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </Card>
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
