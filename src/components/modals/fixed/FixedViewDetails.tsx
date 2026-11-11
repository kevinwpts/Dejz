import type { SavingsGoalItem } from '../../../utils/appCache';
import type { SimilarTransactionsSummary } from '../../../utils/recurring';
import type { ModalSubView } from './shared';
import type { MutableRefObject, SetStateAction } from 'react';
import React from 'react';
import {
  X,
  Trash,
  CaretRight,
  Paperclip,
  ClockCounterClockwise,
  Scissors,
  CalendarBlank,
} from '@phosphor-icons/react';
import { FixedExpenseItem, formatFixedCancellationBadge } from '../../HomeTab';
import { ItemLogo } from '../../ItemLogo';
import { CategoryIcon, PaymentMethodIcon, resolveCategoryColor } from '../../CategoryIcon';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ReceiptAttachment } from '../../../utils/swedishDate';
import { cleanDisplayMerchantName } from '../../../utils/bankHistoryAnalyzer';
import {
  isMerchantCategoryIconPreferred,
  setMerchantCategoryIconPreferred,
} from '../../../utils/logo';

export interface FixedViewDetailsProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  isCreateMode: boolean;
  navDirection: "forward" | "back";
  onClose: () => void;
  logoPrefTick: number;
  category: string;
  displayName: string;
  setLogoPrefTick: (value: SetStateAction<number>) => void;
  activeExpense: FixedExpenseItem;
  name: string;
  setName: (value: SetStateAction<string>) => void;
  commitInlineChanges: (overrides?: Partial<FixedExpenseItem>) => void;
  amount: string | number;
  setAmount: (value: SetStateAction<string | number>) => void;
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  dueDay: number;
  draftReceipts: ReceiptAttachment[];
  setPreviewReceipt: (value: SetStateAction<ReceiptAttachment>) => void;
  fileInputRef: MutableRefObject<HTMLInputElement>;
  similarInfo: SimilarTransactionsSummary;
  paymentMethod: string;
  availableGoals: SavingsGoalItem[];
  linkedGoalId: string;
  resolvedAccountInfo: { label: string; fullNumber: string; maskedNumber: string; };
  showFullAccount: boolean;
  setShowFullAccount: (value: SetStateAction<boolean>) => void;
  handleRemoveReceiptAt: (index: number) => void;
  onDelete: (id: string) => void;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  showDeleteConfirm: boolean;
  handleDelete: () => void;
}

