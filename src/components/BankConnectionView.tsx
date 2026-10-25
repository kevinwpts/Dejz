import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2,
  RefreshCw,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Loader2,
  Wallet,
  Sparkles,
  Check,
  Unlink,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  XCircle,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import {
  Card,
  Button,
  ListRow,
  Modal,
  Switch,
  SegmentedControl,
  Input,
  FilterButtonGroup,
} from './ui';
import {
  bankService,
  BankConnection,
  BankAccount,
  BankTransactionItem,
  BankReconciliationStatus,
} from '../services/bankService';
import { BankConnectFlowModal } from './BankConnectFlowModal';
import { TransactionLogo } from './TransactionLogo';
import { CategoryIcon } from './CategoryIcon';
import { formatCurrency, formatAmount, capitalize } from '../utils/format';
import {
  Config,
  FixedExpense,
  Income,
  MonthlySaving,
  PaydayType,
  Transaction,
  WeekendAdjustment,
} from '../types';
import { dataService } from '../services/dataService';
import {
  categorizeBankTransactionForApp,
  formatBankAccountNumber,
  formatCleanBalanceLabel,
  getBankAccountShortLabel,
  getBankAccountTitle,
  getNormalizedBankTxAmount,
  isLikelySavingsAccount,
} from '../utils/bankHistoryAnalyzer';
import {
  buildReconciliationPreview,
  createAppTransactionFromBankPurchase,
  createRefundAppTransaction,
  linkManualTransactionWithBankTx,
  unlinkManualTransactionFromBankTx,
  applyPlannedOccasionOverride,
  ReconciliationPreviewResult,
  ReconciliationMatchedItem,
  ReconciliationNewTransactionItem,
  ReconciliationReviewItem,
} from '../utils/bankReconciliationEngine';
import {
  formatFullDate,
  getPaydayTypeFromDay,
  getPeriodBoundaries,
  getPeriodId,
  isFixedItemDueInPeriod,
} from '../utils/date';
import { getActiveFixedExpenses } from '../utils/cancellation';
import { getCategoryIconName } from '../utils/icons';

interface BankConnectionViewProps {
  config: Config;
  userId?: string;
  existingTransactions?: Transaction[];
  existingIncomes?: Income[];
  existingFixedExpenses?: FixedExpense[];
  onRefreshBudget?: () => Promise<void> | void;
  onNavigateToHome?: () => void;
  initialSubView?: 'connections' | 'transactions';
  onSubViewChange?: (subView: 'connections' | 'transactions') => void;
  pendingCallbackData?: {
    code?: string;
    state?: string;
    error?: string;
    errorDescription?: string;
  } | null;
  onClearPendingCallback?: () => void;
  addToast?: (message: string, type: 'success' | 'error') => void;
  onStartOnboardingWithBank?: () => void;
}

function formatDateTimeSv(isoString: string | null | undefined): string {
  if (!isoString) return 'Aldrig';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('sv-SE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Okänt datum';
  }
}

