import React, { useState } from 'react';
import { BottomSheet } from './ui';
import { RotateCcw, Trash2, CheckCircle2, Clock, Sparkles, Pencil } from 'lucide-react';

import { FixedExpense, Config } from '../types';
import { formatAmount } from '../utils/format';
import { isExpenseCancelledAndExpired } from '../utils/cancellation';
import { useScrollLock } from '../hooks/useScrollLock';
import { feedback } from '../utils/feedback';
import { BudgetItemLogo } from './BudgetItem';

interface CancelledSubscriptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fixedExpenses: FixedExpense[];
  onUpdateExpense: (expense: FixedExpense) => void;
  onDeleteExpense: (id: string) => void;
  config: Config;
}

export function CancelledSubscriptionsModal({
  isOpen,
  onClose,
  fixedExpenses,
  onUpdateExpense,
  onDeleteExpense,
  config,
}: CancelledSubscriptionsModalProps) {
  useScrollLock(isOpen);
  const isEn = config.language === 'en';

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [newCancelDate, setNewCancelDate] = useState<string>('');

  if (!isOpen) return null;

  const cancelledItems = (fixedExpenses || []).filter((e) => !!e.isCancelled);

  // Calculate monthly savings from cancelled items
  const totalMonthlySavings = cancelledItems.reduce((sum, item) => {
    const amount = Number(item.amount) || 0;
    switch (item.frequency) {
      case 'Kvartalsvis':
        return sum + amount / 3;
      case 'Halvårsvis':
        return sum + amount / 6;
      case 'Årsvis':
        return sum + amount / 12;
      default:
        return sum + amount;
    }
  }, 0);

  const handleReactivate = (item: FixedExpense) => {
    feedback.success();
    onUpdateExpense({
      ...item,
      isCancelled: false,
      cancellationDate: undefined,
      cancelledAt: undefined,
    });
  };

  const handleSaveDate = (item: FixedExpense) => {
    feedback.tap();
    onUpdateExpense({
      ...item,
      isCancelled: true,
      cancellationDate: newCancelDate || item.cancellationDate,
    });
    setEditingExpenseId(null);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Cancelled Subscriptions' : 'Uppsagda abonnemang'}
      subtitle={isEn ? 'Overview of ended or cancelling subscriptions' : 'Översikt över uppsagda och avslutade tjänster'}
      size="lg"
      zIndex={140}
    >

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
            {/* Total Savings Banner */}
            <div className="p-4 rounded-[22px] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Sparkles size={20} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    {isEn ? 'Total monthly savings' : 'Total besparing per månad'}
                  </p>
                  <p className="text-xl font-bold font-amount tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatAmount(totalMonthlySavings, config.language)} {config.currency || 'kr'}
                    <span className="text-xs font-normal text-[var(--text-secondary)] ml-1 font-sans">
                      /{isEn ? 'mo' : 'mån'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* List of Cancelled Items */}
            {cancelledItems.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-[var(--text-tertiary)] opacity-60" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {isEn ? 'No cancelled subscriptions' : 'Inga uppsagda abonnemang ännu'}
                </p>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  {isEn
                    ? 'When you cancel a subscription, mark it with a cancellation date to track your savings.'
                    : 'När du säger upp ett abonnemang kan du ange ett uppsägningsdatum så att det automatiskt slutar räknas när datumet infallit.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {cancelledItems.map((item) => {
                  const isExpired = isExpenseCancelledAndExpired(item);
                  const isEditingThis = editingExpenseId === item.id;

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-[22px] bg-[var(--surface-color)] border border-black/[0.06] dark:border-white/[0.08] space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[var(--bg-color)] flex items-center justify-center shrink-0 border-none overflow-hidden [&_div]:w-8 [&_div]:h-8 [&_div]:rounded-full [&_img]:rounded-full">
                            <BudgetItemLogo item={item} type="expense" config={config} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[15px] font-bold text-[var(--text-primary)] truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs text-[var(--text-secondary)] font-medium truncate">
                              {typeof item.category === 'object'
                                ? (item.category as any)?.name
                                : item.category || (isEn ? 'Fixed expense' : 'Fast utgift')}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-bold font-amount tabular-nums text-[var(--text-primary)]">
                            {formatAmount(item.amount, config.language)} {config.currency || 'kr'}
                          </span>
                          <span className="block text-[10.5px] text-[var(--text-secondary)] font-medium">
                            /{isEn ? 'mo' : 'mån'}
                          </span>
                        </div>
                      </div>

                      {/* Status pill & dates */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.05]">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11.5px]">
                              <CheckCircle2 size={12} />
                              {isEn ? 'Ended (not counted in budget)' : 'Avslutat (räknas ej längre)'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-[11.5px]">
                              <Clock size={12} />
                              {isEn
                                ? `Active until ${item.cancellationDate || 'date'}`
                                : `Aktiv t.o.m. ${item.cancellationDate || 'valt datum'}`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpenseId(isEditingThis ? null : item.id);
                              setNewCancelDate(item.cancellationDate || new Date().toISOString().split('T')[0]);
                            }}
                            className="p-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil size={12} />
                            <span>{isEn ? 'Date' : 'Datum'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReactivate(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                          >
                            <RotateCcw size={12} strokeWidth={2.5} />
                            <span>{isEn ? 'Reactivate' : 'Återaktivera'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteExpense(item.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-xs font-medium cursor-pointer transition-colors"
                            title={isEn ? 'Delete permanently' : 'Ta bort permanent'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Inline Date Editor */}
                      {isEditingThis && (
                        <div className="pt-2 space-y-2 bg-black/[0.02] dark:bg-white/[0.03] p-3 rounded-[14px]">
                          <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                            {isEn ? 'Cancellation / End date' : 'Uppsägningsdatum / Sista giltighetsdag'}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="date"
                              value={newCancelDate}
                              onChange={(e) => setNewCancelDate(e.target.value)}
                              className="flex-1 h-9 px-3 bg-[var(--bg-color)] border border-black/10 dark:border-white/10 rounded-[10px] text-xs font-semibold text-[var(--text-primary)] outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveDate(item)}
                              className="h-9 px-3 rounded-[10px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-xs cursor-pointer"
                            >
                              {isEn ? 'Save' : 'Spara'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
    </BottomSheet>
  );
}

