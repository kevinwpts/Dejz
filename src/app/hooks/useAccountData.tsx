import { useEffect } from 'react';
import { useLiveSync } from './useLiveSync';
import { sanitizeTransactionItem } from '../transactions/sanitizeTransaction';
import type { AccountDataContext } from './accountDataTypes';
import { useBankStatusRefresh } from './useBankStatusRefresh';
import { useUserDataHydration } from './useUserDataHydration';
import { useBankSync } from './useBankSync';
import { useAuthSession } from './useAuthSession';

/**
 * Inloggning, laddning av användarens data från Supabase och bankkopplingen
 * (status, synk, återkomst från banken, realtid). Flyttad från App.tsx.
 * Själva delarna ligger i egna hookar; den här sätter ihop dem.
 */
export function useAccountData(ctx: AccountDataContext) {
  const { connections, setExcludeInternalTransfersState, setTransactions, syncInFlightRef, userId, userIdRef } = ctx;

  const refreshBankStatus = useBankStatusRefresh(ctx);
  const loadSupabaseUserData = useUserDataHydration(ctx);
  const { performSilentBankSync, processPendingBankCallback } = useBankSync({
    ...ctx,
    refreshBankStatus,
  });

  // Swish-nummer som du själv döpt: visa det nya namnet direkt
  useEffect(() => {
    const handleDirectoryUpdate = () => {
      setTransactions((prev) => prev.map((tx) => sanitizeTransactionItem(tx)));
    };
    window.addEventListener('dejz:swish-directory-updated', handleDirectoryUpdate);
    return () => window.removeEventListener('dejz:swish-directory-updated', handleDirectoryUpdate);
  }, [setTransactions]);

  useAuthSession({
    ...ctx,
    loadSupabaseUserData,
    performSilentBankSync,
    processPendingBankCallback,
  });

  const { hasActiveBankConnection } = useLiveSync({
    userId,
    userIdRef,
    connections,
    syncInFlightRef,
    setExcludeInternalTransfersState,
    refreshBankStatus,
    loadSupabaseUserData,
    performSilentBankSync,
  });

  return { refreshBankStatus, loadSupabaseUserData, performSilentBankSync, hasActiveBankConnection };
}
