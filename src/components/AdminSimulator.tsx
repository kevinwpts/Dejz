import React, { useMemo, useState } from 'react';
import {
  Play,
  Users,
  User,
  PiggyBank,
  Sparkle,
  Plus,
  Receipt,
  CheckCircle,
  Wallet,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem } from './HomeTab';
import { PeriodInfo } from '../utils/periodEngine';
import { getSavingsGoals, saveSavingsGoals, SavingsGoalItem } from '../utils/appCache';
import {
  HouseholdState,
  HouseholdMemberSummary,
  saveHouseholdStateLocal,
  clearHouseholdStateLocal,
  getMemberKey,
  computeMyHouseholdSummary,
  pushHouseholdSyncToServer,
} from '../utils/householdSync';
import { SocialFriend, getStoredFriends, saveStoredFriends } from '../utils/friends';

/** Testpartnern i scenariot "Sambo" (påhittad person). */
const DEMO_PARTNER: SocialFriend = {
  key: 'sofia.lind@dejz.se',
  name: 'Sofia Lind',
  email: 'sofia.lind@dejz.se',
  phone: '070-345 12 89',
  friendCode: 'DJZ814',
  addedAt: new Date().toISOString(),
  online: true,
};

function ensureDemoPartner(): void {
  const existing = getStoredFriends();
  if (!existing.some((f) => f.key === DEMO_PARTNER.key)) {
    saveStoredFriends([...existing, DEMO_PARTNER]);
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
  onRestartOnboarding: () => void;
  onStartCreateGoalWizard: () => void;
  onOpenAddFixed: () => void;
  onOpenPreviewFixed: () => void;
  onOpenDiscoverSubscriptions: () => void;
  onOpenAddIncome: () => void;
  onOpenAddTransaction: () => void;
  onOpenPreviewTransaction: () => void;
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
  onRestartOnboarding,
  onStartCreateGoalWizard,
  onOpenAddFixed,
  onOpenPreviewFixed,
  onOpenDiscoverSubscriptions,
  onOpenAddIncome,
  onOpenAddTransaction,
  onOpenPreviewTransaction,
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

  const myHouseholdKey = useMemo(
    () => getMemberKey(userEmail, userName),
    [userEmail, userName]
  );

  // SCENARIO 1: Singel / 100 % Egen ekonomi
  const applySingleScenario = () => {
    clearHouseholdStateLocal();
    saveStoredFriends([]);

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
    ensureDemoPartner();
    const partnerFriend = DEMO_PARTNER;

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
          fullAmount: 1680,
          paidByEmail: partnerFriend.email,
          paidByName: partnerFriend.name,
        },
        {
          id: 'sofia-exp-2',
          title: 'Apoteket Hjärtat',
          amount: 420,
          category: 'Mat & dryck',
          date: new Date().toISOString().slice(0, 10),
          kind: 'variable',
          fullAmount: 420,
          paidByEmail: partnerFriend.email,
          paidByName: partnerFriend.name,
        },
        {
          id: 'sofia-exp-3',
          title: 'Hemförsäkring & Bredband',
          amount: 1080,
          category: 'Boende',
          date: new Date().toISOString().slice(0, 10),
          kind: 'fixed',
          fullAmount: 1080,
          paidByEmail: partnerFriend.email,
          paidByName: partnerFriend.name,
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

    showToast('Scenario aktiverat: Sambo (Egen + Delad budget med Sofia)');
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
      {/* 1. VÄXLA EKONOMISCENARIO (1 KLICK)                             */}
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

        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TESTA STEG & FLÖDEN DIREKT                                  */}
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                Öppna skapandevy
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
              <span className="text-[11px] text-[var(--text-secondary)] block truncate">
                Öppna hushållsvyn
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
