// Sökfält, filterknapp, Alla/Utgifter/Inkomster-reglage, aktiva filterbrickor och live-summering överst i transaktionslistan.
import React from 'react';
import { MagnifyingGlass, X, Plus, SlidersHorizontal } from '@phosphor-icons/react';
import type { AccountItem } from '../../app/models';
import { CategoryIcon } from '../CategoryIcon';
import {
  TYPE_TABS,
  formatAccountShortLabel,
  getAttributeChipLabel,
  getDateRangeChipLabel,
  sumNet,
} from './transactionFilters';
import type { TransactionFiltersState } from './useTransactionFilters';

interface TransactionsSearchBarProps {
  filters: TransactionFiltersState;
  accounts: AccountItem[];
  onOpenFilter: () => void;
  onAddTransaction?: () => void;
}

export const TransactionsSearchBar: React.FC<TransactionsSearchBarProps> = ({
  filters,
  accounts,
  onOpenFilter,
  onAddTransaction,
}) => {
  const {
    searchQuery,
    setSearchQuery,
    typeTab,
    setTypeTab,
    dateRange,
    setDateRange,
    selectedCategories,
    selectedAttributes,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    activeAccount,
    handleSetAccount,
    filteredTransactions,
    toggleCategory,
    toggleAttribute,
    activeFilterCount,
    resetAllFilters,
  } = filters;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="ui-search-box flex-1 min-w-0">
          <MagnifyingGlass size={18} className="text-[var(--text-muted)] shrink-0" />
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
          onClick={onOpenFilter}
          title="Filtrera transaktioner"
          aria-label={`Filtrera transaktioner${
            activeFilterCount > 0 ? ` (${activeFilterCount} aktiva)` : ''
          }`}
          className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all active:scale-[0.96] cursor-pointer shrink-0 ${
            activeFilterCount > 0
              ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
              : 'bg-[var(--surface-color)] shadow-[var(--card-shadow)] text-[var(--text-primary)]'
          }`}
        >
          <SlidersHorizontal size={18} weight={activeFilterCount > 0 ? 'bold' : 'regular'} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-micro font-bold flex items-center justify-center ring-2 ring-[var(--bg-color)] pointer-events-none tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </button>

        {onAddTransaction && (
          <button
            type="button"
            onClick={onAddTransaction}
            title="Lägg till händelse"
            className="h-11 px-3.5 rounded-xl bg-[var(--surface-color)] shadow-[var(--card-shadow)] text-callout font-semibold text-[var(--text-primary)] flex items-center gap-1.5 active:scale-[0.96] transition-all cursor-pointer shrink-0"
          >
            <Plus size={15} weight="bold" />
            <span>Lägg till</span>
          </button>
        )}
      </div>

      {/* Segmented Filter Control (Alla / Utgifter / Inkomster) */}
      <div className="ui-segmented-surface grid-cols-3">
        {TYPE_TABS.map((tab) => {
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

      {/* Aktiva filter-brickor */}
      {(dateRange !== 'all' ||
        selectedCategories.length > 0 ||
        selectedAttributes.length > 0 ||
        selectedPaymentMethod ||
        Boolean(activeAccount)) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {activeAccount && (
            <button
              type="button"
              onClick={() => handleSetAccount(null)}
              className="ui-chip-sm"
            >
              <span>{formatAccountShortLabel(activeAccount, accounts)}</span>
              <X size={11} weight="bold" className="text-[var(--text-muted)]" />
            </button>
          )}

          {dateRange !== 'all' && (
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className="ui-chip-sm"
            >
              <span>{getDateRangeChipLabel(dateRange)}</span>
              <X size={11} weight="bold" className="text-[var(--text-muted)]" />
            </button>
          )}

          {selectedCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className="ui-chip-sm"
            >
              <CategoryIcon category={cat} size={11} />
              <span>{cat}</span>
              <X size={11} weight="bold" className="text-[var(--text-muted)]" />
            </button>
          ))}

          {selectedAttributes.map((attr) => (
            <button
              key={attr}
              type="button"
              onClick={() => toggleAttribute(attr)}
              className="ui-chip-sm"
            >
              <span>{getAttributeChipLabel(attr)}</span>
              <X size={11} weight="bold" className="text-[var(--text-muted)]" />
            </button>
          ))}

          {selectedPaymentMethod && (
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod(null)}
              className="ui-chip-sm"
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

      {/* Live-summering vid aktiv sökning eller filtrering */}
      {(searchQuery.trim().length > 0 ||
        activeFilterCount > 0 ||
        typeTab !== 'all' ||
        Boolean(activeAccount)) && (
        <div className="rounded-xl bg-[var(--surface-color)] shadow-[var(--card-shadow)] px-3.5 py-2 flex items-center justify-between gap-2 text-xs tabular-nums">
          <span className="text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">
              {filteredTransactions.length}
            </span>{' '}
            {filteredTransactions.length === 1 ? 'händelse' : 'händelser'}
          </span>
          {(() => {
            const netSum = sumNet(filteredTransactions);
            const absStr =
              new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(netSum))) + ' kr';
            return (
              <span
                className={`font-display font-semibold ${
                  netSum > 0
                    ? 'text-positive'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                Totalt {netSum > 0 ? `+${absStr}` : netSum < 0 ? `−${absStr}` : '0 kr'}
              </span>
            );
          })()}
        </div>
      )}
    </div>
  );
};
