import type { RecurringMatchResult, SimilarTransactionsSummary } from '../../../utils/recurring';
import { ModalSubView, getDefaultPaymentMethodForTx } from './shared';
import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import {
  X,
  Heart,
  Package,
  Paperclip,
  Trash,
  ArrowsClockwise,
  CaretRight,
  PencilSimple,
  ClockCounterClockwise,
  Sparkle,
  Plus,
} from '@phosphor-icons/react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TransactionItem, FixedExpenseItem, IncomeItem } from '../../HomeTab';
import { ItemLogo } from '../../ItemLogo';
import { CategoryIcon, PaymentMethodIcon, resolveCategoryColor } from '../../CategoryIcon';
import { formatSwedishDateHeading, ReceiptAttachment } from '../../../utils/swedishDate';
import {
  getSavingsGoals,
  saveSavingsGoals,
  SavingsGoalItem,
} from '../../../utils/appCache';
import { formatIsoDateStockholm } from '../../../utils/swedishDate';
import {
  isMerchantCategoryIconPreferred,
  setMerchantCategoryIconPreferred,
} from '../../../utils/logo';

export interface TxViewDetailsProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  isCreateMode: boolean;
  activeTx: TransactionItem | null;
  navDirection: "forward" | "back";
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  isIncome: boolean;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onClose: () => void;
  logoPrefTick: number;
  category: string;
  title: string;
  setLogoPrefTick: (value: SetStateAction<number>) => void;
  recurringStatus: RecurringMatchResult;
  onUpdate?: (tx: TransactionItem, applyToSimilarIds?: string[], options?: { renameScope?: "single" | "same-merchant" | "chain"; renameTargetIds?: string[]; categoryTargetIds?: string[]; }) => void;
  isBankSynced: boolean;
  formatKr: (val: number) => string;
  amount: string | number;
  txTime: string;
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  date: string;
  draftReceipts: ReceiptAttachment[];
  setPreviewReceipt: (value: SetStateAction<ReceiptAttachment | null>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onLinkToFixed?: (tx: TransactionItem, item: FixedExpenseItem | IncomeItem | null, kind: "expense" | "income") => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: "expense" | "income") => void;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  similarInfo: SimilarTransactionsSummary;
  paymentMethod: string;
  resolvedAccountInfo: { label: string; fullNumber: string; maskedNumber: string; } | null;
  showFullAccount: boolean;
  setShowFullAccount: (value: SetStateAction<boolean>) => void;
  handleRemoveReceiptAt: (index: number) => void;
  note: string;
  setNote: (value: SetStateAction<string>) => void;
  onExclude?: (id: string, exclude: boolean) => void;
  isExcluded: boolean;
  rawBankText: string;
  onDelete?: (id: string) => void;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  showDeleteConfirm: boolean;
  displayName: string;
  handleDelete: () => void;
}

