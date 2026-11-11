import type { SettlementSummary } from '../../utils/householdSync';
import type { SetStateAction } from 'react';
import React from 'react';
import { CaretRight, Check, Users } from '@phosphor-icons/react';
import { PeriodInfo } from '../../utils/periodEngine';
import { setShowBudgetBreakdownOnHome } from '../../utils/appCache';
import type { AccountItem } from '../../app/models';

export interface HomeHeroCardProps {
  householdBudgetStats: { householdName: string; myName: string; partnerName: string; jointIncome: number; jointFixed: number; jointVariable: number; jointKvar: number; settlement: SettlementSummary; };
  heroBudgetMode: "personal" | "joint";
  kvarAttSpendera: number;
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableSpent: number;
  onOpenBalance: () => void;
  accounts: AccountItem[];
  period: PeriodInfo;
  handleSetHeroBudgetMode: (mode: "personal" | "joint") => void;
  onNavigateToHousehold: () => void;
  formatKr: (amount: number) => string;
  showBudgetBreakdown: boolean;
  setShowBudgetBreakdown: (value: SetStateAction<boolean>) => void;
  isInitialLoading: boolean;
  setActiveHeroPopup: (value: SetStateAction<"income" | "fixed" | "variable">) => void;
}

export const HomeHeroCard: React.FC<HomeHeroCardProps> = ({
  householdBudgetStats,
  heroBudgetMode,
  kvarAttSpendera,
  totalIncome,
  totalFixedExpenses,
  totalVariableSpent,
  onOpenBalance,
  accounts,
  period,
  handleSetHeroBudgetMode,
  onNavigateToHousehold,
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
        const isJointMode = Boolean(householdBudgetStats && heroBudgetMode === 'joint');
        const activeKvar = isJointMode ? householdBudgetStats!.jointKvar : kvarAttSpendera;
        const activeIncome = isJointMode ? householdBudgetStats!.jointIncome : totalIncome;
        const activeFixed = isJointMode ? householdBudgetStats!.jointFixed : totalFixedExpenses;
        const activeVariable = isJointMode
          ? householdBudgetStats!.jointVariable
          : totalVariableSpent;
        const isOverBudget = activeKvar < 0;
        // Saldot stäms av genom att trycka på hemkortet (bara utan bank och inte i hushållsläge)
        const canAdjustBalance = Boolean(onOpenBalance) && accounts.length === 0 && !isJointMode;

        // Takt i löneperioden: stapeln = andel av pengarna som är använda,
        // strecket = var idag ligger i perioden.
        const timeShare = Math.min(
          1,
          Math.max(0, period.daysElapsed / Math.max(1, period.daysTotal))
        );
        const spendable = Math.max(0, activeKvar + activeVariable);
        const spent = Math.max(0, activeVariable);
        // Batteri: andel av periodens pengar som finns kvar (full på lönedagen, tom vid nästa lön)
        const remainingShare = spendable > 0 ? Math.max(0, Math.min(1, activeKvar / spendable)) : 0;
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
            {householdBudgetStats && (
              <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[var(--border-subtle)]">
                <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => handleSetHeroBudgetMode('personal')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                      heroBudgetMode === 'personal'
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Mitt eget
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetHeroBudgetMode('joint')}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      heroBudgetMode === 'joint'
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-2xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Users size={12} weight="bold" />
                    <span>Gemensamt</span>
                  </button>
                </div>

                {onNavigateToHousehold && (
                  <button
                    type="button"
                    onClick={onNavigateToHousehold}
                    className="text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer hover:opacity-80"
                  >
                    {householdBudgetStats.settlement.isSettledForCurrentPeriod ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <Check size={11} weight="bold" />
                        <span>Utjämnat</span>
                      </span>
                    ) : householdBudgetStats.settlement.netBalance > 5 ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {householdBudgetStats.partnerName} är skyldig {formatKr(householdBudgetStats.settlement.netBalance)}
                      </span>
                    ) : householdBudgetStats.settlement.netBalance < -5 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        Du ska swisha {formatKr(Math.abs(householdBudgetStats.settlement.netBalance))}
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                        Delad ekonomi
                      </span>
                    )}
                    <CaretRight size={10} weight="bold" className="text-[var(--text-muted)]" />
                  </button>
                )}
              </div>
            )}

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
                {isJointMode ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="flex -space-x-1 shrink-0">
                      <span className="w-4 h-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center font-display font-semibold text-[8px] uppercase">
                        {householdBudgetStats!.myName.slice(0, 1)}
                      </span>
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-[var(--surface-color)] flex items-center justify-center font-display font-semibold text-[8px] uppercase">
                        {householdBudgetStats!.partnerName.slice(0, 1)}
                      </span>
                    </span>
                    <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                      Hushållet · {householdBudgetStats!.myName} & {householdBudgetStats!.partnerName}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-[13px] font-normal ${
                      isOverBudget
                        ? 'text-rose-600 dark:text-rose-400 font-medium'
                        : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {isOverBudget ? 'Över budget' : 'Kvar att spendera'}
                  </span>
                )}
                <span className="text-[13px] font-normal text-[var(--text-secondary)] tabular-nums text-right shrink-0">
                  {daysLabel}
                </span>
              </div>

              <div className="mt-0.5">
                {isInitialLoading && accounts.length === 0 ? (
                  <div className="h-11 w-44 rounded-2xl bg-[var(--surface-raised)] animate-pulse mt-1.5" />
                ) : (
                  <div className="min-w-0">
                    <div
                      className={`font-display text-[44px] sm:text-[48px] font-[600] tracking-[-0.035em] leading-none tabular-nums mt-1.5 ${
                        activeKvar >= 0
                          ? 'text-[var(--text-primary)]'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {formatKr(activeKvar)}
                    </div>
                    {/* Beloppet i bildform: fylld del = det som är kvar. Färgen visar takten. */}
                    <div
                      className="mt-4 h-2 rounded-full bg-[var(--bg-color)] overflow-hidden"
                      role="meter"
                      aria-label="Kvar av löneperiodens pengar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(remainingShare * 100)}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pace === "fast" ? "bg-amber-400" : "bg-[var(--text-primary)]"
                        }`}
                        style={{ width: `${remainingShare * 100}%` }}
                      />
                    </div>
                    {isJointMode && (
                      <div className="text-[12px] text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                        <span>
                          Din andel ({Math.round(householdBudgetStats!.settlement.myShareRatio * 100)} %):
                        </span>
                        <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                          {formatKr(Math.round(activeKvar * householdBudgetStats!.settlement.myShareRatio))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Text bara när något behöver uppmärksamhet */}
              {pace !== 'good' && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[12px] tabular-nums">
                  <span
                    aria-hidden="true"
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      pace === 'over' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {pace === 'over' ? (
                      <>Pengarna är slut för den här perioden</>
                    ) : (
                      <>
                        <span className="font-medium text-amber-700 dark:text-amber-400">Lite för snabbt</span>
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
                <div className="ui-stat-grid pt-4 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() =>
                      isJointMode && onNavigateToHousehold
                        ? onNavigateToHousehold()
                        : setActiveHeroPopup('income')
                    }
                    className="pr-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>{isJointMode ? 'Gemensam inkomst' : 'Inkomst'}</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
                    ) : (
                      <span className="ui-stat-value text-emerald-600 dark:text-emerald-400">
                        +{formatKr(activeIncome)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isJointMode && onNavigateToHousehold
                        ? onNavigateToHousehold()
                        : setActiveHeroPopup('fixed')
                    }
                    className="px-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>{isJointMode ? 'Gemensamma fasta' : 'Fasta'}</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        −{formatKr(activeFixed)}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      isJointMode && onNavigateToHousehold
                        ? onNavigateToHousehold()
                        : setActiveHeroPopup('variable')
                    }
                    className="pl-3 text-left min-w-0 cursor-pointer group/stat hover:opacity-85 active:scale-[0.98] transition-all focus:outline-none"
                  >
                    <span className="ui-stat-label inline-flex items-center gap-1">
                      <span>{isJointMode ? 'Gemensamt rörligt' : 'Rörligt'}</span>
                    </span>
                    {isInitialLoading && accounts.length === 0 ? (
                      <div className="h-4 w-12 rounded bg-[var(--surface-raised)] animate-pulse mt-1" />
                    ) : (
                      <span className="ui-stat-value text-[var(--text-primary)]">
                        −{formatKr(activeVariable)}
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
