import React, { useMemo, useState } from 'react';
import {
  Receipt,
  MagnifyingGlass,
  X,
  Package,
  Heart,
  Paperclip,
  Users,
  Plus,
  SlidersHorizontal,
  Check,
  ArrowsClockwise,
  Bank,
  CalendarBlank,
  Wallet,
  Sparkle,
} from '@phosphor-icons/react';
import {
  TransactionItem,
  AccountItem,
  getTransactionTime,
  FixedExpenseItem,
  IncomeItem,
  doesTransactionMatchAccount,
} from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon, resolveCategoryColor } from './CategoryIcon';
import { SwipeableTxRow } from './ui/SwipeableTxRow';
import { BottomSheet } from './ui/BottomSheet';
import { deduplicateTransactions } from '../utils/transactionDedup';
import { formatSwedishDateHeading, getSwedishDateStr } from '../utils/swedishDate';
import { checkIsRecurringTransaction } from '../utils/recurring';
import { isDateInPeriod, PeriodInfo } from '../utils/periodEngine';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
} from '../utils/appCache';

interface TransactionsTabProps {
  transactions: TransactionItem[];
  accounts?: AccountItem[];
  selectedAccountId?: string | null;
  onSelectAccount?: (accountId: string | null) => void;
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  totalVariableSpent?: number;
  onSelectTransaction: (tx: TransactionItem) => void;
  onAddTransaction?: () => void;
  onDeleteTransaction?: (id: string) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  onExcludeTransaction?: (id: string, exclude: boolean) => void;
  period?: PeriodInfo;
  targetPayday?: number;
  weekendHandling?: any;
}

type TxTypeTab = 'all' | 'expense' | 'income';
type DateRangeFilter = 'all' | 'period' | 'last30' | 'thisMonth';
type SpecialAttributeFilter = 'saved' | 'packages' | 'receipts' | 'recurring' | 'large';

