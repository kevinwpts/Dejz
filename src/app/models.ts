// Appens datatyper (konto, inkomst, fast utgift, transaktion) och små hjälpfunktioner.
// Flyttade från components/HomeTab.tsx så att logik inte behöver gå via en skärmkomponent.
import { formatIsoTimeStockholm, getSwedishDateStr } from '../utils/swedishDate';

export interface AccountItem {
  id: string;
  /** Bankens namn, om kontot kommer från en bankkoppling */
  bank?: string;
  name: string;
  originalName?: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  type: 'checking' | 'savings';
  logo?: string;
  excludeFromTotalBalance?: boolean;
}

export interface IncomeItem {
  id: string;
  name: string;
  originalName?: string;
  linkedAliases?: string[];
  amount: number;
  payday: number;
  category: string;
  logo?: string;
  bankAccountName?: string;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  originalName?: string;
  linkedAliases?: string[];
  linkedGoalId?: string;
  amount: number;
  fullAmount?: number;
  isShared?: boolean;
  dueDay: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
  bankAccountName?: string;
  receiptUrl?: string;
  receiptName?: string;
  receipts?: { url: string; name: string }[];
  isCancelled?: boolean;
  lastPaymentDate?: string;
  hasNoMorePayments?: boolean;
}

const SHORT_SWEDISH_MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maj',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'dec',
];

// Flyttad till räknemotorn – exporteras här vidare så att gamla importer fungerar
export { isFixedExpenseActiveInPeriod } from '../utils/budgetEngine';

export function formatFixedCancellationBadge(exp: FixedExpenseItem): string | null {
  if (!exp.isCancelled) return null;
  if (exp.hasNoMorePayments) return 'Uppsagd · Slut';
  if (exp.lastPaymentDate && /^\d{4}-\d{2}$/.test(exp.lastPaymentDate)) {
    const [yStr, mStr] = exp.lastPaymentDate.split('-');
    const targetYear = parseInt(yStr, 10);
    const targetMonth = parseInt(mStr, 10) - 1;
    const nowStr = getSwedishDateStr();
    const nowYear = parseInt(nowStr.slice(0, 4), 10);
    const nowMonth = parseInt(nowStr.slice(5, 7), 10) - 1;
    const diffMonths = (targetYear - nowYear) * 12 + (targetMonth - nowMonth);
    const monthLabel = SHORT_SWEDISH_MONTHS[targetMonth] || exp.lastPaymentDate;

    if (diffMonths < 0) return 'Uppsagd · Slut';
    if (diffMonths === 0) return `Uppsagd · Sista ${monthLabel}`;
    if (diffMonths <= 6) return `Uppsagd · ${diffMonths} mån kvar`;
    return `Uppsagd · Sista ${monthLabel}`;
  }
  return 'Uppsagd';
}

export interface TransactionItem {
  id: string;
  title: string;
  originalTitle?: string;
  amount: number;
  originalAmount?: number;
  linkedSwishTxId?: string;
  linkedFixedExpenseId?: string;
  linkedIncomeId?: string;
  category: string;
  date: string;
  time?: string;
  note?: string;
  logo?: string;
  type?: 'expense' | 'income';
  bookingDate?: string;
  bookingStatus?: string;
  reconciliationStatus?: string;
  isExcluded?: boolean;
  excludeFromBudget?: boolean;
  isHearted?: boolean;
  isWaitingForPackage?: boolean;
  isWaitingForSwish?: boolean;
  isSharedExpense?: boolean;
  pendingSwishAmount?: number;
  pendingSwishRecipient?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  receiptName?: string;
  receipts?: { url: string; name: string }[];

  // Information hämtad från Enable Banking / Open Banking API
  rawDescription?: string;
  counterpartyName?: string;
  currency?: string;
  creditDebitIndicator?: string;
  transactionId?: string;
  entryReference?: string;
  valueDate?: string;
  bankAccountId?: string;
  bankAccountName?: string;
  createdAt?: string;
  sortOrder?: number;
  rawJson?: any;
}

