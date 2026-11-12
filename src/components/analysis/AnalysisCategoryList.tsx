// Kategorilistan i Analys-fliken: en rad per kategori som fälls ut och visar periodens poster
import React from 'react';
import { CaretRight, CaretDown, Heart, Package, Paperclip } from '@phosphor-icons/react';
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../app/models';
import { getTransactionTime } from '../../app/models';
import { CategoryIcon } from '../CategoryIcon';
import { ItemLogo } from '../ItemLogo';
import { checkIsRecurringTransaction } from '../../utils/recurring';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import type { CategoryBreakdownEntry } from '../../utils/categoryBreakdown';
import { formatKr } from './formatKr';

// Läsvy över en rad i kategorilistan (köp, fast utgift eller inkomst)
type SubItemView = Partial<TransactionItem> & Partial<FixedExpenseItem> & Partial<IncomeItem>;

interface EntryHandlers {
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  onSelectTransaction?: (tx: TransactionItem) => void;
  onSelectFixed?: (exp: FixedExpenseItem) => void;
  onSelectIncome?: (inc: IncomeItem) => void;
}

interface AnalysisCategoryListProps extends EntryHandlers {
  categoryBreakdown: CategoryBreakdownEntry[];
  inspectedCategory: string | null;
  setInspectedCategory: (key: string | null) => void;
  setSelectedSliceCategory: (category: string | null) => void;
}

interface CategoryEntryRowProps extends EntryHandlers {
  entry: CategoryBreakdownEntry['items'][number];
  category: string;
}

