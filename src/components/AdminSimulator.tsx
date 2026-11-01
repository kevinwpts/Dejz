import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  SlidersHorizontal,
  Play,
  Users,
  User,
  ChatCircleDots,
  PiggyBank,
  Sparkle,
  Plus,
  Receipt,
  PaperPlaneRight,
  CheckCircle,
  Columns,
  X,
  ArrowsLeftRight,
  Check,
  Wallet,
  Lightning,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem } from './HomeTab';
import { PeriodInfo } from '../utils/periodEngine';
import {
  getSavingsGoals,
  saveSavingsGoals,
  SavingsGoalItem,
} from '../utils/appCache';
import {
  HouseholdState,
  HouseholdMemberSummary,
  getHouseholdState,
  saveHouseholdStateLocal,
  clearHouseholdStateLocal,
  getMemberKey,
  computeMyHouseholdSummary,
  pushHouseholdSyncToServer,
} from '../utils/householdSync';
import {
  SocialFriend,
  SocialChatMessage,
  getStoredFriends,
  saveStoredFriends,
  getRoomMessages,
  getRoomIdForKeys,
  sendChatMessage,
  toggleMessageSplitSettled,
  normalizeSocialUserKey,
} from '../utils/friendsChatSync';

const SPLIT_SIMULATOR_STORAGE_KEY = 'dejz_split_simulator_active_v1';

export function getSplitSimulatorActive(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SPLIT_SIMULATOR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSplitSimulatorActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SPLIT_SIMULATOR_STORAGE_KEY, String(active));
    window.dispatchEvent(new CustomEvent('dejz:simulator-toggled'));
  } catch {
    // ignore
  }
}

export interface AdminPanelProps {
  period: PeriodInfo;
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  splitSimulatorActive: boolean;
  onToggleSplitSimulator: (active: boolean) => void;
  onRestartOnboarding: () => void;
  onStartCreateGoalWizard: () => void;
  onOpenAddFixed: () => void;
  onOpenPreviewFixed: () => void;
  onOpenDiscoverSubscriptions: () => void;
  onOpenAddIncome: () => void;
  onOpenAddTransaction: () => void;
  onOpenPreviewTransaction: () => void;
  onOpenFriendsChat: () => void;
  onOpenHouseholdBudget: () => void;
  onApplyFixedExpenses?: (next: FixedExpenseItem[]) => void;
}

