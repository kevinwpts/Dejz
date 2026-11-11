import { useAccountData } from './hooks/useAccountData';
import { useAppActions } from './hooks/useAppActions';
import { useAppState } from './hooks/useAppState';
import { useBudgetTotals } from './hooks/useBudgetTotals';
import { usePeriodData } from './hooks/usePeriodData';
import { useProfileSettings } from './hooks/useProfileSettings';

/**
 * Hela appens data och åtgärder samlade i ett objekt. Skärmarna läser det via useApp() (AppContext.tsx).
 * Ordningen spelar roll: varje del bygger på de föregående.
 */
export function useAppModel() {
  // Appens tillstånd: inloggad användare, listor, inställningar och öppna fönster
  const state = useAppState();
  // Inloggning, data från Supabase och bankkoppling
  const account = useAccountData(state);
  // Lönedag, helghantering, namn, e-post och profilbild
  const profile = useProfileSettings(state);
  // Löneperioden: konton, period, periodens transaktioner och kopplingar
  const periodData = usePeriodData({ ...state, ...account });
  // Hemkortets siffror: inkomst, fasta, rörligt, kvar och dagsbudget
  const budget = useBudgetTotals({ ...state, ...account, ...periodData });
  // Alla åtgärder: lägga till/ändra/ta bort köp, fasta utgifter, inkomster, logga ut …
  const actions = useAppActions({ ...state, ...account, ...periodData });

  // Allt som skärmarna behöver
  const app = { ...state, ...account, ...profile, ...periodData, ...budget, ...actions };
  return app;
}

export type AppModel = ReturnType<typeof useAppModel>;
