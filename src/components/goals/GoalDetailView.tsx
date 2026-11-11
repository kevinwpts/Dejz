import type { MutableRefObject, SetStateAction } from 'react';
import { formatInputThousands, cleanActivityLabel } from './goalHelpers';
import React from 'react';
import {
  Plus,
  Minus,
  CaretRight,
  Trash,
  Check,
  ImageSquare,
} from '@phosphor-icons/react';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  SavingsGoalItem,
} from '../../utils/appCache';
import {
  GOAL_ARTWORKS,
  getGoalArtworkTheme,
  GoalArtworkIllustration,
} from '../ui/VisualArtwork';
import { formatSwedishDateHeading } from '../../utils/swedishDate';


import { TransactionItem, AccountItem } from '../HomeTab';

export interface GoalDetailViewProps {
  selectedGoal: SavingsGoalItem;
  resolveGoalAmount: (goal: SavingsGoalItem) => number;
  resolveGoalLinkedLabel: (goal: SavingsGoalItem) => string;
  savingsGoals: SavingsGoalItem[];
  updateGoals: (next: SavingsGoalItem[]) => void;
  transferAmountInput: string;
  transferMode: "deposit" | "withdraw";
  userInitials: string;
  userName: string;
  setTransferMode: (value: SetStateAction<"deposit" | "withdraw">) => void;
  setTransferAmountInput: (value: SetStateAction<string>) => void;
  sharedHiddenFileInput: React.ReactNode;
  setIsArtworkPickerOpen: (value: SetStateAction<boolean>) => void;
  formatKr: (amount: number) => string;
  setIsAccountPickerOpen: (value: SetStateAction<boolean>) => void;
  setShowDeleteConfirm: (value: SetStateAction<boolean>) => void;
  showDeleteConfirm: boolean;
  setSelectedGoalId: (nextId: string) => void;
  isAccountPickerOpen: boolean;
  accounts: AccountItem[];
  effectiveTotalBalance: number;
  isArtworkPickerOpen: boolean;
  galleryInputRef: MutableRefObject<HTMLInputElement>;
  transactions: TransactionItem[];
}

