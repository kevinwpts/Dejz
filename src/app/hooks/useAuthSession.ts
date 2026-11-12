// Inloggningen: läser Supabase-sessionen vid start, lyssnar på in-/utloggning och startar en samordnad laddning av användarens data.
import { useEffect } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../../supabaseClient';
import { flushPendingMarketingConsent } from '../../utils/marketingConsent';
import { syncFirstTouchToAccount } from '../../utils/attribution';
import { startActivityTracking } from '../../utils/activity';
import { isDemoMode } from '../../utils/demoUtils';
import { seedDemoData } from '../../utils/demoData';
import type { AccountDataContext, BankStatusResult } from './accountDataTypes';
import { verifyEmailLinkIfPresent } from './authEmailLink';

type AuthSessionDeps = Pick<
  AccountDataContext,
  | 'hydrationInFlightRef'
  | 'isDeletingAccountRef'
  | 'lastSyncTimestampRef'
  | 'pendingBankCallbackRef'
  | 'setBankAccounts'
  | 'setConnections'
  | 'setFixedExpenses'
  | 'setIncomes'
  | 'setIsInitialLoading'
  | 'setIsOnboardingActive'
  | 'setShowLanding'
  | 'setTransactions'
  | 'setUserAvatar'
  | 'setUserEmail'
  | 'setUserId'
  | 'setUserName'
  | 'userIdRef'
> & {
  loadSupabaseUserData: (uid: string) => Promise<BankStatusResult>;
  performSilentBankSync: (force?: boolean) => Promise<void>;
  processPendingBankCallback: () => Promise<void>;
};

