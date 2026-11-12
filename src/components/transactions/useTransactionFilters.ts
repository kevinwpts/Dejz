// Hook som håller sök- och filterläget för transaktionslistan och räknar fram filtrerade/grupperade transaktioner.
import { useMemo, useState } from 'react';
import { type AccountItem, type FixedExpenseItem, type IncomeItem, type TransactionItem, compareTransactionsChronologically } from '../../app/models';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { getSwedishDateStr, getItemReceipts } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring/checkRecurring';
import { PeriodInfo } from '../../utils/periodEngine';
import {
  DateRangeFilter,
  SpecialAttributeFilter,
  TxTypeTab,
  buildCategoryOptions,
  buildPaymentMethodOptions,
  getThirtyDaysAgoStr,
  groupTransactionsByDate,
  matchesTransactionFilters,
} from './transactionFilters';

interface UseTransactionFiltersArgs {
  transactions: TransactionItem[];
  accounts: AccountItem[];
  selectedAccountId: string | null;
  onSelectAccount?: (accountId: string | null) => void;
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  period?: PeriodInfo;
}

export function useTransactionFilters({
  transactions,
  accounts,
  selectedAccountId,
  onSelectAccount,
  fixedExpenses,
  incomes,
  period,
}: UseTransactionFiltersArgs) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeTab, setTypeTab] = useState<TxTypeTab>('all');
  const [localAccountId, setLocalAccountId] = useState<string | null>(selectedAccountId);
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<SpecialAttributeFilter[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const effectiveAccountId =
    onSelectAccount !== undefined ? selectedAccountId : localAccountId;

  const handleSetAccount = (accId: string | null) => {
    if (onSelectAccount) {
      onSelectAccount(accId);
    } else {
      setLocalAccountId(accId);
    }
  };

  const todayStr = useMemo(() => getSwedishDateStr(), []);
  const thirtyDaysAgoStr = useMemo(() => getThirtyDaysAgoStr(todayStr), [todayStr]);
  const thisMonthPrefix = useMemo(() => todayStr.slice(0, 7), [todayStr]);

  // Sortera alla transaktioner strikt efter köpdatum och faktisk kronologisk ordning under dagen
  const sortedTransactions = useMemo(() => {
    const deduped = deduplicateTransactions(transactions);
    return deduped.sort(compareTransactionsChronologically);
  }, [transactions]);

  const activeAccount = useMemo(
    () =>
      effectiveAccountId
        ? accounts.find((a) => a.id === effectiveAccountId) || null
        : null,
    [accounts, effectiveAccountId]
  );

  // Kategorier med antal transaktioner
  const categoryOptions = useMemo(
    () => buildCategoryOptions(sortedTransactions),
    [sortedTransactions]
  );

  const paymentMethodOptions = useMemo(
    () => buildPaymentMethodOptions(sortedTransactions),
    [sortedTransactions]
  );

  // Sök- och kombinerad filtrering
  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((tx) =>
      matchesTransactionFilters(tx, {
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
      })
    );
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
    () => sortedTransactions.filter((tx) => getItemReceipts(tx).length > 0).length,
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
  const groupedByDate = useMemo(
    () => groupTransactionsByDate(filteredTransactions),
    [filteredTransactions]
  );

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

  return {
    searchQuery,
    setSearchQuery,
    typeTab,
    setTypeTab,
    dateRange,
    setDateRange,
    selectedCategories,
    setSelectedCategories,
    selectedAttributes,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    activeAccount,
    handleSetAccount,
    sortedTransactions,
    categoryOptions,
    paymentMethodOptions,
    filteredTransactions,
    groupedByDate,
    attributeCounts: {
      saved: savedCount,
      packages: packagesCount,
      receipts: receiptsCount,
      recurring: recurringCount,
      large: largeCount,
    } satisfies Record<SpecialAttributeFilter, number>,
    toggleCategory,
    toggleAttribute,
    activeFilterCount,
    resetAllFilters,
  };
}

export type TransactionFiltersState = ReturnType<typeof useTransactionFilters>;
