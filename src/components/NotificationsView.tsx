import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Edit3, X } from 'lucide-react';
import { Button, IconButton, Input } from './ui';
import { AppNotification, Config } from '../types';
import { TranslationKey } from '../i18n';
import { BudgetItemLogo } from './BudgetItem';
import { formatAmount, parseAmount } from '../utils/format';
import { EmptyState } from './EmptyState';
import { feedback } from '../utils/feedback';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onOpenItem?: (item: any) => void;
  onConfirmStandard: (item: any, customAmount?: number) => void;
  onDismiss: (notificationId: string) => void;
  onBack?: () => void;
  currency: string;
  config: Config;
  t: (key: TranslationKey) => string;
}

export function NotificationsView({
  notifications,
  onOpenItem,
  onConfirmStandard,
  onDismiss,
  currency,
  config,
  t,
}: NotificationsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState<string>('');

  const handleStartEdit = (n: AppNotification) => {
    if (typeof feedback?.light === 'function') feedback.light();
    setEditingId(n.id);
    setCustomAmount(n.expectedAmount ? String(n.expectedAmount) : '');
  };

  const handleSaveCustom = (n: AppNotification) => {
    const parsed = parseAmount(customAmount);
    const finalAmount = !isNaN(parsed) && parsed > 0 ? parsed : Number(n.expectedAmount || 0);
    if (typeof feedback?.success === 'function') feedback.success();
    onConfirmStandard(n.item, finalAmount);
    setEditingId(null);
  };

  if (notifications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="py-12 px-2"
      >
        <EmptyState
          icon="check-circle"
          title={t('noNotifications')}
          description={
            config.language === 'en'
              ? 'All your variable bills and expenses are up to date for this period.'
              : 'Alla dina varierande räkningar och utgifter är uppdaterade för denna period.'
          }
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 pb-12"
    >
      {notifications.map((n) => {
        const todayDate = new Date().getDate();
        const isToday = n.deductionDay === todayDate;
        const isPast = n.deductionDay < todayDate;
        const isIncome = n.type === 'variable_income' || n.item?.budgetType === 'income';
        const isEditing = editingId === n.id;

        let statusBadgeText = '';
        let statusBadgeStyle = '';

        if (isIncome) {
          if (isToday) {
            statusBadgeText = config.language === 'en' ? 'Arrives today' : 'Kommer idag';
            statusBadgeStyle = 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)]';
          } else if (isPast) {
            statusBadgeText = config.language === 'en' ? `Arrived on the ${n.deductionDay}th` : `Kom den ${n.deductionDay}:e`;
            statusBadgeStyle = 'bg-[var(--warning-container)] text-[var(--warning-color)]';
          } else {
            statusBadgeText = config.language === 'en' ? `Arrives on the ${n.deductionDay}th` : `Kommer den ${n.deductionDay}:e`;
            statusBadgeStyle = 'bg-[var(--surface-muted)] text-[var(--text-secondary)]';
          }
        } else {
          if (isToday) {
            statusBadgeText = config.language === 'en' ? 'Due today' : 'Dras idag';
            statusBadgeStyle = 'bg-[var(--warning-container)] text-[var(--warning-color)]';
          } else if (isPast) {
            statusBadgeText = config.language === 'en' ? `Due on the ${n.deductionDay}th` : `Dras den ${n.deductionDay}:e`;
            statusBadgeStyle = 'bg-[var(--danger-container)] text-[var(--danger-color)]';
          } else {
            statusBadgeText = config.language === 'en' ? `Due on the ${n.deductionDay}th` : `Dras den ${n.deductionDay}:e`;
            statusBadgeStyle = 'bg-[var(--surface-muted)] text-[var(--text-secondary)]';
          }
        }

        return (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 sm:p-6 rounded-[var(--radius-card,16px)] bg-[var(--surface-color)] transition-all flex flex-col gap-4 relative shadow-xs"
          >
            {/* Top status bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0 shadow-xs [&_div]:w-9 [&_div]:h-9 [&_div]:rounded-full [&_img]:rounded-full [&_span]:text-xl">
                  <BudgetItemLogo
                    item={n.item}
                    type={n.item.budgetType === 'income' ? 'income' : 'expense'}
                    config={config}
                  />
                </div>
                <div className="min-w-0">
                  {n.item.budgetType === 'income' && (
                    <span className="text-micro-label font-semibold text-success block">
                      {config.language === 'en' ? 'Income' : 'Inkomst'}
                    </span>
                  )}
                  <span className="text-card-title font-bold text-[var(--text-primary)] leading-tight block truncate">
                    {n.item.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-3 py-1 rounded-full text-micro-label font-bold tracking-wide ${statusBadgeStyle}`}
                >
                  {statusBadgeText}
                </span>

                <IconButton
                  icon={<X size={15} />}
                  onClick={() => onDismiss(n.id)}
                  size="sm"
                  variant="ghost"
                  title={config.language === 'en' ? 'Dismiss for this period' : 'Avfärda för denna månad'}
                  aria-label={config.language === 'en' ? 'Dismiss for this period' : 'Avfärda'}
                  className="text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)]"
                />
              </div>
            </div>

            {/* Inline edit mode vs Action buttons */}
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-1"
                >
                  <Input
                    variant="amount"
                    currency={currency}
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCustom(n);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    placeholder={String(n.expectedAmount || 0)}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="accent"
                      size="md"
                      onClick={() => handleSaveCustom(n)}
                      icon={<Check size={16} strokeWidth={2.5} />}
                      fullWidth
                    >
                      {t('save')}
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => setEditingId(null)}
                      fullWidth
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="buttons"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1"
                >
                  <Button
                    type="button"
                    variant="accent"
                    size="md"
                    fullWidth
                    icon={<Edit3 size={15} strokeWidth={2} />}
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      if (onOpenItem) {
                        onOpenItem(n.item);
                      } else {
                        handleStartEdit(n);
                      }
                    }}
                  >
                    {config.language === 'en' ? 'Set amount' : 'Ange belopp'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    icon={<Check size={15} className="text-neutral-800 dark:text-white" strokeWidth={2.5} />}
                    onClick={() => {
                      if (typeof feedback?.success === 'function') feedback.success();
                      onConfirmStandard(n.item);
                    }}
                  >
                    {config.language === 'en'
                      ? `Keep (${formatAmount(n.expectedAmount)} ${currency})`
                      : `Behåll (${formatAmount(n.expectedAmount)} ${currency})`}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
