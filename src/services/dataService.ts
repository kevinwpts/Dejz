/**
 * All läsning och skrivning av appens data i Supabase (och demoläget i localStorage).
 * Använder den strikt typade klienten: en kolumn som inte finns i databasen ger ett fel när koden byggs.
 * Varje sparning är ett enda anrop – inga omförsök där kolumner plockas bort.
 * Själva metoderna ligger uppdelade per område i mappen data/.
 */
import { settingsData } from './data/settings';
import { transactionsData } from './data/transactions';
import { budgetItemsData } from './data/budgetItems';
import { accountsData } from './data/accounts';
import { feedbackData } from './data/feedback';
import { maintenanceData } from './data/maintenance';

export const dataService = {
  ...settingsData,
  ...transactionsData,
  ...budgetItemsData,
  ...accountsData,
  ...feedbackData,
  ...maintenanceData,
};
