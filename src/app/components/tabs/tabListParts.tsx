// Delade småbitar för listflikarna (Sparade, Paket): gruppering per dag, dagsrubrik med summa och ikonerna under köpets namn.
import React from 'react';
import { Heart, Package, Paperclip } from '@phosphor-icons/react';
import type { TransactionItem } from '../../../components/HomeTab';
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

/** Hjärta, paket och gem (kvitto) – visas bara när köpet har den markeringen. */
export const TxFlagIcons: React.FC<{ tx: TransactionItem; showReceipt: boolean }> = ({
  tx,
  showReceipt,
}) => (
  <>
    {tx.isHearted && <Heart size={11} weight="fill" className="text-negative-solid shrink-0" />}
    {tx.isWaitingForPackage && (
      <Package size={11} weight="fill" className="text-caution-solid shrink-0" />
    )}
    {showReceipt && tx.receiptUrl && (
      <Paperclip size={11} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
    )}
  </>
);
