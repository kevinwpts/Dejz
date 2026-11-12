// Sökfält, filterknapp, Alla/Utgifter/Inkomster-reglage, aktiva filterbrickor och live-summering överst i transaktionslistan.
import React from 'react';
import { MagnifyingGlass, X, SlidersHorizontal } from '@phosphor-icons/react';
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
}

export const TransactionsSearchBar: React.FC<TransactionsSearchBarProps> = ({
  filters,
  accounts,
  onOpenFilter,
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
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={16} />
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
          className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all active:scale-[0.96] cursor-pointer shrink-0 bg-[var(--surface-color)] shadow-[var(--card-shadow)] ${
            activeFilterCount > 0 ? 'text-[var(--on-accent-container)]' : 'text-[var(--text-primary)]'
          }`}
        >
          <SlidersHorizontal size={20} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] text-caption font-bold flex items-center justify-center ring-2 ring-[var(--bg-color)] pointer-events-none tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </button>

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
              className="ui-chip-sm h-8 px-3 text-footnote"
            >
              <span>{formatAccountShortLabel(activeAccount, accounts)}</span>
              <X size={12} className="text-[var(--text-muted)]" />
            </button>
          )}

          {dateRange !== 'all' && (
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className="ui-chip-sm h-8 px-3 text-footnote"
            >
              <span>{getDateRangeChipLabel(dateRange)}</span>
              <X size={12} className="text-[var(--text-muted)]" />
            </button>
          )}

          {selectedCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className="ui-chip-sm h-8 px-3 text-footnote"
            >
              <CategoryIcon category={cat} size={13} />
              <span>{cat}</span>
              <X size={12} className="text-[var(--text-muted)]" />
            </button>
          ))}

          {selectedAttributes.map((attr) => (
            <button
              key={attr}
              type="button"
              onClick={() => toggleAttribute(attr)}
              className="ui-chip-sm h-8 px-3 text-footnote"
            >
              <span>{getAttributeChipLabel(attr)}</span>
              <X size={12} className="text-[var(--text-muted)]" />
            </button>
          ))}

          {selectedPaymentMethod && (
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod(null)}
              className="ui-chip-sm h-8 px-3 text-footnote"
            >
              <span>{selectedPaymentMethod}</span>
              <X size={12} className="text-[var(--text-muted)]" />
            </button>
          )}

          {activeFilterCount > 1 && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-2 text-footnote font-semibold text-[var(--on-accent-container)] hover:opacity-75 cursor-pointer"
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
        // Summering som vanlig text (inte ett eget kort) – döljs när inget hittas, då talar tomläget
        filteredTransactions.length > 0 && (
        <div className="px-1 pt-1 flex items-center justify-between gap-2 text-footnote tabular-nums">
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
        )
      )}
    </div>
  );
};
