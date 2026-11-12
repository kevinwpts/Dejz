// Känner igen överföringar mellan användarens egna konton och mikrosparande.
import { BankAccount, BankTransactionItem } from '../../../services/bank/types';
import { BankRawJson } from '../../../app/models';
import { isLikelyPersonFullName } from '../accounts';
import { isLikelySwishTransactionText } from '../merchantRules';
import { getBankTxCodeDescription, includesAny, isPendingBookingStatus } from '../txFields';
import { getNormalizedBankTxAmount } from './amount';

/** Bankkoder som betyder kontoöverföring (t.ex. SEB "Transfer"). */
const OWN_TRANSFER_BANK_CODES = ['transfer', 'internal transfer', 'internaltransfer', 'account transfer'];

/** Bankkoder och ord som visar att det är ett köp eller en betalning – aldrig egen överföring. */
const PAYMENT_BANK_CODES = ['card purchase', 'direct debit', 'payment', 'instant payment'];
const PAYMENT_WORDS = ['kortköp', 'kortkop', 'autogiro', 'bankgiro', 'plusgiro', 'fakturabetalning'];

/** Ord som betyder överföring mellan egna konton eller till ett sparkonto. */
const OWN_TRANSFER_WORDS = [
  'enkla sparkontot',
  'egna konton',
  'egen överföring',
  'egen overforing',
  'mellan egna',
  'intern överföring',
  'intern overforing',
  'kontoöverföring',
  'kontooverforing',
  'överf via internet',
  'overf via internet',
  'överföring via internet',
  'overforing via internet',
  'överföring mobil',
  'overforing mobil',
  'sparkonto',
  'framtidskonto',
  'placeringskonto',
  'kapitalkonto',
  'fasträntekonto',
  'buffertkonto',
];

/** Kontonamn som är för allmänna för att jämföras mot transaktionstexten. */
const GENERIC_ACCOUNT_LABELS = ['konto', 'bank', 'privat', 'privatkonto', 'lönekonto', 'lonekonto'];

/** Meddelandet till mottagaren (remittance_information) som en enda text. */
function getRemittanceText(rawJson: BankRawJson): string {
  const info = rawJson?.remittance_information;
  if (Array.isArray(info)) {
    return info.map((r) => (typeof r === 'string' ? r : r?.unstructured || '')).join(' ');
  }
  return typeof info === 'string' ? info : '';
}

