// Föreslagna fasta utgifter/inkomster i onboardingen: typer och rena funktioner som sparar valen (ingen React).
import type { FixedExpenseItem, IncomeItem } from '../../app/models';

export interface SuggestedFixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  paymentMethod?: string;
  evidenceSummary?: string;
  checked: boolean;
  logo?: string;
  isFromBank?: boolean;
  isShared?: boolean;
  fullAmount?: number;
}

export interface SuggestedIncome {
  id: string;
  name: string;
  amount: number;
  payday: number;
  category: string;
  evidenceSummary?: string;
  checked: boolean;
  logo?: string;
  isFromBank?: boolean;
}

interface FixedHandlers {
  onAddFixed: (item: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdateFixed?: (item: FixedExpenseItem) => void;
  onDeleteFixed: (id: string) => void;
}

interface IncomeHandlers {
  onAddIncome: (item: Omit<IncomeItem, 'id'>) => void;
  onUpdateIncome?: (item: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
}

/** Lägg till, uppdatera eller ta bort fasta utgifter så att de matchar det användaren bockat i. */
export function persistSuggestedFixed(
  suggestedFixedExpenses: SuggestedFixedExpense[],
  fixedExpenses: FixedExpenseItem[],
  { onAddFixed, onUpdateFixed, onDeleteFixed }: FixedHandlers
): void {
  const sameNameCounts = new Map<string, number>();
  suggestedFixedExpenses.forEach((item) => {
    const k = item.name.toLowerCase();
    sameNameCounts.set(k, (sameNameCounts.get(k) || 0) + 1);
  });

  suggestedFixedExpenses.forEach((item) => {
    const hasMultipleSameName = (sameNameCounts.get(item.name.toLowerCase()) || 0) > 1;
    const existing = fixedExpenses.find((f) => {
      if (f.id === item.id) return true;
      if (f.name.toLowerCase() !== item.name.toLowerCase()) return false;
      return hasMultipleSameName ? Math.round(f.amount) === Math.round(item.amount) : true;
    });
    if (item.checked) {
      if (!existing) {
        onAddFixed({
          name: item.name,
          amount: item.amount,
          dueDay: item.dueDay,
          category: item.category,
          paymentMethod: item.paymentMethod || 'Autogiro',
          logo: item.logo,
          isShared: item.isShared,
          fullAmount: item.fullAmount,
        });
      } else if (
        onUpdateFixed &&
        (existing.amount !== item.amount ||
          existing.dueDay !== item.dueDay ||
          existing.name !== item.name ||
          existing.category !== item.category ||
          existing.isShared !== item.isShared ||
          existing.fullAmount !== item.fullAmount ||
          existing.paymentMethod !== (item.paymentMethod || existing.paymentMethod))
      ) {
        onUpdateFixed({
          ...existing,
          name: item.name,
          amount: item.amount,
          dueDay: item.dueDay,
          category: item.category || existing.category,
          paymentMethod: item.paymentMethod || existing.paymentMethod || 'Autogiro',
          logo: item.logo || existing.logo,
          isShared: item.isShared,
          fullAmount: item.fullAmount,
        });
      }
    } else if (existing) {
      onDeleteFixed(existing.id);
    }
  });
}

/** Lägg till, uppdatera eller ta bort inkomster så att de matchar det användaren bockat i. */
export function persistSuggestedIncomes(
  suggestedIncomes: SuggestedIncome[],
  incomes: IncomeItem[],
  { onAddIncome, onUpdateIncome, onDeleteIncome }: IncomeHandlers
): void {
  suggestedIncomes.forEach((item) => {
    const existing = incomes.find(
      (i) => i.id === item.id || i.name.toLowerCase() === item.name.toLowerCase()
    );
    if (item.checked) {
      if (!existing) {
        onAddIncome({
          name: item.name,
          amount: item.amount,
          payday: item.payday,
          category: item.category || 'Lön',
          logo: item.logo,
        });
      } else if (
        onUpdateIncome &&
        (existing.amount !== item.amount ||
          existing.payday !== item.payday ||
          existing.name !== item.name ||
          existing.category !== item.category)
      ) {
        onUpdateIncome({
          ...existing,
          name: item.name,
          amount: item.amount,
          payday: item.payday,
          category: item.category || existing.category,
          logo: item.logo || existing.logo,
        });
      }
    } else if (existing) {
      onDeleteIncome(existing.id);
    }
  });
}

/** Huvudinkomsten bland de ibockade: lön/ersättning i första hand, annars den största. */
export function pickPrimaryIncome(suggestedIncomes: SuggestedIncome[]): SuggestedIncome | undefined {
  const checkedList = suggestedIncomes.filter((i) => i.checked);
  if (checkedList.length === 0) return undefined;
  return (
    checkedList.find((i) => i.category === 'Lön' || i.category === 'Ersättning') ||
    [...checkedList].sort((a, b) => b.amount - a.amount)[0]
  );
}

export interface BankSummaryTexts {
  bankIncomeCount: number;
  incomeSummaryAmount: string;
  incomeSummaryDetail: string;
  fixedSummaryAmount: string;
  fixedSummaryDetail: string;
}

const listNames = (names: string[], max = 3) =>
  names.length <= max
    ? names.join(', ').replace(/, ([^,]*)$/, ' och $1')
    : `${names.slice(0, max).join(', ')} och ${names.length - max} till`;

const sumOf = (items: { amount: number }[]) =>
  items.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);

/**
 * Bekräfta-kort (med bank): det banken hittade som EN siffra och en kort beskrivning.
 */
export function buildBankSummaryTexts(
  suggestedIncomes: SuggestedIncome[],
  suggestedFixedExpenses: SuggestedFixedExpense[],
  formatKr: (val: number) => string
): BankSummaryTexts {
  const bankIncomeItems = suggestedIncomes.filter((i) => i.checked);
  const bankFixedItems = suggestedFixedExpenses.filter((f) => f.checked);
  const primaryBankIncome = bankIncomeItems[0];

  const incomeSummaryDetail =
    bankIncomeItems.length === 0
      ? 'Ingen inkomst vald'
      : bankIncomeItems.length === 1
      ? `${primaryBankIncome.category === 'Lön' ? 'Lön' : primaryBankIncome.name} · den ${primaryBankIncome.payday}:e varje månad`
      : `${listNames(bankIncomeItems.map((i) => i.name))} · varje månad`;

  const fixedSummaryDetail =
    bankFixedItems.length === 0
      ? 'Inga fasta utgifter valda'
      : `${bankFixedItems.length} st · ${listNames(
          [...bankFixedItems].sort((a, b) => b.amount - a.amount).map((f) => f.name)
        )}`;

  return {
    bankIncomeCount: bankIncomeItems.length,
    incomeSummaryAmount: `+${formatKr(sumOf(bankIncomeItems))}`,
    incomeSummaryDetail,
    fixedSummaryAmount: `−${formatKr(sumOf(bankFixedItems))}/mån`,
    fixedSummaryDetail,
  };
}
