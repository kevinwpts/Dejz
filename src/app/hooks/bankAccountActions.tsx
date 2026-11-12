import { logError } from '../../utils/logger';
import { supabase } from '../../supabaseClient';
import { bankService } from '../../services/bankService';
import { dataService } from '../../services/dataService';
import {
  saveCachedAppState,
  clearCachedAppState,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
} from '../../utils/appCache';
import { apiUrl } from '../../utils/platform';
import type { UseAppActionsContext } from './useAppActions';

/** Bank, utloggning, radera och nollställ konto. */
export function createBankAccountActions({
  setSyncingBank,
  lastSyncTimestampRef,
  refreshBankStatus,
  connections,
  userId,
  incomesRef,
  setIncomes,
  userIdRef,
  transactionsRef,
  fixedExpensesRef,
  setTransactions,
  setFixedExpenses,
  setActiveTab,
  setDismissedTxIds,
  lastHydratedUserIdRef,
  setUserId,
  setUserEmail,
  setUserName,
  setUserAvatar,
  setConnections,
  setBankAccounts,
  setSettingsSubView,
  setShowLanding,
  setIsOnboardingActive,
  userEmail,
  isDeletingAccountRef,
  pendingRefreshRef,
  aiCleanedKeysRef,
  setTargetPayday,
  setWeekendHandling,
  setCallbackStatusMsg,
}: UseAppActionsContext) {
  // Synka med Enable Banking
  const handleSyncBank = async () => {
    setSyncingBank(true);
    lastSyncTimestampRef.current = Date.now();
    try {
      await bankService.sync();
      await refreshBankStatus();
    } catch {
      // ignore error
    } finally {
      setSyncingBank(false);
    }
  };

  // Koppla från Enable Banking
  const handleDisconnectBank = async (connectionId?: string) => {
    const targetId = connectionId || connections[0]?.id;
    if (!targetId) return;
    try {
      await bankService.disconnect(targetId);
      await refreshBankStatus();
    } catch {
      await refreshBankStatus();
    }
  };

  const handleSignOut = async () => {
    try {
      localStorage.setItem('dejz_logged_out', 'true');
      localStorage.removeItem('dejz_onboarding_in_progress');
      localStorage.removeItem('dejz_onboarding_step');
      localStorage.removeItem('dejz_user_name');
      localStorage.removeItem('dejz_user_email');
    } catch {
      // ignore
    }
    cancelPendingPreferenceSync();
    clearCachedAppState();
    clearAllLocalAppData(false);
    userIdRef.current = null;
    lastHydratedUserIdRef.current = null;
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    setUserAvatar(null);
    setConnections([]);
    setBankAccounts([]);
    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setActiveTab('home');
    setSettingsSubView('main');
    await supabase.auth.signOut().catch(() => {});
    setShowLanding(true);
    setIsOnboardingActive(false);
  };

  const handleDeleteAccount = async () => {
    const uidFromState = userId || userIdRef.current;
    const emailFromState = userEmail;
    const connsToDisconnect = [...connections];

    // 1. Stoppa omedelbart alla pågående bakgrundssynkningar och förhindra återskapande
    isDeletingAccountRef.current = true;
    pendingRefreshRef.current = false;
    cancelPendingPreferenceSync();

    // 2. Töm minnes-refs omedelbart så att inga pågående effekter kan läsa eller återskapa gammal data
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    aiCleanedKeysRef.current.clear();

    const withFastTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T | null> =>
      Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    try {
      // Hämta session och Bearer-token FÖRST innan localStorage rensas eller signOut körs
      const sessionRes = await withFastTimeout(supabase.auth.getSession(), 1500);
      const session = sessionRes?.data?.session || null;
      const token = session?.access_token || null;
      const sessionUid = session?.user?.id || null;
      const stateUid =
        uidFromState && uidFromState !== 'demo-user' && uidFromState !== 'preview-user'
          ? uidFromState
          : null;
      const primaryUid = sessionUid || stateUid;
      const emailToDelete = session?.user?.email || emailFromState || null;

      // 3. Starta frånkoppling av Enable Banking-sessioner i bakgrunden (utan att blockera raderingen)
      if (connsToDisconnect.length > 0 && primaryUid) {
        connsToDisconnect
          .filter((c) => c.status !== 'revoked')
          .forEach((c) => {
            bankService.disconnect(c.id).catch(() => {});
          });
      }

      // 4. Kör server-side permanent radering (med 4s timeout) – kör klient-fallback endast om servern ej nås
      let serverDeleted = false;
      if (primaryUid || emailToDelete) {
        const res = await withFastTimeout(
          fetch(apiUrl('/api/auth/delete-account'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userId: primaryUid,
              secondaryUserId: stateUid,
              email: emailToDelete,
            }),
          }),
          4000
        );
        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.success && !data?.localOnly) {
            serverDeleted = true;
          }
        }
      }

      if (!serverDeleted && primaryUid) {
        await withFastTimeout(
          Promise.allSettled([
            dataService.deleteAllUserData(primaryUid, true),
            bankService.deleteAccount(),
          ]),
          3000
        );
      }
    } catch (err) {
      logError('Error during account deletion', err);
    } finally {
      // 5. Logga ut lokalt direkt (utan att vänta på nätverksanrop mot redan raderad auth.users-post) och rensa all lokal lagring
      await withFastTimeout(supabase.auth.signOut({ scope: 'local' }), 800);
      clearAllLocalAppData(false);

      userIdRef.current = null;
      lastHydratedUserIdRef.current = null;
      incomesRef.current = [];
      fixedExpensesRef.current = [];
      transactionsRef.current = [];
      aiCleanedKeysRef.current.clear();

      setUserId(null);
      setUserEmail(null);
      setUserName(null);
      setUserAvatar(null);
      setConnections([]);
      setBankAccounts([]);
      setIncomes([]);
      setFixedExpenses([]);
      setTransactions([]);
      setDismissedTxIds([]);
      setTargetPayday(25);
      setWeekendHandling('before');
      setSettingsSubView('main');
      setActiveTab('home');
      setIsOnboardingActive(false);
      setShowLanding(true);
      setTimeout(() => {
        isDeletingAccountRef.current = false;
      }, 1000);
    }
  };

  const handleResetAccount = async () => {
    const activeUid = userId || userIdRef.current;
    const connsToDisconnect = [...connections];

    // 1. Stoppa omedelbart alla pågående bakgrundssynkningar och Realtime-uppdateringar
    // så att fasta utgifter aldrig kan återskapas under eller direkt efter nollställningen
    isDeletingAccountRef.current = true;
    pendingRefreshRef.current = false;
    cancelPendingPreferenceSync();

    // 2. Töm minnes-refs och React-state direkt så att inga gamla poster ligger kvar i minnet
    incomesRef.current = [];
    fixedExpensesRef.current = [];
    transactionsRef.current = [];
    aiCleanedKeysRef.current.clear();

    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setDismissedTxIds([]);
    setConnections([]);
    setBankAccounts([]);

    const withFastTimeout = <T,>(promise: Promise<T>, ms = 3000): Promise<T | null> =>
      Promise.race([
        promise.catch(() => null),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
      ]);

    try {
      if (activeUid && activeUid !== 'demo-user' && activeUid !== 'preview-user') {
        // Koppla från bank i bakgrunden så det inte låser nollställningen
        if (connsToDisconnect.length > 0) {
          connsToDisconnect
            .filter((c) => c.status !== 'revoked')
            .forEach((c) => {
              bankService.disconnect(c.id).catch(() => {});
            });
        }

        // Nollställ all egen data i Supabase (raderingen skyddas av databasens regler för egna rader)
        await withFastTimeout(dataService.deleteAllUserData(activeUid), 4000);
      } else if (activeUid) {
        await withFastTimeout(dataService.deleteAllUserData(activeUid), 2000);
      }
    } catch (err) {
      logError('Error during account reset', err);
    } finally {
      clearAllLocalAppData(true); // Behåll tema och inloggningssession

      incomesRef.current = [];
      fixedExpensesRef.current = [];
      transactionsRef.current = [];
      aiCleanedKeysRef.current.clear();

      setIncomes([]);
      setFixedExpenses([]);
      setTransactions([]);
      setDismissedTxIds([]);
      setConnections([]);
      setBankAccounts([]);

      // Skriv över app-cachen med tom data så den inte återuppstår vid refresh
      if (activeUid) {
        saveCachedAppState({
          userId: activeUid,
          incomes: [],
          fixedExpenses: [],
          transactions: [],
          connections: [],
          bankAccounts: [],
        });
      }

      try {
        localStorage.setItem('dejz_onboarding_v2_done', 'true');
        localStorage.removeItem('dejz_onboarding_in_progress');
        localStorage.removeItem('dejz_onboarding_step');
      } catch {
        // ignore
      }

      setSettingsSubView('main');
      setActiveTab('home');
      setCallbackStatusMsg('Kontot har nollställts och du kan börja om på nytt.');
      setTimeout(() => setCallbackStatusMsg(null), 4000);
      setTimeout(() => {
        isDeletingAccountRef.current = false;
      }, 1500);
    }
  };

  return {
    handleSyncBank,
    handleDisconnectBank,
    handleSignOut,
    handleDeleteAccount,
    handleResetAccount,
  };
}
