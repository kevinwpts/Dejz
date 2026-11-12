// Matchar en transaktion mot användarens fasta utgifter och fasta inkomster (namn, alias, belopp).
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../app/models';
import { extractMerchantKeyVariants, normalizeMerchantKey } from '../cache/appState';
import { isGenericPlaceholderMerchant } from '../cache/merchants';
import {
  extractSpecificBrandTokens,
  foldForMatching,
  isEverydayGroceryPurchase,
} from './text';

export function getFixedExpenseAmountDistance(exp: FixedExpenseItem, txAmount: number): number {
  const expAmt = Math.round(Math.abs(Number(exp.amount) || 0));
  const fullAmt = exp.fullAmount ? Math.round(Math.abs(Number(exp.fullAmount) || 0)) : 0;
  const distPrimary = Math.abs(expAmt - txAmount);
  const distFull = fullAmt > 0 ? Math.abs(fullAmt - txAmount) : Infinity;
  return Math.min(distPrimary, distFull);
}

export function isFixedExpenseAmountMatch(exp: FixedExpenseItem, txAmount: number): boolean {
  if (!txAmount || txAmount <= 0) return true;
  const dist = getFixedExpenseAmountDistance(exp, txAmount);
  const refAmt = Math.max(exp.amount || 0, exp.fullAmount || 0, txAmount);
  return dist <= Math.max(10, Math.round(refAmt * 0.08));
}

export function findAllMatchingFixedExpensesByMerchant(
  tx: Partial<TransactionItem> | string | null | undefined,
  fixedExpenses?: FixedExpenseItem[]
): FixedExpenseItem[] {
  if (!tx || !fixedExpenses || fixedExpenses.length === 0) return [];

  const isStr = typeof tx === 'string';
  if (!isStr && tx.linkedFixedExpenseId) {
    const explicitExp = fixedExpenses.find((e) => e.id === tx.linkedFixedExpenseId);
    if (explicitExp) {
      return [explicitExp];
    }
  }

  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );

  const isGrocery = combinedNorm ? isEverydayGroceryPurchase(combinedNorm) : false;
  const matches: FixedExpenseItem[] = [];

  if (combinedNorm) {
    for (const exp of fixedExpenses) {
      const expNameNorm = normalizeMerchantKey(exp.name);
      const expOrigNorm = exp.originalName ? normalizeMerchantKey(exp.originalName) : '';
      const aliasNorms = (exp.linkedAliases || [])
        .map((a) => normalizeMerchantKey(a))
        .filter((a) => a.length >= 2);
      if (!expNameNorm) continue;

      if (
        txTitleNorm === expNameNorm ||
        (expOrigNorm && txTitleNorm === expOrigNorm) ||
        aliasNorms.some((a) => txTitleNorm === a || combinedNorm.includes(a))
      ) {
        matches.push(exp);
        continue;
      }

      // Banker skriver ibland utan å/ä/ö ("ORESUNDSKRAFT") – jämför även utan accenter
      const foldedName = foldForMatching(exp.name);
      if (
        foldedName.length >= 5 &&
        ` ${foldForMatching(
          isStr ? tx : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
        )} `.includes(` ${foldedName}`)
      ) {
        matches.push(exp);
        continue;
      }

      if (isGrocery && !isEverydayGroceryPurchase(expNameNorm) && aliasNorms.length === 0) {
        continue;
      }

      let matchedThisExp = false;
      const candidateNames = [
        exp.name,
        exp.originalName,
        ...(exp.linkedAliases || []),
      ].filter(Boolean) as string[];
      for (const candName of candidateNames) {
        if (matchedThisExp) break;
        const variants = extractMerchantKeyVariants(candName);
        for (const v of variants) {
          if (
            v.length >= 3 &&
            (combinedNorm.includes(v) || (txTitleNorm.length >= 4 && v.includes(txTitleNorm)))
          ) {
            matches.push(exp);
            matchedThisExp = true;
            break;
          }
        }
        if (matchedThisExp) break;

        const brandTokens = extractSpecificBrandTokens(candName);
        for (const token of brandTokens) {
          if (token === 'max' || token === 'ica' || token === 'coop' || token === 'apple') {
            continue;
          }
          if (token.length >= 5 && combinedNorm.includes(token)) {
            matches.push(exp);
            matchedThisExp = true;
            break;
          }
        }
      }
    }
  }

  return matches;
}

