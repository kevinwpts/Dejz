import React from 'react';
import { 
  Bank, 
  ArrowRight,
  CaretRight
} from '@phosphor-icons/react';
import { PeriodInfo } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { formatIsoTimeStockholm } from '../utils/swedishDate';

export interface AccountItem {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  type: 'checking' | 'savings';
  logo?: string;
}

export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  payday: number;
  category: string;
  logo?: string;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
}

export interface TransactionItem {
  id: string;
  title: string;
  amount: number;
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
}

export function getTransactionTime(
  tx: Pick<TransactionItem, 'id' | 'title' | 'category' | 'date' | 'time' | 'note'>
): string {
  // 1. Om tx.time redan är ett klockslag "HH:MM"
  if (tx.time && typeof tx.time === 'string') {
    const trimmed = tx.time.trim();
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed) && trimmed !== '12:00' && trimmed !== '00:00') {
      return trimmed;
    }
    // Om tx.time är en ISO-sträng
    if (trimmed.includes('T')) {
      const parsedStockholm = formatIsoTimeStockholm(trimmed);
      if (parsedStockholm) return parsedStockholm;
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

  // 3. Deterministiskt klockslag i svensk lokal tid anpassat efter butikskategori
  const seedStr = `${tx.id || ''}|${tx.title || ''}|${tx.date || ''}`;
  let hash = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);

  const cat = (tx.category || '').toLowerCase();
  if (cat.includes('lön') || cat.includes('csn') || cat.includes('bidrag') || cat.includes('pension')) {
    return '08:00';
  }

  let startHour = 8;
  let hourSpan = 12; // 08:00 - 19:59
  if (cat.includes('fika') || cat.includes('restaurang') || cat.includes('nöje')) {
    startHour = 11;
    hourSpan = 10; // 11:00 - 20:59
  } else if (cat.includes('transport')) {
    startHour = 7;
    hourSpan = 12; // 07:00 - 18:59
  } else if (cat.includes('mat')) {
    startHour = 9;
    hourSpan = 12; // 09:00 - 20:59
  } else if (cat.includes('swish')) {
    startHour = 10;
    hourSpan = 12; // 10:00 - 21:59
  }

  const hour = startHour + (absHash % hourSpan);
  const minute = (Math.floor(absHash / 31) % 60);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface HomeTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  accounts: AccountItem[];
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  totalBalance: number;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  kvarAttSpendera: number;
  dagsbudget: number;
  onOpenBank: () => void;
  onSelectTransaction: (tx: TransactionItem) => void;
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onNavigateToFixed: () => void;
  onNavigateToTransactions: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  connectedBank,
  accounts,
  transactions,
  totalBalance,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
  kvarAttSpendera,
  onOpenBank,
  onSelectTransaction,
  onNavigateToTransactions,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  return (
    <div className="space-y-5 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* MODUL 1: TOTALT SALDO                                          */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        {/* Totalt saldo */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Totalt saldo
            </span>
            <button
              type="button"
              onClick={onOpenBank}
              className="text-xs font-semibold text-[var(--text-primary)] hover:opacity-75 transition-opacity"
            >
              {connectedBank ? 'Hantera →' : '+ Anslut bank'}
            </button>
          </div>
          <div className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatKr(totalBalance)}
          </div>
        </div>

        {/* Lista med anslutna konton */}
        {accounts.length > 0 ? (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <ItemLogo
                    name={acc.bankName || acc.name}
                    category="Bank"
                    logoUrl={acc.logo}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {acc.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {acc.bankName}
                      {acc.accountNumber ? ` · ${acc.accountNumber}` : ''}
                    </span>
                  </div>
                </div>
                <span className="font-display font-bold text-[var(--text-primary)] tabular-nums shrink-0">
                  {formatKr(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              Koppla din bank via Enable Banking för att se saldo.
            </span>
            <button
              type="button"
              onClick={onOpenBank}
              className="px-3 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 shrink-0 ml-3"
            >
              <Bank size={14} />
              <span>Anslut</span>
            </button>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* MODUL 2: KVAR ATT SPENDERA                                     */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        {/* KVAR ATT SPENDERA (Dominant Focal Anchor) */}
        <div>
          <span className="text-xs text-[var(--text-muted)] font-medium block mb-1">
            Kvar att spendera
          </span>

          <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
            {formatKr(kvarAttSpendera)}
          </div>
        </div>

        {/* 3-Column Breakdown separated by clean hairline dividers */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] mt-6 pt-4">
          <div className="pr-3 text-left">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Inkomst
            </span>
            <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block">
              +{formatKr(totalIncome)}
            </span>
          </div>

          <div className="px-3 text-left">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Fasta utgifter
            </span>
            <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums block">
              -{formatKr(totalFixedExpenses)}
            </span>
          </div>

          <div className="pl-3 text-left">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Rörliga köp
            </span>
            <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums block">
              -{formatKr(totalVariableSpent)}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SENASTE KÖP                                                   */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
              Senaste köp
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Rörliga utgifter i aktuell period
            </p>
          </div>

          {transactions.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-0.5"
            >
              <span>Alla</span>
              <ArrowRight size={12} />
            </button>
          )}
        </div>

        {deduplicateTransactions(transactions).filter((tx) => tx.type !== 'income').length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {deduplicateTransactions(transactions)
              .filter((tx) => tx.type !== 'income')
              .slice(0, 4)
              .map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => onSelectTransaction(tx)}
                className="w-full py-3 first:pt-0 last:pb-0 flex items-center justify-between text-sm text-left hover:opacity-80 active:scale-[0.99] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-3">
                  <ItemLogo
                    name={tx.title}
                    category={tx.category}
                    logoUrl={tx.logo}
                    size="md"
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--text-primary)] block truncate">
                      {tx.title}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] block truncate tabular-nums">
                      {tx.date} · {tx.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="font-display font-bold text-[var(--text-primary)] tabular-nums block">
                      -{formatKr(tx.amount)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                      {getTransactionTime(tx)}
                    </span>
                  </div>
                  <CaretRight
                    size={14}
                    className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                  />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-4 text-xs text-[var(--text-muted)]">
            Inga utgifter registrerade i denna period.
          </div>
        )}
      </section>
    </div>
  );
};
