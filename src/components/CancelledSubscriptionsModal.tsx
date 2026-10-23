import React, { useState } from 'react';
import { BottomSheet, Card, IconButton, EmptyState } from './ui';
import { Trash2 } from 'lucide-react';

import { FixedExpense, Config } from '../types';
import { formatAmount } from '../utils/format';
import {
  getCancelledListSecondaryText,
  formatShortDate,
} from '../utils/cancellation';
import { useScrollLock } from '../hooks/useScrollLock';
import { BudgetItemLogo } from './BudgetItem';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';

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
  const lang = config?.language || 'sv';
  const isEn = lang === 'en';
  const [editingExpense, setEditingExpense] = useState<FixedExpense | null>(null);

  if (!isOpen) return null;

  const cancelledItems = (fixedExpenses || []).filter((e) => !!e.isCancelled);

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={isEn ? 'Cancelled subscriptions' : 'Uppsagda abonnemang'}
        subtitle={
          isEn
            ? 'Overview of cancelled and ended services'
            : 'Översikt över uppsagda och avslutade tjänster'
        }
        size="lg"
        zIndex={140}
      >
        <div className="p-5 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {cancelledItems.length === 0 ? (
            <EmptyState
              title={
                isEn
                  ? 'No cancelled subscriptions'
                  : 'Inga uppsagda abonnemang'
              }
              description={
                isEn
                  ? 'When you register a cancelled subscription in Dejz, it appears here.'
                  : 'När du registrerar en uppsägning i Dejz visas den här.'
              }
            />
          ) : (
            <Card variant="default" padding="none" className="divide-y divide-subtle overflow-hidden">
              {cancelledItems.map((item) => {
                const rawAmount = Number(item.amount) || 0;
                const monthlyAmount =
                  item.frequency === 'Kvartalsvis'
                    ? Math.round(rawAmount / 3)
                    : item.frequency === 'Halvårsvis'
                    ? Math.round(rawAmount / 6)
                    : item.frequency === 'Årsvis'
                    ? Math.round(rawAmount / 12)
                    : rawAmount;

                const secondaryText = getCancelledListSecondaryText(item, lang);
                const validUntilText = item.cancellationDate
                  ? (isEn
                      ? `Valid until ${formatShortDate(item.cancellationDate, lang)}`
                      : `Gäller till ${formatShortDate(item.cancellationDate, lang)}`)
                  : null;

                return (
                  <div
                    key={item.id}
                    onClick={() => setEditingExpense(item)}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <BudgetItemLogo item={item} type="expense" config={config} />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                          {item.name}
                        </h4>
                        <p className="text-secondary text-[var(--text-secondary)] truncate mt-0.5">
                          {[secondaryText, validUntilText].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-list-amount whitespace-nowrap text-[var(--text-secondary)]">
                        <span className="tabular-nums">
                          {formatAmount(monthlyAmount, lang)}
                        </span>
                        <span className="text-secondary opacity-80 font-normal ml-1">
                          {config?.currency || 'kr'}
                          <span className="text-micro-label opacity-70 ml-0.5">
                            /{isEn ? 'mo' : 'mån'}
                          </span>
                        </span>
                      </span>

                      <div onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          variant="danger"
                          size="xs"
                          icon={<Trash2 size={14} />}
                          onClick={() => onDeleteExpense(item.id)}
                          aria-label={isEn ? 'Delete permanently' : 'Ta bort'}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </div>
      </BottomSheet>

      {editingExpense && (
        <CancelSubscriptionModal
          isOpen={true}
          mode="register"
          onClose={() => setEditingExpense(null)}
          expense={editingExpense}
          config={config}
          onUpdateExpense={(updated) => {
            onUpdateExpense(updated);
            setEditingExpense(null);
          }}
        />
      )}
    </>
  );
}
