// Delade småbitar för listflikarna (Kvitton, Paket): gruppering per dag och dagsrubrik med summa.
import React from 'react';
import type { TransactionItem } from '../../models';
import { formatSwedishDateHeading } from '../../../utils/swedishDate';

/** Gruppera köp per datum, nyaste dagen först. */
export function groupTransactionsByDate(list: TransactionItem[]): [string, TransactionItem[]][] {
  const map = new Map<string, TransactionItem[]>();
  for (const tx of list) {
    const key = tx.date || 'Okänt';
    const arr = map.get(key) || [];
    arr.push(tx);
    map.set(key, arr);
  }
  return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
}

/** Formatera ett belopp som "1 234 kr". */
export function formatKr(amount: number): string {
  return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
}

/** Rubrik för en dag: datum till vänster, dagens nettosumma till höger. */
export const DateGroupHeader: React.FC<{ dateKey: string; dayItems: TransactionItem[] }> = ({
  dateKey,
  dayItems,
}) => {
  const net = dayItems.reduce((acc, item) => {
    const amt = Number(item.amount) || 0;
    return item.type === 'income' ? acc + amt : acc - amt;
  }, 0);
  const netStr = formatKr(Math.abs(net));

  return (
    <div className="ui-date-header">
      <span className="ui-date-header-title">{formatSwedishDateHeading(dateKey)}</span>
      <span className={`ui-date-header-sum ${net > 0 ? 'text-positive' : ''}`}>
        {net > 0 ? `+${netStr}` : `−${netStr}`}
      </span>
    </div>
  );
};
