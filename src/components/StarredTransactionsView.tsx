import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { Transaction, Config } from '../types';
import { TransactionItem } from './TransactionItem';
import { Card } from './ui';

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
  const starredTransactions = transactions.filter(
    (t) => Boolean(t.isStarred || (t.tags && t.tags.includes('starred')))
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 pb-12 font-sans"
    >
      {starredTransactions.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <Heart size={28} strokeWidth={2} />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {config.language === 'en' ? 'No starred transactions' : 'Inga hjärtmarkerade transaktioner'}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {config.language === 'en'
                ? 'Tap the heart icon on any transaction to save it here for quick access.'
                : 'Tryck på hjärtikonen på en transaktion för att spara den här för snabb åtkomst.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {starredTransactions.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              config={config}
              onView={() => onViewTransaction(tx)}
              onDelete={onDeleteTransaction ? () => onDeleteTransaction(tx.id) : undefined}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
