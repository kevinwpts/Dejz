// Rena hjälpfunktioner för transaktionslistan: filtrering, sökning, gruppering per dag och etiketter (ingen React).
import type { AccountItem, FixedExpenseItem, IncomeItem, TransactionItem } from '../../app/models';
import { compareTransactionsChronologically, doesTransactionMatchAccount } from '../../app/models';
import { formatSwedishDateHeading, getItemReceipts } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring';
import { isDateInPeriod, PeriodInfo } from '../../utils/periodEngine';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
} from '../../utils/appCache';

export type TxTypeTab = 'all' | 'expense' | 'income';
export type DateRangeFilter = 'all' | 'period' | 'last30' | 'thisMonth';
export type SpecialAttributeFilter = 'saved' | 'packages' | 'receipts' | 'recurring' | 'large';

export interface CategoryOption {
  name: string;
  count: number;
}

export interface TransactionDateGroup {
  dateKey: string;
  label: string;
  net: number;
  items: TransactionItem[];
}

/** Allt som styr vilka transaktioner som syns i listan. */
export interface TransactionFilterCriteria {
  typeTab: TxTypeTab;
  activeAccount: AccountItem | null;
  dateRange: DateRangeFilter;
  period?: PeriodInfo;
  thirtyDaysAgoStr: string;
  thisMonthPrefix: string;
  selectedCategories: string[];
  selectedAttributes: SpecialAttributeFilter[];
  selectedPaymentMethod: string | null;
  searchQuery: string;
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
}

export const TYPE_TABS: { id: TxTypeTab; label: string }[] = [
  { id: 'all', label: 'Alla' },
  { id: 'expense', label: 'Utgifter' },
  { id: 'income', label: 'Inkomster' },
];

export const formatKr = (amount: number) => {
  return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
};

export function inferPaymentMethodForTx(tx: TransactionItem): string {
  if (tx.paymentMethod) return tx.paymentMethod;
  const combined = `${tx.title || ''} ${tx.category || ''} ${tx.rawDescription || ''}`.toLowerCase();
  if (combined.includes('swish')) return 'Swish';
  if (combined.includes('autogiro')) return 'Autogiro';
  if (combined.includes('klarna')) return 'Klarna';
  if (combined.includes('faktura') || combined.includes('e-faktura')) return 'Faktura';
  if (tx.type === 'income') return 'Överföring';
  return 'Kort';
}

