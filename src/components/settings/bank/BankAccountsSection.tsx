// Bankinställningar: kontolistan där varje konto öppnar kontoinställningar/detaljer
import React from 'react';
import { ArrowClockwise, CaretRight } from '@phosphor-icons/react';
import type { BankAccount } from '../../../services/bank/types';
import type { AccountItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';
import { stripRawAccountDigits } from '../accountText';
import { formatKr } from './formatKr';

interface BankAccountsSectionProps {
  displayAccountItems: AccountItem[];
  bankAccounts: BankAccount[];
  connectedBank: string | null;
  hasConnections: boolean;
  syncingAccountId: string | null;
  onOpenSelectAccounts: () => void;
  onOpenAccountDetail: (acc: AccountItem) => void;
  onQuickSyncAccount: (e: React.MouseEvent, acc: AccountItem) => void;
}

export const BankAccountsSection: React.FC<BankAccountsSectionProps> = ({
  displayAccountItems,
  bankAccounts,
  connectedBank,
  hasConnections,
  syncingAccountId,
  onOpenSelectAccounts,
  onOpenAccountDetail,
  onQuickSyncAccount,
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between px-2">
      <span className="ui-field-label">
        Konton
      </span>
      {hasConnections && (
        <button
          type="button"
          onClick={onOpenSelectAccounts}
          className="text-xs font-semibold text-[var(--accent-primary)] hover:opacity-80 transition-opacity cursor-pointer"
        >
          Välj konton att synka
        </button>
      )}
    </div>
    <div className="ui-group-card">
      {displayAccountItems.map((acc) => {
        const cleanName = stripRawAccountDigits(acc.name) || 'Bankkonto';
        const cleanBank = stripRawAccountDigits(
          acc.bankName || acc.bank || connectedBank || 'Bank'
        );
        const rawBa = bankAccounts.find((b) => b.id === acc.id);
        const isHidden = Boolean(rawBa && rawBa.is_selected === false);
        const isSyncingThis = syncingAccountId === acc.id;

        return (
          <div key={acc.id} className="ui-row">
            <button
              type="button"
              onClick={() => onOpenAccountDetail(acc)}
              className={`flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer ${
                isHidden ? 'opacity-65' : ''
              }`}
            >
              <ItemLogo name={cleanBank} logoUrl={acc.logo} size="md" />
              <div className="min-w-0 flex-1">
                <span className="ui-row-title">{cleanName}</span>
                <span className="ui-row-subtitle">
                  {cleanBank}
                  {isHidden ? ' · Ej synkat' : ''}
                </span>
              </div>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {isHidden ? (
                <button
                  type="button"
                  onClick={(e) => onQuickSyncAccount(e, acc)}
                  disabled={isSyncingThis}
                  className="px-3 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowClockwise
                    size={13}
                    weight="bold"
                    className={isSyncingThis ? 'animate-spin' : ''}
                  />
                  <span>{isSyncingThis ? 'Synkar...' : 'Synka'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenAccountDetail(acc)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="ui-row-amount">{formatKr(acc.balance)}</span>
                  <CaretRight size={14} className="text-[var(--text-muted)]" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
