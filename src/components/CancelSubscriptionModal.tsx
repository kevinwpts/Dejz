import React, { useState, useEffect, useRef } from 'react';
import { BottomSheet, Button } from './ui';
import {
  ExternalLink,
  Phone,
  Mail,
  HelpCircle,
  Clock,
  Info,
  RotateCcw,
  Calendar,
  Check,
  X,
} from 'lucide-react';
import { FixedExpense, Config } from '../types';
import { findCancellationDetails, CancellationInfo } from '../utils/cancellationHelper';
import { formatShortDate, getLastPaymentDate } from '../utils/cancellation';
import { feedback } from '../utils/feedback';
import { useScrollLock } from '../hooks/useScrollLock';
import { formatAmount } from '../utils/format';

export type PaymentRemainingChoice = 'none' | 'remaining' | null;

export interface CancellationFormValues {
  paymentChoice: PaymentRemainingChoice;
  lastPaymentDate: string;
  serviceEndDate?: string;
}

interface CancellationFormFieldsProps {
  values: CancellationFormValues;
  onChange: (next: CancellationFormValues) => void;
  amount: number;
  isVariable?: boolean;
  currency: string;
  language: string;
  isAlreadyCancelled?: boolean;
  onRestoreActive?: () => void;
  showHeader?: boolean;
  onCancelInline?: () => void;
}

export function isCancellationFormValid(values: CancellationFormValues): boolean {
  if (values.paymentChoice === 'none') return true;
  if (values.paymentChoice === 'remaining') {
    return Boolean(values.lastPaymentDate && values.lastPaymentDate.trim().length > 0);
  }
  return false;
}

function ClickableDateField({
  value,
  onChange,
  language,
  allowClear = false,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  language: string;
  allowClear?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isEn = language === 'en';
  const hasValue = Boolean(value && value.trim().length > 0);

  const formattedDisplay = hasValue
    ? (() => {
        const parts = value.split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          const locale =
            language === 'en'
              ? 'en-US'
              : language === 'no'
              ? 'nb-NO'
              : language === 'da'
              ? 'da-DK'
              : language === 'fi'
              ? 'fi-FI'
              : 'sv-SE';
          return d.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
        return value;
      })()
    : '';

  return (
    <div className="relative flex items-center w-full">
      <div
        onClick={() => {
          feedback.tap();
          if (inputRef.current) {
            try {
              (inputRef.current as any).showPicker?.();
            } catch {
              // Fallback to native input click
            }
            inputRef.current.focus();
          }
        }}
        className="w-full min-h-[42px] px-3.5 py-2 rounded-card-nested bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar
            size={15}
            strokeWidth={2}
            className={
              hasValue
                ? 'text-[var(--accent-color)] shrink-0'
                : 'text-[var(--text-secondary)] shrink-0'
            }
          />
          <span
            className={
              hasValue
                ? 'text-sm font-medium text-[var(--text-primary)] tabular-nums truncate'
                : 'text-sm font-medium text-[var(--text-secondary)] truncate'
            }
          >
            {hasValue ? formattedDisplay : isEn ? 'Select date' : 'Välj datum'}
          </span>
        </div>
      </div>

      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            (e.currentTarget as any).showPicker?.();
          } catch {
            // Ignore if showPicker is unsupported
          }
        }}
        aria-label={isEn ? 'Select date' : 'Välj datum'}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      {allowClear && hasValue && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            feedback.tap();
            onChange('');
          }}
          title={isEn ? 'Clear date' : 'Rensa datum'}
          aria-label={isEn ? 'Clear date' : 'Rensa datum'}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
        >
          <X size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

