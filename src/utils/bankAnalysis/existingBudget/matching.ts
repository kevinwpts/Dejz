// Jämför det banken visar med användarens befintliga fasta utgifter och inkomster.
import { BankTransactionItem } from '../../../services/bankService';
import { FixedExpense, Income } from '../../../types';
import {
  DetectedFixedExpenseWithEvidence,
  DetectedIncomeWithEvidence,
  ExistingBudgetFixedExpenseMatch,
  ExistingBudgetIncomeMatch,
} from '../types';
import { getTxText, includesAny } from '../txFields';

const HOUSING_WORDS = ['hyra', 'boende', 'fastighet'];

/**
 * Sant om två namn på fasta utgifter troligen är samma sak: lika, det ena ingår i det andra,
 * eller båda handlar om boende (hyra/boende/fastighet).
 */
export function isSameFixedExpenseName(nameA: string | null | undefined, nameB: string | null | undefined): boolean {
  const a = String(nameA || '').toLowerCase().trim();
  const b = String(nameB || '').toLowerCase().trim();
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  return includesAny(a, HOUSING_WORDS) && includesAny(b, HOUSING_WORDS);
}

/**
 * Skapar en funktion som svarar på om en banktransaktion hör till någon av användarens
 * aktiva fasta utgifter (namnet, eller "Hyra (X)" → "X", står i transaktionstexten).
 */
export function createExistingFixedMatcher(
  existingFixedExpenses: FixedExpense[]
): (tx: BankTransactionItem) => boolean {
  const names = existingFixedExpenses
    .filter((e) => !e.isCancelled)
    .map((fixed) => {
      const fixedName = String(fixed.name || '').toLowerCase().trim();
      return [fixedName, fixedName.replace(/^hyra\s*\(|\)$/g, '').trim()];
    });
  return (tx) => {
    const text = getTxText(tx);
    return names.some((variants) => variants.some((n) => n.length >= 3 && text.includes(n)));
  };
}

/** Hittar en aktiv fast utgift som motsvarar den hittade (samma namn, eller samma kategori och nära belopp). */
function findExistingFixed(
  det: DetectedFixedExpenseWithEvidence,
  activeFixed: FixedExpense[]
): FixedExpense | undefined {
  return activeFixed.find(
    (ex) =>
      isSameFixedExpenseName(ex.name, det.name) ||
      (ex.category === det.category && det.amount >= 2000 && Math.abs(ex.amount - det.amount) <= 300)
  );
}

/**
 * Jämför hittade fasta utgifter med användarens. Uppsagda abonnemang föreslås aldrig igen,
 * och användarens befintliga avtal ersätts aldrig – de markeras bara som ändrat belopp.
 */
export function matchDetectedFixedExpenses(
  detected: DetectedFixedExpenseWithEvidence[],
  existingFixedExpenses: FixedExpense[]
): ExistingBudgetFixedExpenseMatch[] {
  const activeFixed = existingFixedExpenses.filter((e) => !e.isCancelled);
  const cancelledFixed = existingFixedExpenses.filter((e) => Boolean(e.isCancelled));
  const matches: ExistingBudgetFixedExpenseMatch[] = [];

  detected.forEach((det, idx) => {
    if (cancelledFixed.some((canc) => isSameFixedExpenseName(canc.name, det.name))) return;
    const id = `fixed_match_${idx}_${det.name}`;
    const existingExpense = findExistingFixed(det, activeFixed);
    if (!existingExpense) {
      matches.push({ id, detected: det, status: 'new' });
      return;
    }
    const diff = Math.abs(Number(existingExpense.amount) - Number(det.amount));
    matches.push({ id, detected: det, status: diff >= 5 ? 'amount_changed' : 'already_exists', existingExpense });
  });
  return matches;
}

/** Jämför hittade inkomster med användarens (lön, samma kategori eller samma namn). */
export function matchDetectedIncomes(
  detected: DetectedIncomeWithEvidence[],
  existingIncomes: Income[]
): ExistingBudgetIncomeMatch[] {
  return detected.map((det, idx) => {
    const id = `inc_match_${idx}`;
    const existingIncome = existingIncomes.find(
      (inc) =>
        String(inc.name || '').toLowerCase().includes('lön') ||
        String(inc.category || '').toLowerCase() === String(det.category || '').toLowerCase() ||
        String(inc.name || '').toLowerCase() === String(det.name || '').toLowerCase()
    );
    if (!existingIncome) return { id, detected: det, status: 'new' };
    const diff = Math.abs(Number(existingIncome.amount) - Number(det.amount));
    return { id, detected: det, status: diff >= 50 ? 'amount_changed' : 'already_exists', existingIncome };
  });
}
