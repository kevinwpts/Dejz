import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Receipt, Calendar, Eye, ArrowUpRight, ArrowDownRight, Tag, FileText } from 'lucide-react';
import { Transaction, Config } from '../types';
import { EmptyState } from './EmptyState';
import { formatAmount } from '../utils/format';
import { Card, Input } from './ui';

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

  // Filter transactions that have a receiptUrl
  const receiptTransactions = transactions.filter(t => t.receiptUrl && t.receiptUrl.trim() !== '');

  // Filter by search query
  const filteredTransactions = receiptTransactions.filter(item => {
    const query = searchQuery.toLowerCase();
    const merchantMatch = item.merchant?.toLowerCase().includes(query) || false;
    const categoryMatch = item.category?.toLowerCase().includes(query) || false;
    const noteMatch = item.note?.toLowerCase().includes(query) || false;
    const amountMatch = item.amount.toString().includes(query);
    return merchantMatch || categoryMatch || noteMatch || amountMatch;
  });

  const formatDisplayAmount = (amount: number) => {
    return `${formatAmount(amount, config.language)} ${config.currency || 'kr'}`;
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
    }).format(new Date(timestamp));
  };

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-[var(--card-gap)] pb-24 page-max mx-auto w-full min-w-0 overflow-x-hidden"
    >
      {/* Stats Summary Panel */}
      {receiptTransactions.length > 0 && (
        <Card variant="default" padding="lg" className="space-y-2 min-w-0 w-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0 w-full">
            <span className="text-micro-label font-bold tracking-wider text-[var(--text-tertiary)] uppercase truncate min-w-0">
              {config.language === 'sv' ? 'Sammanställning' : 'Summary'}
            </span>
            <span className="text-micro-label font-bold text-[var(--success-color)] bg-[var(--success-container)] px-2.5 py-0.5 rounded-full shrink-0">
              {filteredTransactions.length} {config.language === 'sv' ? 'kvitton' : 'receipts'}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 pt-1 min-w-0 w-full">
            <span className="text-large-amount font-extrabold text-[var(--text-primary)] tracking-tight tabular-nums truncate min-w-0">
              {formatDisplayAmount(totalAmount)}
            </span>
            <span className="text-xs font-medium text-[var(--text-tertiary)] shrink-0">
              {config.language === 'sv' ? 'totalt belopp' : 'total amount'}
            </span>
          </div>
        </Card>
      )}

      {/* Search Input matching History search bar style */}
      {receiptTransactions.length > 0 && (
        <Input
          variant="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={config.language === 'sv' ? 'Sök köpställe, kategori eller belopp...' : 'Search merchant, category, or amount...'}
          onClear={() => setSearchQuery('')}
          id="receipts_search_input"
          className="h-[42px] sm:h-[44px] text-xs sm:text-sm bg-[var(--surface-color)] shadow-subtle border-none min-w-0 w-full"
        />
      )}

      {/* Receipt Grid/List */}
      <div className="space-y-[var(--card-gap)] min-w-0 w-full">
        {filteredTransactions.length > 0 ? (
          <div className="flex flex-col gap-3 min-w-0 w-full">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={`receipt-card-${item.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  id={`receipt_item_${item.id}`}
                  className="min-w-0 w-full overflow-hidden"
                >
                  <Card
                    variant="default"
                    padding="md"
                    isInteractive
                    onClick={() => onViewTransaction(item)}
                    className="group flex items-center justify-between gap-2 sm:gap-3 min-w-0 w-full max-w-full overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 overflow-hidden">
                      {/* Receipt thumbnail / Icon wrapper */}
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[var(--radius-card-nested,10px)] border-none overflow-hidden relative shrink-0 bg-black/[0.04] dark:bg-white/5 flex items-center justify-center">
                        {item.receiptUrl ? (
                          <>
                            <img
                              src={item.receiptUrl}
                              alt="Receipt thumbnail"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Receipt size={14} className="text-white drop-shadow-subtle" />
                            </div>
                          </>
                        ) : (
                          <Receipt size={18} className="text-[var(--text-secondary)]" strokeWidth={2} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5 min-w-0 w-full">
                          <span className="text-body-medium font-bold text-[var(--text-primary)] truncate min-w-0 flex-1 block">
                            {item.merchant || item.category}
                          </span>
                          {item.type === 'income' ? (
                            <span className="p-0.5 rounded-full bg-[var(--success-container)] text-[var(--success-color)] shrink-0">
                              <ArrowDownRight size={10} strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span className="p-0.5 rounded-full bg-[var(--danger-container)] text-[var(--danger-color)] shrink-0">
                              <ArrowUpRight size={10} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-micro-label font-medium text-[var(--text-secondary)] opacity-70 min-w-0 w-full mt-0.5">
                          <span className="inline-flex items-center gap-1 shrink-0">
                            <Calendar size={11} strokeWidth={2} className="shrink-0" />
                            {formatDate(item.timestamp)}
                          </span>
                          <span className="shrink-0">•</span>
                          <span className="inline-flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                            <Tag size={10} strokeWidth={2} className="shrink-0" />
                            <span className="truncate min-w-0 flex-1">{item.category}</span>
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-micro-label text-[var(--text-secondary)] opacity-70 mt-0.5 truncate min-w-0 w-full">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 text-right ml-auto">
                      <div>
                        <span className="text-body-medium font-bold text-[var(--text-primary)] tabular-nums whitespace-nowrap shrink-0 block">
                          {formatDisplayAmount(item.amount)}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] group-hover:bg-accent/10 group-hover:text-accent flex items-center justify-center transition-all shrink-0">
                        <Eye size={13} strokeWidth={2} />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title={receiptTransactions.length === 0 
              ? (config.language === 'sv' ? 'Inga kvitton sparade än' : 'No receipts saved yet')
              : (config.language === 'sv' ? 'Inga träffar' : 'No matches found')}
            description={receiptTransactions.length === 0
              ? (config.language === 'sv' 
                  ? 'Fotografera eller ladda upp kvitton när du registrerar ett köp så samlas de här.' 
                  : 'Take a photo or upload receipts when logging a purchase to collect them here.')
              : (config.language === 'sv' 
                  ? 'Din sökning matchade inga kvitton. Testa att söka på något annat.' 
                  : 'Your search did not match any receipts. Try searching for something else.')}
          />
        )}
      </div>
    </motion.div>
  );
}