export function CancellationFormFields({
  values,
  onChange,
  amount,
  isVariable,
  currency,
  language,
  isAlreadyCancelled,
  onRestoreActive,
  showHeader = false,
  onCancelInline,
}: CancellationFormFieldsProps) {
  const isEn = language === 'en';
  const formattedAmt = formatAmount(amount || 0, language);

  const showSummary =
    values.paymentChoice === 'none' ||
    (values.paymentChoice === 'remaining' && Boolean(values.lastPaymentDate)) ||
    Boolean(values.serviceEndDate);

  return (
    <div className="space-y-3 text-left">
      {showHeader && (
        <div className="flex items-start justify-between gap-3 pb-0.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-section-title font-bold text-[var(--text-primary)]">
              {isEn ? 'Register cancellation' : 'Registrera uppsägning'}
            </h3>
            <p className="text-secondary text-[var(--text-secondary)] mt-0.5 leading-snug break-words whitespace-normal">
              {isEn
                ? 'This updates your budget in Dejz. The service must be cancelled with the provider.'
                : 'Detta ändrar din budget i Dejz. Tjänsten behöver vara uppsagd hos företaget.'}
            </p>
          </div>
          {onCancelInline && (
            <button
              type="button"
              onClick={onCancelInline}
              className="text-label font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 rounded-[var(--radius-button-sm,10px)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            >
              {isEn ? 'Cancel' : 'Avbryt'}
            </button>
          )}
        </div>
      )}

      {/* Question: Återstår några betalningar? */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-[var(--text-primary)] block">
          {isEn ? 'Are there any remaining payments?' : 'Återstår några betalningar?'}
        </label>

        {/* Compact Row Choices matching existing app row selection style */}
        <div className="rounded-card-nested bg-[var(--surface-color)] divide-y divide-subtle overflow-hidden">
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onChange({
                ...values,
                paymentChoice: 'none',
              });
            }}
            className={`w-full px-3.5 py-2.5 min-h-[42px] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:scale-[0.99] ${
              values.paymentChoice === 'none'
                ? 'bg-black/[0.03] dark:bg-white/[0.05]'
                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
            }`}
          >
            <span
              className={`text-sm ${
                values.paymentChoice === 'none'
                  ? 'font-semibold text-[var(--text-primary)]'
                  : 'font-medium text-[var(--text-primary)]'
              }`}
            >
              {isEn ? 'No, no more payments' : 'Nej, inga fler betalningar'}
            </span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                values.paymentChoice === 'none'
                  ? 'bg-[var(--accent-color)] text-[var(--on-accent,#fff)]'
                  : 'border border-[var(--border-strong)]'
              }`}
            >
              {values.paymentChoice === 'none' && <Check size={10} strokeWidth={3} />}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              feedback.tap();
              onChange({
                ...values,
                paymentChoice: 'remaining',
              });
            }}
            className={`w-full px-3.5 py-2.5 min-h-[42px] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer active:scale-[0.99] ${
              values.paymentChoice === 'remaining'
                ? 'bg-black/[0.03] dark:bg-white/[0.05]'
                : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
            }`}
          >
            <span
              className={`text-sm ${
                values.paymentChoice === 'remaining'
                  ? 'font-semibold text-[var(--text-primary)]'
                  : 'font-medium text-[var(--text-primary)]'
              }`}
            >
              {isEn ? 'Yes, payments remain' : 'Ja, betalningar återstår'}
            </span>
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                values.paymentChoice === 'remaining'
                  ? 'bg-[var(--accent-color)] text-[var(--on-accent,#fff)]'
                  : 'border border-[var(--border-strong)]'
              }`}
            >
              {values.paymentChoice === 'remaining' && <Check size={10} strokeWidth={3} />}
            </div>
          </button>
        </div>
      </div>

      {/* Mandatory Last Payment Date when "Ja, betalningar återstår" is selected */}
      {values.paymentChoice === 'remaining' && (
        <div className="space-y-1">
          <label className="text-sm font-semibold text-[var(--text-primary)] block">
            {isEn ? 'Final payment date' : 'Sista betalningsdatum'}
          </label>
          <ClickableDateField
            value={values.lastPaymentDate}
            onChange={(val) =>
              onChange({
                ...values,
                lastPaymentDate: val,
              })
            }
            language={language}
          />
          <p className="text-secondary text-[var(--text-secondary)]">
            {isEn
              ? 'The last time you will pay for the service.'
              : 'Den sista gången du ska betala för tjänsten.'}
          </p>
        </div>
      )}

      {/* Short Neutral Summary */}
      {showSummary && (
        <div className="p-3 rounded-card-nested bg-[var(--surface-color)] space-y-0.5 text-secondary text-[var(--text-secondary)]">
          {values.paymentChoice === 'none' && (
            <p className="font-medium text-[var(--text-primary)]">
              {isEn ? 'No more payments are planned.' : 'Inga fler betalningar planeras.'}
            </p>
          )}

          {values.paymentChoice === 'remaining' && values.lastPaymentDate && (
            <p className="font-medium text-[var(--text-primary)]">
              {isVariable
                ? isEn
                  ? `Final payment: approx. ${formattedAmt} ${currency} on ${formatShortDate(values.lastPaymentDate, language)} (estimated amount).`
                  : `Sista betalning: ca ${formattedAmt} ${currency} den ${formatShortDate(values.lastPaymentDate, language)} (uppskattat belopp).`
                : isEn
                ? `Final payment: ${formattedAmt} ${currency} on ${formatShortDate(values.lastPaymentDate, language)}.`
                : `Sista betalning: ${formattedAmt} ${currency} den ${formatShortDate(values.lastPaymentDate, language)}.`}
            </p>
          )}
        </div>
      )}

      {/* Secondary Action: Restore to active in Dejz */}
      {isAlreadyCancelled && onRestoreActive && (
        <div className="pt-2 border-t border-divider space-y-1">
          <button
            type="button"
            onClick={onRestoreActive}
            className="w-full py-2 px-3 rounded-btn bg-[var(--surface-color)] hover:bg-black/5 dark:hover:bg-white/5 text-body font-medium text-[var(--text-primary)] flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <RotateCcw size={14} />
            <span>{isEn ? 'Restore to active in Dejz' : 'Återställ till aktiv i Dejz'}</span>
          </button>
          <p className="text-label text-[var(--text-secondary)] text-center">
            {isEn
              ? 'This only changes the status in Dejz.'
              : 'Detta ändrar endast status i Dejz.'}
          </p>
        </div>
      )}
    </div>
  );
}

