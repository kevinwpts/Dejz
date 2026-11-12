// Bankkopplingen (Enable Banking). Koden ligger uppdelad i mappen bank/ – den här filen slår ihop anropen till ett objekt.
import { bankConnectionApi } from './bank/connectionApi';
import { bankAccountsApi } from './bank/accountsApi';
import { bankTransactionsApi } from './bank/transactionsApi';

export const bankService = {
  ...bankConnectionApi,
  ...bankAccountsApi,
  ...bankTransactionsApi,
};
