import { LandingPage } from '../lazyScreens';
import { useApp } from '../AppContext';
import React from 'react';
import { supabase } from '../../supabaseClient';
import { syncAllUserPreferencesToSupabase, cancelPendingPreferenceSync, clearAllLocalAppData } from '../../utils/cache/preferencesSync';

export const LandingScreen: React.FC = () => {
  const {
    userEmail,
    setShowLanding,
    setIsOnboardingActive,
    incomesRef,
    fixedExpensesRef,
    transactionsRef,
    setIncomes,
    setFixedExpenses,
    setTransactions,
    setConnections,
    setBankAccounts,
    setDismissedTxIds,
    setIsInitialLoading,
    setUserEmail,
    setUserId,
    userIdRef,
    loadSupabaseUserData,
  } = useApp();
  return (
      <LandingPage
        existingEmail={userEmail}
        onContinueExisting={() => {
          try {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
          } catch {
            // ignore
          }
          setShowLanding(false);
          setIsOnboardingActive(false);
        }}
        onAuthenticated={(email, mode) => {
          try {
            localStorage.removeItem('dejz_logged_out');
          } catch {
            // ignore
          }
          if (mode === 'register') {
            cancelPendingPreferenceSync();
            clearAllLocalAppData(true);
            try {
              localStorage.setItem('dejz_onboarding_in_progress', 'true');
              localStorage.setItem('dejz_onboarding_step', '1');
              localStorage.removeItem('dejz_onboarding_v2_done');
              localStorage.removeItem('dejz_onboarding_completed');
            } catch {
              // ignore
            }
            incomesRef.current = [];
            fixedExpensesRef.current = [];
            transactionsRef.current = [];
            setIncomes([]);
            setFixedExpenses([]);
            setTransactions([]);
            setConnections([]);
            setBankAccounts([]);
            setDismissedTxIds([]);
          }
          if (mode === 'register') {
            setIsOnboardingActive(true);
            setShowLanding(false);
            syncAllUserPreferencesToSupabase(true);
          } else {
            setIsInitialLoading(true);
            setShowLanding(false);
          }
          setUserEmail(email);
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              setUserId(session.user.id);
              userIdRef.current = session.user.id;
              loadSupabaseUserData(session.user.id);
            } else if (!userIdRef.current) {
              setUserId('preview-user');
              userIdRef.current = 'preview-user';
            }
          });
        }}
      />
  );
};
