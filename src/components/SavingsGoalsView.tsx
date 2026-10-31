import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Minus,
  PencilSimple,
  Trash,
  Check,
  CaretLeft,
  ArrowRight,
  MagnifyingGlass,
  ImageSquare,
  X,
  Bank,
} from '@phosphor-icons/react';
import { BottomSheet } from './ui/BottomSheet';
import { ConfirmDialog } from './ui/ConfirmDialog';
import {
  getSavingsGoals,
  saveSavingsGoals,
  SavingsGoalItem,
  compressImageFileToDataUrl,
} from '../utils/appCache';
import {
  GOAL_ARTWORKS,
  getGoalArtworkTheme,
  GoalArtworkIllustration,
  EmptyClusterArtwork,
  TiltedGoalsPromoArtwork,
} from './ui/VisualArtwork';
import { formatSwedishDateHeading } from '../utils/swedishDate';
import { getHouseholdState, pushHouseholdSyncToServer } from '../utils/householdSync';
import { TransactionItem, AccountItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';

interface SavingsGoalsViewProps {
  onGoalsChanged?: (goals: SavingsGoalItem[]) => void;
  userName?: string | null;
  transactions?: TransactionItem[];
  accounts?: AccountItem[];
  totalBalance?: number;
}

type GoalWizardStep = 1 | 2 | 3 | 4;

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  onGoalsChanged,
  userName,
  transactions = [],
  accounts = [],
  totalBalance,
}) => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalItem[]>(() => getSavingsGoals());
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Create / Edit Wizard State (Onboarding-style step-by-step)
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<GoalWizardStep>(1);
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalCurrentInput, setGoalCurrentInput] = useState('');
  const [goalLinkedAccountId, setGoalLinkedAccountId] = useState<string | undefined>(undefined);
  const [goalArtworkId, setGoalArtworkId] = useState<string>('piggy');
  const [goalCustomImage, setGoalCustomImage] = useState<string | undefined>(undefined);
  const [artworkSearch, setArtworkSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Deposit / Withdraw / Rule Sheet State
  const [transferMode, setTransferMode] = useState<'deposit' | 'withdraw' | 'rule' | null>(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  const userInitials = useMemo(() => {
    const clean = (userName || '').trim();
    if (!clean) return 'DU';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, [userName]);

  const updateGoals = (next: SavingsGoalItem[]) => {
    setSavingsGoals(next);
    saveSavingsGoals(next);
    const hh = getHouseholdState();
    if (hh) {
      void pushHouseholdSyncToServer({
        ...hh,
        sharedSavingsGoals: next,
        updatedAt: new Date().toISOString(),
      });
    }
    if (onGoalsChanged) onGoalsChanged(next);
  };

  const effectiveTotalBalance = useMemo(() => {
    if (typeof totalBalance === 'number') return Math.max(0, Math.round(totalBalance));
    return Math.max(
      0,
      Math.round(
        accounts
          .filter((a) => !a.excludeFromTotalBalance)
          .reduce((s, a) => s + (Number(a.balance) || 0), 0)
      )
    );
  }, [totalBalance, accounts]);

  const resolveGoalAmount = (goal: SavingsGoalItem): number => {
    if (goal.linkedAccountId === '__TOTAL__') {
      return accounts.length > 0 || typeof totalBalance === 'number'
        ? effectiveTotalBalance
        : Math.max(0, Math.round(Number(goal.currentAmount) || 0));
    }
    if (goal.linkedAccountId) {
      const matchedAcc = accounts.find(
        (a) =>
          a.id === goal.linkedAccountId ||
          (goal.linkedAccountName &&
            a.name.trim().toLowerCase() === goal.linkedAccountName.trim().toLowerCase())
      );
      if (matchedAcc) {
        return Math.max(0, Math.round(Number(matchedAcc.balance) || 0));
      }
    }
    return Math.max(0, Math.round(Number(goal.currentAmount) || 0));
  };

  const resolveGoalLinkedLabel = (goal: SavingsGoalItem): string | null => {
    if (goal.linkedAccountId === '__TOTAL__') return 'Totalsaldo';
    if (goal.linkedAccountId) {
      const matchedAcc = accounts.find((a) => a.id === goal.linkedAccountId);
      return matchedAcc?.name || goal.linkedAccountName || 'Kopplat konto';
    }
    return null;
  };

  const navigateWizardStep = (next: GoalWizardStep, dir: 'forward' | 'back') => {
    setSlideDir(dir);
    setWizardStep(next);
  };

  const openCreateGoal = () => {
    setEditingGoalId(null);
    setGoalNameInput('');
    setGoalTargetInput('');
    setGoalCurrentInput('');
    setGoalLinkedAccountId(undefined);
    setGoalArtworkId('piggy');
    setGoalCustomImage(undefined);
    setArtworkSearch('');
    setSlideDir('forward');
    setWizardStep(1);
    setIsGoalModalOpen(true);
  };

  const openEditGoal = (goal: SavingsGoalItem) => {
    setEditingGoalId(goal.id);
    setGoalNameInput(goal.name);
    setGoalTargetInput(String(goal.targetAmount));
    setGoalCurrentInput(String(resolveGoalAmount(goal)));
    setGoalLinkedAccountId(goal.linkedAccountId);
    setGoalArtworkId(goal.artworkId || 'piggy');
    setGoalCustomImage(goal.customImageUrl);
    setArtworkSearch('');
    setSlideDir('forward');
    setWizardStep(1);
    setIsGoalModalOpen(true);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 640, 0.82);
      setGoalCustomImage(dataUrl);
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const handleSaveGoal = () => {
    const cleanName = goalNameInput.trim();
    const cleanTarget = Math.max(1, Math.round(Number(goalTargetInput) || 0));
    const matchedAcc = goalLinkedAccountId
      ? accounts.find((a) => a.id === goalLinkedAccountId)
      : undefined;
    const cleanCurr =
      goalLinkedAccountId === '__TOTAL__'
        ? effectiveTotalBalance
        : matchedAcc
        ? Math.max(0, Math.round(Number(matchedAcc.balance) || 0))
        : Math.max(0, Math.round(Number(goalCurrentInput) || 0));
    const linkedName =
      goalLinkedAccountId === '__TOTAL__'
        ? 'Totalsaldo'
        : matchedAcc
        ? matchedAcc.name
        : undefined;

    if (!cleanName || cleanTarget <= 0) return;

    const todayIso = new Date().toISOString().slice(0, 10);

    if (editingGoalId) {
      const next = savingsGoals.map((g) =>
        g.id === editingGoalId
          ? {
              ...g,
              name: cleanName,
              targetAmount: cleanTarget,
              currentAmount: cleanCurr,
              linkedAccountId: goalLinkedAccountId,
              linkedAccountName: linkedName,
              artworkId: goalArtworkId,
              customImageUrl: goalCustomImage,
            }
          : g
      );
      updateGoals(next);
      setIsGoalModalOpen(false);
    } else {
      const newId = `goal-${Date.now()}`;
      const newGoal: SavingsGoalItem = {
        id: newId,
        name: cleanName,
        targetAmount: cleanTarget,
        currentAmount: cleanCurr,
        linkedAccountId: goalLinkedAccountId,
        linkedAccountName: linkedName,
        artworkId: goalArtworkId,
        customImageUrl: goalCustomImage,
        createdAt: todayIso,
        activities: [
          {
            id: `act-${Date.now()}`,
            text: linkedName
              ? `Skapade mål kopplat till ${linkedName}`
              : 'Du har skapat ditt mål',
            date: todayIso,
          },
        ],
      };
      updateGoals([...savingsGoals, newGoal]);
      setIsGoalModalOpen(false);
      setSelectedGoalId(newId);
    }
  };

  const selectedGoal = useMemo(
    () => savingsGoals.find((g) => g.id === selectedGoalId) || null,
    [savingsGoals, selectedGoalId]
  );

  const filteredArtworks = useMemo(() => {
    const q = artworkSearch.trim().toLowerCase();
    if (!q) return GOAL_ARTWORKS;
    return GOAL_ARTWORKS.filter(
      (art) =>
        art.label.toLowerCase().includes(q) ||
        art.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [artworkSearch]);

  const totalSaved = useMemo(() => {
    const hasTotalLinked = savingsGoals.some((g) => g.linkedAccountId === '__TOTAL__');
    const seenAccountIds = new Set<string>();
    let sum = 0;

    for (const g of savingsGoals) {
      if (g.linkedAccountId === '__TOTAL__') {
        if (!seenAccountIds.has('__TOTAL__')) {
          seenAccountIds.add('__TOTAL__');
          sum += resolveGoalAmount(g);
        }
        continue;
      }
      if (g.linkedAccountId) {
        const matched = accounts.find(
          (a) =>
            a.id === g.linkedAccountId ||
            (g.linkedAccountName &&
              a.name.trim().toLowerCase() === g.linkedAccountName.trim().toLowerCase())
        );
        const key = matched ? matched.id : g.linkedAccountId;
        if (hasTotalLinked && matched && !matched.excludeFromTotalBalance) {
          continue;
        }
        if (seenAccountIds.has(key)) {
          continue;
        }
        seenAccountIds.add(key);
        sum += resolveGoalAmount(g);
        continue;
      }
      sum += resolveGoalAmount(g);
    }

    return sum;
  }, [savingsGoals, accounts, effectiveTotalBalance]);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

  // ============================================================================
  // GOAL DETAIL VIEW (Lunar Screenshot #4: Colored Hero + Cropped Artwork + Actions)
  // ============================================================================
  if (selectedGoal) {
    const theme = getGoalArtworkTheme(selectedGoal.artworkId);
    const effectiveSelectedAmount = resolveGoalAmount(selectedGoal);
    const linkedLabel = resolveGoalLinkedLabel(selectedGoal);
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

    const handleConfirmTransfer = () => {
      const amt = Math.max(0, Math.round(Number(transferAmountInput) || 0));
      if (amt <= 0 && transferMode !== 'rule') return;
      const todayIso = new Date().toISOString().slice(0, 10);

      const next = savingsGoals.map((g) => {
        if (g.id !== selectedGoal.id) return g;
        if (transferMode === 'rule') {
          return {
            ...g,
            monthlyContribution: amt > 0 ? amt : undefined,
          };
        }
        const isDeposit = transferMode === 'deposit';
        const nextAmount = isDeposit
          ? g.currentAmount + amt
          : Math.max(0, g.currentAmount - amt);
        const newAct = {
          id: `act-${Date.now()}`,
          text: isDeposit
            ? `Satte in ${formatKr(amt)}`
            : `Tog ut ${formatKr(amt)}`,
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
        {/* Top Colored Hero Card with Cropped Right Artwork */}
        <section
          className="relative rounded-3xl overflow-hidden p-5 sm:p-6 min-h-[230px] flex flex-col justify-between text-white shadow-sm"
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
            /* Cropped Right-Edge Illustration (Exact match to Lunar Screenshot #4) */
            <div
              className="absolute -right-12 top-3 w-52 h-52 sm:w-56 sm:h-56 pointer-events-none select-none opacity-95"
              aria-hidden="true"
            >
              <GoalArtworkIllustration artworkId={selectedGoal.artworkId} />
            </div>
          )}

          {/* Top Bar inside Hero */}
          <div className="relative z-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedGoalId(null)}
              aria-label="Tillbaka till sparmål"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
          </div>

          {/* Bottom Goal Stats + Progress Bar inside Hero */}
          <div className="relative z-10 mt-10 space-y-3">
            <div className="max-w-[65%]">
              <span className="text-sm font-medium text-white/90 block truncate">
                {selectedGoal.name}
              </span>
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

        {/* 3 Circular Action Buttons: Sätt in · Ta ut · Redigera */}
        <section className="flex items-center justify-start gap-7 px-2 py-1">
          <button
            type="button"
            onClick={() => {
              setTransferAmountInput('');
              setTransferMode('deposit');
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shadow-sm group-active:scale-95 transition-transform">
              <Plus size={20} weight="bold" />
            </div>
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Sätt in
            </span>
          </button>

          <button
            type="button"
            disabled={selectedGoal.currentAmount <= 0}
            onClick={() => {
              setTransferAmountInput('');
              setTransferMode('withdraw');
            }}
            className="flex flex-col items-center gap-2 group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center group-active:scale-95 transition-transform">
              <Minus size={20} weight="bold" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Ta ut
            </span>
          </button>

          <button
            type="button"
            onClick={() => openEditGoal(selectedGoal)}
            className="flex flex-col items-center gap-2 group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center group-active:scale-95 transition-transform">
              <PencilSimple size={18} weight="regular" />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Redigera
            </span>
          </button>
        </section>

        {/* Regler (Månadssparande) */}
        <section className="ui-section">
          <div className="ui-section-header">
            <h2 className="ui-section-title">Regler</h2>
          </div>
          <div className="ui-card-p">
            <button
              type="button"
              onClick={() => {
                setTransferAmountInput(
                  selectedGoal.monthlyContribution
                    ? String(selectedGoal.monthlyContribution)
                    : ''
                );
                setTransferMode('rule');
              }}
              className="w-full flex items-center gap-3.5 text-left hover:opacity-85 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                <Plus size={18} weight="regular" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="ui-row-title block">
                  {selectedGoal.monthlyContribution
                    ? `Månadssparande: ${formatKr(selectedGoal.monthlyContribution)}/mån`
                    : 'Lägg till regel'}
                </span>
                {selectedGoal.monthlyContribution && (
                  <span className="ui-row-subtitle block">
                    Tryck för att ändra ditt månadssparande
                  </span>
                )}
              </div>
            </button>
          </div>
        </section>

        {/* Aktivitet */}
        <section className="ui-section">
          <div className="ui-section-header">
            <h2 className="ui-section-title">Aktivitet</h2>
          </div>
          <div className="ui-list-card">
            {activities.map((act) => (
              <div
                key={act.id}
                className="py-3.5 flex items-center justify-between gap-3.5"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#34D399]/20 text-emerald-600 dark:bg-[#34D399] dark:text-[#052E22] font-display font-bold text-xs flex items-center justify-center shrink-0">
                    {act.authorInitials || userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title block">{act.text}</span>
                    <span className="ui-row-subtitle block">
                      {act.authorName ? `${act.authorName} · ` : ''}
                      {formatSwedishDateHeading(act.date)}
                    </span>
                  </div>
                </div>
                {act.amount !== undefined && (
                  <span
                    className={`ui-row-amount ${
                      act.amount > 0 ? 'ui-row-amount-income' : ''
                    }`}
                  >
                    {act.amount > 0
                      ? `+${formatKr(act.amount)}`
                      : `-${formatKr(Math.abs(act.amount))}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Sheet for Sätt in / Ta ut / Regel */}
        <BottomSheet
          isOpen={transferMode !== null}
          onClose={() => setTransferMode(null)}
          title={
            transferMode === 'deposit'
              ? 'Sätt in på sparmål'
              : transferMode === 'withdraw'
              ? 'Ta ut från sparmål'
              : 'Månadssparande'
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4">
              <label className="block cursor-text">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                  {transferMode === 'rule' ? 'Belopp per månad' : 'Belopp'}
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={transferAmountInput}
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

              <div className="grid grid-cols-3 gap-2 pt-3 mt-3 border-t border-[var(--border-subtle)]">
                {[250, 500, 1000].map((presetAmt) => (
                  <button
                    key={presetAmt}
                    type="button"
                    onClick={() => setTransferAmountInput(String(presetAmt))}
                    className="py-2 px-2.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-display font-semibold text-[var(--text-primary)] tabular-nums transition-colors cursor-pointer"
                  >
                    {new Intl.NumberFormat('sv-SE').format(presetAmt)} kr
                  </button>
                ))}
              </div>
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
                                      text: `${tx.title} (+${formatKr(amt)})`,
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

        {/* Render Edit Goal Modal if opened from Detail View */}
        {renderGoalModal()}
      </div>
    );
  }

  // ============================================================================
  // ONBOARDING-STYLE STEP-BY-STEP GOAL WIZARD (Steps 1 -> 2 -> 3 -> 4)
  // ============================================================================
  function renderGoalModal() {
    if (!isGoalModalOpen || typeof document === 'undefined') return null;

    const pageAnimClass =
      slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

    return createPortal(
      <div className="fixed inset-0 z-[200] bg-[var(--bg-color)] text-[var(--text-primary)]">
        <div className="h-dvh max-h-dvh flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] font-sans overflow-hidden select-none">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleGalleryUpload}
            className="hidden"
          />

          {/* 1. TOP HEADER (Pinned / Non-scrolling, exact match to OnboardingFlow) */}
          <header className="shrink-0 space-y-3 pb-1">
            <div className="flex items-center justify-between h-9">
              <button
                type="button"
                onClick={() => {
                  if (wizardStep > 1) {
                    navigateWizardStep((wizardStep - 1) as GoalWizardStep, 'back');
                  } else {
                    setIsGoalModalOpen(false);
                  }
                }}
                className="p-1.5 -ml-1.5 text-[var(--text-primary)] flex items-center justify-center hover:opacity-70 active:scale-95 transition-all cursor-pointer"
                aria-label="Tillbaka"
              >
                <CaretLeft size={18} weight="bold" />
              </button>

              <div className="flex items-center gap-2">
                {editingGoalId && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 text-rose-500 hover:opacity-75 active:scale-95 transition-all cursor-pointer"
                    aria-label="Ta bort sparmål"
                    title="Ta bort sparmål"
                  >
                    <Trash size={18} weight="regular" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="p-1.5 -mr-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                  aria-label="Stäng"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>

            {/* En enda lång sammanhängande progress-bar utan stegtext */}
            <div className="w-full h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
              <div
                className={`h-full rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-out ${
                  wizardStep === 1
                    ? 'w-1/4'
                    : wizardStep === 2
                    ? 'w-2/4'
                    : wizardStep === 3
                    ? 'w-3/4'
                    : 'w-full'
                }`}
              />
            </div>
          </header>

          {/* ============================================================== */}
          {/* STEG 1: VAD SPARAR DU TILL?                                    */}
          {/* ============================================================== */}
          {wizardStep === 1 && (
            <form
              key="goal-step-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (!goalNameInput.trim()) return;
                navigateWizardStep(2, 'forward');
              }}
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="shrink-0 pt-6 pb-4">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Vad sparar du till?
                </h1>
              </div>

              <div className="my-auto py-4">
                <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] focus-within:border-[var(--text-primary)] rounded-3xl px-5 py-4 transition-colors">
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="t.ex. Resa, Buffert eller Ny bil..."
                    value={goalNameInput}
                    onChange={(e) => setGoalNameInput(e.target.value)}
                    className="w-full bg-transparent border-0 p-0 font-display font-semibold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
                  />
                </div>
              </div>

              <div className="shrink-0 pt-3">
                <button
                  type="submit"
                  disabled={!goalNameInput.trim()}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-35 transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEG 2: VÄLJ BILD TILL DITT MÅL (Sök + 3x3 grid som Onboarding)*/}
          {/* ============================================================== */}
          {wizardStep === 2 && (
            <div
              key="goal-step-2"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="shrink-0 pt-6 pb-3">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Välj bild till ditt mål
                </h1>
              </div>

              <div className="flex-1 min-h-0 flex flex-col justify-center space-y-3 py-1">
                {/* Sökfält direkt på samma sida */}
                <div className="relative shrink-0">
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                  <input
                    type="text"
                    value={artworkSearch}
                    onChange={(e) => setArtworkSearch(e.target.value)}
                    placeholder="Sök bild..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                  />
                  {artworkSearch.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setArtworkSearch('')}
                      aria-label="Rensa sökning"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    >
                      <X size={14} weight="bold" />
                    </button>
                  )}
                </div>

                {/* 3x3 Grid: Tile 1 = Ladda upp bild, Tiles 2..9 = Illustrationer */}
                <div className="grid grid-cols-3 gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className={`aspect-square rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
                      goalCustomImage
                        ? 'ring-2 ring-[var(--text-primary)]'
                        : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {goalCustomImage ? (
                      <>
                        <img
                          src={goalCustomImage}
                          alt="Uppladdad"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-center p-2">
                          <ImageSquare size={22} weight="bold" className="text-white mb-1" />
                          <span className="text-[10.5px] font-medium text-white leading-tight">
                            Byt bild
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageSquare
                          size={22}
                          weight="regular"
                          className="text-[var(--text-primary)] mb-1.5"
                        />
                        <span className="text-[10.5px] font-medium text-[var(--text-primary)] leading-tight">
                          Egen bild
                        </span>
                      </>
                    )}
                  </button>

                  {filteredArtworks.map((art) => {
                    const isSelected = !goalCustomImage && goalArtworkId === art.id;
                    return (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => {
                          setGoalCustomImage(undefined);
                          setGoalArtworkId(art.id);
                        }}
                        title={art.label}
                        style={{ backgroundColor: art.tileBg }}
                        className={`aspect-square rounded-2xl p-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'ring-[2.5px] ring-[var(--text-primary)] scale-[0.98]'
                            : 'opacity-90 hover:opacity-100'
                        }`}
                      >
                        <GoalArtworkIllustration artworkId={art.id} className="w-full h-full" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shadow-sm">
                            <Check size={11} weight="bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  onClick={() => navigateWizardStep(3, 'forward')}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEG 3: VAD ÄR DITT MÅLBELOPP?                                 */}
          {/* ============================================================== */}
          {wizardStep === 3 && (
            <form
              key="goal-step-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!(Number(goalTargetInput) > 0)) return;
                navigateWizardStep(4, 'forward');
              }}
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="shrink-0 pt-6 pb-4">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Vad är ditt målbelopp?
                </h1>
              </div>

              <div className="my-auto py-4">
                <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] focus-within:border-[var(--text-primary)] rounded-3xl px-5 py-4 transition-colors flex items-baseline justify-between gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    required
                    placeholder="10 000"
                    value={goalTargetInput}
                    onChange={(e) =>
                      setGoalTargetInput(e.target.value.replace(/[^\d]/g, ''))
                    }
                    className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 tabular-nums focus:outline-none"
                  />
                  <span className="font-display font-semibold text-base text-[var(--text-muted)] shrink-0">
                    kr
                  </span>
                </div>
              </div>

              <div className="shrink-0 pt-3">
                <button
                  type="submit"
                  disabled={!(Number(goalTargetInput) > 0)}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-35 transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                  <ArrowRight size={16} weight="bold" />
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEG 4: HUR VILL DU FÖLJA SPARANDET? (Kontoval som Onboarding) */}
          {/* ============================================================== */}
          {wizardStep === 4 && (
            <div
              key="goal-step-4"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="shrink-0 pt-6 pb-4">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Hur vill du följa sparandet?
                </h1>
              </div>

              {/* Scrollbar lista i samma stil som Välj konton i Onboarding */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
                {/* Alternativ 1: Eget valt belopp */}
                <div
                  className={`rounded-2xl border transition-all ${
                    !goalLinkedAccountId
                      ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setGoalLinkedAccountId(undefined)}
                    className="w-full p-4 flex items-center gap-3.5 text-left cursor-pointer"
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        !goalLinkedAccountId
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {!goalLinkedAccountId && <Check size={12} weight="bold" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                        Eget valt belopp
                      </span>
                      <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                        Fyll i startbelopp och lägg till själv
                      </span>
                    </div>
                  </button>

                  {!goalLinkedAccountId && (
                    <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)]">
                      <label className="block cursor-text">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                          Sparat hittills
                        </span>
                        <div className="flex items-baseline justify-between gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={goalCurrentInput}
                            onChange={(e) =>
                              setGoalCurrentInput(e.target.value.replace(/[^\d]/g, ''))
                            }
                            placeholder="0"
                            className="w-full bg-transparent border-0 p-0 font-display font-bold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 tabular-nums focus:outline-none"
                          />
                          <span className="font-display font-semibold text-xs text-[var(--text-muted)] shrink-0">
                            kr
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Alternativ 2: Totalsaldo */}
                {(accounts.length > 0 || effectiveTotalBalance > 0) && (
                  <button
                    type="button"
                    onClick={() => {
                      setGoalLinkedAccountId('__TOTAL__');
                      setGoalCurrentInput(String(effectiveTotalBalance));
                    }}
                    className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                      goalLinkedAccountId === '__TOTAL__'
                        ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                        : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        goalLinkedAccountId === '__TOTAL__'
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {goalLinkedAccountId === '__TOTAL__' && (
                        <Check size={12} weight="bold" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                      <Bank size={15} weight="regular" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                        Totalsaldo
                      </span>
                      <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                        Alla konton · Synkas automatiskt
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                      {formatKr(effectiveTotalBalance)}
                    </span>
                  </button>
                )}

                {/* Alternativ 3..N: Specifikt bankkonto */}
                {accounts.map((acc) => {
                  const isSelected = goalLinkedAccountId === acc.id;
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
                        setGoalLinkedAccountId(acc.id);
                        setGoalCurrentInput(String(accBal));
                      }}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                          : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                            : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                        }`}
                      >
                        {isSelected && <Check size={12} weight="bold" />}
                      </div>
                      <ItemLogo
                        name={acc.bankName || acc.name}
                        category="Bank"
                        logoUrl={acc.logo}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                          {acc.name}
                        </span>
                        {(acc.bankName || (hasDuplicateName && last4)) && (
                          <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5 truncate">
                            {acc.bankName}
                            {hasDuplicateName && last4 ? ` · •••• ${last4}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                        {formatKr(accBal)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Pinnad knapp */}
              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                  onClick={handleSaveGoal}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Check size={16} weight="bold" />
                  <span>{editingGoalId ? 'Spara ändringar' : 'Skapa sparmål'}</span>
                </button>
              </div>
            </div>
          )}

          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Ta bort sparmål?"
            description={`${goalNameInput || 'Sparmålet'} tas bort.`}
            confirmLabel="Ta bort"
            onConfirm={() => {
              const next = savingsGoals.filter((g) => g.id !== editingGoalId);
              updateGoals(next);
              if (selectedGoalId === editingGoalId) {
                setSelectedGoalId(null);
              }
              setShowDeleteConfirm(false);
              setIsGoalModalOpen(false);
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </div>
      </div>,
      document.body
    );
  }

  // ============================================================================
  // MAIN GOALS LIST VIEW (Lunar Screenshots #3, #5, #6)
  // ============================================================================
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
          <h2 className="ui-section-title">Mål</h2>
          <button
            type="button"
            onClick={openCreateGoal}
            className="ui-section-action"
          >
            <Plus size={13} weight="bold" />
            <span>Lägg till</span>
          </button>
        </div>

        {savingsGoals.length > 0 ? (
          <div className="space-y-3">
            <div className="ui-list-card">
              {savingsGoals.map((goal) => {
                const theme = getGoalArtworkTheme(goal.artworkId);
                const effectiveAmt = resolveGoalAmount(goal);
                const linkedLabel = resolveGoalLinkedLabel(goal);
                const pct =
                  goal.targetAmount > 0
                    ? Math.min(
                        100,
                        Math.round((effectiveAmt / goal.targetAmount) * 100)
                      )
                    : 0;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => setSelectedGoalId(goal.id)}
                    className="w-full py-4 flex items-center gap-3.5 text-left hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    {/* Circular Goal Avatar with Cropped Right Artwork (Lunar Screenshot #3) */}
                    <div
                      className="w-11 h-11 rounded-full overflow-hidden relative shrink-0 border border-black/5 dark:border-white/10"
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
                        <div className="absolute -right-2.5 top-0.5 w-11 h-11">
                          <GoalArtworkIllustration artworkId={goal.artworkId} />
                        </div>
                      )}
                    </div>

                    {/* Goal Title + Amount + Progress Bar + Percentage */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0 flex items-baseline gap-1.5">
                          <span className="ui-row-title truncate">{goal.name}</span>
                          {linkedLabel && (
                            <span className="text-[11px] text-[var(--text-secondary)] truncate shrink-0">
                              · {linkedLabel}
                            </span>
                          )}
                        </div>
                        <span className="font-display font-semibold text-sm text-[var(--text-primary)] tabular-nums shrink-0">
                          {formatKr(effectiveAmt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
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

            {/* Promo Banner Card ("Spara till en resa, en pryl eller din nästa stora grej" – Lunar Screenshot #6) */}
            <button
              type="button"
              onClick={openCreateGoal}
              className="w-full ui-card-p flex items-center justify-between gap-4 text-left hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <span className="font-display font-medium text-sm text-[var(--text-primary)] leading-snug block">
                  Spara till en resa, en pryl eller din nästa stora grej
                </span>
              </div>
              <TiltedGoalsPromoArtwork />
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Empty State Card ("Spara till dina drömmar" – Lunar Screenshot #5) */}
            <div className="ui-card-p py-9 px-6 text-center">
              <EmptyClusterArtwork variant="savings" />
              <p className="font-display font-semibold text-base text-[var(--text-primary)] mt-1">
                Spara till dina drömmar
              </p>
              <p className="text-xs text-[var(--text-secondary)] max-w-[260px] mx-auto mt-1.5 mb-5 leading-relaxed">
                Skapa ditt första sparande för att börja följa dina framsteg
              </p>
              <button
                type="button"
                onClick={openCreateGoal}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs transition-transform active:scale-95 cursor-pointer"
              >
                <Plus size={14} weight="bold" />
                <span>Lägg till sparande</span>
              </button>
            </div>

            {/* Promo Card ("Spara till en resa, en pryl eller din nästa stora grej" – Lunar Screenshot #6) */}
            <button
              type="button"
              onClick={openCreateGoal}
              className="w-full ui-card-p flex items-center justify-between gap-4 text-left hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <span className="font-display font-medium text-sm text-[var(--text-primary)] leading-snug block">
                  Spara till en resa, en pryl eller din nästa stora grej
                </span>
              </div>
              <TiltedGoalsPromoArtwork />
            </button>
          </div>
        )}
      </section>

      {renderGoalModal()}
    </div>
  );
};
