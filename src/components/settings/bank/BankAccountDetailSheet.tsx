// Bankinställningar: bladet "Kontoinställningar" – byt namn, synka eller dölj ett konto
import React from 'react';
import type { SetStateAction } from 'react';
import { ArrowClockwise, Check } from '@phosphor-icons/react';
import type { AccountItem } from '../../../app/models';
import { BottomSheet } from '../../ui/BottomSheet';
import { ItemLogo } from '../../ItemLogo';
import { formatKr } from './formatKr';
import { formatAccountNumberShort } from '../../../utils/accountDisplay';

interface BankAccountDetailSheetProps {
  editingAccount: AccountItem | null;
  connectedBank: string | null;
  accountNameInput: string;
  setAccountNameInput: (value: SetStateAction<string>) => void;
  accountIncludedInput: boolean;
  setAccountIncludedInput: (value: SetStateAction<boolean>) => void;
  savingAccountEdit: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onSyncNow: () => void;
}

export const BankAccountDetailSheet: React.FC<BankAccountDetailSheetProps> = ({
  editingAccount,
  connectedBank,
  accountNameInput,
  setAccountNameInput,
  accountIncludedInput,
  setAccountIncludedInput,
  savingAccountEdit,
  onClose,
  onSubmit,
  onSyncNow,
}) => (
  <BottomSheet
    isOpen={editingAccount !== null}
    onClose={onClose}
    title="Kontoinställningar"
  >
    {editingAccount && (
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="ui-field-card space-y-3.5">
          <label className="flex items-center gap-3.5 cursor-text">
            <ItemLogo
              name={editingAccount.bankName || editingAccount.bank || connectedBank || 'Bank'}
              logoUrl={editingAccount.logo}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <span className="ui-field-label block mb-0.5">
                Kontonamn
              </span>
              <input
                type="text"
                value={accountNameInput}
                onChange={(e) => setAccountNameInput(e.target.value)}
                placeholder="Kontonamn"
                required
                className="ui-field-input-lg"
              />
            </div>
          </label>

          <div className="border-t border-[var(--border-subtle)] pt-3.5 flex items-baseline justify-between gap-2">
            <span className="ui-field-label">
              Saldo
            </span>
            <span className="font-display font-bold text-xl text-[var(--text-primary)] tabular-nums">
              {formatKr(editingAccount.balance)}
            </span>
          </div>
        </div>

        <div className="ui-sheet-group">

          <div className="ui-row">
            <span className="text-[var(--text-secondary)] shrink-0">Bank</span>
            <span className="font-medium text-[var(--text-primary)]">
              {editingAccount.bankName || editingAccount.bank || connectedBank || 'Bank'}
            </span>
          </div>

          {editingAccount.accountNumber && (
            <div className="ui-row">
              <span className="text-[var(--text-secondary)] shrink-0">Kontonummer</span>
              <span className="font-medium text-[var(--text-primary)] tabular-nums">
                {formatAccountNumberShort(editingAccount.accountNumber)}
              </span>
            </div>
          )}

          <div className="ui-row">
            <div className="min-w-0 pr-3">
              <span className="text-[var(--text-primary)] font-medium block">
                Synka och visa i översikten
              </span>
              <span className="text-footnote text-[var(--text-secondary)] block mt-0.5">
                Räkna med saldo och händelser från detta konto
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={accountIncludedInput}
              aria-label="Synka och visa i översikten"
              onClick={() => setAccountIncludedInput((prev) => !prev)}
              className={`ui-switch ${
                accountIncludedInput ? 'ui-switch-on' : 'ui-switch-off'
              }`}
            >
              <span
                className={`ui-switch-thumb ${
                  accountIncludedInput ? 'ui-switch-thumb-on' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            disabled={savingAccountEdit}
            onClick={onSyncNow}
            className="ui-btn-secondary"
          >
            <ArrowClockwise size={16} className={savingAccountEdit ? 'animate-spin' : ''} />
            <span>{savingAccountEdit ? 'Synkar konto...' : 'Synka detta konto nu'}</span>
          </button>

          <button
            type="submit"
            disabled={savingAccountEdit || !accountNameInput.trim()}
            className="ui-btn-primary"
          >
            <Check size={14} weight="bold" />
            <span>{savingAccountEdit ? 'Sparar...' : 'Spara'}</span>
          </button>
        </div>
      </form>
    )}
  </BottomSheet>
);
