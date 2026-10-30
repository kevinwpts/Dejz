import { TransactionItem } from '../components/HomeTab';

const GENERIC_DEDUP_TITLES = new Set([
  '',
  'banktransaktion',
  'kortköp',
  'kortkop',
  'betalning',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'bg',
  'pg',
  'insättning',
  'insattning',
  'utbetalning',
  'inbetalning',
  'utgift',
  'inkomst',
  'köp',
  'kop',
  'reserverat',
  'reservation',
  'överföring',
  'overforing',
  'okänd',
  'okand',
  'övrigt',
  'ovrigt',
]);

export function isGenericDedupTitle(normTitle: string | null | undefined): boolean {
  const t = (normTitle || '').toLowerCase().trim();
  return !t || GENERIC_DEDUP_TITLES.has(t);
}

export function normalizeMerchantForDedup(rawName: unknown): string {
  if (typeof rawName !== 'string') return '';
  const str = rawName.toLowerCase();

  // Om titeln explicit är Swish med ett giltigt svenskt mobilnummer (070, 072, 073, 076, 079) eller 123-nummer
  if (str.includes('swish')) {
    const phoneMatch = str.replace(/[\s()-]/g, '').match(/(467[02369]\d{7}|07[02369]\d{7}|123\d{7})/);
    if (phoneMatch) {
      let digits = phoneMatch[1];
      if (digits.startsWith('467')) {
        digits = '07' + digits.slice(3);
      }
      return `swish ${digits}`;
    }
  }

  return str
    .replace(/\b(ab|aktiebolag|sverige|sweden|se|inc|ltd|gmbh|as|oy|aps)\b/gi, ' ')
    .replace(/\b(kortköp|kortkop|betalning|köp|kop|autogiro|bg|pg|bankgiro|plusgiro)\b/gi, ' ')
    .replace(/[0-9*#/_.,:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTxBalance(tx: TransactionItem): number | null {
  const b = tx.rawJson?.balance_after_transaction?.amount;
  if (b !== undefined && b !== null && String(b).trim() !== '') {
    const n = Number(String(b).replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function getDaysDiff(d1Str: string, d2Str: string): number {
  if (!d1Str || !d2Str) return 999;
  const d1 = new Date(d1Str).getTime();
  const d2 = new Date(d2Str).getTime();
  if (isNaN(d1) || isNaN(d2)) return 999;
  return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
}

/**
 * Smart och robust avduplicering av transaktioner.
 * 
 * Regler:
 * 1. Äkta upprepade transaktioner (t.ex. användaren swishar samma belopp flera gånger samma dag)
 *    bevaras ALLTID tack vare att bankens saldo efter varje transaktion (balance_after_transaction)
 *    skiljer sig åt mellan varje köp.
 * 2. Identiska dubblettrader från återkommande bank- eller kontosynkningar (som har samma saldo,
 *    samma bank-ID eller samma fysiska ledger-post) slås ihop.
 * 3. Preliminära reservationer (PDNG/HOLD) som blivit slutgiltigt bokförda (BOOK) slås ihop
 *    så att inte både reservationen och den bokförda posten visas — även om den ena posten
 *    fått ett generiskt namn som "Banktransaktion" av banken.
 * 4. Manuellt inlagda köp i appen slås ihop med motsvarande banktransaktion när banken synkas.
 */
export function deduplicateTransactions(items: TransactionItem[]): TransactionItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  const result: TransactionItem[] = [];
  const seenIds = new Set<string>();

  for (const item of items) {
    if (!item || !item.id) continue;
    if (seenIds.has(item.id)) continue;

    const itemAmt = Math.round(Number(item.amount) || 0);
    const itemType = item.type || 'expense';
    const itemDate = item.date || '';
    const itemTitleNorm = normalizeMerchantForDedup(item.title);
    const itemBal = extractTxBalance(item);
    const isItemBank = item.id.startsWith('bank-');

    // Sök efter en befintlig post i resultatet som representerar SAMMA fysiska köp
    const dupIndex = result.findIndex((existing) => {
      if (item.id === existing.id) return true;

      const existAmt = Math.round(Number(existing.amount) || 0);
      const existType = existing.type || 'expense';
      const existDate = existing.date || '';
      const existTitleNorm = normalizeMerchantForDedup(existing.title);
      const existBal = extractTxBalance(existing);
      const isExistBank = existing.id.startsWith('bank-');

      // 1. Belopp och typ (utgift/inkomst) måste stämma överens
      if (itemAmt !== existAmt || itemType !== existType) return false;

      // 2. Om BÅDA transaktionerna kommer från banken:
      if (isItemBank && isExistBank) {
        const isItemPending = item.bookingStatus === 'PDNG' || item.bookingStatus === 'HOLD';
        const isExistPending = existing.bookingStatus === 'PDNG' || existing.bookingStatus === 'HOLD';

        // A. Om de delar exakt samma transactionId eller entryReference (och samma bokningsstatus)
        if (
          isItemPending === isExistPending &&
          ((item.transactionId && existing.transactionId && item.transactionId === existing.transactionId) ||
            (item.entryReference && existing.entryReference && item.entryReference === existing.entryReference))
        ) {
          return true;
        }

        // B. Aktiva reservationer (PDNG/HOLD) får ALDRIG slås ihop heuristiskt med bokförda (BOOK)
        // transaktioner baserat på bara belopp/butiksnamn, eftersom användaren annars tappar
        // synliga reservationer från banken. Endast om de delar exakt samma icke-volatila referens slås de ihop.
        if (isItemPending !== isExistPending) {
          if (
            (item.transactionId && existing.transactionId && item.transactionId === existing.transactionId) ||
            (item.entryReference && existing.entryReference && item.entryReference === existing.entryReference)
          ) {
            return true;
          }
          return false;
        }

        // C. Om båda har bankens slutgiltiga saldo efter transaktionen (och samma bokningsstatus):
        if (itemBal !== null && existBal !== null) {
          if (Math.abs(itemBal - existBal) > 0.005) {
            // Olika saldo -> detta är två separata verkliga transaktioner!
            return false;
          }
          // Samma saldo efter transaktionen på samma datum -> 100% samma transaktion som synkats dubbelt
          if (itemDate === existDate) {
            return true;
          }
        }

        return false;
      }

      // 3. Om EN transaktion är manuell/lokal och EN kommer från banken:
      // (Användaren har registrerat ett köp i appen, och banken har nu synkat in samma köp)
      const daysDiff = getDaysDiff(itemDate, existDate);
      if (daysDiff <= 4.5) {
        const itemIsGeneric = isGenericDedupTitle(itemTitleNorm) || isGenericDedupTitle(item.title);
        const existIsGeneric = isGenericDedupTitle(existTitleNorm) || isGenericDedupTitle(existing.title);
        if ((itemIsGeneric || existIsGeneric) && daysDiff <= 2) {
          return true;
        }
        if (itemTitleNorm && existTitleNorm) {
          if (itemTitleNorm === existTitleNorm || itemTitleNorm.includes(existTitleNorm) || existTitleNorm.includes(itemTitleNorm)) {
            return true;
          }
          const tokens1 = itemTitleNorm.split(' ').filter((t) => t.length >= 2);
          const tokens2 = existTitleNorm.split(' ').filter((t) => t.length >= 2);
          const hasCommonToken = tokens1.some(
            (t1) => t1.length >= 3 && tokens2.some((t2) => t2.length >= 3 && (t1 === t2 || t1.includes(t2) || t2.includes(t1)))
          );
          if (hasCommonToken) {
            return true;
          }
        } else if (itemDate === existDate) {
          return true;
        }
      }

      return false;
    });

    if (dupIndex >= 0) {
      // Dubblett / reservationspar hittat!
      const existing = result[dupIndex];

      // Föredra slutgiltigt bokförd post, bankpost eller post med mer komplett metadata
      const isItemBooked = item.bookingStatus === 'BOOK' || (!item.bookingStatus && isItemBank);
      const isExistBooked = existing.bookingStatus === 'BOOK' || (!existing.bookingStatus && existing.id.startsWith('bank-'));

      const itemHasRealTitle = !isGenericDedupTitle(itemTitleNorm) && !isGenericDedupTitle(item.title);
      const existHasRealTitle = !isGenericDedupTitle(normalizeMerchantForDedup(existing.title)) && !isGenericDedupTitle(existing.title);

      const bestTitle = itemHasRealTitle
        ? item.title
        : existHasRealTitle
        ? existing.title
        : item.title || existing.title;
      const bestCategory =
        itemHasRealTitle && item.category && item.category !== 'Övrigt'
          ? item.category
          : existHasRealTitle && existing.category && existing.category !== 'Övrigt'
          ? existing.category
          : item.category !== 'Övrigt'
          ? item.category
          : existing.category || item.category;
      const bestLogo =
        (itemHasRealTitle ? item.logo : undefined) ||
        (existHasRealTitle ? existing.logo : undefined) ||
        item.logo ||
        existing.logo;

      const preferCurrent =
        (isItemBooked && !isExistBooked) ||
        (!existing.id.startsWith('bank-') && isItemBank) ||
        (!existing.rawJson && Boolean(item.rawJson)) ||
        (!existHasRealTitle && itemHasRealTitle);

      if (preferCurrent) {
        seenIds.delete(existing.id);
        seenIds.add(item.id);
        result[dupIndex] = {
          ...item,
          title: bestTitle,
          category: bestCategory,
          logo: bestLogo,
          time: item.time || existing.time,
          note: item.note || existing.note,
          rawDescription:
            (!isGenericDedupTitle(item.rawDescription) ? item.rawDescription : existing.rawDescription) ||
            item.rawDescription ||
            existing.rawDescription,
          counterpartyName: item.counterpartyName || existing.counterpartyName,
          isHearted: item.isHearted ?? existing.isHearted,
          isWaitingForPackage: item.isWaitingForPackage ?? existing.isWaitingForPackage,
          paymentMethod: item.paymentMethod || existing.paymentMethod,
          receiptUrl: item.receiptUrl || existing.receiptUrl,
          receiptName: item.receiptName || existing.receiptName,
          // Behåll det tidigaste köpdatumet/tiden om den befintliga posten hade preliminärt datum
          date: (existing.bookingStatus === 'PDNG' || existing.bookingStatus === 'HOLD') && existing.date && existing.date <= item.date
            ? existing.date
            : item.date,
        };
      } else {
        result[dupIndex] = {
          ...existing,
          title: bestTitle,
          category: bestCategory,
          logo: bestLogo,
          rawDescription:
            (!isGenericDedupTitle(existing.rawDescription) ? existing.rawDescription : item.rawDescription) ||
            existing.rawDescription ||
            item.rawDescription,
          counterpartyName: existing.counterpartyName || item.counterpartyName,
          isHearted: existing.isHearted ?? item.isHearted,
          isWaitingForPackage: existing.isWaitingForPackage ?? item.isWaitingForPackage,
          paymentMethod: existing.paymentMethod || item.paymentMethod,
          receiptUrl: existing.receiptUrl || item.receiptUrl,
          receiptName: existing.receiptName || item.receiptName,
        };
      }
      continue;
    }

    seenIds.add(item.id);
    result.push(item);
  }

  return result;
}
