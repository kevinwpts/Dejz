// Bankkopplingen (Enable Banking). Koden ligger uppdelad i mappen bank/ – den här filen samlar allt på ett ställe.
import { bankConnectionApi } from './bank/connectionApi';
import { bankAccountsApi } from './bank/accountsApi';
import { bankTransactionsApi } from './bank/transactionsApi';

export type {
  BankEnvironment,
  BankReconciliationStatus,
  BankAspsp,
  BankConnection,
  BankAccount,
  BankTransactionItem,
} from './bank/types';
export { SWEDISH_BANKS_CATALOG } from './bank/catalog';
export {
  getAccountOverlayMap,
  saveAccountOverlay,
  mergeAccountWithOverlay,
  getTxReconciliationOverlayMap,
  saveTxReconciliationOverlay,
  mergeTxWithReconciliationOverlay,
} from './bank/overlays';
export { compactBankTxRawJson } from './bank/rawJson';
export { deduplicateBankSyncRows } from './bank/dedupe';

export const bankService = {
  ...bankConnectionApi,
  ...bankAccountsApi,
  ...bankTransactionsApi,
};