export const AdminPanelView: React.FC<AdminPanelProps> = ({
  period,
  userEmail,
  userName,
  userAvatar,
  incomes,
  fixedExpenses,
  transactions,
  splitSimulatorActive,
  onToggleSplitSimulator,
  onRestartOnboarding,
  onStartCreateGoalWizard,
  onOpenAddFixed,
  onOpenPreviewFixed,
  onOpenDiscoverSubscriptions,
  onOpenAddIncome,
  onOpenAddTransaction,
  onOpenPreviewTransaction,
  onOpenFriendsChat,
  onOpenHouseholdBudget,
  onApplyFixedExpenses,
}) => {
  const [activeFeedback, setActiveFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActiveFeedback(msg);
    window.setTimeout(() => {
      setActiveFeedback((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const myKey = useMemo(
    () => normalizeSocialUserKey(userEmail, userName),
    [userEmail, userName]
  );
  const myHouseholdKey = useMemo(
    () => getMemberKey(userEmail, userName),
    [userEmail, userName]
  );

  // SCENARIO 1: Singel / 100 % Egen ekonomi
  const applySingleScenario = () => {
    clearHouseholdStateLocal();
    saveStoredFriends([]);
    window.dispatchEvent(new CustomEvent('dejz:social-updated'));

    if (onApplyFixedExpenses && fixedExpenses.length > 0) {
      const cleaned = fixedExpenses.map((f) => ({
        ...f,
        isShared: false,
        amount: f.fullAmount && f.fullAmount > f.amount ? f.fullAmount : f.amount,
      }));
      onApplyFixedExpenses(cleaned);
    }

    const goals = getSavingsGoals().map((g) => ({ ...g, isShared: false }));
    saveSavingsGoals(goals);

    showToast('Scenario aktiverat: Singel (100 % egen ekonomi)');
  };

  // SCENARIO 2: Sambo med kombinerad ekonomi (Egen + Delad budget)
  const applyCombinedCoupleScenario = async () => {
    const partnerFriend: SocialFriend = {
      key: 'sofia.lind@dejz.se',
      name: 'Sofia Lind',
      email: 'sofia.lind@dejz.se',
      phone: '070-345 12 89',
      friendCode: 'DJZ814',
      addedAt: new Date().toISOString(),
      online: true,
    };

    const existingFriends = getStoredFriends().filter((f) => f.key !== partnerFriend.key);
    saveStoredFriends([partnerFriend, ...existingFriends]);
    window.dispatchEvent(new CustomEvent('dejz:social-updated'));

    // Mark housing/electricity/broadband as shared (with 50% personal share) and keep entertainment/gym personal
    let updatedFixed = [...fixedExpenses];
    if (updatedFixed.length > 0 && onApplyFixedExpenses) {
      updatedFixed = updatedFixed.map((f) => {
        const lower = f.name.toLowerCase();
        const isHouseholdBill =
          f.category === 'Boende' ||
          f.category === 'Räkningar' ||
          /hyra|avgift|el|vattenfall|tibber|bredband|bahnhof|telia|hemförsäkring|ica/.test(lower);
        if (isHouseholdBill) {
          const full = f.fullAmount && f.fullAmount >= f.amount ? f.fullAmount : f.amount;
          return {
            ...f,
            isShared: true,
            fullAmount: full,
            amount: Math.round(full / 2),
          };
        }
        return {
          ...f,
          isShared: false,
        };
      });
      onApplyFixedExpenses(updatedFixed);
    }

    // Ensure 1 shared goal + 1 personal goal exist
    const currentGoals = getSavingsGoals();
    const todayIso = new Date().toISOString().slice(0, 10);
    const nextGoals: SavingsGoalItem[] =
      currentGoals.length >= 2
        ? currentGoals.map((g, idx) => ({ ...g, isShared: idx === 0 }))
        : [
            {
              id: 'goal-shared-trip',
              name: 'Sommarresa Italien',
              targetAmount: 30000,
              currentAmount: 14500,
              isShared: true,
              artworkId: 'beach',
              createdAt: todayIso,
              activities: [
                {
                  id: 'act-sofia-1',
                  text: 'Insättning',
                  date: todayIso,
                  amount: 3500,
                  authorInitials: 'SL',
                  authorName: 'Sofia Lind',
                },
                {
                  id: 'act-me-1',
                  text: 'Insättning',
                  date: todayIso,
                  amount: 4000,
                  authorInitials: 'DU',
                  authorName: userName || 'Jag',
                },
              ],
            },
            {
              id: 'goal-private-buffer',
              name: 'Egen buffert',
              targetAmount: 25000,
              currentAmount: 18000,
              isShared: false,
              artworkId: 'safe',
              createdAt: todayIso,
              activities: [
                {
                  id: 'act-priv-1',
                  text: 'Du har skapat ditt privata mål',
                  date: todayIso,
                },
              ],
            },
          ];
    saveSavingsGoals(nextGoals);

    const sharedCats = ['Mat & dryck', 'Boende', 'Räkningar'];
    const mySummary = computeMyHouseholdSummary({
      userEmail,
      userName,
      userAvatar,
      period,
      incomes,
      fixedExpenses: updatedFixed,
      transactions,
      sharedCategories: sharedCats,
    });

    const sofiaMember: HouseholdMemberSummary = {
      email: partnerFriend.email,
      name: partnerFriend.name,
      avatar: null,
      totalIncome: 32500,
      sharedFixedPaid: 2450,
      sharedVariableSpent: 3180,
      sharedExpensesList: [
        {
          id: 'sofia-exp-1',
          title: 'Stora Coop Storhandel',
          amount: 1680,
          category: 'Mat & dryck',
          date: new Date().toISOString().slice(0, 10),
          kind: 'variable',
        },
        {
          id: 'sofia-exp-2',
          title: 'Apoteket Hjärtat',
          amount: 420,
          category: 'Mat & dryck',
          date: new Date().toISOString().slice(0, 10),
          kind: 'variable',
        },
        {
          id: 'sofia-exp-3',
          title: 'Hemförsäkring & Bredband',
          amount: 1080,
          category: 'Boende',
          date: new Date().toISOString().slice(0, 10),
          kind: 'fixed',
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const nextHh: HouseholdState = {
      householdId: 'hh-DJZ814',
      inviteCode: 'DJZ814',
      name: `${mySummary.name} & Sofia`,
      splitMode: 'equal',
      sharedCategories: sharedCats,
      members: {
        [myHouseholdKey]: mySummary,
        [partnerFriend.key]: sofiaMember,
      },
      sharedFixedExpenses: updatedFixed.filter((f) => f.isShared),
      sharedSavingsGoals: nextGoals.filter((g) => g.isShared),
      updatedAt: new Date().toISOString(),
    };

    saveHouseholdStateLocal(nextHh);
    await pushHouseholdSyncToServer(nextHh);

    await sendChatMessage({
      myKey: partnerFriend.key,
      myName: partnerFriend.name,
      friendKey: myKey,
      text: 'Hej! Jag la in storhandlingen på Coop (1 680 kr) i vår delade budget.',
      sharedPayload: {
        kind: 'expense_split',
        title: 'Stora Coop Storhandel',
        amount: 840,
        totalAmount: 1680,
        category: 'Mat & dryck',
        swishPhone: '070-345 12 89',
      },
    });

    showToast('Scenario aktiverat: Sambo (Egen + Delad budget med Sofia)');
  };

  // SCENARIO 3: Vänner & Swish-split i chatten
  const applyFriendsChatScenario = async () => {
    const demoFriends: SocialFriend[] = [
      {
        key: 'sofia.lind@dejz.se',
        name: 'Sofia Lind',
        email: 'sofia.lind@dejz.se',
        phone: '070-345 12 89',
        friendCode: 'DJZ814',
        addedAt: new Date().toISOString(),
        online: true,
      },
      {
        key: 'marcus.berg@dejz.se',
        name: 'Marcus Berg',
        email: 'marcus.berg@dejz.se',
        phone: '073-912 44 10',
        friendCode: 'DJZ509',
        addedAt: new Date().toISOString(),
        online: true,
      },
      {
        key: 'emma.nystrom@dejz.se',
        name: 'Emma Nyström',
        email: 'emma.nystrom@dejz.se',
        phone: '076-118 90 22',
        friendCode: 'DJZ331',
        addedAt: new Date().toISOString(),
        online: false,
      },
    ];

    saveStoredFriends(demoFriends);

    await sendChatMessage({
      myKey: 'marcus.berg@dejz.se',
      myName: 'Marcus Berg',
      friendKey: myKey,
      text: 'Tack för middagen igår! Här är min del av notan på Basta:',
      sharedPayload: {
        kind: 'expense_split',
        title: 'Restaurang Basta',
        amount: 395,
        totalAmount: 790,
        category: 'Mat & dryck',
        swishPhone: '073-912 44 10',
      },
    });

    window.dispatchEvent(new CustomEvent('dejz:social-updated'));
    showToast('Scenario aktiverat: 3 vänner & Swish-split i chatten');
  };

  return (
    <div className="space-y-5">
      {activeFeedback && (
        <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/30 px-4 py-3 flex items-center gap-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-fade-in">
          <CheckCircle size={16} weight="fill" className="text-emerald-500 shrink-0" />
          <span>{activeFeedback}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 1. SPLIT-SCREEN LIVE SIMULATOR FÖR DATOR                       */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shrink-0">
              <Columns size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">
                Split-Screen Simulator (Dator)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Visa din app till vänster och motpartens telefon till höger
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={splitSimulatorActive}
            onClick={() => onToggleSplitSimulator(!splitSimulatorActive)}
            className={`ui-switch shrink-0 ${
              splitSimulatorActive ? 'ui-switch-on' : 'ui-switch-off'
            }`}
          >
            <span
              className={`ui-switch-thumb ${
                splitSimulatorActive ? 'ui-switch-thumb-on' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (getStoredFriends().length === 0) {
              await applyCombinedCoupleScenario();
            }
            onToggleSplitSimulator(!splitSimulatorActive);
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
        >
          <Columns size={15} weight="bold" />
          <span>
            {splitSimulatorActive
              ? 'Stäng Split-Screen (Visa endast min app)'
              : 'Starta Split-Screen (Du + Motpart sida vid sida)'}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 2. VÄXLA EKONOMISCENARIO (1 KLICK)                             */}
      {/* ============================================================== */}
      <div className="space-y-1.5">
        <h3 className="ui-section-title px-1">Växla ekonomiscenario (1 klick)</h3>
        <div className="ui-list-card px-0 py-0 overflow-hidden divide-y divide-[var(--border-subtle)]">
          <button
            type="button"
            onClick={applySingleScenario}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                <User size={16} weight="regular" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-medium text-xs text-[var(--text-primary)] block">
                  1. Singel – 100 % Egen ekonomi
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                  Ingen kopplad partner, alla delningsval döljs automatiskt
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] shrink-0">
              Aktivera
            </span>
          </button>

          <button
            type="button"
            onClick={applyCombinedCoupleScenario}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                <Users size={16} weight="regular" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-medium text-xs text-[var(--text-primary)] block">
                  2. Sambo – Kombinerad ekonomi (Egen + Delad)
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                  Kopplad med Sofia Lind · Delade räkningar + egna utgifter & sparmål
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] shrink-0">
              Aktivera
            </span>
          </button>

          <button
            type="button"
            onClick={applyFriendsChatScenario}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                <ChatCircleDots size={16} weight="regular" />
              </div>
              <div className="min-w-0">
                <span className="font-display font-medium text-xs text-[var(--text-primary)] block">
                  3. Vänner & Swish-split i chatten
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                  Lägger till 3 vänner med aktiva chattar och delad restaurangnota
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] shrink-0">
              Aktivera
            </span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. TESTA STEG & FLÖDEN DIREKT                                  */}
      {/* ============================================================== */}
      <div className="space-y-1.5">
        <h3 className="ui-section-title px-1">Testa steg & flöden i appen</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onStartCreateGoalWizard}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <PiggyBank size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Skapa sparmål
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Testa steg 1–5
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onRestartOnboarding}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Play size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Onboarding-guide
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Från första steget
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenPreviewFixed}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Receipt size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Fast utgift (Vy)
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Testa förhandsgranskning
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenPreviewTransaction}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Wallet size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Transaktion (Vy)
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Testa förhandsgranskning
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenDiscoverSubscriptions}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Sparkle size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Hitta abonnemang
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Skanna bankköp
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAddFixed}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Plus size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Ny fast utgift
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAddIncome}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Plus size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Ny fast inkomst
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenAddTransaction}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Plus size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Ny transaktion
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenFriendsChat}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <ChatCircleDots size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Vänner & Chatt
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Öppna meddelanden
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenHouseholdBudget}
            className="p-3.5 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-left flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Users size={18} className="text-[var(--text-primary)] shrink-0" />
            <div className="min-w-0">
              <span className="font-display font-medium text-xs text-[var(--text-primary)] block truncate">
                Delad ekonomi
              </span>
              <span className="text-[10.5px] text-[var(--text-secondary)] block truncate">
                Öppna hushållsvyn
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HÖGERKOLUMN PÅ DATORN: MOTPARTENS TELEFON (LIVE INTERAKTIV SIMULATOR)
// ============================================================================
interface PartnerSimulatorColumnProps {
  myUserEmail?: string | null;
  myUserName?: string | null;
  onCloseSimulator: () => void;
}

export const PartnerSimulatorColumn: React.FC<PartnerSimulatorColumnProps> = ({
  myUserEmail,
  myUserName,
  onCloseSimulator,
}) => {
  const myKey = useMemo(
    () => normalizeSocialUserKey(myUserEmail, myUserName),
    [myUserEmail, myUserName]
  );

  const [friends, setFriends] = useState<SocialFriend[]>(() => {
    const stored = getStoredFriends();
    if (stored.length > 0) return stored;
    const def: SocialFriend = {
      key: 'sofia.lind@dejz.se',
      name: 'Sofia Lind',
      email: 'sofia.lind@dejz.se',
      phone: '070-345 12 89',
      friendCode: 'DJZ814',
      addedAt: new Date().toISOString(),
      online: true,
    };
    saveStoredFriends([def]);
    return [def];
  });

  const [activePartnerKey, setActivePartnerKey] = useState<string>(
    () => friends[0]?.key || 'sofia.lind@dejz.se'
  );
  const [simTab, setSimTab] = useState<'chat' | 'budget'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<SocialChatMessage[]>([]);
  const [household, setHousehold] = useState<HouseholdState | null>(() => getHouseholdState());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activePartner = useMemo(
    () =>
      friends.find((f) => f.key === activePartnerKey) ||
      friends[0] || {
        key: 'sofia.lind@dejz.se',
        name: 'Sofia Lind',
        email: 'sofia.lind@dejz.se',
        phone: '070-345 12 89',
        friendCode: 'DJZ814',
        addedAt: new Date().toISOString(),
      },
    [friends, activePartnerKey]
  );

  const roomId = useMemo(
    () => getRoomIdForKeys(myKey, activePartner.key),
    [myKey, activePartner.key]
  );

  const refreshState = () => {
    const nextFriends = getStoredFriends();
    if (nextFriends.length > 0) {
      setFriends(nextFriends);
    }
    setMessages(getRoomMessages(myKey, activePartner.key));
    setHousehold(getHouseholdState());
  };

  useEffect(() => {
    refreshState();
    const onSocial = () => refreshState();
    const onHh = () => setHousehold(getHouseholdState());
    window.addEventListener('dejz:social-updated', onSocial);
    window.addEventListener('dejz:household-updated', onHh);
    return () => {
      window.removeEventListener('dejz:social-updated', onSocial);
      window.removeEventListener('dejz:household-updated', onHh);
    };
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, simTab]);

  const formatKr = (amt: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amt))} kr`;

  const handleSendAsPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatInput('');
    await sendChatMessage({
      myKey: activePartner.key,
      myName: activePartner.name,
      myAvatar: activePartner.avatar,
      friendKey: myKey,
      text: trimmed,
    });
    refreshState();
  };

  const handleSendQuickSplitFromPartner = async (
    title: string,
    totalAmount: number,
    category: string
  ) => {
    const half = Math.round(totalAmount / 2);
    await sendChatMessage({
      myKey: activePartner.key,
      myName: activePartner.name,
      myAvatar: activePartner.avatar,
      friendKey: myKey,
      text: `Jag betalade ${title} (${formatKr(totalAmount)}). Din del är ${formatKr(half)}.`,
      sharedPayload: {
        kind: 'expense_split',
        title,
        amount: half,
        totalAmount,
        category,
        swishPhone: activePartner.phone || '070-345 12 89',
      },
    });
    refreshState();
  };

  const handleUpdatePartnerHousehold = async (
    patchFn: (currentPartnerMem: HouseholdMemberSummary) => HouseholdMemberSummary
  ) => {
    const currentHh = getHouseholdState();
    const basePartner: HouseholdMemberSummary = currentHh?.members?.[activePartner.key] || {
      email: activePartner.email || activePartner.key,
      name: activePartner.name,
      avatar: activePartner.avatar || null,
      totalIncome: 32500,
      sharedFixedPaid: 2450,
      sharedVariableSpent: 1680,
      sharedExpensesList: [],
      updatedAt: new Date().toISOString(),
    };

    const updatedPartner = patchFn(basePartner);
    const nextHh: HouseholdState = {
      householdId: currentHh?.householdId || 'hh-DJZ814',
      inviteCode: currentHh?.inviteCode || 'DJZ814',
      name: currentHh?.name || `${myUserName || 'Jag'} & ${activePartner.name}`,
      splitMode: currentHh?.splitMode || 'equal',
      sharedCategories: currentHh?.sharedCategories || ['Mat & dryck', 'Boende', 'Räkningar'],
      members: {
        ...(currentHh?.members || {}),
        [activePartner.key]: updatedPartner,
      },
      sharedFixedExpenses: currentHh?.sharedFixedExpenses || [],
      sharedSavingsGoals: currentHh?.sharedSavingsGoals || [],
      updatedAt: new Date().toISOString(),
    };

    saveHouseholdStateLocal(nextHh);
    setHousehold(nextHh);
    await pushHouseholdSyncToServer(nextHh);
  };

  const partnerMember = household?.members?.[activePartner.key] || {
    email: activePartner.email || activePartner.key,
    name: activePartner.name,
    totalIncome: 32500,
    sharedFixedPaid: 0,
    sharedVariableSpent: 0,
    sharedExpensesList: [],
    updatedAt: new Date().toISOString(),
  };

  return (
    <aside className="w-[390px] xl:w-[410px] shrink-0 sticky top-4 h-[calc(100dvh-2rem)] rounded-[32px] bg-[var(--surface-color)] border-2 border-[var(--border-subtle)] shadow-xl flex flex-col overflow-hidden select-none">
      {/* Top Simulator Bar */}
      <div className="px-4 pt-3.5 pb-3 bg-[var(--bg-color)] border-b border-[var(--border-subtle)] space-y-2.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-display font-semibold text-xs text-[var(--text-primary)] truncate">
              Motpartens telefon (Live-simulator)
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseSimulator}
            title="Stäng simulator"
            className="w-7 h-7 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Välj vilken vän/partner du styr i högra telefonen */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {friends.map((f) => {
            const active = f.key === activePartner.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActivePartnerKey(f.key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                    : 'bg-[var(--surface-color)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                }`}
              >
                {f.name}
              </button>
            );
          })}
        </div>

        {/* Segmented Tab: Chatt vs Delad budget */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setSimTab('chat')}
            className={`py-1.5 rounded-lg text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              simTab === 'chat'
                ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ChatCircleDots size={14} weight="bold" />
            <span>Chatt ({activePartner.name.split(' ')[0]})</span>
          </button>
          <button
            type="button"
            onClick={() => setSimTab('budget')}
            className={`py-1.5 rounded-lg text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              simTab === 'budget'
                ? 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Users size={14} weight="bold" />
            <span>Delad budget</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLIK 1: CHATT UR MOTPARTENS PERSPEKTIV                         */}
      {/* ============================================================== */}
      {simTab === 'chat' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between bg-[var(--bg-color)]">
          {/* Snabbknappar för att skicka utläggskort från motparten */}
          <div className="px-3 py-2 bg-[var(--surface-color)]/70 border-b border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] shrink-0 mr-1">
              Snabbtest:
            </span>
            <button
              type="button"
              onClick={() => handleSendQuickSplitFromPartner('ICA Kvantum', 680, 'Mat & dryck')}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap cursor-pointer shrink-0"
            >
              + Utlägg ICA (340 kr)
            </button>
            <button
              type="button"
              onClick={() => handleSendQuickSplitFromPartner('Foodora Middag', 390, 'Mat & dryck')}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap cursor-pointer shrink-0"
            >
              + Foodora (195 kr)
            </button>
          </div>

          {/* Meddelandelista (Motpartens meddelanden till höger, dina till vänster!) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 text-xs text-[var(--text-secondary)]">
                <p className="font-display font-semibold text-sm text-[var(--text-primary)] mb-1">
                  Chatt som {activePartner.name}
                </p>
                <p>
                  Skriv ett meddelande nedan eller skicka ett utlägg för att se det dyka upp direkt i din app till vänster!
                </p>
              </div>
            ) : (
              messages.map((m) => {
                // I motpartens telefon är "isMine" = skickat av motparten!
                const isFromPartner = m.senderKey === activePartner.key;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isFromPartner ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-xs space-y-2 ${
                        isFromPartner
                          ? 'bg-[var(--text-primary)] text-[var(--bg-color)] rounded-br-sm'
                          : 'bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-sm'
                      }`}
                    >
                      <p className="leading-relaxed break-words">{m.text}</p>

                      {m.sharedPayload && m.sharedPayload.kind === 'expense_split' && (
                        <div
                          className={`rounded-xl p-2.5 space-y-2 ${
                            isFromPartner
                              ? 'bg-white/10 text-[var(--bg-color)]'
                              : 'bg-[var(--bg-color)] text-[var(--text-primary)] border border-[var(--border-subtle)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-semibold text-xs truncate">
                              {m.sharedPayload.title}
                            </span>
                            <span className="font-display font-bold text-xs tabular-nums shrink-0">
                              {formatKr(m.sharedPayload.amount || 0)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await toggleMessageSplitSettled({
                                myKey: activePartner.key,
                                friendKey: myKey,
                                messageId: m.id,
                              });
                              refreshState();
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                              m.sharedPayload.settled
                                ? 'bg-emerald-500 text-white'
                                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                          >
                            <Check size={12} weight="bold" />
                            <span>
                              {m.sharedPayload.settled
                                ? 'Betald / Swishad'
                                : `Markera betald som ${activePartner.name.split(' ')[0]}`}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5 px-1">
                      {isFromPartner ? activePartner.name.split(' ')[0] : myUserName || 'Du'}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input som motpart */}
          <form
            onSubmit={handleSendAsPartner}
            className="p-3 bg-[var(--surface-color)] border-t border-[var(--border-subtle)] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Svara som ${activePartner.name.split(' ')[0]}...`}
              className="flex-1 bg-[var(--bg-color)] border border-[var(--border-subtle)] rounded-full px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
            >
              <PaperPlaneRight size={14} weight="fill" />
            </button>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLIK 2: DELAD BUDGET UR MOTPARTENS PERSPEKTIV                  */}
      {/* ============================================================== */}
      {simTab === 'budget' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[var(--bg-color)]">
          <div className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">
                {activePartner.name.split(' ')[0]}s månadslön
              </span>
              <span className="font-display font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatKr(partnerMember.totalIncome)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {[26000, 32500, 42000].map((sal) => (
                <button
                  key={sal}
                  type="button"
                  onClick={() =>
                    handleUpdatePartnerHousehold((cur) => ({
                      ...cur,
                      totalIncome: sal,
                      updatedAt: new Date().toISOString(),
                    }))
                  }
                  className={`py-1.5 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                    partnerMember.totalIncome === sal
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                      : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-subtle)]'
                  }`}
                >
                  {formatKr(sal)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Lägg till köp betalt av {activePartner.name.split(' ')[0]}
              </span>
              <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                Totalt: {formatKr(partnerMember.sharedFixedPaid + partnerMember.sharedVariableSpent)}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {[
                { title: 'ICA Maxi Storhandel', amount: 1450, category: 'Mat & dryck', kind: 'variable' as const },
                { title: 'Elräkning Vattenfall', amount: 1180, category: 'Boende', kind: 'fixed' as const },
                { title: 'Hemköp Middag', amount: 520, category: 'Mat & dryck', kind: 'variable' as const },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() =>
                    handleUpdatePartnerHousehold((cur) => {
                      const newExp = {
                        id: `sim-${Date.now()}`,
                        title: item.title,
                        amount: item.amount,
                        category: item.category,
                        date: new Date().toISOString().slice(0, 10),
                        kind: item.kind,
                      };
                      const nextList = [newExp, ...(cur.sharedExpensesList || [])];
                      const nextFixed = nextList
                        .filter((x) => x.kind === 'fixed')
                        .reduce((s, x) => s + x.amount, 0);
                      const nextVar = nextList
                        .filter((x) => x.kind === 'variable')
                        .reduce((s, x) => s + x.amount, 0);
                      return {
                        ...cur,
                        sharedFixedPaid: nextFixed,
                        sharedVariableSpent: nextVar,
                        sharedExpensesList: nextList,
                        updatedAt: new Date().toISOString(),
                      };
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    + {item.title}
                  </span>
                  <span className="font-display font-semibold tabular-nums text-[var(--text-secondary)]">
                    {formatKr(item.amount)}
                  </span>
                </button>
              ))}
            </div>

            {(partnerMember.sharedExpensesList?.length || 0) > 0 && (
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                    Registrerade utlägg av {activePartner.name.split(' ')[0]}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleUpdatePartnerHousehold((cur) => ({
                        ...cur,
                        sharedFixedPaid: 0,
                        sharedVariableSpent: 0,
                        sharedExpensesList: [],
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                    className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                  >
                    Nollställ
                  </button>
                </div>
                {partnerMember.sharedExpensesList.slice(0, 5).map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between text-xs py-1 text-[var(--text-primary)]"
                  >
                    <span className="truncate">{exp.title}</span>
                    <span className="font-display font-medium tabular-nums shrink-0">
                      {formatKr(exp.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