export function doesTransactionMatchAccount(
  tx: TransactionItem,
  acc: AccountItem
): boolean {
  if (tx.bankAccountId && acc.id) {
    return tx.bankAccountId === acc.id;
  }
  const rawName = (tx.bankAccountName || '').toLowerCase();
  if (!rawName) return false;

  const accDigits = (acc.accountNumber || '').replace(/\D/g, '');
  if (accDigits.length >= 4) {
    const last4 = accDigits.slice(-4);
    const rawDigits = rawName.replace(/\D/g, '');
    if (rawDigits.length >= 4 && rawDigits.endsWith(last4)) {
      return true;
    }
  }

  return rawName.includes((acc.name || '').toLowerCase());
}

export function getTransactionTime(
  tx: Pick<TransactionItem, 'id' | 'title' | 'category' | 'date' | 'time' | 'note'> & {
    amount?: number;
    bookingStatus?: string;
  }
): string {
  // Reserverade transaktioner ska inte visa klockslag
  if (tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD') {
    return '';
  }

  // 1. Om tx.time redan är ett faktiskt klockslag "HH:MM"
  if (tx.time && typeof tx.time === 'string') {
    const trimmed = tx.time.trim();
    if (
      /^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) &&
      trimmed !== '12:00' &&
      trimmed !== '00:00'
    ) {
      return trimmed;
    }
    // Om tx.time är en ISO-sträng med faktisk tid
    if (
      trimmed.includes('T') &&
      !trimmed.includes('T00:00') &&
      !trimmed.includes('T12:00')
    ) {
      const parsedStockholm = formatIsoTimeStockholm(trimmed);
      if (parsedStockholm && parsedStockholm !== '00:00' && parsedStockholm !== '12:00') {
        return parsedStockholm;
      }
    }
  }

  // 2. Om klockslag finns i noteringen eller beskrivningen
  if (tx.note) {
    const noteMatch = tx.note.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)\b/);
    if (noteMatch) {
      const hhmm = `${noteMatch[1]}:${noteMatch[2]}`;
      if (hhmm !== '12:00' && hhmm !== '00:00') {
        return hhmm;
      }
    }
  }

  // 3. Om banken enbart skickade bokföringsdatum utan klockslag (PSD2 standard för SEB m.fl.),
  // returnera tom sträng — hitta aldrig på ett påhittat klockslag.
  return '';
}

export function compareTransactionsChronologically(
  a: TransactionItem,
  b: TransactionItem
): number {
  const dateCmp = (b.date || '').localeCompare(a.date || '');
  if (dateCmp !== 0) return dateCmp;

  const timeA = getTransactionTime(a);
  const timeB = getTransactionTime(b);
  if (timeA && timeB && timeA !== timeB) {
    return timeB.localeCompare(timeA);
  }

  if (
    typeof a.sortOrder === 'number' &&
    typeof b.sortOrder === 'number' &&
    a.sortOrder !== b.sortOrder
  ) {
    return b.sortOrder - a.sortOrder;
  }

  // Om den ena transaktionen hämtades vid en senare synkning än den andra (> 10 sek skillnad),
  // har den inträffat senare under dagen och ska ligga överst.
  if (a.createdAt && b.createdAt) {
    const msA = Date.parse(a.createdAt);
    const msB = Date.parse(b.createdAt);
    if (Number.isFinite(msA) && Number.isFinite(msB) && Math.abs(msB - msA) > 10_000) {
      return msB - msA;
    }
  }

  // Bankens sekventiella bokföringsreferens (t.ex. SEB entry_reference) ökar kronologiskt under dagen
  if (a.entryReference && b.entryReference && a.entryReference !== b.entryReference) {
    return b.entryReference.localeCompare(a.entryReference);
  }

  if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
    return b.createdAt.localeCompare(a.createdAt);
  }

  return 0;
}
