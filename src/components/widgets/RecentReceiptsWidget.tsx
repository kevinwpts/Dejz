import React from 'react';
import { Receipt, ChevronRight, Camera } from 'lucide-react';
import { Config, Transaction } from '../../types';
import { formatAmount } from '../../utils/format';

interface RecentReceiptsWidgetProps {
  config: Config;
  allTransactions?: Transaction[];
  onNavigate: (tab: string, section?: string) => void;
  onViewTransaction?: (t: Transaction) => void;
  onRemove?: () => void;
  isCustomizing?: boolean;
}

export function RecentReceiptsWidget({
  config,
  allTransactions = [],
  onNavigate,
  onViewTransaction,
  onRemove,
  isCustomizing,
}: RecentReceiptsWidgetProps) {
  const isEn = config.language === 'en';
  const currency = config.currency || 'kr';

  const receiptTransactions = allTransactions
    .filter((t) => !!t.receiptUrl || !!t.receiptBase64)
    .slice(0, 3);

  return (
    <div className="bg-[var(--surface-color)] border border-[var(--border-color)]/80 rounded-[20px] p-4 shadow-2xs relative group transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Receipt size={14} strokeWidth={2.2} />
          </div>
          <h4 className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Recent receipts' : 'Senaste kvitton'}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          {isCustomizing && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              className="px-2 py-0.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] font-semibold transition-all cursor-pointer"
            >
              {isEn ? 'Remove' : 'Ta bort'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('receipts')}
              className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-color)] flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'All receipts' : 'Alla kvitton'}</span>
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>

      {receiptTransactions.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {receiptTransactions.map((t) => (
            <div
              key={t.id}
              onClick={() => onViewTransaction?.(t)}
              className="group/receipt bg-[var(--surface-muted)]/50 hover:bg-[var(--surface-muted)] rounded-xl p-2 border border-[var(--border-color)]/60 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div className="aspect-[4/3] rounded-lg bg-black/5 dark:bg-white/5 overflow-hidden mb-1.5 relative flex items-center justify-center">
                {t.receiptUrl || t.receiptBase64 ? (
                  <img
                    src={t.receiptUrl || t.receiptBase64}
                    alt={t.note || 'Kvitto'}
                    className="w-full h-full object-cover group-hover/receipt:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Receipt size={16} className="text-[var(--text-secondary)] opacity-50" />
                )}
              </div>
              <p className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                {t.note || t.category || 'Köp'}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] font-amount tabular-nums">
                {formatAmount(t.amount, config.language)} {currency}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onNavigate('receipts')}
          className="w-full py-3 px-4 rounded-xl border border-dashed border-[var(--border-color)] hover:border-[var(--accent-color)]/50 bg-[var(--surface-muted)]/30 hover:bg-[var(--surface-muted)]/60 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          <Camera size={14} className="text-cyan-500" />
          <span>{isEn ? 'Scan or upload a receipt' : 'Scanna eller spara ditt första kvitto'}</span>
        </button>
      )}
    </div>
  );
}
