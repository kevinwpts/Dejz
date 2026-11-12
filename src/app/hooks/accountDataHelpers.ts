// Små rena hjälpfunktioner för kontodatan: behåll användarens markeringar på banktransaktioner,
// översätt sparade transaktioner från Supabase och avgör om introduktionen ska visas.
import type { TransactionItem, FixedExpenseItem, IncomeItem } from '../../components/HomeTab';
import { dataService } from '../../services/dataService';
import { getLogoUrl } from '../../utils/logo';
import {
  formatIsoDateStockholm,
  formatIsoTimeStockholm,
  getSwedishDateStr,
} from '../../utils/swedishDate';
import { sanitizeTransactionItem } from '../../app/transactionMapping';

type DbTransactions = Awaited<ReturnType<typeof dataService.getTransactions>>;
type DbProfile = Awaited<ReturnType<typeof dataService.getProfile>>;
type MerchantAliases = Record<string, { name: string; category: string }>;

/** Behåll hjärta, paket, kvitto och anteckning från den tidigare versionen av samma transaktion. */
export function keepPrevUserFlags(
  tx: TransactionItem,
  prevMap: Map<string, TransactionItem>
): TransactionItem {
  const prev = prevMap.get(tx.id);
  if (!prev) return tx;
  return {
    ...tx,
    isHearted: prev.isHearted ?? tx.isHearted,
    isWaitingForPackage: prev.isWaitingForPackage ?? tx.isWaitingForPackage,
    receiptUrl: prev.receiptUrl ?? tx.receiptUrl,
    receiptName: prev.receiptName ?? tx.receiptName,
    receipts: prev.receipts ?? tx.receipts,
    note: prev.note ?? tx.note,
  };
}

/** Översätt transaktioner sparade i Supabase till appens transaktionsformat. */
export function mapDbTransactions(
  dbTxs: DbTransactions,
  fixedList: FixedExpenseItem[],
  incomeList: IncomeItem[],
  aliases: MerchantAliases
): TransactionItem[] {
  if (!Array.isArray(dbTxs)) return [];
  return dbTxs.map((t) => {
    const isIncome = t.type === 'income';
    const title = t.merchant || t.note || t.category || (isIncome ? 'Inkomst' : 'Utgift');
    const cat = t.category || (isIncome ? 'Inkomst' : 'Övrigt');
    const todayStr = getSwedishDateStr();
    let dateStr = formatIsoDateStockholm(t.timestamp);
    if (dateStr > todayStr) {
      dateStr = todayStr;
    }
    const explicitTime = t.timestamp ? formatIsoTimeStockholm(t.timestamp) : null;
    return sanitizeTransactionItem(
      {
        id: t.id,
        title,
        amount: Math.abs(Number(t.amount) || 0),
        type: isIncome ? ('income' as const) : ('expense' as const),
        category: cat,
        date: dateStr,
        time:
          explicitTime && explicitTime !== '00:00' && explicitTime !== '12:00' ? explicitTime : '',
        // timestamp är millisekunder (number) men createdAt ska vara en ISO-sträng –
        // annars kraschar sorteringen (localeCompare) i models.ts
        createdAt: t.timestamp ? new Date(t.timestamp).toISOString() : undefined,
        note: t.note,
        logo: t.logo || getLogoUrl(title, cat),
      },
      fixedList,
      incomeList,
      aliases
    );
  });
}

/**
 * Avgör om användaren har slutfört introduktionen eller ska fortsätta där hen slutade.
 * Uppdaterar flaggorna i localStorage och returnerar om introduktionen ska vara aktiv.
 */
export function resolveOnboardingActive(
  dbProfile: DbProfile,
  hasAnyExistingUserData: boolean
): boolean {
  const profilePrefs =
    dbProfile?.user_preferences && typeof dbProfile.user_preferences === 'object'
      ? dbProfile.user_preferences
      : {};
  const explicitlyCompleted =
    profilePrefs.onboardingCompleted === true ||
    localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
    localStorage.getItem('dejz_onboarding_completed') === 'true';
  const explicitlyIncomplete =
    !explicitlyCompleted &&
    (profilePrefs.onboardingCompleted === false ||
      profilePrefs.onboardingInProgress === true ||
      localStorage.getItem('dejz_onboarding_in_progress') === 'true');

  if (!explicitlyCompleted && (explicitlyIncomplete || !hasAnyExistingUserData)) {
    try {
      localStorage.setItem('dejz_onboarding_in_progress', 'true');
      if (!localStorage.getItem('dejz_onboarding_step')) {
        localStorage.setItem('dejz_onboarding_step', String(profilePrefs.onboardingStep || '1'));
      }
    } catch {
      // ignore
    }
    return true;
  }
  try {
    localStorage.setItem('dejz_onboarding_v2_done', 'true');
    localStorage.setItem('dejz_onboarding_completed', 'true');
    localStorage.removeItem('dejz_onboarding_in_progress');
  } catch {
    // ignore
  }
  return false;
}
