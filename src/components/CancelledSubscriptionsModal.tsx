import React, { useState } from 'react';
import { BottomSheet, Card, Button, IconButton, Input } from './ui';
import { RotateCcw, Trash2, CheckCircle2, Clock, Sparkles, Pencil } from 'lucide-react';

import { FixedExpense, Config } from '../types';
import { formatAmount } from '../utils/format';
import { isExpenseCancelledAndExpired, getLastPaymentDate, formatShortDate, calculateLastPaymentDate } from '../utils/cancellation';
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
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [newLastPayDate, setNewLastPayDate] = useState<string>('');

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
      lastPaymentDate: undefined,
    });
  };

  const handleSaveDates = (item: FixedExpense) => {
    feedback.tap();
    onUpdateExpense({
      ...item,
      isCancelled: true,
      cancellationDate: newEndDate || item.cancellationDate,
      lastPaymentDate: newLastPayDate || item.lastPaymentDate,
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
        <div className="p-4 rounded-[var(--radius-card,20px)] bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-[var(--success-color)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Sparkles size={20} strokeWidth={2} className="text-[var(--success-color)] shrink-0" />
            <div>
              <p className="text-secondary font-semibold text-[var(--text-secondary)]">
                {isEn ? 'Total monthly savings' : 'Total besparing per månad'}
              </p>
              <p className="text-page-title font-bold font-amount tabular-nums text-[var(--success-color)]">
                +{formatAmount(totalMonthlySavings, config.language)} {config.currency || 'kr'}
                <span className="text-secondary font-normal text-[var(--text-secondary)] ml-1 font-sans">
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
            <p className="text-body font-semibold text-[var(--text-primary)]">
              {isEn ? 'No cancelled subscriptions' : 'Inga uppsagda abonnemang ännu'}
            </p>
            <p className="text-secondary text-[var(--text-secondary)] max-w-xs mx-auto">
              {isEn
                ? 'When you cancel a subscription, mark it with a cancellation date to track your savings.'
                : 'När du säger upp ett abonnemang kan du ange uppsägnings- och slutdatum så att det automatiskt slutar räknas när sista betalningen genomförts.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cancelledItems.map((item) => {
              const isExpired = isExpenseCancelledAndExpired(item);
              const isEditingThis = editingExpenseId === item.id;
              const lastPay = getLastPaymentDate(item);
              const endDate = item.cancellationDate;
              const noticeDate = item.cancelledAt ? new Date(item.cancelledAt).toLocaleDateString(config.language === 'en' ? 'en-US' : 'sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

              return (
                <Card
                  key={item.id}
                  variant="outlined"
                  padding="sm"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <BudgetItemLogo item={item} type="expense" config={config} />
                      <div className="min-w-0">
                        <h4 className="text-section-title font-bold text-[var(--text-primary)] truncate">
                          {item.name}
                        </h4>
                        <p className="text-secondary text-[var(--text-secondary)] font-medium truncate">
                          {typeof item.category === 'object'
                            ? (item.category as any)?.name
                            : item.category || (isEn ? 'Fixed expense' : 'Fast utgift')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-body font-bold font-amount tabular-nums text-[var(--text-primary)]">
                        {formatAmount(item.amount, config.language)} {config.currency || 'kr'}
                      </span>
                      <span className="block text-secondary text-[var(--text-secondary)] font-medium">
                        /{isEn ? 'mo' : 'mån'}
                      </span>
                    </div>
                  </div>

                  {/* Dates breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-secondary py-1.5 px-2.5 rounded-card-nested bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                    {noticeDate && (
                      <div>
                        <span className="block text-micro-label text-[var(--text-tertiary)]">{isEn ? 'Sades upp' : 'Sades upp'}</span>
                        <span className="font-semibold text-[var(--text-primary)]">{noticeDate}</span>
                      </div>
                    )}
                    {endDate && (
                      <div>
                        <span className="block text-micro-label text-[var(--text-tertiary)]">{isEn ? 'Slutdatum' : 'Slutdatum'}</span>
                        <span className="font-semibold text-[var(--text-primary)]">{formatShortDate(endDate, config.language)}</span>
                      </div>
                    )}
                    {lastPay && (
                      <div>
                        <span className="block text-micro-label text-[var(--text-tertiary)]">{isEn ? 'Sista betalning' : 'Sista betalning'}</span>
                        <span className="font-semibold text-[var(--text-primary)]">{formatShortDate(lastPay, config.language)}</span>
                      </div>
                    )}
                  </div>

                  {/* Status pill & actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center gap-1.5 text-secondary font-medium">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--success-container)] text-[var(--success-color)] font-semibold text-secondary">
                          <CheckCircle2 size={12} />
                          {isEn ? 'Ended (not in budget)' : 'Avslutat (räknas ej i budget)'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--warning-container)] text-[var(--warning-color)] font-semibold text-secondary">
                          <Clock size={12} />
                          {isEn
                            ? `Active until ${formatShortDate(lastPay || endDate, config.language)}`
                            : `Aktiv t.o.m. ${formatShortDate(lastPay || endDate, config.language)}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="xs"
                        icon={<Pencil size={12} />}
                        onClick={() => {
                          setEditingExpenseId(isEditingThis ? null : item.id);
                          setNewEndDate(item.cancellationDate || new Date().toISOString().split('T')[0]);
                          setNewLastPayDate(lastPay || item.cancellationDate || new Date().toISOString().split('T')[0]);
                        }}
                      >
                        {isEn ? 'Dates' : 'Ändra datum'}
                      </Button>

                      <Button
                        variant="primary"
                        size="xs"
                        icon={<RotateCcw size={12} strokeWidth={2.5} />}
                        onClick={() => handleReactivate(item)}
                      >
                        {isEn ? 'Reactivate' : 'Återaktivera'}
                      </Button>

                      <IconButton
                        variant="danger"
                        size="xs"
                        icon={<Trash2 size={13} />}
                        onClick={() => onDeleteExpense(item.id)}
                        aria-label={isEn ? 'Delete permanently' : 'Ta bort permanent'}
                      />
                    </div>
                  </div>

                  {/* Inline Date Editor */}
                  {isEditingThis && (
                    <div className="pt-2 space-y-3 bg-[var(--surface-muted)] p-3 rounded-[var(--radius-card-nested,10px)] border border-subtle">
                      <div className="space-y-1">
                        <label className="text-secondary font-semibold text-[var(--text-primary)] block">
                          {isEn ? 'Slutdatum (sista giltighetsdag)' : 'Slutdatum (sista giltighetsdag)'}
                        </label>
                        <Input
                          type="date"
                          value={newEndDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewEndDate(val);
                            setNewLastPayDate(calculateLastPaymentDate(val, item.deductionDay, item.frequency));
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-secondary font-semibold text-[var(--text-primary)] block">
                          {isEn ? 'Sista betalningsdag' : 'Sista betalningsdag'}
                        </label>
                        <Input
                          type="date"
                          value={newLastPayDate}
                          onChange={(e) => setNewLastPayDate(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setEditingExpenseId(null)}
                        >
                          {isEn ? 'Cancel' : 'Avbryt'}
                        </Button>
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => handleSaveDates(item)}
                        >
                          {isEn ? 'Save' : 'Spara'}
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
