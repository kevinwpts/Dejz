import type { SavingsGoalItem } from '../../../utils/cache/itemMeta';
import type { ModalSubView } from './shared';
import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import { Trash, CaretRight, Paperclip, ClockCounterClockwise } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { CategoryIcon, PaymentMethodIcon } from '../../CategoryIcon';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { getItemReceipts, ReceiptAttachment } from '../../../utils/swedishDate';
import { normalizeCategoryToValid } from '../../../utils/cache/categories';
import { inferCategoryAndMethodFromName } from '../../../utils/bankAnalysis/existingBudget/manualCategory';
import { cleanDisplayMerchantName } from '../../../utils/bankAnalysis/merchantRules';
import { SheetHeader } from '../../ui/SheetHeader';
import { formatInputThousands } from '../../../utils/format';

export interface FixedViewEditProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  isCreateMode: boolean;
  onClose: () => void;
  activeExpense: FixedExpenseItem | null;
  setName: (value: SetStateAction<string>) => void;
  setAmount: (value: SetStateAction<string | number>) => void;
  setDueDay: (value: SetStateAction<number>) => void;
  setCategory: (value: SetStateAction<string>) => void;
  setPaymentMethod: (value: SetStateAction<string>) => void;
  setDraftReceipts: (value: SetStateAction<ReceiptAttachment[]>) => void;
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  name: string;
  category: string;
  amount: string | number;
  dueDay: number;
  paymentMethod: string;
  availableGoals: SavingsGoalItem[];
  linkedGoalId: string;
  draftReceipts: ReceiptAttachment[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  setPreviewReceipt: (value: SetStateAction<ReceiptAttachment | null>) => void;
  handleRemoveReceiptAt: (index: number) => void;
  handleCreateSave: () => void;
  commitInlineChanges: (overrides?: Partial<FixedExpenseItem>) => void;
  onDelete?: (id: string) => void;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  showDeleteConfirm: boolean;
  displayName: string;
  handleDelete: () => void;
}

