// Bottenarket "Filtrera transaktioner": bankkonto, tidsperiod, kategorier, markeringar och betalsätt.
import React from 'react';
import {
  Receipt,
  Package,
  Heart,
  Paperclip,
  Check,
  ArrowsClockwise,
  Bank,
  CalendarBlank,
  Sparkle,
} from '@phosphor-icons/react';
import type { AccountItem } from '../../app/models';
import { doesTransactionMatchAccount } from '../../app/models';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon, PaymentMethodIcon, resolveCategoryColor } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import {
  DateRangeFilter,
  SpecialAttributeFilter,
  formatKr,
  getAccountLast4,
} from './transactionFilters';
import type { TransactionFiltersState } from './useTransactionFilters';

interface TransactionsFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: TransactionFiltersState;
  accounts: AccountItem[];
}

const DATE_RANGE_OPTIONS: { id: DateRangeFilter; label: string }[] = [
  { id: 'all', label: 'Alla datum' },
  { id: 'period', label: 'Denna löneperiod' },
  { id: 'last30', label: 'Senaste 30 dagarna' },
  { id: 'thisMonth', label: 'Denna kalendermånad' },
];

const ATTRIBUTE_OPTIONS: {
  id: SpecialAttributeFilter;
  label: string;
  icon: typeof Heart;
  iconColor: string;
}[] = [
  { id: 'saved', label: 'Sparade köp', icon: Heart, iconColor: 'text-negative-solid' },
  { id: 'packages', label: 'Väntar på paket', icon: Package, iconColor: 'text-caution-solid' },
  {
    id: 'receipts',
    label: 'Har bifogat kvitto',
    icon: Paperclip,
    iconColor: 'text-[var(--text-secondary)]',
  },
  {
    id: 'recurring',
    label: 'Fasta utgifter & abonnemang',
    icon: ArrowsClockwise,
    iconColor: 'text-[var(--text-secondary)]',
  },
  {
    id: 'large',
    label: 'Stora belopp (> 500 kr)',
    icon: Receipt,
    iconColor: 'text-[var(--text-secondary)]',
  },
];

export const TransactionsFilterSheet: React.FC<TransactionsFilterSheetProps> = ({
  isOpen,
  onClose,
  filters,
  accounts,
}) => {
  const {
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
    attributeCounts,
    toggleCategory,
    toggleAttribute,
    activeFilterCount,
    resetAllFilters,
  } = filters;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
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
            onClick={onClose}
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
                const last4 = getAccountLast4(acc);
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
                        <span className="text-caption text-[var(--text-secondary)] block truncate tabular-nums">
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
            {DATE_RANGE_OPTIONS.map((opt) => {
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
                className="text-caption font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
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
                      className={`text-caption tabular-nums ${
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
            {ATTRIBUTE_OPTIONS.map((opt) => {
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
                    <span>{attributeCounts[opt.id]}</span>
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
                  className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSel
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-medium'
                      : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] font-normal'
                  }`}
                >
                  <PaymentMethodIcon method={pm} size={14} />
                  <span>{pm}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
