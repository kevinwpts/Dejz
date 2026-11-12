// Centrerad dialog: ska ett nytt namn/kategori gälla bara det här köpet eller fler liknande köp?
import React from 'react';
import { createPortal } from 'react-dom';
import type { TransactionItem } from '../../../app/models';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import { extractSwishPhoneNumber } from '../../../utils/bankAnalysis/merchantRules';
import type { TxRenameScope } from './useTransactionForm';

export interface TxRenameScopeDialogProps {
  activeTx: TransactionItem;
  title: string;
  defaultCleanBankTitle: string;
  isAggregatorTx: boolean;
  similarInfo: SimilarTransactionsSummary;
  onCommit: (scope: TxRenameScope) => void;
  onDismiss: () => void;
}

export const TxRenameScopeDialog: React.FC<TxRenameScopeDialogProps> = ({
  activeTx,
  title,
  defaultCleanBankTitle,
  isAggregatorTx,
  similarInfo,
  onCommit,
  onDismiss,
}) => {
  const nextTitleTrimmed = title.trim() || activeTx.title;
  const isTitleChanged = nextTitleTrimmed !== activeTx.title;
  const bankOriginLabel =
    defaultCleanBankTitle ||
    activeTx.counterpartyName ||
    activeTx.rawDescription ||
    activeTx.title;
  const activeSwishPhone = extractSwishPhoneNumber(
    `${activeTx.rawDescription || ''} ${activeTx.counterpartyName || ''} ${activeTx.title || ''}`
  );
  const hasDistinctChainVsStore =
    !activeSwishPhone &&
    similarInfo.transactions.length > similarInfo.sameMerchantTransactions.length &&
    similarInfo.sameMerchantTransactions.length >= 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-black/45 backdrop-blur-xs animate-fade-in"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-rename-scope-title"
        className="w-full max-w-[348px] rounded-modal bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 shadow-2xl space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 id="tx-rename-scope-title" className="font-display font-semibold text-base text-[var(--text-primary)]">
            {isTitleChanged
              ? activeSwishPhone
                ? 'Byt namn på Swish?'
                : isAggregatorTx
                ? 'Ändra namn på köpet?'
                : 'Ändra namnet på fler köp?'
              : 'Ändra kategorin på fler köp?'}
          </h3>
          {!activeSwishPhone && !(isTitleChanged && isAggregatorTx) && (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Välj du flera gäller det även nya köp som kommer in.
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          {isTitleChanged && activeSwishPhone ? (
            <>
              <button
                type="button"
                onClick={() => onCommit('single')}
                className="ui-dialog-btn-primary"
              >
                Bara den här Swishen
              </button>

              <button
                type="button"
                onClick={() => onCommit('same-merchant')}
                className="ui-dialog-btn-secondary tabular-nums"
              >
                Alla med nummer {activeSwishPhone} ({similarInfo.transactions.length} st)
              </button>
            </>
          ) : isTitleChanged && isAggregatorTx ? (
            <>
              <button
                type="button"
                onClick={() => onCommit('single')}
                className="ui-dialog-btn-primary"
              >
                Bara det här köpet (rekommenderas)
              </button>

              <button
                type="button"
                onClick={() => onCommit('chain')}
                className="ui-dialog-btn-secondary"
              >
                Alla liknande köp ({similarInfo.transactions.length} st)
              </button>
            </>
          ) : hasDistinctChainVsStore ? (
            <>
              <button
                type="button"
                onClick={() => onCommit('same-merchant')}
                className="ui-dialog-btn-primary"
              >
                Alla från {bankOriginLabel} ({similarInfo.sameMerchantTransactions.length} st)
              </button>

              <button
                type="button"
                onClick={() => onCommit('chain')}
                className="ui-dialog-btn-secondary"
              >
                Hela {similarInfo.brandLabel}-kedjan ({similarInfo.transactions.length} st)
              </button>

              <button
                type="button"
                onClick={() => onCommit('single')}
                className="ui-dialog-btn-secondary"
              >
                Bara det här köpet
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onCommit('chain')}
                className="ui-dialog-btn-primary"
              >
                Alla liknande köp ({similarInfo.transactions.length} st)
              </button>

              <button
                type="button"
                onClick={() => onCommit('single')}
                className="ui-dialog-btn-secondary"
              >
                Bara det här köpet
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onDismiss}
            className="w-full py-2 rounded-2xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
