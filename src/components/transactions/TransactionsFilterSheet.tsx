// Bottenarket "Filtrera transaktioner": bankkonto, tidsperiod, kategorier, markeringar och betalsätt.
import React from 'react';
import {
  Receipt,
  Package,
  Heart,
  Paperclip,
  Check,
  ArrowsClockwise,
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
}[] = [
  { id: 'saved', label: 'Sparade köp', icon: Heart },
  { id: 'packages', label: 'Väntar på paket', icon: Package },
  { id: 'receipts', label: 'Har kvitto', icon: Paperclip },
  { id: 'recurring', label: 'Fasta utgifter och abonnemang', icon: ArrowsClockwise },
  { id: 'large', label: 'Över 500 kr', icon: Receipt },
];

/** Ett utseende för alla val-brickor i arket. Valt läge är neutralt (mörk/ljus bricka), inte lila. */
const chipClass = (isSel: boolean) =>
  `h-9 px-3 rounded-full text-footnote flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.97] ${
    isSel
      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-medium'
      : 'bg-[var(--fill-grouped)] text-[var(--text-primary)] font-normal'
  }`;

const SECTION_LABEL = 'px-1 text-footnote font-medium text-[var(--text-secondary)]';

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
      title="Filtrera"
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
            <span className={SECTION_LABEL}>Konto</span>
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
                  <Check size={16} weight="bold" className="text-[var(--text-primary)] shrink-0" />
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
                        <span className="text-footnote text-[var(--text-secondary)] block truncate tabular-nums">
                          {acc.bankName}
                          {last4 ? ` · •••• ${last4}` : ''} · {accTxCount} händelser
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-display font-medium text-footnote text-[var(--text-secondary)] tabular-nums">
                        {formatKr(acc.balance)}
                      </span>
                      {isSel && (
                        <Check
                          size={16}
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
          <span className={SECTION_LABEL}>Tidsperiod</span>
          <div className="grid grid-cols-2 gap-2">
            {DATE_RANGE_OPTIONS.map((opt) => {
              const isSel = dateRange === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateRange(opt.id)}
                  className={`h-11 px-3.5 rounded-xl text-footnote text-left transition-all cursor-pointer active:scale-[0.98] flex items-center justify-between gap-1.5 ${
                    isSel
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-medium'
                      : 'bg-[var(--fill-grouped)] text-[var(--text-primary)] font-normal'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSel && <Check size={14} weight="bold" className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. KATEGORIER */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-footnote font-medium text-[var(--text-secondary)]">Kategorier</span>
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategories([])}
                className="text-footnote font-semibold text-[var(--on-accent-container)] hover:opacity-75 cursor-pointer"
              >
                Rensa
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryOptions.map(({ name: catName, count }) => {
              const isSel = selectedCategories.includes(catName);
              // Kategorier utan en enda händelse ger bara en tom lista – visa dem inte
              if (count === 0 && !isSel) return null;
              const catColor = resolveCategoryColor(catName);
              return (
                <button
                  key={catName}
                  type="button"
                  onClick={() => toggleCategory(catName)}
                  className={chipClass(isSel)}
                >
                  <CategoryIcon
                    category={catName}
                    size={14}
                    color={isSel ? 'currentColor' : catColor}
                  />
                  <span>{catName}</span>
                  {count > 0 && (
                    <span
                      className={`text-footnote tabular-nums ${
                        isSel ? 'opacity-70' : 'text-[var(--text-muted)]'
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
          <span className={SECTION_LABEL}>Visa bara</span>
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
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className="text-[var(--text-secondary)] shrink-0" />
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
                  <span className="flex items-center gap-2 text-footnote text-[var(--text-secondary)] tabular-nums shrink-0">
                    <span>{attributeCounts[opt.id]}</span>
                    {isSel && (
                      <Check
                        size={16}
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
          <span className={SECTION_LABEL}>Betalsätt</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedPaymentMethod(null)}
              className={chipClass(!selectedPaymentMethod)}
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
                  className={chipClass(isSel)}
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
