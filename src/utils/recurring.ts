// Samlingsfil (barrel) för återkommande fasta utgifter/inkomster. Koden ligger i ./recurring/.
export { foldForMatching } from './recurring/text';
export {
  isFixedExpenseAmountMatch,
  findAllMatchingFixedExpensesByMerchant,
  findMatchingFixedExpense,
  findMatchingIncome,
} from './recurring/matching';
export { checkIsRecurringTransaction } from './recurring/checkRecurring';
export type { RecurringMatchResult } from './recurring/checkRecurring';
export { getGenericBillProviders } from './recurring/billProviders';
export { reconcilePeriodRecurringMatches } from './recurring/periodReconcile';
export {
  findSimilarTransactionsForTransaction,
  findTransactionsForFixedExpense,
  findTransactionsForIncome,
} from './recurring/similarTransactions';
export type { SimilarTransactionsSummary } from './recurring/similarTransactions';
