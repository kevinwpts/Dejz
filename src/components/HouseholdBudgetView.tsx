import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Copy,
  Check,
  Plus,
  SignOut,
  UserPlus,
  ChatCircleDots,
  SlidersHorizontal,
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
  clearHouseholdStateLocal,
  generateInviteCode,
  getMemberKey,
  computeMyHouseholdSummary,
  calculateHouseholdSettlement,
  pushHouseholdSyncToServer,
} from '../utils/householdSync';
import {
  SocialFriend,
  getStoredFriends,
  saveStoredFriends,
  getMyFriendInviteCode,
  sendChatMessage,
} from '../utils/friendsChatSync';
import { BottomSheet } from './ui/BottomSheet';
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
  onOpenFriendsChat?: (friendKey?: string | null) => void;
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
  onOpenFriendsChat,
}) => {
  const [household, setHousehold] = useState<HouseholdState | null>(() => getHouseholdState());
  const [friends, setFriends] = useState<SocialFriend[]>(() => getStoredFriends());
  const [isJoinSheetOpen, setIsJoinSheetOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSwishAmt, setCopiedSwishAmt] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [partnerNameForJoin, setPartnerNameForJoin] = useState('');

  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  const myKey = useMemo(() => getMemberKey(userEmail, userName), [userEmail, userName]);
  const myPersonalCode = useMemo(() => getMyFriendInviteCode(userEmail), [userEmail]);

  const expenseCategories = useMemo(
    () =>
      getStoredExpenseCategories().filter(
        (c) => c.name !== 'Sparande' && c.name !== 'Swish'
      ),
    []
  );

  useEffect(() => {
    const onUpdate = () => {
      setHousehold(getHouseholdState());
    };
    const onSocialUpdate = () => {
      setFriends(getStoredFriends());
    };
    window.addEventListener('dejz:household-updated', onUpdate);
    window.addEventListener('dejz:social-updated', onSocialUpdate);
    return () => {
      window.removeEventListener('dejz:household-updated', onUpdate);
      window.removeEventListener('dejz:social-updated', onSocialUpdate);
    };
  }, []);

  const handleQuickConnectFriendToHousehold = async (friend: SocialFriend) => {
    const code = household?.inviteCode || generateInviteCode();
    const defaultCats = household?.sharedCategories || ['Mat & dryck', 'Boende', 'Räkningar'];
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

    const partnerMember: HouseholdMemberSummary = {
      email: friend.email || friend.key,
      name: friend.name,
      avatar: friend.avatar || null,
      totalIncome: 29500,
      sharedFixedPaid: 0,
      sharedVariableSpent: 0,
      sharedExpensesList: [],
      updatedAt: new Date().toISOString(),
    };

    const nextHh: HouseholdState = {
      householdId: household?.householdId || `hh-${code}`,
      inviteCode: code,
      name: `${mySummary.name} & ${friend.name}`,
      splitMode: household?.splitMode || 'equal',
      sharedCategories: defaultCats,
      members: {
        ...(household?.members || {}),
        [myKey]: mySummary,
        [friend.key]: partnerMember,
      },
      sharedFixedExpenses: fixedExpenses.filter((f) => f.isShared),
      sharedSavingsGoals: getSavingsGoals(),
      updatedAt: new Date().toISOString(),
    };

    setHousehold(nextHh);
    saveHouseholdStateLocal(nextHh);
    setIsSettingsOpen(false);
    await pushHouseholdSyncToServer(nextHh);

    await sendChatMessage({
      myKey,
      myName: mySummary.name || 'Jag',
      myAvatar: userAvatar,
      friendKey: friend.key,
      text: `Jag har kopplat ihop dig med vår delade budget (${nextHh.name})!`,
      sharedPayload: {
        kind: 'household_invite',
        title: nextHh.name,
        inviteCode: nextHh.inviteCode,
        householdName: nextHh.name,
      },
    });
  };

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

  const handleJoinHousehold = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCodeInput.replace(/\s+/g, '').toUpperCase();
    if (cleanCode.length < 3) {
      setJoinError('Ange din partners kod eller e-post.');
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

      const data = await res.json().catch(() => null);
      if (res.ok && data?.household) {
        const joinedHh: HouseholdState = data.household;
        saveHouseholdStateLocal(joinedHh);
        setHousehold(joinedHh);
        setIsJoinSheetOpen(false);

        // Ensure partner is also in friends list so chat & household stay 100% unified
        const otherEntry = Object.entries(joinedHh.members || {}).find(([k]) => k !== myKey);
        if (otherEntry) {
          const [otherKey, otherMem] = otherEntry;
          const existingFriends = getStoredFriends();
          if (!existingFriends.some((f) => f.key === otherKey)) {
            const nextFriends: SocialFriend[] = [
              {
                key: otherKey,
                name: otherMem.name || 'Partner',
                email: otherMem.email,
                addedAt: new Date().toISOString(),
              },
              ...existingFriends,
            ];
            saveStoredFriends(nextFriends);
            setFriends(nextFriends);
          }
        }

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
        return;
      }

      // Unified fallback: if entering a friend code (e.g. DJZ 482) or email directly, create/add friend & connect household in one step
      const cleanName = partnerNameForJoin.trim() || 'Partner';
      const friendKey = cleanCode.includes('@')
        ? cleanCode.toLowerCase()
        : `friend-${cleanCode.toLowerCase()}`;
      const existingFriends = getStoredFriends();
      let friendObj = existingFriends.find((f) => f.key === friendKey);
      if (!friendObj) {
        friendObj = {
          key: friendKey,
          name: cleanName,
          email: cleanCode.includes('@') ? cleanCode.toLowerCase() : undefined,
          addedAt: new Date().toISOString(),
        };
        const nextFriends = [friendObj, ...existingFriends];
        saveStoredFriends(nextFriends);
        setFriends(nextFriends);
      }
      await handleQuickConnectFriendToHousehold(friendObj);
      setIsJoinSheetOpen(false);
    } catch {
      setJoinError('Kunde inte ansluta just nu. Försök igen.');
    } finally {
      setJoining(false);
    }
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
    clearHouseholdStateLocal(userEmail, userName);
    setHousehold(null);
    setShowLeaveConfirm(false);
    setIsSettingsOpen(false);
  };

  const settlement = useMemo(
    () =>
      household
        ? calculateHouseholdSettlement(household, myKey, period.startDate)
        : null,
    [household, myKey, period.startDate]
  );

  // ==============================================================
  // VIEW 1: CLEAN ONBOARDING CARD WHEN NOT CONNECTED YET
  // ==============================================================
  if (!household || !settlement || !settlement.partnerMember) {
    return (
      <div className="ui-page animate-slide-in-right">
        <section className="ui-card-p py-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center mx-auto">
            <Users size={22} weight="duotone" />
          </div>

          <div className="space-y-1 max-w-[250px] mx-auto">
            <h2 className="font-display font-semibold text-base text-[var(--text-primary)]">
              Delad ekonomi
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Dela fasta räkningar och gemensamma köp med din partner.
            </p>
          </div>

          {friends.length > 0 && (
            <div className="space-y-2 max-w-[280px] mx-auto">
              <span className="text-[11px] font-medium text-[var(--text-secondary)] block">
                Välj partner från dina vänner
              </span>
              <div className="flex flex-wrap justify-center gap-1.5">
                {friends.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => handleQuickConnectFriendToHousehold(f)}
                    className="px-3.5 py-2 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserPlus size={13} className="text-emerald-500" />
                    <span>Dela med {f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5 max-w-[260px] mx-auto">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-3 text-left flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Din personliga kod
                </span>
                <span className="font-display font-bold text-sm tracking-wider text-[var(--text-primary)] tabular-nums">
                  {myPersonalCode}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(myPersonalCode);
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 1800);
                }}
                className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check size={13} weight="bold" className="text-emerald-500" />
                    <span>Kopierad</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Kopiera</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setJoinError(null);
                setJoinCodeInput('');
                setPartnerNameForJoin('');
                setIsJoinSheetOpen(true);
              }}
              className="w-full ui-btn-primary"
            >
              <UserPlus size={15} weight="bold" />
              <span>Anslut partner med kod</span>
            </button>
          </div>
        </section>

        <BottomSheet
          isOpen={isJoinSheetOpen}
          onClose={() => setIsJoinSheetOpen(false)}
          title="Anslut partner"
        >
          <form onSubmit={handleJoinHousehold} className="space-y-3.5">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
              <label className="block px-4 py-3 cursor-text">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                  Partners namn
                </span>
                <input
                  type="text"
                  autoFocus
                  value={partnerNameForJoin}
                  onChange={(e) => setPartnerNameForJoin(e.target.value)}
                  placeholder="T.ex. Alex"
                  className="w-full bg-transparent border-0 p-0 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                />
              </label>

              <label className="block px-4 py-3 cursor-text">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                  Partners kod eller e-post
                </span>
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => {
                    setJoinCodeInput(e.target.value);
                    setJoinError(null);
                  }}
                  placeholder={myPersonalCode}
                  required
                  className="w-full bg-transparent border-0 p-0 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none uppercase"
                />
              </label>
            </div>

            {joinError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400 text-center">
                {joinError}
              </p>
            )}

            <button
              type="submit"
              disabled={joining || joinCodeInput.trim().length < 3}
              className="w-full ui-btn-primary disabled:opacity-40"
            >
              <Check size={14} weight="bold" />
              <span>{joining ? 'Ansluter...' : 'Anslut'}</span>
            </button>
          </form>
        </BottomSheet>
      </div>
    );
  }

  // ==============================================================
  // VIEW 2: CLEAN ACTIVE SHARED BUDGET OVERVIEW
  // ==============================================================
  const {
    myMember,
    partnerMember,
    myShareRatio,
    partnerShareRatio,
    myTotalPaid,
    partnerTotalPaid,
    combinedTotalShared,
    myFairShare,
    netBalance,
    isSettledForCurrentPeriod,
  } = settlement;

  const allSharedEntries = [
    ...(myMember.sharedExpensesList || []),
    ...(partnerMember?.sharedExpensesList || []),
  ];

  const isBalanced = Math.abs(netBalance) < 5;

  return (
    <div className="ui-page animate-slide-in-right">
      {/* 1. Single Calm Hero Summary Card */}
      <section className="ui-card-p space-y-5">
        {/* Top Row: Avatars + Names & Settings Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex -space-x-2 shrink-0">
              <div className="w-7 h-7 rounded-full bg-[var(--bg-color)] border-2 border-[var(--surface-color)] flex items-center justify-center font-display font-semibold text-[11px] text-[var(--text-primary)] uppercase">
                {(myMember.name || 'J').slice(0, 1)}
              </div>
              {partnerMember ? (
                <div className="w-7 h-7 rounded-full bg-emerald-500/15 border-2 border-[var(--surface-color)] flex items-center justify-center font-display font-semibold text-[11px] text-emerald-600 dark:text-emerald-400 uppercase">
                  {(partnerMember.name || 'P').slice(0, 1)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="w-7 h-7 rounded-full bg-[var(--bg-color)] border-2 border-dashed border-[var(--border-control)] flex items-center justify-center text-[var(--text-secondary)] cursor-pointer"
                  title="Bjud in partner"
                >
                  <Plus size={11} weight="bold" />
                </button>
              )}
            </div>

            <div className="min-w-0">
              <span className="font-medium text-xs text-[var(--text-primary)] truncate block">
                {partnerMember
                  ? `${myMember.name} & ${partnerMember.name}`
                  : `${myMember.name} · Väntar på partner`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {partnerMember && onOpenFriendsChat && (
              <button
                type="button"
                onClick={() => {
                  const matchedFriend = friends.find(
                    (f) =>
                      f.key === partnerMember.email ||
                      f.name.toLowerCase().trim() ===
                        partnerMember.name.toLowerCase().trim()
                  );
                  onOpenFriendsChat(matchedFriend ? matchedFriend.key : null);
                }}
                className="w-8 h-8 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title={`Chatta med ${partnerMember.name}`}
              >
                <ChatCircleDots size={15} />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (partnerMember) {
                  setPartnerNameInput(partnerMember.name);
                  setPartnerIncomeInput(String(partnerMember.totalIncome || ''));
                  setPartnerPaidInput(String(partnerTotalPaid || ''));
                }
                setIsSettingsOpen(true);
              }}
              className="px-3 py-1.5 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              <span>{partnerMember ? 'Inställningar' : 'Bjud in'}</span>
            </button>
          </div>
        </div>

        {/* Center Hero Focal Number */}
        <div className="text-center py-1 space-y-1.5">
          {!partnerMember ? (
            <>
              <span className="text-xs text-[var(--text-secondary)] block">
                Totalt delat i perioden
              </span>
              <div className="font-display font-bold text-3xl tracking-tight text-[var(--text-primary)] tabular-nums">
                {formatKr(combinedTotalShared)}
              </div>
              <span className="text-xs text-[var(--text-secondary)] block tabular-nums">
                Din andel ({Math.round(myShareRatio * 100)} %): {formatKr(myFairShare)}
              </span>
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus size={14} weight="bold" />
                  <span>Koppla ihop med partner</span>
                </button>
              </div>
            </>
          ) : isSettledForCurrentPeriod || isBalanced ? (
            <>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                {isSettledForCurrentPeriod ? 'Utjämnat i perioden ✓' : 'Ni ligger helt jämnt'}
              </span>
              <div className="font-display font-bold text-3xl tracking-tight text-[var(--text-primary)] tabular-nums">
                0 kr
              </div>
              <span className="text-xs text-[var(--text-secondary)] block tabular-nums">
                Totalt delat: {formatKr(combinedTotalShared)}
              </span>
              {isSettledForCurrentPeriod && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleToggleSettled}
                    className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                  >
                    Ångra markering
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="text-xs text-[var(--text-secondary)] block">
                {netBalance > 0
                  ? `${partnerMember.name} är skyldig dig`
                  : `Du är skyldig ${partnerMember.name}`}
              </span>
              <div className="font-display font-bold text-3xl tracking-tight text-[var(--text-primary)] tabular-nums">
                {formatKr(Math.abs(netBalance))}
              </div>
              <span className="text-xs text-[var(--text-secondary)] block tabular-nums">
                Totalt delat: {formatKr(combinedTotalShared)} · Fördelning{' '}
                {Math.round(myShareRatio * 100)}/{Math.round(partnerShareRatio * 100)} %
              </span>

              <div className="pt-2.5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSettled}
                  className="px-4 py-2 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} weight="bold" />
                  <span>Markera som utjämnat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(String(Math.round(Math.abs(netBalance))));
                    setCopiedSwishAmt(true);
                    setTimeout(() => setCopiedSwishAmt(false), 2000);
                  }}
                  className="px-3 py-2 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSwishAmt ? (
                    <>
                      <Check size={12} weight="bold" className="text-emerald-500" />
                      <span>Kopierat</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Belopp</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Hairline-divided 2-Column Paid Summary (No nested boxes) */}
        <div className="pt-4 border-t border-[var(--border-subtle)] grid grid-cols-2 divide-x divide-[var(--border-subtle)] text-xs tabular-nums">
          <div className="pr-3">
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              Du har betalat
            </span>
            <span className="font-display font-semibold text-sm text-[var(--text-primary)] block mt-0.5">
              {formatKr(myTotalPaid)}
            </span>
          </div>

          <div className="pl-3 text-right">
            <span className="text-[11px] text-[var(--text-secondary)] block truncate">
              {partnerMember ? `${partnerMember.name} har betalat` : 'Partner har betalat'}
            </span>
            <span className="font-display font-semibold text-sm text-[var(--text-primary)] block mt-0.5">
              {formatKr(partnerTotalPaid)}
            </span>
          </div>
        </div>
      </section>

      {/* 2. Clean Shared Expenses List */}
      <section className="ui-section">
        <div className="ui-section-header">
          <h3 className="ui-section-title">
            Gemensamma utgifter ({allSharedEntries.length})
          </h3>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Kategorier ({(household.sharedCategories || []).length})
          </button>
        </div>

        {allSharedEntries.length === 0 ? (
          <div className="ui-card-p py-8 text-center space-y-1.5">
            <p className="font-medium text-xs text-[var(--text-primary)]">
              Inga gemensamma utgifter i perioden än
            </p>
            <p className="text-[11.5px] text-[var(--text-secondary)] max-w-[240px] mx-auto">
              Delade fasta räkningar och köp i dina valda kategorier dyker upp här automatiskt.
            </p>
          </div>
        ) : (
          <div className="ui-list-card">
            {allSharedEntries.slice(0, 25).map((entry) => (
              <div
                key={`${entry.paidByEmail}-${entry.id}`}
                className="py-3 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <CategoryIcon category={entry.category} size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="ui-row-title truncate block">{entry.title}</span>
                    <span className="ui-row-subtitle block truncate">
                      {entry.paidByName} · {entry.kind === 'fixed' ? 'Fast' : entry.category}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <span className="font-display font-semibold text-xs text-[var(--text-primary)] block">
                    {formatKr(entry.fullAmount)}
                  </span>
                  <span className="text-[10.5px] text-[var(--text-secondary)] block">
                    Din del {formatKr(Math.round(entry.fullAmount * myShareRatio))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Progressive Disclosure BottomSheet: Inställningar för delad budget */}
      <BottomSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Inställningar för delad ekonomi"
      >
        <div className="space-y-5">
          {/* A. Partner */}
          {partnerMember && (
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">
                  Ansluten partner
                </span>
                <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
                  {partnerMember.name}
                </span>
              </div>
              {onOpenFriendsChat && (
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    onOpenFriendsChat(partnerMember.email || null);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 cursor-pointer"
                >
                  <ChatCircleDots size={13} />
                  <span>Öppna chatt</span>
                </button>
              )}
            </div>
          )}

          {/* B. Fördelningsmodell */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] px-1 block">
              Hur vill ni dela på utgifterna?
            </span>
            <div className="ui-segmented grid-cols-2">
              <button
                type="button"
                onClick={() => handleChangeSplitMode('equal')}
                className={`ui-segmented-tab ${
                  household.splitMode === 'equal' ? 'ui-segmented-tab-active' : ''
                }`}
              >
                Lika (50 / 50)
              </button>
              <button
                type="button"
                onClick={() => handleChangeSplitMode('income')}
                className={`ui-segmented-tab ${
                  household.splitMode === 'income' ? 'ui-segmented-tab-active' : ''
                }`}
              >
                Efter inkomst ({Math.round(myShareRatio * 100)}/{Math.round(partnerShareRatio * 100)} %)
              </button>
            </div>
          </div>

          {/* C. Kategorier som delas automatiskt */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-[var(--text-secondary)] px-1 block">
              Kategorier som delas automatiskt
            </span>
            <div className="flex flex-wrap gap-1.5">
              {expenseCategories.map((cat) => {
                const isSelected = (household.sharedCategories || []).some(
                  (c) => c.toLowerCase() === cat.name.toLowerCase()
                );
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleSharedCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                        : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <CategoryIcon category={cat.name} size={12} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* D. Lämna delad budget */}
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full py-2.5 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/8 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <SignOut size={14} />
              <span>Koppla från delad budget</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      <ConfirmDialog
        isOpen={showLeaveConfirm}
        title="Koppla från delad budget?"
        description="Dina egna konton och transaktioner påverkas inte, men synkningen med hushållet avslutas."
        confirmLabel="Koppla från"
        cancelLabel="Avbryt"
        variant="danger"
        onConfirm={handleLeaveHousehold}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  );
};
