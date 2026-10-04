import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ExternalLink,
  Phone,
  Mail,
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
      <div className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
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
          className="relative w-full max-w-lg bg-[var(--bg-color)] rounded-t-[28px] sm:rounded-[28px] border-none shadow-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col z-10 overflow-hidden font-sans"
        >
          {/* Drag Handle */}
          <div className="w-10 h-1 bg-black/20 dark:bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-3 sm:pt-4 pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-primary)]">
                {isEn ? 'Show how to cancel' : 'Visa hur du säger upp'}
              </h3>
              <p className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">
                {isEn ? 'Instructions and link to provider' : 'Instruktioner och länk till leverantören'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.06] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer border-none shadow-none"
              aria-label="Stäng"
            >
              <X size={17} strokeWidth={2.2} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* Target Item Card */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-color)] border-none shadow-none">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-color)] flex items-center justify-center shrink-0 border-none overflow-hidden [&_div]:w-8 [&_div]:h-8 [&_div]:rounded-full [&_img]:rounded-full">
                  <BudgetItemLogo item={expense} type="expense" config={config} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[15px] font-bold text-[var(--text-primary)] truncate">
                    {expense.name}
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">
                    {typeof expense.category === 'object' ? (expense.category as any)?.name : (expense.category || (isEn ? 'Fixed expense' : 'Fast utgift'))}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-sm font-bold font-amount tabular-nums text-rose-500">
                  -{expense.amount} {config.currency || 'kr'}
                </span>
                <span className="block text-[10.5px] text-[var(--text-secondary)] font-medium">
                  /{isEn ? 'mo' : 'mån'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-[var(--text-primary)] border-t-transparent animate-spin" />
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
                    className="w-full h-12 px-4 rounded-[14px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-none flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Phone size={17} strokeWidth={2.4} />
                    <span>{isEn ? `Call Kundservice: ${details.phoneNumber}` : `Ring kundservice: ${details.phoneNumber}`}</span>
                  </a>
                ) : details.directActionType === 'email' && details.supportEmail ? (
                  <a
                    href={`mailto:${details.supportEmail}?subject=${encodeURIComponent(`Uppsägning av abonnemang - ${expense.name}`)}`}
                    onClick={() => feedback.tap()}
                    className="w-full h-12 px-4 rounded-[14px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-none flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Mail size={17} strokeWidth={2.4} />
                    <span>{isEn ? `Email Cancellation: ${details.supportEmail}` : `Skicka uppsägning: ${details.supportEmail}`}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenLink}
                    className="w-full h-12 px-4 rounded-[14px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-sm hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ExternalLink size={17} strokeWidth={2.4} />
                    <span>{isEn ? 'Open cancellation portal' : 'Öppna uppsägningssidan'}</span>
                  </button>
                )}

                {/* Step-by-Step Instructions */}
                {details.steps && details.steps.length > 0 && (
                  <div className="p-4 rounded-[16px] bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/[0.08] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] tracking-tight">
                      <HelpCircle size={14} className="text-[var(--text-primary)]" />
                      <span>{isEn ? 'How to cancel step-by-step' : 'Så här säger du upp avtalet'}</span>
                    </div>

                    <ol className="space-y-2.5">
                      {details.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                          <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-[#222222] text-[var(--text-primary)] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-black/10 dark:border-white/10">
                            {idx + 1}
                          </span>
                          <span className="text-[var(--text-primary)]">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Notice Period & Tips Box */}
                {(details.noticePeriod || details.tips) && (
                  <div className="p-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
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
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline inline-flex items-center gap-1 transition-colors font-medium"
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
              <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                {!showConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-3 px-4 rounded-[14px] bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Trash2 size={14} />
                    <span>{isEn ? 'Already cancelled? Remove from budget' : 'Redan uppsagt? Ta bort från budgeten'}</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-[16px] bg-rose-500/10 border border-rose-500/20 space-y-3">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 text-center">
                      {isEn ? 'Are you sure you want to remove this expense from your budget?' : 'Vill du ta bort denna fasta utgift från din framtida budget?'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="py-2.5 px-3 rounded-[12px] bg-white dark:bg-[#222222] text-[var(--text-primary)] text-xs font-semibold border border-black/5 dark:border-white/5 cursor-pointer active:scale-[0.98]"
                      >
                        {isEn ? 'Keep in budget' : 'Behåll'}
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmCancelAndDelete}
                        className="py-2.5 px-3 rounded-[12px] bg-rose-600 text-white text-xs font-semibold shadow-none hover:bg-rose-500 cursor-pointer active:scale-[0.98]"
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
          <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1C] flex justify-end shrink-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 h-11 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-primary)] text-sm font-semibold border border-black/5 dark:border-white/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
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
