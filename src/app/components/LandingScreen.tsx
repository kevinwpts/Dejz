import type { BankAccount, BankConnection } from '../../services/bankService';
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../models';
import type { MutableRefObject, SetStateAction } from 'react';
import React from 'react';
import { LandingPage } from '../../components/LandingPage';
import { supabase } from '../../supabaseClient';
import {
  syncAllUserPreferencesToSupabase,
  cancelPendingPreferenceSync,
  clearAllLocalAppData,
} from '../../utils/appCache';

export interface LandingScreenProps {
  userEmail: string;
  setShowLanding: (value: SetStateAction<boolean>) => void;
  setIsOnboardingActive: (value: SetStateAction<boolean>) => void;
  incomesRef: MutableRefObject<IncomeItem[]>;
  fixedExpensesRef: MutableRefObject<FixedExpenseItem[]>;
  transactionsRef: MutableRefObject<TransactionItem[]>;
  setIncomes: (value: SetStateAction<IncomeItem[]>) => void;
  setFixedExpenses: (value: SetStateAction<FixedExpenseItem[]>) => void;
  setTransactions: (value: SetStateAction<TransactionItem[]>) => void;
  setConnections: (value: SetStateAction<BankConnection[]>) => void;
  setBankAccounts: (value: SetStateAction<BankAccount[]>) => void;
  setDismissedTxIds: (value: SetStateAction<string[]>) => void;
  setIsInitialLoading: (value: SetStateAction<boolean>) => void;
  setUserEmail: (value: SetStateAction<string>) => void;
  setUserId: (value: SetStateAction<string>) => void;
  userIdRef: MutableRefObject<string>;
  loadSupabaseUserData: (uid: string) => Promise<{ connections: BankConnection[]; accounts: BankAccount[]; }>;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
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
}) => (
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
