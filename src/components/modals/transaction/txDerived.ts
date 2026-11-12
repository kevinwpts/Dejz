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

export interface TxAccountInfo {
  label: string;
  fullNumber: string;
  maskedNumber: string;
}

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

  const baseLabel = (raw || (checking ? `${checking.bankName} · ${checking.name}` : 'Lönekonto'))
    .replace(/\s*·\s*[•*·\d\s-]{4,}$/g, '')
    .replace(/\b\d[\d\s-]{5,}\b/g, '')
    .replace(/\s*·\s*$/, '')
    .trim() || 'Lönekonto';

  const rawAccNum = (checking?.accountNumber || '').trim();
  const digitsInRaw = (raw.match(/\d[\d\s-]{3,}\d/)?.[0] || '').trim();
  const sourceNum = rawAccNum || digitsInRaw;
  const digitsOnly = sourceNum.replace(/\D/g, '');

  let fullNumber: string;
  let maskedNumber: string;
  if (digitsOnly.length >= 7) {
    fullNumber = sourceNum.replace(/^[•*\s·-]+/, '').trim();
    maskedNumber = `•••• ${digitsOnly.slice(-4)}`;
  } else if (digitsOnly.length >= 4) {
    const last4 = digitsOnly.slice(-4);
    fullNumber = `5231-00 ${last4.slice(0, 2)} ${last4.slice(2)}`;
    maskedNumber = `•••• ${last4}`;
  } else {
    fullNumber = '5231-00 482 19';
    maskedNumber = '•••• 8219';
  }

  return {
    label: baseLabel,
    fullNumber,
    maskedNumber,
  };
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
