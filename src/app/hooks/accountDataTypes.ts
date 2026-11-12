// Gemensamma typer för kontodatan (inloggning, laddning och bankkoppling). Delas av useAccountData och dess delhooks.
import type React from 'react';
import type { WeekendHandlingMode } from '../../utils/periodEngine';
import type { IncomeItem, FixedExpenseItem, TransactionItem } from '../../components/HomeTab';
import type { BankConnection, BankAccount } from '../../services/bankService';

/** Resultatet av en bankstatus-hämtning (kopplingar + konton). */
export interface BankStatusResult {
  connections: BankConnection[];
  accounts: BankAccount[];
}

/** Väntande återkomst från banken (?code=...&state=...). */
export interface PendingBankCallback {
  code: string;
  state: string;
  promise: Promise<void> | null;
  done: boolean;
}

export interface AccountDataContext {
  connections: BankConnection[];
  fixedExpensesRef: React.RefObject<FixedExpenseItem[]>;
  hydrationInFlightRef: React.RefObject<string | null>;
  incomesRef: React.RefObject<IncomeItem[]>;
  isDeletingAccountRef: React.RefObject<boolean>;
  lastHydratedUserIdRef: React.RefObject<string | null>;
  lastSyncTimestampRef: React.RefObject<number>;
  pendingBankCallbackRef: React.RefObject<PendingBankCallback | null>;
  pendingRefreshRef: React.RefObject<boolean>;
  refreshInFlightRef: React.RefObject<Promise<BankStatusResult> | null>;
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  setCallbackStatusMsg: React.Dispatch<React.SetStateAction<string | null>>;
  setConnections: React.Dispatch<React.SetStateAction<BankConnection[]>>;
  setExcludeInternalTransfersState: React.Dispatch<React.SetStateAction<boolean>>;
  setFixedExpenses: React.Dispatch<React.SetStateAction<FixedExpenseItem[]>>;
  setIncomes: React.Dispatch<React.SetStateAction<IncomeItem[]>>;
  setIsBankModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInitialLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setIsOnboardingActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowLanding: React.Dispatch<React.SetStateAction<boolean>>;
  setTargetPayday: React.Dispatch<React.SetStateAction<number>>;
  setTransactions: React.Dispatch<React.SetStateAction<TransactionItem[]>>;
  setUserAvatar: React.Dispatch<React.SetStateAction<string | null>>;
  setUserEmail: React.Dispatch<React.SetStateAction<string | null>>;
  setUserId: React.Dispatch<React.SetStateAction<string | null>>;
  setUserName: React.Dispatch<React.SetStateAction<string | null>>;
  setWeekendHandling: React.Dispatch<React.SetStateAction<WeekendHandlingMode>>;
  syncInFlightRef: React.RefObject<boolean>;
  targetPayday: number;
  transactions: TransactionItem[];
  transactionsRef: React.RefObject<TransactionItem[]>;
  userAvatar: string | null;
  userId: string | null;
  userIdRef: React.RefObject<string | null>;
  weekendHandling: WeekendHandlingMode;
}
