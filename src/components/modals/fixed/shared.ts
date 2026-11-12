import { EXTENDED_FIXED_EXPENSE_RULES } from '../../../utils/bankAnalysis/merchantRules';
import { matchesKeywordSmart } from '../../../utils/bankAnalysis/existingBudget/manualCategory';
import { detectMerchantChain } from '../../../utils/recurring/merchantChains';

/**
 * Företaget bakom en fast utgift, utan abonnemangsnivå: "Netflix Standard HD" → "Netflix".
 * Används i uppsägningsguiden ("Logga in hos Netflix"). Okänt namn → namnet som det är.
 */
export function getProviderName(name: string): string {
  const clean = (name || '').trim();
  if (!clean) return clean;
  const chain = detectMerchantChain({ title: clean });
  if (chain) return chain.label;
  const lower = clean.toLowerCase();
  const rule = EXTENDED_FIXED_EXPENSE_RULES.find((r) => r.keywords.some((kw) => matchesKeywordSmart(lower, kw)));
  const brand = rule?.fallbackName.replace(/\s*\(.*\)\s*$/, '').trim();
  return brand || clean;
}

/** Vilken vy som visas i fönstret för fasta utgifter */
export type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'day-picker'
  | 'payment-picker'
  | 'goal-picker'
  | 'receipt-preview'
  | 'similar'
  | 'cancel-picker'
  | 'cancel-guide';

export interface CancelGuideData {
  serviceName: string;
  noticePeriod: string;
  steps: string[];
  cancelUrl: string;
  cancelUrlLabel: string;
  tip?: string;
}
