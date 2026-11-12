import { useState, useMemo } from 'react';
import { calculateCurrentPeriod, PeriodInfo, isDateInPeriod } from '../../utils/periodEngine';
import {
  AccountItem,
  IncomeItem,
  FixedExpenseItem,
  TransactionItem,
  compareTransactionsChronologically,
} from '../../components/HomeTab';
import { BankConnection, BankAccount } from '../../services/bankService';
import { getLogoUrl } from '../../utils/logo';
import { formatBankAccountNumber, getBankAccountTitle } from '../../utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import {
  isTransactionManuallyExcluded,
  getMerchantAliases,
  getAccountMetaMap,
} from '../../utils/appCache';
import {
  findInternalTransferIds,
  isInternalTransferTransaction,
} from '../../utils/transferDetection';
import { reconcilePeriodRecurringMatches } from '../../utils/recurring';
import { useSavingsGoalCredit } from './useSavingsGoalCredit';
import { sanitizeTransactionItem } from '../transactionMapping';
import { getPayDatesForIncome } from '../incomeSchedule';
import { useExternalSnapshot } from '../../utils/hooks/useExternalSnapshot';

export interface UsePeriodDataContext {
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  targetPayday: number;
  weekendHandling: "before" | "after" | "none";
  excludeInternalTransfers: boolean;
  transactions: TransactionItem[];
  userEmail: string | null;
  userName: string | null;
  fixedExpenses: FixedExpenseItem[];
  incomes: IncomeItem[];
  hasActiveBankConnection: boolean;
  dismissedTxIds: string[];
}

