import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Edit3, X } from 'lucide-react';
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
          icon={Check}
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
      className="space-y-4 pb-12"
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
            statusBadgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
          } else {
            statusBadgeText = config.language === 'en' ? `Arrives on the ${n.deductionDay}th` : `Kommer den ${n.deductionDay}:e`;
            statusBadgeStyle = 'bg-[var(--surface-muted)] text-[var(--text-secondary)]';
          }
        } else {
          if (isToday) {
            statusBadgeText = config.language === 'en' ? 'Due today' : 'Dras idag';
            statusBadgeStyle = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
          } else if (isPast) {
            statusBadgeText = config.language === 'en' ? `Due on the ${n.deductionDay}th` : `Dras den ${n.deductionDay}:e`;
            statusBadgeStyle = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
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
            className="p-5 sm:p-6 rounded-[8px] bg-[var(--surface-color)] transition-all flex flex-col gap-4 relative shadow-xs"
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

                <button
                  type="button"
                  onClick={() => onDismiss(n.id)}
                  className="w-7 h-7 rounded-full text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-all flex items-center justify-center cursor-pointer"
                  title={config.language === 'en' ? 'Dismiss for this period' : 'Avfärda för denna månad'}
                  aria-label="Avfärda"
                >
                  <X size={15} />
                </button>
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
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCustom(n);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      placeholder={String(n.expectedAmount || 0)}
                      className="w-full h-12 bg-[var(--surface-muted)] border border-[var(--border-color)] rounded-[8px] px-4 pr-14 text-section-title font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent-color)] transition-all"
                    />
                    <span className="absolute right-4 text-micro-label font-bold text-[var(--text-secondary)] pointer-events-none">
                      {currency}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveCustom(n)}
                      className="h-11 rounded-[8px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-label flex items-center justify-center gap-1.5 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                    >
                      <Check size={16} strokeWidth={2.5} />
                      <span>{t('save')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="h-11 rounded-[8px] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-semibold text-label flex items-center justify-center transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <span>{t('cancel')}</span>
                    </button>
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
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.light === 'function') feedback.light();
                      if (onOpenItem) {
                        onOpenItem(n.item);
                      } else {
                        handleStartEdit(n);
                      }
                    }}
                    className="w-full py-3 px-4 rounded-[8px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-label flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
                  >
                    <Edit3 size={15} strokeWidth={2} />
                    <span>{config.language === 'en' ? 'Set amount' : 'Ange belopp'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (typeof feedback?.success === 'function') feedback.success();
                      onConfirmStandard(n.item);
                    }}
                    className="w-full py-3 px-4 rounded-[8px] bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold text-label flex items-center justify-center gap-1.5 hover:bg-[var(--surface-color)] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Check size={15} className="text-neutral-800 dark:text-white" strokeWidth={2.5} />
                    <span>
                      {config.language === 'en'
                        ? `Keep (${formatAmount(n.expectedAmount)} ${currency})`
                        : `Behåll (${formatAmount(n.expectedAmount)} ${currency})`}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
