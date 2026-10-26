import { TransactionItem } from '../components/HomeTab';

export function normalizeMerchantForDedup(rawName: unknown): string {
  if (typeof rawName !== 'string') return '';
  const str = rawName.toLowerCase();

  // Om titeln innehåller ett telefonnummer (t.ex. 46722162125, 0722162125, 072-216 21 25, 1234567890)
  const phoneMatch = str.replace(/[\s()-]/g, '').match(/(467\d{8}|07\d{8}|123\d{7})/);
  if (phoneMatch) {
    let digits = phoneMatch[1];
    if (digits.startsWith('467')) {
      digits = '07' + digits.slice(3);
    }
    return `swish ${digits}`;
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
 *    så att inte både reservationen och den bokförda posten visas.
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
        // A. Om båda har bankens saldo efter transaktionen:
        if (itemBal !== null && existBal !== null) {
          if (Math.abs(itemBal - existBal) > 0.005) {
            // Olika saldo -> detta är två separata verkliga transaktioner!
            // (T.ex. tre Swish samma dag – saldot ändras efter varje transaktion)
            return false;
          }
          // Exakt samma saldo efter transaktionen -> detta är 100% samma transaktion som synkats två gånger!
          return true;
        }

        // B. Om de delar samma transactionId eller entryReference
        if (
          (item.transactionId && existing.transactionId && item.transactionId === existing.transactionId) ||
          (item.entryReference && existing.entryReference && item.entryReference === existing.entryReference)
        ) {
          return true;
        }

        // C. Om en är preliminär reservation (PDNG/HOLD) och en är slutgiltigt bokförd (BOOK)
        const isItemPending = item.bookingStatus === 'PDNG' || item.bookingStatus === 'HOLD';
        const isExistPending = existing.bookingStatus === 'PDNG' || existing.bookingStatus === 'HOLD';
        if (isItemPending !== isExistPending) {
          const diff = getDaysDiff(itemDate, existDate);
          if (diff <= 4) {
            const tokens1 = (itemTitleNorm || '').split(' ').filter((t) => t.length >= 2);
            const tokens2 = (existTitleNorm || '').split(' ').filter((t) => t.length >= 2);
            const hasCommonToken = tokens1.some(
              (t1) => t1.length >= 3 && tokens2.some((t2) => t2.length >= 3 && (t1 === t2 || t1.includes(t2) || t2.includes(t1)))
            );
            const titlesMatch =
              itemTitleNorm === existTitleNorm ||
              (itemTitleNorm && existTitleNorm && (itemTitleNorm.includes(existTitleNorm) || existTitleNorm.includes(itemTitleNorm))) ||
              hasCommonToken ||
              !itemTitleNorm ||
              !existTitleNorm;
            if (titlesMatch) return true;
          }
        }

        // D. Om båda saknar särskiljande saldo:
        // För Swish ska vi INTE slå ihop dem automatiskt om saldot saknas, för att inte riskera att radera en legitim betalning
        if (item.category?.toLowerCase() === 'swish' || existing.category?.toLowerCase() === 'swish') {
          return false;
        }

        // För vanliga kortköp/räkningar: om datum och butiksnamn är identiska
        if (itemDate === existDate && itemTitleNorm && itemTitleNorm === existTitleNorm) {
          return true;
        }

        return false;
      }

      // 3. Om EN transaktion är manuell/lokal och EN kommer från banken:
      // (Användaren har registrerat ett köp i appen, och banken har nu synkat in samma köp)
      const daysDiff = getDaysDiff(itemDate, existDate);
      if (daysDiff <= 3.5) {
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

      const preferCurrent =
        (isItemBooked && !isExistBooked) ||
        (!existing.id.startsWith('bank-') && isItemBank) ||
        (!existing.rawJson && Boolean(item.rawJson)) ||
        (!existing.logo && Boolean(item.logo));

      if (preferCurrent) {
        seenIds.delete(existing.id);
        seenIds.add(item.id);
        result[dupIndex] = {
          ...item,
          time: item.time || existing.time,
          logo: item.logo || existing.logo,
          note: item.note || existing.note,
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
