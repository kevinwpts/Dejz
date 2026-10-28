import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Check,
  Plus,
  ArrowClockwise,
} from '@phosphor-icons/react';
import { FixedExpenseItem, IncomeItem, TransactionItem } from './HomeTab';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
import { bankService, BankAccount } from '../services/bankService';
import { analyzeBankTransactionsForOnboarding } from '../utils/bankHistoryAnalyzer';
import {
  findMatchingFixedExpense,
  findMatchingIncome,
} from '../utils/recurring';
import { normalizeMerchantKey } from '../utils/appCache';
import { getLogoUrl } from '../utils/logo';

interface RecurringDiscoveryViewProps {
  transactions: TransactionItem[];
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  bankAccounts?: BankAccount[];
  targetPayday: number;
  paydayBeforeWeekend: boolean;
  onAddIncome: (data: Omit<IncomeItem, 'id'>) => Promise<any> | void;
  onAddFixed: (data: Omit<FixedExpenseItem, 'id'>) => Promise<any> | void;
  onUpdateIncome?: (item: IncomeItem) => Promise<any> | void;
  onUpdateFixed?: (item: FixedExpenseItem) => Promise<any> | void;
}

interface DiscoveredCandidate {
  key: string;
  kind: 'income' | 'expense';
  name: string;
  originalName?: string;
  amount: number;
  day: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
  occurrences: number;
}

const FIXED_EXPENSE_CATEGORIES = new Set([
  'boende',
  'räkningar',
  'abonnemang',
  'försäkring',
  'lån',
  'sparande & investeringar',
]);

const INCOME_CATEGORIES = new Set([
  'lön',
  'bidrag',
  'pension',
  'csn',
  'inkomst',
]);

