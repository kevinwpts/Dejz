import { BankAccount } from '../services/bankService';
import { TransactionItem } from '../components/HomeTab';
import { isLikelySwishTransactionText } from './bankHistoryAnalyzer';

/**
 * Extraherar kontonummer-varianter (inklusive med och utan clearingnummer), IBAN,
 * kontonamn och personnamn från användarens egna bankkonton och profil.
 */
function extractOwnAccountSignals(
  userAccounts: BankAccount[] = [],
  userEmail?: string | null,
  userName?: string | null
) {
  const accountDigitVariants = new Set<string>();
  const ibanVariants = new Set<string>();
  const accountNameTokens = new Set<string>();
  const personNameTokens = new Set<string>();

  const GENERIC_ACCOUNT_WORDS = new Set([
    'konto',
    'sek',
    'eur',
    'seb',
    'swedbank',
    'nordea',
    'handelsbanken',
    'bank',
    'ab',
  ]);

  for (const acc of userAccounts || []) {
    const bbanDigits = (acc.bban || '').replace(/\D+/g, '');
    if (bbanDigits.length >= 6) {
      accountDigitVariants.add(bbanDigits);
      // Svenska kontonummer har ofta 4 siffror clearingnummer + 7 siffror kontonummer (11 siffror totalt).
      // Banker skriver ofta ut enbart de sista 7 siffrorna utan clearingnummer i transaktionstexten!
      if (bbanDigits.length >= 10) {
        const withoutClearing = bbanDigits.slice(4);
        if (withoutClearing.length >= 6) {
          accountDigitVariants.add(withoutClearing);
        }
        const last7 = bbanDigits.slice(-7);
        if (last7.length === 7) {
          accountDigitVariants.add(last7);
        }
      }
    }

    const ibanClean = (acc.iban || '').replace(/\s+/g, '').toUpperCase();
    if (ibanClean.length >= 10) {
      ibanVariants.add(ibanClean);
      const ibanDigits = ibanClean.replace(/\D+/g, '');
      if (ibanDigits.length >= 7) {
        const last7 = ibanDigits.slice(-7);
        accountDigitVariants.add(last7);
      }
    }

    for (const rawLabel of [acc.custom_name, acc.product, acc.name]) {
      const cleaned = (rawLabel || '').trim();
      if (!cleaned || cleaned.length < 3) continue;
      const lower = cleaned.toLowerCase();
      if (GENERIC_ACCOUNT_WORDS.has(lower)) continue;
      if (!/^\d+$/.test(lower.replace(/[\s-]/g, ''))) {
        accountNameTokens.add(lower);
      }
    }
  }

  if (userName && userName.trim().length >= 3) {
    const fullLower = userName.trim().toLowerCase();
    personNameTokens.add(fullLower);
  }

  if (userEmail && userEmail.includes('@')) {
    const localPart = userEmail.split('@')[0].toLowerCase();
    const parts = localPart.split(/[._\-\d]+/).filter((p) => p.length >= 3);
    if (parts.length >= 2) {
      personNameTokens.add(parts.join(' '));
    }
    for (const p of parts) {
      if (p.length >= 4) {
        personNameTokens.add(p);
      }
    }
  }

  return {
    accountDigitVariants: Array.from(accountDigitVariants),
    ibanVariants: Array.from(ibanVariants),
    accountNameTokens: Array.from(accountNameTokens),
    personNameTokens: Array.from(personNameTokens),
  };
}

/**
 * Kontrollerar om en inkomsttransaktion är en bekräftad extern inkomst (lön, bidrag, pension, skatteåterbäring)
 * eller ett återköp/retur från en butik.
 */
function isConfirmedExternalIncomeOrRefund(combinedLower: string): boolean {
  return (
    combinedLower.includes('lön') ||
    combinedLower.includes('lon ') ||
    combinedLower.includes('salary') ||
    combinedLower.includes('löneutbetalning') ||
    combinedLower.includes('loneutbetalning') ||
    combinedLower.includes('csn') ||
    combinedLower.includes('studiestöd') ||
    combinedLower.includes('studiemedel') ||
    combinedLower.includes('försäkringskassan') ||
    combinedLower.includes('forsakringskassan') ||
    combinedLower.includes('barnbidrag') ||
    combinedLower.includes('pension') ||
    combinedLower.includes('a-kassa') ||
    combinedLower.includes('akassa') ||
    combinedLower.includes('alfakassan') ||
    combinedLower.includes('skatteverket') ||
    combinedLower.includes('skatteåterbäring') ||
    combinedLower.includes('utdelning') ||
    combinedLower.includes('återköp') ||
    combinedLower.includes('aterkop') ||
    combinedLower.includes('retur') ||
    combinedLower.includes('refund') ||
    combinedLower.includes('kreditering') ||
    combinedLower.includes('återbetalning') ||
    combinedLower.includes('aterbetalning')
  );
}

