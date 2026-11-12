// Bankinställningar: bladet "Välj konton att synka" för en bankkoppling
import React from 'react';
import { Check } from '@phosphor-icons/react';
import type { BankConnection, BankAccount } from '../../../services/bank/types';
import type { getAccountMetaMap } from '../../../utils/cache/itemMeta';
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
                    ? 'bg-[var(--fill-grouped)] border-transparent'
                    : 'bg-[var(--fill-grouped)] border-transparent opacity-60'
                }`}
              >
                <div
                  className={`ui-checkbox ${isChecked ? 'ui-checkbox-on' : 'ui-checkbox-off'}`}
                >
                  {isChecked && <Check size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="ui-option-title">
                    {accTitle}
                  </span>
                  <span className="text-footnote text-[var(--text-secondary)] block tabular-nums mt-0.5">
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
            <Check size={14} />
            <span>{savingConnAccounts ? 'Synkar valda konton...' : 'Spara och synka'}</span>
          </button>

          <button
            type="button"
            disabled={reconnectingBankId === selectingAccountsConn.id}
            onClick={() => onReconnect(selectingAccountsConn)}
            className="ui-btn-danger text-[var(--text-secondary)] disabled:opacity-50"
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
