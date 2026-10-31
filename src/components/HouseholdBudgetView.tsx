import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Copy,
  Check,
  Plus,
  Scales,
  Sparkle,
  SignOut,
  ArrowsLeftRight,
  UserPlus,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem } from './HomeTab';
import { PeriodInfo } from '../utils/periodEngine';
import { CategoryIcon } from './CategoryIcon';
import {
  getStoredExpenseCategories,
  getSavingsGoals,
  saveSavingsGoals,
} from '../utils/appCache';
import {
  HouseholdState,
  HouseholdMemberSummary,
  getHouseholdState,
  saveHouseholdStateLocal,
  generateInviteCode,
  formatInviteCodeDisplay,
  getMemberKey,
  computeMyHouseholdSummary,
  calculateHouseholdSettlement,
  pushHouseholdSyncToServer,
} from '../utils/householdSync';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface HouseholdBudgetViewProps {
  period: PeriodInfo;
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  onAddFixed?: (data: Omit<FixedExpenseItem, 'id'>) => Promise<any> | void;
}

export const HouseholdBudgetView: React.FC<HouseholdBudgetViewProps> = ({
  period,
  userEmail,
  userName,
  userAvatar,
  incomes,
  fixedExpenses,
  transactions,
  onAddFixed,
}) => {
  const [household, setHousehold] = useState<HouseholdState | null>(() => getHouseholdState());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSwishAmt, setCopiedSwishAmt] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Manual partner editor (if user wants to enter partner's income/shared outlays or test with a partner)
  const [partnerNameInput, setPartnerNameInput] = useState('');
  const [partnerIncomeInput, setPartnerIncomeInput] = useState('');
  const [partnerPaidInput, setPartnerPaidInput] = useState('');
  const [isEditingPartner, setIsEditingPartner] = useState(false);

  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  const myKey = useMemo(() => getMemberKey(userEmail, userName), [userEmail, userName]);

  const expenseCategories = useMemo(
    () =>
      getStoredExpenseCategories().filter(
        (c) => c.name !== 'Sparande' && c.name !== 'Swish'
      ),
    []
  );

  // Listen for realtime updates
  useEffect(() => {
    const onUpdate = () => {
      setHousehold(getHouseholdState());
    };
    window.addEventListener('dejz:household-updated', onUpdate);
    return () => window.removeEventListener('dejz:household-updated', onUpdate);
  }, []);

  // Recompute my member summary whenever my incomes, fixedExpenses, transactions, or sharedCategories change
  useEffect(() => {
    if (!household) return;
    const mySummary = computeMyHouseholdSummary({
      userEmail,
      userName,
      userAvatar,
      period,
      incomes,
      fixedExpenses,
      transactions,
      sharedCategories: household.sharedCategories || ['Mat & dryck', 'Boende', 'Räkningar'],
    });

    const existingMe = household.members?.[myKey];
    const hasChanged =
      !existingMe ||
      existingMe.totalIncome !== mySummary.totalIncome ||
      existingMe.sharedFixedPaid !== mySummary.sharedFixedPaid ||
      existingMe.sharedVariableSpent !== mySummary.sharedVariableSpent ||
      existingMe.name !== mySummary.name ||
      existingMe.sharedExpensesList.length !== mySummary.sharedExpensesList.length;

    if (hasChanged) {
      const nextState: HouseholdState = {
        ...household,
        members: {
          ...(household.members || {}),
          [myKey]: mySummary,
        },
        sharedFixedExpenses: fixedExpenses.filter((f) => f.isShared),
        sharedSavingsGoals: getSavingsGoals(),
        updatedAt: new Date().toISOString(),
      };
      setHousehold(nextState);
      void pushHouseholdSyncToServer(nextState);
    }
  }, [
    incomes,
    fixedExpenses,
    transactions,
    period,
    userEmail,
    userName,
    userAvatar,
    myKey,
  ]);

  const handleCreateHousehold = async () => {
    const code = generateInviteCode();
    const defaultCats = ['Mat & dryck', 'Boende', 'Räkningar'];
    const mySummary = computeMyHouseholdSummary({
      userEmail,
      userName,
      userAvatar,
      period,
      incomes,
      fixedExpenses,
      transactions,
      sharedCategories: defaultCats,
    });

    const newHh: HouseholdState = {
      householdId: `hh-${code}`,
      inviteCode: code,
      name: 'Vårt hushåll',
      splitMode: 'equal',
      sharedCategories: defaultCats,
      members: {
        [myKey]: mySummary,
      },
      sharedFixedExpenses: fixedExpenses.filter((f) => f.isShared),
      sharedSavingsGoals: getSavingsGoals(),
      updatedAt: new Date().toISOString(),
    };

    setHousehold(newHh);
    await pushHouseholdSyncToServer(newHh);
  };

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.replace(/\s+/g, '').toUpperCase();
    if (cleanCode.length < 4) {
      setJoinError('Ange en giltig 6-siffrig inbjudningskod.');
      return;
    }
    setJoining(true);
    setJoinError(null);

    try {
      const defaultCats = ['Mat & dryck', 'Boende', 'Räkningar'];
      const mySummary = computeMyHouseholdSummary({
        userEmail,
        userName,
        userAvatar,
        period,
        incomes,
        fixedExpenses,
        transactions,
        sharedCategories: defaultCats,
      });

      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode: cleanCode,
          memberSummary: mySummary,
          memberFixedExpenses: fixedExpenses.filter((f) => f.isShared),
          memberSavingsGoals: getSavingsGoals(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.household) {
        setJoinError(
          data?.error || 'Kunde inte hitta något hushåll med den koden. Kontrollera koden.'
        );
        setJoining(false);
        return;
      }

      const joinedHh: HouseholdState = data.household;
      saveHouseholdStateLocal(joinedHh);
      setHousehold(joinedHh);

      // Merge any shared fixed expenses from partner that we don't have locally yet
      if (onAddFixed && Array.isArray(joinedHh.sharedFixedExpenses)) {
        for (const sf of joinedHh.sharedFixedExpenses) {
          const exists = fixedExpenses.some(
            (f) => f.name.toLowerCase().trim() === sf.name.toLowerCase().trim()
          );
          if (!exists) {
            await onAddFixed({
              name: sf.name,
              amount: sf.amount,
              fullAmount: sf.fullAmount,
              isShared: true,
              dueDay: sf.dueDay || 27,
              category: sf.category || 'Boende',
              paymentMethod: sf.paymentMethod || 'Autogiro',
            });
          }
        }
      }

      if (Array.isArray(joinedHh.sharedSavingsGoals) && joinedHh.sharedSavingsGoals.length > 0) {
        saveSavingsGoals(joinedHh.sharedSavingsGoals);
      }
    } catch {
      setJoinError('Kunde inte ansluta just nu. Försök igen.');
    } finally {
      setJoining(false);
    }
  };

  const handleAddOrUpdateManualPartner = async () => {
    if (!household) return;
    const pName = partnerNameInput.trim() || 'Partner';
    const pInc = Math.max(0, Math.round(Number(partnerIncomeInput) || 29500));
    const pPaid = Math.max(0, Math.round(Number(partnerPaidInput) || 4800));
    const partnerKey = 'partner@demo.dejz';

    const partnerMember: HouseholdMemberSummary = {
      email: partnerKey,
      name: pName,
      totalIncome: pInc,
      sharedFixedPaid: Math.round(pPaid * 0.5),
      sharedVariableSpent: Math.round(pPaid * 0.5),
      sharedExpensesList:
        pPaid > 0
          ? [
              {
                id: 'partner-shared-1',
                title: `${pName}s gemensamma utlägg`,
                amount: Math.round(pPaid / 2),
                fullAmount: pPaid,
                category: 'Mat & dryck',
                kind: 'variable',
                paidByEmail: partnerKey,
                paidByName: pName,
              },
            ]
          : [],
      isDemoPartner: true,
      updatedAt: new Date().toISOString(),
    };

    const nextHh: HouseholdState = {
      ...household,
      members: {
        ...(household.members || {}),
        [partnerKey]: partnerMember,
      },
      updatedAt: new Date().toISOString(),
    };

    setHousehold(nextHh);
    setIsEditingPartner(false);
    await pushHouseholdSyncToServer(nextHh);
  };

  const handleToggleSharedCategory = async (catName: string) => {
    if (!household) return;
    const current = household.sharedCategories || [];
    const exists = current.some((c) => c.toLowerCase() === catName.toLowerCase());
    const nextCats = exists
      ? current.filter((c) => c.toLowerCase() !== catName.toLowerCase())
      : [...current, catName];

    const mySummary = computeMyHouseholdSummary({
      userEmail,
      userName,
      userAvatar,
      period,
      incomes,
      fixedExpenses,
      transactions,
      sharedCategories: nextCats,
    });

    const nextHh: HouseholdState = {
      ...household,
      sharedCategories: nextCats,
      members: {
        ...(household.members || {}),
        [myKey]: mySummary,
      },
      updatedAt: new Date().toISOString(),
    };

    setHousehold(nextHh);
    await pushHouseholdSyncToServer(nextHh);
  };

  const handleChangeSplitMode = async (mode: 'equal' | 'income') => {
    if (!household) return;
    const nextHh: HouseholdState = {
      ...household,
      splitMode: mode,
      updatedAt: new Date().toISOString(),
    };
    setHousehold(nextHh);
    await pushHouseholdSyncToServer(nextHh);
  };

  const handleToggleSettled = async () => {
    if (!household) return;
    const isCurrentlySettled =
      household.settledAt && household.settledPeriodStart === period.startDate;
    const nextHh: HouseholdState = {
      ...household,
      settledAt: isCurrentlySettled ? undefined : new Date().toISOString(),
      settledPeriodStart: isCurrentlySettled ? undefined : period.startDate,
      updatedAt: new Date().toISOString(),
    };
    setHousehold(nextHh);
    await pushHouseholdSyncToServer(nextHh);
  };

  const handleLeaveHousehold = () => {
    saveHouseholdStateLocal(null);
    setHousehold(null);
    setShowLeaveConfirm(false);
  };

  // ==============================================================
  // VIEW 1: NOT CONNECTED TO A HOUSEHOLD YET
  // ==============================================================
  if (!household) {
    return (
      <div className="ui-page animate-slide-in-right">
        <section className="ui-card p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
              <Users size={22} weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display font-bold text-base text-[var(--text-primary)]">
                Delad budget för två
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Synka fasta utgifter, gemensamma matköp och sparmål med din partner. Appen räknar automatiskt ut vem som har lagt ut vad under löneperioden.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateHousehold}
            className="w-full ui-btn-primary"
          >
            <Plus size={15} weight="bold" />
            <span>Skapa gemensamt hushåll</span>
          </button>
        </section>

        <section className="ui-card p-5 space-y-3.5">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">
              Har din partner redan en kod?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Skriv in den 6-siffriga inbjudningskoden från din partners app för att koppla ihop era budgetar.
            </p>
          </div>

          <form onSubmit={handleJoinHousehold} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              maxLength={7}
              value={joinCodeInput}
              onChange={(e) => {
                setJoinCodeInput(e.target.value.replace(/[^0-9A-Za-z\s]/g, ''));
                setJoinError(null);
              }}
              placeholder="T.ex. 482 910"
              className="w-full rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-3 font-display font-bold text-base tracking-widest text-center text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--text-primary)]"
            />

            {joinError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 text-center">
                {joinError}
              </p>
            )}

            <button
              type="submit"
              disabled={joining || joinCodeInput.trim().length < 4}
              className="w-full ui-btn-secondary disabled:opacity-40"
            >
              {joining ? 'Ansluter...' : 'Anslut med kod'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: ACTIVE HOUSEHOLD DASHBOARD
  // ==============================================================
  const settlement = calculateHouseholdSettlement(household, myKey, period.startDate);
  const {
    myMember,
    partnerMember,
    myShareRatio,
    partnerShareRatio,
    myTotalPaid,
    partnerTotalPaid,
    combinedTotalShared,
    myFairShare,
    partnerFairShare,
    netBalance,
    isSettledForCurrentPeriod,
  } = settlement;

  const allSharedEntries = [
    ...(myMember.sharedExpensesList || []),
    ...(partnerMember?.sharedExpensesList || []),
  ];

  return (
    <div className="ui-page animate-slide-in-right">
      {/* 1. Hushållskort + Inbjudningskod + Medlemmar */}
      <section className="ui-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
              Synkad hushållsbudget
            </span>
            <h2 className="font-display font-bold text-base sm:text-lg text-[var(--text-primary)]">
              {household.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(household.inviteCode);
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-display font-bold text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer tabular-nums"
            title="Kopiera inbjudningskod"
          >
            <span>Kod: {formatInviteCodeDisplay(household.inviteCode)}</span>
            {copiedCode ? (
              <Check size={13} weight="bold" className="text-emerald-500" />
            ) : (
              <Copy size={13} className="text-[var(--text-secondary)]" />
            )}
          </button>
        </div>

        {/* Medlemmar */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-display font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                {(myMember.name || 'J').slice(0, 2)}
              </div>
              <div className="min-w-0">
                <span className="font-display font-semibold text-xs text-[var(--text-primary)] block truncate">
                  {myMember.name} (Du)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] tabular-nums block">
                  Inkomst: {formatKr(myMember.totalIncome)}
                </span>
              </div>
            </div>
          </div>

          {partnerMember ? (
            <button
              type="button"
              onClick={() => {
                setPartnerNameInput(partnerMember.name);
                setPartnerIncomeInput(String(partnerMember.totalIncome || ''));
                setPartnerPaidInput(String(partnerTotalPaid || ''));
                setIsEditingPartner((v) => !v);
              }}
              className="rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] p-3.5 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-display font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                  {(partnerMember.name || 'P').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <span className="font-display font-semibold text-xs text-[var(--text-primary)] block truncate">
                    {partnerMember.name}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)] tabular-nums block">
                    Inkomst: {formatKr(partnerMember.totalIncome)}
                  </span>
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPartnerNameInput('Partner');
                setPartnerIncomeInput('29500');
                setPartnerPaidInput('4800');
                setIsEditingPartner(true);
              }}
              className="rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-dashed border-[var(--border-control)] p-3.5 text-left flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                <UserPlus size={15} weight="bold" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-semibold text-xs text-[var(--text-primary)] block truncate">
                  Lägg till partner
                </span>
                <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                  Dela kod eller ange manuellt
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Formulär för att ange/uppdatera partners inkomst & utlägg manuellt (eller innan partnern loggat in) */}
        {isEditingPartner && (
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3 animate-fade-in">
            <span className="text-xs font-semibold text-[var(--text-primary)] block">
              Ange eller simulera partners uppgifter
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Partners namn
                </span>
                <input
                  type="text"
                  value={partnerNameInput}
                  onChange={(e) => setPartnerNameInput(e.target.value)}
                  placeholder="Alex"
                  className="w-full rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Nettoinkomst (kr/mån)
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={partnerIncomeInput}
                  onChange={(e) =>
                    setPartnerIncomeInput(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="29500"
                  className="w-full rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] px-3 py-2 text-xs tabular-nums text-[var(--text-primary)] focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-1">
                  Partners utlägg i perioden
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={partnerPaidInput}
                  onChange={(e) =>
                    setPartnerPaidInput(e.target.value.replace(/[^\d]/g, ''))
                  }
                  placeholder="4800"
                  className="w-full rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] px-3 py-2 text-xs tabular-nums text-[var(--text-primary)] focus:outline-none"
                />
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingPartner(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handleAddOrUpdateManualPartner}
                className="px-4 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold cursor-pointer"
              >
                Spara partner
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Utjämningskalkyl ("Vem är skyldig vem?" i perioden) */}
      <section className="ui-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scales size={18} weight="duotone" className="text-[var(--text-secondary)] shrink-0" />
            <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">
              Utjämning i löneperioden
            </h3>
          </div>
          <span className="text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
            Totalt delat: {formatKr(combinedTotalShared)}
          </span>
        </div>

        {/* Fördelningsmodell: 50/50 vs Procentuellt efter lön */}
        <div className="ui-segmented grid-cols-2">
          <button
            type="button"
            onClick={() => handleChangeSplitMode('equal')}
            className={`ui-segmented-tab ${
              household.splitMode === 'equal' ? 'ui-segmented-tab-active' : ''
            }`}
          >
            Dela lika (50 / 50)
          </button>
          <button
            type="button"
            onClick={() => handleChangeSplitMode('income')}
            className={`ui-segmented-tab ${
              household.splitMode === 'income' ? 'ui-segmented-tab-active' : ''
            }`}
          >
            Efter inkomst ({Math.round(myShareRatio * 100)} / {Math.round(partnerShareRatio * 100)} %)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs tabular-nums">
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--text-secondary)] block">
              {myMember.name} har betalat
            </span>
            <span className="font-display font-bold text-base text-[var(--text-primary)] block">
              {formatKr(myTotalPaid)}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block">
              Andel ({Math.round(myShareRatio * 100)} %): {formatKr(myFairShare)}
            </span>
          </div>

          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5 space-y-1">
            <span className="text-[11px] text-[var(--text-secondary)] block">
              {partnerMember ? `${partnerMember.name} har betalat` : 'Partner har betalat'}
            </span>
            <span className="font-display font-bold text-base text-[var(--text-primary)] block">
              {formatKr(partnerTotalPaid)}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] block">
              Andel ({Math.round(partnerShareRatio * 100)} %): {formatKr(partnerFairShare)}
            </span>
          </div>
        </div>

        {/* Resultat-banner: Vem ska Swisha vem? */}
        <div
          className={`rounded-2xl p-4 border flex items-center justify-between gap-3 ${
            isSettledForCurrentPeriod || Math.abs(netBalance) < 5
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
              : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-primary)]'
          }`}
        >
          <div className="min-w-0">
            <span className="text-xs font-semibold block">
              {isSettledForCurrentPeriod
                ? 'Periodens utlägg är markerade som utjämnade!'
                : !partnerMember
                ? `Din andel av gemensamma utgifter är ${formatKr(myFairShare)}`
                : Math.abs(netBalance) < 5
                ? 'Ni ligger helt jämnt i denna period!'
                : netBalance > 0
                ? `${partnerMember.name} är skyldig dig ${formatKr(netBalance)}`
                : `Du är skyldig ${partnerMember.name} ${formatKr(Math.abs(netBalance))}`}
            </span>
            <span className="text-[11px] opacity-80 block mt-0.5">
              {isSettledForCurrentPeriod
                ? 'Tryck på knappen om ni vill öppna avräkningen igen'
                : partnerMember
                ? 'Baserat på era delade fasta räkningar och gemensamma köp i perioden'
                : 'Bjud in din partner med koden ovan för att jämföra bådas utlägg'}
            </span>
          </div>

          {partnerMember && Math.abs(netBalance) >= 5 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {!isSettledForCurrentPeriod && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(String(Math.abs(netBalance)));
                    setCopiedSwishAmt(true);
                    setTimeout(() => setCopiedSwishAmt(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
                  title="Kopiera belopp för Swish"
                >
                  {copiedSwishAmt ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>Belopp</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleToggleSettled}
                className="px-3 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-[11px] font-semibold cursor-pointer"
              >
                {isSettledForCurrentPeriod ? 'Ångra' : 'Utjämnat'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Automatiskt delade utgiftskategorier */}
      <section className="ui-card p-5 space-y-3.5">
        <div>
          <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">
            Kategorier som delas automatiskt
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Rörliga köp i valda kategorier räknas automatiskt in i hushållets gemensamma utjämning. Du kan även markera enskilda köp direkt i transaktionsvyn.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {expenseCategories.map((cat) => {
            const isSelected = (household.sharedCategories || []).some(
              (c) => c.toLowerCase() === cat.name.toLowerCase()
            );
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleToggleSharedCategory(cat.name)}
                className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                    : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <CategoryIcon category={cat.name} size={13} />
                <span>{cat.name}</span>
                {isSelected && <Check size={12} weight="bold" />}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Gemensamma poster i perioden */}
      {allSharedEntries.length > 0 && (
        <section className="ui-section">
          <div className="ui-section-header">
            <h3 className="ui-section-title">
              Gemensamma utgifter i perioden ({allSharedEntries.length})
            </h3>
          </div>
          <div className="ui-list-card">
            {allSharedEntries.slice(0, 20).map((entry) => (
              <div
                key={`${entry.paidByEmail}-${entry.id}`}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    <CategoryIcon category={entry.category} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title truncate block">{entry.title}</span>
                    <span className="ui-row-subtitle block truncate">
                      Betald av {entry.paidByName} · {entry.kind === 'fixed' ? 'Fast utgift' : 'Rörligt köp'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <span className="font-display font-semibold text-xs text-[var(--text-primary)] block">
                    {formatKr(entry.fullAmount)}
                  </span>
                  <span className="text-[10.5px] text-[var(--text-secondary)] block">
                    Din del: {formatKr(Math.round(entry.fullAmount * myShareRatio))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Lämna hushåll */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowLeaveConfirm(true)}
          className="w-full py-3 rounded-2xl bg-[var(--surface-color)] hover:bg-rose-500/8 border border-[var(--border-subtle)] text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <SignOut size={15} weight="bold" />
          <span>Koppla från delad budget</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Koppla från delad budget?"
        description="Dina egna bankkonton, fasta utgifter och transaktioner finns kvar precis som vanligt, men synkningen med hushållet avslutas."
        confirmLabel="Koppla från"
        cancelLabel="Avbryt"
        variant="danger"
        onConfirm={handleLeaveHousehold}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
};
