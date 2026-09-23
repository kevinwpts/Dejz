import React from 'react';
import { motion } from 'motion/react';
import { Check, Edit3, ArrowRight, X } from 'lucide-react';
import { AppNotification, Config } from '../types';
import { TranslationKey } from '../i18n';
import { BudgetItemLogo } from './BudgetItem';
import { formatAmount } from '../utils/format';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onOpenItem: (item: any) => void;
  onConfirmStandard: (item: any) => void;
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
  if (notifications.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3"
      >
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mb-1 shadow-inner">
          <Check size={28} strokeWidth={2.5} />
        </div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          {t('noNotifications')}
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed">
          {config.language === 'en'
            ? 'All your variable bills and expenses are up to date for this period.'
            : 'Alla dina varierande räkningar och utgifter är uppdaterade för denna period.'}
        </p>
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

        return (
          <motion.div
            key={n.id}
            layout
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 sm:p-6 rounded-[24px] bg-[var(--surface-color)] border border-[var(--border-color)] transition-all flex flex-col gap-4 relative shadow-sm"
          >
            {/* Top status bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[var(--surface-muted)] flex items-center justify-center flex-shrink-0 shadow-xs [&_div]:w-9 [&_div]:h-9 [&_div]:rounded-full [&_img]:rounded-full [&_span]:text-xl">
                  <BudgetItemLogo
                    item={n.item}
                    type={n.item.budgetType === 'income' ? 'income' : 'expense'}
                    config={config}
                  />
                </div>
                <div>
                  {n.item.budgetType === 'income' && (
                    <span className="text-xs font-semibold text-success block">
                      {config.language === 'en' ? 'Income' : 'Inkomst'}
                    </span>
                  )}
                  <span className="text-base font-bold text-[var(--text-primary)] leading-tight block">
                    {n.item.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide ${
                    isToday
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : isPast
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                  }`}
                >
                  {isToday
                    ? config.language === 'en' ? 'Due today' : 'Dras idag'
                    : isPast
                    ? config.language === 'en' ? `Due on the ${n.deductionDay}th` : `Dras den ${n.deductionDay}:e`
                    : config.language === 'en' ? `Due on the ${n.deductionDay}th` : `Dras den ${n.deductionDay}:e`}
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

            {/* Subtitle / Standard Amount */}
            <div className="flex items-center justify-between bg-[var(--surface-muted)]/60 px-4 py-2.5 rounded-[16px] text-xs">
              <span className="text-[var(--text-secondary)] font-medium">
                {config.language === 'en' ? 'Expected amount:' : 'Förväntat standardbelopp:'}
              </span>
              <span className="font-bold font-amount text-[var(--text-primary)]">
                {formatAmount(n.expectedAmount)} {currency}
              </span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => {
                  onOpenItem(n.item);
                }}
                className="w-full py-3 px-4 rounded-[14px] bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-xs cursor-pointer"
              >
                <Edit3 size={15} strokeWidth={2.2} />
                <span>{config.language === 'en' ? 'Set amount' : 'Ange belopp'}</span>
                <ArrowRight size={14} className="opacity-70" />
              </button>

              <button
                type="button"
                onClick={() => onConfirmStandard(n.item)}
                className="w-full py-3 px-4 rounded-[14px] bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[var(--surface-color)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Check size={15} className="text-emerald-500" strokeWidth={2.5} />
                <span>
                  {config.language === 'en'
                    ? `Keep standard (${formatAmount(n.expectedAmount)} ${currency})`
                    : `Behåll (${formatAmount(n.expectedAmount)} ${currency})`}
                </span>
              </button>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
