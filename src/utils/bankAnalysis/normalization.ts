// Belopp, tecken, överföringar mellan egna konton. Del av bankanalysen (tidigare utils/bankHistoryAnalyzer.ts).
import { BankAccount, BankTransactionItem } from '../../services/bankService';
import { isLikelyPersonFullName } from './accounts';
import { isLikelySwishTransactionText } from './merchantRules';

// ---------------------------------------------------------------------------
// 2. TRANSACTION SIGN NORMALIZATION & INTERNAL TRANSFER FILTERING
// ---------------------------------------------------------------------------

/**
 * Kontrollerar om en transaktion är en bekräftad inkomst (lön, inkommande Swish, insättning, bidrag etc.).
 * Utesluter strikt alla utgående betalningar som kortköp, autogiro, bankgiro, räkningar och utgående Swish.
 */
export function isExplicitInflowTransaction(
  desc: string | null | undefined,
  counterparty: string | null | undefined,
  indicator?: string | null,
  bookingStatus?: string | null
): boolean {
  // 1. Om banken explicit flaggat som DBIT (utgift) kan det ALDRIG vara en inkomst
  if (indicator === 'DBIT') return false;

  const combined = `${desc || ''} ${counterparty || ''}`.toLowerCase().trim();

  // Kända reservationstermer eller preliminär bokningsstatus (PDNG/HOLD)
  const statusUpper = bookingStatus ? String(bookingStatus).toUpperCase().trim() : null;
  const isReserved =
    statusUpper === 'PDNG' ||
    statusUpper === 'HOLD' ||
    combined.includes('reserverat') ||
    combined.includes('reservation') ||
    combined.includes('preliminär') ||
    combined.includes('preliminar');

  const isExplicitRefund =
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering');

  // Reservationer hos svenska banker (t.ex. SEB) är uteslutande preliminära kortköp/utgifter.
  // De får ALDRIG tolkas som inkomst såvida det inte explicit rör sig om en retur/återköp/kreditering.
  if (isReserved && !isExplicitRefund) {
    return false;
  }

  if (!combined && !indicator) return false;

  // 2. Kända utgiftsmönster har alltid företräde (kan ALDRIG bli inkomst):
  if (
    combined.includes('kortköp') ||
    combined.includes('kortkop') ||
    combined.includes('autogiro') ||
    combined.includes('bankgiro') ||
    combined.includes('plusgiro') ||
    combined.includes('fakturabetalning') ||
    combined.includes('faktura') ||
    combined.includes('betalning bg') ||
    combined.includes('betalning pg') ||
    combined.includes('inbetalning bg') ||
    combined.includes('inbetalning pg') ||
    combined.includes('swish betalning') ||
    combined.includes('swish till') ||
    combined.includes('swish skickad') ||
    combined.includes('swish handel') ||
    combined.includes('överföring till') ||
    combined.includes('overforing till') ||
    combined.includes('uttag') ||
    combined.includes('bankomat') ||
    combined.includes('avgift') ||
    combined.includes('årsavgift') ||
    combined.includes('månadsavgift') ||
    combined.includes('räntekostnad') ||
    combined.includes('csn återbetalning') ||
    combined.includes('csn aterbetalning') ||
    combined.includes('premie')
  ) {
    return false;
  }

  // Om transaktionen är "Swish 123..." (dvs till ett 123-företagsnummer vid köp):
  if (/swish\s*123\d{7}/i.test(combined)) {
    return false;
  }

  // 3. Om banken explicit angivit CRDT (kredit/inflöde):
  // Men OBS: Om det är en reservation litar vi aldrig på CRDT, eftersom banker som SEB
  // sätter CRDT på spärrbelopp vid kortköp.
  if (indicator === 'CRDT' && !isReserved) {
    return true;
  }

  // 4. Verifierade inkomstmönster:
  // Lön & arbetsersättning
  if (
    combined.includes('lön') ||
    combined.includes('salary') ||
    combined.includes('löneutbetalning') ||
    combined.includes('loneutbetalning') ||
    /\blon\b/i.test(combined)
  ) {
    return true;
  }

  // Mottagen Swish (inkommande betalning till användaren)
  if (
    combined.includes('swish mottagen') ||
    combined.includes('swish mottagit') ||
    combined.includes('swish inbetalning') ||
    combined.includes('swish inb') ||
    combined.includes('swish från') ||
    combined.includes('swish fran')
  ) {
    return true;
  }

  // Insättning & överföring från annat konto
  if (
    combined.includes('insättning') ||
    combined.includes('insattning') ||
    combined.includes('insatt ') ||
    combined.includes('överföring från') ||
    combined.includes('overforing fran')
  ) {
    return true;
  }

  // Återbetalning, returer & försäkrings-/företagsutbetalningar
  if (
    combined.includes('återbetalning') ||
    combined.includes('aterbetalning') ||
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering') ||
    combined.includes('skadeersättning') ||
    combined.includes('skadeersattning') ||
    combined.includes('försäkringsersättning') ||
    combined.includes('forsakringsersattning') ||
    combined.includes('utbetalning') ||
    combined.includes('återbäring') ||
    combined.includes('aterbaring')
  ) {
    return true;
  }

  // Samhällsbidrag & pensioner
  if (
    combined.includes('försäkringskassan') ||
    combined.includes('forsakringskassan') ||
    combined.includes('barnbidrag') ||
    combined.includes('pension') ||
    combined.includes('pensionsmyndigheten') ||
    combined.includes('skatteverket') ||
    combined.includes('skatteåterbäring') ||
    combined.includes('skatteaterbaring') ||
    combined.includes('a-kassa') ||
    combined.includes('akassa') ||
    combined.includes('studiemedel')
  ) {
    return true;
  }

  // Ränteintäkt eller aktieutdelning
  if (
    combined.includes('aktieutdelning') ||
    combined.includes('ränteintäkt') ||
    combined.includes('ranteintakt') ||
    combined.includes('utdelning')
  ) {
    return true;
  }

  return false;
}

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

