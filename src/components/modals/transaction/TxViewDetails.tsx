import type { RecurringMatchResult } from '../../../utils/recurring/checkRecurring';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import { ModalSubView, getDefaultPaymentMethodForTx } from './shared';
import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import { Heart, Package, Paperclip, Trash, ArrowsClockwise, PencilSimple, Plus } from '@phosphor-icons/react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { TransactionItem, FixedExpenseItem, IncomeItem } from '../../../app/models';
import { CategoryIcon, PaymentMethodIcon } from '../../CategoryIcon';
import { formatSwedishDateHeading, ReceiptAttachment, formatIsoDateStockholm } from '../../../utils/swedishDate';
import { getSavingsGoals, saveSavingsGoals, SavingsGoalItem } from '../../../utils/cache/itemMeta';


import type { AccountDisplayInfo } from '../../../utils/accountDisplay';
import { AccountInfoRow } from '../AccountInfoRow';
import { DetailHeroLogo } from '../DetailHeroLogo';
import { SheetHeader } from '../../ui/SheetHeader';
import { DetailLinkRow, DetailRow, DetailStackRow } from '../DetailRows';

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
  resolvedAccountInfo: AccountDisplayInfo | null;
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
        <SheetHeader
          title={isIncome ? 'Inkomst' : 'Köp'}
          flush
          closeStart
          onClose={onClose}
          actions={
            <>
              <button
                type="button"
                onClick={() => navigateSubView('edit', 'forward')}
                className="ui-pill-btn"
              >
                <PencilSimple size={16} />
                Redigera
              </button>
            </>
          }
        />

        {/* Kvitto-huvud: bara läsning. Ändringar görs via Redigera eller raderna nedan. */}
        <div className="ui-detail-hero">
          <DetailHeroLogo
            name={title || activeTx.title}
            category={category || activeTx.category}
            logoUrl={activeTx.logo}
            isRecurring={Boolean(recurringStatus.isRecurring)}
            refreshKey={logoPrefTick}
            onToggled={() => setLogoPrefTick((t) => t + 1)}
          />

          {/* Namnet är text – tryck för att ändra (öppnar redigering, som i Revolut/Monzo) */}
          <button
            type="button"
            onClick={() => navigateSubView('edit', 'forward')}
            className="block w-full px-2 max-w-md mx-auto cursor-pointer"
            aria-label={`Byt namn på ${title || activeTx.title}`}
          >
            <h2 className="ui-detail-title">
              {title || activeTx.title}
            </h2>
          </button>

          <div className={isIncome ? 'ui-detail-amount-income' : 'ui-detail-amount'}>
            {isIncome ? '+' : '−'}
            {formatKr(Number(amount) || activeTx.amount)}
          </div>

          <p className="ui-detail-meta">
            {formatSwedishDateHeading(isBankSynced ? activeTx.date : date || activeTx.date)}
            {activeTx.bookingStatus === 'PDNG' || activeTx.bookingStatus === 'HOLD'
              ? ' · Reserverat'
              : txTime
              ? ` · ${txTime}`
              : ''}
          </p>
        </div>

        <div className="space-y-3">
          {/* 1. Kompakta snabbåtgärder (Apple Wallet / Revolut-stil) */}
          <div className={`grid gap-2 ${!isIncome && onTogglePackage ? 'grid-cols-4' : 'grid-cols-3'}`}>
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
              <div className="ui-action-tile-icon relative">
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
                  className={`ui-action-tile-icon ${
                    recurringStatus.isRecurring ? 'bg-positive-solid/15 text-positive' : ''
                  }`}
                >
                  <ArrowsClockwise size={16} />
                </div>
                <span className="ui-action-tile-label">
                  {recurringStatus.isRecurring ? 'Fast post' : 'Gör fast'}
                </span>
              </button>
            )}

            {onToggleHeart && (
              <button
                aria-label="Spara köp"
                aria-pressed={Boolean(activeTx.isHearted)}
                type="button"
                onClick={() => onToggleHeart(activeTx.id, !activeTx.isHearted)}
                className="ui-action-tile group"
              >
                <div
                  className={`ui-action-tile-icon ${
                    activeTx.isHearted ? 'bg-[var(--danger-container)] text-negative' : ''
                  }`}
                >
                  <Heart size={16} weight={activeTx.isHearted ? 'fill' : 'regular'} />
                </div>
                <span className="ui-action-tile-label">
                  {activeTx.isHearted ? 'Sparad' : 'Spara'}
                </span>
              </button>
            )}

            {!isIncome && onTogglePackage && (
              <button
                aria-label="Väntar på paket"
                aria-pressed={Boolean(activeTx.isWaitingForPackage)}
                type="button"
                onClick={() => onTogglePackage(activeTx.id, !activeTx.isWaitingForPackage)}
                className="ui-action-tile group"
              >
                <div
                  className={`ui-action-tile-icon ${
                    activeTx.isWaitingForPackage ? 'bg-[var(--warning-container)] text-caution' : ''
                  }`}
                >
                  <Package size={16} weight={activeTx.isWaitingForPackage ? 'fill' : 'regular'} />
                </div>
                <span className="ui-action-tile-label">
                  {activeTx.isWaitingForPackage ? 'Väntar' : 'Paket'}
                </span>
              </button>
            )}
          </div>

          {/* 2. Infokort: en grupp per kort, inga avdelare (Revolut-stil) */}
          <div className="ui-detail-card">
            <DetailLinkRow
              label="Kategori"
              icon={<CategoryIcon category={category || activeTx.category} size={13} />}
              value={category || activeTx.category}
              onClick={() => navigateSubView('category-picker', 'forward')}
            />
            <DetailLinkRow
              label="Betalsätt"
              icon={<PaymentMethodIcon method={paymentMethod || getDefaultPaymentMethodForTx(activeTx)} size={15} />}
              value={paymentMethod || getDefaultPaymentMethodForTx(activeTx)}
              onClick={() => navigateSubView('payment-picker', 'forward')}
            />
            {isBankSynced ? (
              <DetailRow label="Bokfört datum">
                <span className="ui-detail-value">{formatSwedishDateHeading(activeTx.date)}</span>
              </DetailRow>
            ) : (
              <DetailLinkRow
                label="Datum"
                value={formatSwedishDateHeading(date || activeTx.date)}
                onClick={() => navigateSubView('date-picker', 'forward')}
              />
            )}
            {resolvedAccountInfo && (
              <AccountInfoRow info={resolvedAccountInfo} />
            )}
          </div>

          {/* Bifogade kvitton (visas endast i listan om kvitto finns; snabbvalsknappen ovan hanterar bifogning) */}
          {draftReceipts.length > 0 && (
            <div className="ui-detail-card">
              {draftReceipts.map((rcpt, idx) => (
                <div key={rcpt.url} className="ui-detail-row">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewReceipt(rcpt);
                      navigateSubView('receipt-preview', 'forward');
                    }}
                    className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 overflow-hidden">
                      {rcpt.url.startsWith('data:image/') ||
                      /\.(png|jpe?g|webp|gif)$/i.test(rcpt.url) ? (
                        <img src={rcpt.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Paperclip size={13} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="ui-list-row-title text-callout block group-hover:opacity-80">
                        {draftReceipts.length > 1 ? `Kvitto ${idx + 1}` : 'Kvitto'}
                      </span>
                      <span className="text-footnote text-[var(--text-secondary)] block">
                        Tryck för att visa
                      </span>
                    </div>
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

          <div className="ui-detail-card">
            <DetailLinkRow
              label={isIncome ? 'Tidigare inkomster' : 'Tidigare köp'}
              value={`${similarInfo.transactions.length} st`}
              onClick={() => navigateSubView('similar', 'forward')}
            />

            {/* Budgetinställningar samlade */}
            {onExclude && (
              <DetailRow label="Räkna i budget">
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isExcluded}
                  aria-label="Räkna i budget"
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
              </DetailRow>
            )}

            {/* Sparmålskoppling om Sparande */}
            {(() => {
              const goals: SavingsGoalItem[] = getSavingsGoals();
              if (goals.length === 0) return null;
              const txActId = `tx-goal-${activeTx.id}`;
              const linkedGoal = goals.find((g) =>
                (g.activities || []).some((a) => a.id === txActId)
              );
              // Bara överföringar till sparande kan räknas in i ett mål – inte matköp o.d.
              if (!linkedGoal && activeTx.category !== 'Sparande') return null;

              return (
                <div className="ui-detail-stack gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="ui-detail-label shrink flex items-center gap-1.5 min-w-0">
                      <span className="truncate">
                        {linkedGoal
                          ? `Kopplad till sparmål: ${linkedGoal.name}`
                          : 'Lägg till i sparmål'}
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
                        className="text-callout font-normal text-negative hover:opacity-80 cursor-pointer shrink-0"
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
                          className="ui-chip-sm"
                        >
                          <Plus size={12} className="text-[var(--accent-color)]" />
                          <span>{g.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

          {/* Lång text: etikett överst, värdet under */}
          <div className="ui-detail-card">
            <DetailStackRow label="Anteckning">
              <input
                aria-label="Anteckning"
                type="text"
                placeholder="Lägg till en anteckning"
                value={note}
                onChange={(e) => {
                  const nextNote = e.target.value;
                  setNote(nextNote);
                  if (activeTx && onUpdate) {
                    onUpdate({ ...activeTx, note: nextNote.trim() || undefined });
                  }
                }}
                className="ui-detail-stack-value"
              />
            </DetailStackRow>
            {rawBankText && (
              <DetailStackRow label="Banktext">
                <span className="ui-detail-stack-value">{rawBankText}</span>
              </DetailStackRow>
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
