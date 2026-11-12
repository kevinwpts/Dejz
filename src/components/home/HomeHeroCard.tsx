import type { SetStateAction } from 'react';
import React from 'react';
import { PeriodInfo } from '../../utils/periodEngine';
import { setShowBudgetBreakdownOnHome } from '../../utils/cache/categories';
import type { AccountItem } from '../../app/models';

export interface HomeHeroCardProps {
  kvarAttSpendera: number;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  onOpenBalance?: () => void;
  accounts: AccountItem[];
  period: PeriodInfo;
  formatKr: (amount: number) => string;
  showBudgetBreakdown: boolean;
  setShowBudgetBreakdown: (value: SetStateAction<boolean>) => void;
  isInitialLoading: boolean;
  setActiveHeroPopup: (value: SetStateAction<"income" | "fixed" | "variable" | null>) => void;
}

/** "+24 800 kr" / "−11 414 kr" – men "0 kr" utan tecken när beloppet är noll */
const signed = (sign: '+' | '−', amount: number, formatKr: (n: number) => string) =>
  Math.round(amount) === 0 ? formatKr(0) : `${sign}${formatKr(amount)}`;

export const HomeHeroCard: React.FC<HomeHeroCardProps> = ({
  kvarAttSpendera,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
  onOpenBalance,
  accounts,
  period,
  formatKr,
  showBudgetBreakdown,
  setShowBudgetBreakdown,
  isInitialLoading,
  setActiveHeroPopup,
}) => (
    <>
      {/* ============================================================== */}
      {/* MODUL 1: KVAR ATT SPENDERA (Hero Bento Card)                   */}
      {/* ============================================================== */}
      {(() => {
        const isOverBudget = kvarAttSpendera < 0;
        // Saldot stäms av genom att trycka på hemkortet (bara utan bank)
        const canAdjustBalance = Boolean(onOpenBalance) && accounts.length === 0;

        // Takt i löneperioden: stapeln = andel av pengarna som är använda,
        // strecket = var idag ligger i perioden.
        const timeShare = Math.min(
          1,
          Math.max(0, period.daysElapsed / Math.max(1, period.daysTotal))
        );
        const spendable = Math.max(0, kvarAttSpendera + totalVariableSpent);
        const spent = Math.max(0, totalVariableSpent);
        // Batteri: andel av periodens pengar som finns kvar (full på lönedagen, tom vid nästa lön)
        const remainingShare = spendable > 0 ? Math.max(0, Math.min(1, kvarAttSpendera / spendable)) : 0;
        const paceDiff = Math.round(spendable * timeShare - spent); // + = under planen
        const tolerance = Math.max(100, spendable * 0.03);
        const pace: 'over' | 'fast' | 'good' = isOverBudget
          ? 'over'
          : paceDiff < -tolerance
          ? 'fast'
          : 'good';
        const daysLabel =
          period.daysRemaining === 0
            ? 'Lön idag'
            : period.daysRemaining === 1
            ? '1 dag till lön'
            : `${period.daysRemaining} dagar till lön`;

        return (
          <section className={`ui-card-p dejz-hero ${isOverBudget ? 'dejz-hero--over' : ''}`}>
            <button
              type="button"
              onClick={() => {
                // Utan bank: tryck på beloppet för att stämma av saldot (gör "kvar" exakt)
                if (canAdjustBalance) {
                  onOpenBalance?.();
                  return;
                }
                const next = !showBudgetBreakdown;
                setShowBudgetBreakdown(next);
                setShowBudgetBreakdownOnHome(next);
              }}
              className="w-full text-left cursor-pointer group focus:outline-none"
              aria-expanded={canAdjustBalance ? undefined : showBudgetBreakdown}
              aria-label={canAdjustBalance ? 'Stäm av saldo' : undefined}
              title={
                canAdjustBalance
                  ? 'Stäm av saldo'
                  : showBudgetBreakdown
                  ? 'Dölj budgetdetaljer'
                  : 'Visa budgetdetaljer'
              }
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`text-callout font-medium ${
                    isOverBudget ? 'text-negative' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {isOverBudget ? 'Över budget' : 'Kvar att spendera'}
                </span>
                <span className="h-6 px-2.5 rounded-full bg-[var(--surface-raised)] inline-flex items-center text-footnote font-medium text-[var(--text-primary)] tabular-nums shrink-0">
                  {daysLabel}
                </span>
              </div>

              <div className="mt-0.5">
                {isInitialLoading && accounts.length === 0 ? (
                  // Samma höjd som beloppet + stapeln, så att kortet inte hoppar när siffrorna laddats
                  <div aria-hidden="true">
                    <div className="h-[46px] w-44 rounded-xl bg-[var(--surface-raised)] animate-pulse mt-2" />
                    <div className="dejz-hero-track mt-5 h-1.5 rounded-full" />
                  </div>
                ) : (
                  <div className="min-w-0">
                    <div
                      className={`font-display text-[46px] sm:text-[50px] font-bold tracking-[-0.045em] leading-none tabular-nums mt-2 ${
                        kvarAttSpendera >= 0
                          ? 'text-[var(--text-primary)]'
                          : 'text-negative'
                      }`}
                    >
                      {formatKr(kvarAttSpendera)}
                    </div>
                    {/* Beloppet i bildform: fylld del = det som är kvar. Färgen visar takten. */}
                    <div
                      className="dejz-hero-track mt-5 h-1.5 rounded-full overflow-hidden"
                      role="meter"
                      aria-label="Kvar av löneperiodens pengar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(remainingShare * 100)}
                    >
                      <div
                        className={`h-full rounded-full transition-[width] duration-500 ${
                          pace === "fast" ? "bg-caution-solid" : "bg-[var(--text-primary)]"
                        }`}
                        style={{ width: `${remainingShare * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Text bara när något behöver uppmärksamhet */}
              {pace !== 'good' && (
                <div className="mt-2.5 flex items-center gap-1.5 text-meta tabular-nums">
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      pace === 'over' ? 'bg-negative-solid' : 'bg-caution-solid'
                    }`}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {pace === 'over' ? (
                      <>Pengarna är slut för den här perioden</>
                    ) : (
                      <>
                        <span className="font-medium text-caution">Lite för snabbt</span>
                        {' – '}
                        {formatKr(Math.abs(paceDiff))} över planen
                      </>
                    )}
                  </span>
                </div>
              )}
            </button>

            {/* Mjukt utfällbar 3-kolumns översikt (Inkomst · Fasta · Rörligt) */}
            <div
              className={`grid transition-all duration-200 ease-out ${
                showBudgetBreakdown
                  ? 'grid-rows-[1fr] opacity-100 mt-5'
                  : 'grid-rows-[0fr] opacity-0 mt-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="ui-stat-grid pt-4 border-t border-[var(--separator)]">
                  <button
                    type="button"
                    onClick={() => setActiveHeroPopup('income')}
                    className="pr-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>Inkomst</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-5 w-16 rounded-md bg-[var(--surface-raised)] animate-pulse mt-0.5" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        {signed('+', totalIncome, formatKr)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHeroPopup('fixed')}
                    className="px-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>Fasta</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-5 w-16 rounded-md bg-[var(--surface-raised)] animate-pulse mt-0.5" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        {signed('−', totalFixedExpenses, formatKr)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveHeroPopup('variable')}
                    className="pl-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>Rörligt</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-5 w-16 rounded-md bg-[var(--surface-raised)] animate-pulse mt-0.5" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        {signed('−', totalVariableSpent, formatKr)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>
        );
      })()}
    </>
);