export const GoalDetailView: React.FC<GoalDetailViewProps> = ({
  selectedGoal,
  resolveGoalAmount,
  resolveGoalLinkedLabel,
  savingsGoals,
  updateGoals,
  transferAmountInput,
  transferMode,
  userInitials,
  userName,
  setTransferMode,
  setTransferAmountInput,
  sharedHiddenFileInput,
  setIsArtworkPickerOpen,
  formatKr,
  setIsAccountPickerOpen,
  setShowDeleteConfirm,
  showDeleteConfirm,
  setSelectedGoalId,
  isAccountPickerOpen,
  accounts,
  effectiveTotalBalance,
  isArtworkPickerOpen,
  galleryInputRef,
  transactions,
}) => {
  const theme = getGoalArtworkTheme(selectedGoal.artworkId);
  const effectiveSelectedAmount = resolveGoalAmount(selectedGoal);
  const linkedLabel = resolveGoalLinkedLabel(selectedGoal);
  const isLinkedToAccount = Boolean(selectedGoal.linkedAccountId);
  const pct =
    selectedGoal.targetAmount > 0
      ? Math.min(100, Math.round((effectiveSelectedAmount / selectedGoal.targetAmount) * 100))
      : 0;
  const activities =
    selectedGoal.activities && selectedGoal.activities.length > 0
      ? selectedGoal.activities
      : [
          {
            id: 'init',
            text: 'Du har skapat ditt mål',
            date: selectedGoal.createdAt || new Date().toISOString().slice(0, 10),
          },
        ];

  const currentArtLabel = selectedGoal.customImageUrl
    ? 'Egen bild'
    : GOAL_ARTWORKS.find((a) => a.id === selectedGoal.artworkId)?.label || 'Spargris';

  const updateSelectedGoal = (patch: Partial<SavingsGoalItem>) => {
    const next = savingsGoals.map((g) =>
      g.id === selectedGoal.id ? { ...g, ...patch } : g
    );
    updateGoals(next);
  };

  const handleConfirmTransfer = () => {
    const amt = Math.max(0, Math.round(Number(transferAmountInput) || 0));
    if (amt <= 0 || !transferMode) return;
    const todayIso = new Date().toISOString().slice(0, 10);

    const next = savingsGoals.map((g) => {
      if (g.id !== selectedGoal.id) return g;
      const isDeposit = transferMode === 'deposit';
      const nextAmount = isDeposit
        ? g.currentAmount + amt
        : Math.max(0, g.currentAmount - amt);
      const newAct = {
        id: `act-${Date.now()}`,
        text: isDeposit ? 'Insättning' : 'Uttag',
        date: todayIso,
        amount: isDeposit ? amt : -amt,
        authorInitials: userInitials,
        authorName: userName || 'Jag',
      };
      return {
        ...g,
        currentAmount: nextAmount,
        activities: [newAct, ...(g.activities || activities)],
      };
    });

    updateGoals(next);
    setTransferMode(null);
    setTransferAmountInput('');
  };

  return (
    <div className="ui-page animate-fade-in">
      {sharedHiddenFileInput}

      {/* Top Colored Hero Card with Cropped Right Artwork & Inline Editable Name */}
      <section
        className="relative rounded-3xl overflow-hidden p-5 sm:p-6 min-h-[210px] flex flex-col justify-between text-white shadow-sm"
        style={{
          background: selectedGoal.customImageUrl
            ? '#111827'
            : theme.heroBg,
        }}
      >
        {selectedGoal.customImageUrl ? (
          <>
            <img
              src={selectedGoal.customImageUrl}
              alt={selectedGoal.name}
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsArtworkPickerOpen(true)}
            title="Byt bild"
            aria-label="Byt bild"
            className="absolute -right-12 top-3 w-52 h-52 sm:w-56 sm:h-56 select-none opacity-95 hover:scale-105 transition-transform cursor-pointer"
          >
            <GoalArtworkIllustration artworkId={selectedGoal.artworkId} />
          </button>
        )}

        {/* Top Bar inside Hero: Quick Image/Theme button */}
        <div className="relative z-10 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setIsArtworkPickerOpen(true)}
            aria-label="Byt bild"
            title="Byt bild"
            className="w-8 h-8 rounded-full bg-black/25 hover:bg-black/35 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <ImageSquare size={15} weight="bold" />
          </button>
        </div>

        {/* Bottom Goal Stats + Progress Bar inside Hero */}
        <div className="relative z-10 mt-10 space-y-3">
          <div className="max-w-[68%]">
            <input
              type="text"
              spellCheck={false}
              autoCorrect="off"
              value={selectedGoal.name}
              onChange={(e) => {
                updateSelectedGoal({ name: e.target.value });
              }}
              placeholder="Sparmålets namn"
              className="w-full bg-transparent border-0 text-sm font-medium text-white/95 placeholder-white/50 focus:outline-none focus:ring-0 transition-colors p-0"
            />
            <span className="font-display font-bold text-3xl sm:text-4xl text-white tabular-nums tracking-tight block mt-0.5">
              {formatKr(effectiveSelectedAmount)}
            </span>
            <span className="text-xs text-white/75 tabular-nums block mt-0.5">
              av {formatKr(selectedGoal.targetAmount)}
              {linkedLabel ? ` · ${linkedLabel}` : ''}
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${pct}%`,
                backgroundColor: theme.progressColor,
              }}
            />
          </div>
        </div>
      </section>

      {/* Manual Deposit / Withdraw Buttons ONLY when goal uses Eget valt belopp */}
      {!isLinkedToAccount && (
        <section className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTransferAmountInput('');
              setTransferMode('deposit');
            }}
            className="py-3 px-4 rounded-2xl bg-[var(--cta-bg)] text-[var(--cta-fg)] font-display font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus size={15} weight="bold" />
            <span>Sätt in</span>
          </button>

          <button
            type="button"
            disabled={selectedGoal.currentAmount <= 0}
            onClick={() => {
              setTransferAmountInput('');
              setTransferMode('withdraw');
            }}
            className="py-3 px-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-display font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Minus size={15} weight="bold" />
            <span>Ta ut</span>
          </button>
        </section>
      )}

      {/* Sammanhållet detaljkort (direktredigering precis som transaktioner/fasta poster) */}
      <div className="ui-sheet-group">
        <label className="ui-row cursor-text">
          <span className="ui-info-label">Målbelopp</span>
          <div className="flex items-baseline justify-end gap-1">
            <input
              type="text"
              inputMode="numeric"
              spellCheck={false}
              value={formatInputThousands(String(selectedGoal.targetAmount || ''))}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^\d]/g, '');
                const num = Number(cleaned);
                if (num >= 0) {
                  updateSelectedGoal({ targetAmount: num });
                }
              }}
              placeholder="10 000"
              className="bg-transparent border-0 focus:outline-none focus:ring-0 text-right font-display font-semibold tabular-nums text-xs sm:text-[13px] text-[var(--text-primary)] max-w-[130px] p-0"
            />
            <span className="text-xs text-[var(--text-secondary)]">kr</span>
          </div>
        </label>

        <button
          type="button"
          onClick={() => setIsAccountPickerOpen(true)}
          className="ui-row-btn"
        >
          <span className="ui-info-label">Hur sparandet följs</span>
          <span className="ui-info-value flex items-center gap-1.5">
            <span>{linkedLabel || 'Eget valt belopp'}</span>
            <CaretRight size={12} className="text-[var(--text-muted)]" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setIsArtworkPickerOpen(true)}
          className="ui-row-btn"
        >
          <span className="ui-info-label">Bild</span>
          <span className="ui-info-value flex items-center gap-1.5">
            <span>{currentArtLabel}</span>
            <CaretRight size={12} className="text-[var(--text-muted)]" />
          </span>
        </button>
      </div>

      {/* Aktivitet */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h2 className="ui-section-title">Aktivitet</h2>
        </div>
        <div className="ui-list-card">
          {activities.map((act) => {
            const hasAmt = act.amount !== undefined;
            const displayLabel = cleanActivityLabel(act.text, hasAmt);
            const canRemove = act.id !== 'init';
            return (
              <div
                key={act.id}
                className="py-3.5 flex items-center justify-between gap-3.5"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-emerald-400/20 text-emerald-600 dark:bg-emerald-400 dark:text-emerald-950 font-display font-bold text-xs flex items-center justify-center shrink-0">
                    {act.authorInitials || userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title block truncate">{displayLabel}</span>
                    <span className="ui-row-subtitle block">
                      {act.authorName ? `${act.authorName} · ` : ''}
                      {formatSwedishDateHeading(act.date)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {hasAmt && act.amount !== undefined && (
                    <span
                      className={`ui-row-amount shrink-0 ${
                        act.amount > 0 ? 'ui-row-amount-income' : ''
                      }`}
                    >
                      {act.amount > 0
                        ? `+${formatKr(act.amount)}`
                        : `−${formatKr(Math.abs(act.amount))}`}
                    </span>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => {
                        const delta = Number(act.amount) || 0;
                        const next = savingsGoals.map((g) => {
                          if (g.id !== selectedGoal.id) return g;
                          const filteredActs = (g.activities || []).filter(
                            (a) => a.id !== act.id
                          );
                          return {
                            ...g,
                            currentAmount: Math.max(
                              0,
                              (Number(g.currentAmount) || 0) - delta
                            ),
                            activities: filteredActs,
                          };
                        });
                        updateGoals(next);
                      }}
                      title="Ta bort aktivitet"
                      aria-label={`Ta bort ${displayLabel}`}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ta bort sparmål längst ner precis som i övriga detaljvyer */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="ui-btn-danger"
        >
          <Trash size={14} />
          <span>Ta bort sparmål</span>
        </button>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Ta bort sparmål?"
          description={`${selectedGoal.name || 'Sparmålet'} tas bort.`}
          confirmLabel="Ta bort"
          onConfirm={() => {
            const next = savingsGoals.filter((g) => g.id !== selectedGoal.id);
            updateGoals(next);
            setSelectedGoalId(null);
            setShowDeleteConfirm(false);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>

      {/* Sheet for Hur sparandet följs */}
      <BottomSheet
        isOpen={isAccountPickerOpen}
        onClose={() => setIsAccountPickerOpen(false)}
        title="Hur sparandet följs"
      >
        <div className="ui-sheet-group">
          <button
            type="button"
            onClick={() => {
              updateSelectedGoal({
                linkedAccountId: undefined,
                linkedAccountName: undefined,
              });
              setIsAccountPickerOpen(false);
            }}
            className="ui-row-btn"
          >
            <span className="font-normal text-[var(--text-primary)]">
              Eget valt belopp
            </span>
            {!selectedGoal.linkedAccountId && (
              <Check size={14} weight="bold" className="text-[var(--text-primary)]" />
            )}
          </button>

          {(accounts.length > 0 || effectiveTotalBalance > 0) && (
            <button
              type="button"
              onClick={() => {
                updateSelectedGoal({
                  linkedAccountId: '__TOTAL__',
                  linkedAccountName: 'Totalsaldo',
                  currentAmount: effectiveTotalBalance,
                });
                setIsAccountPickerOpen(false);
              }}
              className="ui-row-btn"
            >
              <span className="font-normal text-[var(--text-primary)]">
                Totalsaldo
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                  {formatKr(effectiveTotalBalance)}
                </span>
                {selectedGoal.linkedAccountId === '__TOTAL__' && (
                  <Check size={14} weight="bold" className="text-[var(--text-primary)]" />
                )}
              </div>
            </button>
          )}

          {accounts.map((acc) => {
            const isSelected = selectedGoal.linkedAccountId === acc.id;
            const accBal = Math.max(0, Math.round(Number(acc.balance) || 0));
            const hasDuplicateName =
              accounts.filter(
                (other) =>
                  other.name.trim().toLowerCase() === acc.name.trim().toLowerCase()
              ).length > 1;
            const cleanDigits = (acc.accountNumber || '').replace(/\D/g, '');
            const last4 = cleanDigits.length >= 4 ? cleanDigits.slice(-4) : '';

            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  updateSelectedGoal({
                    linkedAccountId: acc.id,
                    linkedAccountName: acc.name,
                    currentAmount: accBal,
                  });
                  setIsAccountPickerOpen(false);
                }}
                className="ui-row-btn"
              >
                <span className="font-normal text-[var(--text-primary)] truncate">
                  {acc.name}
                  {hasDuplicateName && last4 ? ` (•••• ${last4})` : ''}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-[var(--text-secondary)] tabular-nums">
                    {formatKr(accBal)}
                  </span>
                  {isSelected && (
                    <Check size={14} weight="bold" className="text-[var(--text-primary)]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Sheet for Bild & tema */}
      <BottomSheet
        isOpen={isArtworkPickerOpen}
        onClose={() => setIsArtworkPickerOpen(false)}
        title="Välj bild"
      >
        <div className="grid grid-cols-4 gap-2.5">
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative overflow-hidden ${
              selectedGoal.customImageUrl
                ? 'ring-2 ring-[var(--text-primary)]'
                : 'bg-[var(--bg-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
            }`}
            title="Välj egen bild"
          >
            {selectedGoal.customImageUrl ? (
              <img
                src={selectedGoal.customImageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <ImageSquare size={20} className="text-[var(--text-primary)]" />
                <span className="text-[10px] font-medium text-[var(--text-secondary)]">
                  Egen bild
                </span>
              </>
            )}
          </button>

          {GOAL_ARTWORKS.map((art) => {
            const isSelected =
              !selectedGoal.customImageUrl && selectedGoal.artworkId === art.id;
            return (
              <button
                key={art.id}
                type="button"
                onClick={() => {
                  updateSelectedGoal({
                    customImageUrl: undefined,
                    artworkId: art.id,
                  });
                  setIsArtworkPickerOpen(false);
                }}
                title={art.label}
                style={{ backgroundColor: art.tileBg }}
                className={`aspect-square rounded-2xl p-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-[var(--text-primary)] scale-95'
                    : 'opacity-85 hover:opacity-100'
                }`}
              >
                <GoalArtworkIllustration artworkId={art.id} className="w-full h-full" />
              </button>
            );
          })}
        </div>
      </BottomSheet>

      {/* Sheet for Sätt in / Ta ut */}
      <BottomSheet
        isOpen={transferMode !== null}
        onClose={() => setTransferMode(null)}
        title={
          transferMode === 'deposit'
            ? 'Sätt in på sparmål'
            : 'Ta ut från sparmål'
        }
      >
        <div className="space-y-4">
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4">
            <label className="block cursor-text">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Belopp
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formatInputThousands(transferAmountInput)}
                  onChange={(e) =>
                    setTransferAmountInput(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="500"
                  className="w-full bg-transparent border-0 p-0 font-display font-bold text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
                />
                <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                  kr
                </span>
              </div>
            </label>
          </div>

          {transferMode === 'deposit' &&
            (() => {
              const existingActIds = new Set(
                (selectedGoal.activities || []).map((a) => a.id)
              );
              const recentSavingsTxs = transactions
                .filter(
                  (t) =>
                    t.category === 'Sparande' &&
                    !existingActIds.has(`tx-goal-${t.id}`)
                )
                .slice(0, 4);
              if (recentSavingsTxs.length === 0) return null;
              return (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block px-1">
                    Eller välj en spar-händelse från banken
                  </span>
                  <div className="space-y-1.5">
                    {recentSavingsTxs.map((tx) => {
                      const amt = Math.round(Math.abs(Number(tx.amount) || 0));
                      return (
                        <button
                          key={tx.id}
                          type="button"
                          onClick={() => {
                            const next = savingsGoals.map((g) => {
                              if (g.id !== selectedGoal.id) return g;
                              return {
                                ...g,
                                currentAmount: g.currentAmount + amt,
                                activities: [
                                  {
                                    id: `tx-goal-${tx.id}`,
                                    text: tx.title,
                                    date:
                                      tx.date ||
                                      new Date().toISOString().slice(0, 10),
                                    amount: amt,
                                  },
                                  ...(g.activities || activities),
                                ],
                              };
                            });
                            updateGoals(next);
                            setTransferMode(null);
                            setTransferAmountInput('');
                          }}
                          className="w-full rounded-xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                              {tx.title}
                            </span>
                            <span className="text-[11px] text-[var(--text-secondary)] block">
                              {formatSwedishDateHeading(tx.date)}
                            </span>
                          </div>
                          <span className="font-display font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                            +{formatKr(amt)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

          <button
            type="button"
            onClick={handleConfirmTransfer}
            className="ui-btn-primary"
          >
            <Check size={14} weight="bold" />
            <span>Bekräfta</span>
          </button>
        </div>
      </BottomSheet>
    </div>
  );
};
