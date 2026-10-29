import React, { useState } from 'react';
import { PiggyBank, Plus, Trash, Check } from '@phosphor-icons/react';
import { BottomSheet } from './ui/BottomSheet';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { getSavingsGoals, saveSavingsGoals, SavingsGoalItem } from '../utils/appCache';

interface SavingsGoalsViewProps {
  onGoalsChanged?: (goals: SavingsGoalItem[]) => void;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({ onGoalsChanged }) => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalItem[]>(() => getSavingsGoals());
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalCurrentInput, setGoalCurrentInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  const updateGoals = (next: SavingsGoalItem[]) => {
    setSavingsGoals(next);
    saveSavingsGoals(next);
    if (onGoalsChanged) onGoalsChanged(next);
  };

  const totalSaved = savingsGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

  return (
    <div className="ui-page animate-fade-in">
      {savingsGoals.length > 0 && (
        <section className="ui-card-p">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="ui-stat-label">Totalt sparat i mål</span>
              <span className="font-display font-semibold text-2xl text-[var(--text-primary)] tabular-nums block mt-0.5">
                {formatKr(totalSaved)}
              </span>
            </div>
            {totalTarget > 0 && (
              <div className="text-right">
                <span className="ui-stat-label">Totala mål</span>
                <span className="font-display font-semibold text-sm text-[var(--text-secondary)] tabular-nums block mt-0.5">
                  {formatKr(totalTarget)}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">Sparmål & buffert</h2>
          <button
            type="button"
            onClick={() => {
              setEditingGoalId(null);
              setGoalNameInput('');
              setGoalTargetInput('');
              setGoalCurrentInput('');
              setIsGoalModalOpen(true);
            }}
            className="ui-section-action"
          >
            <Plus size={13} weight="bold" />
            <span>Lägg till</span>
          </button>
        </div>

        <div className="ui-list-card">
          {savingsGoals.length > 0 ? (
            savingsGoals.map((goal) => {
              const pct =
                goal.targetAmount > 0
                  ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
                  : 0;
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => {
                    setEditingGoalId(goal.id);
                    setGoalNameInput(goal.name);
                    setGoalTargetInput(String(goal.targetAmount));
                    setGoalCurrentInput(String(goal.currentAmount));
                    setIsGoalModalOpen(true);
                  }}
                  className="w-full py-3.5 space-y-2.5 text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer block"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title block">{goal.name}</span>
                      <span className="text-[11.5px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                        {formatKr(goal.currentAmount)} av {formatKr(goal.targetAmount)}
                      </span>
                    </div>

                    <span className="font-display font-semibold text-xs text-[var(--text-secondary)] tabular-nums shrink-0">
                      {pct} %
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-[var(--bg-color)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-10 text-center">
              <PiggyBank size={38} weight="light" className="ui-empty-icon mb-2" />
              <p className="ui-empty-title">Inga sparmål ännu</p>
              <p className="ui-empty-sub mb-5">
                Lägg till ett sparmål eller en buffert för att följa din utveckling.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingGoalId(null);
                  setGoalNameInput('');
                  setGoalTargetInput('');
                  setGoalCurrentInput('');
                  setIsGoalModalOpen(true);
                }}
                className="ui-btn-primary max-w-xs mx-auto"
              >
                <Plus size={14} weight="bold" />
                <span>Skapa sparmål</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <BottomSheet
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        title={editingGoalId ? 'Redigera sparmål' : 'Nytt sparmål'}
      >
        <div className="space-y-4">
          {!editingGoalId && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Buffert', target: 30000 },
                { label: 'Semester', target: 15000 },
                { label: 'Kontantinsats', target: 150000 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setGoalNameInput(preset.label);
                    setGoalTargetInput(String(preset.target));
                  }}
                  className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    goalNameInput === preset.label
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                      : 'bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                  }`}
                >
                  <span className="font-display font-semibold text-xs block">
                    {preset.label}
                  </span>
                  <span
                    className={`text-[10.5px] tabular-nums block mt-0.5 ${
                      goalNameInput === preset.label ? 'opacity-80' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {formatKr(preset.target)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Stort och tydligt inmatningskort för Namn + Målbelopp */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
            <label className="flex items-center gap-3.5 cursor-text">
              <div className="w-11 h-11 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-emerald-500 shrink-0">
                <PiggyBank size={22} weight="duotone" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                  Namn på mål
                </span>
                <input
                  type="text"
                  autoFocus={!editingGoalId}
                  value={goalNameInput}
                  onChange={(e) => setGoalNameInput(e.target.value)}
                  placeholder="t.ex. Buffert eller Resa"
                  className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                />
              </div>
            </label>

            <div className="border-t border-[var(--border-subtle)] pt-3.5">
              <label className="block cursor-text">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                  Målbelopp
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={goalTargetInput}
                    onChange={(e) => setGoalTargetInput(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="30000"
                    className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
                  />
                  <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                    kr
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Sparat hittills + snabbval */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3">
            <label className="block cursor-text">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                Sparat hittills
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={goalCurrentInput}
                  onChange={(e) => setGoalCurrentInput(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="0"
                  className="w-full bg-transparent border-0 p-0 font-display font-bold text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400 placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
                />
                <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                  kr
                </span>
              </div>
            </label>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {[500, 1000, 2500].map((addAmt) => (
                <button
                  key={addAmt}
                  type="button"
                  onClick={() => {
                    const curr = Math.max(0, Math.round(Number(goalCurrentInput) || 0));
                    setGoalCurrentInput(String(curr + addAmt));
                  }}
                  className="py-2 px-2.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-display font-semibold text-[var(--text-primary)] tabular-nums transition-colors cursor-pointer"
                >
                  +{new Intl.NumberFormat('sv-SE').format(addAmt)} kr
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
              onClick={() => {
                const cleanName = goalNameInput.trim();
                const cleanTarget = Math.max(1, Math.round(Number(goalTargetInput) || 0));
                const cleanCurr = Math.max(0, Math.round(Number(goalCurrentInput) || 0));
                if (!cleanName || cleanTarget <= 0) return;

                const next = editingGoalId
                  ? savingsGoals.map((g) =>
                      g.id === editingGoalId
                        ? {
                            ...g,
                            name: cleanName,
                            targetAmount: cleanTarget,
                            currentAmount: cleanCurr,
                          }
                        : g
                    )
                  : [
                      ...savingsGoals,
                      {
                        id: `goal-${Date.now()}`,
                        name: cleanName,
                        targetAmount: cleanTarget,
                        currentAmount: cleanCurr,
                      },
                    ];
                updateGoals(next);
                setIsGoalModalOpen(false);
              }}
              className="ui-btn-primary"
            >
              <Check size={14} weight="bold" />
              <span>Spara mål</span>
            </button>

            {editingGoalId && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="ui-btn-danger"
              >
                <Trash size={14} />
                <span>Ta bort sparmål</span>
              </button>
            )}
          </div>

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Ta bort sparmål?"
            description={`${goalNameInput || 'Sparmålet'} tas bort.`}
            confirmLabel="Ta bort"
            onConfirm={() => {
              const next = savingsGoals.filter((g) => g.id !== editingGoalId);
              updateGoals(next);
              setShowDeleteConfirm(false);
              setIsGoalModalOpen(false);
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </div>
      </BottomSheet>
    </div>
  );
};
