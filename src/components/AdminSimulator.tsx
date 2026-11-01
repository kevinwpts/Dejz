import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Users,
  User,
  ChatCircleDots,
  PiggyBank,
  Sparkle,
  Plus,
  Receipt,
  PaperPlaneTilt,
  CheckCircle,
  Columns,
  X,
  Check,
  Checks,
  Wallet,
  ArrowBendUpLeft,
  HandCoins,
  Robot,
  ArrowSquareOut,
  UserPlus,
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
  ChatSharedPayload,
  getStoredFriends,
  saveStoredFriends,
  getRoomMessages,
  getRoomIdForKeys,
  getActiveTypingForRoom,
  sendChatMessage,
  toggleMessageReaction,
  toggleMessageSplitSettled,
  markRoomMessagesAsRead,
  sendLiveTypingSignal,
  normalizeSocialUserKey,
} from '../utils/friendsChatSync';

const SPLIT_SIMULATOR_STORAGE_KEY = 'dejz_split_simulator_active_v1';
const AUTO_REPLY_STORAGE_KEY = 'dejz_sim_auto_reply_v1';

const REACTION_EMOJIS = ['❤️', '👍', '🔥', '🎉', '😂'];

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
    window.dispatchEvent(new CustomEvent('dejz:split-simulator-changed'));
  } catch {
    // ignore
  }
}

function getStoredAutoReply(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(AUTO_REPLY_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

function setStoredAutoReply(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTO_REPLY_STORAGE_KEY, String(enabled));
  } catch {
    // ignore
  }
}

function ensureDemoFriendsAndStarterChat(myKey: string): SocialFriend[] {
  const existing = getStoredFriends();
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
      online: true,
    },
  ];

  const byKey = new Map<string, SocialFriend>();
  for (const f of existing) {
    if (f?.key) byKey.set(f.key, f);
  }
  for (const d of demoFriends) {
    if (!byKey.has(d.key)) {
      byKey.set(d.key, d);
    }
  }
  const merged = Array.from(byKey.values());
  saveStoredFriends(merged);

  // Seed a welcoming message from Sofia if room is empty
  const sofiaMsgs = getRoomMessages(myKey, 'sofia.lind@dejz.se');
  if (sofiaMsgs.length === 0) {
    void sendChatMessage({
      myKey: 'sofia.lind@dejz.se',
      myName: 'Sofia Lind',
      friendKey: myKey,
      text: 'Hej! Nu är chatten igång. Skriv något till mig eller dela ett köp så ser du hur vi chattar i realtid!',
    });
  }

  return merged;
}

