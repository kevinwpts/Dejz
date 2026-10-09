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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-24 max-w-2xl mx-auto w-full"
    >
      {/* Stats Summary Panel */}
      {receiptTransactions.length > 0 && (
        <Card variant="default" padding="lg" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-micro-label font-bold tracking-wider text-[var(--text-tertiary)]">
              {config.language === 'sv' ? 'Sammanställning' : 'Summary'}
            </span>
            <span className="text-micro-label font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-[var(--radius-badge,9999px)]">
              {filteredTransactions.length} {config.language === 'sv' ? 'stycken' : 'items'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-large-amount font-extrabold text-[var(--text-primary)] tracking-tight tabular-nums">
              {formatDisplayAmount(totalAmount)}
            </span>
            <span className="text-secondary font-medium text-[var(--text-secondary)]">
              {config.language === 'sv' ? 'totalt belopp' : 'total amount'}
            </span>
          </div>
        </Card>
      )}

      {/* Search Input */}
      {receiptTransactions.length > 0 && (
        <Input
          variant="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={config.language === 'sv' ? 'Sök köpställe, kategori eller belopp...' : 'Search merchant, category, or amount...'}
          onClear={() => setSearchQuery('')}
          id="receipts_search_input"
        />
      )}

      {/* Receipt Grid/List */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          <div className="grid gap-3">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((item) => (
                <motion.div
                  key={item.id}
                  layoutId={`receipt-card-${item.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  id={`receipt_item_${item.id}`}
                >
                  <Card
                    variant="default"
                    padding="md"
                    isInteractive
                    onClick={() => onViewTransaction(item)}
                    className="group flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Receipt thumbnail / Icon wrapper */}
                      <div className="w-12 h-12 rounded-[var(--radius-card-nested,8px)] border-none overflow-hidden relative shrink-0 bg-black/[0.04] dark:bg-white/5 flex items-center justify-center">
                        {item.receiptUrl ? (
                          <>
                            <img
                              src={item.receiptUrl}
                              alt="Receipt thumbnail"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                              <Receipt size={14} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                            </div>
                          </>
                        ) : (
                          <Receipt size={20} className="text-[var(--text-secondary)]" strokeWidth={2} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-body-medium font-bold text-[var(--text-primary)] truncate">
                            {item.merchant || item.category}
                          </span>
                          {item.type === 'income' ? (
                            <span className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-600 shrink-0">
                              <ArrowDownRight size={10} strokeWidth={2.5} />
                            </span>
                          ) : (
                            <span className="p-0.5 rounded-full bg-rose-500/10 text-rose-600 shrink-0">
                              <ArrowUpRight size={10} strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-micro-label font-semibold text-[var(--text-secondary)] opacity-60">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} strokeWidth={2} />
                            {formatDate(item.timestamp)}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-micro-label">
                            <Tag size={10} strokeWidth={2} />
                            {item.category}
                          </span>
                        </div>
                        {item.note && (
                          <p className="text-micro-label text-[var(--text-secondary)] opacity-80 mt-1 truncate max-w-[180px]">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-body-medium font-extrabold text-[var(--text-primary)] tabular-nums">
                          {formatDisplayAmount(item.amount)}
                        </span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)]/50 text-[var(--text-secondary)] group-hover:bg-accent/10 group-hover:text-accent flex items-center justify-center transition-all">
                        <Eye size={14} strokeWidth={2} />
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
