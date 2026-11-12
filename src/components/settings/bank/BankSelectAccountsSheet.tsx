// Bankinställningar: bladet "Välj konton att synka" för en bankkoppling
import React from 'react';
import { Check } from '@phosphor-icons/react';
import type { BankConnection, BankAccount } from '../../../services/bankService';
import type { getAccountMetaMap } from '../../../utils/appCache';
import { BottomSheet } from '../../ui/BottomSheet';
import { stripRawAccountDigits } from '../accountText';
import { formatKr } from './formatKr';

interface BankSelectAccountsSheetProps {
  selectingAccountsConn: BankConnection | null;
  bankAccounts: BankAccount[];
  accountMetaMap: ReturnType<typeof getAccountMetaMap>;
  selectedConnAccountIds: string[];
  savingConnAccounts: boolean;
  reconnectingBankId: string | null;
  onClose: () => void;
  onToggleAccount: (accId: string) => void;
  onSave: () => void;
  onReconnect: (conn: BankConnection) => void;
}

export const BankSelectAccountsSheet: React.FC<BankSelectAccountsSheetProps> = ({
  selectingAccountsConn,
  bankAccounts,
  accountMetaMap,
  selectedConnAccountIds,
  savingConnAccounts,
  reconnectingBankId,
  onClose,
  onToggleAccount,
  onSave,
  onReconnect,
}) => (
  <BottomSheet
    isOpen={selectingAccountsConn !== null}
    onClose={onClose}
    title="Välj konton att synka"
  >
    {selectingAccountsConn && (
      <div className="space-y-4">
        <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
          {(bankAccounts.filter((b) => b.connection_id === selectingAccountsConn.id).length > 0
            ? bankAccounts.filter((b) => b.connection_id === selectingAccountsConn.id)
            : bankAccounts
          ).map((ba, idx) => {
            const isChecked = selectedConnAccountIds.includes(ba.id);
            const meta = accountMetaMap[ba.id];
            const accTitle =
              meta?.customName?.trim() ||
              ba.custom_name?.trim() ||
              stripRawAccountDigits(ba.product || ba.name || '') ||
              (idx === 0 ? 'Lönekonto' : 'Sparkonto');
            const rawNum = (ba.bban || ba.iban || '').trim();
            const formattedNum =
              rawNum.length === 11 && /^\d+$/.test(rawNum)
                ? `${rawNum.slice(0, 4)}-${rawNum.slice(4)}`
                : rawNum || selectingAccountsConn.aspsp_name;

            return (
              <button
                key={ba.id}
                type="button"
                onClick={() => onToggleAccount(ba.id)}
                className={`w-full p-3.5 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-[var(--bg-color)] border-[var(--border-subtle)]'
                    : 'bg-[var(--bg-color)]/50 border-[var(--border-subtle)] opacity-60'
                }`}
              >
                <div
                  className={`ui-checkbox ${
                    isChecked
                      ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                  }`}
                >
                  {isChecked && <Check size={12} weight="bold" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="ui-option-title">
                    {accTitle}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5">
                    {formattedNum}
                  </span>
                </div>
                {ba.balance_amount !== null && ba.balance_amount !== undefined && (
                  <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                    {formatKr(Number(ba.balance_amount) || 0)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={savingConnAccounts || selectedConnAccountIds.length === 0}
            onClick={onSave}
            className="ui-btn-primary"
          >
            <Check size={14} weight="bold" />
            <span>{savingConnAccounts ? 'Synkar valda konton...' : 'Spara och synka'}</span>
          </button>

          <button
            type="button"
            disabled={reconnectingBankId === selectingAccountsConn.id}
            onClick={() => onReconnect(selectingAccountsConn)}
            className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            {reconnectingBankId === selectingAccountsConn.id
              ? `Öppnar ${selectingAccountsConn.aspsp_name}...`
              : `Saknas ett konto? Välj fler hos ${selectingAccountsConn.aspsp_name}`}
          </button>
        </div>
      </div>
    )}
  </BottomSheet>
);
