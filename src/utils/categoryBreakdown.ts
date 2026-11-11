import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../app/models';
import type { BankTransactionItem } from '../services/bankService';
import { categorizeBankTransactionForApp } from './bankHistoryAnalyzer';

/**
 * Kategorilistan i Analys-fliken: utgifter per kategori (rörligt + fasta) och inkomster per kategori.
 *
 * Inkomster och utgifter hålls alltid isär – även när kategorin heter likadant (t.ex. "Övrigt").
 * Tidigare slogs de ihop till en rad som visades som inkomst: +19 000 inkomst och 9 000 utgifter
 * blev "+28 000".
 */
export interface CategoryBreakdownEntry {
  /** Unik nyckel för raden (inkomster får prefixet "income:") */
  key: string;
  /** Kategorinamnet (för ikon och färg) */
  category: string;
  /** Det som visas som rubrik */
  label: string;
  amount: number;
  isIncomeCategory: boolean;
  items: (TransactionItem | FixedExpenseItem | IncomeItem)[];
}

export interface CategoryBreakdownInput {
  variableTransactions: TransactionItem[];
  periodFixedList: FixedExpenseItem[];
  reimbursementTransactions: TransactionItem[];
  unlinkedManualSplitReductions: number;
  periodIncomesList: IncomeItem[];
}

type Bucket = { amount: number; items: CategoryBreakdownEntry['items'] };

/** Rubrik för en inkomstkategori som har samma namn som en utgiftskategori. */
export function incomeLabelFor(category: string, clashesWithExpense: boolean): string {
  if (!clashesWithExpense) return category;
  return category === 'Övrigt' ? 'Övriga inkomster' : `${category} (inkomst)`;
}

export function buildCategoryBreakdown({
  variableTransactions,
  periodFixedList,
  reimbursementTransactions,
  unlinkedManualSplitReductions,
  periodIncomesList,
}: CategoryBreakdownInput): CategoryBreakdownEntry[] {
  const expenses = new Map<string, Bucket>();
  const incomes = new Map<string, Bucket>();
  const addTo = (map: Map<string, Bucket>, cat: string, amount: number, item: Bucket['items'][number]) => {
    const existing = map.get(cat) || { amount: 0, items: [] };
    existing.amount += amount;
    existing.items.push(item);
    map.set(cat, existing);
  };

  for (const tx of variableTransactions) addTo(expenses, tx.category || 'Övrigt', Number(tx.amount) || 0, tx);
  for (const exp of periodFixedList) addTo(expenses, exp.category || 'Räkningar', Number(exp.amount) || 0, exp);

  // Dra av returer ('Återbetalning') och Swish-utlägg från motsvarande utgiftskategori
  let remainingManualSplitBuffer = unlinkedManualSplitReductions;
  for (const refTx of reimbursementTransactions) {
    let refAmt = Math.abs(Number(refTx.amount) || 0);
    if (refAmt <= 0) continue;
    if (refTx.category !== 'Återbetalning' && remainingManualSplitBuffer > 0) {
      const absorbed = Math.min(refAmt, remainingManualSplitBuffer);
      refAmt -= absorbed;
      remainingManualSplitBuffer -= absorbed;
    }
    if (refAmt <= 0) continue;

    let targetCat = '';
    if (refTx.category === 'Återbetalning') {
      const inferred = categorizeBankTransactionForApp({
        description: refTx.rawDescription || refTx.title || '',
        counterparty_name: refTx.counterpartyName || refTx.title || '',
        raw_json: refTx.rawJson,
      } as BankTransactionItem);
      if (
        inferred.category &&
        inferred.category !== 'Övrigt' &&
        inferred.category !== 'Återbetalning' &&
        expenses.has(inferred.category)
      ) {
        targetCat = inferred.category;
      }
    } else if (refTx.category === 'Swish' && expenses.has('Swish')) {
      targetCat = 'Swish';
    }

    if (!targetCat) {
      // Reserv: den största rörliga utgiftskategorin (inte Räkningar/Boende/Sparande)
      let largestAmt = 0;
      for (const [catName, entry] of expenses.entries()) {
        if (!['Räkningar', 'Boende', 'Sparande'].includes(catName) && entry.amount > largestAmt) {
          largestAmt = entry.amount;
          targetCat = catName;
        }
      }
    }

    const entry = targetCat ? expenses.get(targetCat) : undefined;
    if (entry) {
      entry.amount = Math.max(0, entry.amount - refAmt);
      entry.items.push(refTx);
    }
  }

  for (const inc of periodIncomesList) addTo(incomes, inc.category || 'Lön', Number(inc.amount) || 0, inc);

  const expenseEntries: CategoryBreakdownEntry[] = [...expenses.entries()]
    .map(([category, b]) => ({ key: category, category, label: category, amount: b.amount, isIncomeCategory: false, items: b.items }))
    .sort((a, b) => b.amount - a.amount);
  const incomeEntries: CategoryBreakdownEntry[] = [...incomes.entries()]
    .map(([category, b]) => ({
      key: `income:${category}`,
      category,
      label: incomeLabelFor(category, expenses.has(category)),
      amount: b.amount,
      isIncomeCategory: true,
      items: b.items,
    }))
    .sort((a, b) => b.amount - a.amount);
  return [...expenseEntries, ...incomeEntries];
}