export const TxViewDetails: React.FC<TxViewDetailsProps> = ({
  subView,
  isCreateMode,
  activeTx,
  navDirection,
  onToggleHeart,
  isIncome,
  onTogglePackage,
  onClose,
  logoPrefTick,
  category,
  title,
  setLogoPrefTick,
  recurringStatus,
  onUpdate,
  isBankSynced,
  formatKr,
  amount,
  txTime,
  navigateSubView,
  date,
  draftReceipts,
  setPreviewReceipt,
  fileInputRef,
  onLinkToFixed,
  onMarkAsFixed,
  incomes,
  fixedExpenses,
  similarInfo,
  paymentMethod,
  resolvedAccountInfo,
  showFullAccount,
  setShowFullAccount,
  handleRemoveReceiptAt,
  note,
  setNote,
  onExclude,
  isExcluded,
  rawBankText,
  onDelete,
  setShowDeleteConfirm,
  showDeleteConfirm,
  displayName,
  handleDelete,
}) => (
  <>
    {subView === 'details' && !isCreateMode && activeTx && (
      <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
        {/* Top Header */}
        <div className="ui-sheet-header !mb-0">
          <div className="flex items-center gap-1">
            {onToggleHeart && (
              <button
                type="button"
                onClick={() => onToggleHeart(activeTx.id, !activeTx.isHearted)}
                title="Spara köp"
                className={`ui-icon-btn ${
                  activeTx.isHearted ? 'text-negative-solid hover:text-negative' : ''
                }`}
              >
                <Heart
                  size={18}
                  weight={activeTx.isHearted ? 'fill' : 'regular'}
                  className={activeTx.isHearted ? 'text-negative-solid' : ''}
                />
              </button>
            )}
            {!isIncome && onTogglePackage && (
              <button
                type="button"
                onClick={() =>
                  onTogglePackage(activeTx.id, !activeTx.isWaitingForPackage)
                }
                title="Väntar på paket"
                className={`ui-icon-btn ${
                  activeTx.isWaitingForPackage ? 'text-caution-solid hover:text-caution' : ''
                }`}
              >
                <Package
                  size={18}
                  weight={activeTx.isWaitingForPackage ? 'fill' : 'regular'}
                  className={activeTx.isWaitingForPackage ? 'text-caution-solid' : ''}
                />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => navigateSubView('edit', 'forward')}
              className="ui-pill-btn"
            >
              <PencilSimple size={14} weight="bold" />
              Redigera
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Stäng"
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Kvitto-huvud: bara läsning. Ändringar görs via Redigera eller raderna nedan. */}
        <div className="ui-hero-header relative overflow-hidden pt-5 mb-5 pb-5">
          {(() => {
            void logoPrefTick;
            const accentColor = resolveCategoryColor(category || activeTx.category);
            const prefersCatIcon = isMerchantCategoryIconPreferred(title || activeTx.title);
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
                      setMerchantCategoryIconPreferred(title || activeTx.title, !prefersCatIcon);
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
                      key={`tx-logo-${logoPrefTick}`}
                      name={title || activeTx.title}
                      category={category || activeTx.category}
                      logoUrl={activeTx.logo}
                      size="xl"
                      isRecurring={Boolean(recurringStatus.isRecurring)}
                    />
                  </button>
                </div>
              </>
            );
          })()}

          {/* Namnet är text – tryck för att ändra (öppnar redigering, som i Revolut/Monzo) */}
          <button
            type="button"
            onClick={() => navigateSubView('edit', 'forward')}
            className="group flex items-center justify-center gap-1.5 px-3 max-w-md mx-auto cursor-pointer"
            aria-label={`Byt namn på ${title || activeTx.title}`}
          >
            <h2 className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] text-center truncate">
              {title || activeTx.title}
            </h2>
            <PencilSimple
              size={14}
              weight="bold"
              className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
            />
          </button>

          <div
            className={`mt-1 font-display font-bold tabular-nums text-2xl sm:text-3xl ${
              isIncome ? 'text-positive-solid' : 'text-[var(--text-primary)]'
            }`}
          >
            {isIncome ? '+' : '−'}
            {formatKr(Number(amount) || activeTx.amount)}
          </div>

          <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-1.5">
            {formatSwedishDateHeading(isBankSynced ? activeTx.date : date || activeTx.date)}
            {activeTx.bookingStatus === 'PDNG' || activeTx.bookingStatus === 'HOLD'
              ? ' · Reserverat'
              : txTime
              ? ` · ${txTime}`
              : ''}
          </p>
        </div>

        <div className="space-y-3.5">
          {/* 1. Kompakta snabbåtgärder (Apple Wallet / Revolut-stil) */}
          <div className="grid grid-cols-3 gap-2">
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
              className="ui-action-tile group relative"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform relative">
                <Paperclip size={16} weight="regular" />
                {draftReceipts.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-positive-solid ring-2 ring-[var(--bg-color)]" />
                )}
              </div>
              <span className="ui-action-tile-label">
                {draftReceipts.length > 0 ? `${draftReceipts.length} kvitto` : 'Kvitto'}
              </span>
            </button>

            {(onLinkToFixed || onMarkAsFixed) && (
              <button
                type="button"
                onClick={() => {
                  const hasExistingList = isIncome
                    ? incomes.length > 0
                    : fixedExpenses.length > 0;
                  if (hasExistingList && onLinkToFixed) {
                    navigateSubView('link-fixed-picker', 'forward');
                  } else if (onMarkAsFixed) {
                    onMarkAsFixed(activeTx, isIncome ? 'income' : 'expense');
                  }
                }}
                className="ui-action-tile group"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform ${
                    recurringStatus.isRecurring
                      ? 'bg-positive-solid/15 text-positive'
                      : 'bg-[var(--surface-color)] text-[var(--text-primary)]'
                  }`}
                >
                  <ArrowsClockwise size={16} />
                </div>
                <span className="ui-action-tile-label">
                  {recurringStatus.isRecurring ? 'Fast post' : 'Gör fast'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateSubView('similar', 'forward')}
              className="ui-action-tile group"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                <ClockCounterClockwise size={16} />
              </div>
              <span className="ui-action-tile-label">
                {similarInfo.transactions.length > 0 ? `${similarInfo.transactions.length} köp` : 'Historik'}
              </span>
            </button>
          </div>

          {/* 2. Ett enda sammanhållet detaljkort (allt i ett lugnt flöde) */}
          <div className="ui-sheet-group">
            <button
              type="button"
              onClick={() => navigateSubView('category-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label">Kategori</span>
              <span className="ui-info-value flex items-center gap-1.5">
                <CategoryIcon category={category || activeTx.category} size={13} />
                <span>{category || activeTx.category}</span>
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
                <PaymentMethodIcon method={paymentMethod || getDefaultPaymentMethodForTx(activeTx)} size={15} />
                <span>{paymentMethod || getDefaultPaymentMethodForTx(activeTx)}</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            {isBankSynced ? (
              <div className="ui-row">
                <span className="ui-info-label">Bokfört datum</span>
                <span className="ui-info-value tabular-nums">
                  {formatSwedishDateHeading(activeTx.date)}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigateSubView('date-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label">Datum</span>
                <span className="ui-info-value flex items-center gap-1.5 tabular-nums">
                  <span>{formatSwedishDateHeading(date || activeTx.date)}</span>
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
                    className="px-2 py-0.5 rounded-md bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                  >
                    {showFullAccount ? 'Dölj' : 'Visa'}
                  </button>
                </div>
              </div>
            )}

            {/* Bifogade kvitton (visas endast i listan om kvitto finns; snabbvalsknappen ovan hanterar bifogning) */}
            {draftReceipts.length > 0 && (
              <>
                {draftReceipts.map((rcpt, idx) => (
                  <div key={rcpt.url} className="ui-row">
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
                        <span className="text-caption text-[var(--text-muted)] block">
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
                        className="px-2 py-1 rounded-md text-caption text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                      >
                        Öppna
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveReceiptAt(idx)}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-negative-solid transition-colors cursor-pointer"
                        title="Ta bort kvitto"
                      >
                        <Trash size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Anteckning direkt i kortet */}
            <div className="ui-row">
              <span className="ui-info-label shrink-0">Anteckning</span>
              <input
                type="text"
                placeholder="Lägg till anteckning..."
                value={note}
                onChange={(e) => {
                  const nextNote = e.target.value;
                  setNote(nextNote);
                  if (activeTx && onUpdate) {
                    onUpdate({ ...activeTx, note: nextNote.trim() || undefined });
                  }
                }}
                className="font-normal text-right text-[var(--text-primary)] placeholder-[var(--text-muted)] bg-transparent border-0 p-0 text-xs sm:text-sm focus:outline-none flex-1 ml-3"
              />
            </div>

            {/* Budgetinställningar samlade */}
            {onExclude && (
              <div className="ui-row">
                <span className="ui-info-label">Räkna i budget</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isExcluded}
                  onClick={() => {
                    onExclude(activeTx.id, !isExcluded);
                    setLogoPrefTick((t) => t + 1);
                  }}
                  className={`ui-switch ${!isExcluded ? 'ui-switch-on' : 'ui-switch-off'}`}
                >
                  <span
                    className={`ui-switch-thumb ${
                      !isExcluded ? 'ui-switch-thumb-on' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            )}

            {/* Sparmålskoppling om Sparande */}
            {(() => {
              const goals: SavingsGoalItem[] = getSavingsGoals();
              if (goals.length === 0 || (activeTx.category !== 'Sparande' && isIncome)) {
                return null;
              }
              const txActId = `tx-goal-${activeTx.id}`;
              const linkedGoal = goals.find((g) =>
                (g.activities || []).some((a) => a.id === txActId)
              );

              return (
                <div className="ui-row flex-col items-stretch gap-2 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Sparkle size={13} weight="fill" className="text-positive-solid shrink-0" />
                      <span>
                        {linkedGoal
                          ? `Kopplad till sparmål: ${linkedGoal.name}`
                          : 'Räkna in mot sparmål'}
                      </span>
                    </span>
                    {linkedGoal && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextGoals = goals.map((item) => {
                            if (item.id !== linkedGoal.id) return item;
                            const matchedAct = (item.activities || []).find(
                              (a) => a.id === txActId
                            );
                            const delta =
                              matchedAct?.amount !== undefined
                                ? Number(matchedAct.amount) || 0
                                : Math.round(Math.abs(Number(activeTx.amount) || 0));
                            return {
                              ...item,
                              currentAmount: Math.max(
                                0,
                                (Number(item.currentAmount) || 0) - delta
                              ),
                              activities: (item.activities || []).filter(
                                (a) => a.id !== txActId
                              ),
                            };
                          });
                          saveSavingsGoals(nextGoals);
                          setLogoPrefTick((t) => t + 1);
                        }}
                        className="text-xs font-medium text-negative hover:underline cursor-pointer shrink-0"
                      >
                        Koppla bort
                      </button>
                    )}
                  </div>
                  {!linkedGoal && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {goals.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            const amt = Math.round(Math.abs(Number(activeTx.amount) || 0));
                            if (amt <= 0) return;
                            const nextGoals = goals.map((item) => {
                              if (item.id !== g.id) return item;
                              return {
                                ...item,
                                currentAmount: (Number(item.currentAmount) || 0) + amt,
                                activities: [
                                  {
                                    id: txActId,
                                    text: `${activeTx.title} (+${formatKr(amt)})`,
                                    date:
                                      activeTx.date ||
                                      formatIsoDateStockholm(new Date()),
                                    amount: amt,
                                  },
                                  ...(item.activities || []),
                                ],
                              };
                            });
                            saveSavingsGoals(nextGoals);
                            setLogoPrefTick((t) => t + 1);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus size={11} weight="bold" className="text-positive-solid" />
                          <span>{g.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Rå banktext diskret längst ner i detaljkortet */}
            {rawBankText && (
              <div className="ui-row items-start py-2.5 bg-[var(--surface-hover)]/25">
                <span className="text-meta text-[var(--text-muted)] shrink-0 pt-0.5">Banktext</span>
                <span className="text-meta text-right break-words max-w-[230px] sm:max-w-[265px] text-[var(--text-secondary)] font-normal leading-snug">
                  {rawBankText}
                </span>
              </div>
            )}
          </div>

          {/* Ta bort transaktion */}
          {activeTx && onDelete && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="ui-btn-danger"
              >
                <Trash size={14} />
                <span>{isBankSynced ? 'Dölj / ta bort transaktion' : 'Ta bort transaktion'}</span>
              </button>

              <ConfirmDialog
                isOpen={showDeleteConfirm}
                title={isBankSynced ? 'Dölj transaktion?' : 'Ta bort transaktion?'}
                description={
                  isBankSynced
                    ? `${displayName} döljs från transaktionslistan och budgeten.`
                    : `${displayName} tas bort.`
                }
                confirmLabel={isBankSynced ? 'Dölj' : 'Ta bort'}
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
