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
  const [cancelDate, setCancelDate] = useState<string>(() => {
    if (expense?.cancellationDate) return expense.cancellationDate;
    // Default to end of current month
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

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

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Cancel subscription' : 'Säg upp abonnemang'}
      subtitle={isEn ? 'Instructions and direct link' : 'Instruktioner och direktlänk'}
      zIndex={140}
    >

          {/* Body */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
            {/* Target Item Card */}
            <div className="flex items-center justify-between p-3.5 rounded-[8px] bg-[var(--surface-color)] border-none shadow-none">
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
                    className="w-full h-12 px-4 rounded-[8px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-subtle hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Phone size={17} strokeWidth={2} />
                    <span>{isEn ? `Call Kundservice: ${details.phoneNumber}` : `Ring kundservice: ${details.phoneNumber}`}</span>
                  </a>
                ) : details.directActionType === 'email' && details.supportEmail ? (
                  <a
                    href={`mailto:${details.supportEmail}?subject=${encodeURIComponent(`Uppsägning av abonnemang - ${expense.name}`)}`}
                    onClick={() => feedback.tap()}
                    className="w-full h-12 px-4 rounded-[8px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-subtle hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Mail size={17} strokeWidth={2} />
                    <span>{isEn ? `Email Cancellation: ${details.supportEmail}` : `Skicka uppsägning: ${details.supportEmail}`}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenLink}
                    className="w-full h-12 px-4 rounded-[8px] bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-sm shadow-subtle hover:opacity-90 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ExternalLink size={17} strokeWidth={2} />
                    <span>{isEn ? 'Open cancellation portal' : 'Öppna uppsägningssidan'}</span>
                  </button>
                )}

                {/* Step-by-Step Instructions */}
                {details.steps && details.steps.length > 0 && (
                  <div className="p-4 rounded-[8px] bg-[var(--surface-color)] border border-subtle space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] tracking-tight">
                      <HelpCircle size={14} className="text-[var(--text-secondary)]" />
                      <span>{isEn ? 'How to cancel step-by-step' : 'Så här säger du upp avtalet'}</span>
                    </div>

                    <ol className="space-y-2.5">
                      {details.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
                          <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] font-bold text-[10.5px] flex items-center justify-center shrink-0 mt-0.5 border border-subtle">
                            {idx + 1}
                          </span>
                          <span className="text-[var(--text-primary)]">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Notice Period & Tips Box (clean neutral surface) */}
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

            {/* Mark as Cancelled with Date Section */}
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
                    {expense.isCancelled ? (isEn ? 'Edit cancellation date' : 'Ändra uppsägningsdatum') : (isEn ? 'Mark as cancelled & set date' : 'Markera som uppsagt & sätt sista dag')}
                  </Button>
                ) : (
                  <div className="p-4 rounded-card-nested bg-[var(--surface-color)] border border-subtle space-y-3">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {isEn ? 'When does this subscription expire?' : 'När sägs abonnemanget upp / sista giltighetsdag?'}
                    </p>
                    <Input
                      type="date"
                      label={isEn ? 'Uppsägningsdatum' : 'Sista dag (uppsägningsdatum)'}
                      value={cancelDate}
                      onChange={(e) => setCancelDate(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2 pt-1">
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
                        onClick={() => {
                          feedback.success();
                          onUpdateExpense({
                            ...expense,
                            isCancelled: true,
                            cancellationDate: cancelDate,
                            cancelledAt: expense.cancelledAt || Date.now(),
                          });
                          setShowMarkCancelled(false);
                          onClose();
                        }}
                      >
                        {isEn ? 'Save status' : 'Spara status'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Delete Section */}
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

