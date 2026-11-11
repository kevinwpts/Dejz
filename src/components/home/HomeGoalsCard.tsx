import type { SavingsGoalItem } from '../../utils/appCache';
import type { SetStateAction } from 'react';
import React from 'react';
import { CaretDown, CaretRight } from '@phosphor-icons/react';
import {
  getGoalArtworkTheme,
  GoalArtworkIllustration,
  TiltedGoalsPromoArtwork,
} from '../ui/VisualArtwork';

export interface HomeGoalsCardProps {
  onNavigateToGoals: () => void;
  showGoals: boolean;
  setShowGoals: (value: SetStateAction<boolean>) => void;
  formatKr: (amount: number) => string;
  totalSavedInGoals: number;
  savingsGoals: SavingsGoalItem[];
  resolveHomeGoalAmount: (g: SavingsGoalItem) => number;
}

export const HomeGoalsCard: React.FC<HomeGoalsCardProps> = ({
  onNavigateToGoals,
  showGoals,
  setShowGoals,
  formatKr,
  totalSavedInGoals,
  savingsGoals,
  resolveHomeGoalAmount,
}) => (
    <>
      {/* ============================================================== */}
      {/* MODUL 2.5: SPARMÅL · BUFFERT & DRÖMMAR                         */}
      {/* ============================================================== */}
      {onNavigateToGoals && (
        <section className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 sm:px-5 sm:py-4">
          <button
            type="button"
            onClick={() => {
              const next = !showGoals;
              setShowGoals(next);
              try {
                localStorage.setItem('dejz_show_goals_home', String(next));
              } catch {
                // ignore
              }
            }}
            className="w-full flex items-center justify-between gap-3 text-left cursor-pointer group focus:outline-none"
            aria-expanded={showGoals}
            title={showGoals ? 'Dölj sparmål' : 'Visa sparmål'}
          >
            <div className="min-w-0">
              <span className="text-[12px] text-[var(--text-secondary)] font-normal block">
                Sparmål
              </span>
              <div className="font-display text-[20px] sm:text-[20px] font-semibold tracking-[-0.015em] leading-tight text-[var(--text-primary)] tabular-nums mt-0.5">
                {formatKr(totalSavedInGoals)}
              </div>
            </div>

            <span className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:bg-[var(--bg-color)] transition-all shrink-0">
              <CaretDown
                size={14}
                weight="regular"
                className={`transition-transform duration-200 ${
                  showGoals ? 'rotate-180' : ''
                }`}
              />
            </span>
          </button>

          <div
            className={`grid transition-all duration-200 ease-out ${
              showGoals ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'
            }`}
          >
            <div className="overflow-hidden">
              <div className="pt-2.5 border-t border-[var(--border-subtle)]">
                {savingsGoals.length > 0 ? (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {savingsGoals.map((goal) => {
                      const effectiveGoalAmt = resolveHomeGoalAmount(goal);
                      const pct =
                        goal.targetAmount > 0
                          ? Math.min(100, Math.round((effectiveGoalAmt / goal.targetAmount) * 100))
                          : 0;
                      const theme = getGoalArtworkTheme(goal.artworkId);

                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={onNavigateToGoals}
                          className="w-full py-2.5 first:pt-1 last:pb-0.5 flex items-center gap-3 text-left hover:bg-[var(--surface-hover)] rounded-xl px-1 -mx-1 transition-colors cursor-pointer group"
                        >
                          <div
                            className="w-9 h-9 rounded-full overflow-hidden relative shrink-0 border border-black/5 dark:border-white/10"
                            style={{
                              backgroundColor: goal.customImageUrl ? undefined : theme.tileBg,
                            }}
                          >
                            {goal.customImageUrl ? (
                              <img
                                src={goal.customImageUrl}
                                alt={goal.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute -right-2 top-0.5 w-9 h-9">
                                <GoalArtworkIllustration artworkId={goal.artworkId} />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="font-normal text-[13px] sm:text-[14px] tracking-[-0.005em] leading-snug text-[var(--text-primary)] truncate">
                                {goal.name}
                              </span>
                              <span className="font-display font-semibold text-[14px] tracking-[-0.01em] text-[var(--text-primary)] tabular-nums shrink-0">
                                {formatKr(effectiveGoalAmt)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2.5">
                              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-color)] overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${pct}%`,
                                    backgroundColor: theme.progressColor,
                                  }}
                                />
                              </div>
                              <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-nums shrink-0">
                                {pct} %
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateToGoals}
                    className="w-full pt-1 flex items-center justify-between gap-3 text-left hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-normal text-[13px] sm:text-[14px] text-[var(--text-primary)] leading-snug block">
                        Spara till en resa, buffert eller dröm
                      </span>
                      <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                        <span>Skapa ditt första sparmål</span>
                        <CaretRight size={11} />
                      </span>
                    </div>
                    <TiltedGoalsPromoArtwork />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
);
