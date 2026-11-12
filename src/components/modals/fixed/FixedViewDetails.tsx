import type { SavingsGoalItem } from '../../../utils/cache/itemMeta';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import type { ModalSubView } from './shared';
import type { RefObject, SetStateAction } from 'react';
import React from 'react';
import { PencilSimple, Trash, CaretRight, Paperclip, Scissors } from '@phosphor-icons/react';
import { FixedExpenseItem, formatFixedCancellationBadge } from '../../../app/models';
import { CategoryIcon, PaymentMethodIcon } from '../../CategoryIcon';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { ReceiptAttachment } from '../../../utils/swedishDate';


import type { AccountDisplayInfo } from '../../../utils/accountDisplay';
import { AccountInfoRow } from '../AccountInfoRow';
import { DetailHeroLogo } from '../DetailHeroLogo';
import { SheetHeader } from '../../ui/SheetHeader';
import { DetailLinkRow } from '../DetailRows';

export interface FixedViewDetailsProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  isCreateMode: boolean;
  navDirection: "forward" | "back";
  onClose: () => void;
  logoPrefTick: number;
  category: string;
  displayName: string;
  setLogoPrefTick: (value: SetStateAction<number>) => void;
  activeExpense: FixedExpenseItem | null;
  name: string;
  amount: string | number;
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  dueDay: number;
  draftReceipts: ReceiptAttachment[];
  setPreviewReceipt: (value: SetStateAction<ReceiptAttachment | null>) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  similarInfo: SimilarTransactionsSummary;
  paymentMethod: string;
  availableGoals: SavingsGoalItem[];
  linkedGoalId: string;
  resolvedAccountInfo: AccountDisplayInfo | null;
  handleRemoveReceiptAt: (index: number) => void;
  onDelete?: (id: string) => void;
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
  amount,
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
  handleRemoveReceiptAt,
  onDelete,
  setShowDeleteConfirm,
  showDeleteConfirm,
  handleDelete,
}) => (
  <>
    {subView === 'details' && !isCreateMode && (
      <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
        <SheetHeader
          title="Fast utgift"
          flush
          closeStart
          onClose={onClose}
          actions={
            <button
              type="button"
              onClick={() => navigateSubView('edit', 'forward')}
              className="ui-pill-btn"
            >
              <PencilSimple size={16} />
              Redigera
            </button>
          }
        />

        {/* Kvitto-huvud: bara läsning. Ändringar görs via Redigera eller raderna nedan. */}
        <div className="ui-detail-hero">
          <DetailHeroLogo
            name={displayName}
            category={category}
            logoUrl={activeExpense?.logo}
            isRecurring
            refreshKey={logoPrefTick}
            onToggled={() => setLogoPrefTick((t) => t + 1)}
          />

          {/* Namnet är text – tryck för att ändra (öppnar redigering) */}
          <button
            type="button"
            onClick={() => navigateSubView('edit', 'forward')}
            className="block w-full px-2 max-w-md mx-auto cursor-pointer"
            aria-label={`Byt namn på ${name || displayName}`}
          >
            <h2 className="ui-detail-title">
              {name || displayName}
            </h2>
          </button>

          <div className="ui-detail-amount">
            −{new Intl.NumberFormat('sv-SE').format(Number(amount) || 0)} kr
            <span className="ui-detail-amount-suffix">/mån</span>
          </div>

          {activeExpense?.isCancelled ? (
            <button
              type="button"
              onClick={() => navigateSubView('cancel-picker', 'forward')}
              className="ui-detail-meta text-caution hover:opacity-80 transition-opacity cursor-pointer inline-flex items-center gap-1"
            >
              <span>{formatFixedCancellationBadge(activeExpense)}</span>
              <CaretRight size={12} />
            </button>
          ) : (
            <p className="ui-detail-meta">
              Dras den {dueDay}:e varje månad
            </p>
          )}
        </div>

        <div className="space-y-3">
          {/* 1. Kompakta snabbåtgärder (Apple Wallet / Revolut-stil) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigateSubView('cancel-picker', 'forward')}
              className="ui-action-tile group"
            >
              <div
                className={`ui-action-tile-icon ${
                  activeExpense?.isCancelled ? 'bg-caution-solid/15 text-caution-solid' : ''
                }`}
              >
                <Scissors size={16} />
              </div>
              <span className="ui-action-tile-label">
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

          </div>

          {/* 2. Infokort: en grupp per kort, inga avdelare (Revolut-stil) */}
          <div className="ui-detail-card">
            <DetailLinkRow
              label="Kategori"
              icon={<CategoryIcon category={category} size={13} />}
              value={category}
              onClick={() => navigateSubView('category-picker', 'forward')}
            />
            <DetailLinkRow
              label="Betalsätt"
              icon={<PaymentMethodIcon method={paymentMethod} size={15} />}
              value={paymentMethod}
              onClick={() => navigateSubView('payment-picker', 'forward')}
            />
            <DetailLinkRow
              label="Dragningsdag"
              value={`Den ${dueDay}:e varje månad`}
              onClick={() => navigateSubView('day-picker', 'forward')}
            />
            {resolvedAccountInfo && (
              <AccountInfoRow info={resolvedAccountInfo} />
            )}
          </div>

          <div className="ui-detail-card">
            <DetailLinkRow
              label="Tidigare dragningar"
              value={`${similarInfo.transactions.length} st`}
              onClick={() => navigateSubView('similar', 'forward')}
            />
            {activeExpense?.isCancelled && (
              <DetailLinkRow
                label="Status"
                tone="caution"
                value={formatFixedCancellationBadge(activeExpense)}
                onClick={() => navigateSubView('cancel-picker', 'forward')}
              />
            )}
            {availableGoals.length > 0 && (
              <DetailLinkRow
                label="Sparmål"
                value={availableGoals.find((g) => g.id === linkedGoalId)?.name || 'Inget valt'}
                onClick={() => navigateSubView('goal-picker', 'forward')}
              />
            )}
          </div>

          {/* Bifogade kvitton & avtal (visas endast i listan om kvitto finns; snabbvalsknappen ovan hanterar bifogning) */}
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
