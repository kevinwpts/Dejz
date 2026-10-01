import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Receipt, Calendar, Eye, ArrowUpRight, ArrowDownRight, Tag, FileText } from 'lucide-react';
import { Transaction, Config } from '../types';
import { EmptyState } from './EmptyState';
import { formatAmount } from '../utils/format';

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
      className="space-y-6 pb-24"
    >
      {/* Stats Summary Panel */}
      {receiptTransactions.length > 0 && (
        <div className="overflow-hidden rounded-[22px] bg-white dark:bg-[#1E1B22] p-5 border-none shadow-none space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8]">
              {config.language === 'sv' ? 'Sammanställning' : 'Summary'}
            </span>
            <span className="text-[11px] font-bold text-[#05B862] bg-[#05B862]/10 px-2 py-0.5 rounded-full">
              {filteredTransactions.length} {config.language === 'sv' ? 'stycken' : 'items'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#1C1917] dark:text-white tracking-tight font-amount tabular-nums">
              {formatDisplayAmount(totalAmount)}
            </span>
            <span className="text-xs font-medium text-[#6E6961] dark:text-[#A8A8A8]">
              {config.language === 'sv' ? 'totalt belopp' : 'total amount'}
            </span>
          </div>
        </div>
      )}

      {/* Search Input */}
      {receiptTransactions.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#8C867C] dark:text-[#71717A]">
            <Search size={18} strokeWidth={1.5} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={config.language === 'sv' ? 'Sök köpställe, kategori eller belopp...' : 'Search merchant, category, or amount...'}
            className="w-full h-[46px] pl-11 pr-4 bg-white dark:bg-[#1E1B22] border-none rounded-full text-xs font-semibold placeholder-[#8C867C] dark:placeholder-[#71717A] focus:outline-none shadow-none transition-all text-[#1C1917] dark:text-white"
            id="receipts_search_input"
          />
        </div>
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
                  onClick={() => onViewTransaction(item)}
                  className="group flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-[#333333] rounded-[12px] shadow-none border-none hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer"
                  id={`receipt_item_${item.id}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Receipt thumbnail / Icon wrapper */}
                    <div className="w-12 h-12 rounded-xl border-none overflow-hidden relative shrink-0 bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
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
                        <Receipt size={20} className="text-[var(--text-secondary)]" strokeWidth={1.5} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-[12px] text-[var(--text-primary)] truncate">
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
                      <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-secondary)] opacity-60">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} strokeWidth={1.5} />
                          {formatDate(item.timestamp)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[10px]">
                          <Tag size={10} strokeWidth={1.5} />
                          {item.category}
                        </span>
                      </div>
                      {item.note && (
                        <p className="text-[10px] text-[var(--text-secondary)] opacity-80 mt-1 truncate max-w-[180px]">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="font-extrabold text-[13.5px] text-[var(--text-primary)] font-amount tabular-nums">
                        {formatDisplayAmount(item.amount)}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-muted)]/50 text-[var(--text-secondary)] group-hover:bg-accent/10 group-hover:text-accent flex items-center justify-center transition-all">
                      <Eye size={14} strokeWidth={2} />
                    </div>
                  </div>
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
