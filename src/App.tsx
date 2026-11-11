import React, { useEffect } from 'react';
import { getHouseholdState, subscribeToHouseholdRealtime } from './utils/householdSync';
import { useBudgetTotals } from './app/hooks/useBudgetTotals';
import { useAccountData } from './app/hooks/useAccountData';
import { useAppActions } from './app/hooks/useAppActions';
import { useProfileSettings } from './app/hooks/useProfileSettings';
import { usePeriodData } from './app/hooks/usePeriodData';
import { useAppState } from './app/hooks/useAppState';
import { AppTabContent } from './app/components/AppTabContent';
import { AppHeader } from './app/components/AppHeader';
import { AppSheetsAndModals } from './app/components/AppSheetsAndModals';
import { AppOverlays } from './app/components/AppOverlays';
import { AppModals } from './app/components/AppModals';
import { AppTopBar } from './app/components/AppTopBar';
import { OnboardingScreen } from './app/components/OnboardingScreen';
import { LandingScreen } from './app/components/LandingScreen';

export const App: React.FC = () => {
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

  // Realtidssynk för Delad budget (Hushåll)
  const { setAccountMetaVersion } = periodData;
  useEffect(() => {
    const hh = getHouseholdState();
    if (!hh || !hh.householdId || !hh.inviteCode) return;
    return subscribeToHouseholdRealtime(hh.householdId, hh.inviteCode, () => {
      setAccountMetaVersion((v) => v + 1);
    });
  }, [state.activeTab, state.settingsSubView, setAccountMetaVersion]);

  // Allt som skärmarna behöver
  const app = { ...state, ...account, ...profile, ...periodData, ...budget, ...actions };

  if (app.showLanding || (!app.userId && !app.isInitialLoading && !app.isOnboardingActive)) {
    return <LandingScreen {...app} />;
  }

  const shouldShowOnboarding =
    app.isOnboardingActive ||
    (() => {
      try {
        return (
          localStorage.getItem('dejz_onboarding_in_progress') === 'true' &&
          localStorage.getItem('dejz_onboarding_v2_done') !== 'true'
        );
      } catch {
        return false;
      }
    })();

  if (shouldShowOnboarding) {
    return <OnboardingScreen {...app} />;
  }

  return (
    <div
      style={{ backgroundImage: 'var(--bg-gradient)' }}
      className={`min-h-screen bg-[var(--bg-color)] bg-no-repeat text-[var(--text-primary)] flex flex-col font-sans transition-colors selection:bg-[var(--text-primary)] selection:text-[var(--bg-color)] ${
        app.splitSimulatorActive ? 'min-[820px]:pr-[410px]' : ''
      }`}
    >
      {/* Simulatorväxlare för små skärmar */}
      <AppHeader {...app} />

      <div
        className={`app-spatial-shell flex-1 flex flex-col min-h-screen ${
          app.splitSimulatorActive && app.mobileSimPane === 'partner' ? 'max-[819px]:hidden' : ''
        }`}
      >
        {/* Sidhuvud, statusrad, sök och notiser */}
        <AppTopBar {...app} />
        {/* Flikarna: Hem, Historik, Analys, Fasta, Inställningar m.m. */}
        <AppTabContent {...app} />
        {/* Blad och bottenmeny: saldo, lägg till köp, flikar */}
        <AppSheetsAndModals {...app} />
      </div>

      {/* Fönster: bank, inkomst, fast utgift, köp, inloggning */}
      <AppModals {...app} />
      {/* Notiser, kvittovisare och simulator */}
      <AppOverlays {...app} />
    </div>
  );
};

export default App;