export const RecurringDiscoveryView: React.FC<RecurringDiscoveryViewProps> = ({
  transactions,
  incomes,
  fixedExpenses,
  bankAccounts = [],
  targetPayday,
  paydayBeforeWeekend,
  onAddIncome,
  onAddFixed,
}) => {
  const [isScanning, setIsScanning] = useState(true);
  const [rawBankDetectedIncomes, setRawBankDetectedIncomes] = useState<
    Array<{
      name: string;
      amount: number;
      day: number;
      category: string;
      logo?: string;
      occurrences: number;
    }>
  >([]);
  const [rawBankDetectedFixed, setRawBankDetectedFixed] = useState<
    Array<{
      name: string;
      amount: number;
      day: number;
      category: string;
      paymentMethod?: string;
      logo?: string;
      occurrences: number;
    }>
  >([]);
  const [justAddedKeys, setJustAddedKeys] = useState<Set<string>>(new Set());

  const formatKr = (amount: number) =>
    `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

  const runAnalysis = useCallback(async () => {
    setIsScanning(true);
    try {
      const bankTxs = await bankService.listAllTransactionsForReconciliation(5000).catch(() => []);
      if (Array.isArray(bankTxs) && bankTxs.length > 0) {
        const analyzed = analyzeBankTransactionsForOnboarding(
          bankTxs,
          targetPayday,
          paydayBeforeWeekend,
          bankAccounts
        );

        setRawBankDetectedIncomes(
          (analyzed.detectedIncomes || []).map((inc) => ({
            name: inc.name,
            amount: Math.round(Number(inc.amount) || 0),
            day: inc.deductionDay || targetPayday || 25,
            category: inc.category || 'Lön',
            logo: inc.logo || getLogoUrl(inc.name, inc.category || 'Lön'),
            occurrences: inc.detectedOccurrences || (inc.evidenceDates?.length ?? 1),
          }))
        );

        setRawBankDetectedFixed(
          (analyzed.detectedFixedExpenses || []).map((fix) => ({
            name: fix.name,
            amount: Math.round(Number(fix.amount) || 0),
            day: fix.deductionDay || 27,
            category: fix.category || 'Räkningar',
            paymentMethod: fix.paymentMethod || 'Autogiro',
            logo: fix.logo || getLogoUrl(fix.name, fix.category || 'Räkningar'),
            occurrences: fix.detectedOccurrences || (fix.evidenceDates?.length ?? 1),
          }))
        );
      } else {
        setRawBankDetectedIncomes([]);
        setRawBankDetectedFixed([]);
      }
    } finally {
      setTimeout(() => setIsScanning(false), 240);
    }
  }, [targetPayday, paydayBeforeWeekend, bankAccounts]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const missingCandidates = useMemo(() => {
    const incomeMap = new Map<
      string,
      {
        name: string;
        amount: number;
        day: number;
        category: string;
        logo?: string;
        occurrences: number;
      }
    >();

    const expenseMap = new Map<
      string,
      {
        name: string;
        amount: number;
        day: number;
        category: string;
        paymentMethod?: string;
        logo?: string;
        occurrences: number;
      }
    >();

    for (const inc of rawBankDetectedIncomes) {
      const norm = normalizeMerchantKey(inc.name);
      if (!norm || inc.amount <= 0) continue;
      incomeMap.set(norm, inc);
    }

    for (const fix of rawBankDetectedFixed) {
      const norm = normalizeMerchantKey(fix.name);
      if (!norm || fix.amount <= 0) continue;
      expenseMap.set(`${norm}:${fix.amount}`, fix);
    }

    const txGroups = new Map<
      string,
      {
        title: string;
        type: 'income' | 'expense';
        category: string;
        logo?: string;
        months: Set<string>;
        latestDate: string;
        latestAmount: number;
        latestDay: number;
        count: number;
      }
    >();

    const sortedTxs = [...transactions]
      .filter((tx) => !tx.isExcluded && (Number(tx.amount) || 0) > 0)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    for (const tx of sortedTxs) {
      const norm = normalizeMerchantKey(tx.title || '');
      if (!norm || norm === 'swish' || norm.startsWith('swish ')) continue;
      const kind = tx.type === 'income' ? 'income' : 'expense';
      const groupKey = `${kind}:${norm}`;
      const monthKey = (tx.date || '').slice(0, 7);
      const dayNum = parseInt((tx.date || '').slice(8, 10), 10) || (kind === 'income' ? 25 : 27);
      const amt = Math.round(Math.abs(Number(tx.amount) || 0));

      const existing = txGroups.get(groupKey);
      if (!existing) {
        txGroups.set(groupKey, {
          title: tx.title,
          type: kind,
          category: tx.category || (kind === 'income' ? 'Lön' : 'Räkningar'),
          logo: tx.logo,
          months: new Set(monthKey ? [monthKey] : []),
          latestDate: tx.date || '',
          latestAmount: amt,
          latestDay: dayNum,
          count: 1,
        });
      } else {
        if (monthKey) existing.months.add(monthKey);
        existing.count += 1;
      }
    }

    for (const [, grp] of txGroups) {
      const norm = normalizeMerchantKey(grp.title);
      const catLower = (grp.category || '').trim().toLowerCase();

      if (grp.type === 'income') {
        const isLikelyRecurringIncome =
          grp.months.size >= 2 ||
          (INCOME_CATEGORIES.has(catLower) && grp.latestAmount >= 500);
        if (isLikelyRecurringIncome && !incomeMap.has(norm)) {
          incomeMap.set(norm, {
            name: grp.title,
            amount: grp.latestAmount,
            day: grp.latestDay,
            category: grp.category || 'Lön',
            logo: grp.logo || getLogoUrl(grp.title, grp.category || 'Lön'),
            occurrences: Math.max(grp.months.size, grp.count),
          });
        }
      } else {
        const isFixedCat = FIXED_EXPENSE_CATEGORIES.has(catLower);
        const isRecurringAcrossMonths = grp.months.size >= 2 && isFixedCat;
        const isHighConfidenceFixed = isFixedCat && grp.latestAmount >= 49;

        if (isRecurringAcrossMonths || isHighConfidenceFixed) {
          const alreadyInExpenseMap = Array.from(expenseMap.values()).some(
            (e) => normalizeMerchantKey(e.name) === norm
          );
          if (!alreadyInExpenseMap) {
            expenseMap.set(`${norm}:${grp.latestAmount}`, {
              name: grp.title,
              amount: grp.latestAmount,
              day: grp.latestDay,
              category: grp.category || 'Räkningar',
              paymentMethod: 'Autogiro',
              logo: grp.logo || getLogoUrl(grp.title, grp.category || 'Räkningar'),
              occurrences: Math.max(grp.months.size, grp.count),
            });
          }
        }
      }
    }

    const result: DiscoveredCandidate[] = [];

    for (const [key, cand] of incomeMap.entries()) {
      const matchedExisting = findMatchingIncome(
        { title: cand.name, type: 'income', amount: cand.amount },
        incomes
      );
      if (!matchedExisting) {
        result.push({
          key: `inc-${key}`,
          kind: 'income',
          name: cand.name,
          amount: cand.amount,
          day: cand.day,
          category: cand.category,
          logo: cand.logo,
          occurrences: cand.occurrences,
        });
      }
    }

    for (const [key, cand] of expenseMap.entries()) {
      const matchedExisting = findMatchingFixedExpense(
        { title: cand.name, amount: cand.amount },
        fixedExpenses
      );
      if (!matchedExisting) {
        result.push({
          key: `exp-${key}`,
          kind: 'expense',
          name: cand.name,
          amount: cand.amount,
          day: cand.day,
          category: cand.category,
          paymentMethod: cand.paymentMethod || 'Autogiro',
          logo: cand.logo,
          occurrences: cand.occurrences,
        });
      }
    }

    return result
      .filter((c) => !justAddedKeys.has(c.key))
      .sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'income' ? -1 : 1;
        return b.amount - a.amount;
      });
  }, [rawBankDetectedIncomes, rawBankDetectedFixed, transactions, incomes, fixedExpenses, justAddedKeys]);

  const handleAddCandidate = async (cand: DiscoveredCandidate) => {
    setJustAddedKeys((prev) => new Set(prev).add(cand.key));
    if (cand.kind === 'income') {
      await onAddIncome({
        name: cand.name,
        originalName: cand.originalName || cand.name,
        amount: cand.amount,
        payday: cand.day,
        category: cand.category || 'Lön',
        logo: cand.logo,
      });
    } else {
      await onAddFixed({
        name: cand.name,
        originalName: cand.originalName || cand.name,
        amount: cand.amount,
        dueDay: cand.day,
        category: cand.category || 'Räkningar',
        paymentMethod: cand.paymentMethod || 'Autogiro',
        logo: cand.logo,
      });
    }
  };

  const handleAddAllMissing = async () => {
    for (const cand of missingCandidates) {
      await handleAddCandidate(cand);
    }
  };

  if (isScanning) {
    return (
      <div className="ui-page">
        <div className="ui-list-card animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--surface-raised)]" />
                <div className="space-y-1.5">
                  <div className="w-28 h-3.5 rounded bg-[var(--surface-raised)]" />
                  <div className="w-20 h-2.5 rounded bg-[var(--surface-raised)]" />
                </div>
              </div>
              <div className="w-20 h-7 rounded-xl bg-[var(--surface-raised)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page">
      {missingCandidates.length > 0 ? (
        <section className="ui-section">
          <div className="ui-section-header">
            <span className="ui-section-meta">
              {missingCandidates.length} {missingCandidates.length === 1 ? 'hittad post' : 'hittade poster'}
            </span>
            {missingCandidates.length > 1 && (
              <button
                type="button"
                onClick={handleAddAllMissing}
                className="ui-section-action"
              >
                <Plus size={13} weight="bold" />
                <span>Lägg till alla</span>
              </button>
            )}
          </div>

          <div className="ui-list-card">
            {missingCandidates.map((cand) => {
              const isIncome = cand.kind === 'income';
              return (
                <div key={cand.key} className="ui-tx-row">
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <ItemLogo
                      name={cand.name}
                      category={cand.category}
                      logoUrl={cand.logo}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">{cand.name}</span>
                      <span className="ui-row-subtitle flex items-center gap-1">
                        <CategoryIcon
                          category={cand.category}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
                        <span className="truncate">
                          {cand.category} · Den {cand.day}:e
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <span
                        className={
                          isIncome ? 'ui-row-amount-income' : 'ui-row-amount'
                        }
                      >
                        {isIncome
                          ? `+${formatKr(cand.amount)}`
                          : `-${formatKr(cand.amount)}`}
                      </span>
                      <span className="ui-row-meta">
                        {isIncome ? 'Inkomst' : 'Fast utgift'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddCandidate(cand)}
                      className="h-8 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold flex items-center gap-1 hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={12} weight="bold" />
                      <span>Lägg till</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="ui-empty-state-page">
          <div className="w-11 h-11 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <Check size={20} weight="bold" />
          </div>
          <h3 className="ui-empty-title">Inga saknade fasta poster</h3>
          <p className="ui-empty-sub mb-5">
            Alla upptäckta inkomster och fasta utgifter finns redan i din ekonomiöversikt.
          </p>
          <button
            type="button"
            onClick={runAnalysis}
            className="ui-btn-secondary max-w-[180px] mx-auto"
          >
            <ArrowClockwise size={14} />
            <span>Skanna igen</span>
          </button>
        </section>
      )}
    </div>
  );
};
