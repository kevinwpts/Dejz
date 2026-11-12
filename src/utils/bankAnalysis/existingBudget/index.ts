// Smart sammanslagning för befintliga användare (Inställningar → Bankkoppling) och namnbaserade gissningar.
// Samlar delarna i den här mappen så att importer från './existingBudget' fungerar som förut.
export { isSameFixedExpenseName } from './matching';
export {
  inferCategoryAndMethodFromName,
  matchesKeywordSmart,
  normalizePaymentMethodName,
} from './manualCategory';
export type { ManualCategoryGuess } from './manualCategory';
