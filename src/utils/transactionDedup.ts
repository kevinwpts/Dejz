import { TransactionItem } from '../components/HomeTab';

export function normalizeMerchantForDedup(rawName: unknown): string {
  if (typeof rawName !== 'string') return '';
  return rawName
    .toLowerCase()
    .replace(/\b(ab|aktiebolag|sverige|sweden|se|inc|ltd|gmbh|as|oy|aps)\b/gi, ' ')
    .replace(/\b(kortköp|kortkop|betalning|köp|kop|autogiro|bg|pg|bankgiro|plusgiro)\b/gi, ' ')
    .replace(/[0-9*#/_.,:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strikt avduplicering av transaktioner.
 * Förhindrar dubbletter och trippletter orsakade av:
 * - Dubbla bankkonton som synkar samma köp
 * - Bokföringsfördröjning där både reservation (PDNG) och bokförd (BOOK) post finns
 * - Både manuell/DB-transaktion och Enable Banking-transaktion
 * - Återupprepad banksynk eller localStorage-cache
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

    const dupIndex = result.findIndex((existing) => {
      const existAmt = Math.round(Number(existing.amount) || 0);
      const existType = existing.type || 'expense';
      if (itemAmt !== existAmt || itemType !== existType) return false;

      const bothAreBankTxs = item.id.startsWith('bank-') && existing.id.startsWith('bank-');

      // REGEL 1: Inkomster från banken (Swish, insättningar, småinkomster)
      // Banken tilldelar varje inbetalning ett eget unikt transaktions-ID. Två bankinbetalningar med olika ID
      // är två separata inkomster (t.ex. flera personer som swishar samma belopp). De ska ALDRIG slås ihop!
      if (bothAreBankTxs && itemType === 'income') {
        return false;
      }

      // REGEL 2: Swish-transaktioner
      // Om två Swish-poster har olika bank-ID eller olika klockslag/avsändare, är de separata transaktioner.
      const isItemSwish = item.category === 'Swish' || itemTitleNorm.includes('swish');
      const isExistSwish =
        existing.category === 'Swish' ||
        normalizeMerchantForDedup(existing.title).includes('swish');
      if (isItemSwish || isExistSwish) {
        if (bothAreBankTxs) return false;
      }

      // REGEL 3: För bankutgifter med olika bank-ID:
      // Avduplicera endast om klockslagen är identiska eller saknas och butiken är densamma (för att fånga speglade kortkonton).
      // Om klockslagen skiljer sig åt (t.ex. två köp på Espresso House kl 08:15 och 14:30) är det två faktiska köp!
      if (bothAreBankTxs) {
        const itemTime = item.time?.trim();
        const existTime = existing.time?.trim();
        if (itemTime && existTime && itemTime !== existTime) {
          return false;
        }
      }

      // 1. Datumkontroll: Samma datum eller inom 2.5 dagar (för att fånga helg/bokföringsfördröjning mellan manuell och bankpost)
      const existDate = existing.date || '';
      let dateMatch = itemDate === existDate;
      if (!dateMatch && itemDate && existDate) {
        const d1 = new Date(itemDate).getTime();
        const d2 = new Date(existDate).getTime();
        if (!isNaN(d1) && !isNaN(d2)) {
          const daysDiff = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
          dateMatch = daysDiff <= 2.5;
        }
      }
      if (!dateMatch) return false;

      // 2. Butiks-/Mottagarmatchning
      const existTitleNorm = normalizeMerchantForDedup(existing.title);
      if (itemTitleNorm && existTitleNorm) {
        if (itemTitleNorm === existTitleNorm) return true;
        if (itemTitleNorm.includes(existTitleNorm) || existTitleNorm.includes(itemTitleNorm)) {
          return true;
        }

        // Första signifikanta ordet (t.ex. "ica", "coop", "sl", "spotify", "elgiganten")
        const tokens1 = itemTitleNorm.split(' ').filter((t) => t.length >= 2);
        const tokens2 = existTitleNorm.split(' ').filter((t) => t.length >= 2);
        if (
          tokens1.length > 0 &&
          tokens2.length > 0 &&
          tokens1[0] === tokens2[0] &&
          tokens1[0].length >= 3
        ) {
          return true;
        }
      }

      // 3. Om båda har samma kategori, exakt samma datum och belopp, och generiska titlar
      if (
        itemDate === existDate &&
        item.category &&
        existing.category &&
        item.category.toLowerCase().trim() === existing.category.toLowerCase().trim()
      ) {
        const isGeneric1 =
          !itemTitleNorm ||
          /^(kortköp|kortkop|banktransaktion|utgift|inkomst|överföring|overforing)$/i.test(
            itemTitleNorm
          );
        const isGeneric2 =
          !existTitleNorm ||
          /^(kortköp|kortkop|banktransaktion|utgift|inkomst|överföring|overforing)$/i.test(
            existTitleNorm
          );
        if (isGeneric1 || isGeneric2) return true;
      }

      return false;
    });

    if (dupIndex >= 0) {
      // Dubblett hittad! Föredra bankverifierad post eller post med logga/tid
      const existing = result[dupIndex];
      const preferCurrent =
        (!existing.id.startsWith('bank-') && item.id.startsWith('bank-')) ||
        (!existing.logo && Boolean(item.logo)) ||
        (!existing.time && Boolean(item.time));

      if (preferCurrent) {
        seenIds.delete(existing.id);
        seenIds.add(item.id);
        result[dupIndex] = {
          ...item,
          time: item.time || existing.time,
          logo: item.logo || existing.logo,
          note: item.note || existing.note,
        };
      }
      continue;
    }

    seenIds.add(item.id);
    result.push(item);
  }

  return result;
}
