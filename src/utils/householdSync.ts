import { FixedExpenseItem, IncomeItem, TransactionItem } from '../components/HomeTab';
import {
  SavingsGoalItem,
  getSavingsGoals,
  saveSavingsGoals,
  syncAllUserPreferencesToSupabase,
} from './appCache';
import { PeriodInfo, isDateInPeriod } from './periodEngine';
import { reconcilePeriodRecurringMatches } from './recurring';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

export const HOUSEHOLD_STORAGE_KEY = 'dejz_household_state_v1';

export interface SharedExpenseEntry {
  id: string;
  title: string;
  amount: number;
  fullAmount: number;
  category: string;
  date?: string;
  dueDay?: number;
  kind: 'fixed' | 'variable';
  paidByEmail: string;
  paidByName: string;
}

export interface HouseholdMemberSummary {
  email: string;
  name: string;
  avatar?: string | null;
  totalIncome: number;
  sharedFixedPaid: number;
  sharedVariableSpent: number;
  sharedExpensesList: SharedExpenseEntry[];
  isDemoPartner?: boolean;
  updatedAt: string;
}

export interface HouseholdState {
  householdId: string;
  inviteCode: string;
  name: string;
  splitMode: 'equal' | 'income';
  sharedCategories: string[];
  members: Record<string, HouseholdMemberSummary>;
  sharedFixedExpenses: FixedExpenseItem[];
  sharedSavingsGoals: SavingsGoalItem[];
  settledAt?: string;
  settledPeriodStart?: string;
  updatedAt: string;
}

export function getHouseholdState(): HouseholdState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.inviteCode) return null;
    return parsed as HouseholdState;
  } catch {
    return null;
  }
}

export function saveHouseholdStateLocal(state: HouseholdState | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!state) {
      localStorage.removeItem(HOUSEHOLD_STORAGE_KEY);
    } else {
      localStorage.setItem(HOUSEHOLD_STORAGE_KEY, JSON.stringify(state));
    }
    syncAllUserPreferencesToSupabase();
    window.dispatchEvent(new CustomEvent('dejz:household-updated', { detail: state }));
  } catch {
    // ignore
  }
}

export function generateInviteCode(): string {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return digits;
}

export function formatInviteCodeDisplay(code: string): string {
  const clean = (code || '').replace(/\s+/g, '').toUpperCase();
  if (clean.length === 6) {
    return `${clean.slice(0, 3)} ${clean.slice(3)}`;
  }
  return clean;
}

export function getMemberKey(email?: string | null, name?: string | null): string {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) return cleanEmail;
  const cleanName = (name || 'jag').trim().toLowerCase().replace(/\s+/g, '_');
  return `${cleanName}@local.dejz`;
}

export function computeMyHouseholdSummary(params: {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  period: PeriodInfo;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  sharedCategories: string[];
}): HouseholdMemberSummary {
  const {
    userEmail,
    userName,
    userAvatar,
    period,
    incomes,
    fixedExpenses,
    transactions,
    sharedCategories,
  } = params;

  const myKey = getMemberKey(userEmail, userName);
  const myDisplayName = (userName || '').trim() || (userEmail ? userEmail.split('@')[0] : 'Jag');

  const totalIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

  const periodTxs = transactions.filter((t) => isDateInPeriod(t.date, period));
  const recMatches = reconcilePeriodRecurringMatches(periodTxs, fixedExpenses, incomes);

  const sharedExpensesList: SharedExpenseEntry[] = [];
  let sharedFixedPaid = 0;

  for (const exp of fixedExpenses) {
    if (!exp.isShared) continue;
    const fullAmt =
      exp.fullAmount && exp.fullAmount > exp.amount
        ? Number(exp.fullAmount)
        : (Number(exp.amount) || 0) * 2;
    sharedFixedPaid += fullAmt;
    sharedExpensesList.push({
      id: `fixed-${exp.id}`,
      title: exp.name,
      amount: Number(exp.amount) || 0,
      fullAmount: fullAmt,
      category: exp.category || 'Boende',
      dueDay: exp.dueDay || 27,
      kind: 'fixed',
      paidByEmail: myKey,
      paidByName: myDisplayName,
    });
  }

  const sharedCatSet = new Set(sharedCategories.map((c) => c.toLowerCase().trim()));
  let sharedVariableSpent = 0;

  for (const tx of periodTxs) {
    if (tx.type === 'income') continue;
    if (tx.excludeFromBudget) continue;
    if (tx.category === 'Sparande') continue;
    if (recMatches.claimedFixedTxIds.has(tx.id)) continue;

    const catLower = (tx.category || '').toLowerCase().trim();
    const isSharedTx = Boolean((tx as any).isSharedExpense) || sharedCatSet.has(catLower);
    if (!isSharedTx) continue;

    const amt = Math.abs(Number(tx.amount) || 0);
    if (amt <= 0) continue;

    sharedVariableSpent += amt;
    sharedExpensesList.push({
      id: `tx-${tx.id}`,
      title: tx.title,
      amount: Math.round(amt / 2),
      fullAmount: amt,
      category: tx.category || 'Mat & dryck',
      date: tx.date,
      kind: 'variable',
      paidByEmail: myKey,
      paidByName: myDisplayName,
    });
  }

  return {
    email: myKey,
    name: myDisplayName,
    avatar: userAvatar || null,
    totalIncome,
    sharedFixedPaid,
    sharedVariableSpent,
    sharedExpensesList,
    updatedAt: new Date().toISOString(),
  };
}

