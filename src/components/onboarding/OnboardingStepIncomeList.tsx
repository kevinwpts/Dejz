import type { SetStateAction } from 'react';
import React from 'react';
import { ArrowRight, Check, SpinnerGap } from '@phosphor-icons/react';
import { ItemLogo } from '../ItemLogo';

export interface OnboardingStepIncomeListProps {
  step: 2 | 1 | 3 | 4 | 5 | 6 | 7;
  incomeSummaryMode: boolean;
  pageAnimClass: "animate-page-forward" | "animate-page-back";
  analyzingBank: boolean;
  suggestedIncomes: { id: string; name: string; amount: number; payday: number; category: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; }[];
  setSuggestedIncomes: (value: SetStateAction<{ id: string; name: string; amount: number; payday: number; category: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; }[]>) => void;
  openEditSuggestedIncome: (item: { id: string; name: string; amount: number; payday: number; category: string; logo?: string; }) => void;
  formatKr: (val: number) => string;
  renderQuickChips: (type: "fixed" | "income") => React.ReactElement;
  handleSaveSuggestedIncomes: () => void;
}

export const OnboardingStepIncomeList: React.FC<OnboardingStepIncomeListProps> = ({
  step,
  incomeSummaryMode,
  pageAnimClass,
  analyzingBank,
  suggestedIncomes,
  setSuggestedIncomes,
  openEditSuggestedIncome,
  formatKr,
  renderQuickChips,
  handleSaveSuggestedIncomes,
}) => (
  <>
    {step === 4 && !incomeSummaryMode && (
      <div
        key="step-4"
        className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
      >
        <div className="shrink-0 pt-6 pb-4">
          <h1 className="ui-step-title text-balance">
            Vilka fasta inkomster har du?
          </h1>
          <p className="ui-onb-subtitle">
            Det du får in varje månad, efter skatt. Tryck och skriv beloppet.
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
          {analyzingBank && (
            <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] shadow-[var(--card-shadow)] flex items-center gap-2.5 text-footnote text-[var(--text-secondary)] animate-pulse">
              <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
              <span>Analyserar dina inkomster...</span>
            </div>
          )}

          <div className={suggestedIncomes.length > 0 ? 'ui-list-card ui-list-card-check' : ''}>
            {suggestedIncomes.map((item) => (
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
                    setSuggestedIncomes((prev) =>
                      prev.map((p) => (p.id === item.id ? { ...p, checked: !p.checked } : p))
                    )
                  }
                  aria-label={`Välj ${item.name}`}
                  className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <span
                    className={`ui-checkbox ${item.checked ? 'ui-checkbox-on' : 'ui-checkbox-off'}`}
                  >
                    {item.checked && <Check size={14} />}
                  </span>
                </button>

                {/* Rad: tryck för att ändra belopp, namn, kategori eller dag direkt */}
                <button
                  type="button"
                  onClick={() => openEditSuggestedIncome(item)}
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
                    <span className="ui-row-title whitespace-normal line-clamp-2">
                      {item.name}
                    </span>
                    <span className="ui-row-subtitle flex items-center gap-1.5">
                      <span className="truncate">
                        {`${item.category || 'Lön'} · den ${item.payday}:e`}
                      </span>
                    </span>
                  </div>

                  <span className="ui-row-amount ui-row-amount-income shrink-0">
                    +{formatKr(item.amount)}
                  </span>
                </button>
              </div>
            ))}
          </div>

          <div className={suggestedIncomes.length > 0 ? 'pt-3' : ''}>
            {renderQuickChips('income')}
          </div>
        </div>

        <div className="shrink-0 pt-3 space-y-2">
          {suggestedIncomes.some((i) => i.checked) && (
            <div className="flex items-center justify-between px-1 text-footnote text-[var(--text-secondary)]">
              <span>
                {(() => {
                  const n = suggestedIncomes.filter((i) => i.checked).length;
                  return n === 1 ? '1 vald inkomst' : `${n} valda inkomster`;
                })()}
              </span>
              <span className="font-display font-semibold text-positive tabular-nums">
                +
                {formatKr(
                  suggestedIncomes
                    .filter((i) => i.checked)
                    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                )}
                /mån
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveSuggestedIncomes}
            className="ui-btn-primary"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )}
  </>
);