export function usePeriodData({
  connections,
  bankAccounts,
  targetPayday,
  weekendHandling,
  excludeInternalTransfers,
  transactions,
  userEmail,
  userName,
  fixedExpenses,
  incomes,
  hasActiveBankConnection,
  dismissedTxIds,
}: UsePeriodDataContext) {
  const [accountMetaVersion, setAccountMetaVersion] = useState(0);
  const [selectedGoalIdInView, setSelectedGoalIdInView] = useState<string | null>(null);

  // Egna kontonamn/inställningar (localStorage). Läses om när kontona ändras eller när
  // accountMetaVersion höjs (egna kontonamn/inställningar sparade).
  const accountMeta = useExternalSnapshot(getAccountMetaMap, [
    connections,
    bankAccounts,
    accountMetaVersion,
  ]);

  // Konvertera Enable Banking-konton till visningskonton för Hem-fliken
  const accounts: AccountItem[] = useMemo(() => {
    const connMap = new Map<string, { name: string; logo?: string | null }>();
    for (const c of connections) {
      connMap.set(c.id, { name: c.aspsp_name, logo: c.aspsp_logo });
    }

    const activeAccs = bankAccounts.filter((a) => a.is_selected !== false);
    const listToUse = activeAccs.length > 0 ? activeAccs : bankAccounts;

    return listToUse.map((ba) => {
      const connInfo = connMap.get(ba.connection_id);
      const bankName = connInfo?.name || 'Bank';
      const originalName = getBankAccountTitle(ba, bankName);
      const meta = accountMeta[ba.id];
      const displayName =
        meta?.customName && meta.customName.trim()
          ? meta.customName.trim()
          : originalName;
      const formattedNumber = formatBankAccountNumber(ba.bban || ba.iban || ba.product || '');
      return {
        id: ba.id,
        name: displayName,
        originalName,
        accountNumber: formattedNumber,
        bankName,
        balance: Number(ba.balance_amount) || 0,
        type: 'checking' as const,
        logo: connInfo?.logo || getLogoUrl(bankName, 'Bank'),
        excludeFromTotalBalance: Boolean(meta?.excludeFromTotalBalance),
      };
    });
  }, [connections, bankAccounts, accountMeta]);

  // Bankernas namn (de aktiva i första hand). React Compiler memoiserar uträkningen.
  const activeConnections = connections.filter((c) => c.status === 'active');
  const connectedBank =
    activeConnections.length > 0
      ? activeConnections.map((c) => c.aspsp_name).join(', ')
      : connections.length > 0
        ? connections.map((c) => c.aspsp_name).join(', ')
        : null;

  // Beräkna aktuell period (från lönedag till dagen innan nästa lön) med vald helghantering:
  const period: PeriodInfo = useMemo(() => {
    return calculateCurrentPeriod(new Date(), targetPayday, weekendHandling);
  }, [targetPayday, weekendHandling]);

  // Totalt saldo
  const totalBalance = useMemo(() => {
    return accounts
      .filter((a) => !a.excludeFromTotalBalance)
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // Alla interna överföringar (enskilda och parvisa mellan egna konton)
  const internalTransferIds = useMemo(() => {
    if (!excludeInternalTransfers) return new Set<string>();
    return findInternalTransferIds(transactions, bankAccounts, userEmail, userName);
  }, [transactions, excludeInternalTransfers, bankAccounts, userEmail, userName]);

  // Transaktioner som tillhör den aktuella löneperioden (från lönedag till dagen innan nästa lön)
  const periodTransactions = useMemo(() => {
    const aliases = getMerchantAliases();
    const sanitized = transactions
      .filter((t) => {
        if (!isDateInPeriod(t.date, period)) return false;
        if (t.isExcluded) return false;
        if (isTransactionManuallyExcluded(t.id)) return false;
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      })
      .map((t) => sanitizeTransactionItem(t, fixedExpenses, incomes, aliases))
      .filter((t) => {
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      });

    const list = deduplicateTransactions(sanitized);

    list.sort(compareTransactionsChronologically);
    return list;
  }, [
    transactions,
    period,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
    fixedExpenses,
    incomes,
  ]);

  // 1-till-1-matchning mellan periodens faktiska banktransaktioner och fasta utgifter/inkomster:
  // Varje fast utgift kan högst kopplas till 1 transaktion per period, och när en fast inkomst/utgift
  // väl har bokförts används dess faktiska belopp under perioden.
  const periodRecurringMatches = useMemo(() => {
    return reconcilePeriodRecurringMatches(periodTransactions, fixedExpenses, incomes);
  }, [periodTransactions, fixedExpenses, incomes]);

  useSavingsGoalCredit({ fixedExpenses, periodRecurringMatches, period, hasActiveBankConnection });

  // Enhetlig transaktionslista för både Hem ("Senaste transaktioner"), Historik och Sök:
  // Garanterar att antalet reserverade transaktioner och historikrader alltid är 100% identiskt oavsett flik.
  const displayTransactions = useMemo(() => {
    const aliases = getMerchantAliases();
    const visibleSource = transactions.filter((t) => {
      if (t.isExcluded) return false;
      if (isTransactionManuallyExcluded(t.id)) return false;
      if (
        excludeInternalTransfers &&
        (internalTransferIds.has(t.id) ||
          isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
      ) {
        return false;
      }
      return true;
    });
    const combined = visibleSource
      .map((t) => sanitizeTransactionItem(t, fixedExpenses, incomes, aliases))
      .filter((t) => {
        if (
          excludeInternalTransfers &&
          (internalTransferIds.has(t.id) ||
            isInternalTransferTransaction(t, bankAccounts, userEmail, userName))
        ) {
          return false;
        }
        return true;
      });
    for (const inc of incomes) {
      if (!inc.amount || inc.amount <= 0) continue;
      const payDates = getPayDatesForIncome(inc, targetPayday, weekendHandling === 'before');
      for (const pDate of payDates) {
        const genId = `inc-${inc.id}-${pDate}`;
        if (dismissedTxIds.includes(genId)) continue;

        const isCovered = combined.some((t) => {
          if (t.type !== 'income') return false;
          if (t.id === genId) return true;
          const sameAmount = Math.abs((Number(t.amount) || 0) - inc.amount) <= 5;
          if (!sameAmount) return false;
          const d1 = new Date(t.date).getTime();
          const d2 = new Date(pDate).getTime();
          return !isNaN(d1) && !isNaN(d2) && Math.abs(d1 - d2) <= 3 * 86400 * 1000;
        });

        if (!isCovered) {
          combined.push({
            id: genId,
            title: inc.name,
            amount: inc.amount,
            type: 'income',
            category: inc.category || 'Lön',
            date: pDate,
            time: '',
            logo: inc.logo || getLogoUrl(inc.name, inc.category || 'Lön'),
          });
        }
      }
    }
    const deduped = deduplicateTransactions(combined);
    deduped.sort(compareTransactionsChronologically);
    return deduped;
  }, [
    transactions,
    fixedExpenses,
    incomes,
    targetPayday,
    weekendHandling,
    dismissedTxIds,
    excludeInternalTransfers,
    internalTransferIds,
    bankAccounts,
    userEmail,
    userName,
  ]);

  return {
    setAccountMetaVersion,
    periodTransactions,
    periodRecurringMatches,
    period,
    internalTransferIds,
    selectedGoalIdInView,
    setSelectedGoalIdInView,
    displayTransactions,
    connectedBank,
    accounts,
    totalBalance,
  };
}