/**
 * Resolves the SEK amount for a bank transaction.
 * If the transaction currency is not SEK, inspects raw_json for instructed_amount / exchange_rate
 * or applies fallback FX rates to SEK so foreign purchases (e.g. 50 EUR) are not treated as 50 SEK.
 */
export function resolveBankTxSekAmount(tx: BankTransactionItem): {
  signedSekAmount: number;
  absSekAmount: number;
  isForeignCurrency: boolean;
  originalCurrency: string;
  originalAmount: number;
} {
  const signedRaw = getNormalizedBankTxAmount(tx);
  const absRaw = Math.abs(signedRaw);
  const sign = signedRaw < 0 ? -1 : 1;
  const currency = String(tx.currency || 'SEK').toUpperCase().trim();

  if (!currency || currency === 'SEK') {
    const rawJson = tx.raw_json || {};
    const instrCurrency = String(
      rawJson?.instructed_amount?.currency ||
        rawJson?.currency_exchange?.source_currency ||
        'SEK'
    )
      .toUpperCase()
      .trim();
    const instrAmt = Number(rawJson?.instructed_amount?.amount);
    if (instrCurrency && instrCurrency !== 'SEK' && Number.isFinite(instrAmt) && instrAmt > 0) {
      return {
        signedSekAmount: signedRaw,
        absSekAmount: Math.round(absRaw * 100) / 100,
        isForeignCurrency: true,
        originalCurrency: instrCurrency,
        originalAmount: Math.abs(instrAmt),
      };
    }
    return {
      signedSekAmount: signedRaw,
      absSekAmount: Math.round(absRaw * 100) / 100,
      isForeignCurrency: false,
      originalCurrency: 'SEK',
      originalAmount: absRaw,
    };
  }

  const rawJson = tx.raw_json || {};
  // Check if raw_json contains a SEK instructed/billing amount or explicit exchange_rate
  const instrCurr = String(rawJson?.instructed_amount?.currency || '').toUpperCase().trim();
  const instrVal = Number(rawJson?.instructed_amount?.amount);
  if (instrCurr === 'SEK' && Number.isFinite(instrVal) && instrVal !== 0) {
    const absSek = Math.round(Math.abs(instrVal) * 100) / 100;
    return {
      signedSekAmount: sign * absSek,
      absSekAmount: absSek,
      isForeignCurrency: true,
      originalCurrency: currency,
      originalAmount: absRaw,
    };
  }

  const fxRate = Number(
    rawJson?.exchange_rate ||
      rawJson?.currency_exchange?.exchange_rate ||
      APPROX_FX_RATES_TO_SEK[currency] ||
      1
  );
  const validRate = Number.isFinite(fxRate) && fxRate > 0 ? fxRate : 1;
  const absSek = Math.round(absRaw * validRate * 100) / 100;

  return {
    signedSekAmount: sign * absSek,
    absSekAmount: absSek,
    isForeignCurrency: true,
    originalCurrency: currency,
    originalAmount: absRaw,
  };
}

