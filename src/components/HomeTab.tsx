import React, { useMemo } from 'react';
import { 
  Bank, 
  ArrowRight,
  CaretRight,
  CalendarBlank
} from '@phosphor-icons/react';
import { PeriodInfo } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { deduplicateTransactions } from '../utils/transactionDedup';
import {
  formatIsoTimeStockholm,
} from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';

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
  isHearted?: boolean;
  receiptUrl?: string;
  receiptName?: string;

  // Information hämtad från Enable Banking / Open Banking API
  rawDescription?: string;
  counterpartyName?: string;
  currency?: string;
  creditDebitIndicator?: string;
  transactionId?: string;
  entryReference?: string;
  valueDate?: string;
  bankAccountName?: string;
  rawJson?: any;
}

export function getTransactionTime(
  tx: Pick<TransactionItem, 'id' | 'title' | 'category' | 'date' | 'time' | 'note'> & { amount?: number }
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
  // Använder köpets titel, datum och belopp så att eventuella synkdubbletter eller återhämtningar
  // alltid genererar exakt samma klockslag oavsett slumpmässigt id.
  const amtStr = (tx as any).amount !== undefined ? String(Math.round(Number((tx as any).amount))) : '';
  const seedStr = `${tx.title || ''}|${tx.date || ''}|${amtStr}`;
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
  isInitialLoading?: boolean;
  onOpenBank: () => void;
  onSelectTransaction: (tx: TransactionItem) => void;
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onNavigateToFixed: () => void;
  onNavigateToTransactions: () => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  period,
  connectedBank,
  accounts,
  incomes = [],
  fixedExpenses = [],
  transactions,
  totalBalance,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
  kvarAttSpendera,
  isInitialLoading = false,
  onOpenBank,
  onSelectTransaction,
  onNavigateToTransactions,
}) => {
  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const recentTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    return deduped
      .sort((a, b) => {
        const dateCmp = (b.date || '').localeCompare(a.date || '');
        if (dateCmp !== 0) return dateCmp;
        return getTransactionTime(b).localeCompare(getTransactionTime(a));
      })
      .slice(0, 8);
  }, [transactions]);

  return (
    <div className="space-y-5 pb-36 sm:pb-40 animate-fade-in">
      {/* ============================================================== */}
      {/* MODUL 1: KVAR ATT SPENDERA (Längst upp)                         */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6">
        {/* KVAR ATT SPENDERA (Dominant Focal Anchor) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[var(--text-muted)] font-medium">
              Kvar att spendera
            </span>
            <span className="text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
              {period.startLabel} – {period.endLabel}
            </span>
          </div>

          {isInitialLoading && accounts.length === 0 ? (
            <div className="h-11 w-44 rounded-xl bg-[var(--surface-raised)] animate-pulse mt-1" />
          ) : (
            <div className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatKr(kvarAttSpendera)}
            </div>
          )}
        </div>

        {/* 3-Column Breakdown separated by clean hairline dividers */}
        <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] mt-6 pt-4">
          <div className="pr-3 text-left">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Inkomst
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-14 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums block">
                +{formatKr(totalIncome)}
              </span>
            )}
          </div>

          <div className="px-3 text-left">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Fasta utgifter
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-14 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums block">
                -{formatKr(totalFixedExpenses)}
              </span>
            )}
          </div>

          <div className="pl-3 text-left">
            <span className="text-[11px] text-[var(--text-muted)] font-medium block mb-0.5">
              Rörliga köp
            </span>
            {isInitialLoading && accounts.length === 0 ? (
              <div className="h-4 w-14 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
            ) : (
              <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums block">
                -{formatKr(totalVariableSpent)}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODUL 2: TOTALT SALDO                                          */}
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
              {connectedBank ? 'Hantera →' : isInitialLoading ? '' : '+ Anslut bank'}
            </button>
          </div>
          {isInitialLoading && accounts.length === 0 ? (
            <div className="h-9 w-36 rounded-lg bg-[var(--surface-raised)] animate-pulse mt-1" />
          ) : (
            <div className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatKr(totalBalance)}
            </div>
          )}
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
        ) : isInitialLoading ? (
          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)] space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--surface-raised)]" />
                <div className="space-y-1.5">
                  <div className="w-24 h-3 rounded bg-[var(--surface-raised)]" />
                  <div className="w-16 h-2 rounded bg-[var(--surface-raised)]" />
                </div>
              </div>
              <div className="w-20 h-4 rounded bg-[var(--surface-raised)]" />
            </div>
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
      {/* MODUL 3: SENASTE TRANSAKTIONER                                 */}
      {/* ============================================================== */}
      <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-sm text-[var(--text-primary)]">
              Senaste transaktioner
            </h2>
          </div>

          {transactions.length > 0 && (
            <button
              type="button"
              onClick={onNavigateToTransactions}
              className="text-xs font-semibold text-[var(--text-primary)] hover:opacity-75 transition-opacity flex items-center gap-1 cursor-pointer"
            >
              <span>Visa alla</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-[var(--border-subtle)]">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const recurringStatus = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
              const isFixedOrRecurring = recurringStatus.isRecurring;

              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => onSelectTransaction(tx)}
                  className="w-full py-3.5 first:pt-2.5 last:pb-0 flex items-center justify-between text-sm text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                      isRecurring={recurringStatus.isRecurring}
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-[var(--text-primary)] block truncate">
                        {tx.title}
                      </span>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 truncate mt-0.5">
                        <CategoryIcon category={tx.category} size={11} />
                        <span>{tx.category}</span>
                        <span className="text-[10px] text-[var(--text-muted)]/70">· {tx.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className={isFixedOrRecurring ? '' : 'text-right'}>
                      <span
                        className={`font-display font-bold tabular-nums block ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                      </span>
                      {!isFixedOrRecurring && (
                        <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                          {getTransactionTime(tx)}
                        </span>
                      )}
                    </div>
                    <CaretRight
                      size={15}
                      className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        ) : isInitialLoading ? (
          <div className="space-y-3 py-2 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[var(--surface-raised)]" />
                  <div className="space-y-1.5">
                    <div className="w-28 h-3.5 rounded bg-[var(--surface-raised)]" />
                    <div className="w-20 h-2.5 rounded bg-[var(--surface-raised)]" />
                  </div>
                </div>
                <div className="w-16 h-4 rounded bg-[var(--surface-raised)]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-7 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] flex items-center justify-center mx-auto mb-2">
              <CalendarBlank size={20} weight="duotone" />
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Inga transaktioner registrerade ännu.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
