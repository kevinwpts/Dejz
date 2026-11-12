// Steg 4 i "Nytt sparmål": hur vill du följa sparandet? (eget belopp, totalsaldo eller ett konto).
import React from 'react';
import { Check, Bank } from '@phosphor-icons/react';
import type { AccountItem } from '../../../app/models';
import { ItemLogo } from '../../ItemLogo';

interface StepAccountLinkProps {
  animClass: string;
  goalLinkedAccountId: string | undefined;
  accounts: AccountItem[];
  effectiveTotalBalance: number;
  formatKr: (amount: number) => string;
  /** Kopplar målet till ett konto (eller '__TOTAL__') och sätter startbeloppet till saldot. */
  onLinkAccount: (accountId: string, balance: number) => void;
  /** Eget valt belopp – ingen koppling. */
  onUnlink: () => void;
  /** Får målet sparas direkt? (namn och målbelopp ifyllda) */
  canSave: boolean;
  onContinue: () => void;
  onSave: () => void;
}

// Valt kort: samma mjuka lila ton + ring som alla andra valda plattor (ui-selected)
const cardClass = (selected: boolean) =>
  `ui-option-card border-transparent ${
    selected ? 'ui-selected' : 'bg-[var(--surface-color)] shadow-[var(--card-shadow)]'
  }`;

const checkboxClass = (selected: boolean) =>
  `ui-checkbox ${selected ? 'ui-checkbox-on' : 'ui-checkbox-off'}`;

export const StepAccountLink: React.FC<StepAccountLinkProps> = ({
  animClass,
  goalLinkedAccountId,
  accounts,
  effectiveTotalBalance,
  formatKr,
  onLinkAccount,
  onUnlink,
  canSave,
  onContinue,
  onSave,
}) => (
  <div
    className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-4 ${animClass}`}
  >
    <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
      <button type="button" onClick={onUnlink} className={cardClass(!goalLinkedAccountId)}>
        <div className={checkboxClass(!goalLinkedAccountId)}>
          {!goalLinkedAccountId && <Check size={14} />}
        </div>
        <div className="min-w-0 flex-1">
          <span className="ui-option-title">Eget valt belopp</span>
          <span className="text-footnote text-[var(--text-secondary)] block mt-0.5 leading-snug">
            Du fyller i hur mycket du har sparat och sätter in själv
          </span>
        </div>
      </button>

      {(accounts.length > 0 || effectiveTotalBalance > 0) && (
        <button
          type="button"
          onClick={() => onLinkAccount('__TOTAL__', effectiveTotalBalance)}
          className={cardClass(goalLinkedAccountId === '__TOTAL__')}
        >
          <div className={checkboxClass(goalLinkedAccountId === '__TOTAL__')}>
            {goalLinkedAccountId === '__TOTAL__' && <Check size={14} />}
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--fill-grouped)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
            <Bank size={15} weight="regular" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="ui-option-title">Totalsaldo</span>
            <span className="text-footnote text-[var(--text-secondary)] block mt-0.5 leading-snug">
              Alla konton · Synkas automatiskt
            </span>
          </div>
          <span className="text-subhead font-normal tabular-nums text-[var(--text-primary)] shrink-0">
            {formatKr(effectiveTotalBalance)}
          </span>
        </button>
      )}

      {accounts.map((acc) => {
        const isSelected = goalLinkedAccountId === acc.id;
        const accBal = Math.max(0, Math.round(Number(acc.balance) || 0));
        const hasDuplicateName =
          accounts.filter(
            (other) => other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
          ).length > 1;
        const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
        const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';
        const showBankSub =
          Boolean(acc.bankName) &&
          !acc.name.toLowerCase().includes((acc.bankName || '').toLowerCase());

        return (
          <button
            key={acc.id}
            type="button"
            onClick={() => onLinkAccount(acc.id, accBal)}
            className={cardClass(isSelected)}
          >
            <div className={checkboxClass(isSelected)}>
              {isSelected && <Check size={14} />}
            </div>
            <ItemLogo name={acc.bankName || acc.name} category="Bank" logoUrl={acc.logo} size="sm" />
            <div className="min-w-0 flex-1">
              <span className="ui-option-title">{acc.name}</span>
              {(showBankSub || (hasDuplicateName && last4)) && (
                <span className="text-footnote text-[var(--text-secondary)] block tabular-nums mt-0.5 truncate">
                  {showBankSub ? acc.bankName : ''}
                  {showBankSub && hasDuplicateName && last4 ? ' · ' : ''}
                  {hasDuplicateName && last4 ? `•••• ${last4}` : ''}
                </span>
              )}
            </div>
            <span className="text-subhead font-normal tabular-nums text-[var(--text-primary)] shrink-0">
              {formatKr(accBal)}
            </span>
          </button>
        );
      })}
    </div>

    <div className="shrink-0 pt-3">
      {!goalLinkedAccountId ? (
        <button
          type="button"
          onClick={onContinue}
          className="ui-btn-primary"
        >
          <span>Fortsätt</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="ui-btn-primary"
        >
          <span>Skapa sparmål</span>
        </button>
      )}
    </div>
  </div>
);