export function findMatchingFixedExpense(
  tx: Partial<TransactionItem> | string | null | undefined,
  fixedExpenses?: FixedExpenseItem[]
): FixedExpenseItem | null {
  if (!tx || !fixedExpenses || fixedExpenses.length === 0) return null;

  const isStr = typeof tx === 'string';
  if (!isStr && tx.linkedFixedExpenseId) {
    const explicitExp = fixedExpenses.find((e) => e.id === tx.linkedFixedExpenseId);
    if (explicitExp) return explicitExp;
  }

  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const txAmt = !isStr ? Math.round(Math.abs(Number(tx.amount) || 0)) : 0;

  const candidates = findAllMatchingFixedExpensesByMerchant(tx, fixedExpenses);
  if (candidates.length > 0) {
    if (candidates.length === 1) {
      return candidates[0];
    }
    // Om användaren har flera fasta utgifter hos samma aktör (t.ex. 3 olika försäkringar hos Folksam),
    // prioritera alltid den fasta utgift vars titel ELLER belopp stämmer bäst överens med transaktionen!
    if (txAmt > 0) {
      const sorted = [...candidates].sort((a, b) => {
        const distA = getFixedExpenseAmountDistance(a, txAmt);
        const distB = getFixedExpenseAmountDistance(b, txAmt);
        if (distA !== distB) return distA - distB;
        const aExactTitle = normalizeMerchantKey(a.name) === txTitleNorm ? 0 : 1;
        const bExactTitle = normalizeMerchantKey(b.name) === txTitleNorm ? 0 : 1;
        return aExactTitle - bExactTitle;
      });
      return sorted[0];
    }
    return candidates[0];
  }

  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );
  const isGrocery = combinedNorm ? isEverydayGroceryPurchase(combinedNorm) : false;

  // Fallback för anonyma bankrader (t.ex. "Banktransaktion", "Betalning", "Autogiro" där banken tappat mottagarnamnet
  // när en reserverad hyra eller räkning övergått till bokförd post):
  // Om beloppet på kronan matchar en registrerad fast utgift (>= 150 kr), koppla den till rätt fast utgift!
  if (!isStr && !isGrocery && tx.type !== 'income') {
    if (txAmt >= 150) {
      const hasGenericTitle =
        isGenericPlaceholderMerchant(tx.title) &&
        isGenericPlaceholderMerchant(tx.counterpartyName) &&
        isGenericPlaceholderMerchant(tx.rawDescription);

      if (hasGenericTitle) {
        const exactAmountMatch = fixedExpenses.find(
          (exp) => Math.round(Math.abs(Number(exp.amount) || 0)) === txAmt
        );
        if (exactAmountMatch) {
          return exactAmountMatch;
        }
      }
    }
  }

  return null;
}

export function findMatchingIncome(
  tx: Partial<TransactionItem> | string | null | undefined,
  incomes?: IncomeItem[]
): IncomeItem | null {
  if (!tx || !incomes || incomes.length === 0) return null;

  const isStr = typeof tx === 'string';
  if (!isStr && tx.linkedIncomeId) {
    const explicitInc = incomes.find((i) => i.id === tx.linkedIncomeId);
    if (explicitInc) return explicitInc;
  }

  const txTitleNorm = normalizeMerchantKey(isStr ? tx : tx.title || '');
  const combinedNorm = normalizeMerchantKey(
    isStr
      ? tx
      : [tx.title, tx.rawDescription, tx.counterpartyName, tx.note].filter(Boolean).join(' ')
  );

  if (combinedNorm) {
    for (const inc of incomes) {
      const incNameNorm = normalizeMerchantKey(inc.name);
      const incOrigNorm = inc.originalName ? normalizeMerchantKey(inc.originalName) : '';
      const aliasNorms = (inc.linkedAliases || [])
        .map((a) => normalizeMerchantKey(a))
        .filter((a) => a.length >= 2);
      if (!incNameNorm) continue;

      if (
        txTitleNorm === incNameNorm ||
        (incOrigNorm && txTitleNorm === incOrigNorm) ||
        aliasNorms.some((a) => txTitleNorm === a || combinedNorm.includes(a))
      ) {
        return inc;
      }

      const candidateNames = [
        inc.name,
        inc.originalName,
        ...(inc.linkedAliases || []),
      ].filter(Boolean) as string[];
      for (const candName of candidateNames) {
        const variants = extractMerchantKeyVariants(candName);
        for (const v of variants) {
          if (v.length >= 3 && (combinedNorm.includes(v) || (txTitleNorm.length >= 3 && v.includes(txTitleNorm)))) {
            return inc;
          }
        }

        const brandTokens = extractSpecificBrandTokens(candName);
        for (const token of brandTokens) {
          if (token.length >= 4 && combinedNorm.includes(token)) {
            return inc;
          }
        }
      }
    }
  }

  if (!isStr && tx.type === 'income') {
    const txAmt = Math.round(Math.abs(Number(tx.amount) || 0));
    if (txAmt >= 500) {
      const hasGenericTitle =
        isGenericPlaceholderMerchant(tx.title) &&
        isGenericPlaceholderMerchant(tx.counterpartyName) &&
        isGenericPlaceholderMerchant(tx.rawDescription);

      if (hasGenericTitle) {
        const exactAmountMatch = incomes.find(
          (inc) => Math.round(Math.abs(Number(inc.amount) || 0)) === txAmt
        );
        if (exactAmountMatch) {
          return exactAmountMatch;
        }
      }
    }
  }

  return null;
}