export function isLikelyCreditCardInvoiceBankTx(tx: BankTransactionItem): boolean {
  const signedAmt = getNormalizedBankTxAmount(tx);
  const absAmt = Math.abs(signedAmt);
  if (signedAmt >= 0 || absAmt < 800) return false;
  const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
  const keywords = [
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
  if (keywords.some((kw) => text.includes(kw))) return true;
  if (text.includes('klarna') && absAmt >= 1500 && !tx.raw_json?.card_transaction) {
    return true;
  }
  return false;
}

export function isLikelyMerchantRefundBankTx(tx: BankTransactionItem): boolean {
  const signedAmt = getNormalizedBankTxAmount(tx);
  if (signedAmt <= 0) return false;
  const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
  if (
    text.includes('lön') ||
    text.includes('salary') ||
    text.includes('csn') ||
    text.includes('försäkringskassan') ||
    text.includes('forsakringskassan') ||
    text.includes('pension') ||
    text.includes('barnbidrag') ||
    text.includes('skatteverket') ||
    text.includes('swish')
  ) {
    return false;
  }
  if (
    text.includes('retur') ||
    text.includes('återköp') ||
    text.includes('aterkop') ||
    text.includes('refund') ||
    text.includes('kreditering') ||
    text.includes('återbetalning') ||
    text.includes('aterbetalning')
  ) {
    return true;
  }
  // Positive card transaction at a retail merchant is a card refund
  if (tx.raw_json?.card_transaction && tx.credit_debit_indicator === 'CRDT') {
    return true;
  }
  return false;
}

/**
 * Normalizes the signed amount of a bank transaction.
 * Ensures that all card purchases, store purchases, bills, autogiro, and outgoing
 * payments are strictly negative outflows (-Math.abs), while verified inflows
 * (salary, incoming Swish, deposits, refunds, benefits) remain positive credits.
 */
export function getNormalizedBankTxAmount(tx: BankTransactionItem): number {
  const raw = Number(tx.amount);
  if (!Number.isFinite(raw) || raw === 0) return 0;

  const desc = tx.description || '';
  const counterparty = tx.counterparty_name || '';
  const indicator = tx.credit_debit_indicator
    ? String(tx.credit_debit_indicator).toUpperCase().trim()
    : null;
  const status = tx.booking_status
    ? String(tx.booking_status).toUpperCase().trim()
    : null;

  // 1. Om banken explicit angivit DBIT:
  if (indicator === 'DBIT') {
    return -Math.abs(raw);
  }

  const combined = `${desc} ${counterparty}`.toLowerCase();
  const isReserved =
    status === 'PDNG' ||
    status === 'HOLD' ||
    tx.reconciliation_status === 'reserved_pending' ||
    combined.includes('reserverat') ||
    combined.includes('reservation') ||
    combined.includes('preliminär') ||
    combined.includes('preliminar');

  const isExplicitRefund =
    combined.includes('återköp') ||
    combined.includes('aterkop') ||
    combined.includes('retur') ||
    combined.includes('refund') ||
    combined.includes('kreditering');

  // Reservationer hos svenska banker är uteslutande kortköp/utgifter som hålls spärrade på kontot.
  // De ska ALLTID vara negativa utgifter (-Math.abs(raw)), såvida det inte uttryckligen är en återbetalning/retur.
  if (isReserved && !isExplicitRefund) {
    return -Math.abs(raw);
  }

  // 2. Om beloppet redan är negativt i bankdatan och det inte är en bekräftad inkomst:
  if (raw < 0 && !isExplicitInflowTransaction(desc, counterparty, indicator, status)) {
    return raw;
  }

  // 3. Kontrollera om transaktionen är en bekräftad inkomst:
  if (isExplicitInflowTransaction(desc, counterparty, indicator, status)) {
    return Math.abs(raw);
  }

  // 4. På ett bankkonto är alla vanliga transaktioner (kortköp, restaurang, butiker, utgående betalningar) utgifter:
  return -Math.abs(raw);
}

/**
 * Detects micro-savings and internal transfers between the user's own accounts
 * (e.g. SEB "Enkla vardagen", "Enkla sparkontot", "Överföring egna konton")
 * so they are never treated as consumption or fixed expenses.
 */
export function isInternalTransferOrMicroSavings(
  tx: BankTransactionItem,
  userAccounts: BankAccount[] = []
): boolean {
  const rawJson = tx.raw_json || {};
  const remittanceText = Array.isArray(rawJson?.remittance_information)
    ? rawJson.remittance_information
        .map((r: any) => (typeof r === 'string' ? r : r?.unstructured || ''))
        .join(' ')
    : typeof rawJson?.remittance_information === 'string'
    ? rawJson.remittance_information
    : '';

  const combined = `${tx.description || ''} ${tx.counterparty_name || ''} ${remittanceText}`
    .toLowerCase()
    .trim();

  const bankCodeDesc = String(rawJson?.bank_transaction_code?.description || '')
    .trim()
    .toLowerCase();

  // Mikrolån/mikrospar ("Enkla vardagen" / "ENKLA VARDAG" / "Enkla sparkontot") är alltid intern överföring/sparande
  if (
    combined.includes('enkla vardag') ||
    combined.includes('enkla sparko')
  ) {
    return true;
  }

  // Reserverade kortköp (PDNG/HOLD) som inte är explicit mikrospar/överföring är ALDRIG interna överföringar
  if (
    (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') &&
    !combined.includes('överföring') &&
    !combined.includes('overforing')
  ) {
    return false;
  }

  if (
    rawJson?.card_transaction ||
    bankCodeDesc === 'card purchase' ||
    bankCodeDesc === 'direct debit' ||
    bankCodeDesc === 'payment' ||
    bankCodeDesc === 'instant payment' ||
    combined.includes('kortköp') ||
    combined.includes('kortkop') ||
    combined.includes('autogiro') ||
    combined.includes('bankgiro') ||
    combined.includes('plusgiro') ||
    combined.includes('fakturabetalning') ||
    isLikelySwishTransactionText(tx.description, rawJson) ||
    isLikelySwishTransactionText(tx.counterparty_name, rawJson) ||
    isLikelySwishTransactionText(remittanceText, rawJson)
  ) {
    return false;
  }

  // SEB och andra svenska banker märker kontoöverföringar med bank_transaction_code.description === "Transfer"
  if (
    bankCodeDesc === 'transfer' ||
    bankCodeDesc === 'internal transfer' ||
    bankCodeDesc === 'internaltransfer' ||
    bankCodeDesc === 'account transfer'
  ) {
    return true;
  }

  if (
    combined.includes('enkla sparkontot') ||
    combined.includes('egna konton') ||
    combined.includes('egen överföring') ||
    combined.includes('egen overforing') ||
    combined.includes('mellan egna') ||
    combined.includes('intern överföring') ||
    combined.includes('intern overforing') ||
    combined.includes('kontoöverföring') ||
    combined.includes('kontooverforing') ||
    combined.includes('överf via internet') ||
    combined.includes('overf via internet') ||
    combined.includes('överföring via internet') ||
    combined.includes('overforing via internet') ||
    combined.includes('överföring mobil') ||
    combined.includes('overforing mobil') ||
    combined.includes('sparkonto') ||
    combined.includes('framtidskonto') ||
    combined.includes('placeringskonto') ||
    combined.includes('kapitalkonto') ||
    combined.includes('fasträntekonto') ||
    combined.includes('buffertkonto')
  ) {
    return true;
  }

  const descTrimmed = (tx.description || '').toLowerCase().trim();
  if (
    descTrimmed === 'överföring' ||
    descTrimmed === 'overforing' ||
    descTrimmed === 'insättning' ||
    descTrimmed === 'insattning' ||
    /^(överföring|overforing|överf\.?|overf\.?)\b/i.test(descTrimmed)
  ) {
    return true;
  }

  // Om beskrivningen är ett bankkontonummer + referens (t.ex. SEB "51960050753 225532192851")
  const rawAcctCandidate = (tx.description || tx.counterparty_name || '')
    .replace(/^(från|fran|till|överföring|overforing|insättning|insattning)\s+/i, '')
    .trim();
  const rawAcctDigits = rawAcctCandidate.replace(/\D+/g, '');
  if (
    rawAcctCandidate.length >= 15 &&
    /^[\d\s.,-]+$/.test(rawAcctCandidate) &&
    rawAcctDigits.length >= 16 &&
    rawAcctDigits.length <= 32
  ) {
    return true;
  }

  const combinedDigits = combined.replace(/\D+/g, '');
  const creditorBban = (rawJson?.creditor_account?.other?.identification || '').replace(/\D+/g, '');
  const debtorBban = (rawJson?.debtor_account?.other?.identification || '').replace(/\D+/g, '');
  const creditorIban = (rawJson?.creditor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const debtorIban = (rawJson?.debtor_account?.iban || '').replace(/\s+/g, '').toUpperCase();

  // På utgående betalningar (DBIT / < 0) är debtor_account användarens eget konto.
  // På inkommande betalningar (CRDT / > 0) är creditor_account användarens eget konto.
  // Vi får ENDAST jämföra motpartens konto (creditor vid utflöde, debtor vid inflöde) mot userAccounts,
  // och ALDRIG matcha mot samma bankkonto som transaktionen själv ligger på (tx.bank_account_id)!
  const txAmt = getNormalizedBankTxAmount(tx);
  const counterpartyBban = txAmt < 0 ? creditorBban : txAmt > 0 ? debtorBban : '';
  const counterpartyIban = txAmt < 0 ? creditorIban : txAmt > 0 ? debtorIban : '';

  const normalizePersonLetters = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-zåäö\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const txDescLetters = normalizePersonLetters(tx.description || '');
  const txCpLetters = normalizePersonLetters(tx.counterparty_name || '');

  for (const acc of userAccounts) {
    const isSameSourceAccount = Boolean(acc.id && tx.bank_account_id && acc.id === tx.bank_account_id);
    const bbanDigits = (acc.bban || '').replace(/\D+/g, '');
    if (bbanDigits.length >= 6) {
      const variants = [bbanDigits];
      if (bbanDigits.length >= 10) {
        if (bbanDigits.slice(4).length >= 6) variants.push(bbanDigits.slice(4));
        if (bbanDigits.slice(-7).length === 7) variants.push(bbanDigits.slice(-7));
      }
      if (
        variants.some(
          (v) =>
            (combinedDigits.length >= 6 && combinedDigits.includes(v)) ||
            (!isSameSourceAccount &&
              counterpartyBban &&
              (counterpartyBban.includes(v) || v.includes(counterpartyBban)))
        )
      ) {
        return true;
      }
    }

    const aIban = (acc.iban || '').replace(/\s+/g, '').toUpperCase();
    if (
      aIban.length >= 10 &&
      ((!isSameSourceAccount && counterpartyIban === aIban) ||
        combined.toUpperCase().replace(/\s+/g, '').includes(aIban))
    ) {
      return true;
    }

    // Kontrollera om transaktionens beskrivning/motpart är kontoinnehavarens eget namn
    // (inklusive SEB:s 12-teckens trunkering vid egen överföring, t.ex. "KEVIN PETERS" för "KEVIN PETERSEN")
    const holderLetters = normalizePersonLetters(acc.name || '');
    if (holderLetters.length >= 7 && holderLetters.includes(' ')) {
      for (const party of [txDescLetters, txCpLetters]) {
        if (!party || party.length < 7 || !party.includes(' ')) continue;
        if (
          party === holderLetters ||
          (party.length >= 8 && holderLetters.startsWith(party)) ||
          (holderLetters.length >= 8 && party.startsWith(holderLetters))
        ) {
          return true;
        }
      }
    }

    for (const label of [acc.custom_name, acc.product]) {
      const cleanLabel = (label || '').trim().toLowerCase();
      if (
        cleanLabel.length >= 6 &&
        cleanLabel !== 'konto' &&
        cleanLabel !== 'bank' &&
        cleanLabel !== 'privat' &&
        cleanLabel !== 'privatkonto' &&
        cleanLabel !== 'lönekonto' &&
        cleanLabel !== 'lonekonto' &&
        !isLikelyPersonFullName(cleanLabel) &&
        combined.includes(cleanLabel)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Identifierar både enskilda och parvisa interna överföringar (utflöde på Konto A + inflöde på Konto B
 * med samma belopp inom <= 3 dagar) direkt i råa banktransaktioner.
 */
export function findRawBankInternalTransferIds(
  transactions: BankTransactionItem[],
  userAccounts: BankAccount[] = []
): Set<string> {
  const internalIds = new Set<string>();
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return internalIds;
  }

  for (const tx of transactions) {
    if (!tx || !tx.id) continue;
    if (
      tx.reconciliation_status === 'internal_transfer' ||
      isInternalTransferOrMicroSavings(tx, userAccounts)
    ) {
      internalIds.add(tx.id);
    }
  }

  const activeTxs = transactions.filter((tx) => {
    if (!tx || !tx.id) return false;
    if (tx.booking_status === 'CNCL' || tx.booking_status === 'RJCT') return false;
    // Reserverade kortköp (PDNG/HOLD) som inte redan explicit flaggats som kontoöverföring ska aldrig parmatchas bort som överföringar
    if (
      (tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD') &&
      !internalIds.has(tx.id)
    ) {
      return false;
    }
    if (
      tx.reconciliation_status === 'reserved_replaced' ||
      tx.replaced_by_bank_tx_id ||
      tx.reconciliation_status === 'excluded'
    ) {
      return false;
    }
    if (
      isLikelySwishTransactionText(tx.description, tx.raw_json) ||
      isLikelySwishTransactionText(tx.counterparty_name, tx.raw_json)
    ) {
      return false;
    }
    const btcDesc = String(tx.raw_json?.bank_transaction_code?.description || '')
      .trim()
      .toLowerCase();
    if (
      btcDesc === 'card purchase' ||
      btcDesc === 'direct debit' ||
      btcDesc === 'payment' ||
      btcDesc === 'instant payment'
    ) {
      return false;
    }
    return true;
  });

  const outflows = activeTxs.filter((t) => getNormalizedBankTxAmount(t) < 0);
  const inflows = activeTxs.filter((t) => {
    const amt = getNormalizedBankTxAmount(t);
    if (amt <= 0) return false;
    const text = `${t.description || ''} ${t.counterparty_name || ''}`.toLowerCase();
    if (
      text.includes('lön') ||
      text.includes('lon ') ||
      text.includes('salary') ||
      text.includes('löneutbetalning') ||
      text.includes('csn') ||
      text.includes('försäkringskassan') ||
      text.includes('barnbidrag') ||
      text.includes('pension') ||
      text.includes('a-kassa') ||
      text.includes('a kassa') ||
      text.includes('akassa') ||
      text.includes('skatteverket') ||
      text.includes('återköp') ||
      text.includes('retur') ||
      text.includes('refund') ||
      text.includes('kreditering') ||
      text.includes('återbetalning')
    ) {
      return false;
    }
    return true;
  });

  const consumedInflowIds = new Set<string>();

  for (const outTx of outflows) {
    const outAmt = Math.abs(getNormalizedBankTxAmount(outTx));
    if (outAmt <= 0) continue;
    const outDate = outTx.booking_date || outTx.transaction_date || outTx.value_date || '';
    const outMs = Date.parse(`${outDate}T12:00:00`);

    let bestIn: BankTransactionItem | null = null;
    let bestScore = -1;

    for (const inTx of inflows) {
      if (consumedInflowIds.has(inTx.id)) continue;
      if (inTx.id === outTx.id) continue;

      const inAmt = Math.abs(getNormalizedBankTxAmount(inTx));
      if (Math.abs(inAmt - outAmt) > 0.01) continue;

      const inDate = inTx.booking_date || inTx.transaction_date || inTx.value_date || '';
      const inMs = Date.parse(`${inDate}T12:00:00`);
      const dayDiff =
        Number.isFinite(outMs) && Number.isFinite(inMs)
          ? Math.abs(outMs - inMs) / (1000 * 60 * 60 * 24)
          : outDate === inDate
          ? 0
          : 999;

      if (dayDiff > 3) continue;

      const diffAcc =
        Boolean(outTx.bank_account_id && inTx.bank_account_id) &&
        outTx.bank_account_id !== inTx.bank_account_id;
      const oneFlagged = internalIds.has(outTx.id) || internalIds.has(inTx.id);

      if (diffAcc || oneFlagged) {
        const score = (diffAcc ? 100 : 0) + (oneFlagged ? 50 : 0) - dayDiff * 10;
        if (score > bestScore) {
          bestScore = score;
          bestIn = inTx;
        }
      }
    }

    if (bestIn) {
      consumedInflowIds.add(bestIn.id);
      internalIds.add(outTx.id);
      internalIds.add(bestIn.id);
    }
  }

  return internalIds;
}