function isSyncStale(isoString: string | null | undefined): boolean {
  if (!isoString) return true;
  try {
    const ms = new Date(isoString).getTime();
    if (isNaN(ms)) return true;
    return Date.now() - ms > 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function getReconciliationBadge(
  status: BankReconciliationStatus | null | undefined,
  isReserved: boolean
): {
  label: string;
  shortLabel: string;
  tone: 'success' | 'warning' | 'neutral' | 'accent';
} {
  if (status === 'replaced_reservation') {
    return {
      label: 'Ersatt reservation',
      shortLabel: 'Ersatt reservation',
      tone: 'neutral',
    };
  }
  if (isReserved || status === 'pending_reservation') {
    return {
      label: 'Reserverad · Utanför budget',
      shortLabel: 'Reserverad',
      tone: 'warning',
    };
  }
  switch (status) {
    case 'imported_tx':
      return {
        label: 'Importerad i budget',
        shortLabel: 'Importerad',
        tone: 'success',
      };
    case 'matched_manual':
      return {
        label: 'Matchad mot manuell post',
        shortLabel: 'Matchad',
        tone: 'success',
      };
    case 'confirmed_fixed':
      return {
        label: 'Bekräftar fast utgift',
        shortLabel: 'Fast utgift',
        tone: 'success',
      };
    case 'confirmed_income':
      return {
        label: 'Bekräftar inkomst',
        shortLabel: 'Inkomst',
        tone: 'success',
      };
    case 'confirmed_saving':
      return {
        label: 'Bekräftar sparande',
        shortLabel: 'Sparande',
        tone: 'success',
      };
    case 'refund_linked':
      return {
        label: 'Återbetalning',
        shortLabel: 'Återbetalning',
        tone: 'accent',
      };
    case 'internal_transfer':
      return {
        label: 'Egen överföring',
        shortLabel: 'Överföring',
        tone: 'neutral',
      };
    case 'excluded':
      return {
        label: 'Exkluderad från budget',
        shortLabel: 'Exkluderad',
        tone: 'neutral',
      };
    case 'needs_review':
      return {
        label: 'Att granska',
        shortLabel: 'Att granska',
        tone: 'warning',
      };
    default:
      return {
        label: 'Ej avstämd ännu',
        shortLabel: 'Ej avstämd',
        tone: 'neutral',
      };
  }
}

export function BankConnectionView({
  config,
  userId,
  existingTransactions = [],
  existingIncomes = [],
  existingFixedExpenses = [],
  onRefreshBudget,
  initialSubView = 'connections',
  onSubViewChange,
  pendingCallbackData = null,
  onClearPendingCallback,
  addToast,
}: BankConnectionViewProps) {
  const [subView, setSubView] = useState<'connections' | 'transactions'>(initialSubView);
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Connect / Reconnect modal state
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [reconnectTarget, setReconnectTarget] = useState<BankConnection | null>(null);
  const [activeCallbackData, setActiveCallbackData] = useState<typeof pendingCallbackData>(null);

  // Edit accounts modal for existing connection
  const [editingAccountsConn, setEditingAccountsConn] = useState<BankConnection | null>(null);
  const [editingAccountIds, setEditingAccountIds] = useState<string[]>([]);
  const [isSavingAccountSelection, setIsSavingAccountSelection] = useState(false);

  // Per-account settings modal (custom name, include_in_budget, import_start_date, ongoing_import_enabled)
  const [editingSingleAccount, setEditingSingleAccount] = useState<BankAccount | null>(null);
  const [accountCustomNameInput, setAccountCustomNameInput] = useState('');
  const [accountIncludeInBudgetInput, setAccountIncludeInBudgetInput] = useState(true);
  const [accountImportStartInput, setAccountImportStartInput] = useState('');
  const [accountOngoingImportInput, setAccountOngoingImportInput] = useState(true);
  const [isSavingSingleAccount, setIsSavingSingleAccount] = useState(false);

  // Disconnect confirmation modal
  const [disconnectTarget, setDisconnectTarget] = useState<BankConnection | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // All bank transactions loaded for reconciliation & review
  const [allBankTransactions, setAllBankTransactions] = useState<BankTransactionItem[]>([]);
  const [isAnalyzingReconciliation, setIsAnalyzingReconciliation] = useState(false);

  // First Reconciliation ("Första avstämning") modal state
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [reconciliationStartDate, setReconciliationStartDate] = useState<string>('');
  const [reconciliationTab, setReconciliationTab] = useState<'matched' | 'new' | 'review'>('matched');
  const [selectedMatchedBankTxIds, setSelectedMatchedBankTxIds] = useState<string[]>([]);
  const [selectedNewPurchaseBankTxIds, setSelectedNewPurchaseBankTxIds] = useState<string[]>([]);
  const [newPurchaseCategoryOverrides, setNewPurchaseCategoryOverrides] = useState<Record<string, string>>({});
  const [isApplyingReconciliation, setIsApplyingReconciliation] = useState(false);

  // Review Queue ("Att granska") modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewCategorySelections, setReviewCategorySelections] = useState<Record<string, string>>({});
  const [reviewFixedSelections, setReviewFixedSelections] = useState<Record<string, string>>({});
  const [reviewManualSelections, _setReviewManualSelections] = useState<Record<string, string>>({});
  const [processingReviewTxId, setProcessingReviewTxId] = useState<string | null>(null);

  // Raw Transactions subview state
  const [transactions, setTransactions] = useState<BankTransactionItem[]>([]);
  const [txSearchQuery, setTxSearchQuery] = useState<string>('');
  const [txStatusFilter, setTxStatusFilter] = useState<'all' | 'booked' | 'reserved' | 'review'>('all');
  const [txAccountFilter, setTxAccountFilter] = useState<string>('all');
  const [txPage, setTxPage] = useState(1);
  const [txTotalCount, setTxTotalCount] = useState(0);
  const [txBookedCount, setTxBookedCount] = useState(0);
  const [txReservedCount, setTxReservedCount] = useState(0);
  const [txHasMorePages, setTxHasMorePages] = useState(false);
  const [accountsWithMoreHistory, setAccountsWithMoreHistory] = useState<string[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isLoadingMoreFromBank, setIsLoadingMoreFromBank] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [undoingBankTxId, setUndoingBankTxId] = useState<string | null>(null);

  // Selected single bank transaction detail modal
  const [selectedBankTx, setSelectedBankTx] = useState<BankTransactionItem | null>(null);

  const lang = config.language || 'sv';
  const currency = config.currency || 'kr';
  const expenseCategories = useMemo(
    () =>
      config.categories && config.categories.length > 0
        ? config.categories
            .map((c: any) => (typeof c === 'string' ? c : c?.name || ''))
            .filter(Boolean)
        : ['Mat & dryck', 'Shopping', 'Boende', 'Transport', 'Nöjen', 'Hälsa', 'Övrigt'],
    [config.categories]
  );

  // Helper to convert a BankTransactionItem into a Dejz-compatible Transaction object for TransactionLogo & CategoryIcon
  const buildDisplayTxData = useCallback(
    (tx: BankTransactionItem, overrideMerchant?: string, overrideCategory?: string) => {
      const normalizedAmt = getNormalizedBankTxAmount(tx);
      const isIncome = normalizedAmt > 0;
      const categorized = categorizeBankTransactionForApp(
        tx,
        expenseCategories,
        config.incomeCategories || []
      );
      const merchant = overrideMerchant || categorized.merchant || tx.counterparty_name || tx.description || 'Transaktion';
      const category = overrideCategory || categorized.category || (isIncome ? 'Inkomst' : 'Övrigt');
      const dateStr = tx.booking_date || tx.transaction_date || tx.value_date || '';
      const timestamp = dateStr ? new Date(`${dateStr}T12:00:00`).getTime() : Date.now();

      const searchCat = String(category || '').trim().toLowerCase();
      const matchedCategory = (config?.categories || [])
        .concat(config?.incomeCategories || [])
        .find((c: any) => {
          if (typeof c === 'string') {
            return c.trim().toLowerCase() === searchCat;
          }
          return (
            String(c?.name || '').trim().toLowerCase() === searchCat ||
            c?.id === category ||
            String(c?.id || '').toLowerCase() === searchCat
          );
        });
      const iconKey =
        (typeof matchedCategory === 'object' ? matchedCategory?.icon : undefined) ||
        getCategoryIconName(String(category || ''));

      const virtualTransaction: Transaction = {
        id: tx.id,
        merchant,
        category,
        amount: Math.abs(normalizedAmt),
        type: isIncome ? 'income' : 'expense',
        timestamp,
      };

      return {
        virtualTransaction,
        merchant,
        category,
        iconKey,
        normalizedAmt,
        isIncome,
        dateStr,
      };
    },
    [config, expenseCategories]
  );

  // Compute current pay period boundaries & current "Kvar att spendera"
  const currentPeriodInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const paydaySetting = config.payday || 25;
    const paydayType = config.payday
      ? getPaydayTypeFromDay(config.payday)
      : config.paydayType || PaydayType.TWENTY_FIFTH;
    const adjustment = config.paydayBeforeWeekend
      ? WeekendAdjustment.BEFORE
      : WeekendAdjustment.NONE;
    const bounds = getPeriodBoundaries(today, paydayType, paydaySetting, adjustment);
    const periodId = getPeriodId(bounds.start);
    const startIso = `${bounds.start.getFullYear()}-${String(bounds.start.getMonth() + 1).padStart(2, '0')}-${String(bounds.start.getDate()).padStart(2, '0')}`;
    const endIso = `${bounds.end.getFullYear()}-${String(bounds.end.getMonth() + 1).padStart(2, '0')}-${String(bounds.end.getDate()).padStart(2, '0')}`;

    const getAmt = (item: any) => {
      if (item.periodOverrides && item.periodOverrides[periodId] !== undefined) {
        return Number(item.periodOverrides[periodId]) || 0;
      }
      return Number(item.amount) || 0;
    };

    const totalIncome = existingIncomes.reduce(
      (sum, inc) => (isFixedItemDueInPeriod(inc, bounds.start, bounds.end) ? sum + getAmt(inc) : sum),
      0
    );
    const activeFixed = getActiveFixedExpenses(existingFixedExpenses, today, bounds.start, bounds.end);
    const totalFixed = activeFixed.reduce(
      (sum, fe) => (isFixedItemDueInPeriod(fe, bounds.start, bounds.end) ? sum + getAmt(fe) : sum),
      0
    );
    const monthlySavingsItems: MonthlySaving[] = config.monthlySavingsItems || [];
    const totalSavings =
      monthlySavingsItems.length > 0
        ? monthlySavingsItems.reduce(
            (sum, s) => (isFixedItemDueInPeriod(s, bounds.start, bounds.end) ? sum + getAmt(s) : sum),
            0
          )
        : Number(config.monthlySavings) || 0;

    const startMs = bounds.start.getTime();
    const endBoundaryMs = new Date(
      bounds.end.getFullYear(),
      bounds.end.getMonth(),
      bounds.end.getDate() + 1
    ).getTime() - 1;

    const periodTxs = existingTransactions.filter(
      (tx) => tx.timestamp >= startMs && tx.timestamp <= endBoundaryMs
    );
    const spentInPeriod = periodTxs
      .filter((tx) => tx.type !== 'income')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
    const extraIncomesInPeriod = periodTxs
      .filter((tx) => tx.type === 'income')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    const remainingToSpend = Math.round(
      totalIncome - totalFixed - totalSavings - spentInPeriod + extraIncomesInPeriod
    );

    return {
      periodId,
      start: bounds.start,
      end: bounds.end,
      startIso,
      endIso,
      remainingToSpend,
    };
  }, [config, existingIncomes, existingFixedExpenses, existingTransactions]);

  // Initialize default reconciliationStartDate to current pay period start
  useEffect(() => {
    if (!reconciliationStartDate && currentPeriodInfo.startIso) {
      const existingStart = accounts.find((a) => a.is_selected && a.import_start_date)?.import_start_date;
      setReconciliationStartDate(existingStart || currentPeriodInfo.startIso);
    }
  }, [currentPeriodInfo.startIso, accounts, reconciliationStartDate]);

  const selectedAccounts = useMemo(() => accounts.filter((a) => a.is_selected), [accounts]);
  const budgetAccounts = useMemo(
    () => selectedAccounts.filter((a) => a.include_in_budget !== false),
    [selectedAccounts]
  );
  const unreconciledBudgetAccounts = useMemo(
    () => budgetAccounts.filter((a) => !a.reconciliation_completed_at),
    [budgetAccounts]
  );

  useEffect(() => {
    setSubView(initialSubView);
  }, [initialSubView]);

  const handleSwitchSubView = (next: 'connections' | 'transactions') => {
    setSubView(next);
    if (onSubViewChange) onSubViewChange(next);
  };

  const loadAllForReconciliation = useCallback(async () => {
    setIsAnalyzingReconciliation(true);
    try {
      const allTxs = await bankService.listAllTransactionsForReconciliation(500);
      setAllBankTransactions(allTxs);
      return allTxs;
    } catch (err) {
      console.warn('Could not load bank transactions for reconciliation:', err);
      return [];
    } finally {
      setIsAnalyzingReconciliation(false);
    }
  }, []);

  const loadBankStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const res = await bankService.getStatus();
      const conns = res.connections || [];
      const accs = res.accounts || [];
      setConnections(conns);
      setAccounts(accs);
      if (conns.length > 0 && accs.some((a) => a.is_selected)) {
        await loadAllForReconciliation();
      } else {
        setAllBankTransactions([]);
      }
    } catch (err: any) {
      setStatusError(err?.message || 'Kunde inte hämta dina bankkopplingar.');
    } finally {
      setIsLoadingStatus(false);
    }
  }, [loadAllForReconciliation]);

  useEffect(() => {
    loadBankStatus();
  }, [loadBankStatus]);

  // Build non-destructive reconciliation preview
  const effectiveImportStartDate = reconciliationStartDate || currentPeriodInfo.startIso;

  const reconciliationPreview: ReconciliationPreviewResult = useMemo(() => {
    return buildReconciliationPreview({
      bankTransactions: allBankTransactions,
      accounts,
      importStartDate: effectiveImportStartDate,
      existingAppTransactions: existingTransactions,
      existingFixedExpenses,
      existingIncomes,
      existingMonthlySavings: config.monthlySavingsItems || [],
      config,
      currentRemainingToSpend: currentPeriodInfo.remainingToSpend,
    });
  }, [
    allBankTransactions,
    accounts,
    effectiveImportStartDate,
    existingTransactions,
    existingFixedExpenses,
    existingIncomes,
    config,
    currentPeriodInfo.remainingToSpend,
  ]);

  // Preselect high-confidence matched items and all new purchases when preview updates
  useEffect(() => {
    setSelectedMatchedBankTxIds(
      reconciliationPreview.matchedItems
        .filter((m) => m.Preselected !== false)
        .map((m) => m.bankTx.id)
    );
    setSelectedNewPurchaseBankTxIds(
      reconciliationPreview.newTransactions
        .filter((n) => n.Preselected !== false)
        .map((n) => n.bankTx.id)
    );
  }, [reconciliationPreview]);

  // Active review queue items (either marked 'needs_review' in DB/overlay or surfaced by preview on reconciled accounts)
  const activeReviewItems = useMemo<ReconciliationReviewItem[]>(() => {
    const byId = new Map<string, ReconciliationReviewItem>();
    for (const item of reconciliationPreview.reviewItems) {
      byId.set(item.bankTx.id, item);
    }
    for (const tx of allBankTransactions) {
      if (tx.reconciliation_status === 'needs_review' && !byId.has(tx.id)) {
        const amt = getNormalizedBankTxAmount(tx);
        const display = buildDisplayTxData(tx);
        byId.set(tx.id, {
          id: `review_${tx.id}`,
          bankTx: tx,
          amount: amt,
          dateIso: tx.booking_date || tx.transaction_date || tx.value_date || tx.created_at.split('T')[0],
          merchant: display.merchant,
          categorySuggestion: display.category || expenseCategories[0] || 'Övrigt',
          reason: 'uncertain_manual_match',
          reasonLabel: tx.reconciliation_note || 'Kräver din granskning innan den påverkar budgeten',
          suggestedAction: amt < 0 ? 'import_purchase' : 'exclude',
        });
      }
    }
    return Array.from(byId.values());
  }, [reconciliationPreview.reviewItems, allBankTransactions, expenseCategories, buildDisplayTxData]);

  const totalWaitingReviewAmount = useMemo(
    () => activeReviewItems.reduce((sum, r) => sum + Math.abs(r.amount), 0),
    [activeReviewItems]
  );

  // Automatic Ongoing Import runner for accounts that have completed first reconciliation
  const runAutomaticOngoingImport = useCallback(
    async (_txList: BankTransactionItem[], accList: BankAccount[]) => {
      if (!userId) return 0;
      const ongoingAccs = accList.filter(
        (a) =>
          a.is_selected &&
          a.include_in_budget !== false &&
          Boolean(a.reconciliation_completed_at) &&
          Boolean(a.ongoing_import_enabled)
      );
      if (ongoingAccs.length === 0) return 0;

      // Persist any automatic reservation replacements discovered
      if (reconciliationPreview.reservationReplacements.length > 0) {
        await bankService.bulkUpdateTransactionReconciliation(
          reconciliationPreview.reservationReplacements.map((r) => ({
            bankTransactionId: r.reservedTx.id,
            reconciliationStatus: 'replaced_reservation' as BankReconciliationStatus,
            replacedByBankTxId: r.bookedTx.id,
            reconciliationNote: r.note,
          }))
        );
      }

      const ongoingAccIds = new Set(ongoingAccs.map((a) => a.id));
      let importedCount = 0;

      // 1. Auto-import clear everyday purchases on ongoing accounts
      for (const item of reconciliationPreview.newTransactions) {
        if (!ongoingAccIds.has(item.bankTx.bank_account_id)) continue;
        if (item.bankTx.reconciliation_status && item.bankTx.reconciliation_status !== 'unprocessed') {
          continue;
        }
        const payload = createAppTransactionFromBankPurchase(item);
        const created = await dataService.addTransaction(userId, payload);
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'imported_tx',
          linkedAppTransactionId: created.id,
        });
        importedCount++;
      }

      // 2. Auto-confirm high-confidence matches on ongoing accounts
      for (const match of reconciliationPreview.matchedItems) {
        if (!ongoingAccIds.has(match.bankTx.bank_account_id)) continue;
        if (match.bankTx.reconciliation_status && match.bankTx.reconciliation_status !== 'unprocessed') {
          continue;
        }
        if (match.confidence !== 'high') continue;

        if (match.matchKind === 'manual_tx' && match.manualTx) {
          const updatedManual = linkManualTransactionWithBankTx(match.manualTx, match.bankTx);
          await dataService.updateTransaction(updatedManual.id, updatedManual);
          await bankService.updateTransactionReconciliation({
            bankTransactionId: match.bankTx.id,
            reconciliationStatus: 'matched_manual',
            linkedAppTransactionId: updatedManual.id,
          });
          importedCount++;
        } else if (match.matchKind === 'fixed_expense' && match.fixedExpense && match.periodKey) {
          const updatedFe = applyPlannedOccasionOverride(
            match.fixedExpense,
            match.periodKey,
            match.actualAmount
          );
          await dataService.saveFixedExpense(userId, updatedFe);
          await bankService.updateTransactionReconciliation({
            bankTransactionId: match.bankTx.id,
            reconciliationStatus: 'confirmed_fixed',
            linkedFixedExpenseId: updatedFe.id,
            linkedPeriodKey: match.periodKey,
          });
          importedCount++;
        } else if (match.matchKind === 'income' && match.income && match.periodKey) {
          const updatedInc = applyPlannedOccasionOverride(
            match.income,
            match.periodKey,
            match.actualAmount
          );
          await dataService.saveIncomeSource(userId, updatedInc);
          await bankService.updateTransactionReconciliation({
            bankTransactionId: match.bankTx.id,
            reconciliationStatus: 'confirmed_income',
            linkedIncomeId: updatedInc.id,
            linkedPeriodKey: match.periodKey,
          });
          importedCount++;
        } else if (match.matchKind === 'own_transfer') {
          await bankService.updateTransactionReconciliation({
            bankTransactionId: match.bankTx.id,
            reconciliationStatus: 'internal_transfer',
          });
        }
      }

      // 3. Mark uncertain items on ongoing accounts as 'needs_review'
      for (const rev of reconciliationPreview.reviewItems) {
        if (!ongoingAccIds.has(rev.bankTx.bank_account_id)) continue;
        if (!rev.bankTx.reconciliation_status || rev.bankTx.reconciliation_status === 'unprocessed') {
          await bankService.updateTransactionReconciliation({
            bankTransactionId: rev.bankTx.id,
            reconciliationStatus: 'needs_review',
            reconciliationNote: rev.reasonLabel,
          });
        }
      }

      if (importedCount > 0 && onRefreshBudget) {
        await onRefreshBudget();
      }
      return importedCount;
    },
    [userId, reconciliationPreview, onRefreshBudget]
  );

  // Open callback flow automatically if redirected back to Settings with pending callback
  useEffect(() => {
    if (pendingCallbackData && (pendingCallbackData.code || pendingCallbackData.error)) {
      setActiveCallbackData(pendingCallbackData);
      setIsConnectModalOpen(true);
      if (onClearPendingCallback) {
        onClearPendingCallback();
      }
    }
  }, [pendingCallbackData, onClearPendingCallback]);

  const loadTransactions = useCallback(
    async (pageToLoad = 1) => {
      setIsLoadingTransactions(true);
      setTxError(null);
      try {
        const res = await bankService.listTransactions({
          bankAccountId: txAccountFilter === 'all' ? null : txAccountFilter,
          statusFilter: txStatusFilter === 'review' ? 'all' : txStatusFilter,
          page: pageToLoad,
          pageSize: 40,
        });
        const list = res.transactions || [];
        setTransactions(
          txStatusFilter === 'review'
            ? list.filter((t) => t.reconciliation_status === 'needs_review')
            : list
        );
        setTxTotalCount(res.totalCount || 0);
        setTxBookedCount(res.bookedCount || 0);
        setTxReservedCount(res.reservedCount || 0);
        setTxPage(res.page || pageToLoad);
        setTxHasMorePages(Boolean(res.hasMorePages));
        setAccountsWithMoreHistory(res.accountsWithMoreHistory || []);
      } catch (err: any) {
        setTxError(err?.message || 'Kunde inte hämta banktransaktioner.');
      } finally {
        setIsLoadingTransactions(false);
      }
    },
    [txAccountFilter, txStatusFilter]
  );

  useEffect(() => {
    if (subView === 'transactions') {
      loadTransactions(1);
    }
  }, [subView, txAccountFilter, txStatusFilter, loadTransactions]);

  const handleSyncAll = async (connectionId?: string) => {
    setIsSyncing(true);
    setStatusError(null);
    try {
      const res = await bankService.sync({ connectionId });
      const nextConns = res.connections || [];
      const nextAccs = res.accounts || [];
      setConnections(nextConns);
      setAccounts(nextAccs);

      const loadedTxs = await loadAllForReconciliation();
      const autoImported = await runAutomaticOngoingImport(loadedTxs, nextAccs);
      if (autoImported > 0) {
        await loadAllForReconciliation();
      }

      if (res.syncErrors && res.syncErrors.length > 0) {
        setStatusError(res.syncErrors.join(' • '));
        if (addToast) addToast(res.syncErrors[0], 'error');
      } else {
        if (addToast) {
          addToast(
            autoImported > 0
              ? `Bankuppgifter uppdaterade (${autoImported} poster bokförda i budgeten)`
              : 'Bankuppgifter uppdaterade',
            'success'
          );
        }
      }

      if (subView === 'transactions') {
        await loadTransactions(1);
      }
    } catch (err: any) {
      const msg = err?.message || 'Kunde inte uppdatera från banken.';
      setStatusError(msg);
      if (addToast) addToast(msg, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Approve First Reconciliation ("Första avstämning")
  const handleApproveFirstReconciliation = async () => {
    if (!userId) {
      if (addToast) addToast('Ingen inloggad användare hittades.', 'error');
      return;
    }

    setIsApplyingReconciliation(true);
    try {
      let matchedCount = 0;
      let importedPurchasesCount = 0;
      const bulkUpdates: Array<{
        bankTransactionId: string;
        reconciliationStatus: BankReconciliationStatus;
        linkedAppTransactionId?: string | null;
        linkedFixedExpenseId?: string | null;
        linkedIncomeId?: string | null;
        linkedSavingId?: string | null;
        linkedPeriodKey?: string | null;
        replacedByBankTxId?: string | null;
        reconciliationNote?: string | null;
      }> = [];

      // 0. Record automatic reservation replacements
      for (const rep of reconciliationPreview.reservationReplacements) {
        bulkUpdates.push({
          bankTransactionId: rep.reservedTx.id,
          reconciliationStatus: 'replaced_reservation',
          replacedByBankTxId: rep.bookedTx.id,
          reconciliationNote: rep.note,
        });
      }

      // 1. Process selected matched items
      for (const m of reconciliationPreview.matchedItems) {
        const isSelected = selectedMatchedBankTxIds.includes(m.bankTx.id);
        if (!isSelected) {
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'needs_review',
            reconciliationNote: 'Avmarkerad vid första avstämning – granska hur posten ska hanteras',
          });
          continue;
        }

        if (m.matchKind === 'manual_tx' && m.manualTx) {
          const updatedManual = linkManualTransactionWithBankTx(m.manualTx, m.bankTx);
          await dataService.updateTransaction(updatedManual.id, updatedManual);
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'matched_manual',
            linkedAppTransactionId: updatedManual.id,
            reconciliationNote: m.explanation,
          });
          matchedCount++;
        } else if (m.matchKind === 'fixed_expense' && m.fixedExpense && m.periodKey) {
          const updatedFe = applyPlannedOccasionOverride(
            m.fixedExpense,
            m.periodKey,
            m.actualAmount
          );
          await dataService.saveFixedExpense(userId, updatedFe);
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'confirmed_fixed',
            linkedFixedExpenseId: updatedFe.id,
            linkedPeriodKey: m.periodKey,
            reconciliationNote: m.explanation,
          });
          matchedCount++;
        } else if (m.matchKind === 'income' && m.income && m.periodKey) {
          const updatedInc = applyPlannedOccasionOverride(
            m.income,
            m.periodKey,
            m.actualAmount
          );
          await dataService.saveIncomeSource(userId, updatedInc);
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'confirmed_income',
            linkedIncomeId: updatedInc.id,
            linkedPeriodKey: m.periodKey,
            reconciliationNote: m.explanation,
          });
          matchedCount++;
        } else if (m.matchKind === 'monthly_saving' && m.monthlySaving && m.periodKey) {
          const updatedSaving = applyPlannedOccasionOverride(
            m.monthlySaving,
            m.periodKey,
            m.actualAmount
          );
          const nextSavings = (config.monthlySavingsItems || []).map((s) =>
            s.id === updatedSaving.id ? updatedSaving : s
          );
          await dataService.saveSettings(userId, {
            ...config,
            monthlySavingsItems: nextSavings,
          });
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'confirmed_saving',
            linkedSavingId: updatedSaving.id,
            linkedPeriodKey: m.periodKey,
            reconciliationNote: m.explanation,
          });
          matchedCount++;
        } else if (m.matchKind === 'own_transfer') {
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'internal_transfer',
            reconciliationNote: m.explanation,
          });
          matchedCount++;
        } else if (m.matchKind === 'refund') {
          const refundCategory =
            m.originalPurchaseTx?.category || expenseCategories[0] || 'Övrigt';
          const refundPayload = createRefundAppTransaction(
            m.bankTx,
            refundCategory,
            m.originalPurchaseTx
          );
          const createdRefund = await dataService.addTransaction(userId, refundPayload);
          bulkUpdates.push({
            bankTransactionId: m.bankTx.id,
            reconciliationStatus: 'refund_linked',
            linkedAppTransactionId: createdRefund.id,
            reconciliationNote: m.explanation,
          });
          matchedCount++;
        }
      }

      // 2. Process selected new everyday purchases
      for (const item of reconciliationPreview.newTransactions) {
        const isSelected = selectedNewPurchaseBankTxIds.includes(item.bankTx.id);
        if (!isSelected) {
          bulkUpdates.push({
            bankTransactionId: item.bankTx.id,
            reconciliationStatus: 'excluded',
            reconciliationNote: 'Bortvald vid första avstämning',
          });
          continue;
        }
        const chosenCategory = newPurchaseCategoryOverrides[item.bankTx.id] || item.category;
        const payload = createAppTransactionFromBankPurchase(item, chosenCategory);
        const created = await dataService.addTransaction(userId, payload);
        bulkUpdates.push({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'imported_tx',
          linkedAppTransactionId: created.id,
        });
        importedPurchasesCount++;
      }

      // 3. Persist review items as 'needs_review'
      for (const rev of reconciliationPreview.reviewItems) {
        bulkUpdates.push({
          bankTransactionId: rev.bankTx.id,
          reconciliationStatus: 'needs_review',
          reconciliationNote: rev.reasonLabel,
        });
      }

      if (bulkUpdates.length > 0) {
        await bankService.bulkUpdateTransactionReconciliation(bulkUpdates);
      }

      // 4. Mark all selected budget accounts as reconciled with import_start_date and ongoing_import_enabled = true
      const nowIso = new Date().toISOString();
      for (const acc of budgetAccounts) {
        await bankService.updateAccountSettings({
          bankAccountId: acc.id,
          importStartDate: acc.import_start_date || effectiveImportStartDate,
          reconciliationCompletedAt: acc.reconciliation_completed_at || nowIso,
          ongoingImportEnabled: true,
        });
      }

      await loadBankStatus();
      if (onRefreshBudget) {
        await onRefreshBudget();
      }

      setIsReconciliationModalOpen(false);
      if (addToast) {
        addToast(
          `Avstämning klar! ${importedPurchasesCount} nya köp och ${matchedCount} avstämda poster. Löpande import är nu aktiv.`,
          'success'
        );
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err?.message || 'Kunde inte slutföra avstämningen.', 'error');
      }
    } finally {
      setIsApplyingReconciliation(false);
    }
  };

  // Resolve a single item in the "Att granska" queue
  const handleResolveReviewItem = async (
    item: ReconciliationReviewItem,
    action: 'import_purchase' | 'match_manual' | 'confirm_fixed' | 'refund' | 'transfer' | 'exclude'
  ) => {
    if (!userId) return;
    setProcessingReviewTxId(item.bankTx.id);
    try {
      const chosenCat =
        reviewCategorySelections[item.bankTx.id] ||
        item.categorySuggestion ||
        expenseCategories[0] ||
        'Övrigt';

      if (action === 'import_purchase') {
        const newItemObj: ReconciliationNewTransactionItem = {
          id: `new_${item.bankTx.id}`,
          bankTx: item.bankTx,
          amount: Math.abs(item.amount),
          currency: item.bankTx.currency || 'SEK',
          dateIso: item.dateIso,
          timestamp: new Date(`${item.dateIso}T12:00:00`).getTime() || Date.now(),
          merchant: item.merchant,
          category: chosenCat,
          accountName:
            getBankAccountShortLabel(
              accounts.find((a) => a.id === item.bankTx.bank_account_id) || ({} as any)
            ) || 'Bankkonto',
          Preselected: true,
        };
        const payload = createAppTransactionFromBankPurchase(newItemObj, chosenCat);
        const created = await dataService.addTransaction(userId, payload);
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'imported_tx',
          linkedAppTransactionId: created.id,
          reconciliationNote: 'Godkänd som köp vid granskning',
        });
      } else if (action === 'match_manual') {
        const targetManualId =
          reviewManualSelections[item.bankTx.id] || item.candidateManualTx?.id;
        const targetManual = existingTransactions.find((t) => t.id === targetManualId);
        if (!targetManual) {
          if (addToast) addToast('Välj en manuell transaktion att matcha mot.', 'error');
          return;
        }
        const updatedManual = linkManualTransactionWithBankTx(targetManual, item.bankTx);
        await dataService.updateTransaction(updatedManual.id, updatedManual);
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'matched_manual',
          linkedAppTransactionId: updatedManual.id,
          reconciliationNote: `Matchad mot manuell post (${targetManual.merchant || targetManual.category})`,
        });
      } else if (action === 'confirm_fixed') {
        const targetFixedId =
          reviewFixedSelections[item.bankTx.id] ||
          item.candidateFixedExpense?.id ||
          existingFixedExpenses[0]?.id;
        const targetFixed = existingFixedExpenses.find((f) => f.id === targetFixedId);
        if (!targetFixed) {
          if (addToast) addToast('Välj vilken fast utgift betalningen avser.', 'error');
          return;
        }
        const updatedFe = applyPlannedOccasionOverride(
          targetFixed,
          currentPeriodInfo.periodId,
          Math.abs(item.amount)
        );
        await dataService.saveFixedExpense(userId, updatedFe);
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'confirmed_fixed',
          linkedFixedExpenseId: updatedFe.id,
          linkedPeriodKey: currentPeriodInfo.periodId,
          reconciliationNote: `Bekräftar ${updatedFe.name} (${currentPeriodInfo.periodId})`,
        });
      } else if (action === 'refund') {
        const refundPayload = createRefundAppTransaction(item.bankTx, chosenCat);
        const createdRefund = await dataService.addTransaction(userId, refundPayload);
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'refund_linked',
          linkedAppTransactionId: createdRefund.id,
          reconciliationNote: `Bokförd som återbetalning i ${chosenCat}`,
        });
      } else if (action === 'transfer') {
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'internal_transfer',
          reconciliationNote: 'Markerad som egen överföring',
        });
      } else if (action === 'exclude') {
        await bankService.updateTransactionReconciliation({
          bankTransactionId: item.bankTx.id,
          reconciliationStatus: 'excluded',
          reconciliationNote: 'Exkluderad av användaren',
        });
      }

      if (selectedBankTx && selectedBankTx.id === item.bankTx.id) {
        setSelectedBankTx(null);
      }

      await loadAllForReconciliation();
      if (subView === 'transactions') {
        await loadTransactions(txPage);
      }
      if (onRefreshBudget) {
        await onRefreshBudget();
      }
      if (addToast) {
        addToast('Transaktionen har hanterats', 'success');
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err?.message || 'Kunde inte spara åtgärden.', 'error');
      }
    } finally {
      setProcessingReviewTxId(null);
    }
  };

  // Undo / Unlink a reconciled bank transaction ("Ångra / Lossa")
  const handleUndoOrUnlinkBankTx = async (tx: BankTransactionItem) => {
    if (!userId) return;
    setUndoingBankTxId(tx.id);
    try {
      const status = tx.reconciliation_status;
      if (status === 'imported_tx' || status === 'refund_linked') {
        if (tx.linked_app_transaction_id) {
          try {
            await dataService.deleteTransaction(tx.linked_app_transaction_id);
          } catch {
            // Ignore if already deleted
          }
        }
      } else if (status === 'matched_manual' && tx.linked_app_transaction_id) {
        const linkedManual = existingTransactions.find(
          (t) => t.id === tx.linked_app_transaction_id
        );
        if (linkedManual) {
          const unlinked = unlinkManualTransactionFromBankTx(linkedManual);
          await dataService.updateTransaction(unlinked.id, unlinked);
        }
      } else if (
        status === 'confirmed_fixed' &&
        tx.linked_fixed_expense_id &&
        tx.linked_period_key
      ) {
        const linkedFe = existingFixedExpenses.find((f) => f.id === tx.linked_fixed_expense_id);
        if (linkedFe && linkedFe.periodOverrides) {
          const nextOverrides = { ...linkedFe.periodOverrides };
          delete nextOverrides[tx.linked_period_key];
          await dataService.saveFixedExpense(userId, {
            ...linkedFe,
            periodOverrides: nextOverrides,
          });
        }
      } else if (status === 'confirmed_income' && tx.linked_income_id && tx.linked_period_key) {
        const linkedInc = existingIncomes.find((i) => i.id === tx.linked_income_id);
        if (linkedInc && linkedInc.periodOverrides) {
          const nextOverrides = { ...linkedInc.periodOverrides };
          delete nextOverrides[tx.linked_period_key];
          await dataService.saveIncomeSource(userId, {
            ...linkedInc,
            periodOverrides: nextOverrides,
          });
        }
      }

      await bankService.updateTransactionReconciliation({
        bankTransactionId: tx.id,
        reconciliationStatus: 'needs_review',
        linkedAppTransactionId: null,
        linkedFixedExpenseId: null,
        linkedIncomeId: null,
        linkedSavingId: null,
        linkedPeriodKey: null,
        reconciliationNote: 'Ångrad – väntar på ny bedömning',
      });

      if (selectedBankTx && selectedBankTx.id === tx.id) {
        setSelectedBankTx(null);
      }

      await loadAllForReconciliation();
      await loadTransactions(txPage);
      if (onRefreshBudget) {
        await onRefreshBudget();
      }
      if (addToast) {
        addToast('Kopplingen har lossats och posten ligger nu under Att granska', 'success');
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err?.message || 'Kunde inte ångra kopplingen.', 'error');
      }
    } finally {
      setUndoingBankTxId(null);
    }
  };

  const handleLoadOlderFromBank = async () => {
    const targetAccountId =
      accountsWithMoreHistory[0] ||
      accounts.find((a) => a.has_incomplete_history)?.id;
    if (!targetAccountId) return;
    setIsLoadingMoreFromBank(true);
    setTxError(null);
    try {
      await bankService.sync({
        bankAccountId: targetAccountId,
        loadMore: true,
      });
      await loadTransactions(txPage);
      await loadAllForReconciliation();
      if (addToast) addToast('Äldre transaktionssidor hämtades från banken', 'success');
    } catch (err: any) {
      setTxError(err?.message || 'Kunde inte hämta fler transaktioner från banken.');
    } finally {
      setIsLoadingMoreFromBank(false);
    }
  };

  const handleDisconnectConfirm = async () => {
    if (!disconnectTarget) return;
    setIsDisconnecting(true);
    try {
      await bankService.disconnect(disconnectTarget.id);
      setDisconnectTarget(null);
      await loadBankStatus();
      if (addToast) {
        addToast(
          `${disconnectTarget.aspsp_name} har kopplats från. Din budget och historik ligger kvar som vanligt.`,
          'success'
        );
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err?.message || 'Kunde inte koppla från banken.', 'error');
      }
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleSaveEditedAccounts = async () => {
    if (!editingAccountsConn) return;
    setIsSavingAccountSelection(true);
    try {
      await bankService.selectAccounts({
        connectionId: editingAccountsConn.id,
        selectedAccountIds: editingAccountIds,
      });
      setEditingAccountsConn(null);
      await loadBankStatus();
      if (addToast) addToast('Valda konton uppdaterades', 'success');
    } catch (err: any) {
      if (addToast) addToast(err?.message || 'Kunde inte spara kontoval', 'error');
    } finally {
      setIsSavingAccountSelection(false);
    }
  };

  const handleOpenSingleAccountSettings = (acc: BankAccount) => {
    setEditingSingleAccount(acc);
    setAccountCustomNameInput(acc.custom_name || '');
    setAccountIncludeInBudgetInput(acc.include_in_budget !== false);
    setAccountImportStartInput(acc.import_start_date || currentPeriodInfo.startIso);
    setAccountOngoingImportInput(Boolean(acc.ongoing_import_enabled));
  };

  const handleSaveSingleAccountSettings = async () => {
    if (!editingSingleAccount) return;
    setIsSavingSingleAccount(true);
    try {
      await bankService.updateAccountSettings({
        bankAccountId: editingSingleAccount.id,
        customName: accountCustomNameInput.trim() || null,
        includeInBudget: accountIncludeInBudgetInput,
        importStartDate: accountImportStartInput || currentPeriodInfo.startIso,
        ongoingImportEnabled: accountOngoingImportInput,
      });
      setEditingSingleAccount(null);
      await loadBankStatus();
      if (addToast) {
        addToast('Kontoinställningar sparades', 'success');
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err?.message || 'Kunde inte spara kontoinställningar', 'error');
      }
    } finally {
      setIsSavingSingleAccount(false);
    }
  };

  // Filtered and Date-Grouped Bank Transactions for the Transactions Subview (matching LogView.tsx)
  const groupedBankTransactions = useMemo(() => {
    const query = txSearchQuery.trim().toLowerCase();
    const filtered = transactions.filter((tx) => {
      if (!query) return true;
      const display = buildDisplayTxData(tx);
      return (
        display.merchant.toLowerCase().includes(query) ||
        display.category.toLowerCase().includes(query) ||
        (tx.description || '').toLowerCase().includes(query) ||
        (tx.counterparty_name || '').toLowerCase().includes(query)
      );
    });

    const groups = new Map<string, BankTransactionItem[]>();
    for (const tx of filtered) {
      const dateKey = tx.booking_date || tx.transaction_date || tx.value_date || 'unknown';
      const existing = groups.get(dateKey) || [];
      existing.push(tx);
      groups.set(dateKey, existing);
    }

    return Array.from(groups.entries());
  }, [transactions, txSearchQuery, buildDisplayTxData]);

  // Render a single bank transaction row in the exact visual style of TransactionItem.tsx
  const renderBankTransactionRow = (
    tx: BankTransactionItem,
    options?: {
      overrideMerchant?: string;
      overrideCategory?: string;
      customRightElement?: React.ReactNode;
      onClick?: () => void;
      subtitleNote?: string;
    }
  ) => {
    const isReserved = tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD';
    const accountObj = accounts.find((a) => a.id === tx.bank_account_id);
    const display = buildDisplayTxData(tx, options?.overrideMerchant, options?.overrideCategory);
    const badge = getReconciliationBadge(tx.reconciliation_status, isReserved);
    const txCurrency =
      tx.currency && tx.currency.toUpperCase() !== 'SEK' ? tx.currency.toUpperCase() : currency;

    return (
      <div
        key={tx.id}
        onClick={options?.onClick || (() => setSelectedBankTx(tx))}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (options?.onClick) options.onClick();
            else setSelectedBankTx(tx);
          }
        }}
        className="px-4 py-3 sm:py-3.5 min-h-[56px] relative z-10 flex items-center justify-between gap-3 group transition-colors duration-150 bg-[var(--surface-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] cursor-pointer select-none"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 relative">
            <TransactionLogo transaction={display.virtualTransaction} config={config} />
          </div>

          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <div className="flex items-center min-w-0">
              <p className="text-body-medium font-medium text-[var(--text-primary)] leading-snug truncate flex-1 min-w-0">
                {display.merchant}
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5 min-w-0 overflow-hidden text-[var(--text-secondary)] flex-wrap">
              <div className="flex items-end gap-1 shrink-0 text-[var(--text-secondary)]">
                {display.iconKey ? (
                  <CategoryIcon
                    icon={display.iconKey}
                    categoryName={display.category}
                    variant="minimal"
                    size="2xs"
                  />
                ) : null}
                <span className="text-secondary text-[var(--text-secondary)] whitespace-nowrap">
                  {capitalize(display.category)}
                </span>
              </div>

              <span className="text-secondary text-[var(--text-tertiary)] select-none">·</span>

              <span
                className={`text-secondary whitespace-nowrap ${
                  badge.tone === 'success'
                    ? 'text-[var(--success-color)]'
                    : badge.tone === 'warning'
                    ? 'text-[var(--warning-color)]'
                    : badge.tone === 'accent'
                    ? 'text-[var(--accent-color)]'
                    : 'text-[var(--text-tertiary)]'
                }`}
              >
                {options?.subtitleNote || badge.shortLabel}
              </span>

              {accountObj && selectedAccounts.length > 1 && (
                <>
                  <span className="text-secondary text-[var(--text-tertiary)] select-none">·</span>
                  <span className="text-secondary text-[var(--text-tertiary)] truncate">
                    {getBankAccountShortLabel(accountObj)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 whitespace-nowrap pl-1">
          <div className="flex flex-col items-end justify-center">
            <p
              className={`text-list-amount whitespace-nowrap ${
                display.isIncome ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
              }`}
            >
              <span className="opacity-80 mr-0.5">{display.isIncome ? '+' : '−'}</span>
              <span className="tabular-nums">
                {formatAmount(Math.abs(display.normalizedAmt), lang)}
              </span>
              <span className="text-secondary opacity-80 font-normal ml-1">{txCurrency}</span>
            </p>
          </div>
          {options?.customRightElement}
        </div>
      </div>
    );
  };

  // Detail Modal for a single BankTransactionItem (preserves all raw bank fields cleanly)
  const renderBankTransactionDetailModal = () => {
    if (!selectedBankTx) return null;
    const tx = selectedBankTx;
    const isReserved = tx.booking_status === 'PDNG' || tx.booking_status === 'HOLD';
    const accountObj = accounts.find((a) => a.id === tx.bank_account_id);
    const display = buildDisplayTxData(tx);
    const badge = getReconciliationBadge(tx.reconciliation_status, isReserved);
    const txCurrency =
      tx.currency && tx.currency.toUpperCase() !== 'SEK' ? tx.currency.toUpperCase() : currency;
    const canUndo =
      tx.reconciliation_status &&
      [
        'imported_tx',
        'matched_manual',
        'confirmed_fixed',
        'confirmed_income',
        'confirmed_saving',
        'refund_linked',
        'internal_transfer',
        'excluded',
      ].includes(tx.reconciliation_status);

    const matchingReviewItem = activeReviewItems.find((r) => r.bankTx.id === tx.id);

    return (
      <Modal
        isOpen={Boolean(selectedBankTx)}
        onClose={() => setSelectedBankTx(null)}
        title="Transaktionsdetaljer"
        size="sm"
        bodyClassName="p-4 space-y-4"
      >
        {/* Top Merchant Hero (matches TransactionViewModal) */}
        <div className="flex flex-col items-center text-center pt-1 pb-2 space-y-2">
          <TransactionLogo
            transaction={display.virtualTransaction}
            config={config}
            size="lg"
          />
          <div className="space-y-0.5">
            <h3 className="text-card-title font-bold text-[var(--text-primary)]">
              {display.merchant}
            </h3>
            <div className="flex items-center justify-center gap-1.5 text-secondary text-[var(--text-secondary)]">
              {display.iconKey && (
                <CategoryIcon
                  icon={display.iconKey}
                  categoryName={display.category}
                  variant="minimal"
                  size="2xs"
                />
              )}
              <span>{capitalize(display.category)}</span>
            </div>
          </div>

          <p
            className={`text-2xl font-bold font-amount tabular-nums pt-1 ${
              display.isIncome ? 'text-[var(--success-color)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {display.isIncome ? '+' : '−'}
            {formatAmount(Math.abs(display.normalizedAmt), lang)} {txCurrency}
          </p>
        </div>

        {/* Reconciliation Status in Dejz */}
        <Card variant="default" padding="none" className="divide-y divide-menu">
          <ListRow
            variant="grouped"
            density="compact"
            title="Status i Dejz"
            value={
              <span
                className={`text-label font-semibold ${
                  badge.tone === 'success'
                    ? 'text-[var(--success-color)]'
                    : badge.tone === 'warning'
                    ? 'text-[var(--warning-color)]'
                    : badge.tone === 'accent'
                    ? 'text-[var(--accent-color)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {badge.label}
              </span>
            }
          />
          {tx.reconciliation_note && (
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              title="Notering"
              subtitle={tx.reconciliation_note}
            />
          )}
        </Card>

        {/* Original Bank Data (Separated from Dejz display fields) */}
        <div className="space-y-1.5">
          <h4 className="text-section-title px-1">Bankens originaluppgifter</h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              title="Bankens beskrivning"
              subtitle={tx.description || '—'}
            />
            {tx.counterparty_name &&
              tx.counterparty_name.toLowerCase() !== (tx.description || '').toLowerCase() && (
                <ListRow
                  variant="grouped"
                  density="compact"
                  title="Mottagare / Motpart"
                  value={tx.counterparty_name}
                />
              )}
            {accountObj && (
              <ListRow
                variant="grouped"
                density="compact"
                title="Bankkonto"
                value={getBankAccountTitle(accountObj)}
              />
            )}
            {tx.booking_date && (
              <ListRow
                variant="grouped"
                density="compact"
                title="Bokföringsdatum"
                value={tx.booking_date}
              />
            )}
            {tx.transaction_date && (
              <ListRow
                variant="grouped"
                density="compact"
                title="Köpdatum (transaktionsdatum)"
                value={tx.transaction_date}
              />
            )}
            {tx.value_date && (
              <ListRow
                variant="grouped"
                density="compact"
                title="Valutadag"
                value={tx.value_date}
              />
            )}
            {!tx.booking_date && !tx.transaction_date && !tx.value_date && (
              <ListRow
                variant="grouped"
                density="compact"
                title="Datum"
                value="Saknas från banken"
              />
            )}
            <ListRow
              variant="grouped"
              density="compact"
              title="Bokningsstatus"
              value={isReserved ? 'Reserverad (PDNG)' : 'Bokförd (BOOK)'}
            />
          </Card>
        </div>

        {/* Actions: Quick review actions or Undo/Unlink */}
        {matchingReviewItem && (
          <div className="space-y-2 pt-1">
            <p className="text-label font-semibold text-[var(--text-secondary)] px-1">
              Hantera granskning:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {matchingReviewItem.amount < 0 ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={processingReviewTxId === tx.id}
                  onClick={() => handleResolveReviewItem(matchingReviewItem, 'import_purchase')}
                >
                  Godkänn som köp
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={processingReviewTxId === tx.id}
                  onClick={() => handleResolveReviewItem(matchingReviewItem, 'refund')}
                >
                  Återbetalning
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                disabled={processingReviewTxId === tx.id}
                onClick={() => handleResolveReviewItem(matchingReviewItem, 'transfer')}
              >
                Egen överföring
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="col-span-2"
                disabled={processingReviewTxId === tx.id}
                onClick={() => handleResolveReviewItem(matchingReviewItem, 'exclude')}
              >
                Exkludera från budget
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          {canUndo && (
            <Button
              variant="secondary"
              fullWidth
              disabled={undoingBankTxId === tx.id}
              onClick={() => handleUndoOrUnlinkBankTx(tx)}
              icon={
                undoingBankTxId === tx.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : tx.reconciliation_status === 'matched_manual' ? (
                  <Unlink size={15} />
                ) : (
                  <RotateCcw size={15} />
                )
              }
            >
              {tx.reconciliation_status === 'matched_manual'
                ? 'Lossa matchning mot manuell post'
                : 'Ångra hantering i budgeten'}
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={() => setSelectedBankTx(null)}>
            Stäng
          </Button>
        </div>
      </Modal>
    );
  };

  // ---------------------------------------------------------------------------
  // SUBVIEW: BANKTRANSAKTIONER (MATCHES LOGVIEW & TRANSACTIONITEM)
  // ---------------------------------------------------------------------------
  if (subView === 'transactions') {
    const anyIncompleteHistory =
      accountsWithMoreHistory.length > 0 ||
      selectedAccounts.some((a) => a.has_incomplete_history);

    return (
      <div className="space-y-[var(--menu-content-gap)] w-full pb-12 font-sans">
        {/* 1. Standalone Search Bar (exact match with LogView.tsx) */}
        <div className="w-full">
          <Input
            variant="search"
            placeholder="Sök butik, kategori, banktext..."
            value={txSearchQuery}
            onChange={(e) => setTxSearchQuery(e.target.value)}
            onClear={() => setTxSearchQuery('')}
            className="h-[42px] sm:h-[44px] text-xs sm:text-sm bg-[var(--surface-color)] shadow-subtle border-none"
          />
        </div>

        {/* 2. Top Controls: FilterButtonGroup + Sync Button (exact match with LogView.tsx) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 py-1 px-1 -my-1 -mx-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 shrink-0">
              <FilterButtonGroup
                options={[
                  {
                    id: 'all',
                    label: `Alla (${txBookedCount + txReservedCount})`,
                  },
                  {
                    id: 'booked',
                    label: `Bokförda (${txBookedCount})`,
                  },
                  {
                    id: 'reserved',
                    label: `Reserverade (${txReservedCount})`,
                  },
                  {
                    id: 'review',
                    label: `Att granska (${activeReviewItems.length})`,
                  },
                ]}
                selectedId={txStatusFilter}
                onSelect={(id) => {
                  setTxStatusFilter(id as 'all' | 'booked' | 'reserved' | 'review');
                  setTxPage(1);
                }}
                ariaLabel="Filtrera status"
              />
            </div>

            <Button
              variant="tonal"
              size="sm"
              onClick={() => handleSyncAll()}
              disabled={isSyncing || selectedAccounts.length === 0}
              icon={<RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />}
            >
              {isSyncing ? 'Uppdaterar...' : 'Uppdatera'}
            </Button>
          </div>

          {selectedAccounts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <FilterButtonGroup
                options={[
                  { id: 'all', label: `Alla konton (${selectedAccounts.length})` },
                  ...selectedAccounts.map((acc) => ({
                    id: acc.id,
                    label: getBankAccountShortLabel(acc),
                  })),
                ]}
                selectedId={txAccountFilter}
                onSelect={(id) => {
                  setTxAccountFilter(id);
                  setTxPage(1);
                }}
                ariaLabel="Filtrera konto"
              />
            </div>
          )}
        </div>

        {/* Incomplete history banner */}
        {anyIncompleteHistory && (
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              icon={<AlertTriangle size={18} strokeWidth={2} />}
              iconColor="text-[var(--warning-color)]"
              title="Ofullständig transaktionshistorik"
              subtitle="Det finns äldre sidor hos banken som inte har lästs in ännu."
              rightElement={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isLoadingMoreFromBank}
                  onClick={handleLoadOlderFromBank}
                >
                  {isLoadingMoreFromBank ? 'Hämtar...' : 'Hämta äldre'}
                </Button>
              }
            />
          </Card>
        )}

        {/* Reserved explanation banner when viewing reserved or when reserved items exist */}
        {(txStatusFilter === 'reserved' || (txStatusFilter === 'all' && txReservedCount > 0)) && (
          <div className="px-3.5 py-2.5 rounded-card bg-[var(--surface-color)] border border-subtle text-secondary text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--text-primary)]">Reserverade köp: </span>
            Visas separat och påverkar inte den ordinarie budgeten förrän de har bokförts av banken. När köpet bokförs ersätts reservationen automatiskt.
          </div>
        )}

        {/* Error Banner */}
        {txError && (
          <Card variant="default" padding="none">
            <ListRow
              variant="grouped"
              multiline
              icon={<AlertCircle size={18} strokeWidth={2} />}
              iconColor="text-[var(--danger-color)]"
              title="Kunde inte hämta transaktioner"
              subtitle={txError}
              rightElement={
                <Button variant="secondary" size="sm" onClick={() => loadTransactions(txPage)}>
                  Försök igen
                </Button>
              }
            />
          </Card>
        )}

        {/* Transactions List Grouped by Day (exact match with LogView.tsx) */}
        {isLoadingTransactions ? (
          <Card variant="default" padding="lg" className="py-12">
            <div className="flex flex-col items-center justify-center gap-2.5 text-[var(--text-secondary)]">
              <Loader2 size={22} className="animate-spin text-[var(--accent-color)]" />
              <span className="text-secondary font-medium">Laddar transaktioner...</span>
            </div>
          </Card>
        ) : selectedAccounts.length === 0 ? (
          <Card variant="default" padding="lg" className="py-10 text-center space-y-3">
            <SlidersHorizontal size={22} className="mx-auto text-[var(--text-tertiary)]" />
            <div className="space-y-1">
              <p className="text-card-title font-bold text-[var(--text-primary)]">
                Inga valda bankkonton
              </p>
              <p className="text-secondary text-[var(--text-secondary)] max-w-xs mx-auto">
                Välj minst ett konto under Bankkoppling för att se dina banktransaktioner.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => handleSwitchSubView('connections')}>
              Gå till Bankkoppling
            </Button>
          </Card>
        ) : groupedBankTransactions.length === 0 ? (
          <Card variant="default" padding="lg" className="py-10 text-center space-y-2">
            <Clock size={22} className="mx-auto text-[var(--text-tertiary)]" />
            <p className="text-card-title font-bold text-[var(--text-primary)]">
              Inga transaktioner att visa
            </p>
            <p className="text-secondary text-[var(--text-secondary)] max-w-xs mx-auto">
              {txStatusFilter === 'reserved'
                ? 'Det finns inga reserverade köp för tillfället.'
                : txStatusFilter === 'review'
                ? 'Det finns inga banktransaktioner som väntar på granskning.'
                : 'Inga banktransaktioner hittades för det valda filtret.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-4.5">
            {groupedBankTransactions.map(([dateIso, dayItems]) => (
              <div key={dateIso} className="space-y-1.5">
                <div className="px-1 pb-0.5">
                  <span className="text-label font-medium text-[var(--text-secondary)]">
                    {dateIso === 'unknown'
                      ? 'Datum saknas från bank'
                      : formatFullDate(dateIso, lang as any)}
                  </span>
                </div>

                <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
                  {dayItems.map((tx) => renderBankTransactionRow(tx))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {(txPage > 1 || txHasMorePages || anyIncompleteHistory) && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <Button
                variant="secondary"
                size="sm"
                disabled={txPage <= 1 || isLoadingTransactions}
                onClick={() => loadTransactions(txPage - 1)}
                icon={<ChevronLeft size={14} />}
              >
                Föregående
              </Button>
              <span className="text-label font-medium text-[var(--text-secondary)] px-2">
                Sida {txPage} ({txTotalCount} st)
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={!txHasMorePages || isLoadingTransactions}
                onClick={() => loadTransactions(txPage + 1)}
                icon={<ChevronRight size={14} />}
              >
                Nästa
              </Button>
            </div>

            {anyIncompleteHistory && (
              <Button
                variant="tonal"
                size="sm"
                disabled={isLoadingMoreFromBank}
                onClick={handleLoadOlderFromBank}
                icon={
                  isLoadingMoreFromBank ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )
                }
              >
                {isLoadingMoreFromBank ? 'Hämtar från bank...' : 'Hämta äldre från banken'}
              </Button>
            )}
          </div>
        )}

        {renderBankTransactionDetailModal()}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // SUBVIEW: BANKKOPPLING (MATCHES PROFILEVIEW & SETTINGSVIEW)
  // ---------------------------------------------------------------------------
  const hasUnreconciledAccounts = unreconciledBudgetAccounts.length > 0;
  const totalPreviewActionableCount =
    reconciliationPreview.matchedItems.length +
    reconciliationPreview.newTransactions.length +
    reconciliationPreview.reviewItems.length;

  return (
    <div className="space-y-5 w-full pb-12 font-sans">
      {statusError && (
        <Card variant="default" padding="none">
          <ListRow
            variant="grouped"
            multiline
            icon={<AlertCircle size={18} strokeWidth={2} />}
            iconColor="text-[var(--danger-color)]"
            title="Meddelande vid synkronisering"
            subtitle={statusError}
          />
        </Card>
      )}

      {isLoadingStatus ? (
        <Card variant="default" padding="lg" className="py-12">
          <div className="flex flex-col items-center justify-center gap-2.5 text-[var(--text-secondary)]">
            <Loader2 size={22} className="animate-spin text-[var(--accent-color)]" />
            <span className="text-secondary font-medium">Läser in bankkoppling...</span>
          </div>
        </Card>
      ) : connections.length === 0 ? (
        <Card variant="default" padding="lg" className="py-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center mx-auto">
            <Building2 size={22} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-card-title font-bold text-[var(--text-primary)]">
              Koppla din bank till Dejz
            </h3>
            <p className="text-secondary text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Anslut din bank med BankID så föreslår vi uppgifter som du granskar, och stämmer av dina köp och fasta utgifter utan dubbletter.
            </p>
          </div>
          <div className="pt-1 flex justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setReconnectTarget(null);
                setActiveCallbackData(null);
                setIsConnectModalOpen(true);
              }}
              icon={<Plus size={16} />}
            >
              Koppla bank
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          {/* 1. SALDO & SYNKSTATUS */}
          <div className="space-y-2">
            <h4 className="text-section-title px-1.5">Översikt</h4>
            <Card variant="default" padding="none" className="divide-y divide-menu">
              <div className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-micro-label text-[var(--text-secondary)] block">
                    Totalt på kopplade bankkonton
                  </span>
                  <span className="text-section-amount font-bold font-amount tabular-nums text-[var(--text-primary)] block mt-0.5">
                    {formatCurrency(
                      selectedAccounts.reduce((sum, a) => sum + (Number(a.balance_amount) || 0), 0),
                      currency,
                      lang
                    )}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[var(--success-color)]/10 text-[var(--success-color)] text-micro-label font-semibold shrink-0">
                  {selectedAccounts.length} {selectedAccounts.length === 1 ? 'konto aktivt' : 'konton aktiva'}
                </span>
              </div>

              <ListRow
                variant="grouped"
                showChevron
                multiline
                icon={
                  isAnalyzingReconciliation ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} strokeWidth={2} />
                  )
                }
                iconColor="text-[var(--success-color)]"
                title="Transaktioner & fasta kostnader synkas automatiskt"
                subtitle="Dina köp visas i Hem, Historik och Analys utan dubbelräkning mot fasta utgifter"
                onClick={() => {
                  if (reconciliationPreview.matchedItems.length > 0) {
                    setReconciliationTab('matched');
                  } else if (reconciliationPreview.newTransactions.length > 0) {
                    setReconciliationTab('new');
                  } else {
                    setReconciliationTab('review');
                  }
                  setIsReconciliationModalOpen(true);
                }}
              />
            </Card>
          </div>

          {/* 2. ANSLUTNA BANKER & KONTON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1.5">
              <h4 className="text-section-title">Anslutna konton</h4>
              <Button
                variant="tonal"
                size="sm"
                onClick={() => handleSyncAll()}
                disabled={isSyncing}
                icon={<RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />}
              >
                {isSyncing ? 'Uppdaterar...' : 'Uppdatera'}
              </Button>
            </div>

            <div className="space-y-3">
              {connections.map((conn) => {
                const connAccounts = accounts.filter((a) => a.connection_id === conn.id);
                const chosenAccounts = connAccounts.filter((a) => a.is_selected);
                const isExpired =
                  conn.status === 'expired' ||
                  (conn.valid_until && new Date(conn.valid_until).getTime() <= Date.now());
                const stale = isSyncStale(conn.last_synced_at) || Boolean(conn.last_error);

                return (
                  <Card
                    key={conn.id}
                    variant="default"
                    padding="none"
                    className="overflow-hidden divide-y divide-menu"
                  >
                    {/* Bank Header Row */}
                    <ListRow
                      variant="grouped"
                      density="compact"
                      icon={
                        conn.aspsp_logo ? (
                          <img
                            src={conn.aspsp_logo}
                            alt={conn.aspsp_name}
                            className="w-5 h-5 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Building2 size={18} strokeWidth={2} />
                        )
                      }
                      iconBg="bg-[var(--surface-muted)]"
                      title={conn.aspsp_name}
                      subtitle={`Senast synkad: ${formatDateTimeSv(conn.last_synced_at)} · ${
                        isExpired ? 'Utgånget samtycke' : stale ? 'Kan uppdateras' : 'Aktiv'
                      }`}
                      rightElement={
                        isExpired || conn.last_error ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setReconnectTarget(conn);
                              setActiveCallbackData(null);
                              setIsConnectModalOpen(true);
                            }}
                          >
                            Förnya
                          </Button>
                        ) : undefined
                      }
                    />

                    {/* Selected Accounts Rows (tapping opens Kontoinställningar) */}
                    {chosenAccounts.length === 0 ? (
                      <ListRow
                        variant="grouped"
                        density="compact"
                        title="Inga konton valda"
                        subtitle="Välj vilka konton som ska synkroniseras"
                        showChevron
                        onClick={() => {
                          setEditingAccountsConn(conn);
                          setEditingAccountIds(
                            connAccounts.filter((a) => a.is_selected).map((a) => a.id)
                          );
                        }}
                      />
                    ) : (
                      chosenAccounts.map((acc) => {
                        const accountTitle = getBankAccountTitle(acc);
                        const isSavings = isLikelySavingsAccount(acc);
                        const includedInBudget = acc.include_in_budget !== false;
                        const balCurrency = acc.balance_currency || acc.currency || currency;

                        return (
                          <ListRow
                            key={acc.id}
                            variant="grouped"
                            showChevron
                            icon={<Wallet size={18} strokeWidth={2} />}
                            title={accountTitle}
                            subtitle={[
                              isSavings ? 'Sparkonto' : null,
                              includedInBudget ? 'Ingår i budget' : 'Utanför budget',
                              acc.import_start_date ? `Från ${acc.import_start_date}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                            rightElement={
                              <div className="text-right">
                                <p className="text-list-amount tabular-nums text-[var(--text-primary)]">
                                  {acc.balance_amount !== null
                                    ? `${formatAmount(Number(acc.balance_amount), lang)} ${balCurrency}`
                                    : '—'}
                                </p>
                                <p className="text-secondary text-[var(--text-tertiary)]">
                                  {formatCleanBalanceLabel(acc.balance_label)}
                                </p>
                              </div>
                            }
                            onClick={() => handleOpenSingleAccountSettings(acc)}
                          />
                        );
                      })
                    )}

                    {/* Compact Connection Footer Row */}
                    <div className="px-4 py-2.5 bg-[var(--surface-muted)]/30 flex items-center justify-between gap-2 text-label">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAccountsConn(conn);
                          setEditingAccountIds(
                            connAccounts.filter((a) => a.is_selected).map((a) => a.id)
                          );
                        }}
                        className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Välj konton ({chosenAccounts.length}/{connAccounts.length})
                      </button>

                      <div className="flex items-center gap-3.5">
                        {!isExpired && (
                          <button
                            type="button"
                            onClick={() => {
                              setReconnectTarget(conn);
                              setActiveCallbackData(null);
                              setIsConnectModalOpen(true);
                            }}
                            className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Förnya samtycke
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDisconnectTarget(conn)}
                          className="font-medium text-[var(--danger-color)] hover:underline cursor-pointer"
                        >
                          Koppla från
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 3. RESERVERADE KÖP (RENDERED LIKE STANDARD DEJZ TRANSACTIONS) */}
          {reconciliationPreview.reservedItems.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1.5">
                <h4 className="text-section-title">
                  Reserverade köp ({reconciliationPreview.reservedItems.length})
                </h4>
                <span className="text-label font-medium text-[var(--text-secondary)]">
                  Utanför budget ({formatCurrency(reconciliationPreview.budgetImpact.reservedAmountOutsideBudget, currency, lang)})
                </span>
              </div>

              <div className="rounded-card bg-[var(--surface-color)] border border-subtle shadow-subtle overflow-hidden divide-subtle">
                {reconciliationPreview.reservedItems.slice(0, 5).map((r) =>
                  renderBankTransactionRow(r.bankTx, {
                    overrideMerchant: r.merchant,
                    subtitleNote: `Reserverad · ${r.dateIso}`,
                  })
                )}
              </div>

              <p className="text-secondary text-[var(--text-secondary)] px-1.5 leading-relaxed">
                Reserverade köp påverkar inte din ordinarie budget förrän de har bokförts av banken. När köpet bokförs ersätts reservationen automatiskt.
              </p>
            </div>
          )}

          {/* 4. TRANSAKTIONSHISTORIK & FLER BANKER */}
          <div className="space-y-2">
            <h4 className="text-section-title px-1.5">Historik & Hantering</h4>
            <Card variant="default" padding="none" className="divide-y divide-menu">
              <ListRow
                variant="grouped"
                density="compact"
                showChevron
                icon={<Clock size={18} strokeWidth={2} />}
                title="Banktransaktioner"
                subtitle="Bokförda och reserverade poster samt ångra/lossa kopplingar"
                value={
                  <span className="text-label font-semibold text-[var(--text-secondary)]">
                    {allBankTransactions.length} st
                  </span>
                }
                onClick={() => handleSwitchSubView('transactions')}
              />
              <ListRow
                variant="grouped"
                density="compact"
                showChevron
                icon={<Plus size={18} strokeWidth={2} />}
                title="Koppla en till bank"
                subtitle="Lägg till konto från en annan bank"
                onClick={() => {
                  setReconnectTarget(null);
                  setActiveCallbackData(null);
                  setIsConnectModalOpen(true);
                }}
              />
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: FIRST RECONCILIATION ("FÖRSTA AVSTÄMNING")
         ===================================================================== */}
      <Modal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        title="Stäm av mot din budget"
        size="md"
        bodyClassName="p-4 space-y-4"
      >
        {/* Step 1: Import Start Date Question */}
        <Card variant="default" padding="sm" className="space-y-2 border border-subtle">
          <label className="block text-label font-semibold text-[var(--text-primary)]">
            Från vilket datum vill du använda banktransaktioner i budgeten?
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={effectiveImportStartDate}
                onChange={(e) => setReconciliationStartDate(e.target.value)}
                className="w-full px-3 py-2 text-secondary font-medium rounded-btn-sm border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-primary)]"
              />
            </div>
            {effectiveImportStartDate !== currentPeriodInfo.startIso && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReconciliationStartDate(currentPeriodInfo.startIso)}
                icon={<Calendar size={13} />}
              >
                Aktuell löneperiod ({currentPeriodInfo.startIso})
              </Button>
            )}
          </div>
          <p className="text-secondary text-[var(--text-secondary)]">
            Äldre bankhistorik påverkar aldrig din budget automatiskt.
          </p>
        </Card>

        {/* Step 2: Budget Impact Preview (Before Approval) */}
        <Card variant="default" padding="none" className="divide-y divide-menu border border-subtle">
          <ListRow
            variant="grouped"
            density="compact"
            title="Nuvarande Kvar att spendera"
            value={
              <span className="font-semibold text-[var(--text-primary)]">
                {formatCurrency(
                  reconciliationPreview.budgetImpact.currentRemainingToSpend,
                  currency,
                  lang
                )}
              </span>
            }
          />
          <ListRow
            variant="grouped"
            density="compact"
            title="Beräknad påverkan vid godkännande"
            value={
              <span
                className={`font-semibold ${
                  reconciliationPreview.budgetImpact.netImpactOnRemaining >= 0
                    ? 'text-[var(--success-color)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {reconciliationPreview.budgetImpact.netImpactOnRemaining >= 0 ? '+' : ''}
                {formatCurrency(
                  reconciliationPreview.budgetImpact.netImpactOnRemaining,
                  currency,
                  lang
                )}
              </span>
            }
          />
          <ListRow
            variant="grouped"
            density="compact"
            title="Kvar att spendera efter avstämning"
            subtitle="Bankens kontosaldo ersätter aldrig ditt Kvar att spendera"
            value={
              <span className="text-list-amount font-bold text-[var(--accent-color)]">
                {formatCurrency(
                  reconciliationPreview.budgetImpact.projectedRemainingToSpend,
                  currency,
                  lang
                )}
              </span>
            }
          />
        </Card>

        {/* Step 3: SegmentedControl Tabs */}
        <SegmentedControl
          size="sm"
          value={reconciliationTab}
          onChange={(val) => setReconciliationTab(val as 'matched' | 'new' | 'review')}
          options={[
            {
              value: 'matched',
              label: 'Matchade',
              badge: reconciliationPreview.matchedItems.length,
            },
            {
              value: 'new',
              label: 'Nya köp',
              badge: reconciliationPreview.newTransactions.length,
            },
            {
              value: 'review',
              label: 'Att granska',
              badge: reconciliationPreview.reviewItems.length,
            },
          ]}
        />

        {/* TAB 1: MATCHED AGAINST EXISTING ITEMS */}
        {reconciliationTab === 'matched' && (
          <div className="space-y-2">
            {reconciliationPreview.matchedItems.length === 0 ? (
              <div className="p-6 text-center rounded-card bg-[var(--surface-muted)] text-secondary text-[var(--text-secondary)]">
                Inga matchningar mot befintliga manuella transaktioner eller fasta poster hittades från valt datum.
              </div>
            ) : (
              <div className="max-h-[290px] overflow-y-auto rounded-card bg-[var(--surface-color)] border border-subtle divide-subtle">
                {reconciliationPreview.matchedItems.map((m: ReconciliationMatchedItem) => {
                  const isChecked = selectedMatchedBankTxIds.includes(m.bankTx.id);
                  const display = buildDisplayTxData(m.bankTx, m.title);
                  return (
                    <div
                      key={m.id}
                      onClick={() =>
                        setSelectedMatchedBankTxIds((prev) =>
                          prev.includes(m.bankTx.id)
                            ? prev.filter((id) => id !== m.bankTx.id)
                            : [...prev, m.bankTx.id]
                        )
                      }
                      role="button"
                      tabIndex={0}
                      className="px-3.5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <TransactionLogo
                          transaction={display.virtualTransaction}
                          config={config}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                              {m.title}
                            </span>
                            <span className="text-secondary text-[var(--success-color)]">
                              · {m.subtitle}
                            </span>
                          </div>
                          <p className="text-secondary text-[var(--text-secondary)] truncate">
                            {m.explanation}
                          </p>
                          {m.budgetDelta !== 0 && (
                            <p className="text-secondary font-medium text-[var(--warning-color)]">
                              Periodjustering: {m.budgetDelta > 0 ? '+' : ''}
                              {formatCurrency(m.budgetDelta, currency, lang)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-list-amount tabular-nums text-[var(--text-primary)]">
                          {formatAmount(Math.abs(m.actualAmount), lang)} {currency}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-btn-sm flex items-center justify-center border ${
                            isChecked
                              ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--text-on-accent)]'
                              : 'border-[var(--border-color)]'
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={2.5} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NEW TRANSACTIONS */}
        {reconciliationTab === 'new' && (
          <div className="space-y-2">
            {reconciliationPreview.newTransactions.length === 0 ? (
              <div className="p-6 text-center rounded-card bg-[var(--surface-muted)] text-secondary text-[var(--text-secondary)]">
                Inga nya bokförda vardagsköp hittades från {effectiveImportStartDate}.
              </div>
            ) : (
              <div className="max-h-[290px] overflow-y-auto rounded-card bg-[var(--surface-color)] border border-subtle divide-subtle">
                {reconciliationPreview.newTransactions.map((p) => {
                  const isChecked = selectedNewPurchaseBankTxIds.includes(p.bankTx.id);
                  const chosenCat = newPurchaseCategoryOverrides[p.bankTx.id] || p.category;
                  const display = buildDisplayTxData(p.bankTx, p.merchant, chosenCat);
                  return (
                    <div
                      key={p.id}
                      className="px-3.5 py-3 flex items-center justify-between gap-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.04]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedNewPurchaseBankTxIds((prev) =>
                            prev.includes(p.bankTx.id)
                              ? prev.filter((id) => id !== p.bankTx.id)
                              : [...prev, p.bankTx.id]
                          )
                        }
                        className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <TransactionLogo
                          transaction={display.virtualTransaction}
                          config={config}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                            {p.merchant}
                          </p>
                          <p className="text-secondary text-[var(--text-secondary)] truncate">
                            {p.dateIso} · {p.accountName}
                          </p>
                        </div>
                      </button>

                      <select
                        value={chosenCat}
                        onChange={(e) =>
                          setNewPurchaseCategoryOverrides((prev) => ({
                            ...prev,
                            [p.bankTx.id]: e.target.value,
                          }))
                        }
                        className="px-2 py-1 text-secondary font-medium rounded-btn-sm border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-primary)] max-w-[120px]"
                      >
                        {expenseCategories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedNewPurchaseBankTxIds((prev) =>
                            prev.includes(p.bankTx.id)
                              ? prev.filter((id) => id !== p.bankTx.id)
                              : [...prev, p.bankTx.id]
                          )
                        }
                        className="flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        <span className="text-list-amount tabular-nums text-[var(--text-primary)]">
                          −{formatAmount(p.amount, lang)} {currency}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-btn-sm flex items-center justify-center border ${
                            isChecked
                              ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--text-on-accent)]'
                              : 'border-[var(--border-color)]'
                          }`}
                        >
                          {isChecked && <Check size={12} strokeWidth={2.5} />}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ITEMS TO REVIEW */}
        {reconciliationTab === 'review' && (
          <div className="space-y-2">
            {reconciliationPreview.reviewItems.length === 0 ? (
              <div className="p-6 text-center rounded-card bg-[var(--surface-muted)] text-secondary text-[var(--text-secondary)]">
                Inga osäkra poster kräver särskild granskning.
              </div>
            ) : (
              <div className="space-y-2 max-h-[290px] overflow-y-auto">
                <p className="text-secondary text-[var(--text-secondary)]">
                  Dessa poster läggs under ”Att granska” utanför budgeten tills du tar ställning till dem:
                </p>
                <div className="rounded-card bg-[var(--surface-color)] border border-subtle divide-subtle">
                  {reconciliationPreview.reviewItems.map((rev) =>
                    renderBankTransactionRow(rev.bankTx, {
                      overrideMerchant: rev.merchant,
                      overrideCategory: rev.categorySuggestion,
                      subtitleNote: rev.reasonLabel,
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            fullWidth
            disabled={isApplyingReconciliation}
            onClick={handleApproveFirstReconciliation}
            icon={
              isApplyingReconciliation ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCircle2 size={15} />
              )
            }
          >
            {isApplyingReconciliation
              ? 'Tillämpar avstämning...'
              : 'Godkänn avstämning & aktivera löpande import'}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={isApplyingReconciliation}
            onClick={() => setIsReconciliationModalOpen(false)}
          >
            Avbryt (inget ändras)
          </Button>
        </div>
      </Modal>

      {/* =====================================================================
          MODAL 2: "ATT GRANSKA" QUEUE MODAL
         ===================================================================== */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Att granska (${activeReviewItems.length})`}
        size="md"
        bodyClassName="p-4 space-y-4"
      >
        <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
          Välj hur respektive bankpost ska hanteras. Exkluderade poster och egna överföringar sparas så att de inte dyker upp igen vid nästa synkronisering.
        </p>

        {activeReviewItems.length === 0 ? (
          <div className="p-6 text-center rounded-card bg-[var(--surface-muted)] text-secondary text-[var(--text-secondary)]">
            Alla poster är färdiggranskade!
          </div>
        ) : (
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5">
            {activeReviewItems.map((item) => {
              const isBusy = processingReviewTxId === item.bankTx.id;
              const isExpense = item.amount < 0;
              const selectedCat =
                reviewCategorySelections[item.bankTx.id] ||
                item.categorySuggestion ||
                expenseCategories[0] ||
                'Övrigt';
              const display = buildDisplayTxData(item.bankTx, item.merchant, selectedCat);

              return (
                <Card
                  key={item.bankTx.id}
                  variant="default"
                  padding="sm"
                  className="space-y-3 border border-subtle"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <TransactionLogo
                        transaction={display.virtualTransaction}
                        config={config}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-body-medium font-medium text-[var(--text-primary)] truncate">
                          {item.merchant}
                        </p>
                        <p className="text-secondary text-[var(--text-secondary)]">
                          {item.dateIso} · {item.reasonLabel}
                        </p>
                      </div>
                    </div>
                    <span className="text-list-amount tabular-nums text-[var(--text-primary)] shrink-0">
                      {item.amount > 0 ? '+' : '−'}
                      {formatAmount(Math.abs(item.amount), lang)}{' '}
                      {item.bankTx.currency || currency}
                    </span>
                  </div>

                  {/* Category selector for purchase / refund */}
                  <div className="flex items-center gap-2">
                    <span className="text-secondary font-medium text-[var(--text-secondary)]">
                      Kategori:
                    </span>
                    <select
                      value={selectedCat}
                      onChange={(e) =>
                        setReviewCategorySelections((prev) => ({
                          ...prev,
                          [item.bankTx.id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-2.5 py-1.5 text-secondary rounded-btn-sm border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-primary)]"
                    >
                      {expenseCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Candidate manual match selector if relevant */}
                  {item.candidateManualTx && (
                    <div className="p-2.5 rounded-btn-sm bg-[var(--surface-muted)] flex items-center justify-between gap-2 text-secondary">
                      <span className="truncate text-[var(--text-secondary)]">
                        Möjlig manuell post:{' '}
                        <strong className="text-[var(--text-primary)]">
                          {item.candidateManualTx.merchant || item.candidateManualTx.category} (−
                          {item.candidateManualTx.amount} {currency})
                        </strong>
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleResolveReviewItem(item, 'match_manual')}
                      >
                        Matcha
                      </Button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {isExpense && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleResolveReviewItem(item, 'import_purchase')}
                      >
                        Godkänn som köp
                      </Button>
                    )}

                    {isExpense && existingFixedExpenses.length > 0 && (
                      <div className="inline-flex items-center gap-1">
                        <select
                          value={
                            reviewFixedSelections[item.bankTx.id] ||
                            item.candidateFixedExpense?.id ||
                            existingFixedExpenses[0]?.id ||
                            ''
                          }
                          onChange={(e) =>
                            setReviewFixedSelections((prev) => ({
                              ...prev,
                              [item.bankTx.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-1 text-secondary rounded-btn-sm border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-primary)] max-w-[125px]"
                        >
                          {existingFixedExpenses
                            .filter((f) => !f.isCancelled)
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                        </select>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => handleResolveReviewItem(item, 'confirm_fixed')}
                        >
                          Fast utgift
                        </Button>
                      </div>
                    )}

                    {!isExpense && (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => handleResolveReviewItem(item, 'refund')}
                        icon={<RotateCcw size={12} />}
                      >
                        Bokför som återbetalning
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleResolveReviewItem(item, 'transfer')}
                      icon={<Repeat size={12} />}
                    >
                      Egen överföring
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleResolveReviewItem(item, 'exclude')}
                      icon={<XCircle size={12} />}
                    >
                      Exkludera
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Button variant="ghost" fullWidth onClick={() => setIsReviewModalOpen(false)}>
          Stäng
        </Button>
      </Modal>

      {/* =====================================================================
          MODAL 3: SINGLE ACCOUNT SETTINGS ("KONTOINSTÄLLNINGAR")
         ===================================================================== */}
      {editingSingleAccount && (
        <Modal
          isOpen={Boolean(editingSingleAccount)}
          onClose={() => setEditingSingleAccount(null)}
          title="Kontoinställningar"
          size="sm"
          bodyClassName="p-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="block text-label font-semibold text-[var(--text-primary)]">
              Eget kontonamn
            </label>
            <Input
              type="text"
              value={accountCustomNameInput}
              onChange={(e) => setAccountCustomNameInput(e.target.value)}
              placeholder={getBankAccountTitle({ ...editingSingleAccount, custom_name: null })}
            />
            <p className="text-secondary text-[var(--text-secondary)]">
              Lämna tomt för att använda bankens kontonamn (
              {getBankAccountTitle({ ...editingSingleAccount, custom_name: null })}) ·{' '}
              {formatBankAccountNumber(
                editingSingleAccount.bban ||
                  editingSingleAccount.iban ||
                  editingSingleAccount.provider_account_uid
              )}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-label font-semibold text-[var(--text-primary)]">
              Importstartdatum för budgeten
            </label>
            <input
              type="date"
              value={accountImportStartInput}
              onChange={(e) => setAccountImportStartInput(e.target.value)}
              className="w-full px-3 py-2 text-secondary font-medium rounded-btn-sm border border-[var(--border-color)] bg-[var(--surface-color)] text-[var(--text-primary)]"
            />
            <p className="text-secondary text-[var(--text-secondary)]">
              Transaktioner före detta datum analyseras endast för förslag och ändrar aldrig budgeten.
            </p>
          </div>

          <Card variant="default" padding="none" className="divide-y divide-menu border border-subtle">
            <ListRow
              variant="grouped"
              multiline
              title="Låt kontot bidra till budgeten"
              subtitle="Påverkar endast kommande import och skriver inte om tidigare perioder"
              control={
                <Switch
                  checked={accountIncludeInBudgetInput}
                  onChange={setAccountIncludeInBudgetInput}
                />
              }
            />
            <ListRow
              variant="grouped"
              multiline
              title="Löpande import aktiv"
              subtitle="Importera nya bokförda vardagsköp automatiskt vid synkronisering"
              control={
                <Switch
                  checked={accountOngoingImportInput}
                  onChange={setAccountOngoingImportInput}
                />
              }
            />
          </Card>

          <div className="flex gap-2 pt-1">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setEditingSingleAccount(null)}
            >
              Avbryt
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={isSavingSingleAccount}
              onClick={handleSaveSingleAccountSettings}
            >
              {isSavingSingleAccount ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Connect / Reconnect Flow Modal */}
      <BankConnectFlowModal
        isOpen={isConnectModalOpen}
        onClose={() => {
          setIsConnectModalOpen(false);
          setReconnectTarget(null);
          setActiveCallbackData(null);
        }}
        originContext="settings"
        initialCallbackData={activeCallbackData}
        reconnectConnection={reconnectTarget}
        language={lang}
        onCompleted={async () => {
          setIsConnectModalOpen(false);
          setReconnectTarget(null);
          setActiveCallbackData(null);
          await loadBankStatus();
          setIsReconciliationModalOpen(true);
          if (addToast) {
            addToast(
              'Bankkonton kopplade! Granska avstämningen innan något läggs till i din budget.',
              'success'
            );
          }
        }}
      />

      {/* Manage Selected Accounts Modal */}
      {editingAccountsConn && (
        <Modal
          isOpen={Boolean(editingAccountsConn)}
          onClose={() => setEditingAccountsConn(null)}
          title={`Välj konton (${editingAccountsConn.aspsp_name})`}
          size="sm"
          bodyClassName="p-4 space-y-4"
        >
          <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
            Välj vilka konton som ska synkroniseras. Ändrat kontoval skriver inte om tidigare perioder i din budget.
          </p>
          <Card variant="default" padding="none" className="divide-y divide-menu border border-subtle max-h-[280px] overflow-y-auto">
            {accounts
              .filter((a) => a.connection_id === editingAccountsConn.id)
              .map((acc) => {
                const isChecked = editingAccountIds.includes(acc.id);
                const accountTitle = getBankAccountTitle(acc);
                const isSavings = isLikelySavingsAccount(acc);
                return (
                  <ListRow
                    key={acc.id}
                    variant="grouped"
                    density="compact"
                    icon={<Wallet size={18} strokeWidth={2} />}
                    title={accountTitle}
                    subtitle={[
                      isSavings ? 'Sparkonto' : null,
                      formatBankAccountNumber(
                        acc.bban || acc.iban || acc.provider_account_uid
                      ),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    showCheck={isChecked}
                    onClick={() =>
                      setEditingAccountIds((prev) =>
                        prev.includes(acc.id)
                          ? prev.filter((id) => id !== acc.id)
                          : [...prev, acc.id]
                      )
                    }
                  />
                );
              })}
          </Card>
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => setEditingAccountsConn(null)}>
              Avbryt
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={isSavingAccountSelection}
              onClick={handleSaveEditedAccounts}
            >
              {isSavingAccountSelection ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Disconnect Confirmation Modal */}
      {disconnectTarget && (
        <Modal
          isOpen={Boolean(disconnectTarget)}
          onClose={() => setDisconnectTarget(null)}
          title={`Koppla från ${disconnectTarget.aspsp_name}?`}
          size="sm"
          center
          bodyClassName="p-5 space-y-4"
        >
          <p className="text-secondary text-[var(--text-secondary)] leading-relaxed">
            När du kopplar från {disconnectTarget.aspsp_name} återkallas bankens session och framtida synkronisering stoppas. Alla utgifter, inkomster, kopplingar och köp i din budget och historik ligger kvar precis som vanligt.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="danger"
              fullWidth
              disabled={isDisconnecting}
              onClick={handleDisconnectConfirm}
            >
              {isDisconnecting ? 'Kopplar från...' : 'Koppla från bank'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={isDisconnecting}
              onClick={() => setDisconnectTarget(null)}
            >
              Avbryt
            </Button>
          </div>
        </Modal>
      )}

      {renderBankTransactionDetailModal()}
    </div>
  );
}
