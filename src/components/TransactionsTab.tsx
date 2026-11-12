import React, { useState } from 'react';
import { TransactionItem, AccountItem, FixedExpenseItem, IncomeItem } from '../app/models';
import { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';
import { useTransactionFilters } from './transactions/useTransactionFilters';
import { TransactionsSearchBar } from './transactions/TransactionsSearchBar';
import { TransactionsFilterSheet } from './transactions/TransactionsFilterSheet';
import { TransactionsGroupedList } from './transactions/TransactionsGroupedList';

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
  weekendHandling?: WeekendHandlingMode;
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filters = useTransactionFilters({
    transactions,
    accounts,
    selectedAccountId,
    onSelectAccount,
    fixedExpenses,
    incomes,
    period,
  });

  // Historik för ett konto utan andra filter: tom lista = kontot har inga händelser (inte "inga träffar")
  const isAccountOnly =
    Boolean(filters.activeAccount) &&
    filters.activeFilterCount === 1 &&
    filters.typeTab === 'all' &&
    !filters.searchQuery.trim();

  return (
    <div className="ui-page">
      {/* Sökfält, Filterknapp (Bottom Sheet) & Segmented Control */}
      <TransactionsSearchBar
        filters={filters}
        accounts={accounts}
        onOpenFilter={() => setIsFilterOpen(true)}
        onAddTransaction={onAddTransaction}
      />

      {/* Filter Bottom Sheet */}
      <TransactionsFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        accounts={accounts}
      />

      {/* Transaktionslista (grupperad per datum) */}
      <TransactionsGroupedList
        groupedByDate={filters.groupedByDate}
        fixedExpenses={fixedExpenses}
        incomes={incomes}
        onSelectTransaction={onSelectTransaction}
        onToggleHeart={onToggleHeart}
        onTogglePackage={onTogglePackage}
        onExcludeTransaction={onExcludeTransaction}
        searchQuery={filters.searchQuery}
        isFiltered={!isAccountOnly && (filters.activeFilterCount > 0 || filters.typeTab !== 'all')}
        emptyTitle={isAccountOnly ? 'Inga händelser på kontot än' : undefined}
        onClearFilters={
          filters.activeFilterCount > 0
            ? () => {
                filters.resetAllFilters();
                filters.setTypeTab('all');
              }
            : undefined
        }
      />
    </div>
  );
};
