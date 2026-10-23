import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TransactionItem } from './TransactionItem';
import { EmptyState, Input } from './ui';

interface StarredTransactionsViewProps {
  onBack: () => void;
  transactions: Transaction[];
  config: Config;
  onViewTransaction: (transaction: Transaction) => void;
  onDeleteTransaction?: (id: string) => void;
  onToggleStar?: (transaction: Transaction) => void;
}

export function StarredTransactionsView({
  onBack: _onBack,
  transactions,
  config,
  onViewTransaction,
  onDeleteTransaction,
  onToggleStar,
}: StarredTransactionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const isEn = config.language === 'en';

  const starredTransactions = (transactions || [])
    .filter((t) => Boolean(t.isStarred || (t.tags && t.tags.includes('starred'))))
    .sort((a, b) => b.timestamp - a.timestamp);

  const filteredTransactions = starredTransactions.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const merchantStr = typeof item.merchant === 'object' ? (item.merchant as any)?.name : (item.merchant || '');
    const categoryStr = typeof item.category === 'object' ? (item.category as any)?.name : (item.category || '');
    const merchantMatch = String(merchantStr).toLowerCase().includes(query);
    const categoryMatch = String(categoryStr).toLowerCase().includes(query);
    const noteMatch = item.note?.toLowerCase().includes(query) || false;
    const amountMatch = item.amount.toString().includes(query);
    return merchantMatch || categoryMatch || noteMatch || amountMatch;
  });

  const getCountText = (count: number) => {
    if (isEn) {
      return count === 1 ? '1 saved transaction' : `${count} saved transactions`;
    }
    return count === 1 ? '1 hjärtmarkerad transaktion' : `${count} hjärtmarkerade transaktioner`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-[var(--menu-content-gap)] pb-24 page-max mx-auto w-full min-w-0 font-sans"
    >
      <div className="w-full">
        <Input
          variant="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isEn ? 'Search merchant, category, or amount...' : 'Sök köpställe, kategori eller belopp...'}
          onClear={() => setSearchQuery('')}
          id="starred_search_input"
        />
      </div>

      <div className="space-y-[var(--card-gap)] min-w-0 w-full">
        {starredTransactions.length > 0 && (
          <p className="text-secondary text-[var(--text-secondary)] font-medium px-0.5 select-none">
            {getCountText(filteredTransactions.length)}
          </p>
        )}

        {filteredTransactions.length > 0 ? (
          <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
            {filteredTransactions.map((tx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                isGrouped={true}
                config={config}
                showDate={true}
                onView={() => onViewTransaction(tx)}
                onDelete={onDeleteTransaction ? () => onDeleteTransaction(tx.id) : undefined}
                onToggleStar={onToggleStar}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Heart}
            title={
              starredTransactions.length === 0
                ? isEn
                  ? 'No saved transactions'
                  : 'Inga hjärtmarkerade transaktioner'
                : isEn
                ? 'No matches found'
                : 'Inga träffar'
            }
            description={
              starredTransactions.length === 0
                ? isEn
                  ? 'Tap the heart icon on any transaction to save it here for quick access.'
                  : 'Tryck på hjärtikonen på en transaktion för att spara den här för snabb åtkomst.'
                : isEn
                ? 'Your search did not match any saved transactions.'
                : 'Din sökning matchade inga hjärtmarkerade transaktioner.'
            }
          />
        )}
      </div>
    </motion.div>
  );
}