export const FixedViewDetails: React.FC<FixedViewDetailsProps> = ({
  subView,
  isCreateMode,
  navDirection,
  onClose,
  logoPrefTick,
  category,
  displayName,
  setLogoPrefTick,
  activeExpense,
  name,
  setName,
  commitInlineChanges,
  amount,
  setAmount,
  navigateSubView,
  dueDay,
  draftReceipts,
  setPreviewReceipt,
  fileInputRef,
  similarInfo,
  paymentMethod,
  availableGoals,
  linkedGoalId,
  resolvedAccountInfo,
  showFullAccount,
  setShowFullAccount,
  handleRemoveReceiptAt,
  onDelete,
  setShowDeleteConfirm,
  showDeleteConfirm,
  handleDelete,
}) => (
  <>
    {subView === 'details' && !isCreateMode && (
      <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
        <div className="ui-sheet-header !mb-0">
          <span className="ui-sheet-title">Fast utgift</span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={onClose} className="ui-icon-btn">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hero Receipt Header (Direkt redigerbar) */}
        <div className="ui-hero-header relative overflow-hidden pt-5 mb-5 pb-5">
          {(() => {
            void logoPrefTick;
            const accentColor = resolveCategoryColor(category);
            const prefersCatIcon = isMerchantCategoryIconPreferred(displayName);
            return (
              <>
                <div
                  className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-44 h-32 rounded-full blur-2xl opacity-15 dark:opacity-20"
                  style={{ backgroundColor: accentColor }}
                />
                <div className="relative flex justify-center mb-3.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMerchantCategoryIconPreferred(displayName, !prefersCatIcon);
                      setLogoPrefTick((t) => t + 1);
                    }}
                    title={
                      prefersCatIcon
                        ? 'Tryck för att visa företagslogga'
                        : 'Tryck för att visa kategori-ikon'
                    }
                    className="relative group/logo cursor-pointer rounded-2xl focus:outline-none active:scale-95 transition-transform"
                  >
                    <ItemLogo
                      key={`fixed-logo-${logoPrefTick}`}
                      name={displayName}
                      category={category}
                      logoUrl={activeExpense?.logo}
                      size="xl"
                      isRecurring={true}
                    />
                  </button>
                </div>
              </>
            );
          })()}

          <div className="flex items-center justify-center gap-1.5 px-3 max-w-md mx-auto">
            <input
              type="text"
              spellCheck={false}
              autoCorrect="off"
              value={name}
              onChange={(e) => {
                const nextName = e.target.value;
                setName(nextName);
                commitInlineChanges({ name: nextName });
              }}
              className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] text-center bg-transparent border-0 focus:outline-none focus:ring-0 transition-colors w-full p-0"
              placeholder="Tjänst eller butik"
            />
            {(() => {
              const rawOrig = (activeExpense?.originalName || '').trim();
              const cleanedOrig = rawOrig ? cleanDisplayMerchantName(rawOrig) : '';
              const originalDisplayName =
                cleanedOrig && cleanedOrig !== 'Banktransaktion' ? cleanedOrig : rawOrig;
              const canResetName =
                Boolean(originalDisplayName) &&
                name.trim().toLowerCase() !== originalDisplayName.toLowerCase();
              if (!canResetName) return null;
              return (
                <button
                  type="button"
                  onClick={() => {
                    setName(originalDisplayName);
                    commitInlineChanges({ name: originalDisplayName });
                  }}
                  title={`Återställ till ursprungsnamn (${originalDisplayName})`}
                  aria-label={`Återställ till ursprungsnamn (${originalDisplayName})`}
                  className="w-7 h-7 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <ClockCounterClockwise size={13} weight="bold" />
                </button>
              );
            })()}
          </div>

          <div className="mt-1 flex items-baseline justify-center">
            <span className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] mr-0.5">
              −
            </span>
            <span className="relative inline-block">
              <span
                aria-hidden="true"
                className="invisible whitespace-pre font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em]"
              >
                {amount || '0'}
              </span>
            <input
              type="text"
              inputMode="numeric"
              spellCheck={false}
              value={amount}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d]/g, '');
                setAmount(cleaned);
                const num = Number(cleaned);
                if (num > 0) {
                  commitInlineChanges({ amount: num });
                }
              }}
              className="absolute inset-0 w-full min-w-0 bg-transparent border-0 focus:outline-none focus:ring-0 text-left font-display font-bold text-2xl sm:text-3xl tracking-[-0.02em] p-0 text-[var(--text-primary)]"
              placeholder="0"
            />
            </span>
            <span className="ml-1.5 font-display font-medium text-base text-[var(--text-secondary)]">
              kr/mån
            </span>
          </div>

          {activeExpense?.isCancelled ? (
            <button
              type="button"
              onClick={() => navigateSubView('cancel-picker', 'forward')}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:opacity-80 mt-1.5 transition-opacity cursor-pointer inline-flex items-center gap-1"
            >
              <span>{formatFixedCancellationBadge(activeExpense)}</span>
              <CaretRight size={11} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateSubView('day-picker', 'forward')}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] tabular-nums mt-1.5 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>Dras den {dueDay}:e varje månad</span>
              <CaretRight size={11} className="text-[var(--text-muted)]" />
            </button>
          )}
        </div>

        <div className="space-y-3.5">
          {/* 1. Kompakta snabbåtgärder (Apple Wallet / Revolut-stil) */}
          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => navigateSubView('cancel-picker', 'forward')}
              className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform ${
                  activeExpense?.isCancelled
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                <Scissors size={16} />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                {activeExpense?.isCancelled ? 'Uppsagd' : 'Säg upp'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (draftReceipts.length > 0) {
                  setPreviewReceipt(draftReceipts[0]);
                  navigateSubView('receipt-preview', 'forward');
                } else {
                  fileInputRef.current?.click();
                }
              }}
              className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group relative"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform relative">
                <Paperclip size={16} weight="regular" />
                {draftReceipts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-color)]" />
                )}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                {draftReceipts.length > 0 ? `${draftReceipts.length} avtal` : 'Kvitto'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateSubView('day-picker', 'forward')}
              className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                <CalendarBlank size={16} />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                Den {dueDay}:e
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateSubView('similar', 'forward')}
              className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                <ClockCounterClockwise size={16} />
              </div>
              <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                {similarInfo.transactions.length > 0 ? `${similarInfo.transactions.length} dragn.` : 'Historik'}
              </span>
            </button>
          </div>

          {/* 2. Ett enda sammanhållet detaljkort */}
          <div className="ui-sheet-group">
            <button
              type="button"
              onClick={() => navigateSubView('category-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label">Kategori</span>
              <span className="ui-info-value flex items-center gap-1.5">
                <CategoryIcon category={category} size={13} />
                <span>{category}</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateSubView('payment-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label">Betalsätt</span>
              <span className="ui-info-value flex items-center gap-1.5">
                <PaymentMethodIcon method={paymentMethod} size={15} />
                <span>{paymentMethod}</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            {activeExpense?.isCancelled && (
              <button
                type="button"
                onClick={() => navigateSubView('cancel-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label">Status</span>
                <span className="ui-info-value flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <span>{formatFixedCancellationBadge(activeExpense)}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateSubView('day-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label">Dragningsdag</span>
              <span className="ui-info-value flex items-center gap-1.5 tabular-nums">
                <span>Den {dueDay}:e varje månad</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            {availableGoals.length > 0 && (
              <button
                type="button"
                onClick={() => navigateSubView('goal-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label">Sparmål</span>
                <span className="ui-info-value flex items-center gap-1.5">
                  <span>
                    {availableGoals.find((g) => g.id === linkedGoalId)?.name || 'Inget valt'}
                  </span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>
            )}

            {resolvedAccountInfo && (
              <div className="ui-row">
                <span className="ui-info-label">Konto</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="ui-info-value truncate max-w-[190px] sm:max-w-[230px]">
                    {resolvedAccountInfo.label} ·{' '}
                    {showFullAccount
                      ? resolvedAccountInfo.fullNumber
                      : resolvedAccountInfo.maskedNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullAccount((prev) => !prev)}
                    className="px-2 py-0.5 rounded-md bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                  >
                    {showFullAccount ? 'Dölj' : 'Visa'}
                  </button>
                </div>
              </div>
            )}

            {/* Bifogade kvitton & avtal (visas endast i listan om kvitto finns; snabbvalsknappen ovan hanterar bifogning) */}
            {draftReceipts.length > 0 && (
              <>
                {draftReceipts.map((rcpt, idx) => (
                  <div key={`${rcpt.name}-${idx}`} className="ui-row">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewReceipt(rcpt);
                        navigateSubView('receipt-preview', 'forward');
                      }}
                      className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1 group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 overflow-hidden">
                        {rcpt.url.startsWith('data:image/') ||
                        /\.(png|jpe?g|webp|gif)$/i.test(rcpt.url) ? (
                          <img src={rcpt.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Paperclip size={13} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-[var(--text-primary)] block truncate group-hover:opacity-80">
                          {rcpt.name || `Kvitto ${idx + 1}`}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] block">
                          Klicka för att granska
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewReceipt(rcpt);
                          navigateSubView('receipt-preview', 'forward');
                        }}
                        className="px-2 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      >
                        Öppna
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveReceiptAt(idx)}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                        title="Ta bort kvitto"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

          </div>

          {/* Ta bort fast utgift */}
          {onDelete && activeExpense && (
            <div className="pt-2">
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
            </div>
          )}
        </div>
      </div>
    )}
  </>
);
