// Smart sammanslagning för befintliga användare (Inställningar → Bankkoppling) och namnbaserade gissningar.
// Samlar delarna i den här mappen så att importer från './existingBudget' fungerar som förut.
export { isSameFixedExpenseName } from './matching';
export { analyzeBankForExistingBudget } from './syncPlan';
export { getAutoImportableBankTransactions } from './autoImport';
export type { AutoImportParams } from './autoImport';
export {
  inferCategoryAndMethodFromName,
  matchesKeywordSmart,
  normalizePaymentMethodName,
} from './manualCategory';
export type { ManualCategoryGuess } from './manualCategory';
