import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Plus,
} from '@phosphor-icons/react';
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
} from './ui/VisualArtwork';
import { TransactionItem, AccountItem } from './HomeTab';
import { GoalDetailView } from './goals/GoalDetailView';
import { GoalCreateWizard } from './goals/GoalCreateWizard';
import type { CreateWizardStep } from './goals/goalHelpers';

interface SavingsGoalsViewProps {
  onGoalsChanged?: (goals: SavingsGoalItem[]) => void;
  /** Skapar ett månadssparande (fast utgift kopplad till målet) som dras av från "kvar att spendera" */
  onCreateMonthlySaving?: (data: { goalId: string; goalName: string; amount: number }) => void;
  userName?: string | null;
  transactions?: TransactionItem[];
  accounts?: AccountItem[];
  totalBalance?: number;
  selectedGoalId?: string | null;
  onSelectGoalId?: (goalId: string | null) => void;
  autoOpenCreate?: boolean;
  onAutoOpenConsumed?: () => void;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  onGoalsChanged,
  onCreateMonthlySaving,
  userName,
  transactions = [],
  accounts = [],
  totalBalance,
  selectedGoalId: controlledSelectedGoalId,
  onSelectGoalId,
  autoOpenCreate,
  onAutoOpenConsumed,
}) => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalItem[]>(() => getSavingsGoals());
  const [internalSelectedGoalId, setInternalSelectedGoalId] = useState<string | null>(null);

  const selectedGoalId =
    controlledSelectedGoalId !== undefined ? controlledSelectedGoalId : internalSelectedGoalId;

  const setSelectedGoalId = (nextId: string | null) => {
    setInternalSelectedGoalId(nextId);
    onSelectGoalId?.(nextId);
  };

  // Create Wizard State (Onboarding-style step-by-step, ONLY for creating new goals)
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<CreateWizardStep>(1);
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward');

  // Inline detail pickers for existing goals
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [isArtworkPickerOpen, setIsArtworkPickerOpen] = useState(false);

  // Form Fields for Create Wizard
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalCurrentInput, setGoalCurrentInput] = useState('');
  const [goalMonthlyInput, setGoalMonthlyInput] = useState('');
  const [goalLinkedAccountId, setGoalLinkedAccountId] = useState<string | undefined>(undefined);
  const [goalArtworkId, setGoalArtworkId] = useState<string>('piggy');
  const [goalCustomImage, setGoalCustomImage] = useState<string | undefined>(undefined);
  const [hasManuallyPickedArtwork, setHasManuallyPickedArtwork] = useState(false);
  const [artworkSearch, setArtworkSearch] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Deposit / Withdraw Sheet State (for manual goals)
  const [transferMode, setTransferMode] = useState<'deposit' | 'withdraw' | null>(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');

  const galleryInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onSync = () => setSavingsGoals(getSavingsGoals());
    window.addEventListener('dejz:goals-updated', onSync);
    return () => {
      window.removeEventListener('dejz:goals-updated', onSync);
    };
  }, []);

  // onAutoOpenConsumed skapas om vid varje render hos föräldern – läs senaste via ref
  const onAutoOpenConsumedRef = useRef(onAutoOpenConsumed);
  React.useEffect(() => {
    onAutoOpenConsumedRef.current = onAutoOpenConsumed;
  }, [onAutoOpenConsumed]);

  React.useEffect(() => {
    if (autoOpenCreate) {
      openCreateGoal();
      onAutoOpenConsumedRef.current?.();
    }
  }, [autoOpenCreate]);

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

  const resolveGoalAmount = useCallback((goal: SavingsGoalItem): number => {
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
  }, [accounts, totalBalance, effectiveTotalBalance]);

  const resolveGoalLinkedLabel = (goal: SavingsGoalItem): string | null => {
    if (goal.linkedAccountId === '__TOTAL__') return 'Totalsaldo';
    if (goal.linkedAccountId) {
      const matchedAcc = accounts.find((a) => a.id === goal.linkedAccountId);
      return matchedAcc?.name || goal.linkedAccountName || 'Kopplat konto';
    }
    return null;
  };

  const navigateWizardStep = (next: CreateWizardStep, dir: 'forward' | 'back') => {
    setSlideDir(dir);
    setWizardStep(next);
  };

  const openCreateGoal = () => {
    setGoalNameInput('');
    setGoalTargetInput('');
    setGoalCurrentInput('');
    setGoalMonthlyInput('');
    setGoalLinkedAccountId(undefined);
    setGoalArtworkId('piggy');
    setGoalCustomImage(undefined);
    setHasManuallyPickedArtwork(false);
    setArtworkSearch('');
    setSlideDir('forward');
    setWizardStep(1);
    setIsCreateWizardOpen(true);
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 640, 0.82);
      if (!isCreateWizardOpen && selectedGoalId) {
        const next = savingsGoals.map((g) =>
          g.id === selectedGoalId ? { ...g, customImageUrl: dataUrl } : g
        );
        updateGoals(next);
        setIsArtworkPickerOpen(false);
      } else {
        setGoalCustomImage(dataUrl);
        setHasManuallyPickedArtwork(true);
      }
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const handleSaveGoal = (overrideCurrentAmount?: number, overrideMonthly?: number) => {
    const cleanName = goalNameInput.trim();
    const cleanTarget = Math.max(1, Math.round(Number(goalTargetInput) || 0));
    const matchedAcc = goalLinkedAccountId
      ? accounts.find((a) => a.id === goalLinkedAccountId)
      : undefined;
    const cleanCurr =
      typeof overrideCurrentAmount === 'number'
        ? Math.max(0, Math.round(overrideCurrentAmount))
        : goalLinkedAccountId === '__TOTAL__'
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
    const newId = `goal-${Date.now()}`;
    const newGoal: SavingsGoalItem = {
      id: newId,
      name: cleanName,
      targetAmount: cleanTarget,
      currentAmount: cleanCurr,
      isShared: false,
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
    const monthly =
      typeof overrideMonthly === 'number'
        ? overrideMonthly
        : Math.max(0, Math.round(Number(goalMonthlyInput) || 0));
    if (monthly > 0 && onCreateMonthlySaving) {
      onCreateMonthlySaving({ goalId: newId, goalName: cleanName, amount: monthly });
    }
    setIsCreateWizardOpen(false);
    setSelectedGoalId(newId);
  };

  // Senaste handleSaveGoal (skapas om vid varje render) så att Enter sparar med färska värden
  const handleSaveGoalRef = useRef(handleSaveGoal);
  React.useEffect(() => {
    handleSaveGoalRef.current = handleSaveGoal;
  });

  // Physical keyboard support for Numpad steps (Step 3 & Step 5)
  React.useEffect(() => {
    if (!isCreateWizardOpen || (wizardStep !== 3 && wizardStep !== 5 && wizardStep !== 6)) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const isStep3 = wizardStep === 3;
      const currentVal = isStep3 ? goalTargetInput : wizardStep === 6 ? goalMonthlyInput : goalCurrentInput;
      const setVal = isStep3 ? setGoalTargetInput : wizardStep === 6 ? setGoalMonthlyInput : setGoalCurrentInput;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const nextDigits = (currentVal + e.key).replace(/^0+/, '');
        if (nextDigits.length <= 9) {
          setVal(nextDigits);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setVal(currentVal.slice(0, -1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isStep3) {
          if (Number(goalTargetInput) > 0) {
            navigateWizardStep(4, 'forward');
          }
        } else if (wizardStep === 5) {
          navigateWizardStep(6, 'forward');
        } else {
          handleSaveGoalRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateWizardOpen, wizardStep, goalTargetInput, goalCurrentInput, goalMonthlyInput, goalNameInput, goalLinkedAccountId]);

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
  }, [savingsGoals, accounts, resolveGoalAmount]);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

  const sharedHiddenFileInput = (
    <input
      ref={galleryInputRef}
      type="file"
      accept="image/*"
      onChange={handleGalleryUpload}
      className="hidden"
    />
  );

  // ============================================================================
  // GOAL DETAIL VIEW (Direct inline editing + Actions + Clean Activity)
  // ============================================================================
  if (selectedGoal) {
    return (
      <GoalDetailView
        selectedGoal={selectedGoal}
        resolveGoalAmount={resolveGoalAmount}
        resolveGoalLinkedLabel={resolveGoalLinkedLabel}
        savingsGoals={savingsGoals}
        updateGoals={updateGoals}
        transferAmountInput={transferAmountInput}
        transferMode={transferMode}
        userInitials={userInitials}
        userName={userName}
        setTransferMode={setTransferMode}
        setTransferAmountInput={setTransferAmountInput}
        sharedHiddenFileInput={sharedHiddenFileInput}
        setIsArtworkPickerOpen={setIsArtworkPickerOpen}
        formatKr={formatKr}
        setIsAccountPickerOpen={setIsAccountPickerOpen}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showDeleteConfirm={showDeleteConfirm}
        setSelectedGoalId={setSelectedGoalId}
        isAccountPickerOpen={isAccountPickerOpen}
        accounts={accounts}
        effectiveTotalBalance={effectiveTotalBalance}
        isArtworkPickerOpen={isArtworkPickerOpen}
        galleryInputRef={galleryInputRef}
        transactions={transactions}
      />
    );
  }

  // ============================================================================
  // STEP-BY-STEP GOAL CREATION SHEET (Lunar-style non-fullscreen modal sheet)
  // ============================================================================
  function renderCreateWizardModal() {
    return (
      <GoalCreateWizard
        isCreateWizardOpen={isCreateWizardOpen}
        goalArtworkId={goalArtworkId}
        slideDir={slideDir}
        wizardStep={wizardStep}
        navigateWizardStep={navigateWizardStep}
        setIsCreateWizardOpen={setIsCreateWizardOpen}
        goalTargetInput={goalTargetInput}
        goalMonthlyInput={goalMonthlyInput}
        goalCurrentInput={goalCurrentInput}
        setGoalTargetInput={setGoalTargetInput}
        setGoalMonthlyInput={setGoalMonthlyInput}
        setGoalCurrentInput={setGoalCurrentInput}
        handleSaveGoal={handleSaveGoal}
        goalNameInput={goalNameInput}
        hasManuallyPickedArtwork={hasManuallyPickedArtwork}
        goalCustomImage={goalCustomImage}
        setGoalArtworkId={setGoalArtworkId}
        setGoalNameInput={setGoalNameInput}
        artworkSearch={artworkSearch}
        setArtworkSearch={setArtworkSearch}
        galleryInputRef={galleryInputRef}
        filteredArtworks={filteredArtworks}
        setGoalCustomImage={setGoalCustomImage}
        setHasManuallyPickedArtwork={setHasManuallyPickedArtwork}
        setGoalLinkedAccountId={setGoalLinkedAccountId}
        goalLinkedAccountId={goalLinkedAccountId}
        accounts={accounts}
        effectiveTotalBalance={effectiveTotalBalance}
        formatKr={formatKr}
      />
    );
  }

  // ============================================================================
  // MAIN GOALS LIST VIEW (Clean, zero duplicate cards or redundant buttons)
  // ============================================================================
  return (
    <div className="ui-page animate-fade-in">
      {sharedHiddenFileInput}

      {/* Visa endast summeringskortet när man har fler än 1 mål så beloppet inte upprepas två gånger i rad */}
      {savingsGoals.length > 1 && (
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

      {savingsGoals.length > 0 ? (
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

          <div className="ui-list-card">
            {savingsGoals.map((goal) => {
              const theme = getGoalArtworkTheme(goal.artworkId);
              const effectiveAmt = resolveGoalAmount(goal);
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

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="ui-row-title truncate">
                        {goal.name}
                      </span>
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
        </section>
      ) : (
        <section className="ui-empty-state-page animate-fade-in">
          <EmptyClusterArtwork variant="savings" />
          <p className="ui-empty-title">
            Spara till dina drömmar
          </p>
          <p className="ui-empty-sub max-w-[260px] mx-auto mb-5">
            Skapa ditt första sparmål för att börja följa dina framsteg
          </p>
          <button
            type="button"
            onClick={openCreateGoal}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] font-display font-semibold text-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Nytt sparmål</span>
          </button>
        </section>
      )}

      {renderCreateWizardModal()}
    </div>
  );
};