function generateContextualPartnerReply(
  incomingMsg: SocialChatMessage,
  partnerName: string,
  formatKr: (n: number) => string
): string {
  const firstName = partnerName.split(' ')[0] || 'Vän';
  if (incomingMsg.sharedPayload) {
    if (incomingMsg.sharedPayload.kind === 'expense_split') {
      const amt = incomingMsg.sharedPayload.amount || 0;
      return `Toppen att du la ut för ${incomingMsg.sharedPayload.title}! Jag har swishat min del på ${formatKr(amt)} nu och markerat den som betald.`;
    }
    if (incomingMsg.sharedPayload.kind === 'household_invite') {
      return `Så smidigt! Jag har accepterat inbjudan till ${incomingMsg.sharedPayload.householdName || 'vår delade budget'} nu.`;
    }
    if (incomingMsg.sharedPayload.kind === 'savings_goal') {
      return `Vad bra det går med "${incomingMsg.sharedPayload.goalName || incomingMsg.sharedPayload.title}"! Jag lägger in lite extra efter lön.`;
    }
  }

  const lower = (incomingMsg.text || '').toLowerCase();
  if (/hej|hallå|tja|tjena|god morgon|hejsan/.test(lower)) {
    return `Hej! Allt bra med dig? Har precis kollat igenom vår budget i appen.`;
  }
  if (/handla|ica|coop|willys|mat|middag/.test(lower)) {
    return `Ja gärna! Ska jag handla på vägen hem och lägga in kvittot som delat utlägg här i chatten?`;
  }
  if (/swish|betala|skyldig|nota|utlägg/.test(lower)) {
    return `Yes, skicka bara utläggskortet här i chatten med +-knappen så swishar jag direkt!`;
  }
  if (/hyra|el|räkning|faktura|bredband/.test(lower)) {
    return `Jag har koll på den! Vi har ju lagt den under delade fasta utgifter så den räknas 50/50 automatiskt.`;
  }
  if (/spara|sparmål|resa|buffert/.test(lower)) {
    return `Ja! Vi ligger riktigt bra till på sparmålet den här månaden.`;
  }
  if (lower.includes('?')) {
    return `Absolut, det låter som en riktigt bra plan tycker jag!`;
  }
  return `Låter toppen! Säg bara till om vi ska dela på något utlägg eller justera budgeten. /${firstName}`;
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
  onOpenFriendsChat: (friendKey?: string) => void;
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
    ensureDemoFriendsAndStarterChat(myKey);
    const partnerFriend: SocialFriend = {
      key: 'sofia.lind@dejz.se',
      name: 'Sofia Lind',
      email: 'sofia.lind@dejz.se',
      phone: '070-345 12 89',
      friendCode: 'DJZ814',
      addedAt: new Date().toISOString(),
      online: true,
    };

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
    ensureDemoFriendsAndStarterChat(myKey);

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

  // Starta live chatt-simulering sida vid sida (Öppnar chatten i din app + motpartens telefon bredvid)
  const startLiveChatSimulation = async () => {
    const list = ensureDemoFriendsAndStarterChat(myKey);
    const firstFriend = list[0]?.key || 'sofia.lind@dejz.se';
    onToggleSplitSimulator(true);
    onOpenFriendsChat(firstFriend);
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
      {/* 1. CHATT & SPLIT-SCREEN LIVE SIMULATOR                         */}
      {/* ============================================================== */}
      <div className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center shrink-0">
              <Columns size={20} weight="bold" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-sm text-[var(--text-primary)]">
                Live Chatt & Motpart-simulator
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Chatta med Sofia eller Marcus sida vid sida (med auto-svar, läskvitton, reaktioner & Swish-utlägg)
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={splitSimulatorActive}
            onClick={() => {
              if (!splitSimulatorActive) {
                ensureDemoFriendsAndStarterChat(myKey);
              }
              onToggleSplitSimulator(!splitSimulatorActive);
            }}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={startLiveChatSimulation}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-semibold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <ChatCircleDots size={16} weight="fill" />
            <span>Simulera chatt sida vid sida</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!splitSimulatorActive && getStoredFriends().length === 0) {
                await applyCombinedCoupleScenario();
              }
              onToggleSplitSimulator(!splitSimulatorActive);
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-display font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Columns size={15} weight="bold" />
            <span>
              {splitSimulatorActive ? 'Stäng motpartens telefon' : 'Visa motpartens telefon'}
            </span>
          </button>
        </div>
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
            onClick={() => {
              const list = ensureDemoFriendsAndStarterChat(myKey);
              onOpenFriendsChat(list[0]?.key || 'sofia.lind@dejz.se');
            }}
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
// HÖGERKOLUMN: MOTPARTENS TELEFON (FULLSTÄNDIG INTERAKTIV CHATT & BUDGET)
// ============================================================================
interface PartnerSimulatorColumnProps {
  myUserEmail?: string | null;
  myUserName?: string | null;
  selectedFriendKeyInMyApp?: string | null;
  onSelectFriendInMyApp?: (friendKey: string) => void;
  onCloseSimulator: () => void;
}

export const PartnerSimulatorColumn: React.FC<PartnerSimulatorColumnProps> = ({
  myUserEmail,
  myUserName,
  selectedFriendKeyInMyApp,
  onSelectFriendInMyApp,
  onCloseSimulator,
}) => {
  const myKey = useMemo(
    () => normalizeSocialUserKey(myUserEmail, myUserName),
    [myUserEmail, myUserName]
  );

  const [friends, setFriends] = useState<SocialFriend[]>(() =>
    ensureDemoFriendsAndStarterChat(myKey)
  );

  const [activePartnerKey, setActivePartnerKey] = useState<string>(
    () => selectedFriendKeyInMyApp || friends[0]?.key || 'sofia.lind@dejz.se'
  );
  const [simTab, setSimTab] = useState<'chat' | 'budget'>('chat');
  const [autoReplyEnabled, setAutoReplyEnabled] = useState<boolean>(() =>
    getStoredAutoReply()
  );

  const [chatInput, setChatInput] = useState('');
  const [replyToMsg, setReplyToMsg] = useState<{
    id: string;
    senderName: string;
    text: string;
  } | null>(null);
  const [activeActionMsgId, setActiveActionMsgId] = useState<string | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [customSplitTitle, setCustomSplitTitle] = useState('');
  const [customSplitTotal, setCustomSplitTotal] = useState('');
  const [showNewFriendInput, setShowNewFriendInput] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');

  const [messages, setMessages] = useState<SocialChatMessage[]>([]);
  const [household, setHousehold] = useState<HouseholdState | null>(() => getHouseholdState());
  const [tick, setTick] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const partnerTypingTimeoutRef = useRef<number | null>(null);
  const autoRepliedIdsRef = useRef<Set<string>>(new Set());

  // Sync simulator partner if user switches friend in left app
  useEffect(() => {
    if (selectedFriendKeyInMyApp) {
      setActivePartnerKey(selectedFriendKeyInMyApp);
    }
  }, [selectedFriendKeyInMyApp]);

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
        online: true,
      },
    [friends, activePartnerKey]
  );

  const roomId = useMemo(
    () => getRoomIdForKeys(myKey, activePartner.key),
    [myKey, activePartner.key]
  );

  const formatKr = (amt: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amt))} kr`;

  const formatTimeShort = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const refreshState = () => {
    const nextFriends = getStoredFriends();
    if (nextFriends.length > 0) {
      setFriends(nextFriends);
    }
    const roomMsgs = getRoomMessages(myKey, activePartner.key);
    setMessages(roomMsgs);
    setHousehold(getHouseholdState());
    setTick((t) => t + 1);
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
  }, [roomId, activePartner.key, myKey]);

  // Mark messages sent by "me" as read by activePartner when partner's chat tab is open
  useEffect(() => {
    if (simTab !== 'chat') return;
    const unreadFromMe = messages.some(
      (m) =>
        m.senderKey === myKey &&
        (!Array.isArray(m.readBy) || !m.readBy.includes(activePartner.key))
    );
    if (unreadFromMe) {
      const timer = window.setTimeout(() => {
        void markRoomMessagesAsRead(activePartner.key, myKey);
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [messages, simTab, activePartner.key, myKey]);

  // Auto-reply engine: when user sends a message from left app, partner reads, types & replies
  useEffect(() => {
    if (!autoReplyEnabled || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.senderKey !== myKey) return;

    // Only auto-reply to fresh messages sent within the last 8 seconds
    const ageMs = Date.now() - new Date(lastMsg.createdAt).getTime();
    if (isNaN(ageMs) || ageMs > 8000) return;
    if (autoRepliedIdsRef.current.has(lastMsg.id)) return;
    autoRepliedIdsRef.current.add(lastMsg.id);

    const partnerKeySnap = activePartner.key;
    const partnerNameSnap = activePartner.name;
    const partnerAvatarSnap = activePartner.avatar;

    const t1 = window.setTimeout(() => {
      void markRoomMessagesAsRead(partnerKeySnap, myKey);
      sendLiveTypingSignal({
        myKey: partnerKeySnap,
        myName: partnerNameSnap,
        friendKey: myKey,
        isTyping: true,
      });
    }, 550);

    const t2 = window.setTimeout(async () => {
      sendLiveTypingSignal({
        myKey: partnerKeySnap,
        myName: partnerNameSnap,
        friendKey: myKey,
        isTyping: false,
      });

      // If user sent an expense split, partner reacts with 👍 and settles it!
      if (lastMsg.sharedPayload?.kind === 'expense_split') {
        await toggleMessageReaction({
          myKey: partnerKeySnap,
          friendKey: myKey,
          messageId: lastMsg.id,
          emoji: '👍',
        });
        if (!lastMsg.sharedPayload.settled) {
          await toggleMessageSplitSettled({
            myKey: partnerKeySnap,
            friendKey: myKey,
            messageId: lastMsg.id,
          });
        }
      } else if (lastMsg.sharedPayload?.kind === 'household_invite') {
        await toggleMessageReaction({
          myKey: partnerKeySnap,
          friendKey: myKey,
          messageId: lastMsg.id,
          emoji: '❤️',
        });
      }

      const replyText = generateContextualPartnerReply(
        lastMsg,
        partnerNameSnap,
        formatKr
      );

      await sendChatMessage({
        myKey: partnerKeySnap,
        myName: partnerNameSnap,
        myAvatar: partnerAvatarSnap,
        friendKey: myKey,
        text: replyText,
      });
    }, 2000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [messages, autoReplyEnabled, activePartner.key, activePartner.name, activePartner.avatar, myKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, simTab]);

  // Check if the main user (left app) is currently typing to this partner
  const isMainUserTypingToPartner = useMemo(() => {
    void tick;
    const info = getActiveTypingForRoom(roomId, activePartner.key);
    return info.isTyping;
  }, [roomId, activePartner.key, tick]);

  const handleSendAsPartner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const quote = replyToMsg || undefined;
    setChatInput('');
    setReplyToMsg(null);
    sendLiveTypingSignal({
      myKey: activePartner.key,
      myName: activePartner.name,
      friendKey: myKey,
      isTyping: false,
    });
    await sendChatMessage({
      myKey: activePartner.key,
      myName: activePartner.name,
      myAvatar: activePartner.avatar,
      friendKey: myKey,
      text: trimmed,
      replyTo: quote,
    });
    refreshState();
  };

  const handleSendPartnerCard = async (payload: ChatSharedPayload, text: string) => {
    setShowAttachMenu(false);
    setCustomSplitTitle('');
    setCustomSplitTotal('');
    await sendChatMessage({
      myKey: activePartner.key,
      myName: activePartner.name,
      myAvatar: activePartner.avatar,
      friendKey: myKey,
      text,
      sharedPayload: payload,
    });
    refreshState();
  };

  const handleCreateSimulatedNewFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newFriendName.trim();
    if (!cleanName) return;
    const fKey = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@dejz.se`;
    const code = `DJZ${Math.floor(100 + Math.random() * 899)}`;
    const newFriend: SocialFriend = {
      key: fKey,
      name: cleanName,
      email: fKey,
      phone: '070-555 19 20',
      friendCode: code,
      addedAt: new Date().toISOString(),
      online: true,
    };
    const next = [newFriend, ...getStoredFriends().filter((f) => f.key !== fKey)];
    saveStoredFriends(next);
    setFriends(next);
    setActivePartnerKey(fKey);
    setNewFriendName('');
    setShowNewFriendInput(false);

    await sendChatMessage({
      myKey: fKey,
      myName: cleanName,
      friendKey: myKey,
      text: `Hej! Jag la precis till dig som vän på Dejz 👋`,
    });
    if (onSelectFriendInMyApp) {
      onSelectFriendInMyApp(fKey);
    }
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
    <aside className="w-full max-w-[410px] min-[820px]:w-[395px] xl:w-[415px] shrink-0 h-full rounded-[30px] bg-[var(--surface-color)] border-2 border-[var(--border-subtle)] shadow-2xl flex flex-col overflow-hidden select-none">
      {/* ============================================================== */}
      {/* TOP SIMULATOR CONTROL BAR                                      */}
      {/* ============================================================== */}
      <div className="px-3.5 pt-3 pb-2.5 bg-[var(--bg-color)] border-b border-[var(--border-subtle)] space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-display font-semibold text-xs text-[var(--text-primary)] truncate">
              {activePartner.name}s telefon (Simulator)
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onSelectFriendInMyApp && (
              <button
                type="button"
                onClick={() => onSelectFriendInMyApp(activePartner.key)}
                title="Öppna denna chatt i min app till vänster"
                className="px-2 py-1 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[10.5px] font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowSquareOut size={12} />
                <span>Öppna i min app</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCloseSimulator}
              title="Stäng simulator"
              className="w-7 h-7 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Välj vilken vän/partner du styr i högra telefonen + Lägg till ny */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {friends.map((f) => {
            const active = f.key === activePartner.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setActivePartnerKey(f.key);
                  if (onSelectFriendInMyApp && selectedFriendKeyInMyApp) {
                    onSelectFriendInMyApp(f.key);
                  }
                }}
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
          <button
            type="button"
            onClick={() => setShowNewFriendInput((prev) => !prev)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap bg-[var(--surface-color)] text-[var(--text-primary)] border border-dashed border-[var(--border-control)] flex items-center gap-1 cursor-pointer shrink-0"
          >
            <UserPlus size={12} />
            <span>Ny vän</span>
          </button>
        </div>

        {showNewFriendInput && (
          <form
            onSubmit={handleCreateSimulatedNewFriend}
            className="flex items-center gap-1.5 pt-0.5 animate-fade-in"
          >
            <input
              type="text"
              value={newFriendName}
              onChange={(e) => setNewFriendName(e.target.value)}
              placeholder="Namn på ny vän (t.ex. Alex)..."
              className="flex-1 bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newFriendName.trim()}
              className="px-3 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold disabled:opacity-40 cursor-pointer"
            >
              Skapa & säg hej
            </button>
          </form>
        )}

        {/* Segmented Tab: Chatt vs Delad budget + Auto-svar toggle */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
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
              <span>Chatt</span>
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

          <button
            type="button"
            onClick={() => {
              const next = !autoReplyEnabled;
              setAutoReplyEnabled(next);
              setStoredAutoReply(next);
            }}
            title="När Auto-svar är på svarar motparten automatiskt (med Skriver...-indikator och läskvitton) när du skriver i din app"
            className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
              autoReplyEnabled
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-[var(--surface-color)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
            }`}
          >
            <Robot size={14} weight={autoReplyEnabled ? 'fill' : 'regular'} />
            <span>Auto-svar {autoReplyEnabled ? 'På' : 'Av'}</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FLIK 1: FULLSTÄNDIG CHATT UR MOTPARTENS PERSPEKTIV             */}
      {/* ============================================================== */}
      {simTab === 'chat' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between bg-[var(--bg-color)]">
          {/* Snabbknappar för att skicka utläggskort eller testa händelser från motparten */}
          <div className="px-3 py-2 bg-[var(--surface-color)]/70 border-b border-[var(--border-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() =>
                handleSendPartnerCard(
                  {
                    kind: 'expense_split',
                    title: 'ICA Kvantum',
                    amount: 340,
                    totalAmount: 680,
                    category: 'Mat & dryck',
                    swishPhone: activePartner.phone || '070-345 12 89',
                  },
                  `Jag betalade ICA Kvantum (680 kr). Din del är 340 kr.`
                )
              }
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap cursor-pointer shrink-0"
            >
              + Utlägg ICA (340 kr)
            </button>
            <button
              type="button"
              onClick={() =>
                handleSendPartnerCard(
                  {
                    kind: 'expense_split',
                    title: 'Restaurang Basta',
                    amount: 395,
                    totalAmount: 790,
                    category: 'Uteliv',
                    swishPhone: activePartner.phone || '070-345 12 89',
                  },
                  `Här kommer notan från Basta (totalt 790 kr)!`
                )
              }
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] whitespace-nowrap cursor-pointer shrink-0"
            >
              + Restaurang (395 kr)
            </button>
            <button
              type="button"
              onClick={() => {
                sendLiveTypingSignal({
                  myKey: activePartner.key,
                  myName: activePartner.name,
                  friendKey: myKey,
                  isTyping: true,
                });
                window.setTimeout(() => {
                  sendLiveTypingSignal({
                    myKey: activePartner.key,
                    myName: activePartner.name,
                    friendKey: myKey,
                    isTyping: false,
                  });
                }, 3200);
              }}
              className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap cursor-pointer shrink-0"
            >
              Simulera "Skriver..."
            </button>
          </div>

          {/* Meddelandelista (Motpartens meddelanden till höger, dina till vänster!) */}
          <div
            className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3"
            onClick={() => {
              if (activeActionMsgId) setActiveActionMsgId(null);
            }}
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 text-xs text-[var(--text-secondary)]">
                <p className="font-display font-semibold text-sm text-[var(--text-primary)] mb-1">
                  Chatt med {myUserName || 'dig'}
                </p>
                <p>
                  Skriv i din app till vänster eller svara härifrån som {activePartner.name.split(' ')[0]}.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                // I motpartens telefon är "isFromPartner" = motpartens egna meddelanden (högerställda)
                const isFromPartner = m.senderKey === activePartner.key;
                const isReadByMainUser =
                  isFromPartner &&
                  Array.isArray(m.readBy) &&
                  m.readBy.includes(myKey);
                const reactionEntries = Object.entries(m.reactions || {}).filter(
                  ([, users]) => Array.isArray(users) && users.length > 0
                );
                const isActionOpen = activeActionMsgId === m.id;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      isFromPartner ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="max-w-[85%] space-y-1">
                      {/* Citerat svar om det finns */}
                      {m.replyTo && (
                        <div className="px-2.5 py-1 rounded-xl text-[10.5px] border-l-2 bg-[var(--surface-color)] border-[var(--border-control)] text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)] block">
                            {m.replyTo.senderName}
                          </span>
                          <span className="line-clamp-1">{m.replyTo.text}</span>
                        </div>
                      )}

                      {/* Delat kort (Utlägg / Delad budget / Sparmål) */}
                      {m.sharedPayload && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMsgId((prev) =>
                              prev === m.id ? null : m.id
                            );
                          }}
                          className="rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-3 space-y-2 shadow-subtle cursor-pointer"
                        >
                          {m.sharedPayload.kind === 'expense_split' && (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10.5px] font-medium text-[var(--text-secondary)]">
                                  Delat utlägg · 50/50
                                </span>
                                <span
                                  className={`text-[10.5px] font-semibold ${
                                    m.sharedPayload.settled
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-amber-600 dark:text-amber-400'
                                  }`}
                                >
                                  {m.sharedPayload.settled ? 'Betald ✓' : 'Att betala'}
                                </span>
                              </div>
                              <div className="flex items-baseline justify-between gap-2">
                                <div className="min-w-0">
                                  <span className="font-display font-semibold text-xs text-[var(--text-primary)] block truncate">
                                    {m.sharedPayload.title}
                                  </span>
                                  {m.sharedPayload.totalAmount && (
                                    <span className="text-[10.5px] text-[var(--text-secondary)] tabular-nums block">
                                      Totalt {formatKr(m.sharedPayload.totalAmount)}
                                    </span>
                                  )}
                                </div>
                                <span className="font-display font-bold text-sm text-[var(--text-primary)] tabular-nums shrink-0">
                                  {formatKr(m.sharedPayload.amount || 0)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await toggleMessageSplitSettled({
                                    myKey: activePartner.key,
                                    friendKey: myKey,
                                    messageId: m.id,
                                  });
                                  refreshState();
                                }}
                                className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                                  m.sharedPayload.settled
                                    ? 'bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                                    : 'bg-[var(--text-primary)] text-[var(--bg-color)]'
                                }`}
                              >
                                <Check size={12} weight="bold" />
                                <span>
                                  {m.sharedPayload.settled
                                    ? 'Markerad som betald'
                                    : `Markera betald som ${activePartner.name.split(' ')[0]}`}
                                </span>
                              </button>
                            </>
                          )}

                          {m.sharedPayload.kind === 'household_invite' && (
                            <div className="space-y-1">
                              <span className="text-[10.5px] text-[var(--text-secondary)] block">
                                Inbjudan till delad budget
                              </span>
                              <span className="font-display font-semibold text-xs text-[var(--text-primary)] block">
                                {m.sharedPayload.householdName || 'Gemensamt hushåll'}
                              </span>
                            </div>
                          )}

                          {m.sharedPayload.kind === 'savings_goal' && (
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="text-[10.5px] text-[var(--text-secondary)] block">
                                  Sparmål
                                </span>
                                <span className="font-display font-semibold text-xs text-[var(--text-primary)] block">
                                  {m.sharedPayload.goalName || m.sharedPayload.title}
                                </span>
                              </div>
                              <span className="font-display font-bold text-xs text-emerald-500 tabular-nums">
                                {formatKr(m.sharedPayload.goalCurrent || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Meddelandebubbla (klicka för att reagera eller svara som motpart!) */}
                      {m.text && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionMsgId((prev) =>
                              prev === m.id ? null : m.id
                            );
                          }}
                          className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words cursor-pointer transition-opacity active:opacity-80 ${
                            isFromPartner
                              ? 'bg-[var(--text-primary)] text-[var(--bg-color)] rounded-br-sm'
                              : 'bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-bl-sm'
                          }`}
                        >
                          <span>{m.text}</span>
                        </div>
                      )}

                      {/* Emoji-reaktion & Svara-meny som motpart */}
                      {isActionOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-0.5 p-1 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-md w-fit animate-scale-in ${
                            isFromPartner ? 'ml-auto' : ''
                          }`}
                        >
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={async () => {
                                await toggleMessageReaction({
                                  myKey: activePartner.key,
                                  friendKey: myKey,
                                  messageId: m.id,
                                  emoji,
                                });
                                setActiveActionMsgId(null);
                                refreshState();
                              }}
                              className="w-6 h-6 rounded-full hover:bg-[var(--surface-hover)] flex items-center justify-center text-xs cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToMsg({
                                id: m.id,
                                senderName: isFromPartner
                                  ? activePartner.name.split(' ')[0]
                                  : myUserName || 'Du',
                                text: m.text || m.sharedPayload?.title || 'Delat kort',
                              });
                              setActiveActionMsgId(null);
                            }}
                            className="px-2 h-6 rounded-full hover:bg-[var(--surface-hover)] text-[10.5px] font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer border-l border-[var(--border-subtle)]"
                          >
                            <ArrowBendUpLeft size={11} />
                            <span>Svara</span>
                          </button>
                        </div>
                      )}

                      {/* Reaktioner + Tid + Läskvitto */}
                      <div
                        className={`flex items-center gap-1.5 px-1 text-[10px] text-[var(--text-muted)] ${
                          isFromPartner ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {reactionEntries.map(([emoji, users]) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={async () => {
                              await toggleMessageReaction({
                                myKey: activePartner.key,
                                friendKey: myKey,
                                messageId: m.id,
                                emoji,
                              });
                              refreshState();
                            }}
                            className={`px-1.5 py-0.5 rounded-full border text-[10.5px] flex items-center gap-1 cursor-pointer ${
                              users.includes(activePartner.key)
                                ? 'bg-[var(--surface-color)] border-[var(--text-primary)] text-[var(--text-primary)]'
                                : 'bg-[var(--surface-color)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <span>{emoji}</span>
                            {users.length > 1 && <span>{users.length}</span>}
                          </button>
                        ))}
                        <span className="tabular-nums">{formatTimeShort(m.createdAt)}</span>
                        {isFromPartner && (
                          <Checks
                            size={12}
                            weight="bold"
                            className={
                              isReadByMainUser
                                ? 'text-emerald-500'
                                : 'text-[var(--text-muted)]'
                            }
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Visas i motpartens telefon när DU skriver i din app */}
            {isMainUserTypingToPartner && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] px-1 animate-fade-in">
                <span className="inline-flex gap-1 px-2.5 py-1.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-secondary)] animate-pulse" />
                </span>
                <span>{myUserName || 'Du'} skriver...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* + Meny för att skicka valfritt utlägg / inbjudan / sparmål från motparten */}
          {showAttachMenu && (
            <div className="p-3 bg-[var(--surface-color)] border-t border-[var(--border-subtle)] space-y-2.5 animate-fade-in shrink-0">
              <div className="flex items-center justify-between">
                <span className="font-display font-semibold text-xs text-[var(--text-primary)]">
                  Skicka kort från {activePartner.name.split(' ')[0]}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customSplitTitle}
                  onChange={(e) => setCustomSplitTitle(e.target.value)}
                  placeholder="Vad gällde utlägget? (t.ex. Bio)"
                  className="flex-1 bg-[var(--bg-color)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
                <input
                  type="number"
                  value={customSplitTotal}
                  onChange={(e) => setCustomSplitTotal(e.target.value)}
                  placeholder="Totalt kr"
                  className="w-24 bg-[var(--bg-color)] border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!customSplitTitle.trim() || !(Number(customSplitTotal) > 0)}
                  onClick={() => {
                    const tot = Number(customSplitTotal) || 0;
                    const half = Math.round(tot / 2);
                    void handleSendPartnerCard(
                      {
                        kind: 'expense_split',
                        title: customSplitTitle.trim(),
                        amount: half,
                        totalAmount: tot,
                        category: 'Övrigt',
                        swishPhone: activePartner.phone || '070-345 12 89',
                      },
                      `Delat utlägg för ${customSplitTitle.trim()} (totalt ${formatKr(tot)}, din del ${formatKr(half)}).`
                    );
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold disabled:opacity-40 cursor-pointer shrink-0"
                >
                  Dela
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleSendPartnerCard(
                      {
                        kind: 'household_invite',
                        title: `${activePartner.name.split(' ')[0]} & ${myUserName || 'Du'}`,
                        householdName: `${activePartner.name.split(' ')[0]} & ${myUserName || 'Du'}`,
                        inviteCode: activePartner.friendCode || 'DJZ814',
                      },
                      `Jag bjuder in dig till vår delade budget!`
                    )
                  }
                  className="py-1.5 px-2.5 rounded-xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Users size={13} />
                  <span>Bjud in till Delad budget</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSendPartnerCard(
                      {
                        kind: 'savings_goal',
                        title: 'Sommarresa Italien',
                        goalName: 'Sommarresa Italien',
                        goalCurrent: 16500,
                        goalTarget: 30000,
                      },
                      `Kolla! Satte precis in 2 000 kr extra på vårt sparmål.`
                    )
                  }
                  className="py-1.5 px-2.5 rounded-xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PiggyBank size={13} />
                  <span>Dela sparmålskort</span>
                </button>
              </div>
            </div>
          )}

          {/* Input som motpart */}
          <div className="p-2.5 bg-[var(--surface-color)] border-t border-[var(--border-subtle)] space-y-1.5 shrink-0">
            {replyToMsg && (
              <div className="flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[11px]">
                <div className="min-w-0">
                  <span className="font-semibold text-[var(--text-primary)] block">
                    Svarar {replyToMsg.senderName}
                  </span>
                  <span className="text-[var(--text-secondary)] truncate block">
                    {replyToMsg.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMsg(null)}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            <form onSubmit={handleSendAsPartner} className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowAttachMenu((prev) => !prev)}
                title="Dela utlägg, budget eller sparmål från motparten"
                className="w-8 h-8 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] cursor-pointer shrink-0"
              >
                <Plus size={14} weight="bold" />
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setChatInput(val);
                  sendLiveTypingSignal({
                    myKey: activePartner.key,
                    myName: activePartner.name,
                    friendKey: myKey,
                    isTyping: val.trim().length > 0,
                  });
                  if (partnerTypingTimeoutRef.current) {
                    window.clearTimeout(partnerTypingTimeoutRef.current);
                  }
                  partnerTypingTimeoutRef.current = window.setTimeout(() => {
                    sendLiveTypingSignal({
                      myKey: activePartner.key,
                      myName: activePartner.name,
                      friendKey: myKey,
                      isTyping: false,
                    });
                  }, 2500);
                }}
                placeholder={`Skriv som ${activePartner.name.split(' ')[0]}...`}
                className="flex-1 bg-[var(--bg-color)] border border-[var(--border-subtle)] rounded-full px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
              />

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center disabled:opacity-35 cursor-pointer shrink-0"
              >
                <PaperPlaneTilt size={14} weight="fill" />
              </button>
            </form>
          </div>
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
