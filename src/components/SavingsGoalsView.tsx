import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Minus,
  CaretRight,
  Trash,
  Check,
  CaretLeft,
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
} from './ui/VisualArtwork';
import { formatSwedishDateHeading } from '../utils/swedishDate';
import {
  getHouseholdState,
  hasConnectedHouseholdPartner,
  pushHouseholdSyncToServer,
} from '../utils/householdSync';
import { TransactionItem, AccountItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';

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

type CreateWizardStep = 1 | 2 | 3 | 4 | 5 | 6;

function inferArtworkFromGoalName(rawName: string): string {
  const q = rawName.trim().toLowerCase();
  if (!q) return 'piggy';

  if (
    /hus|lägenhet|bostad|kontantinsats|hem|renovering|stuga|villa|radhus|soffa|möbler/.test(q)
  ) {
    return 'house';
  }
  if (
    /semester|sol|strand|bad|sommarresa|spanien|grekland|italien|mallorca|kreta|cypern|thailand/.test(
      q
    )
  ) {
    return 'beach';
  }
  if (
    /resa|utlandsresa|flyg|världen|äventyr|japan|usa|new york|london|paris|weekend|tåg/.test(q)
  ) {
    return 'globe';
  }
  if (/kassaskåp|trygghet|pension|nödfond|säkerhet|skatt/.test(q)) {
    return 'safe';
  }
  if (/bröllop|fest|födelsedag|kalas|fira|jubileum|student|examen|konsert/.test(q)) {
    return 'celebration';
  }
  if (/jul|julklapp|nyår|midsommar|högtid|framtid|kalender|vinter/.test(q)) {
    return 'calendar';
  }
  if (
    /shopping|kläder|klocka|väska|skor|mode|present|dator|macbook|iphone|telefon|mobil|kamera|bil|mc|cykel/.test(
      q
    )
  ) {
    return 'shopping';
  }

  for (const art of GOAL_ARTWORKS) {
    if (art.keywords.some((kw) => q.includes(kw.toLowerCase()))) {
      return art.id;
    }
  }
  return 'piggy';
}

function formatInputThousands(rawDigits: string): string {
  const digits = rawDigits.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = Number(digits);
  if (!Number.isFinite(num)) return '';
  return new Intl.NumberFormat('sv-SE').format(num);
}

function cleanActivityLabel(text: string, hasAmount: boolean): string {
  if (!hasAmount) return text;
  if (/^satte in\s+[\d\s\u00A0]+kr$/i.test(text.trim())) {
    return 'Insättning';
  }
  if (/^tog ut\s+[\d\s\u00A0]+kr$/i.test(text.trim())) {
    return 'Uttag';
  }
  return text.replace(/\s*\([+-]?[\d\s\u00A0]+kr\)\s*$/i, '').trim() || text;
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
  const [goalIsShared, setGoalIsShared] = useState(false);
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
    window.addEventListener('dejz:household-updated', onSync);
    return () => {
      window.removeEventListener('dejz:goals-updated', onSync);
      window.removeEventListener('dejz:household-updated', onSync);
    };
  }, []);

  React.useEffect(() => {
    if (autoOpenCreate) {
      openCreateGoal();
      onAutoOpenConsumed?.();
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
    const hh = getHouseholdState();
    if (hh) {
      void pushHouseholdSyncToServer({
        ...hh,
        sharedSavingsGoals: next.filter((g) => g.isShared),
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

  const navigateWizardStep = (next: CreateWizardStep, dir: 'forward' | 'back') => {
    setSlideDir(dir);
    setWizardStep(next);
  };

  const openCreateGoal = () => {
    setGoalNameInput('');
    setGoalTargetInput('');
    setGoalCurrentInput('');
    setGoalMonthlyInput('');
    setGoalIsShared(false);
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
      isShared: hasConnectedHouseholdPartner() ? goalIsShared : false,
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
          handleSaveGoal();
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
  }, [savingsGoals, accounts, effectiveTotalBalance]);
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
              className="py-3 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition-all cursor-pointer"
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
  }

  // ============================================================================
  // STEP-BY-STEP GOAL CREATION SHEET (Lunar-style non-fullscreen modal sheet)
  // ============================================================================
  function renderCreateWizardModal() {
    if (!isCreateWizardOpen || typeof document === 'undefined') return null;

    const activeTheme = getGoalArtworkTheme(goalArtworkId);
    const pageAnimClass =
      slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

    const handleBackNavigation = () => {
      if (wizardStep === 6) {
        navigateWizardStep(5, 'back');
      } else if (wizardStep === 5) {
        navigateWizardStep(4, 'back');
      } else if (wizardStep > 1) {
        navigateWizardStep((wizardStep - 1) as CreateWizardStep, 'back');
      } else {
        setIsCreateWizardOpen(false);
      }
    };

    const appendDigit = (digit: string, isTarget: boolean) => {
      const isMonthly = wizardStep === 6;
      const current = isTarget ? goalTargetInput : isMonthly ? goalMonthlyInput : goalCurrentInput;
      const setFn = isTarget ? setGoalTargetInput : isMonthly ? setGoalMonthlyInput : setGoalCurrentInput;
      const next = (current + digit).replace(/^0+/, '');
      if (next.length <= 9) {
        setFn(next);
      }
    };

    const removeLastDigit = (isTarget: boolean) => {
      const isMonthly = wizardStep === 6;
      const current = isTarget ? goalTargetInput : isMonthly ? goalMonthlyInput : goalCurrentInput;
      const setFn = isTarget ? setGoalTargetInput : isMonthly ? setGoalMonthlyInput : setGoalCurrentInput;
      setFn(current.slice(0, -1));
    };

    const renderNumpad = (isTarget: boolean) => {
      const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
      return (
        <div className="grid grid-cols-3 gap-y-1 gap-x-4 pb-3 select-none">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => appendDigit(d, isTarget)}
              className="h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
            >
              {d}
            </button>
          ))}

          <button
            type="button"
            onClick={() => appendDigit('00', isTarget)}
            className="h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
          >
            ,
          </button>

          <button
            type="button"
            onClick={() => appendDigit('0', isTarget)}
            className="h-14 rounded-2xl font-display font-semibold text-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => removeLastDigit(isTarget)}
            aria-label="Sudda"
            className="h-14 rounded-2xl text-[var(--text-primary)] flex items-center justify-center hover:bg-[var(--surface-color)]/60 active:bg-[var(--surface-color)] active:scale-95 transition-all cursor-pointer"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
              <line x1="18" y1="9" x2="12" y2="15" />
              <line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>
      );
    };

    const stepHeading =
      wizardStep === 1
        ? 'Vad sparar du till?'
        : wizardStep === 2
        ? 'Välj bild till ditt mål'
        : wizardStep === 3
        ? 'Hur mycket behöver du spara?'
        : wizardStep === 4
        ? 'Hur vill du följa sparandet?'
        : wizardStep === 5
        ? 'Hur mycket har du sparat hittills?'
        : 'Hur mycket sparar du varje månad?';

    return createPortal(
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-[2px] flex flex-col justify-end animate-fade-in"
        onClick={() => setIsCreateWizardOpen(false)}
      >
        {/* Subtle stacked card edge behind the sheet (matches Lunar modal stack) */}
        <div
          className="w-[92%] max-w-[416px] mx-auto h-3 rounded-t-3xl bg-[var(--surface-color)]/60 border-t border-x border-[var(--border-subtle)]/60 -mb-1 pointer-events-none"
          aria-hidden="true"
        />

        {/* Sheet Container (Does NOT cover the whole screen) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md mx-auto h-[89dvh] max-h-[89dvh] rounded-t-3xl bg-[var(--bg-color)] text-[var(--text-primary)] border-t border-[var(--border-subtle)] shadow-[0_-16px_48px_rgba(0,0,0,0.45)] flex flex-col justify-between px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] font-sans overflow-hidden select-none animate-slide-up"
        >
          {/* 1. TOP HEADER (Circular Back button + optional Hoppa över pill + Centered Question) */}
          <header className="shrink-0 space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleBackNavigation}
                className="w-11 h-11 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                aria-label="Tillbaka"
              >
                <CaretLeft size={18} weight="bold" />
              </button>

              {wizardStep === 5 || wizardStep === 6 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 5) {
                      setGoalCurrentInput('0');
                      navigateWizardStep(6, 'forward');
                    } else {
                      setGoalMonthlyInput('');
                      handleSaveGoal(undefined, 0);
                    }
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 active:scale-95 transition-all cursor-pointer"
                >
                  Hoppa över
                </button>
              ) : (
                <div className="w-11" />
              )}
            </div>

            <h2 className="text-[15px] sm:text-base font-medium text-center text-[var(--text-primary)] tracking-[-0.01em]">
              {stepHeading}
            </h2>
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
                if (!hasManuallyPickedArtwork && !goalCustomImage) {
                  setGoalArtworkId(inferArtworkFromGoalName(goalNameInput));
                }
                navigateWizardStep(2, 'forward');
              }}
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="my-auto py-6 flex flex-col items-center justify-center">
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="t.ex. Buffert eller Resa"
                  value={goalNameInput}
                  onChange={(e) => setGoalNameInput(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-center font-display font-bold text-3xl sm:text-4xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/35 tracking-tight focus:outline-none"
                />
              </div>

              <div className="shrink-0 pt-3">
                <button
                  type="submit"
                  disabled={!goalNameInput.trim()}
                  className={`w-full py-4 rounded-full font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    goalNameInput.trim()
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] hover:opacity-90 active:scale-[0.99] cursor-pointer'
                      : 'bg-[var(--surface-color)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  <span>Fortsätt</span>
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEG 2: VÄLJ BILD TILL DITT MÅL (Live-kort + Sök + 3x3 grid)   */}
          {/* ============================================================== */}
          {wizardStep === 2 && (
            <div
              key="goal-step-2"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-3 ${pageAnimClass}`}
            >
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-3 py-1 pr-0.5">
                <div
                  className="relative rounded-2xl overflow-hidden px-4 py-4 min-h-[76px] flex items-center justify-between text-white shadow-sm transition-colors duration-200"
                  style={{
                    background: goalCustomImage ? '#111827' : activeTheme.heroBg,
                  }}
                >
                  {goalCustomImage ? (
                    <>
                      <img
                        src={goalCustomImage}
                        alt={goalNameInput}
                        className="absolute inset-0 w-full h-full object-cover opacity-55"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-black/20" />
                    </>
                  ) : (
                    <div
                      className="absolute -right-5 -top-2 w-24 h-24 pointer-events-none select-none opacity-95"
                      aria-hidden="true"
                    >
                      <GoalArtworkIllustration artworkId={goalArtworkId} />
                    </div>
                  )}

                  <div className="relative z-10 min-w-0 max-w-[68%]">
                    <span className="font-display font-bold text-base sm:text-lg text-white block truncate">
                      {goalNameInput.trim() || 'Nytt sparmål'}
                    </span>
                  </div>
                </div>

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

                <div className="grid grid-cols-3 gap-2.5 content-start">
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
                          <span className="text-[11px] font-medium text-white leading-tight">
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
                        <span className="text-[11px] font-medium text-[var(--text-primary)] leading-tight">
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
                          setHasManuallyPickedArtwork(true);
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
                  className="w-full py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEG 3: HUR MYCKET BEHÖVER DU SPARA? (Stora siffror + Numpad)  */}
          {/* ============================================================== */}
          {wizardStep === 3 && (
            <div
              key="goal-step-3"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="my-auto py-4 flex items-center justify-center">
                <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
                  <span
                    className={
                      Number(goalTargetInput) > 0
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)]/40'
                    }
                  >
                    {Number(goalTargetInput) > 0
                      ? formatInputThousands(goalTargetInput)
                      : '0'}
                  </span>
                  <span className="text-[var(--text-primary)]">kr</span>
                </div>
              </div>

              <div className="shrink-0">
                {renderNumpad(true)}

                <button
                  type="button"
                  disabled={!(Number(goalTargetInput) > 0)}
                  onClick={() => navigateWizardStep(4, 'forward')}
                  className={`w-full py-4 rounded-full font-display font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    Number(goalTargetInput) > 0
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] hover:opacity-90 active:scale-[0.99] cursor-pointer'
                      : 'bg-[var(--surface-color)] text-[var(--text-muted)] cursor-not-allowed'
                  }`}
                >
                  <span>Fortsätt</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEG 4: HUR VILL DU FÖLJA SPARANDET? (Rena valkort)            */}
          {/* ============================================================== */}
          {wizardStep === 4 && (
            <div
              key="goal-step-4"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden pt-4 ${pageAnimClass}`}
            >
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
                <button
                  type="button"
                  onClick={() => setGoalLinkedAccountId(undefined)}
                  className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                    !goalLinkedAccountId
                      ? 'bg-[var(--surface-color)] border-[var(--text-primary)]/40'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-65'
                  }`}
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
                      Välj startbelopp i nästa steg och uppdatera själv
                    </span>
                  </div>
                </button>

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
                  const showBankSub =
                    Boolean(acc.bankName) &&
                    !acc.name.toLowerCase().includes((acc.bankName || '').toLowerCase());

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
                        {(showBankSub || (hasDuplicateName && last4)) && (
                          <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5 truncate">
                            {showBankSub ? acc.bankName : ''}
                            {showBankSub && hasDuplicateName && last4 ? ' · ' : ''}
                            {hasDuplicateName && last4 ? `•••• ${last4}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                        {formatKr(accBal)}
                      </span>
                    </button>
                  );
                })}

                {hasConnectedHouseholdPartner() && (
                  <div className="w-full p-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-color)]/60 flex items-center justify-between gap-3">
                    <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
                      Delat sparmål i hushåll
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={goalIsShared}
                      onClick={() => setGoalIsShared((p) => !p)}
                      className={`ui-switch ${goalIsShared ? 'ui-switch-on' : 'ui-switch-off'}`}
                    >
                      <span
                        className={`ui-switch-thumb ${
                          goalIsShared ? 'ui-switch-thumb-on' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              <div className="shrink-0 pt-3">
                {!goalLinkedAccountId ? (
                  <button
                    type="button"
                    onClick={() => navigateWizardStep(5, 'forward')}
                    className="w-full py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Fortsätt</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                    onClick={() => handleSaveGoal()}
                    className="w-full py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <span>Skapa sparmål</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEG 5: HUR MYCKET HAR DU SPARAT HITTILLS? (Stora siffror)     */}
          {/* ============================================================== */}
          {wizardStep === 5 && (
            <div
              key="goal-step-5"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <div className="my-auto py-4 flex items-center justify-center">
                <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
                  <span
                    className={
                      Number(goalCurrentInput) > 0
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)]/40'
                    }
                  >
                    {Number(goalCurrentInput) > 0
                      ? formatInputThousands(goalCurrentInput)
                      : '0'}
                  </span>
                  <span className="text-[var(--text-primary)]">kr</span>
                </div>
              </div>

              <div className="shrink-0">
                {renderNumpad(false)}

                <button
                  type="button"
                  disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                  onClick={() => navigateWizardStep(6, 'forward')}
                  className="w-full py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STEG 6: MÅNADSSPARANDE – dras av från "kvar att spendera"       */}
          {/* ============================================================== */}
          {wizardStep === 6 && (
            <div
              key="goal-step-6"
              className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
            >
              <p className="pt-1 text-sm text-[var(--text-secondary)] leading-[1.45] text-center max-w-xs mx-auto">
                Dras av från det du har kvar att spendera varje lönedag och läggs till i målet automatiskt.
                Du kan hoppa över och sätta in pengar själv när du vill.
              </p>
              <div className="my-auto py-4 flex flex-col items-center justify-center gap-2">
                <div className="flex items-baseline justify-center gap-2.5 font-display font-bold text-5xl sm:text-6xl tracking-tight tabular-nums">
                  <span
                    className={
                      Number(goalMonthlyInput) > 0
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)]/40'
                    }
                  >
                    {Number(goalMonthlyInput) > 0 ? formatInputThousands(goalMonthlyInput) : '0'}
                  </span>
                  <span className="text-[var(--text-primary)]">kr</span>
                </div>
                {Number(goalMonthlyInput) > 0 && Number(goalTargetInput) > 0 && (
                  <span className="text-sm text-[var(--text-secondary)]">
                    {(() => {
                      const left = Math.max(
                        0,
                        Number(goalTargetInput) - (Number(goalCurrentInput) || 0)
                      );
                      const months = Math.ceil(left / Number(goalMonthlyInput));
                      return left === 0
                        ? 'Du har redan nått målet 🎉'
                        : months === 1
                        ? 'Du når målet om 1 månad'
                        : `Du når målet om ${months} månader`;
                    })()}
                  </span>
                )}
              </div>

              <div className="shrink-0">
                {renderNumpad(false)}

                <button
                  type="button"
                  disabled={!goalNameInput.trim() || !(Number(goalTargetInput) > 0)}
                  onClick={() => handleSaveGoal()}
                  className="w-full py-4 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                >
                  <span>Skapa sparmål</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body
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
                        {hasConnectedHouseholdPartner() && goal.isShared ? (
                          <span className="text-[11px] font-normal text-[var(--text-secondary)]">
                            {' '}· Delat
                          </span>
                        ) : null}
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
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs transition-transform active:scale-95 cursor-pointer"
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

