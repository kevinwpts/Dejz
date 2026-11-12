// Tar bort dubbletter av samma bankköp som kommit in vid flera synkningar.
import type { BankTransactionItem } from './types';

export function deduplicateBankSyncRows(rows: BankTransactionItem[]): BankTransactionItem[] {
  if (!Array.isArray(rows) || rows.length <= 1) return rows || [];

  const chosenByCompositeKey = new Map<string, BankTransactionItem>();
  const batchOccurrenceCounts = new Map<string, number>();

  // Sortera med äldsta skapandedatum först så att stabil ordning bevaras
  const sorted = [...rows].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (tA !== tB) return tA - tB;
    return (a.id || '').localeCompare(b.id || '');
  });

  // Identifiera synkbatcher (inom 30 sekunder från varandra)
  const rowBatchMap = new Map<string, number>();
  let currentBatchId = 0;
  let lastCreatedMs = -Infinity;

  for (const r of sorted) {
    const createdMs = r.created_at ? new Date(r.created_at).getTime() : 0;
    if (Math.abs(createdMs - lastCreatedMs) > 30_000) {
      currentBatchId += 1;
    }
    lastCreatedMs = createdMs;
    rowBatchMap.set(r.id, currentBatchId);
  }

  for (const r of sorted) {
    const rawBal = r.raw_json?.balance_after_transaction?.amount;
    const parsedBal =
      rawBal !== undefined && rawBal !== null && String(rawBal).trim() !== ''
        ? Number(String(rawBal).replace(/\s/g, '').replace(',', '.'))
        : NaN;
    const hasBalance = Number.isFinite(parsedBal);
    const balanceAfterStr = hasBalance ? parsedBal.toFixed(2) : '';

    // Normalisera beskrivning och telefonnummer (endast giltiga 070/072/073/076/079 eller 123-nummer när swish nämns)
    const descRaw = (r.description || '').trim().toLowerCase();
    const phoneMatch = descRaw.includes('swish')
      ? descRaw.replace(/[\s()-]/g, '').match(/(467[02369]\d{7}|07[02369]\d{7}|123\d{7})/)
      : null;
    const normDesc = phoneMatch
      ? (phoneMatch[1].startsWith('467') ? '07' + phoneMatch[1].slice(3) : phoneMatch[1])
      : descRaw.replace(/\s+/g, ' ');

    const dateAnchor =
      r.booking_date ||
      r.value_date ||
      r.transaction_date ||
      (r.created_at ? r.created_at.slice(0, 10) : '');
    const valAnchor = r.value_date || '';
    const numAmt = Number(r.amount || 0).toFixed(2);
    const curr = (r.currency || 'SEK').toUpperCase();

    let compKey: string;
    if (hasBalance) {
      // När saldot efter transaktionen finns (som hos SEB) är kombinationen av
      // bokföringsstatus, datum, belopp, valuta, beskrivning och saldo unikt per fysiskt köp.
      compKey = `${r.bank_account_id || ''}|${r.booking_status || 'BOOK'}|${dateAnchor}|${valAnchor}|${numAmt}|${curr}|${normDesc}|${balanceAfterStr}`;
    } else {
      // Om saldot saknas (t.ex. för reserverade belopp PDNG/HOLD), inkludera konto-ID och batch-scoped förekomstnummer
      const baseKey = `${r.bank_account_id || ''}|${r.booking_status || 'BOOK'}|${dateAnchor}|${valAnchor}|${numAmt}|${curr}|${normDesc}`;
      const batchId = rowBatchMap.get(r.id) || 0;
      const batchKey = `${batchId}::${baseKey}`;
      const occurrence = (batchOccurrenceCounts.get(batchKey) || 0) + 1;
      batchOccurrenceCounts.set(batchKey, occurrence);
      compKey = `${baseKey}#${occurrence}`;
    }

    const existing = chosenByCompositeKey.get(compKey);
    if (!existing) {
      chosenByCompositeKey.set(compKey, r);
    } else {
      // Föredra transaktion som har en användardecision/reconciliation
      const existingHasDecision =
        existing.reconciliation_status && existing.reconciliation_status !== 'unprocessed';
      const currentHasDecision =
        r.reconciliation_status && r.reconciliation_status !== 'unprocessed';
      if (!existingHasDecision && currentHasDecision) {
        chosenByCompositeKey.set(compKey, r);
      }
    }
  }

  return Array.from(chosenByCompositeKey.values());
}
