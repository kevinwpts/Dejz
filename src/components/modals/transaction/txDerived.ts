// Härledda värden för köpfönstret (konto, banktext, ursprungligt namn) – rena funktioner utan state.
import type { BankTransactionItem } from '../../../services/bankService';
import type { AccountItem, TransactionItem } from '../../HomeTab';
import { getTransactionMetaMap } from '../../../utils/appCache';
import {
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  formatSwishTitle,
  isLikelySwishTransactionText,
} from '../../../utils/bankHistoryAnalyzer';
import { describeAccount, type AccountDisplayInfo } from '../../../utils/accountDisplay';

export type TxAccountInfo = AccountDisplayInfo;

/** Vilket konto köpet gjordes från, med maskerat och fullt kontonummer */
export function resolveTxAccountInfo(
  activeTx: TransactionItem | null,
  accounts: AccountItem[]
): TxAccountInfo | null {
  if (!activeTx) return null;
  const raw = activeTx.bankAccountName || '';
  const checking =
    (activeTx.bankAccountId
      ? accounts.find((a) => a.id === activeTx.bankAccountId)
      : undefined) ||
    accounts.find(
      (a) =>
        raw &&
        (raw.toLowerCase().includes(a.name.toLowerCase()) ||
          raw.toLowerCase().includes(a.bankName.toLowerCase()))
    ) ||
    accounts.find((a) => a.type === 'checking') ||
    accounts[0];

  return describeAccount(raw, checking);
}

/** Om köpet kommer från banken (då går belopp och datum inte att ändra) */
export function isTxBankSynced(activeTx: TransactionItem | null): boolean {
  return Boolean(
    activeTx &&
      (activeTx.id?.startsWith('bank-') ||
        activeTx.rawDescription ||
        activeTx.counterpartyName ||
        activeTx.bankAccountName)
  );
}

/** Orörd originaltext direkt från banken (visas alltid som referens under "Banktext") */
export function getRawBankText(activeTx: TransactionItem | null): string {
  if (!activeTx) return '';
  const desc = (activeTx.rawDescription || '').trim();
  const cp = (activeTx.counterpartyName || '').trim();
  if (
    desc &&
    cp &&
    desc.toLowerCase() !== cp.toLowerCase() &&
    !desc.toLowerCase().includes(cp.toLowerCase()) &&
    !cp.toLowerCase().includes(desc.toLowerCase())
  ) {
    return `${cp} · ${desc}`;
  }
  return desc || cp || '';
}

/** Ursprungligt namn (så som posten såg ut när banken importerade den eller när den skapades från början, oavsett hur många gånger den döpts om) */
export function getDefaultCleanBankTitle(activeTx: TransactionItem | null): string {
  if (!activeTx) return '';
  const rawSource = (activeTx.counterpartyName || activeTx.rawDescription || '').trim();
  if (!rawSource && !activeTx.rawJson) {
    return (
      activeTx.originalTitle ||
      (activeTx.id ? getTransactionMetaMap()[activeTx.id]?.originalTitle : '') ||
      ''
    ).trim();
  }
  if (
    activeTx.category === 'Swish' ||
    /swish/i.test(rawSource) ||
    isLikelySwishTransactionText(rawSource, activeTx.rawJson)
  ) {
    return formatSwishTitle(
      activeTx.rawDescription || rawSource,
      activeTx.counterpartyName,
      activeTx.type === 'income',
      activeTx.rawJson,
      true
    );
  }
  const pureCategorized = categorizeBankTransactionForApp(
    {
      description: activeTx.rawDescription || '',
      counterparty_name: activeTx.counterpartyName || '',
      raw_json: activeTx.rawJson,
      reconciliation_status: activeTx.reconciliationStatus,
    } as BankTransactionItem,
    undefined,
    undefined,
    true
  );
  if (pureCategorized?.merchant && pureCategorized.merchant !== 'Banktransaktion') {
    return pureCategorized.merchant;
  }
  const cleaned = cleanDisplayMerchantName(rawSource);
  return cleaned && cleaned !== 'Banktransaktion' ? cleaned : rawSource;
}

/** Köp via betaltjänst (Klarna, Swish m.fl.) – namnbyte ska då helst bara gälla ett köp */
export function isAggregatorTransaction(activeTx: TransactionItem | null): boolean {
  return Boolean(
    activeTx &&
      (/\b(klarna|swish|paypal|qliro|walley|trustly)\b/i.test(
        `${activeTx.rawDescription || ''} ${activeTx.counterpartyName || ''} ${activeTx.title || ''}`
      ) ||
        activeTx.category === 'Swish')
  );
}