function inferPaymentMethodForTx(tx: TransactionItem): string {
  if (tx.paymentMethod) return tx.paymentMethod;
  const combined = `${tx.title || ''} ${tx.category || ''} ${tx.rawDescription || ''}`.toLowerCase();
  if (combined.includes('swish')) return 'Swish';
  if (combined.includes('autogiro')) return 'Autogiro';
  if (combined.includes('klarna')) return 'Klarna';
  if (combined.includes('faktura') || combined.includes('e-faktura')) return 'Faktura';
  if (tx.type === 'income') return 'Överföring';
  return 'Kort';
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactions,
  accounts = [],
  selectedAccountId = null,
  onSelectAccount,
  fixedExpenses = [],
  incomes = [],
  onSelectTransaction,
  onAddTransaction,
  onToggleHeart,
  onTogglePackage,
  onExcludeTransaction,
  period,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeTab, setTypeTab] = useState<TxTypeTab>('all');
  const [localAccountId, setLocalAccountId] = useState<string | null>(selectedAccountId);
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<SpecialAttributeFilter[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const effectiveAccountId =
    onSelectAccount !== undefined ? selectedAccountId : localAccountId;

  const handleSetAccount = (accId: string | null) => {
    if (onSelectAccount) {
      onSelectAccount(accId);
    } else {
      setLocalAccountId(accId);
    }
  };

  const formatKr = (amount: number) => {
    return new Intl.NumberFormat('sv-SE').format(Math.round(amount)) + ' kr';
  };

  const todayStr = useMemo(() => getSwedishDateStr(), []);
  const thirtyDaysAgoStr = useMemo(() => {
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
  }, [todayStr]);
  const thisMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Sortera alla transaktioner strikt efter köpdatum och köptid
  const sortedTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return getTransactionTime(b).localeCompare(getTransactionTime(a));
    });
  }, [transactions]);

  const activeAccount = useMemo(
    () =>
      effectiveAccountId
        ? accounts.find((a) => a.id === effectiveAccountId) || null
        : null,
    [accounts, effectiveAccountId]
  );

  // Kategorier med antal transaktioner
  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tx of sortedTransactions) {
      const cat = tx.category || 'Övrigt';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    const storedExp = getStoredExpenseCategories()
      .map((c: any) => (typeof c === 'string' ? c : c?.name))
      .filter(Boolean);
    const storedInc = getStoredIncomeCategories()
      .map((c: any) => (typeof c === 'string' ? c : c?.name))
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
  }, [sortedTransactions]);

  const paymentMethodOptions = useMemo(() => {
    const storedNames = getStoredPaymentMethods()
      .map((p: any) => (typeof p === 'string' ? p : p?.name))
      .filter((n): n is string => Boolean(n && typeof n === 'string'));
    const counts = new Map<string, number>();
    for (const tx of sortedTransactions) {
      const pm = inferPaymentMethodForTx(tx);
      counts.set(pm, (counts.get(pm) || 0) + 1);
    }
    const all = Array.from(new Set([...storedNames, ...Array.from(counts.keys())]));
    return all.filter((m) => (counts.get(m) || 0) > 0 || storedNames.includes(m));
  }, [sortedTransactions]);

  // Sök- och kombinerad filtrering
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) => {
      // 1. Typ (Alla / Utgifter / Inkomster)
      if (typeTab === 'expense' && tx.type === 'income') return false;
      if (typeTab === 'income' && tx.type !== 'income') return false;

      // 2. Konto
      if (activeAccount && !doesTransactionMatchAccount(tx, activeAccount)) {
        return false;
      }

      // 3. Tidsperiod
      if (dateRange === 'period' && period && !isDateInPeriod(tx.date, period)) {
        return false;
      }
      if (dateRange === 'last30' && (tx.date || '') < thirtyDaysAgoStr) {
        return false;
      }
      if (dateRange === 'thisMonth' && !(tx.date || '').startsWith(thisMonthPrefix)) {
        return false;
      }

      // 4. Kategorier
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(tx.category || 'Övrigt')
      ) {
        return false;
      }

      // 5. Egenskaper & markeringar
      if (selectedAttributes.includes('saved') && !tx.isHearted) return false;
      if (selectedAttributes.includes('packages') && !tx.isWaitingForPackage) return false;
      if (selectedAttributes.includes('receipts') && !tx.receiptUrl) return false;
      if (selectedAttributes.includes('large') && Number(tx.amount) < 500) return false;
      if (selectedAttributes.includes('recurring')) {
        const rec = checkIsRecurringTransaction(tx, fixedExpenses, incomes);
        if (!rec.isRecurring) return false;
      }

      // 6. Betalsätt
      if (selectedPaymentMethod) {
        const pm = inferPaymentMethodForTx(tx);
        if (pm.toLowerCase() !== selectedPaymentMethod.toLowerCase()) return false;
      }

      // 7. Fritextsökning (inklusive belopp)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
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
    });
  }, [
    sortedTransactions,
    typeTab,
    activeAccount,
    dateRange,
    period,
    thirtyDaysAgoStr,
    thisMonthPrefix,
    selectedCategories,
    selectedAttributes,
    selectedPaymentMethod,
    searchQuery,
    fixedExpenses,
    incomes,
  ]);

  const savedCount = useMemo(
    () => sortedTransactions.filter((tx) => tx.isHearted).length,
    [sortedTransactions]
  );
  const packagesCount = useMemo(
    () => sortedTransactions.filter((tx) => tx.isWaitingForPackage).length,
    [sortedTransactions]
  );
  const receiptsCount = useMemo(
    () => sortedTransactions.filter((tx) => Boolean(tx.receiptUrl)).length,
    [sortedTransactions]
  );
  const recurringCount = useMemo(
    () =>
      sortedTransactions.filter(
        (tx) => checkIsRecurringTransaction(tx, fixedExpenses, incomes).isRecurring
      ).length,
    [sortedTransactions, fixedExpenses, incomes]
  );
  const largeCount = useMemo(
    () => sortedTransactions.filter((tx) => Number(tx.amount) >= 500).length,
    [sortedTransactions]
  );

  // Gruppera strikt per datum så varje dag enbart visar dagens händelser
  const groupedByDate = useMemo(() => {
    const groups: {
      dateKey: string;
      label: string;
      net: number;
      items: TransactionItem[];
    }[] = [];

    const map = new Map<string, TransactionItem[]>();
    for (const tx of filteredTransactions) {
      const key = tx.date || 'Okänt';
      const arr = map.get(key) || [];
      arr.push(tx);
      map.set(key, arr);
    }

    const sortedDateKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

    for (const dateKey of sortedDateKeys) {
      const items = map.get(dateKey)!;
      items.sort((a, b) => getTransactionTime(b).localeCompare(getTransactionTime(a)));
      const net = items.reduce((acc, item) => {
        const amt = Number(item.amount) || 0;
        return item.type === 'income' ? acc + amt : acc - amt;
      }, 0);
      groups.push({
        dateKey,
        label: formatSwedishDateHeading(dateKey),
        net,
        items,
      });
    }

    return groups;
  }, [filteredTransactions]);

  const filterTabs: { id: TxTypeTab; label: string }[] = [
    { id: 'all', label: 'Alla' },
    { id: 'expense', label: 'Utgifter' },
    { id: 'income', label: 'Inkomster' },
  ];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleAttribute = (attr: SpecialAttributeFilter) => {
    setSelectedAttributes((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  const activeFilterCount =
    (activeAccount ? 1 : 0) +
    (dateRange !== 'all' ? 1 : 0) +
    selectedCategories.length +
    selectedAttributes.length +
    (selectedPaymentMethod ? 1 : 0);

  const resetAllFilters = () => {
    handleSetAccount(null);
    setDateRange('all');
    setSelectedCategories([]);
    setSelectedAttributes([]);
    setSelectedPaymentMethod(null);
  };

  const formatAccountShortLabel = (acc: AccountItem) => {
    const hasDuplicateName =
      accounts.filter(
        (other) => other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
      ).length > 1;
    const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
    const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';
    if (hasDuplicateName && last4) {
      return `${acc.name} (${last4})`;
    }
    return acc.name;
  };

  return (
    <div className="ui-page">
      {/* Sökfält, Filterknapp (Bottom Sheet) & Segmented Control */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="ui-search-box flex-1 min-w-0">
            <MagnifyingGlass size={16} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök"
              aria-label="Sök"
              className="ui-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Rensa sökning"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Kompakt filterikon som öppnar Filter Bottom Sheet */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            title="Filtrera transaktioner"
            aria-label={`Filtrera transaktioner${
              activeFilterCount > 0 ? ` (${activeFilterCount} aktiva)` : ''
            }`}
            className={`w-[38px] h-[38px] rounded-xl border flex items-center justify-center relative transition-all cursor-pointer shrink-0 ${
              activeFilterCount > 0
                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
            }`}
          >
            <SlidersHorizontal size={15} weight={activeFilterCount > 0 ? 'bold' : 'regular'} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-[10px] font-bold flex items-center justify-center ring-2 ring-[var(--bg-color)] pointer-events-none tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>

          {onAddTransaction && (
            <button
              type="button"
              onClick={onAddTransaction}
              title="Lägg till händelse"
              className="h-[38px] px-3.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 hover:bg-[var(--surface-hover)] active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus size={13} weight="bold" />
              <span>Lägg till</span>
            </button>
          )}
        </div>

        {/* Segmented Filter Control (Alla / Utgifter / Inkomster) */}
        <div className="ui-segmented-surface grid-cols-3">
          {filterTabs.map((tab) => {
            const isActive = typeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeTab(tab.id)}
                className={`ui-segmented-tab ${isActive ? 'ui-segmented-tab-active' : ''}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Snabb kontoväljare om flera konton är kopplade */}
        {accounts.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <button
              type="button"
              onClick={() => handleSetAccount(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                !activeAccount
                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                  : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
              }`}
            >
              Alla konton
            </button>
            {accounts.map((acc) => {
              const isSelected = activeAccount?.id === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSetAccount(isSelected ? null : acc.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                      : 'bg-[var(--surface-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <span>{formatAccountShortLabel(acc)}</span>
                  <span
                    className={`font-display tabular-nums ${
                      isSelected ? 'opacity-85' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    · {formatKr(acc.balance)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Aktiva filter-brickor (när filter utöver konto eller enkla konto-val är aktiva) */}
        {(dateRange !== 'all' ||
          selectedCategories.length > 0 ||
          selectedAttributes.length > 0 ||
          selectedPaymentMethod ||
          (activeAccount && accounts.length <= 1)) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {activeAccount && accounts.length <= 1 && (
              <button
                type="button"
                onClick={() => handleSetAccount(null)}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <span>{formatAccountShortLabel(activeAccount)}</span>
                <X size={11} weight="bold" className="text-[var(--text-muted)]" />
              </button>
            )}

            {dateRange !== 'all' && (
              <button
                type="button"
                onClick={() => setDateRange('all')}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <span>
                  {dateRange === 'period'
                    ? 'Denna löneperiod'
                    : dateRange === 'last30'
                    ? 'Senaste 30 dagarna'
                    : 'Denna månad'}
                </span>
                <X size={11} weight="bold" className="text-[var(--text-muted)]" />
              </button>
            )}

            {selectedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <CategoryIcon category={cat} size={11} />
                <span>{cat}</span>
                <X size={11} weight="bold" className="text-[var(--text-muted)]" />
              </button>
            ))}

            {selectedAttributes.map((attr) => {
              const label =
                attr === 'saved'
                  ? 'Sparade köp'
                  : attr === 'packages'
                  ? 'Paket'
                  : attr === 'receipts'
                  ? 'Kvitton'
                  : attr === 'recurring'
                  ? 'Fasta & abonnemang'
                  : 'Stora köp (> 500 kr)';
              return (
                <button
                  key={attr}
                  type="button"
                  onClick={() => toggleAttribute(attr)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--surface-hover)] cursor-pointer"
                >
                  <span>{label}</span>
                  <X size={11} weight="bold" className="text-[var(--text-muted)]" />
                </button>
              );
            })}

            {selectedPaymentMethod && (
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod(null)}
                className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                <span>{selectedPaymentMethod}</span>
                <X size={11} weight="bold" className="text-[var(--text-muted)]" />
              </button>
            )}

            {activeFilterCount > 1 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Rensa alla
              </button>
            )}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* FILTER BOTTOM SHEET MODAL                                      */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filtrera transaktioner"
        subtitle={
          activeFilterCount > 0
            ? `${activeFilterCount} filter aktiva · ${filteredTransactions.length} träffar`
            : `${filteredTransactions.length} transaktioner`
        }
        footer={
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="ui-btn-secondary flex-1 py-3"
              >
                Nollställ
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="ui-btn-primary flex-[2] py-3"
            >
              Visa {filteredTransactions.length} transaktioner
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* 1. BANKKONTO */}
          {accounts.length > 0 && (
            <div className="space-y-2">
              <span className="px-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                <Bank size={13} />
                <span>Bankkonto</span>
              </span>
              <div className="ui-sheet-group">
                <button
                  type="button"
                  onClick={() => handleSetAccount(null)}
                  className="ui-row-btn"
                >
                  <span
                    className={
                      !activeAccount
                        ? 'font-medium text-[var(--text-primary)]'
                        : 'font-normal text-[var(--text-primary)]'
                    }
                  >
                    Alla anslutna konton
                  </span>
                  {!activeAccount && (
                    <Check size={14} weight="bold" className="text-[var(--text-primary)] shrink-0" />
                  )}
                </button>

                {accounts.map((acc) => {
                  const isSel = activeAccount?.id === acc.id;
                  const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
                  const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';
                  const accTxCount = sortedTransactions.filter((t) =>
                    doesTransactionMatchAccount(t, acc)
                  ).length;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => handleSetAccount(isSel ? null : acc.id)}
                      className="ui-row-btn"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <ItemLogo
                          name={acc.bankName || acc.name}
                          category="Bank"
                          logoUrl={acc.logo}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1 text-left">
                          <span
                            className={`block truncate ${
                              isSel
                                ? 'font-medium text-[var(--text-primary)]'
                                : 'font-normal text-[var(--text-primary)]'
                            }`}
                          >
                            {acc.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-secondary)] block truncate tabular-nums">
                            {acc.bankName}
                            {last4 ? ` · •••• ${last4}` : ''} · {accTxCount} händelser
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display font-medium text-xs text-[var(--text-secondary)] tabular-nums">
                          {formatKr(acc.balance)}
                        </span>
                        {isSel && (
                          <Check
                            size={14}
                            weight="bold"
                            className="text-[var(--text-primary)] shrink-0"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. TIDSPERIOD */}
          <div className="space-y-2">
            <span className="px-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <CalendarBlank size={13} />
              <span>Tidsperiod</span>
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'all' as DateRangeFilter, label: 'Alla datum' },
                {
                  id: 'period' as DateRangeFilter,
                  label: 'Denna löneperiod',
                },
                { id: 'last30' as DateRangeFilter, label: 'Senaste 30 dagarna' },
                { id: 'thisMonth' as DateRangeFilter, label: 'Denna kalendermånad' },
              ].map((opt) => {
                const isSel = dateRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDateRange(opt.id)}
                    className={`px-3 py-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                      isSel
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-medium'
                        : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] font-normal'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSel && <Check size={12} weight="bold" className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. KATEGORIER */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                Kategorier
              </span>
              {selectedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Rensa
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categoryOptions.map(({ name: catName, count }) => {
                const isSel = selectedCategories.includes(catName);
                const catColor = resolveCategoryColor(catName);
                return (
                  <button
                    key={catName}
                    type="button"
                    onClick={() => toggleCategory(catName)}
                    className={`px-2.5 py-2 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSel
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-medium'
                        : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] font-normal'
                    }`}
                  >
                    <CategoryIcon
                      category={catName}
                      size={13}
                      color={isSel ? 'currentColor' : catColor}
                    />
                    <span>{catName}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10.5px] tabular-nums ${
                          isSel ? 'opacity-80' : 'text-[var(--text-muted)]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. EGENSKAPER & MARKERINGAR */}
          <div className="space-y-2">
            <span className="px-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkle size={13} />
              <span>Markeringar & typ</span>
            </span>
            <div className="ui-sheet-group">
              {[
                {
                  id: 'saved' as SpecialAttributeFilter,
                  label: 'Sparade köp',
                  icon: Heart,
                  iconColor: 'text-rose-500',
                  count: savedCount,
                },
                {
                  id: 'packages' as SpecialAttributeFilter,
                  label: 'Väntar på paket',
                  icon: Package,
                  iconColor: 'text-amber-500',
                  count: packagesCount,
                },
                {
                  id: 'receipts' as SpecialAttributeFilter,
                  label: 'Har bifogat kvitto',
                  icon: Paperclip,
                  iconColor: 'text-[var(--text-secondary)]',
                  count: receiptsCount,
                },
                {
                  id: 'recurring' as SpecialAttributeFilter,
                  label: 'Fasta utgifter & abonnemang',
                  icon: ArrowsClockwise,
                  iconColor: 'text-[var(--text-secondary)]',
                  count: recurringCount,
                },
                {
                  id: 'large' as SpecialAttributeFilter,
                  label: 'Stora belopp (> 500 kr)',
                  icon: Receipt,
                  iconColor: 'text-[var(--text-secondary)]',
                  count: largeCount,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSel = selectedAttributes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleAttribute(opt.id)}
                    className="ui-row-btn"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        size={15}
                        weight={opt.id === 'saved' || opt.id === 'packages' ? 'fill' : 'regular'}
                        className={opt.iconColor}
                      />
                      <span
                        className={
                          isSel
                            ? 'font-medium text-[var(--text-primary)]'
                            : 'font-normal text-[var(--text-primary)]'
                        }
                      >
                        {opt.label}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-[var(--text-secondary)] tabular-nums shrink-0">
                      <span>{opt.count}</span>
                      {isSel && (
                        <Check
                          size={14}
                          weight="bold"
                          className="text-[var(--text-primary)]"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. BETALSÄTT */}
          <div className="space-y-2">
            <span className="px-1 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
              <Wallet size={13} />
              <span>Betalsätt</span>
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod(null)}
                className={`px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                  !selectedPaymentMethod
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-medium'
                    : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] font-normal'
                }`}
              >
                Alla
              </button>
              {paymentMethodOptions.map((pm) => {
                const isSel = selectedPaymentMethod === pm;
                return (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setSelectedPaymentMethod(isSel ? null : pm)}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSel
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-medium'
                        : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] font-normal'
                    }`}
                  >
                    {pm}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* ============================================================== */}
      {/* TRANSAKTIONSLISTA (GRUPPERAD PER DATUM)                        */}
      {/* ============================================================== */}
      {groupedByDate.length > 0 ? (
        <div className="space-y-4">
          {groupedByDate.map((group) => (
            <div key={group.dateKey}>
              {/* Datumrubrik och dagssummering utanför listkortet */}
              <div className="ui-date-header">
                <span className="font-medium text-[var(--text-secondary)]">
                  {group.label}
                </span>
                <span
                  className={`font-display font-medium tabular-nums ${
                    group.net > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {group.net > 0
                    ? `+${formatKr(group.net)}`
                    : group.net < 0
                    ? `-${formatKr(Math.abs(group.net))}`
                    : formatKr(0)}
                </span>
              </div>

              <section className="ui-list-card">
                {group.items.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const recurringStatus = checkIsRecurringTransaction(
                    tx,
                    fixedExpenses,
                    incomes
                  );
                  const isSplit =
                    tx.originalAmount !== undefined && tx.originalAmount > tx.amount;

                  return (
                    <SwipeableTxRow
                      key={tx.id}
                      isHearted={tx.isHearted}
                      isWaitingForPackage={tx.isWaitingForPackage}
                      isExcluded={tx.isExcluded}
                      onToggleHeart={
                        onToggleHeart ? () => onToggleHeart(tx.id, !tx.isHearted) : undefined
                      }
                      onTogglePackage={
                        onTogglePackage
                          ? () => onTogglePackage(tx.id, !tx.isWaitingForPackage)
                          : undefined
                      }
                      onToggleExclude={
                        onExcludeTransaction
                          ? () => onExcludeTransaction(tx.id, !tx.isExcluded)
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        onClick={() => onSelectTransaction(tx)}
                        className="ui-tx-row bg-[var(--surface-color)]"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo
                            name={tx.title}
                            category={tx.category}
                            logoUrl={tx.logo}
                            size="md"
                            isRecurring={recurringStatus.isRecurring}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">
                              {tx.title}
                            </span>
                            <span className="ui-row-subtitle">
                              <CategoryIcon
                                category={tx.category}
                                size={11}
                                className="shrink-0"
                              />
                              <span className="truncate">{tx.category}</span>
                              {isSplit && tx.originalAmount && (
                                <span className="text-[11px] opacity-80 shrink-0">
                                  · av {formatKr(tx.originalAmount)}
                                </span>
                              )}
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
                              {tx.receiptUrl && (
                                <Paperclip
                                  size={11}
                                  weight="bold"
                                  className="text-[var(--text-secondary)] shrink-0 ml-0.5"
                                />
                              )}
                              {isSplit && (
                                <Users
                                  size={11}
                                  weight="fill"
                                  className="text-emerald-500 shrink-0 ml-0.5"
                                  title="Delad utgift"
                                />
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={isIncome ? 'ui-row-amount-income' : 'ui-row-amount'}
                          >
                            {isIncome ? `+${formatKr(tx.amount)}` : `-${formatKr(tx.amount)}`}
                          </span>
                          {(() => {
                            const isPending =
                              tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD';
                            const statusSub = isPending
                              ? 'Reserverat'
                              : getTransactionTime(tx);
                            return statusSub ? (
                              <span className="ui-row-meta">
                                {statusSub}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </button>
                    </SwipeableTxRow>
                  );
                })}
              </section>
            </div>
          ))}
        </div>
      ) : (
        <section className="ui-empty-state-page animate-fade-in">
          <Receipt size={48} weight="light" className="ui-empty-icon" />
          <p className="ui-empty-title">
            Inga transaktioner hittades
          </p>
        </section>
      )}
    </div>
  );
};


