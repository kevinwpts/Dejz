import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ExternalLink,
  Phone,
  Mail,
  ShieldAlert,
  Trash2,
  HelpCircle,
  Clock,
  Info,
} from 'lucide-react';
import { FixedExpense, Config } from '../types';
import { findCancellationDetails, CancellationInfo } from '../utils/cancellationHelper';
import { feedback } from '../utils/feedback';
import { useScrollLock } from '../hooks/useScrollLock';
import { BudgetItemLogo } from './BudgetItem';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: FixedExpense;
  config: Config;
  onDeleteExpense?: (id: string) => void;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  expense,
  config,
  onDeleteExpense,
}: CancelSubscriptionModalProps) {
  useScrollLock(isOpen);
  const isEn = config.language === 'en';

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<CancellationInfo | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (!isOpen || !expense) return;

    let isMounted = true;
    setLoading(true);

    const categoryName = typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || '');

    findCancellationDetails(expense.name, categoryName, config.language)
      .then((info) => {
        if (isMounted) {
          setDetails(info);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error finding cancellation details:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, expense, config.language]);

  if (!isOpen) return null;

  const handleOpenLink = () => {
    feedback.tap();
    if (details?.cancelUrl) {
      window.open(details.cancelUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleConfirmCancelAndDelete = () => {
    feedback.success();
    if (onDeleteExpense) {
      onDeleteExpense(expense.id);
    }
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
        {/* Backdrop click */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-[var(--surface-color)] rounded-t-[28px] sm:rounded-[28px] border border-[var(--border-color)] shadow-2xl max-h-[90vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--border-color)]/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <ShieldAlert size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] tracking-tight">
                  {isEn ? 'Cancel Subscription / Contract' : 'Säg upp abonnemang & avtal'}
                </h3>
                <p className="text-[11.5px] text-[var(--text-secondary)]">
                  {isEn ? 'Direct link and step-by-step guide' : 'Direktlänk och steg-för-steg-guide'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer"
              aria-label="Stäng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* Target Item Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-muted)]/60 border border-[var(--border-color)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--surface-color)] flex items-center justify-center shrink-0 border border-[var(--border-color)]/80 overflow-hidden [&_div]:w-8 [&_div]:h-8 [&_div]:rounded-full [&_img]:rounded-full">
                  <BudgetItemLogo item={expense} type="expense" config={config} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-bold text-[var(--text-primary)] truncate">
                    {expense.name}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || (isEn ? 'Fixed expense' : 'Fast utgift'))}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm font-bold font-amount text-rose-500">
                  -{expense.amount} {config.currency || 'kr'}
                </span>
                <span className="block text-[10.5px] text-[var(--text-secondary)]">
                  /{isEn ? 'mo' : 'mån'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-10 h-10 rounded-full border-3 border-[var(--accent-color)] border-t-transparent animate-spin" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {isEn ? 'Searching for cancellation portal and guide...' : 'Hittar officiell uppsägningslänk och villkor...'}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {isEn ? 'Scanning direct links & customer service...' : 'Söker efter direktlänk till kontoinställningar...'}
                </p>
              </div>
            ) : details ? (
              <div className="space-y-4">
                {/* Primary Direct Action Button */}
                {details.directActionType === 'phone' && details.phoneNumber ? (
                  <a
                    href={`tel:${details.phoneNumber.replace(/\s+/g, '')}`}
                    onClick={() => feedback.tap()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Phone size={17} strokeWidth={2.4} />
                    <span>{isEn ? `Call Kundservice: ${details.phoneNumber}` : `Ring kundservice: ${details.phoneNumber}`}</span>
                  </a>
                ) : details.directActionType === 'email' && details.supportEmail ? (
                  <a
                    href={`mailto:${details.supportEmail}?subject=${encodeURIComponent(`Uppsägning av abonnemang - ${expense.name}`)}`}
                    onClick={() => feedback.tap()}
                    className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Mail size={17} strokeWidth={2.4} />
                    <span>{isEn ? `Email Cancellation: ${details.supportEmail}` : `Skicka uppsägning: ${details.supportEmail}`}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenLink}
                    className="w-full py-3.5 px-4 rounded-2xl bg-[var(--accent-color)] text-[var(--text-on-accent)] font-bold text-sm shadow-md hover:opacity-95 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ExternalLink size={17} strokeWidth={2.4} />
                    <span>{isEn ? 'Open Cancellation Portal' : 'Öppna uppsägningssidan'}</span>
                  </button>
                )}

                {/* Step-by-Step Instructions */}
                {details.steps && details.steps.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-color)]/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      <HelpCircle size={14} className="text-[var(--accent-color)]" />
                      <span>{isEn ? 'How to cancel step-by-step' : 'Så här säger du upp avtalet'}</span>
                    </div>

                    <ol className="space-y-2.5">
                      {details.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
                          <span className="w-5 h-5 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-[var(--border-color)]/70">
                            {idx + 1}
                          </span>
                          <span className="text-[var(--text-primary)]/90">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Notice Period & Tips Box */}
                {(details.noticePeriod || details.tips) && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    {details.noticePeriod && (
                      <div className="flex items-start gap-2">
                        <Clock size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isEn ? 'Notice period: ' : 'Uppsägningstid: '}</span>
                          <span>{details.noticePeriod}</span>
                        </div>
                      </div>
                    )}
                    {details.tips && (
                      <div className="flex items-start gap-2">
                        <Info size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">{isEn ? 'Tip: ' : 'Bra att veta: '}</span>
                          <span>{details.tips}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Extra Secondary Action: Support Article if available */}
                {details.supportUrl && (
                  <div className="text-center">
                    <a
                      href={details.supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-color)] underline inline-flex items-center gap-1 transition-colors"
                    >
                      <span>{isEn ? 'Read full cancellation policy' : 'Läs fullständiga uppsägningsvillkor'}</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                )}
              </div>
            ) : null}

            {/* Confirm Delete Section */}
            {onDeleteExpense && (
              <div className="pt-2 border-t border-[var(--border-color)]/60">
                {!showConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>{isEn ? 'Already cancelled? Remove from budget' : 'Redan uppsagt? Ta bort från budgeten'}</span>
                  </button>
                ) : (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2.5">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 text-center">
                      {isEn ? 'Are you sure you want to remove this expense from your budget?' : 'Vill du ta bort denna fasta utgift från din framtida budget?'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="py-2 px-3 rounded-lg bg-[var(--surface-color)] text-[var(--text-primary)] text-xs font-medium border border-[var(--border-color)] cursor-pointer"
                      >
                        {isEn ? 'Keep in budget' : 'Behåll'}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancelAndDelete}
                        className="py-2 px-3 rounded-lg bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-500 cursor-pointer"
                      >
                        {isEn ? 'Yes, remove' : 'Ja, ta bort'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-color)]/60 bg-[var(--surface-color)] flex justify-end shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[var(--surface-muted)] hover:bg-[var(--surface-muted)]/80 text-[var(--text-primary)] text-sm font-semibold border border-[var(--border-color)] active:scale-95 transition-all cursor-pointer"
            >
              {isEn ? 'Close' : 'Stäng'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