interface CancelSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: FixedExpense;
  config: Config;
  mode?: 'register' | 'guide';
  onDeleteExpense?: (id: string) => void;
  onUpdateExpense?: (expense: FixedExpense) => void;
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  expense,
  config,
  mode = 'register',
  onUpdateExpense,
}: CancelSubscriptionModalProps) {
  useScrollLock(isOpen);
  const lang = config?.language || 'sv';
  const isEn = lang === 'en';
  const currency = config?.currency || 'kr';

  // Form state for 'register' mode: no option pre-selected the first time!
  const [formValues, setFormValues] = useState<CancellationFormValues>(() => {
    if (expense?.isCancelled) {
      const isNoMore = Boolean(
        expense.hasNoMorePayments || expense.cancellationScenario === 'already_paid'
      );
      return {
        paymentChoice: isNoMore ? 'none' : 'remaining',
        lastPaymentDate: isNoMore ? '' : (expense.lastPaymentDate || getLastPaymentDate(expense) || ''),
      };
    }
    return {
      paymentChoice: null,
      lastPaymentDate: '',
    };
  });

  // Reset form state whenever modal opens or expense changes
  useEffect(() => {
    if (!isOpen || !expense) return;
    if (expense.isCancelled) {
      const isNoMore = Boolean(
        expense.hasNoMorePayments || expense.cancellationScenario === 'already_paid'
      );
      setFormValues({
        paymentChoice: isNoMore ? 'none' : 'remaining',
        lastPaymentDate: isNoMore ? '' : (expense.lastPaymentDate || getLastPaymentDate(expense) || ''),
      });
    } else {
      setFormValues({
        paymentChoice: null,
        lastPaymentDate: '',
      });
    }
  }, [isOpen, expense]);

  // Guide details state for 'guide' mode
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [details, setDetails] = useState<CancellationInfo | null>(null);

  useEffect(() => {
    if (!isOpen || !expense || mode !== 'guide') return;

    let isMounted = true;
    setLoadingGuide(true);

    const categoryName =
      typeof expense.category === 'object'
        ? (expense.category as any)?.name
        : expense.category || '';

    findCancellationDetails(expense.name, categoryName, lang)
      .then((info) => {
        if (isMounted) {
          setDetails(info);
          setLoadingGuide(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingGuide(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, expense, lang, mode]);

  if (!isOpen) return null;

  const handleSaveCancellation = () => {
    if (!isCancellationFormValid(formValues)) return;
    feedback.success();
    if (onUpdateExpense) {
      const isNoMore = formValues.paymentChoice === 'none';
      const trimmedLastPay = formValues.lastPaymentDate.trim();
      const resolvedLastPay = isNoMore ? undefined : (trimmedLastPay || undefined);

      onUpdateExpense({
        ...expense,
        isCancelled: true,
        cancellationScenario: isNoMore ? 'already_paid' : 'one_remaining',
        hasNoMorePayments: isNoMore,
        cancellationDate: undefined,
        cancelledAt: expense?.cancelledAt || Date.now(),
        lastPaymentDate: resolvedLastPay,
      });
    }
    onClose();
  };

  const handleRestoreActive = () => {
    feedback.success();
    if (onUpdateExpense) {
      onUpdateExpense({
        ...expense,
        isCancelled: false,
        cancellationScenario: undefined,
        hasNoMorePayments: false,
        cancellationDate: undefined,
        cancelledAt: undefined,
        lastPaymentDate: undefined,
      });
    }
    onClose();
  };

  if (mode === 'guide') {
    return (
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        title={isEn ? 'How to cancel' : 'Så säger du upp'}
        subtitle={
          isEn
            ? 'Instructions and link to the company'
            : 'Instruktioner och länk till företaget'
        }
        size="md"
        zIndex={160}
      >
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Mandatory Clarification Notice */}
          <div className="p-3.5 rounded-card-nested bg-[var(--surface-color)] text-secondary text-[var(--text-secondary)]">
            {isEn
              ? 'You cancel the service yourself with the company. Dejz records the cancellation in your budget.'
              : 'Du säger själv upp tjänsten hos företaget. Dejz registrerar uppsägningen i din budget.'}
          </div>

          {loadingGuide ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-7 h-7 rounded-full border-2 border-[var(--text-primary)] border-t-transparent animate-spin" />
              <p className="text-secondary text-[var(--text-secondary)]">
                {isEn
                  ? 'Loading instructions...'
                  : 'Hämtar instruktioner och länk...'}
              </p>
            </div>
          ) : details ? (
            <div className="space-y-4">
              {details.directActionType === 'phone' && details.phoneNumber ? (
                <a
                  href={`tel:${details.phoneNumber.replace(/\s+/g, '')}`}
                  onClick={() => feedback.tap()}
                  className="w-full h-11 px-4 rounded-btn bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-body flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Phone size={16} strokeWidth={2} />
                  <span>
                    {isEn
                      ? `Call customer service: ${details.phoneNumber}`
                      : `Ring kundservice: ${details.phoneNumber}`}
                  </span>
                </a>
              ) : details.directActionType === 'email' && details.supportEmail ? (
                <a
                  href={`mailto:${details.supportEmail}?subject=${encodeURIComponent(
                    `Uppsägning - ${expense.name}`
                  )}`}
                  onClick={() => feedback.tap()}
                  className="w-full h-11 px-4 rounded-btn bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-body flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Mail size={16} strokeWidth={2} />
                  <span>{details.supportEmail}</span>
                </a>
              ) : details.cancelUrl ? (
                <a
                  href={details.cancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => feedback.tap()}
                  className="w-full h-11 px-4 rounded-btn bg-[var(--accent-color)] text-[var(--on-accent)] font-semibold text-body flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ExternalLink size={16} strokeWidth={2} />
                  <span>
                    {isEn
                      ? 'Open company website'
                      : 'Öppna länk till företaget'}
                  </span>
                </a>
              ) : null}

              {details.steps && details.steps.length > 0 && (
                <div className="p-4 rounded-card-nested bg-[var(--surface-color)] space-y-2.5">
                  <div className="flex items-center gap-2 text-secondary font-semibold text-[var(--text-primary)]">
                    <HelpCircle size={15} className="text-[var(--text-secondary)]" />
                    <span>
                      {isEn ? 'Step-by-step instructions' : 'Steg-för-steg'}
                    </span>
                  </div>
                  <ol className="space-y-2">
                    {details.steps.map((step, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-secondary text-[var(--text-secondary)] leading-relaxed"
                      >
                        <span className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-primary)] font-semibold text-micro-label flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="text-[var(--text-primary)]">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {(details.noticePeriod || details.tips) && (
                <div className="p-3.5 rounded-card-nested bg-[var(--surface-color)] text-secondary text-[var(--text-secondary)] space-y-2">
                  {details.noticePeriod && (
                    <div className="flex items-start gap-2">
                      <Clock size={14} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isEn ? 'Notice period: ' : 'Uppsägningstid: '}
                        </span>
                        <span>{details.noticePeriod}</span>
                      </div>
                    </div>
                  )}
                  {details.tips && (
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {isEn ? 'Tip: ' : 'Tips: '}
                        </span>
                        <span>{details.tips}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </BottomSheet>
    );
  }

  // Default mode: 'register' ("Registrera uppsägning")
  const canSave = isCancellationFormValid(formValues);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={isEn ? 'Register cancellation' : 'Registrera uppsägning'}
      subtitle={
        isEn
          ? 'This updates your budget in Dejz. The service must be cancelled with the provider.'
          : 'Detta ändrar din budget i Dejz. Tjänsten behöver vara uppsagd hos företaget.'
      }
      size="md"
      zIndex={160}
    >
      <div className="px-5 sm:px-6 pt-3 pb-5 sm:pb-6 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
        <CancellationFormFields
          values={formValues}
          onChange={setFormValues}
          amount={Number(expense?.amount) || 0}
          isVariable={expense?.isVariable}
          currency={currency}
          language={lang}
          isAlreadyCancelled={Boolean(expense?.isCancelled)}
          onRestoreActive={handleRestoreActive}
          showHeader={false}
        />

        <div className="pt-1">
          <Button
            type="button"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!canSave}
            onClick={handleSaveCancellation}
          >
            {isEn ? 'Save cancellation' : 'Spara uppsägning'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
