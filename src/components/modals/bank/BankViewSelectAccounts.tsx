// "Anslut bank" steg 3: välj vilka konton som ska synkas och ge dem egna namn.
import React from 'react';
import { SpinnerGap, Check } from '@phosphor-icons/react';
import type { SetStateAction } from 'react';
import type { BankAccount, BankConnection } from '../../../services/bank/types';
import { formatBankKr, getCleanAccountTypeLabel } from './shared';

export interface BankViewSelectAccountsProps {
  fetchedAccounts: BankAccount[];
  selectedAccountIds: string[];
  accountCustomNames: Record<string, string>;
  setAccountCustomNames: (value: SetStateAction<Record<string, string>>) => void;
  activeConnection: BankConnection | null;
  toggleAccountSelection: (id: string) => void;
  savingAccounts: boolean;
  onSave: () => void;
}

export const BankViewSelectAccounts: React.FC<BankViewSelectAccountsProps> = ({
  fetchedAccounts,
  selectedAccountIds,
  accountCustomNames,
  setAccountCustomNames,
  activeConnection,
  toggleAccountSelection,
  savingAccounts,
  onSave,
}) => (
  <div className="space-y-4">
    <p className="text-subhead leading-snug text-[var(--text-secondary)] px-1">
      Välj vilka konton Dejz ska räkna med.
    </p>
    <div className="space-y-2.5 max-h-80 overflow-y-auto">
      {fetchedAccounts.map((acc, idx) => {
        const isChecked = selectedAccountIds.includes(acc.id);
        const fallbackLabel = getCleanAccountTypeLabel(acc, idx);
        const currentCustomName =
          accountCustomNames[acc.id] !== undefined
            ? accountCustomNames[acc.id]
            : acc.custom_name || fallbackLabel;
        const bankLabel = acc.bankName || activeConnection?.aspsp_name || 'Bank';

        return (
          <div
            key={acc.id}
            className="rounded-card-nested bg-[var(--fill-grouped)] overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleAccountSelection(acc.id)}
              className="ui-row cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`ui-checkbox ${isChecked ? 'ui-checkbox-on' : 'ui-checkbox-off'}`}
                >
                  {isChecked && <Check size={12} weight="bold" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="ui-row-title">
                    {currentCustomName || fallbackLabel}
                  </span>
                  <span className="ui-row-subtitle">
                    {bankLabel}
                  </span>
                </div>
              </div>
              <span className="ui-row-amount shrink-0">
                {formatBankKr(acc.balance_amount, acc.balance_currency || acc.currency)}
              </span>
            </button>

            {isChecked && (
              <label className="ui-input-row border-t border-[var(--separator)]">
                <span className="text-[var(--text-secondary)] shrink-0">Visas som</span>
                <input
                  type="text"
                  value={currentCustomName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAccountCustomNames((prev) => ({ ...prev, [acc.id]: val }));
                  }}
                  placeholder={fallbackLabel}
                  className="ui-inline-input"
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
            )}
          </div>
        );
      })}
    </div>

    <button
      type="button"
      onClick={onSave}
      disabled={savingAccounts || selectedAccountIds.length === 0}
      className="ui-btn-primary"
    >
      {savingAccounts && <SpinnerGap size={15} className="animate-spin" />}
      <span>Spara</span>
    </button>
  </div>
);
