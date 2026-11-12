// Inkomstfönstret: detaljvy för en fast inkomst (kategori, dag, konto, historik, ta bort).
import React from 'react';
import { PencilSimple, Trash } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import type { IncomeItem } from '../../../app/models';
import { CategoryIcon } from '../../CategoryIcon';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import type { IncomeAccountInfo, ModalSubView, NavigateSubView } from './shared';
import { AccountInfoRow } from '../AccountInfoRow';
import { SheetHeader } from '../../ui/SheetHeader';
import { DetailHeroLogo } from '../DetailHeroLogo';
import { DetailLinkRow } from '../DetailRows';

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
  if (subView !== 'details' || isCreateMode) return null;
  return (
    <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
      <SheetHeader
        title="Fast inkomst"
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
          logoUrl={activeIncome?.logo}
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

        <div className="ui-detail-amount-income">
          +{formatKr(Number(amount) || 0)}
          <span className="ui-detail-amount-suffix">/mån</span>
        </div>

        <p className="ui-detail-meta">
          Utbetalas den {payday}:e varje månad
        </p>
      </div>

      <div className="space-y-3">
        <div className="ui-detail-card">
          <DetailLinkRow
            label="Kategori"
            icon={<CategoryIcon category={category} size={13} />}
            value={category}
            onClick={() => navigateSubView('category-picker', 'forward')}
          />
          <DetailLinkRow
            label="Utbetalningsdag"
            value={`Den ${payday}:e varje månad`}
            onClick={() => navigateSubView('day-picker', 'forward')}
          />
          {resolvedAccountInfo && (
            <AccountInfoRow info={resolvedAccountInfo} />
          )}
        </div>

        <div className="ui-detail-card">
          <DetailLinkRow
            label="Tidigare utbetalningar"
            value={`${similarInfo.transactions.length} st`}
            onClick={() => navigateSubView('similar', 'forward')}
          />
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
