import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowRight, Check, SpinnerGap } from '@phosphor-icons/react';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';

export interface OnboardingStepFixedListProps {
  step: 2 | 1 | 3 | 4 | 5 | 6 | 7;
  fixedSummaryMode: boolean;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  analyzingBank: boolean;
  suggestedFixedExpenses: { id: string; name: string; amount: number; dueDay: number; category: string; paymentMethod?: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; isShared?: boolean; fullAmount?: number; }[];
  setSuggestedFixedExpenses: (value: SetStateAction<{ id: string; name: string; amount: number; dueDay: number; category: string; paymentMethod?: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; isShared?: boolean; fullAmount?: number; }[]>) => void;
  openEditSuggestedFixed: (item: { id: string; name: string; amount: number; dueDay: number; category: string; paymentMethod?: string; logo?: string; isShared?: boolean; fullAmount?: number; }) => void;
  formatKr: (val: number) => string;
  renderQuickChips: (type: "fixed" | "income") => React.ReactElement;
  handleSaveSuggestedFixed: () => void;
}

export const OnboardingStepFixedList: React.FC<OnboardingStepFixedListProps> = ({
  step,
  fixedSummaryMode,
  pageAnimClass,
  analyzingBank,
  suggestedFixedExpenses,
  setSuggestedFixedExpenses,
  openEditSuggestedFixed,
  formatKr,
  renderQuickChips,
  handleSaveSuggestedFixed,
}) => (
  <>
    {step === 3 && !fixedSummaryMode && (
      <div
        key="step-3"
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        <div className="shrink-0 pt-6 pb-4">
          <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
            Vilka fasta utgifter har du?
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Räkningar som dras varje månad. Tryck och skriv beloppet.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
          {analyzingBank && (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-pulse">
              <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
              <span>Letar efter dina räkningar …</span>
            </div>
          )}

          <div className="space-y-2">
            {suggestedFixedExpenses.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                  item.checked
                    ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                    : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                }`}
              >
                {/* Checkbox med generös träffyta */}
                <button
                  type="button"
                  onClick={() =>
                    setSuggestedFixedExpenses((prev) =>
                      prev.map((p) => (p.id === item.id ? { ...p, checked: !p.checked } : p))
                    )
                  }
                  aria-label={`Välj ${item.name}`}
                  className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      item.checked
                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                    }`}
                  >
                    {item.checked && <Check size={12} weight="bold" />}
                  </span>
                </button>

                {/* Rad: tryck för att ändra belopp, namn, kategori eller dag direkt */}
                <button
                  type="button"
                  onClick={() => openEditSuggestedFixed(item)}
                  className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                >
                  <ItemLogo
                    name={item.name}
                    category={item.category}
                    logoUrl={item.logo}
                    size="md"
                    isRecurring={false}
                  />

                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title">
                      {item.name}
                    </span>
                    <span className="ui-row-subtitle flex items-center gap-1.5">
                      <CategoryIcon
                        category={item.category || 'Räkningar'}
                        size={11}
                        className="shrink-0 text-[var(--text-secondary)]"
                      />
                      <span className="truncate">
                        {item.category || 'Räkningar'}
                      </span>
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="ui-row-amount">
                      −{formatKr(item.amount)}
                    </span>
                    <span className="ui-row-meta">
                      {`Den ${item.dueDay}:e`}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className={suggestedFixedExpenses.length > 0 ? 'pt-3' : ''}>
            {renderQuickChips('fixed')}
          </div>
        </div>

        <div className="shrink-0 pt-3 space-y-2">
          {suggestedFixedExpenses.some((f) => f.checked) && (
            <div className="flex items-center justify-between px-1 text-xs text-[var(--text-secondary)]">
              <span>
                {suggestedFixedExpenses.filter((f) => f.checked).length} valda fasta utgifter
              </span>
              <span className="font-display font-semibold text-[var(--text-primary)] tabular-nums">
                -
                {formatKr(
                  suggestedFixedExpenses
                    .filter((f) => f.checked)
                    .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
                )}
                /mån
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveSuggestedFixed}
            className="w-full py-3.5 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    )}
  </>
);
