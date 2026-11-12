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
      className="ui-dialog-scrim animate-fade-in"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-rename-scope-title"
        className="ui-dialog-card animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2 px-1 pt-1 pb-6 text-center">
          <h3 id="tx-rename-scope-title" className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)] leading-snug">
            {isTitleChanged
              ? activeSwishPhone
                ? 'Byt namn på Swish?'
                : isAggregatorTx
                ? 'Ändra namn på köpet?'
                : 'Ändra namnet på fler köp?'
              : 'Ändra kategorin på fler köp?'}
          </h3>
          {!activeSwishPhone && !(isTitleChanged && isAggregatorTx) && (
            <p className="text-subhead text-[var(--text-secondary)] leading-normal text-balance">
              Väljer du flera gäller det även framtida köp.
            </p>
          )}
        </div>

        <div className="space-y-2">
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
            className="w-full h-12 rounded-full text-subhead font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
