import type { RecurringMatchResult } from '../../../utils/recurring/checkRecurring';
import { ModalSubView } from './shared';
import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import {
  X,
  Paperclip,
  Trash,
  CaretRight,
  Check,
  ClockCounterClockwise,
  CalendarBlank,
  Plus,
} from '@phosphor-icons/react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TransactionItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { CategoryIcon, PaymentMethodIcon } from '../../CategoryIcon';
import { formatSwedishFullDate, ReceiptAttachment } from '../../../utils/swedishDate';
import { inferCategoryAndMethodFromName } from '../../../utils/bankAnalysis/existingBudget/manualCategory';

export interface TxViewEditProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  isCreateMode: boolean;
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  onClose: () => void;
  setTxType: (value: SetStateAction<"expense" | "income">) => void;
  setCategory: (value: SetStateAction<string>) => void;
  txType: "expense" | "income";
  title: string;
  activeTx: TransactionItem | null;
  isIncome: boolean;
  category: string;
  recurringStatus: RecurringMatchResult;
  setTitle: (value: SetStateAction<string>) => void;
  setPaymentMethod: (value: SetStateAction<string>) => void;
  defaultCleanBankTitle: string;
  rawBankText: string;
  isBankSynced: boolean;
  amount: string | number;
  setAmount: (value: SetStateAction<string | number>) => void;
  formatKr: (val: number) => string;
  paymentMethod: string;
  date: string;
  setPickerYearMonth: (value: SetStateAction<{ year: number; month: number; }>) => void;
  note: string;
  setNote: (value: SetStateAction<string>) => void;
  draftReceipts: ReceiptAttachment[];
  setPreviewReceipt: (value: SetStateAction<ReceiptAttachment | null>) => void;
  handleRemoveReceiptAt: (index: number) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleCreateSave: () => void;
  handleSaveEditClick: () => void;
  handleCancelEdit: () => void;
  onDelete?: (id: string) => void;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  showDeleteConfirm: boolean;
  handleDelete: () => void;
}

