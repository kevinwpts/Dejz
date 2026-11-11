import React, { useEffect } from 'react';
import { preloadScreens } from './app/lazyScreens';
import { AppContext } from './app/AppContext';
import { useAppModel } from './app/useAppModel';
import { AppTabContent } from './app/components/AppTabContent';
import { AppSheetsAndModals } from './app/components/AppSheetsAndModals';
import { AppOverlays } from './app/components/AppOverlays';
import { AppModals } from './app/components/AppModals';
import { AppTopBar } from './app/components/AppTopBar';
import { OnboardingScreen } from './app/components/OnboardingScreen';
import { LandingScreen } from './app/components/LandingScreen';

export const App: React.FC = () => {
  const app = useAppModel();
  // Ladda ned övriga skärmar i bakgrunden när telefonen är ledig (snabb start, snabba byten)
  useEffect(() => preloadScreens(), []);

  if (app.showLanding || (!app.userId && !app.isInitialLoading && !app.isOnboardingActive)) {
    return (
      <AppContext.Provider value={app}>
        <LandingScreen />
      </AppContext.Provider>
    );
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
    return (
      <AppContext.Provider value={app}>
        <OnboardingScreen />
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={app}>
    <div
      style={{ backgroundImage: 'var(--bg-gradient)' }}
      className={`min-h-screen bg-[var(--bg-color)] bg-no-repeat text-[var(--text-primary)] flex flex-col font-sans transition-colors selection:bg-[var(--text-primary)] selection:text-[var(--bg-color)]`}
    >
      <div
        className="app-spatial-shell flex-1 flex flex-col min-h-screen"
      >
        {/* Sidhuvud, statusrad, sök och notiser */}
        <AppTopBar />
        {/* Flikarna: Hem, Historik, Analys, Fasta, Inställningar m.m. */}
        <AppTabContent />
        {/* Blad och bottenmeny: saldo, lägg till köp, flikar */}
        <AppSheetsAndModals />
      </div>

      {/* Fönster: bank, inkomst, fast utgift, köp, inloggning */}
      <AppModals />
      {/* Notiser och kvittovisare */}
      <AppOverlays />
    </div>
    </AppContext.Provider>
  );
};

export default App;
