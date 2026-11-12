// Belopp och tecken: vad som är utgift/inkomst och vad det blir i kronor.
import { BankTransactionItem } from '../../../services/bank/types';
import { BankRawJson } from '../../../app/models';
import { getTxText, includesAny } from '../txFields';
import { EXPLICIT_REFUND_WORDS, RESERVATION_WORDS, isExplicitInflowTransaction } from './inflow';

/** Ungefärliga växelkurser till kronor, när banken inte skickar egen kurs. */
export const APPROX_FX_RATES_TO_SEK: Record<string, number> = {
  SEK: 1,
  EUR: 11.45,
  USD: 10.65,
  NOK: 0.98,
  DKK: 1.53,
  GBP: 13.5,
  CHF: 12.1,
  PLN: 2.65,
  THB: 0.31,
  JPY: 0.071,
  CAD: 7.75,
  AUD: 6.95,
};

/** Sant om transaktionen är ett reserverat (ej bokfört) köp enligt status eller text. */
function isReservedBankTx(tx: BankTransactionItem, status: string | null, combined: string): boolean {
  return (
    status === 'PDNG' ||
    status === 'HOLD' ||
    tx.reconciliation_status === 'reserved_pending' ||
    includesAny(combined, RESERVATION_WORDS)
  );
}

/**
 * Ger transaktionens belopp med rätt tecken: köp, räkningar och utgående betalningar blir
 * alltid negativa, medan bekräftade inkomster (lön, Swish in, insättning, retur, bidrag) blir positiva.
 */
export function getNormalizedBankTxAmount(tx: BankTransactionItem): number {
  const raw = Number(tx.amount);
  if (!Number.isFinite(raw) || raw === 0) return 0;

  const desc = tx.description || '';
  const counterparty = tx.counterparty_name || '';
  const indicator = tx.credit_debit_indicator
    ? String(tx.credit_debit_indicator).toUpperCase().trim()
    : null;
  const status = tx.booking_status ? String(tx.booking_status).toUpperCase().trim() : null;

  if (indicator === 'DBIT') return -Math.abs(raw);

  // Reservationer är spärrade kortköp – alltid utgift om det inte uttryckligen är en retur
  const combined = `${desc} ${counterparty}`.toLowerCase();
  if (isReservedBankTx(tx, status, combined) && !includesAny(combined, EXPLICIT_REFUND_WORDS)) {
    return -Math.abs(raw);
  }

  const isInflow = isExplicitInflowTransaction(desc, counterparty, indicator, status);
  if (raw < 0 && !isInflow) return raw;
  if (isInflow) return Math.abs(raw);

  // På ett bankkonto är alla vanliga transaktioner (kortköp, butiker, betalningar) utgifter
  return -Math.abs(raw);
}

export interface BankTxSekAmount {
  signedSekAmount: number;
  absSekAmount: number;
  isForeignCurrency: boolean;
  originalCurrency: string;
  originalAmount: number;
}

const roundOre = (value: number): number => Math.round(value * 100) / 100;

/** Kronor-transaktion: kolla om banken angett att köpet egentligen gjordes i annan valuta. */
function resolveSekCurrencyTx(signedRaw: number, rawJson: BankRawJson): BankTxSekAmount {
  const absRaw = Math.abs(signedRaw);
  const instrCurrency = String(
    rawJson?.instructed_amount?.currency || rawJson?.currency_exchange?.source_currency || 'SEK'
  )
    .toUpperCase()
    .trim();
  const instrAmt = Number(rawJson?.instructed_amount?.amount);
  const isForeign =
    Boolean(instrCurrency) && instrCurrency !== 'SEK' && Number.isFinite(instrAmt) && instrAmt > 0;
  return {
    signedSekAmount: signedRaw,
    absSekAmount: roundOre(absRaw),
    isForeignCurrency: isForeign,
    originalCurrency: isForeign ? instrCurrency : 'SEK',
    originalAmount: isForeign ? Math.abs(instrAmt) : absRaw,
  };
}

/** Utländsk valuta: använd bankens kronbelopp, bankens kurs eller vår ungefärliga kurs. */
function resolveForeignCurrencyTx(
  signedRaw: number,
  currency: string,
  rawJson: BankRawJson
): BankTxSekAmount {
  const absRaw = Math.abs(signedRaw);
  const sign = signedRaw < 0 ? -1 : 1;
  const foreign = { isForeignCurrency: true, originalCurrency: currency, originalAmount: absRaw };

  const instrCurr = String(rawJson?.instructed_amount?.currency || '').toUpperCase().trim();
  const instrVal = Number(rawJson?.instructed_amount?.amount);
  if (instrCurr === 'SEK' && Number.isFinite(instrVal) && instrVal !== 0) {
    const absSek = roundOre(Math.abs(instrVal));
    return { signedSekAmount: sign * absSek, absSekAmount: absSek, ...foreign };
  }

  const fxRate = Number(
    rawJson?.exchange_rate ||
      rawJson?.currency_exchange?.exchange_rate ||
      APPROX_FX_RATES_TO_SEK[currency] ||
      1
  );
  const validRate = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1;
  const absSek = roundOre(absRaw * validRate);
  return { signedSekAmount: sign * absSek, absSekAmount: absSek, ...foreign };
}

/**
 * Räknar ut transaktionens belopp i kronor. Utländska köp (t.ex. 50 EUR) räknas om med
 * bankens belopp/kurs i rådatan, annars med en ungefärlig kurs – så att 50 EUR inte blir 50 kr.
 */
export function resolveBankTxSekAmount(tx: BankTransactionItem): BankTxSekAmount {
  const signedRaw = getNormalizedBankTxAmount(tx);
  const currency = String(tx.currency || 'SEK').toUpperCase().trim();
  const rawJson = tx.raw_json || {};
  if (!currency || currency === 'SEK') return resolveSekCurrencyTx(signedRaw, rawJson);
  return resolveForeignCurrencyTx(signedRaw, currency, rawJson);
}

/** Kort- och kreditbolag vars månadsfaktura inte ska räknas som ett eget köp. */
const CREDIT_CARD_INVOICE_WORDS = [
  'entercard',
  'remember card',
  'bank norwegian',
  'morrow bank',
  'amex',
  'american express',
  'seb kort',
  'eurocard',
  'mastercard faktura',
  'kreditkortsfaktura',
  'resurs bank',
  'ikano bank',
  'marginalen bank',
  'collector bank',
  'walley',
  'qliro',
];

/** Sant för en större betalning av kreditkorts-/Klarnafaktura (köpen räknas redan var för sig). */
export function isLikelyCreditCardInvoiceBankTx(tx: BankTransactionItem): boolean {
  const signedAmt = getNormalizedBankTxAmount(tx);
  const absAmt = Math.abs(signedAmt);
  if (signedAmt >= 0 || absAmt < 800) return false;
  const text = getTxText(tx);
  if (includesAny(text, CREDIT_CARD_INVOICE_WORDS)) return true;
  return text.includes('klarna') && absAmt >= 1500 && !tx.raw_json?.card_transaction;
}