export const TxViewEdit: React.FC<TxViewEditProps> = ({
  subView,
  slideAnimClass,
  isCreateMode,
  navigateSubView,
  onClose,
  setTxType,
  setCategory,
  txType,
  title,
  activeTx,
  isIncome,
  category,
  recurringStatus,
  setTitle,
  setPaymentMethod,
  defaultCleanBankTitle,
  rawBankText,
  isBankSynced,
  amount,
  setAmount,
  formatKr,
  paymentMethod,
  date,
  setPickerYearMonth,
  note,
  setNote,
  draftReceipts,
  setPreviewReceipt,
  handleRemoveReceiptAt,
  fileInputRef,
  handleCreateSave,
  handleSaveEditClick,
  handleCancelEdit,
  onDelete,
  setShowDeleteConfirm,
  showDeleteConfirm,
  handleDelete,
}) => (
  <>
    {subView === 'edit' && (
      <div className={slideAnimClass}>
        <div className="ui-sheet-sub-header mb-5">
          {!isCreateMode ? (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="ui-text-btn"
            >
              Avbryt
            </button>
          ) : (
            <div className="w-16" />
          )}
          <span className="ui-sheet-title">
            {isCreateMode ? 'Lägg till händelse' : isIncome ? 'Redigera inkomst' : 'Redigera köp'}
          </span>
          {isCreateMode ? (
            <div className="w-16 flex justify-end">
              <button type="button" onClick={onClose} aria-label="Stäng" className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="w-16" />
          )}
        </div>

        {isCreateMode && (
          <div className="ui-segmented grid-cols-2 mb-5">
            <button
              type="button"
              onClick={() => {
                setTxType('expense');
                setCategory('Mat & dryck');
              }}
              className={`ui-segmented-tab ${
                txType === 'expense' ? 'ui-segmented-tab-active' : ''
              }`}
            >
              Utgift
            </button>
            <button
              type="button"
              onClick={() => {
                setTxType('income');
                setCategory('Lön');
              }}
              className={`ui-segmented-tab ${
                txType === 'income' ? 'ui-segmented-tab-active' : ''
              }`}
            >
              Inkomst
            </button>
          </div>
        )}

        <div className="space-y-4">
          {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
          <div className="ui-field-card space-y-3.5">
            <div className="flex items-center gap-3.5">
              <label className="flex items-center gap-3.5 cursor-text flex-1 min-w-0">
                <ItemLogo
                  name={title || activeTx?.title || (isIncome ? 'Inkomst' : 'Utgift')}
                  category={category}
                  logoUrl={activeTx?.logo}
                  size="lg"
                  isRecurring={Boolean(!isCreateMode && recurringStatus.isRecurring)}
                />
                <div className="flex-1 min-w-0">
                  <span className="ui-field-label block mb-0.5">
                    Namn
                  </span>
                  <input
                    type="text"
                    autoFocus={isCreateMode}
                    enterKeyHint="next"
                    placeholder={isIncome ? 'Inkomstkälla' : 'Butik eller köp'}
                    value={title}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setTitle(nextTitle);
                      const inferred = inferCategoryAndMethodFromName(
                        nextTitle,
                        isIncome ? 'income' : 'transaction'
                      );
                      if (inferred?.category) {
                        setCategory(inferred.category);
                      }
                      if (isCreateMode && inferred?.paymentMethod) {
                        setPaymentMethod(inferred.paymentMethod);
                      }
                    }}
                    className="ui-field-input-lg"
                  />
                </div>
              </label>
              {!isCreateMode &&
                defaultCleanBankTitle &&
                title.trim().toLowerCase() !== defaultCleanBankTitle.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(defaultCleanBankTitle);
                      const inferred = inferCategoryAndMethodFromName(
                        defaultCleanBankTitle,
                        isIncome ? 'income' : 'transaction'
                      );
                      if (inferred?.category) {
                        setCategory(inferred.category);
                      }
                    }}
                    title={`Återställ ursprungsnamn (${defaultCleanBankTitle})`}
                    aria-label={`Återställ ursprungsnamn (${defaultCleanBankTitle})`}
                    className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <ClockCounterClockwise size={15} weight="bold" />
                  </button>
                )}
            </div>

            {!isCreateMode && rawBankText && (
              <div className="flex items-center justify-between gap-2 pt-1 text-caption text-[var(--text-muted)]">
                <span className="truncate" title={rawBankText}>
                  Banktext:{' '}
                  <span className="font-medium text-[var(--text-secondary)]">
                    {rawBankText}
                  </span>
                </span>
              </div>
            )}

            <div className="border-t border-[var(--border-subtle)] pt-3.5">
              {!isBankSynced ? (
                <label className="block cursor-text">
                  <span className="ui-field-label block mb-0.5">
                    Belopp
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                      className={`w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none ${
                        isIncome
                          ? 'text-positive'
                          : 'text-[var(--text-primary)]'
                      }`}
                    />
                    <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                      kr
                    </span>
                  </div>
                </label>
              ) : (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="ui-field-label">
                    Belopp
                  </span>
                  <span
                    className={`font-display font-bold text-xl tabular-nums ${
                      isIncome
                        ? 'text-positive'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {isIncome ? '+' : '−'}
                    {formatKr(activeTx!.amount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Samlat formulärkort för Kategori, Betalsätt, Datum, Anteckning & Kvitto */}
          <div className="ui-sheet-group">
            {/* Kategori */}
            <button
              type="button"
              onClick={() => navigateSubView('category-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label shrink-0">Kategori</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
                <CategoryIcon category={category} size={13} />
                <span>{category}</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            {/* Betalsätt */}
            <button
              type="button"
              onClick={() => navigateSubView('payment-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label shrink-0">Betalsätt</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
                <PaymentMethodIcon method={paymentMethod} size={15} />
                <span>{paymentMethod}</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            {/* Datum (för manuella poster) */}
            {!isBankSynced && (
              <button
                type="button"
                onClick={() => {
                  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                    setPickerYearMonth({
                      year: parseInt(date.slice(0, 4), 10),
                      month: parseInt(date.slice(5, 7), 10) - 1,
                    });
                  }
                  navigateSubView('date-picker', 'forward');
                }}
                className="ui-row-btn"
              >
                <span className="ui-info-label shrink-0">Datum</span>
                <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <CalendarBlank size={13} className="text-[var(--text-secondary)]" />
                  <span>{formatSwedishFullDate(date)}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>
            )}

            {/* Anteckning */}
            <label className="ui-input-row">
              <span className="ui-info-label shrink-0">Anteckning</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lägg till anteckning"
                className="ui-inline-input"
              />
            </label>

            {/* Kvitto */}
            {draftReceipts.length > 0 ? (
              <>
                {draftReceipts.map((rcpt, idx) => (
                  <div key={rcpt.url} className="ui-row">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewReceipt(rcpt);
                        navigateSubView('receipt-preview', 'forward');
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 cursor-pointer"
                    >
                      <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {rcpt.name || `Kvitto ${idx + 1}`}
                      </span>
                    </button>
                    <button
                      aria-label="Ta bort kvitto"
                      type="button"
                      onClick={() => handleRemoveReceiptAt(idx)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-negative-solid transition-colors cursor-pointer shrink-0"
                      title="Ta bort kvitto"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ui-row-btn text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={13} weight="bold" className="text-positive-solid" />
                    <span>Bifoga fler kvitton</span>
                  </span>
                  <Paperclip size={13} className="text-[var(--text-muted)]" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ui-row-btn"
              >
                <span className="ui-info-label shrink-0">Kvitto</span>
                <span className="font-normal text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Paperclip size={13} />
                  <span>Bifoga kvitto</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>
            )}
          </div>

          {isCreateMode ? (
            <button
              type="button"
              onClick={handleCreateSave}
              disabled={!title.trim() || !(Number(amount) > 0)}
              className="ui-btn-primary py-3.5"
            >
              <Check size={14} weight="bold" />
              <span>Spara händelse</span>
            </button>
          ) : (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleSaveEditClick}
                disabled={!title.trim()}
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Spara ändringar</span>
              </button>

              {!isBankSynced && activeTx && onDelete && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="ui-btn-danger"
                  >
                    <Trash size={14} />
                    <span>Ta bort transaktion</span>
                  </button>

                  <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Ta bort transaktion?"
                    description={`${activeTx.title} tas bort.`}
                    confirmLabel="Ta bort"
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )}
  </>
);
