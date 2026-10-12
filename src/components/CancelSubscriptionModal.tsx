import React, { useState, useEffect } from 'react';
import { BottomSheet, Button, Input } from './ui';
import {
  ExternalLink,
  Phone,
  Mail,
  Trash2,
  HelpCircle,
  Clock,
  Info,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { FixedExpense, Config } from '../types';
import { findCancellationDetails, CancellationInfo } from '../utils/cancellationHelper';
import { calculateLastPaymentDate, formatShortDate } from '../utils/cancellation';
import { feedback } from '../utils/feedback';
import { useScrollLock } from '../hooks/useScrollLock';
import { BudgetItemLogo } from './BudgetItem';
import { formatAmount } from '../utils/format';

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: FixedExpense;
  config: Config;
  onDeleteExpense?: (id: string) => void;
  onUpdateExpense?: (expense: FixedExpense) => void;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  expense,
  config,
  onDeleteExpense,
  onUpdateExpense,
}: CancelSubscriptionModalProps) {
  useScrollLock(isOpen);
  const isEn = config.language === 'en';

  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<CancellationInfo | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showMarkCancelled, setShowMarkCancelled] = useState(false);

  // Today's date ISO
  const todayIso = new Date().toISOString().split('T')[0];

  // Slutdatum (När abonnemanget upphör)
  const [endDate, setEndDate] = useState<string>(() => {
    if (expense?.cancellationDate) return expense.cancellationDate;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  // Uppsägningsdatum (När användaren vidtar åtgärden)
  const [noticeDate, setNoticeDate] = useState<string>(() => {
    if (expense?.cancelledAt) {
      try {
        return new Date(expense.cancelledAt).toISOString().split('T')[0];
      } catch {
        return todayIso;
      }
    }
    return todayIso;
  });

  // Sista betalningsdag (Explicit or computed)
  const [lastPayDate, setLastPayDate] = useState<string>(() => {
    if (expense?.lastPaymentDate) return expense.lastPaymentDate;
    const initialEndDate = expense?.cancellationDate || (() => {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return lastDay.toISOString().split('T')[0];
    })();
    return calculateLastPaymentDate(initialEndDate, expense?.deductionDay, expense?.frequency);
  });

  const [showCustomLastPay, setShowCustomLastPay] = useState(false);

  // Automatically update lastPayDate when endDate changes if user hasn't toggled custom override
  const handleEndDateChange = (newEnd: string) => {
    setEndDate(newEnd);
    if (!showCustomLastPay) {
      const computed = calculateLastPaymentDate(newEnd, expense?.deductionDay, expense?.frequency);
      setLastPayDate(computed);
    }
  };

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

  const handleSaveCancellation = () => {
    feedback.success();
    if (onUpdateExpense) {
      const noticeMs = noticeDate ? new Date(noticeDate).getTime() : Date.now();
      onUpdateExpense({
        ...expense,
        isCancelled: true,
        cancellationDate: endDate,
        cancelledAt: noticeMs,
        lastPaymentDate: lastPayDate || endDate,
      });
    }
    setShowMarkCancelled(false);
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Cancel subscription' : 'Säg upp abonnemang'}
      subtitle={isEn ? 'Instructions, guide & cancellation dates' : 'Instruktioner, villkor och uppsägningsdatum'}
      zIndex={140}
    >
      {/* Body */}
      <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
        {/* Target Item Card */}
        <div className="flex items-center justify-between p-3.5 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-color)] border-none shadow-none">
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
            <span className="text-sm font-bold font-amount tabular-nums text-[var(--text-primary)]">
              −{formatAmount(expense.amount, config.language)} {config.currency || 'kr'}
            </span>
            <span className="block text-secondary text-[var(--text-secondary)] font-medium">
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
                className="w-full h-12 px-4 rounded-[var(--radius-button,12px)] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-subtle hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Phone size={17} strokeWidth={2} />
                <span>{isEn ? `Call Kundservice: ${details.phoneNumber}` : `Ring kundservice: ${details.phoneNumber}`}</span>
              </a>
            ) : details.directActionType === 'email' && details.supportEmail ? (
              <a
                href={`mailto:${details.supportEmail}?subject=${encodeURIComponent(`Uppsägning av abonnemang - ${expense.name}`)}`}
                onClick={() => feedback.tap()}
                className="w-full h-12 px-4 rounded-[var(--radius-button,12px)] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-subtle hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Mail size={17} strokeWidth={2} />
                <span>{isEn ? `Email Cancellation: ${details.supportEmail}` : `Skicka uppsägning: ${details.supportEmail}`}</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={handleOpenLink}
                className="w-full h-12 px-4 rounded-[var(--radius-button,12px)] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-subtle hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <ExternalLink size={17} strokeWidth={2} />
                <span>{isEn ? 'Open cancellation portal' : 'Öppna uppsägningssidan'}</span>
              </button>
            )}

            {/* Step-by-Step Instructions */}
            {details.steps && details.steps.length > 0 && (
              <div className="p-4 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-color)] border border-subtle space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] tracking-tight">
                  <HelpCircle size={14} className="text-[var(--text-secondary)]" />
                  <span>{isEn ? 'How to cancel step-by-step' : 'Så här säger du upp avtalet'}</span>
                </div>

                <ol className="space-y-2.5">
                  {details.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                      <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] font-bold text-micro-label flex items-center justify-center shrink-0 mt-0.5 border border-subtle">
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
              <div className="p-3.5 rounded-card-nested bg-[var(--surface-color)] border border-subtle text-xs text-[var(--text-secondary)] space-y-2">
                {details.noticePeriod && (
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[var(--text-primary)]">{isEn ? 'Notice period: ' : 'Uppsägningstid: '}</span>
                      <span>{details.noticePeriod}</span>
                    </div>
                  </div>
                )}
                {details.tips && (
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[var(--text-primary)]">{isEn ? 'Tip: ' : 'Bra att veta: '}</span>
                      <span>{details.tips}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Support Article Link */}
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

        {/* Mark as Cancelled / Set Cancellation Dates */}
        {onUpdateExpense && (
          <div className="pt-2 border-t border-subtle space-y-2">
            {!showMarkCancelled ? (
              <Button
                type="button"
                onClick={() => setShowMarkCancelled(true)}
                variant="accent"
                size="md"
                fullWidth
                icon={<Clock size={15} />}
              >
                {expense.isCancelled
                  ? (isEn ? 'Edit cancellation dates' : 'Ändra uppsägningsdatum & betalningar')
                  : (isEn ? 'Mark as cancelled & set dates' : 'Markera som uppsagt & sätt datum')}
              </Button>
            ) : (
              <div className="p-4 rounded-card-nested bg-[var(--surface-color)] border border-subtle space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-[var(--text-primary)]" />
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {isEn ? 'Subscription cancellation details' : 'Datum för uppsägning och sista betalning'}
                  </p>
                </div>

                {/* 1. Slutdatum (Sista giltighetsdag - Primary input) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] block">
                    {isEn ? 'Slutdatum (När slutar abonnemanget gälla?)' : 'Slutdatum (När slutar abonnemanget gälla?)'}
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                  />
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {isEn
                      ? 'The last day your contract or access remains active.'
                      : 'Sista dagen avtalet eller tjänsten gäller.'}
                  </p>
                </div>

                {/* 2. Sista betalningsdag (Calculated with override option) */}
                <div className="space-y-1.5 pt-1 border-t border-subtle">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text-primary)] block">
                      {isEn ? 'Sista betalningsdag' : 'Sista betalningsdag'}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCustomLastPay(!showCustomLastPay)}
                      className="text-[11px] font-semibold text-[var(--accent-color)] hover:underline cursor-pointer"
                    >
                      {showCustomLastPay ? (isEn ? 'Auto-calculate' : 'Återställ automatisk') : (isEn ? 'Edit date' : 'Ändra sista betalningsdag')}
                    </button>
                  </div>

                  {showCustomLastPay ? (
                    <Input
                      type="date"
                      value={lastPayDate}
                      onChange={(e) => setLastPayDate(e.target.value)}
                    />
                  ) : (
                    <div className="px-3 py-2 rounded-lg bg-[var(--surface-muted)] text-xs font-medium text-[var(--text-primary)] flex items-center justify-between">
                      <span>{isEn ? 'Estimated last payment:' : 'Beräknad sista betalning:'}</span>
                      <span className="font-bold font-amount">{formatShortDate(lastPayDate, config.language)}</span>
                    </div>
                  )}
                </div>

                {/* 3. Uppsägningsdatum (När användaren sa upp det) */}
                <div className="space-y-1.5 pt-1 border-t border-subtle">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                    {isEn ? 'Uppsägningsdatum (När sades det upp?)' : 'Uppsägningsdatum (När sades det upp?)'}
                  </label>
                  <Input
                    type="date"
                    value={noticeDate}
                    onChange={(e) => setNoticeDate(e.target.value)}
                  />
                </div>

                {/* Budget impact explanation banner */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-[var(--text-primary)] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                    <CheckCircle2 size={13} />
                    <span>{isEn ? 'Budget Impact' : 'Påverkan på budgeten'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    {isEn
                      ? `This subscription will continue to be counted in your budget until its last payment on ${formatShortDate(lastPayDate, config.language)}, and then stop automatically.`
                      : `Abonnemanget kommer att räknas med i budgeten fram till sista betalningen ${formatShortDate(lastPayDate, config.language)}, och därefter automatiskt sluta dras.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={() => setShowMarkCancelled(false)}
                    variant="secondary"
                    size="sm"
                  >
                    {isEn ? 'Cancel' : 'Avbryt'}
                  </Button>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={handleSaveCancellation}
                  >
                    {isEn ? 'Save status' : 'Spara status'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Permanent Delete Option */}
        {onDeleteExpense && (
          <div className="pt-2 border-t border-subtle">
            {!showConfirmDelete ? (
              <Button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                variant="secondary"
                size="sm"
                fullWidth
                icon={<Trash2 size={14} />}
              >
                {isEn ? 'Remove permanently' : 'Ta bort permanent från budget'}
              </Button>
            ) : (
              <div className="p-4 rounded-card-nested bg-[var(--surface-color)] border border-subtle space-y-3">
                <p className="text-xs font-medium text-[var(--text-primary)] text-center">
                  {isEn ? 'Are you sure you want to remove this expense from your budget?' : 'Vill du ta bort denna fasta utgift från din framtida budget?'}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => setShowConfirmDelete(false)}
                    variant="secondary"
                    size="sm"
                  >
                    {isEn ? 'Keep' : 'Behåll'}
                  </Button>
                  <Button
                    type="button"
                    onClick={handleConfirmCancelAndDelete}
                    variant="danger"
                    size="sm"
                  >
                    {isEn ? 'Yes, remove' : 'Ja, ta bort'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
