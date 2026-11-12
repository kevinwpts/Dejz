import type { MutableRefObject, SetStateAction } from 'react';
import { PeriodInfo, WeekendHandlingMode } from '../../utils/periodEngine';
import { AppTab } from '../../components/BottomNav';
import { IncomeItem, FixedExpenseItem, TransactionItem } from '../../components/HomeTab';
import type { SettingsSubView } from '../../components/settings/subviews';
import { BankConnection, BankAccount } from '../../services/bankService';


import { FeedbackToastState } from '../components/AppToasts';
import { createBankAccountActions } from './bankAccountActions';
import { useBudgetItemActions } from './useBudgetItemActions';
import { useTransactionActions } from './useTransactionActions';

export interface UseAppActionsContext {
  setSyncingBank: (value: SetStateAction<boolean>) => void;
  lastSyncTimestampRef: MutableRefObject<number>;
  refreshBankStatus: () => Promise<{ connections: BankConnection[]; accounts: BankAccount[]; }>;
  connections: BankConnection[];
  userId: string | null;
  incomesRef: MutableRefObject<IncomeItem[]>;
  setIncomes: (value: SetStateAction<IncomeItem[]>) => void;
  userIdRef: MutableRefObject<string | null>;
  transactionsRef: MutableRefObject<TransactionItem[]>;
  fixedExpensesRef: MutableRefObject<FixedExpenseItem[]>;
  setTransactions: (value: SetStateAction<TransactionItem[]>) => void;
  setFixedExpenses: (value: SetStateAction<FixedExpenseItem[]>) => void;
  setIsTxModalOpen: (value: SetStateAction<boolean>) => void;
  setSelectedTransaction: (value: SetStateAction<TransactionItem | null>) => void;
  showFeedbackToast: (toast: FeedbackToastState, durationMs?: number) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  setSelectedFixedExpense: (value: SetStateAction<FixedExpenseItem | null>) => void;
  fixedExpenses: FixedExpenseItem[];
  transactions: TransactionItem[];
  period: PeriodInfo;
  periodRecurringMatches: { claimedFixedTxIds: Set<string>; matchedFixedTxByExpId: Map<string, TransactionItem>; matchedFixedIds: Set<string>; claimedIncomeTxIds: Set<string>; matchedIncomeTxByIncId: Map<string, TransactionItem>; matchedIncomeIds: Set<string>; };
  hasActiveBankConnection: boolean;
  setDismissedTxIds: (value: SetStateAction<string[]>) => void;
  undoTimerRef: MutableRefObject<number | null>;
  setUndoToast: (value: SetStateAction<{ id: string; excluded: boolean; title: string; } | null>) => void;
  lastHydratedUserIdRef: MutableRefObject<string | null>;
  setUserId: (value: SetStateAction<string | null>) => void;
  setUserEmail: (value: SetStateAction<string | null>) => void;
  setUserName: (value: SetStateAction<string | null>) => void;
  setUserAvatar: (value: SetStateAction<string | null>) => void;
  setConnections: (value: SetStateAction<BankConnection[]>) => void;
  setBankAccounts: (value: SetStateAction<BankAccount[]>) => void;
  setSettingsSubView: (value: SetStateAction<SettingsSubView>) => void;
  setShowLanding: (value: SetStateAction<boolean>) => void;
  setIsOnboardingActive: (value: SetStateAction<boolean>) => void;
  userEmail: string | null;
  isDeletingAccountRef: MutableRefObject<boolean>;
  pendingRefreshRef: MutableRefObject<boolean>;
  aiCleanedKeysRef: MutableRefObject<Set<string>>;
  setTargetPayday: (value: SetStateAction<number>) => void;
  setWeekendHandling: (value: SetStateAction<WeekendHandlingMode>) => void;
  setCallbackStatusMsg: (value: SetStateAction<string | null>) => void;
}

export function useAppActions(ctx: UseAppActionsContext) {
  // Uppdelat efter område – se createBankAccountActions, useBudgetItemActions och useTransactionActions
  return {
    ...createBankAccountActions(ctx),
    ...useBudgetItemActions(ctx),
    ...useTransactionActions(ctx),
  };
}
