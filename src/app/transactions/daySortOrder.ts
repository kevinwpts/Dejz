// Räknar ut ordningen inom varje dag (äldst först) med tid, synk-tid och bankens saldokedja.
import type { TransactionItem } from '../models';
import { getTransactionTime } from '../models';

/** Sätter sortOrder på varje transaktion (muterar listan per dag). */
export function assignIntradaySortOrder(dedupedBankTxs: TransactionItem[]): void {
  // Rekonstruera faktisk intradagsordning per dag (äldst = lägst sortOrder, nyast = högst sortOrder)
  // med hjälp av bankens saldokedja (balance_after_transaction), synkningstidpunkt (created_at) och entry_reference.
  const byDate = new Map<string, TransactionItem[]>();
  for (const tx of dedupedBankTxs) {
    const d = tx.date || '';
    const arr = byDate.get(d) || [];
    arr.push(tx);
    byDate.set(d, arr);
  }

  for (const [, dayItems] of byDate.entries()) {
    if (dayItems.length <= 1) {
      if (dayItems[0]) dayItems[0].sortOrder = 0;
      continue;
    }

    // Steg 1: Grundsortera från äldst till nyast via faktisk tid, synk-batch (10s fönster) och entry_reference
    dayItems.sort((a, b) => {
      const timeA = getTransactionTime(a);
      const timeB = getTransactionTime(b);
      if (timeA && timeB && timeA !== timeB) {
        return timeA.localeCompare(timeB);
      }
      if (a.createdAt && b.createdAt) {
        const msA = Date.parse(a.createdAt);
        const msB = Date.parse(b.createdAt);
        if (Number.isFinite(msA) && Number.isFinite(msB) && Math.abs(msA - msB) > 10_000) {
          return msA - msB;
        }
      }
      if (a.entryReference && b.entryReference && a.entryReference !== b.entryReference) {
        return a.entryReference.localeCompare(b.entryReference);
      }
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
        return a.createdAt.localeCompare(b.createdAt);
      }
      return 0;
    });

    // Steg 2: Om banken skickat balance_after_transaction på ett konto under dagen,
    // verifiera och förfina ordningen med den exakta saldokedjan (beforeBalance -> afterBalance).
    const byAcc = new Map<string, TransactionItem[]>();
    for (const tx of dayItems) {
      const accKey = tx.bankAccountId || tx.bankAccountName || '__default__';
      const list = byAcc.get(accKey) || [];
      list.push(tx);
      byAcc.set(accKey, list);
    }

    for (const [, accItems] of byAcc.entries()) {
      const withBal = accItems.filter((t) => {
        const bal = Number(t.rawJson?.balance_after_transaction?.amount);
        return Number.isFinite(bal);
      });
      if (withBal.length >= 2) {
        const meta = withBal.map((t) => {
          const after = Number(t.rawJson?.balance_after_transaction?.amount);
          const signed =
            typeof t.rawJson?.exactSignedSekAmount === 'number'
              ? t.rawJson.exactSignedSekAmount
              : t.type === 'income'
              ? Number(t.amount) || 0
              : -(Number(t.amount) || 0);
          return {
            tx: t,
            before: Math.round((after - signed) * 100),
            after: Math.round(after * 100),
          };
        });

        // Bygg riktad kedja där tx[i].after === tx[j].before
        const nextOf = new Map<string, string>();
        const prevOf = new Map<string, string>();
        for (let i = 0; i < meta.length; i++) {
          for (let j = 0; j < meta.length; j++) {
            if (i === j) continue;
            if (
              Math.abs(meta[i].after - meta[j].before) <= 5 &&
              !nextOf.has(meta[i].tx.id) &&
              !prevOf.has(meta[j].tx.id)
            ) {
              nextOf.set(meta[i].tx.id, meta[j].tx.id);
              prevOf.set(meta[j].tx.id, meta[i].tx.id);
              break;
            }
          }
        }

        if (nextOf.size > 0) {
          const byId = new Map(withBal.map((t) => [t.id, t]));
          const visited = new Set<string>();
          const orderedChain: TransactionItem[] = [];
          for (const item of withBal) {
            if (!prevOf.has(item.id) && !visited.has(item.id)) {
              let curr: string | undefined = item.id;
              while (curr && !visited.has(curr)) {
                visited.add(curr);
                const found = byId.get(curr);
                if (found) orderedChain.push(found);
                curr = nextOf.get(curr);
              }
            }
          }
          for (const item of withBal) {
            if (!visited.has(item.id)) {
              orderedChain.push(item);
            }
          }
          if (orderedChain.length === withBal.length) {
            let ptr = 0;
            for (let k = 0; k < dayItems.length; k++) {
              if (byId.has(dayItems[k].id)) {
                dayItems[k] = orderedChain[ptr++];
              }
            }
          }
        }
      }
    }

    dayItems.forEach((tx, idx) => {
      tx.sortOrder = idx;
    });
  }
}