/** Gör om ett namn till bara bokstäver och mellanslag, t.ex. "KEVIN PETERS" → "kevin peters". */
function normalizePersonLetters(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-zåäö\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Sant om transaktionen tydligt är ett köp, en betalning eller en Swish. */
function isPaymentOrPurchase(
  tx: BankTransactionItem,
  rawJson: BankRawJson,
  combined: string,
  bankCodeDesc: string,
  remittanceText: string
): boolean {
  return (
    Boolean(rawJson?.card_transaction) ||
    PAYMENT_BANK_CODES.includes(bankCodeDesc) ||
    includesAny(combined, PAYMENT_WORDS) ||
    isLikelySwishTransactionText(tx.description, rawJson) ||
    isLikelySwishTransactionText(tx.counterparty_name, rawJson) ||
    isLikelySwishTransactionText(remittanceText, rawJson)
  );
}

/** Sant om beskrivningen bara är "Överföring"/"Insättning" eller börjar med "Överf.". */
function isPlainTransferDescription(description: string | null | undefined): boolean {
  const descTrimmed = (description || '').toLowerCase().trim();
  return (
    ['överföring', 'overforing', 'insättning', 'insattning'].includes(descTrimmed) ||
    /^(överföring|overforing|överf\.?|overf\.?)\b/i.test(descTrimmed)
  );
}

/** Sant om texten är ett kontonummer + referens (t.ex. SEB "51960050753 225532192851"). */
function looksLikeRawAccountNumber(tx: BankTransactionItem): boolean {
  const candidate = (tx.description || tx.counterparty_name || '')
    .replace(/^(från|fran|till|överföring|overforing|insättning|insattning)\s+/i, '')
    .trim();
  const digits = candidate.replace(/\D+/g, '');
  return (
    candidate.length >= 15 &&
    /^[\d\s.,-]+$/.test(candidate) &&
    digits.length >= 16 &&
    digits.length <= 32
  );
}

/** Det som behövs för att jämföra en transaktion mot användarens konton. */
interface OwnAccountMatchContext {
  tx: BankTransactionItem;
  combined: string;
  combinedDigits: string;
  counterpartyBban: string;
  counterpartyIban: string;
  partyLetters: string[];
}

/**
 * Motpartens konto: vid utbetalning är det mottagaren (creditor), vid insättning avsändaren (debtor).
 * Användarens eget konto på transaktionen jämförs alltså aldrig med sig självt.
 */
function buildOwnAccountMatchContext(
  tx: BankTransactionItem,
  rawJson: BankRawJson,
  combined: string
): OwnAccountMatchContext {
  const creditorBban = (rawJson?.creditor_account?.other?.identification || '').replace(/\D+/g, '');
  const debtorBban = (rawJson?.debtor_account?.other?.identification || '').replace(/\D+/g, '');
  const creditorIban = (rawJson?.creditor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const debtorIban = (rawJson?.debtor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const txAmt = getNormalizedBankTxAmount(tx);
  return {
    tx,
    combined,
    combinedDigits: combined.replace(/\D+/g, ''),
    counterpartyBban: txAmt < 0 ? creditorBban : txAmt > 0 ? debtorBban : '',
    counterpartyIban: txAmt < 0 ? creditorIban : txAmt > 0 ? debtorIban : '',
    partyLetters: [
      normalizePersonLetters(tx.description || ''),
      normalizePersonLetters(tx.counterparty_name || ''),
    ],
  };
}

/** Sant om kontots BBAN (helt, utan clearing eller sista 7 siffrorna) finns i texten eller hos motparten. */
function matchesAccountBban(ctx: OwnAccountMatchContext, acc: BankAccount, isSameSource: boolean): boolean {
  const bbanDigits = (acc.bban || '').replace(/\D+/g, '');
  if (bbanDigits.length < 6) return false;
  const variants = [bbanDigits];
  if (bbanDigits.length >= 10) {
    if (bbanDigits.slice(4).length >= 6) variants.push(bbanDigits.slice(4));
    if (bbanDigits.slice(-7).length === 7) variants.push(bbanDigits.slice(-7));
  }
  const cp = ctx.counterpartyBban;
  return variants.some(
    (v) =>
      (ctx.combinedDigits.length >= 6 && ctx.combinedDigits.includes(v)) ||
      (!isSameSource && Boolean(cp) && (cp.includes(v) || v.includes(cp)))
  );
}

/** Sant om kontots IBAN är motpartens IBAN eller står i texten. */
function matchesAccountIban(ctx: OwnAccountMatchContext, acc: BankAccount, isSameSource: boolean): boolean {
  const aIban = (acc.iban || '').replace(/\s+/g, '').toUpperCase();
  return (
    aIban.length >= 10 &&
    ((!isSameSource && ctx.counterpartyIban === aIban) ||
      ctx.combined.toUpperCase().replace(/\s+/g, '').includes(aIban))
  );
}

/**
 * Sant om beskrivning/motpart är kontoinnehavarens eget namn – även SEB:s
 * 12-teckens trunkering (t.ex. "KEVIN PETERS" för "KEVIN PETERSEN").
 */
function matchesAccountHolderName(ctx: OwnAccountMatchContext, acc: BankAccount): boolean {
  const holder = normalizePersonLetters(acc.name || '');
  if (holder.length < 7 || !holder.includes(' ')) return false;
  return ctx.partyLetters.some(
    (party) =>
      Boolean(party) &&
      party.length >= 7 &&
      party.includes(' ') &&
      (party === holder ||
        (party.length >= 8 && holder.startsWith(party)) ||
        (holder.length >= 8 && party.startsWith(holder)))
  );
}

/** Sant om kontots eget namn/produktnamn (t.ex. "Buffert resor") står i texten. */
function matchesAccountLabel(ctx: OwnAccountMatchContext, acc: BankAccount): boolean {
  return [acc.custom_name, acc.product].some((label) => {
    const cleanLabel = (label || '').trim().toLowerCase();
    return (
      cleanLabel.length >= 6 &&
      !GENERIC_ACCOUNT_LABELS.includes(cleanLabel) &&
      !isLikelyPersonFullName(cleanLabel) &&
      ctx.combined.includes(cleanLabel)
    );
  });
}

/** Sant om transaktionen pekar på något av användarens egna konton. */
function matchesOwnAccount(ctx: OwnAccountMatchContext, acc: BankAccount): boolean {
  const isSameSource = Boolean(acc.id && ctx.tx.bank_account_id && acc.id === ctx.tx.bank_account_id);
  return (
    matchesAccountBban(ctx, acc, isSameSource) ||
    matchesAccountIban(ctx, acc, isSameSource) ||
    matchesAccountHolderName(ctx, acc) ||
    matchesAccountLabel(ctx, acc)
  );
}

/**
 * Känner igen mikrosparande och överföringar mellan användarens egna konton
 * (t.ex. SEB "Enkla vardagen", "Enkla sparkontot", "Överföring egna konton"),
 * så att de aldrig räknas som köp eller fasta utgifter.
 */
export function isInternalTransferOrMicroSavings(
  tx: BankTransactionItem,
  userAccounts: BankAccount[] = []
): boolean {
  const rawJson = tx.raw_json || {};
  const remittanceText = getRemittanceText(rawJson);
  const combined = `${tx.description || ''} ${tx.counterparty_name || ''} ${remittanceText}`
    .toLowerCase()
    .trim();
  const bankCodeDesc = getBankTxCodeDescription(tx);

  // Mikrospar ("Enkla vardagen" / "Enkla sparkontot") är alltid sparande
  if (includesAny(combined, ['enkla vardag', 'enkla sparko'])) return true;

  // Reserverade kortköp som inte nämner överföring är aldrig egna överföringar
  if (isPendingBookingStatus(tx.booking_status) && !includesAny(combined, ['överföring', 'overforing'])) {
    return false;
  }
  if (isPaymentOrPurchase(tx, rawJson, combined, bankCodeDesc, remittanceText)) return false;

  if (
    OWN_TRANSFER_BANK_CODES.includes(bankCodeDesc) ||
    includesAny(combined, OWN_TRANSFER_WORDS) ||
    isPlainTransferDescription(tx.description) ||
    looksLikeRawAccountNumber(tx)
  ) {
    return true;
  }

  const ctx = buildOwnAccountMatchContext(tx, rawJson, combined);
  return userAccounts.some((acc) => matchesOwnAccount(ctx, acc));
}
