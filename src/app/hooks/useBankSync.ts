// Banksynk i bakgrunden och slutförandet av bankkopplingen när användaren kommer tillbaka från banken (?code=...&state=...).
import { useCallback, useEffect } from 'react';
import { bankService } from '../../services/bankService';
import type { AccountDataContext, BankStatusResult } from './accountDataTypes';

const AUTO_SYNC_COOLDOWN_MS = 15 * 60 * 1000; // Minst 15 min mellan automatiska bakgrundssynkningar (PSD2-vänlig kvot, manuell synk körs alltid direkt)

type BankSyncDeps = Pick<
  AccountDataContext,
  | 'lastSyncTimestampRef'
  | 'pendingBankCallbackRef'
  | 'setBankAccounts'
  | 'setCallbackStatusMsg'
  | 'setConnections'
  | 'setIsBankModalOpen'
  | 'setIsOnboardingActive'
  | 'setShowLanding'
  | 'syncInFlightRef'
  | 'userId'
> & {
  refreshBankStatus: () => Promise<BankStatusResult>;
};

export function useBankSync({
  lastSyncTimestampRef,
  pendingBankCallbackRef,
  setBankAccounts,
  setCallbackStatusMsg,
  setConnections,
  setIsBankModalOpen,
  setIsOnboardingActive,
  setShowLanding,
  syncInFlightRef,
  userId,
  refreshBankStatus,
}: BankSyncDeps) {
  // Tyst bakgrundssynk mot Enable Banking via Supabase Edge Function
  const performSilentBankSync = useCallback(
    async (force = false) => {
      if (syncInFlightRef.current) return;
      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < AUTO_SYNC_COOLDOWN_MS) {
        return;
      }

      syncInFlightRef.current = true;
      lastSyncTimestampRef.current = now;

      try {
        await bankService.sync();
        await refreshBankStatus();
      } catch {
        // Tyst felhantering vid automatisk bakgrundssynk
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [refreshBankStatus, lastSyncTimestampRef, syncInFlightRef]
  );

  // Hantera Enable Banking OAuth callback (?code=...&state=...) koordinerat utan race conditions
  const processPendingBankCallback = useCallback(async () => {
    const pending = pendingBankCallbackRef.current;
    if (!pending || pending.done) return;
    if (pending.promise) {
      await pending.promise;
      return;
    }

    const runExchange = async () => {
      try {
        setCallbackStatusMsg('Slutför bankkoppling och hämtar dina konton...');
        window.history.replaceState({}, '', '/');

        const res = await bankService.exchangeCode({
          code: pending.code,
          state: pending.state,
        });

        try {
          localStorage.removeItem('dejz_onboarding_pending_bank_auth');
        } catch {
          // ignore
        }

        const isOnboardingCallback =
          res.originContext === 'onboarding' ||
          localStorage.getItem('dejz_onboarding_in_progress') === 'true';

        if (isOnboardingCallback) {
          try {
            localStorage.setItem('dejz_onboarding_in_progress', 'true');
            localStorage.setItem('dejz_onboarding_step', '2');
            localStorage.removeItem('dejz_onboarding_accounts_confirmed');
          } catch {
            // ignore
          }
          setIsOnboardingActive(true);
          setShowLanding(false);
        }

        // Uppdatera anslutning & konton direkt så att onboardingen reagerar omedelbart
        if (res.connection) {
          setConnections((prev) => {
            const filtered = prev.filter((c) => c.id !== res.connection.id);
            return [res.connection, ...filtered];
          });
        }
        if (Array.isArray(res.accounts) && res.accounts.length > 0) {
          setBankAccounts((prev) => {
            const newIds = new Set(res.accounts.map((a) => a.id));
            const kept = prev.filter((a) => !newIds.has(a.id));
            return [...res.accounts, ...kept];
          });
        }

        // Under onboardingen får användaren FÖRST välja vilka konton som ska synkas i steg 2 ("Välj konton")!
        // Endast om banken kopplades inifrån Inställningar (utanför onboardingen) synkas alla direkt.
        const allIds = (res.accounts || []).map((a) => a.id);
        if (!isOnboardingCallback && res.connection && allIds.length > 0) {
          await bankService
            .selectAccounts({
              connectionId: res.connection.id,
              selectedAccountIds: allIds,
            })
            .catch(() => {});
          setCallbackStatusMsg('Synkar transaktioner från din bank...');
          await bankService
            .sync({ connectionId: res.connection.id, fullSync: true })
            .catch(() => {});
          await refreshBankStatus();
        }

        pending.done = true;
        setCallbackStatusMsg(null);
        if (!isOnboardingCallback) {
          setIsBankModalOpen(true);
        }
      } catch (err: unknown) {
        pending.done = true;
        setCallbackStatusMsg(
          `Kunde inte slutföra bankkoppling: ${(err as { message?: string }).message || 'Okänt fel'}`
        );
        setTimeout(() => setCallbackStatusMsg(null), 6000);
      }
    };

    pending.promise = runExchange();
    await pending.promise;
  }, [
    refreshBankStatus,
    pendingBankCallbackRef,
    setBankAccounts,
    setCallbackStatusMsg,
    setConnections,
    setIsBankModalOpen,
    setIsOnboardingActive,
    setShowLanding,
  ]);

  useEffect(() => {
    if (userId && pendingBankCallbackRef.current && !pendingBankCallbackRef.current.done) {
      processPendingBankCallback();
    }
  }, [userId, processPendingBankCallback, pendingBankCallbackRef]);

  return { performSilentBankSync, processPendingBankCallback };
}
