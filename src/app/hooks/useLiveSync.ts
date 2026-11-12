import { useEffect, useMemo, type RefObject } from 'react';
import { supabase } from '../../supabaseClient';
import type { BankConnection, BankAccount } from '../../services/bank/types';
import { isDemoMode } from '../../utils/demoUtils';
import { getExcludeInternalTransfers } from '../../utils/cache/categories';
import { pullUserPreferences } from '../../utils/cache/preferencesSync';

const AUTO_SYNC_INTERVAL_MS = 15 * 60 * 1000; // Bakgrundskontroll var 15:e minut när användaren är aktiv i appen

export interface LiveSyncContext {
  userId: string | null;
  userIdRef: RefObject<string | null>;
  connections: BankConnection[];
  syncInFlightRef: RefObject<boolean>;
  setExcludeInternalTransfersState: (value: boolean) => void;
  refreshBankStatus: () => Promise<{ connections: BankConnection[]; accounts: BankAccount[] }>;
  loadSupabaseUserData: (uid: string) => Promise<{ connections: BankConnection[]; accounts: BankAccount[] }>;
  performSilentBankSync: (force?: boolean) => Promise<void> | void;
}

/**
 * Håller appen färsk medan den är öppen: bankkontroll var 15:e minut, inställningar från andra
 * enheter när appen öppnas igen, och direkta uppdateringar från databasen (Realtime).
 */
export function useLiveSync({
  userId,
  userIdRef,
  connections,
  syncInFlightRef,
  setExcludeInternalTransfersState,
  refreshBankStatus,
  loadSupabaseUserData,
  performSilentBankSync,
}: LiveSyncContext) {
  // Kontinuerlig automatisk synk i appen
  const hasActiveBankConnection = useMemo(
    () => connections.some((c) => c.status === 'active'),
    [connections]
  );

  useEffect(() => {
    if (!userId || !hasActiveBankConnection) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [userId, hasActiveBankConnection, performSilentBankSync]);

  // Flera enheter: när appen öppnas igen hämtas inställningar som ändrats på en annan enhet
  // (sparmål, egna namn, kategorier …). Högst var 30:e sekund. Finns det något nytt laddas
  // listorna om så att allt visas direkt.
  useEffect(() => {
    if (!userId || isDemoMode()) return;
    let lastPull = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastPull < 30_000) return;
      lastPull = Date.now();
      void pullUserPreferences(userId).then((applied) => {
        if (applied.length > 0 && userIdRef.current === userId) {
          setExcludeInternalTransfersState(getExcludeInternalTransfers());
          void loadSupabaseUserData(userId);
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [userId, loadSupabaseUserData, setExcludeInternalTransfersState, userIdRef]);

  // Supabase Realtime: Lyssna på databasändringar med debounce för att undvika synk-stormar
  useEffect(() => {
    if (!userId) return;

    let debounceTimer: number | null = null;
    const scheduleDebouncedRefresh = () => {
      // Om performSilentBankSync redan körs anropar den själv refreshBankStatus när den är klar
      if (syncInFlightRef.current) return;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        if (!syncInFlightRef.current) {
          refreshBankStatus();
        }
      }, 800);
    };

    const channel = supabase
      .channel(`dejz-live-bank-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_connections',
          filter: `user_id=eq.${userId}`,
        },
        scheduleDebouncedRefresh
      )
      .subscribe();

    return () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBankStatus, syncInFlightRef]);

  return { hasActiveBankConnection };
}
