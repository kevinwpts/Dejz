import React, { useState, useRef, useMemo } from 'react';
import {
  Plus,
  Minus,
  PencilSimple,
  Trash,
  Check,
  CaretLeft,
  MagnifyingGlass,
  ImageSquare,
  X,
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
import { TransactionItem } from './HomeTab';

interface SavingsGoalsViewProps {
  onGoalsChanged?: (goals: SavingsGoalItem[]) => void;
  userName?: string | null;
  transactions?: TransactionItem[];
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  onGoalsChanged,
  userName,
  transactions = [],
}) => {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalItem[]>(() => getSavingsGoals());
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Create / Edit Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'form' | 'artwork' | 'created'>('form');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [goalNameInput, setGoalNameInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalCurrentInput, setGoalCurrentInput] = useState('');
  const [goalArtworkId, setGoalArtworkId] = useState<string>('piggy');
  const [goalCustomImage, setGoalCustomImage] = useState<string | undefined>(undefined);
  const [artworkSearch, setArtworkSearch] = useState('');
  const [newlyCreatedGoalId, setNewlyCreatedGoalId] = useState<string | null>(null);
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

  const openCreateGoal = () => {
    setEditingGoalId(null);
    setGoalNameInput('');
    setGoalTargetInput('');
    setGoalCurrentInput('');
    setGoalArtworkId('piggy');
    setGoalCustomImage(undefined);
    setArtworkSearch('');
    setModalStep('form');
    setIsGoalModalOpen(true);
  };

  const openEditGoal = (goal: SavingsGoalItem) => {
    setEditingGoalId(goal.id);
    setGoalNameInput(goal.name);
    setGoalTargetInput(String(goal.targetAmount));
    setGoalCurrentInput(String(goal.currentAmount));
    setGoalArtworkId(goal.artworkId || 'piggy');
    setGoalCustomImage(goal.customImageUrl);
    setArtworkSearch('');
    setModalStep('form');
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
    const cleanCurr = Math.max(0, Math.round(Number(goalCurrentInput) || 0));
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
        artworkId: goalArtworkId,
        customImageUrl: goalCustomImage,
        createdAt: todayIso,
        activities: [
          {
            id: `act-${Date.now()}`,
            text: 'Du har skapat ditt mål',
            date: todayIso,
          },
        ],
      };
      updateGoals([...savingsGoals, newGoal]);
      setNewlyCreatedGoalId(newId);
      setModalStep('created');
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

  const totalSaved = savingsGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

  // ============================================================================
  // GOAL DETAIL VIEW (Lunar Screenshot #4: Colored Hero + Cropped Artwork + Actions)
  // ============================================================================
  if (selectedGoal) {
    const theme = getGoalArtworkTheme(selectedGoal.artworkId);
    const pct =
      selectedGoal.targetAmount > 0
        ? Math.min(100, Math.round((selectedGoal.currentAmount / selectedGoal.targetAmount) * 100))
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
                {formatKr(selectedGoal.currentAmount)}
              </span>
              <span className="text-xs text-white/75 tabular-nums block mt-0.5">
                av {formatKr(selectedGoal.targetAmount)}
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
  // MODAL HELPER (Handles Form Step, Artwork Picker Step #8, and "Mål skapat" #1)
  // ============================================================================
  function renderGoalModal() {
    const activeTheme = getGoalArtworkTheme(goalArtworkId);

    return (
      <BottomSheet
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setModalStep('form');
        }}
        title={
          modalStep === 'artwork'
            ? undefined
            : modalStep === 'created'
            ? undefined
            : editingGoalId
            ? 'Redigera sparmål'
            : 'Nytt sparmål'
        }
      >
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleGalleryUpload}
          className="hidden"
        />

        {/* STEP 3: "Mål skapat" Confirmation Screen (Exact match to Lunar Screenshot #1) */}
        {modalStep === 'created' && (
          <div className="py-8 flex flex-col items-center justify-between min-h-[340px] text-center animate-fade-in">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full border-[3.5px] border-[var(--text-primary)] flex items-center justify-center mb-5 animate-scale-in">
                <Check size={42} weight="bold" className="text-[var(--text-primary)]" />
              </div>
              <h3 className="font-display font-semibold text-xl text-[var(--text-primary)]">
                Mål skapat
              </h3>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsGoalModalOpen(false);
                setModalStep('form');
                if (newlyCreatedGoalId) {
                  setSelectedGoalId(newlyCreatedGoalId);
                }
              }}
              className="w-full py-3.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm transition-transform active:scale-[0.98] cursor-pointer mt-6"
            >
              Klart
            </button>
          </div>
        )}

        {/* STEP 2: Artwork Picker ("Vilken bild passar till ditt mål?" – Lunar Screenshot #8) */}
        {modalStep === 'artwork' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalStep('form')}
                className="w-9 h-9 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] cursor-pointer"
              >
                <CaretLeft size={16} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => setIsGoalModalOpen(false)}
                className="w-9 h-9 rounded-full bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <h3 className="font-display font-bold text-xl text-[var(--text-primary)] tracking-tight">
                Vilken bild passar till ditt mål?
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Sök efter den perfekta bilden till ditt mål
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={artworkSearch}
                onChange={(e) => setArtworkSearch(e.target.value)}
                placeholder="Sök efter bild"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>

            {/* 3x3 Grid: Tile 1 = Upload from gallery, Tiles 2..9 = Curated Artworks */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className={`aspect-square rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden ${
                  goalCustomImage
                    ? 'ring-2 ring-[var(--text-primary)]'
                    : 'bg-[var(--bg-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
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
                      Ladda upp bild från galleriet
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
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setModalStep('form')}
              className="w-full py-3.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-sm transition-transform active:scale-[0.98] cursor-pointer mt-2"
            >
              Fortsätt
            </button>
          </div>
        )}

        {/* STEP 1: Goal Form */}
        {modalStep === 'form' && (
          <div className="space-y-4">
            {!editingGoalId && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Buffert', target: 30000, art: 'piggy' },
                  { label: 'Semester', target: 15000, art: 'beach' },
                  { label: 'Kontantinsats', target: 150000, art: 'house' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setGoalNameInput(preset.label);
                      setGoalTargetInput(String(preset.target));
                      setGoalArtworkId(preset.art);
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
                        goalNameInput === preset.label
                          ? 'opacity-80'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {formatKr(preset.target)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Artwork selector preview + Name + Target */}
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setModalStep('artwork')}
                  title="Välj bild för ditt mål"
                  style={{
                    backgroundColor: goalCustomImage ? undefined : activeTheme.tileBg,
                  }}
                  className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 relative group cursor-pointer border border-black/10 dark:border-white/10"
                >
                  {goalCustomImage ? (
                    <img
                      src={goalCustomImage}
                      alt="Målbild"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <GoalArtworkIllustration
                      artworkId={goalArtworkId}
                      className="w-12 h-12"
                    />
                  )}
                  <span className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-semibold text-white transition-opacity">
                    Byt
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-0.5">
                      Namn på mål
                    </span>
                    <button
                      type="button"
                      onClick={() => setModalStep('artwork')}
                      className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Välj bild
                    </button>
                  </div>
                  <input
                    type="text"
                    autoFocus={!editingGoalId}
                    value={goalNameInput}
                    onChange={(e) => setGoalNameInput(e.target.value)}
                    placeholder="t.ex. PlayStation eller Resa"
                    className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-3.5">
                <label className="block cursor-text">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-0.5">
                    Målbelopp
                  </span>
                  <div className="flex items-baseline justify-between gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={goalTargetInput}
                      onChange={(e) =>
                        setGoalTargetInput(e.target.value.replace(/[^\d]/g, ''))
                      }
                      placeholder="5000"
                      className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
                    />
                    <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                      kr
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Sparat hittills */}
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3">
              <label className="block cursor-text">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-0.5">
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
                onClick={handleSaveGoal}
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>{editingGoalId ? 'Spara ändringar' : 'Skapa mål'}</span>
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
                if (selectedGoalId === editingGoalId) {
                  setSelectedGoalId(null);
                }
                setShowDeleteConfirm(false);
                setIsGoalModalOpen(false);
              }}
              onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        )}
      </BottomSheet>
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
                const pct =
                  goal.targetAmount > 0
                    ? Math.min(
                        100,
                        Math.round((goal.currentAmount / goal.targetAmount) * 100)
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
                        <span className="ui-row-title truncate">{goal.name}</span>
                        <span className="font-display font-semibold text-sm text-[var(--text-primary)] tabular-nums shrink-0">
                          {formatKr(goal.currentAmount)}
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