export interface SettlementSummary {
  myMember: HouseholdMemberSummary;
  partnerMember: HouseholdMemberSummary | null;
  myShareRatio: number; // e.g., 0.5 for 50/50, or income ratio
  partnerShareRatio: number;
  myTotalPaid: number;
  partnerTotalPaid: number;
  combinedTotalShared: number;
  myFairShare: number;
  partnerFairShare: number;
  netBalance: number; // positive = partner owes me, negative = I owe partner
  isSettledForCurrentPeriod: boolean;
}

export function calculateHouseholdSettlement(
  household: HouseholdState,
  myKey: string,
  currentPeriodStart: string
): SettlementSummary {
  const membersList = Object.values(household.members || {});
  const myMember =
    household.members[myKey] ||
    membersList[0] || {
      email: myKey,
      name: 'Jag',
      totalIncome: 0,
      sharedFixedPaid: 0,
      sharedVariableSpent: 0,
      sharedExpensesList: [],
      updatedAt: new Date().toISOString(),
    };

  const partnerMember =
    membersList.find((m) => m.email.toLowerCase() !== myMember.email.toLowerCase()) || null;

  let myShareRatio = 0.5;
  let partnerShareRatio = 0.5;

  if (household.splitMode === 'income' && partnerMember) {
    const combinedInc = (myMember.totalIncome || 0) + (partnerMember.totalIncome || 0);
    if (combinedInc > 0) {
      myShareRatio = (myMember.totalIncome || 0) / combinedInc;
      partnerShareRatio = 1 - myShareRatio;
    }
  }

  const myTotalPaid = (myMember.sharedFixedPaid || 0) + (myMember.sharedVariableSpent || 0);
  const partnerTotalPaid = partnerMember
    ? (partnerMember.sharedFixedPaid || 0) + (partnerMember.sharedVariableSpent || 0)
    : 0;

  const combinedTotalShared = myTotalPaid + partnerTotalPaid;
  const myFairShare = Math.round(combinedTotalShared * myShareRatio);
  const partnerFairShare = Math.round(combinedTotalShared * partnerShareRatio);

  // If I paid more than my fair share, netBalance > 0 (partner owes me)
  const netBalance = partnerMember ? Math.round(myTotalPaid - myFairShare) : 0;

  const isSettledForCurrentPeriod = Boolean(
    household.settledAt && household.settledPeriodStart === currentPeriodStart
  );

  return {
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
  };
}

let activeBroadcastChannel: any = null;
let activeChannelHouseholdId: string | null = null;

export function broadcastHouseholdUpdate(state: HouseholdState): void {
  if (!isSupabaseConfigured || !state?.householdId) return;
  try {
    if (activeBroadcastChannel && activeChannelHouseholdId === state.householdId) {
      activeBroadcastChannel.send({
        type: 'broadcast',
        event: 'household-update',
        payload: state,
      });
    }
  } catch {
    // ignore
  }
}

export async function pushHouseholdSyncToServer(state: HouseholdState): Promise<HouseholdState> {
  saveHouseholdStateLocal(state);
  broadcastHouseholdUpdate(state);
  try {
    const res = await fetch('/api/household/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ household: state }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.household) {
        saveHouseholdStateLocal(data.household);
        return data.household;
      }
    }
  } catch {
    // offline fallback keeps local state
  }
  return state;
}

export function subscribeToHouseholdRealtime(
  householdId: string,
  inviteCode: string,
  onReceiveUpdate: (nextState: HouseholdState) => void
): () => void {
  if (!householdId) return () => {};

  if (isSupabaseConfigured) {
    try {
      const channel = supabase.channel(`household:${householdId}`, {
        config: { broadcast: { self: false } },
      });
      channel
        .on('broadcast', { event: 'household-update' }, (msg: any) => {
          const incoming = msg?.payload as HouseholdState | undefined;
          if (incoming && incoming.inviteCode) {
            saveHouseholdStateLocal(incoming);
            if (Array.isArray(incoming.sharedSavingsGoals) && incoming.sharedSavingsGoals.length > 0) {
              saveSavingsGoals(incoming.sharedSavingsGoals);
            }
            onReceiveUpdate(incoming);
          }
        })
        .subscribe();

      activeBroadcastChannel = channel;
      activeChannelHouseholdId = householdId;
    } catch {
      // ignore
    }
  }

  // Also poll server state every 20 seconds when tab is visible so updates made while partner was offline arrive automatically
  const intervalId = setInterval(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    try {
      const res = await fetch(`/api/household/state?code=${encodeURIComponent(inviteCode)}`);
      if (!res.ok) return;
      const data = await res.json();
      const serverHh = data?.household as HouseholdState | undefined;
      if (!serverHh || !serverHh.updatedAt) return;
      const current = getHouseholdState();
      if (!current || serverHh.updatedAt > current.updatedAt) {
        saveHouseholdStateLocal(serverHh);
        onReceiveUpdate(serverHh);
      }
    } catch {
      // ignore
    }
  }, 20000);

  return () => {
    clearInterval(intervalId);
    if (activeBroadcastChannel) {
      try {
        supabase.removeChannel(activeBroadcastChannel);
      } catch {
        // ignore
      }
      activeBroadcastChannel = null;
      activeChannelHouseholdId = null;
    }
  };
}