export const FixedViewEdit: React.FC<FixedViewEditProps> = ({
  subView,
  slideAnimClass,
  isCreateMode,
  onClose,
  activeExpense,
  setName,
  setAmount,
  setDueDay,
  setCategory,
  setPaymentMethod,
  setDraftReceipts,
  navigateSubView,
  name,
  category,
  amount,
  dueDay,
  paymentMethod,
  availableGoals,
  linkedGoalId,
  draftReceipts,
  fileInputRef,
  setPreviewReceipt,
  handleRemoveReceiptAt,
  handleCreateSave,
  commitInlineChanges,
  onDelete,
  setShowDeleteConfirm,
  showDeleteConfirm,
  displayName,
  handleDelete,
}) => (
  <>
    {subView === 'edit' && (
      <div className={`${slideAnimClass} space-y-4`}>
        {isCreateMode ? (
          <SheetHeader title="Lägg till fast utgift" onClose={onClose} flush />
        ) : (
          <SheetHeader
            variant="edit"
            title="Redigera fast utgift"
            flush
            onCancel={() => {
                if (activeExpense) {
                  setName(activeExpense.name);
                  setAmount(activeExpense.amount);
                  setDueDay(activeExpense.dueDay || 27);
                  setCategory(
                    normalizeCategoryToValid(activeExpense.category || 'Räkningar', 'expense')
                  );
                  setPaymentMethod(activeExpense.paymentMethod || 'Autogiro');
                  setDraftReceipts(getItemReceipts(activeExpense));
                }
                navigateSubView('details', 'back');
              }}
          />
        )}

        {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
        <div className="ui-field-card space-y-3.5">
          {(() => {
            const rawOrig = (activeExpense?.originalName || '').trim();
            const cleanedOrig = rawOrig ? cleanDisplayMerchantName(rawOrig) : '';
            const originalDisplayName =
              cleanedOrig && cleanedOrig !== 'Banktransaktion' ? cleanedOrig : rawOrig;
            const canResetName =
              !isCreateMode &&
              Boolean(originalDisplayName) &&
              name.trim().toLowerCase() !== originalDisplayName.toLowerCase();

            return (
              <div className="flex items-center gap-3.5">
                <label className="flex items-center gap-3.5 cursor-text flex-1 min-w-0">
                  <ItemLogo
                    name={name || activeExpense?.name || 'Fast utgift'}
                    category={category}
                    logoUrl={activeExpense?.logo}
                    size="lg"
                    isRecurring={true}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="ui-field-label block mb-0.5">
                      Namn
                    </span>
                    <input
                      type="text"
                      spellCheck={false}
                      autoCorrect="off"
                      autoFocus={isCreateMode}
                      placeholder="Butik eller tjänst"
                      value={name}
                      onChange={(e) => {
                        const nextName = e.target.value;
                        setName(nextName);
                        const inferred = inferCategoryAndMethodFromName(nextName, 'fixed');
                        if (inferred?.category) {
                          setCategory(inferred.category);
                        }
                        if (inferred?.paymentMethod) {
                          setPaymentMethod(inferred.paymentMethod);
                        }
                      }}
                      className="ui-field-input-lg focus:ring-0"
                    />
                  </div>
                </label>
                {canResetName && (
                  <button
                    type="button"
                    onClick={() => {
                      setName(originalDisplayName);
                      const inferred = inferCategoryAndMethodFromName(
                        originalDisplayName,
                        'fixed'
                      );
                      if (inferred?.category) {
                        setCategory(inferred.category);
                      }
                    }}
                    title={`Återställ ursprungsnamn (${originalDisplayName})`}
                    aria-label={`Återställ ursprungsnamn (${originalDisplayName})`}
                    className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <ClockCounterClockwise size={15} weight="bold" />
                  </button>
                )}
              </div>
            );
          })()}

          <div className="border-t border-[var(--separator)] pt-3.5">
            <label className="block cursor-text">
              <span className="ui-field-label block mb-0.5">
                Belopp per månad
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatInputThousands(String(amount ?? ''))}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  className="ui-amount-input"
                />
                <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                  kr/mån
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="ui-sheet-group">
          <button
            type="button"
            onClick={() => navigateSubView('category-picker', 'forward')}
            className="ui-row-btn"
          >
            <span className="ui-info-label shrink-0">Kategori</span>
            <span className="ui-info-value flex items-center gap-1.5">
              <CategoryIcon category={category} size={13} />
              <span>{category}</span>
              <CaretRight size={12} className="text-[var(--text-muted)]" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigateSubView('day-picker', 'forward')}
            className="ui-row-btn"
          >
            <span className="ui-info-label shrink-0">Dragningsdag</span>
            <span className="ui-info-value flex items-center gap-1.5 tabular-nums">
              <span>Den {dueDay}:e</span>
              <CaretRight size={12} className="text-[var(--text-muted)]" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigateSubView('payment-picker', 'forward')}
            className="ui-row-btn"
          >
            <span className="ui-info-label shrink-0">Betalsätt</span>
            <span className="ui-info-value flex items-center gap-1.5">
              <PaymentMethodIcon method={paymentMethod} size={15} />
              <span>{paymentMethod}</span>
              <CaretRight size={12} className="text-[var(--text-muted)]" />
            </span>
          </button>

          {availableGoals.length > 0 && (
            <button
              type="button"
              onClick={() => navigateSubView('goal-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label shrink-0">Kopplat sparmål</span>
              <span className="ui-info-value flex items-center gap-1.5 min-w-0">
                <span className="truncate">
                  {availableGoals.find((g) => g.id === linkedGoalId)?.name || 'Inget'}
                </span>
                <CaretRight size={12} className="text-[var(--text-muted)] shrink-0" />
              </span>
            </button>
          )}

          <div className="ui-row">
            <span className="ui-info-label">
              {draftReceipts.length > 0 ? `Kvitton (${draftReceipts.length})` : 'Kvitto'}
            </span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-medium text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1.5 cursor-pointer"
            >
              <Paperclip size={13} />
              <span>{draftReceipts.length > 0 ? 'Bifoga fler' : 'Bifoga'}</span>
            </button>
          </div>
        </div>

        {draftReceipts.length > 0 && (
          <div className="space-y-2">
            {draftReceipts.map((rcpt, idx) => (
              <div
                key={rcpt.url}
                className="rounded-card-nested bg-[var(--fill-grouped)] px-4 py-2 min-h-[50px] flex items-center justify-between gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPreviewReceipt(rcpt);
                    navigateSubView('receipt-preview', 'forward');
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 cursor-pointer"
                >
                  <Paperclip size={15} className="text-[var(--text-secondary)] shrink-0" />
                  <span className="ui-list-row-title text-callout">
                    {draftReceipts.length > 1 ? `Kvitto ${idx + 1}` : 'Kvitto'}
                  </span>
                </button>
                <button
                  aria-label="Ta bort kvitto"
                  type="button"
                  onClick={() => handleRemoveReceiptAt(idx)}
                  className="w-8 h-8 -mr-1.5 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-negative active:bg-[var(--press-overlay)] transition-colors cursor-pointer shrink-0"
                  title="Ta bort kvitto"
                >
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2.5">
          {isCreateMode ? (
            <button
              type="button"
              onClick={handleCreateSave}
              disabled={!name.trim() || !(Number(amount) > 0)}
              className="ui-btn-primary"
            >
              <span>Spara fast utgift</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  commitInlineChanges();
                  navigateSubView('details', 'back');
                }}
                disabled={!name.trim() || !(Number(amount) > 0)}
                className="ui-btn-primary"
              >
                <span>Spara ändringar</span>
              </button>

              {onDelete && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="ui-btn-danger"
                  >
                    <Trash size={14} />
                    <span>Ta bort fast utgift</span>
                  </button>

                  <ConfirmDialog
                    isOpen={showDeleteConfirm}
                    title="Ta bort fast utgift?"
                    description={`${displayName} tas bort från dina fasta utgifter.`}
                    confirmLabel="Ta bort"
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    )}
  </>
);