/** Datum (ÅÅÅÅ-MM-DD) 30 dagar före `todayStr`. */
export function getThirtyDaysAgoStr(todayStr: string): string {
  const parts = todayStr.split('-');
  const d = new Date(
    Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10) - 30,
      12,
      0,
      0
    )
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Kategorier med antal transaktioner (sparade kategorier kommer med även om de saknar köp). */
export function buildCategoryOptions(sortedTransactions: TransactionItem[]): CategoryOption[] {
  const counts = new Map<string, number>();
  for (const tx of sortedTransactions) {
    const cat = tx.category || 'Övrigt';
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const storedExp = getStoredExpenseCategories()
    .map((c: string | { name?: string }) => (typeof c === 'string' ? c : c?.name))
    .filter(Boolean);
  const storedInc = getStoredIncomeCategories()
    .map((c: string | { name?: string }) => (typeof c === 'string' ? c : c?.name))
    .filter(Boolean);
  const allNames = Array.from(
    new Set([...Array.from(counts.keys()), ...storedExp, ...storedInc])
  );
  return allNames
    .map((name) => ({
      name: String(name),
      count: counts.get(String(name)) || 0,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'sv');
    });
}

export function buildPaymentMethodOptions(sortedTransactions: TransactionItem[]): string[] {
  const storedNames = getStoredPaymentMethods()
    .map((p: string | { name?: string }) => (typeof p === 'string' ? p : p?.name))
    .filter((n): n is string => Boolean(n && typeof n === 'string'));
  const counts = new Map<string, number>();
  for (const tx of sortedTransactions) {
    const pm = inferPaymentMethodForTx(tx);
    counts.set(pm, (counts.get(pm) || 0) + 1);
  }
  const all = Array.from(new Set([...storedNames, ...Array.from(counts.keys())]));
  return all.filter((m) => (counts.get(m) || 0) > 0 || storedNames.includes(m));
}

/** Sök- och kombinerad filtrering för en transaktion. */
export function matchesTransactionFilters(
  tx: TransactionItem,
  c: TransactionFilterCriteria
): boolean {
  // 1. Typ (Alla / Utgifter / Inkomster)
  if (c.typeTab === 'expense' && tx.type === 'income') return false;
  if (c.typeTab === 'income' && tx.type !== 'income') return false;

  // 2. Konto
  if (c.activeAccount && !doesTransactionMatchAccount(tx, c.activeAccount)) {
    return false;
  }

  // 3. Tidsperiod
  if (c.dateRange === 'period' && c.period && !isDateInPeriod(tx.date, c.period)) {
    return false;
  }
  if (c.dateRange === 'last30' && (tx.date || '') < c.thirtyDaysAgoStr) {
    return false;
  }
  if (c.dateRange === 'thisMonth' && !(tx.date || '').startsWith(c.thisMonthPrefix)) {
    return false;
  }

  // 4. Kategorier
  if (
    c.selectedCategories.length > 0 &&
    !c.selectedCategories.includes(tx.category || 'Övrigt')
  ) {
    return false;
  }

  // 5. Egenskaper & markeringar
  if (c.selectedAttributes.includes('saved') && !tx.isHearted) return false;
  if (c.selectedAttributes.includes('packages') && !tx.isWaitingForPackage) return false;
  if (c.selectedAttributes.includes('receipts') && getItemReceipts(tx).length === 0) return false;
  if (c.selectedAttributes.includes('large') && Number(tx.amount) < 500) return false;
  if (c.selectedAttributes.includes('recurring')) {
    const rec = checkIsRecurringTransaction(tx, c.fixedExpenses, c.incomes);
    if (!rec.isRecurring) return false;
  }

  // 6. Betalsätt
  if (c.selectedPaymentMethod) {
    const pm = inferPaymentMethodForTx(tx);
    if (pm.toLowerCase() !== c.selectedPaymentMethod.toLowerCase()) return false;
  }

  // 7. Fritextsökning (inklusive belopp)
  if (!c.searchQuery.trim()) return true;
  const q = c.searchQuery.toLowerCase().trim();
  const qDigits = q.replace(/\s+/g, '');
  const amtStr = String(Math.round(Number(tx.amount) || 0));
  const formattedAmt = new Intl.NumberFormat('sv-SE')
    .format(Math.round(Number(tx.amount) || 0))
    .toLowerCase();
  const titleMatch = (tx.title || '').toLowerCase().includes(q);
  const catMatch = (tx.category || '').toLowerCase().includes(q);
  const noteMatch = (tx.note || '').toLowerCase().includes(q);
  const amountMatch =
    (qDigits.length > 0 && amtStr.includes(qDigits)) || formattedAmt.includes(q);
  return titleMatch || catMatch || noteMatch || amountMatch;
}

/** Netto (inkomster plus, utgifter minus) för en lista transaktioner. */
export function sumNet(txs: TransactionItem[]): number {
  return txs.reduce((sum, tx) => {
    const amt = Number(tx.amount) || 0;
    return tx.type === 'income' ? sum + amt : sum - amt;
  }, 0);
}

/** Gruppera strikt per datum så varje dag enbart visar dagens händelser (nyast först). */
export function groupTransactionsByDate(filtered: TransactionItem[]): TransactionDateGroup[] {
  const map = new Map<string, TransactionItem[]>();
  for (const tx of filtered) {
    const key = tx.date || 'Okänt';
    const arr = map.get(key) || [];
    arr.push(tx);
    map.set(key, arr);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => {
      items.sort(compareTransactionsChronologically);
      return {
        dateKey,
        label: formatSwedishDateHeading(dateKey),
        net: sumNet(items),
        items,
      };
    });
}

/** Sista fyra siffrorna i kontonumret, eller tom sträng. */
export function getAccountLast4(acc: AccountItem): string {
  const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
  return cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';
}

/** Kontonamn, med sista siffrorna om flera konton heter likadant. */
export function formatAccountShortLabel(acc: AccountItem, accounts: AccountItem[]): string {
  const hasDuplicateName =
    accounts.filter(
      (other) => other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
    ).length > 1;
  const last4 = getAccountLast4(acc);
  if (hasDuplicateName && last4) {
    return `${acc.name} (${last4})`;
  }
  return acc.name;
}

export function getDateRangeChipLabel(dateRange: DateRangeFilter): string {
  return dateRange === 'period'
    ? 'Denna löneperiod'
    : dateRange === 'last30'
    ? 'Senaste 30 dagarna'
    : 'Denna månad';
}

export function getAttributeChipLabel(attr: SpecialAttributeFilter): string {
  return attr === 'saved'
    ? 'Sparade köp'
    : attr === 'packages'
    ? 'Paket'
    : attr === 'receipts'
    ? 'Kvitton'
    : attr === 'recurring'
    ? 'Fasta & abonnemang'
    : 'Stora köp (> 500 kr)';
}
