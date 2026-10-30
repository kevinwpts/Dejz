import React, { useMemo, useState } from 'react';
import {
  Bank,
  CalendarBlank,
  Check,
  Copy,
  Heart,
  MagnifyingGlass,
  Package,
  Paperclip,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';
import {
  AccountItem,
  doesTransactionMatchAccount,
  FixedExpenseItem,
  getTransactionTime,
  IncomeItem,
  TransactionItem,
} from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { SwipeableTxRow } from './ui/SwipeableTxRow';
import { PeriodInfo, isDateInPeriod } from '../utils/periodEngine';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { formatSwedishDateHeading, getItemReceipts } from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';
import { SEB_SVG_DATA_URI } from '../utils/logo';

interface BankAccountDetailViewProps {
  account: AccountItem;
  accounts: AccountItem[];
  totalBalance: number;
  transactions: TransactionItem[];
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  period: PeriodInfo;
  onSelectAccount: (accountId: string) => void;
  onSelectTransaction: (tx: TransactionItem) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
}

export const BankAccountDetailView: React.FC<BankAccountDetailViewProps> = ({
  account,
  accounts,
  totalBalance,
  transactions,
  fixedExpenses,
  incomes,
  period,
  onSelectAccount,
  onSelectTransaction,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
}) => {
  const [scope, setScope] = useState<'period' | 'all'>('all');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAccountNum, setCopiedAccountNum] = useState(false);

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const isSeb = useMemo(() => {
    const combined = `${account.bankName || ''} ${account.name || ''}`.toLowerCase();
    const digits = (account.accountNumber || '').replace(/\D/g, '');
    return (
      combined.includes('seb') ||
      combined.includes('skandinaviska enskilda') ||
      (digits.length >= 4 && digits.startsWith('5'))
    );
  }, [account]);

  const effectiveBankName = isSeb ? 'SEB' : account.bankName || 'SEB';
  const effectiveBankFullSubtitle = isSeb
    ? 'Skandinaviska Enskilda Banken'
    : 'Anslutet bankkonto';
  const effectiveLogo = isSeb ? SEB_SVG_DATA_URI : account.logo;

  const isSavingsAccount = useMemo(() => {
    const lower = (account.name || '').toLowerCase();
    return (
      lower.includes('spar') ||
      lower.includes('buffert') ||
      lower.includes('framtid') ||
      lower.includes('kapital') ||
      account.type === 'savings'
    );
  }, [account]);

  const balanceSharePct = useMemo(() => {
    const positiveSum = accounts.reduce(
      (sum, a) => sum + Math.max(0, Number(a.balance) || 0),
      0
    );
    if (positiveSum <= 0 || account.balance <= 0) return 0;
    return Math.round((Math.max(0, account.balance) / positiveSum) * 100);
  }, [accounts, account.balance]);

  // Alla transaktioner som tillhör detta bankkonto
  const accountTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions || []);
    const matched = deduped.filter((tx) => {
      if (tx.isExcluded) return false;
      return doesTransactionMatchAccount(tx, account);
    });

    // Om inga transaktioner alls i appen har ett bankAccountId (t.ex. äldre lokala köp) och detta är huvudkontot
    const anyTxHasAccountLink = deduped.some(
      (tx) => Boolean(tx.bankAccountId || tx.bankAccountName)
    );
    const listToSort =
      matched.length === 0 && !anyTxHasAccountLink && accounts[0]?.id === account.id
        ? deduped.filter((tx) => !tx.isExcluded)
        : matched;

    return listToSort.sort((a, b) => {
      const dCmp = (b.date || '').localeCompare(a.date || '');
      if (dCmp !== 0) return dCmp;
      return getTransactionTime(b).localeCompare(getTransactionTime(a));
    });
  }, [transactions, account, accounts]);

  // Filtrera efter vald tidsperiod (Aktuell löneperiod vs Alla)
  const scopedTransactions = useMemo(() => {
    if (scope === 'period') {
      return accountTransactions.filter((tx) => isDateInPeriod(tx.date, period));
    }
    return accountTransactions;
  }, [accountTransactions, scope, period]);

  // Summera insättningar och uttag för detta konto under vald vy
  const { totalInflow, totalOutflow } = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const tx of scopedTransactions) {
      const amt = Math.abs(Number(tx.amount) || 0);
      if (tx.type === 'income') {
        inflow += amt;
      } else {
        outflow += amt;
      }
    }
    return { totalInflow: inflow, totalOutflow: outflow };
  }, [scopedTransactions]);

  // Filtrera på sökfråga + typ (Alla / Insättningar / Uttag)
  const displayedTransactions = useMemo(() => {
    return scopedTransactions.filter((tx) => {
      if (txTypeFilter === 'income' && tx.type !== 'income') return false;
      if (txTypeFilter === 'expense' && tx.type === 'income') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const qDigits = q.replace(/\s+/g, '');
      const amtStr = String(Math.round(Number(tx.amount) || 0));
      const formattedAmt = new Intl.NumberFormat('sv-SE')
        .format(Math.round(Number(tx.amount) || 0))
        .toLowerCase();

      return (
        (tx.title || '').toLowerCase().includes(q) ||
        (tx.category || '').toLowerCase().includes(q) ||
        (tx.note || '').toLowerCase().includes(q) ||
        (qDigits.length > 0 && amtStr.includes(qDigits)) ||
        formattedAmt.includes(q)
      );
    });
  }, [scopedTransactions, txTypeFilter, searchQuery]);

  // Gruppera per datum för bankkontoutdraget
  const groupedByDate = useMemo(() => {
    const map = new Map<string, TransactionItem[]>();
    for (const tx of displayedTransactions) {
      const key = tx.date || 'Okänt';
      const arr = map.get(key) || [];
      arr.push(tx);
      map.set(key, arr);
    }
    const keys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return keys.map((dateKey) => {
      const items = map.get(dateKey) || [];
      const net = items.reduce((acc, item) => {
        const amt = Number(item.amount) || 0;
        return item.type === 'income' ? acc + amt : acc - amt;
      }, 0);
      return { dateKey, items, net };
    });
  }, [displayedTransactions]);

  const handleCopyAccountNumber = () => {
    if (!account.accountNumber) return;
    navigator.clipboard?.writeText(account.accountNumber).catch(() => {});
    setCopiedAccountNum(true);
    window.setTimeout(() => setCopiedAccountNum(false), 2000);
  };

  return (
    <div className="ui-page animate-fade-in">
      {/* ============================================================== */}
      {/* SNABBVÄXLING MELLAN DINA BANKKONTON (Om man har flera konton)  */}
      {/* ============================================================== */}
      {accounts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {accounts.map((acc) => {
            const isActive = acc.id === account.id;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => onSelectAccount(acc.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-subtle font-semibold'
                    : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                }`}
              >
                <span className="truncate max-w-[130px]">{acc.name}</span>
                <span
                  className={`tabular-nums text-[11px] ${
                    isActive ? 'opacity-80' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {formatKr(acc.balance)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODUL 1: BANKÖVERSIKT / HERO-KONTOKORT MED TYDLIG SEB-IDENTITET*/}
      {/* ============================================================== */}
      <section className="relative overflow-hidden rounded-[24px] bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 sm:p-6">
        {/* Subtil bank-tonad ambient glöd i bakgrunden (SEB-grön för SEB) */}
        <div
          className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15 dark:opacity-20"
          style={{ backgroundColor: isSeb ? '#60CD18' : '#10B981' }}
        />

        {/* Topprad: Tydlig Banklogga + Banknamn + Synkad-badge */}
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <ItemLogo
              name={effectiveBankName}
              category="Bank"
              logoUrl={effectiveLogo}
              size="lg"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-emerald-600 dark:text-[#60CD18]">
                  {effectiveBankName}
                </span>
                <span className="text-[var(--border-subtle)]">•</span>
                <span className="text-[11px] font-normal text-[var(--text-secondary)] truncate">
                  {effectiveBankFullSubtitle}
                </span>
              </div>
              <h1 className="font-display text-lg sm:text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)] truncate mt-0.5">
                {account.name}
              </h1>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>Aktivt</span>
          </div>
        </div>

        {/* Kontosaldo */}
        <div className="relative mt-6 pt-5 border-t border-[var(--border-subtle)] flex items-end justify-between gap-4">
          <div>
            <span className="text-[12px] text-[var(--text-secondary)] font-normal block">
              Aktuellt kontosaldo
            </span>
            <div className="font-display text-[30px] sm:text-[34px] font-semibold tracking-[-0.025em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
              {formatKr(account.balance)}
            </div>
          </div>

          {accounts.length > 1 && totalBalance > 0 && (
            <div className="text-right shrink-0 pb-1">
              <span className="text-[11px] text-[var(--text-muted)] block">
                Andel av totalt
              </span>
              <span className="font-display text-xs font-semibold text-[var(--text-secondary)] tabular-nums">
                {balanceSharePct}% av {formatKr(totalBalance)}
              </span>
            </div>
          )}
        </div>

        {/* Bankuppgifter: Kontonummer (med kopiera), Kontotyp & Bankskydd */}
        <div className="relative mt-5 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 gap-3 text-left">
          <div className="min-w-0">
            <span className="text-[11px] text-[var(--text-muted)] block">
              Kontonummer
            </span>
            {account.accountNumber ? (
              <button
                type="button"
                onClick={handleCopyAccountNumber}
                className="mt-1 inline-flex items-center gap-1.5 font-mono text-[12.5px] font-medium text-[var(--text-primary)] hover:text-emerald-500 transition-colors cursor-pointer group"
                title="Kopiera kontonummer"
              >
                <span className="truncate">{account.accountNumber}</span>
                {copiedAccountNum ? (
                  <Check size={13} weight="bold" className="text-emerald-500 shrink-0" />
                ) : (
                  <Copy
                    size={13}
                     className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0"
                  />
                )}
              </button>
            ) : (
              <span className="mt-1 block text-[12.5px] text-[var(--text-secondary)]">
                Synkat via {effectiveBankName}
              </span>
            )}
          </div>

          <div className="min-w-0 pl-3 border-l border-[var(--border-subtle)]">
            <span className="text-[11px] text-[var(--text-muted)] block">
              Kontotyp & valuta
            </span>
            <span className="mt-1 block text-[12.5px] font-medium text-[var(--text-primary)] truncate">
              {isSavingsAccount ? 'Sparkonto · SEK' : 'Privatkonto · SEK'}
            </span>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* MODUL 2: KASSAFLÖDE PÅ KONTOT MED TYDLIG FÄRGBAR               */}
      {/* ============================================================== */}
      <section className="ui-card-p">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            Flöde på kontot
          </span>
          <div className="inline-flex items-center rounded-full bg-[var(--bg-color)] p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                scope === 'all'
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Alla händelser
            </button>
            <button
              type="button"
              onClick={() => setScope('period')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                scope === 'period'
                  ? 'bg-[var(--surface-color)] text-[var(--text-primary)] shadow-2xs font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Denna period
            </button>
          </div>
        </div>

        <div className="ui-stat-grid">
          <div className="pr-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
              <span>Insättningar</span>
            </span>
            <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
              +{formatKr(totalInflow)}
            </span>
          </div>

          <div className="px-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
              <span>Uttag & köp</span>
            </span>
            <span className="ui-stat-value text-amber-600 dark:text-amber-400">
              -{formatKr(totalOutflow)}
            </span>
          </div>

          <div className="pl-3 min-w-0">
            <span className="ui-stat-label flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
              <span>Händelser</span>
            </span>
            <span className="ui-stat-value text-indigo-600 dark:text-indigo-400">
              {scopedTransactions.length} st
            </span>
          </div>
        </div>

        {/* Tydligt färgkodad bar för Insättningar (Grön) vs Uttag & köp (Amber/Orange) */}
        {(totalInflow > 0 || totalOutflow > 0) && (
          <div className="mt-3.5 h-2 w-full rounded-full bg-[var(--bg-color)] overflow-hidden flex gap-1">
            {(() => {
              const sum = totalInflow + totalOutflow;
              const inPct = sum > 0 ? (totalInflow / sum) * 100 : 0;
              const outPct = sum > 0 ? (totalOutflow / sum) * 100 : 0;
              return (
                <>
                  {inPct > 0 && (
                    <div
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.max(4, inPct)}%` }}
                      title={`Insättningar: +${formatKr(totalInflow)}`}
                    />
                  )}
                  {outPct > 0 && (
                    <div
                      className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                      style={{ width: `${Math.max(4, outPct)}%` }}
                      title={`Uttag & köp: -${formatKr(totalOutflow)}`}
                    />
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* MODUL 3: SÖK & KONTOUTDRAG FÖR DETTA KONTO                     */}
      {/* ============================================================== */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="ui-section-title">Kontohändelser</h2>
          <div className="flex items-center gap-1">
            {(['all', 'income', 'expense'] as const).map((tab) => {
              const active = txTypeFilter === tab;
              const label =
                tab === 'all' ? 'Alla' : tab === 'income' ? 'Insättningar' : 'Uttag';
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTxTypeFilter(tab)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-semibold'
                      : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sökfält för kontot */}
        {accountTransactions.length > 0 && (
          <div className="relative">
            <MagnifyingGlass
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Sök händelse på ${account.name}...`}
              className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-secondary)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={14} weight="bold" />
              </button>
            )}
          </div>
        )}

        {/* Transaktionslista grupperad per dag */}
        {groupedByDate.length > 0 ? (
          <div className="space-y-4">
            {groupedByDate.map(({ dateKey, items, net }) => {
              const netStr =
                new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';
              return (
                <div key={`acc-date-${dateKey}`} className="ui-section">
                  <div className="ui-date-header">
                    <span className="ui-date-header-title">
                      {formatSwedishDateHeading(dateKey)}
                    </span>
                    <span
                      className={`ui-date-header-sum ${
                        net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    >
                      {net > 0 ? `+${netStr}` : `-${netStr}`}
                    </span>
                  </div>

                  <div className="ui-list-card">
                    {items.map((tx) => {
                      const isIncome = tx.type === 'income';
                      const recurring = checkIsRecurringTransaction(
                        tx,
                        fixedExpenses,
                        incomes
                      );
                      const hasReceipts = getItemReceipts(tx).length > 0;
                      const isPending =
                        tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                      const statusSub = isPending
                        ? 'Reserverat'
                        : getTransactionTime(tx);

                      const rowContent = (
                        <button
                          type="button"
                          onClick={() => onSelectTransaction(tx)}
                          className="ui-tx-row"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <ItemLogo
                              name={tx.title}
                              category={tx.category}
                              logoUrl={tx.logo}
                              size="md"
                              isRecurring={recurring.isRecurring}
                            />
                            <div className="min-w-0 flex-1">
                              <span className="ui-row-title">{tx.title}</span>
                              <span className="ui-row-subtitle">
                                <CategoryIcon
                                  category={tx.category}
                                  size={11}
                                  className="shrink-0"
                                />
                                <span className="truncate">{tx.category}</span>
                                {tx.isHearted && (
                                  <Heart
                                    size={11}
                                    weight="fill"
                                    className="text-rose-500 shrink-0 ml-0.5"
                                  />
                                )}
                                {tx.isWaitingForPackage && (
                                  <Package
                                    size={11}
                                    weight="fill"
                                    className="text-amber-500 shrink-0 ml-0.5"
                                  />
                                )}
                                {hasReceipts && (
                                  <Paperclip
                                    size={11}
                                    weight="bold"
                                    className="text-[var(--text-secondary)] shrink-0 ml-0.5"
                                  />
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={
                                isIncome ? 'ui-row-amount-income' : 'ui-row-amount'
                              }
                            >
                              {isIncome
                                ? `+${formatKr(tx.amount)}`
                                : `-${formatKr(tx.amount)}`}
                            </span>
                            {statusSub && (
                              <span className="ui-row-meta">{statusSub}</span>
                            )}
                          </div>
                        </button>
                      );

                      return (
                        <SwipeableTxRow
                          key={tx.id}
                          isHearted={tx.isHearted}
                          isWaitingForPackage={tx.isWaitingForPackage}
                          isExcluded={tx.isExcluded}
                          onToggleHeart={
                            onToggleHeart
                              ? () => onToggleHeart(tx.id, !tx.isHearted)
                              : undefined
                          }
                          onTogglePackage={
                            onTogglePackage
                              ? () =>
                                  onTogglePackage(tx.id, !tx.isWaitingForPackage)
                              : undefined
                          }
                          onToggleExclude={
                            onExcludeTransaction
                              ? () => onExcludeTransaction(tx.id, !tx.isExcluded)
                              : undefined
                          }
                        >
                          {rowContent}
                        </SwipeableTxRow>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ui-list-card py-10 px-4 text-center">
            <div className="w-11 h-11 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-3 text-[var(--text-secondary)]">
              {scope === 'period' ? (
                <CalendarBlank size={20} weight="duotone" />
              ) : (
                <ShieldCheck size={20} weight="duotone" />
              )}
            </div>
            <p className="font-display font-semibold text-sm text-[var(--text-primary)]">
              {searchQuery
                ? 'Inga kontohändelser matchade din sökning'
                : scope === 'period'
                ? 'Inga kontohändelser under denna löneperiod'
                : 'Inga bokförda transaktioner på detta konto än'}
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-[260px] mx-auto mt-1 leading-relaxed">
              {scope === 'period' && accountTransactions.length > 0
                ? 'Byt till "Alla händelser" ovan för att se tidigare kontoutdrag på kontot.'
                : `Kontot är aktivt och synkat med ${effectiveBankName} med aktuellt saldo ${formatKr(
                    account.balance
                  )}.`}
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