/** En post (köp, fast utgift eller inkomst) inuti en utfälld kategori */
const CategoryEntryRow: React.FC<CategoryEntryRowProps> = ({
  entry,
  category,
  fixedExpenses,
  incomes,
  onSelectTransaction,
  onSelectFixed,
  onSelectIncome,
}) => {
  // Raden är ett köp, en fast utgift eller en inkomst
  const subItem: SubItemView = entry;
  const subTx = 'date' in entry ? entry : null;
  const subIncome = 'payday' in entry ? entry : null;
  const subFixed = 'dueDay' in entry ? entry : null;
  const isIncome = subItem.type === 'income';
  const itemName = subItem.title || subItem.name || '';
  const isSubRecurring = Boolean(
    subItem.dueDay ||
      subItem.payday ||
      (subItem.date &&
        checkIsRecurringTransaction(subItem, fixedExpenses, incomes)
          .isRecurring)
  );
  const hasSubReceipts = Boolean(
    (Array.isArray(subItem.receipts) && subItem.receipts.length > 0) ||
      subItem.receiptUrl
  );

  return (
    <button
      type="button"
      onClick={() => {
        if (subTx?.date && onSelectTransaction) {
          onSelectTransaction(subTx);
        } else if (subIncome?.payday && onSelectIncome) {
          // Öppna den sparade inkomsten – raden här visar periodens belopp, som inte får sparas som budget
          onSelectIncome(incomes.find((i) => i.id === subIncome.id) ?? subIncome);
        } else if (subFixed?.dueDay && onSelectFixed) {
          // Öppna den sparade fasta utgiften, inte periodens kopia med månadens faktiska dragning
          onSelectFixed(fixedExpenses.find((f) => f.id === subFixed.id) ?? subFixed);
        }
      }}
      className="w-full pl-7 sm:pl-9 pr-4 sm:pr-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <ItemLogo
          name={itemName}
          category={subItem.category || category}
          logoUrl={subItem.logo}
          size="sm"
          isRecurring={isSubRecurring}
        />
        <div className="min-w-0 flex-1">
          <span className="ui-row-title text-footnote sm:text-callout">
            {itemName}
          </span>
          <span className="ui-row-subtitle flex items-center gap-1.5">
            <span className="truncate">
              {subItem.date
                ? formatSwedishDateHeading(subItem.date)
                : subItem.payday
                ? `Den ${subItem.payday}:e`
                : subItem.dueDay
                ? `Den ${subItem.dueDay}:e`
                : ''}
            </span>
            {subItem.isHearted && (
              <Heart
                size={11}
                weight="fill"
                className="text-negative-solid shrink-0"
              />
            )}
            {subItem.isWaitingForPackage && (
              <Package
                size={11}
                weight="fill"
                className="text-caution-solid shrink-0"
              />
            )}
            {hasSubReceipts && (
              <Paperclip
                size={11}
                weight="bold"
                className="text-[var(--text-secondary)] shrink-0"
              />
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <span
            className={
              isIncome
                ? 'ui-row-amount-income text-callout'
                : 'ui-row-amount text-callout'
            }
          >
            {isIncome
              ? `+${formatKr(entry.amount)}`
              : `−${formatKr(entry.amount)}`}
          </span>
          {subTx?.date && (
            <span className="ui-row-meta">
              {subTx.bookingStatus === 'PDNG' ||
              subTx.bookingStatus === 'HOLD'
                ? 'Reserverat'
                : getTransactionTime({
                    id: subTx.id,
                    title: subTx.title,
                    category,
                    date: subTx.date,
                    time: subTx.time,
                    note: subTx.note,
                    amount: subTx.amount,
                    bookingStatus: subTx.bookingStatus,
                  })}
            </span>
          )}
        </div>
        <CaretRight
          size={12}
          weight="bold"
          className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors"
        />
      </div>
    </button>
  );
};

/** Kategorier (Inline Dropdown / Accordion utan nästlade kort) */
export const AnalysisCategoryList: React.FC<AnalysisCategoryListProps> = ({
  categoryBreakdown,
  inspectedCategory,
  setInspectedCategory,
  setSelectedSliceCategory,
  ...entryHandlers
}) => (
  <section className="ui-list-card px-0">
    {categoryBreakdown.length > 0 ? (
      <div className="divide-y divide-[var(--border-subtle)]">
        {categoryBreakdown.map((item) => {
          const isExpanded = inspectedCategory === item.key;

          return (
            <div key={item.key} className="transition-colors">
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => {
                  const nextKey = isExpanded ? null : item.key;
                  setInspectedCategory(nextKey);
                  if (!item.isIncomeCategory) {
                    setSelectedSliceCategory(isExpanded ? null : item.category);
                  }
                }}
                className={`w-full px-4 sm:px-5 py-3.5 flex flex-col gap-2 text-left hover:bg-[var(--surface-hover)] active:scale-[0.99] transition-all cursor-pointer group ${
                  isExpanded ? 'bg-[var(--bg-color)]/45' : ''
                }`}
              >
                <div className="w-full flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-[var(--icon-tile-bg)] flex items-center justify-center shrink-0">
                      <CategoryIcon category={item.category} size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {item.label}
                      </span>
                      <span className="ui-row-subtitle tabular-nums">
                        {item.items.length}{' '}
                        {item.isIncomeCategory
                          ? item.items.length === 1
                            ? 'inbetalning'
                            : 'inbetalningar'
                          : item.items.length === 1
                          ? 'post'
                          : 'poster'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span
                        className={`font-display font-semibold text-subhead sm:text-subhead tabular-nums block ${
                          item.isIncomeCategory
                            ? 'text-positive'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {item.isIncomeCategory
                          ? `+${formatKr(item.amount)}`
                          : item.amount > 0
                          ? `−${formatKr(item.amount)}`
                          : formatKr(0)}
                      </span>
                    </div>
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-[var(--text-primary)]' : ''
                      }`}
                    />
                  </div>
                </div>
              </button>

              {/* Smooth Inline Dropdown Panel (Indented child rows with subtle background contrast) */}
              <div
                className={`grid transition-all duration-200 ease-out ${
                  isExpanded
                    ? 'grid-rows-[1fr] opacity-100 border-t border-[var(--border-subtle)] bg-[var(--bg-color)]/65 dark:bg-[var(--bg-color)]/40'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  {isExpanded && (
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {item.items.map((entry) => (
                        <CategoryEntryRow
                          key={entry.id}
                          entry={entry}
                          category={item.category}
                          {...entryHandlers}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="py-10 text-center border-t border-[var(--border-subtle)]">
        <p className="ui-empty-sub">
          Inga poster i perioden
        </p>
      </div>
    )}
  </section>
);
