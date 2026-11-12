import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowRight, Check, SpinnerGap } from '@phosphor-icons/react';
import { ItemLogo } from '../ItemLogo';

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
          <h1 className="ui-step-title text-balance">
            Vilka fasta utgifter har du?
          </h1>
          <p className="ui-onb-subtitle">
            Räkningar som dras varje månad. Tryck och skriv beloppet.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
          {analyzingBank && (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] shadow-[var(--card-shadow)] flex items-center gap-2.5 text-footnote text-[var(--text-secondary)] animate-pulse">
              <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
              <span>Letar efter dina räkningar …</span>
            </div>
          )}

          <div className={suggestedFixedExpenses.length > 0 ? 'ui-list-card ui-list-card-check' : ''}>
            {suggestedFixedExpenses.map((item) => (
              <div
                key={item.id}
                className={`min-h-[64px] py-2.5 transition-opacity flex items-center gap-2.5 ${
                  item.checked ? '' : 'opacity-55'
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
                    className={`ui-checkbox ${item.checked ? 'ui-checkbox-on' : 'ui-checkbox-off'}`}
                  >
                    {item.checked && <Check size={13} weight="bold" />}
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
                    {/* Namnet får två rader i stället för att klippas ("iCloud 200 GB Lagring") */}
                    <span className="ui-row-title whitespace-normal line-clamp-2">
                      {item.name}
                    </span>
                    <span className="ui-row-subtitle flex items-center gap-1.5">
                      <span className="truncate">
                        {`${item.category || 'Räkningar'} · den ${item.dueDay}:e`}
                      </span>
                    </span>
                  </div>

                  <span className="ui-row-amount shrink-0">
                    −{formatKr(item.amount)}
                  </span>
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
            <div className="flex items-center justify-between px-1 text-footnote text-[var(--text-secondary)]">
              <span>
                {(() => {
                  const n = suggestedFixedExpenses.filter((f) => f.checked).length;
                  return n === 1 ? '1 vald fast utgift' : `${n} valda fasta utgifter`;
                })()}
              </span>
              <span className="font-display font-semibold text-[var(--text-primary)] tabular-nums">
                −{formatKr(
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
            className="ui-btn-primary"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      </div>
    )}
  </>
);