/** Initiera Supabase-session och trigga en enda koordinerad, atomär hydrering vid appstart. */
export function useAuthSession({
  hydrationInFlightRef,
  isDeletingAccountRef,
  lastSyncTimestampRef,
  pendingBankCallbackRef,
  setBankAccounts,
  setConnections,
  setFixedExpenses,
  setIncomes,
  setIsInitialLoading,
  setIsOnboardingActive,
  setShowLanding,
  setTransactions,
  setUserAvatar,
  setUserEmail,
  setUserId,
  setUserName,
  userIdRef,
  loadSupabaseUserData,
  performSilentBankSync,
  processPendingBankCallback,
}: AuthSessionDeps): void {
  useEffect(() => {
    const runCoordinateHydration = async (sessionUser: User) => {
      if (isDeletingAccountRef.current) return;
      const uid = sessionUser.id;
      setUserId(uid);
      userIdRef.current = uid;
      setUserEmail(sessionUser.email || null);
      // Svar på nyhetsbrevsfrågan från registreringen sparas nu när kontot finns
      if (!isDemoMode()) {
        void flushPendingMarketingConsent();
        void syncFirstTouchToAccount();
        // "Senast aktiv" / "Aktiv nu" i Supabase (tabellen user_activity)
        startActivityTracking();
      }

      try {
        const isOnboardingPending =
          localStorage.getItem('dejz_onboarding_in_progress') === 'true';
        const isOnboardingDone =
          localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
          localStorage.getItem('dejz_onboarding_completed') === 'true';
        const isBrandNewUser =
          !isOnboardingDone &&
          Boolean(sessionUser?.created_at) &&
          Date.now() - new Date(sessionUser.created_at).getTime() < 90_000;

        if (isOnboardingPending || isBrandNewUser) {
          if (!isOnboardingPending) {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '1');
          }
          setIsOnboardingActive(true);
        }
      } catch {
        // ignore
      }

      setShowLanding(false);
      const metaAvatar =
        sessionUser.user_metadata?.avatar_url ||
        sessionUser.user_metadata?.picture ||
        null;
      if (metaAvatar) setUserAvatar(metaAvatar);

      const metaFullName =
        sessionUser.user_metadata?.full_name ||
        sessionUser.user_metadata?.name ||
        '';
      if (metaFullName && typeof metaFullName === 'string') {
        const firstName = metaFullName.trim().split(/\s+/)[0];
        if (firstName) {
          setUserName((prev) => {
            if (prev) return prev;
            try {
              localStorage.setItem('dejz_user_name', firstName);
            } catch {
              // ignore
            }
            return firstName;
          });
        }
      }

      // Förhindra att getSession och onAuthStateChange kör dubbla parallella hydreringar vid mount
      if (hydrationInFlightRef.current === uid) {
        return;
      }
      hydrationInFlightRef.current = uid;
      try {
        // Om vi precis kom tillbaka från BankID / Enable Banking (?code=...&state=...),
        // slutför bankkopplingen FÖRE loadSupabaseUserData så att tom data aldrig skriver över kopplingen!
        if (pendingBankCallbackRef.current && !pendingBankCallbackRef.current.done) {
          await processPendingBankCallback();
        }
        const status = await loadSupabaseUserData(uid);
        const activeConns = status.connections.filter((c) => c.status === 'active');
        const isWaitingForOnboardingAccountChoice =
          localStorage.getItem('dejz_onboarding_in_progress') === 'true' &&
          localStorage.getItem('dejz_onboarding_accounts_confirmed') !== 'true';

        if (activeConns.length > 0 && !isWaitingForOnboardingAccountChoice) {
          // Kontrollera om banken redan synkades alldeles nyss (inom senaste 3 minuterna)
          // för att undvika dubbel hämtning direkt vid appstart
          const latestSyncMs = activeConns.reduce((maxMs, conn) => {
            const t = conn.last_synced_at ? new Date(conn.last_synced_at).getTime() : 0;
            return Number.isFinite(t) && t > maxMs ? t : maxMs;
          }, 0);
          const syncedRecently = latestSyncMs > 0 && Date.now() - latestSyncMs < 180_000;
          if (syncedRecently) {
            lastSyncTimestampRef.current = latestSyncMs;
          } else {
            performSilentBankSync(false);
          }
        }
      } finally {
        hydrationInFlightRef.current = null;
        setIsInitialLoading(false);
      }
    };

    verifyEmailLinkIfPresent()
      .then(() => supabase.auth.getSession())
      .then(async ({ data: { session } }) => {
        // Endast lokalt (npm run dev): http://localhost:3000/?demo öppnar appen med påhittad
        // demodata – används för skärmbilder till startsidan. Finns inte i produktionsbygget.
        if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
          const demo = seedDemoData();
          // ?demo&onboarding visar introduktionen från början (för att testa och ta skärmbilder)
          const demoOnboarding = new URLSearchParams(window.location.search).has('onboarding');
          if (demoOnboarding) {
            localStorage.removeItem('dejz_onboarding_v2_done');
            localStorage.removeItem('dejz_onboarding_completed');
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '1');
          } else {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
            localStorage.removeItem('dejz_onboarding_in_progress');
            localStorage.removeItem('dejz_onboarding_step');
          }
          localStorage.removeItem('dejz_logged_out');
          setIsOnboardingActive(demoOnboarding);
          await runCoordinateHydration({ ...demo.user, created_at: '2025-01-01T00:00:00.000Z' });
          return;
        }
        if (session?.user && localStorage.getItem('dejz_logged_out') !== 'true') {
          await runCoordinateHydration(session.user);
        } else {
          setIsInitialLoading(false);
        }
      })
      .catch(() => {
        setIsInitialLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      // Gammal återställningslänk (via supabase.co) – be om nytt lösenord även då
      if (event === 'PASSWORD_RECOVERY') {
        try {
          sessionStorage.setItem('dejz_password_recovery', '1');
        } catch {
          // ignore
        }
        window.dispatchEvent(new Event('dejz-password-recovery'));
      }
      // I lokalt demoläge (?demo) ska en riktig inloggning aldrig ta över demodatan
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('demo')) {
        return;
      }
      if (session?.user && localStorage.getItem('dejz_logged_out') !== 'true') {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || session.user.id !== userIdRef.current) {
          void runCoordinateHydration(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        userIdRef.current = null;
        setUserEmail(null);
        setUserName(null);
        setUserAvatar(null);
        setConnections([]);
        setBankAccounts([]);
        setIncomes([]);
        setFixedExpenses([]);
        setTransactions([]);
        setIsInitialLoading(false);
        setShowLanding(true);
        setIsOnboardingActive(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [
    loadSupabaseUserData,
    performSilentBankSync,
    processPendingBankCallback,
    hydrationInFlightRef,
    isDeletingAccountRef,
    lastSyncTimestampRef,
    pendingBankCallbackRef,
    setBankAccounts,
    setConnections,
    setFixedExpenses,
    setIncomes,
    setIsInitialLoading,
    setIsOnboardingActive,
    setShowLanding,
    setTransactions,
    setUserAvatar,
    setUserEmail,
    setUserId,
    setUserName,
    userIdRef,
  ]);
}
