// Inkomstfönstret: detaljvy för en fast inkomst (kategori, dag, konto, historik, ta bort).
import React from 'react';
import { PencilSimple, Trash, CaretRight, ClockCounterClockwise } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import type { IncomeItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { CategoryIcon } from '../../CategoryIcon';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import {
  isMerchantCategoryIconPreferred,
  setMerchantCategoryIconPreferred,
} from '../../../utils/logo';
import type { IncomeAccountInfo, ModalSubView, NavigateSubView } from './shared';
import { AccountInfoRow } from '../AccountInfoRow';
import { useExternalSnapshot } from '../../../utils/hooks/useExternalSnapshot';
import { SheetHeader } from '../../ui/SheetHeader';

export interface IncomeViewDetailsProps {
  subView: ModalSubView;
  isCreateMode: boolean;
  navDirection: 'forward' | 'back';
  navigateSubView: NavigateSubView;
  onClose: () => void;
  activeIncome: IncomeItem | null;
  displayName: string;
  name: string;
  amount: number | string;
  payday: number;
  category: string;
  logoPrefTick: number;
  setLogoPrefTick: (value: SetStateAction<number>) => void;
  formatKr: (val: number) => string;
  resolvedAccountInfo: IncomeAccountInfo | null;
  similarInfo: SimilarTransactionsSummary;
  onDelete?: (id: string) => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  handleDelete: () => void;
}

export const IncomeViewDetails: React.FC<IncomeViewDetailsProps> = ({
  subView,
  isCreateMode,
  navDirection,
  navigateSubView,
  onClose,
  activeIncome,
  displayName,
  name,
  amount,
  payday,
  category,
  logoPrefTick,
  setLogoPrefTick,
  formatKr,
  resolvedAccountInfo,
  similarInfo,
  onDelete,
  showDeleteConfirm,
  setShowDeleteConfirm,
  handleDelete,
}) => {
  // Logga eller kategoriikon? Läses om när användaren växlar (logoPrefTick höjs)
  const prefersCatIcon = useExternalSnapshot(
    () => isMerchantCategoryIconPreferred(displayName),
    [displayName, logoPrefTick]
  );
  if (subView !== 'details' || isCreateMode) return null;
  return (
    <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
      <SheetHeader
        title="Fast inkomst"
        flush
        onClose={onClose}
        actions={
          <button
            type="button"
            onClick={() => navigateSubView('edit', 'forward')}
            className="ui-pill-btn"
          >
            <PencilSimple size={14} weight="bold" />
            Redigera
          </button>
        }
      />

      {/* Kvitto-huvud: bara läsning. Ändringar görs via Redigera eller raderna nedan. */}
      <div className="ui-hero-header relative overflow-hidden pt-5 mb-5 pb-5">
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
            aria-label={prefersCatIcon ? 'Visa företagslogga' : 'Visa kategoriikon'}
            className="relative group/logo cursor-pointer rounded-2xl focus:outline-none active:scale-95 transition-transform"
          >
            <ItemLogo
              key={`income-logo-${logoPrefTick}`}
              name={displayName}
              category={category}
              logoUrl={activeIncome?.logo}
              size="xl"
              isRecurring={true}
            />
          </button>
        </div>

        {/* Namnet är text – tryck för att ändra (öppnar redigering) */}
        <button
          type="button"
          onClick={() => navigateSubView('edit', 'forward')}
          className="group flex items-center justify-center gap-1.5 px-3 max-w-md mx-auto cursor-pointer"
          aria-label={`Byt namn på ${name || displayName}`}
        >
          <h2 className="font-display font-semibold text-xl tracking-[-0.02em] text-[var(--text-primary)] text-center truncate">
            {name || displayName}
          </h2>
          <PencilSimple
            size={14}
            weight="bold"
            className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
          />
        </button>

        <div className="mt-1.5 flex items-baseline justify-center font-display font-bold text-[34px] leading-tight tracking-[-0.04em] text-positive tabular-nums">
          +{formatKr(Number(amount) || 0)}
          <span className="ml-1.5 font-display font-medium text-base text-positive/70">/mån</span>
        </div>

        <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-1.5">
          Utbetalas den {payday}:e varje månad
        </p>
      </div>

      <div className="space-y-3.5">
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
            onClick={() => navigateSubView('day-picker', 'forward')}
            className="ui-row-btn"
          >
            <span className="ui-info-label">Utbetalningsdag</span>
            <span className="ui-info-value flex items-center gap-1.5 tabular-nums">
              <span>Den {payday}:e varje månad</span>
              <CaretRight size={12} className="text-[var(--text-muted)]" />
            </span>
          </button>

          {resolvedAccountInfo && (
            <AccountInfoRow info={resolvedAccountInfo} />
          )}

          {/* Navigationsrad till Liknande transaktioner */}
          <button
            type="button"
            onClick={() => navigateSubView('similar', 'forward')}
            className="ui-row-btn"
          >
            <span className="ui-info-label flex items-center gap-2">
              <ClockCounterClockwise
                size={14}
                className="text-[var(--text-secondary)] shrink-0"
              />
              <span>Liknande utbetalningar</span>
            </span>
            <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-normal tabular-nums shrink-0">
              <span>
                {similarInfo.transactions.length} st
                {similarInfo.transactions.length > 0
                  ? ` · +${formatKr(similarInfo.totalAmount)}`
                  : ''}
              </span>
              <CaretRight size={12} className="text-[var(--text-muted)]" />
            </span>
          </button>
        </div>

        {/* Ta bort inkomst */}
        {onDelete && activeIncome && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="ui-btn-danger"
            >
              <Trash size={14} />
              <span>Ta bort inkomst</span>
            </button>

            <ConfirmDialog
              isOpen={showDeleteConfirm}
              title="Ta bort inkomst?"
              description={`${displayName} tas bort från dina inkomster.`}
              confirmLabel="Ta bort"
              onConfirm={handleDelete}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