/**
 * Kontrollerar om en transaktion är en intern överföring mellan användarens egna bankkonton
 * (t.ex. överföring mellan lönekonto och sparkonto eller mellan två egna konton i bankappen).
 *
 * Kortköp, butiksköp, räkningar, autogiro, lön, bidrag och Swish till andra är ALDRIG interna överföringar.
 */
export function isInternalTransferTransaction(
  tx: Partial<TransactionItem> & { rawJson?: any },
  userAccounts: BankAccount[] = [],
  userEmail?: string | null,
  userName?: string | null
): boolean {
  if (!tx) return false;

  // Syntetiska lönedagsposter ("inc-...") är aldrig interna överföringar
  if (typeof tx.id === 'string' && tx.id.startsWith('inc-')) {
    return false;
  }

  const rawJson = tx.rawJson || {};
  if (rawJson?.isInternalTransfer === true || tx.reconciliationStatus === 'internal_transfer') {
    return true;
  }

  const remittanceText = Array.isArray(rawJson?.remittance_information)
    ? rawJson.remittance_information
        .map((r: any) => (typeof r === 'string' ? r : r?.unstructured || ''))
        .join(' ')
    : typeof rawJson?.remittance_information === 'string'
    ? rawJson.remittance_information
    : '';

  const combined = [
    tx.title || '',
    tx.rawDescription || '',
    tx.note || '',
    tx.counterpartyName || '',
    tx.category || '',
    remittanceText,
    rawJson?.additional_information || '',
    rawJson?.creditor?.name || '',
    rawJson?.debtor?.name || '',
  ]
    .join(' ')
    .toLowerCase()
    .trim();

  // 1. Definitivt INTE en intern överföring om det är kortköp, autogiro, bankgiro, plusgiro, Swish eller lön/bidrag:
  if (
    rawJson?.card_transaction ||
    combined.includes('kortköp') ||
    combined.includes('kortkop') ||
    combined.includes('autogiro') ||
    combined.includes('bankgiro') ||
    combined.includes('plusgiro') ||
    combined.includes('fakturabetalning') ||
    isLikelySwishTransactionText(tx.rawDescription || tx.title || '', rawJson) ||
    isLikelySwishTransactionText(tx.counterpartyName || '', rawJson) ||
    isConfirmedExternalIncomeOrRefund(combined)
  ) {
    return false;
  }

  // Om banken explicit flaggat transaktionskoden som Transfer / InternalTransfer:
  const btcDescEarly = String(rawJson?.bank_transaction_code?.description || '')
    .toLowerCase()
    .trim();
  if (
    btcDescEarly === 'transfer' ||
    btcDescEarly === 'internal transfer' ||
    btcDescEarly === 'internaltransfer' ||
    btcDescEarly === 'account transfer'
  ) {
    return true;
  }

  // 2. Tydliga svenska nyckelfraser för överföring mellan egna konton & sparkonton:
  if (
    combined.includes('överföring mellan egna') ||
    combined.includes('overforing mellan egna') ||
    combined.includes('överföring egna') ||
    combined.includes('overforing egna') ||
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
    combined.includes('enkla sparkontot') ||
    combined.includes('enkla vardagen') ||
    combined.includes('sparkonto') ||
    combined.includes('framtidskonto') ||
    combined.includes('placeringskonto') ||
    combined.includes('kapitalkonto') ||
    combined.includes('fasträntekonto') ||
    combined.includes('buffertkonto')
  ) {
    return true;
  }

  // 3. Om titel eller råbeskrivning i banken är "Överföring" / "Insättning" / "Överf..." (utan BG/PG/Autogiro/Swish):
  const titleLower = (tx.title || '').toLowerCase().trim();
  const rawDescLower = (tx.rawDescription || '').toLowerCase().trim();
  const noteLower = (tx.note || '').toLowerCase().trim();

  const STANDALONE_TRANSFER_LABELS = new Set([
    'överföring',
    'overforing',
    'överf',
    'overf',
    'egen överföring',
    'egen overforing',
    'intern överföring',
    'intern overforing',
    'kontoöverföring',
    'kontooverforing',
    'insättning',
    'insattning',
  ]);

  if (
    STANDALONE_TRANSFER_LABELS.has(titleLower) ||
    STANDALONE_TRANSFER_LABELS.has(rawDescLower) ||
    STANDALONE_TRANSFER_LABELS.has(noteLower) ||
    /^(överföring|overforing|överf\.?|overf\.?|insättning|insattning)\b/i.test(rawDescLower) ||
    /^(överföring|overforing|överf\.?|overf\.?|insättning|insattning)\b/i.test(titleLower)
  ) {
    return true;
  }

  // 4. Om råbeskrivningen eller motpartsnamnet enbart är ett svenskt bankkontonummer eller kontonummer + referens (t.ex. "5196 00 507 53" eller "56090198013 095739195424")
  const rawCleanedForAcctCheck = (tx.rawDescription || tx.counterpartyName || '')
    .replace(/^(från|fran|till|överföring|overforing|insättning|insattning)\s+/i, '')
    .trim();
  const onlyDigitsInRaw = rawCleanedForAcctCheck.replace(/\D+/g, '');
  if (
    rawCleanedForAcctCheck.length >= 7 &&
    /^[\d\s.,-]+$/.test(rawCleanedForAcctCheck) &&
    onlyDigitsInRaw.length >= 7 &&
    onlyDigitsInRaw.length <= 32
  ) {
    return true;
  }

  // 5. Matcha mot användarens egna bankkonton (kontonummer, IBAN, kontonamn och personnamn)
  const signals = extractOwnAccountSignals(userAccounts, userEmail, userName);

  const creditorIban = (rawJson?.creditor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const creditorBban = (rawJson?.creditor_account?.other?.identification || '').replace(/\D+/g, '');
  const debtorIban = (rawJson?.debtor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const debtorBban = (rawJson?.debtor_account?.other?.identification || '').replace(/\D+/g, '');
  const combinedDigits = combined.replace(/\D+/g, '');

  // Kontrollera om något av användarens egna kontonummer förekommer i transaktionstexten eller i creditor/debtor
  for (const acctDigits of signals.accountDigitVariants) {
    if (
      (combinedDigits.length >= 6 && combinedDigits.includes(acctDigits)) ||
      (creditorBban && (creditorBban.includes(acctDigits) || acctDigits.includes(creditorBban))) ||
      (debtorBban && (debtorBban.includes(acctDigits) || acctDigits.includes(debtorBban)))
    ) {
      return true;
    }
  }

  for (const ownIban of signals.ibanVariants) {
    if (
      (creditorIban && creditorIban === ownIban) ||
      (debtorIban && debtorIban === ownIban) ||
      combined.toUpperCase().replace(/\s+/g, '').includes(ownIban)
    ) {
      return true;
    }
  }

  // Kontrollera om transaktionstexten innehåller namnet på något av användarens egna konton
  for (const accName of signals.accountNameTokens) {
    if (accName.length >= 4 && combined.includes(accName)) {
      return true;
    }
  }

  // 6. Om banken flaggat transaktionskoden som "Transfer" eller "InternalTransfer":
  const btcDesc = (rawJson?.bank_transaction_code?.description || '').toLowerCase().trim();
  const isBtcTransfer = btcDesc === 'transfer' || btcDesc === 'internaltransfer';

  if (isBtcTransfer) {
    for (const pName of signals.personNameTokens) {
      if (pName.length >= 3 && combined.includes(pName)) {
        return true;
      }
    }
    if (titleLower === 'banktransaktion' || rawDescLower === 'banktransaktion') {
      return true;
    }
  }

  // 7. Om inkommande transaktion ("income") bara heter "Banktransaktion" / "Insättning" / "Överföring"
  // eller har användarens eget fullständiga namn som avsändare:
  if (tx.type === 'income') {
    if (
      titleLower === 'banktransaktion' ||
      titleLower === 'insättning' ||
      titleLower === 'överföring'
    ) {
      return true;
    }
    for (const pName of signals.personNameTokens) {
      if (pName.includes(' ') && combined.includes(pName)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Identifierar ALLA interna överföringar i en transaktionslista (både enskilda och parvisa).
 *
 * När en användare för över t.ex. 10 000 kr från Konto A till Konto B skapas två transaktioner:
 * - En utgift (-10 000 kr) på Konto A
 * - En inkomst (+10 000 kr) på Konto B
 *
 * Denna funktion fångar både transaktioner som matchar `isInternalTransferTransaction` OCH
 * parvisa motsatta transaktioner på samma belopp inom <= 3 dagar så att BÅDA benen döljs helt.
 */
export function findInternalTransferIds(
  transactions: TransactionItem[],
  userAccounts: BankAccount[] = [],
  userEmail?: string | null,
  userName?: string | null
): Set<string> {
  const internalIds = new Set<string>();
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return internalIds;
  }

  // Steg 1: Flagga alla transaktioner som individuellt identifieras som interna överföringar
  for (const tx of transactions) {
    if (!tx || !tx.id) continue;
    if (isInternalTransferTransaction(tx, userAccounts, userEmail, userName)) {
      internalIds.add(tx.id);
    }
  }

  // Steg 2: Parvis matchning av utflöde (-X kr) och inflöde (+X kr) på exakt samma belopp inom <= 3 dagar
  const candidates = transactions.filter((tx) => {
    if (!tx || !tx.id) return false;
    if (tx.id.startsWith('inc-')) return false;
    if (tx.isExcluded) return false;
    // Reserverade kortköp (PDNG/HOLD) som inte redan flaggats som överföring får aldrig parmatchas bort
    if (
      (tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD') &&
      !internalIds.has(tx.id)
    ) {
      return false;
    }

    const combined = `${tx.title || ''} ${tx.rawDescription || ''} ${tx.note || ''} ${tx.counterpartyName || ''} ${tx.category || ''}`.toLowerCase();
    // Swish till/från telefonnummer och bekräftad lön/bidrag/retur ska inte parmatchas som kontoöverföring
    if (
      tx.category === 'Swish' ||
      isLikelySwishTransactionText(tx.rawDescription || tx.title || '', tx.rawJson) ||
      isLikelySwishTransactionText(tx.counterpartyName || '', tx.rawJson)
    ) {
      return false;
    }
    if (tx.type === 'income' && isConfirmedExternalIncomeOrRefund(combined)) {
      return false;
    }
    return true;
  });

  const outflows = candidates.filter((t) => t.type !== 'income' && Number(t.amount) > 0);
  const inflows = candidates.filter((t) => t.type === 'income' && Number(t.amount) > 0);

  const consumedInflowIds = new Set<string>();

  for (const outTx of outflows) {
    const outAmt = Math.round(Math.abs(Number(outTx.amount) || 0));
    if (outAmt <= 0) continue;
    const outDateMs = Date.parse(`${outTx.date}T12:00:00`);

    let bestInflow: TransactionItem | null = null;
    let bestScore = -1;

    for (const inTx of inflows) {
      if (consumedInflowIds.has(inTx.id)) continue;
      if (inTx.id === outTx.id) continue;

      const inAmt = Math.round(Math.abs(Number(inTx.amount) || 0));
      if (inAmt !== outAmt) continue;

      const inDateMs = Date.parse(`${inTx.date}T12:00:00`);
      const dayDiff =
        Number.isFinite(outDateMs) && Number.isFinite(inDateMs)
          ? Math.abs(outDateMs - inDateMs) / (1000 * 60 * 60 * 24)
          : outTx.date === inTx.date
          ? 0
          : 999;

      if (dayDiff > 3) continue;

      const differentAccounts =
        Boolean(outTx.bankAccountName && inTx.bankAccountName) &&
        outTx.bankAccountName !== inTx.bankAccountName;

      const oneAlreadyFlagged =
        internalIds.has(outTx.id) || internalIds.has(inTx.id);

      // Pairwise matching without explicit transfer keywords requires either
      // two distinct bank accounts or that at least one leg was already flagged as a transfer.
      if (differentAccounts || oneAlreadyFlagged) {
        const score = (differentAccounts ? 100 : 0) + (oneAlreadyFlagged ? 50 : 0) - dayDiff * 10;
        if (score > bestScore) {
          bestScore = score;
          bestInflow = inTx;
        }
      }
    }

    if (bestInflow) {
      consumedInflowIds.add(bestInflow.id);
      internalIds.add(outTx.id);
      internalIds.add(bestInflow.id);
    }
  }

  return internalIds;
}
