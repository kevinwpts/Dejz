import type { AppTab } from '../../components/BottomNav';
import type { BankAccount, BankConnection } from '../../services/bankService';
import type { FeedbackToastState } from './AppToasts';
import type { FixedExpenseItem, IncomeItem } from '../models';
import type { WeekendHandlingMode } from '../../utils/periodEngine';
import type { SetStateAction } from 'react';
import React from 'react';
import { OnboardingFlow } from '../../components/OnboardingFlow';
import { isBankEnabledForEmail } from '../../utils/bankFeatureFlag';
import { BankModal } from '../../components/modals/BankModal';
import { SetNewPasswordSheet } from '../../components/SetNewPasswordSheet';
import { syncAllUserPreferencesToSupabase } from '../../utils/appCache';

export interface OnboardingScreenProps {
  userEmail: string;
  userName: string;
  targetPayday: number;
  weekendHandling: "before" | "after" | "none";
  handleUpdateWeekendHandling: (mode: WeekendHandlingMode) => void;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  callbackStatusMsg: string;
  setConnections: (value: SetStateAction<BankConnection[]>) => void;
  setBankAccounts: (value: SetStateAction<BankAccount[]>) => void;
  refreshBankStatus: () => Promise<{ connections: BankConnection[]; accounts: BankAccount[]; }>;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  handleUpdateName: (name: string) => void;
  handleUpdatePayday: (day: number) => void;
  setPreselectedBankName: (value: SetStateAction<string>) => void;
  setIsBankModalOpen: (value: SetStateAction<boolean>) => void;
  handleAddIncome: (data: Omit<IncomeItem, "id">) => Promise<IncomeItem>;
  handleUpdateIncome: (updated: IncomeItem) => Promise<void>;
  handleDeleteIncome: (id: string) => Promise<void>;
  handleAddFixed: (data: Omit<FixedExpenseItem, "id">) => Promise<FixedExpenseItem>;
  handleUpdateFixed: (updated: FixedExpenseItem) => Promise<void>;
  handleDeleteFixed: (id: string) => Promise<void>;
  setIsOnboardingActive: (value: SetStateAction<boolean>) => void;
  setShowLanding: (value: SetStateAction<boolean>) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  isBankModalOpen: boolean;
  preselectedBankName: string;
  setIsAuthModalOpen: (value: SetStateAction<boolean>) => void;
  isPasswordRecovery: boolean;
  userId: string;
  endPasswordRecovery: () => void;
  showFeedbackToast: (toast: FeedbackToastState, durationMs?: number) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  userEmail,
  userName,
  targetPayday,
  weekendHandling,
  handleUpdateWeekendHandling,
  connections,
  bankAccounts,
  callbackStatusMsg,
  setConnections,
  setBankAccounts,
  refreshBankStatus,
  incomes,
  fixedExpenses,
  handleUpdateName,
  handleUpdatePayday,
  setPreselectedBankName,
  setIsBankModalOpen,
  handleAddIncome,
  handleUpdateIncome,
  handleDeleteIncome,
  handleAddFixed,
  handleUpdateFixed,
  handleDeleteFixed,
  setIsOnboardingActive,
  setShowLanding,
  setActiveTab,
  isBankModalOpen,
  preselectedBankName,
  setIsAuthModalOpen,
  isPasswordRecovery,
  userId,
  endPasswordRecovery,
  showFeedbackToast,
}) => (
    <>
      <OnboardingFlow
        bankEnabled={isBankEnabledForEmail(userEmail)}
        initialName={userName || ''}
        targetPayday={targetPayday}
        initialWeekendHandling={weekendHandling}
        onUpdateWeekendHandling={handleUpdateWeekendHandling}
        connections={connections}
        bankAccounts={bankAccounts}
        bankCallbackStatusMsg={callbackStatusMsg}
        onBankStateUpdated={(conns, accs) => {
          setConnections(conns);
          setBankAccounts(accs);
          refreshBankStatus();
        }}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        onSaveName={handleUpdateName}
        onUpdatePayday={handleUpdatePayday}
        onOpenBankModal={(bankName?: string) => {
          setPreselectedBankName(bankName || null);
          setIsBankModalOpen(true);
        }}
        onAddIncome={handleAddIncome}
        onUpdateIncome={handleUpdateIncome}
        onDeleteIncome={handleDeleteIncome}
        onAddFixed={handleAddFixed}
        onUpdateFixed={handleUpdateFixed}
        onDeleteFixed={handleDeleteFixed}
        onBackToLanding={() => {
          try {
            localStorage.removeItem('dejz_onboarding_in_progress');
            localStorage.removeItem('dejz_onboarding_step');
          } catch {
            // ignore
          }
          setIsOnboardingActive(false);
          setShowLanding(true);
        }}
        onComplete={() => {
          try {
            localStorage.setItem('dejz_onboarding_v2_done', 'true');
            localStorage.setItem('dejz_onboarding_completed', 'true');
            localStorage.removeItem('dejz_onboarding_in_progress');
            localStorage.removeItem('dejz_onboarding_step');
          } catch {
            // ignore
          }
          syncAllUserPreferencesToSupabase(true);
          setIsOnboardingActive(false);
          setShowLanding(false);
          setActiveTab('home');
        }}
      />
      <BankModal
        isOpen={isBankModalOpen}
        userEmail={userEmail}
        connections={connections}
        bankAccounts={bankAccounts}
        preselectedBankName={preselectedBankName}
        onClose={() => {
          setIsBankModalOpen(false);
          setPreselectedBankName(null);
        }}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onBankStateUpdated={(conns, accs) => {
          setConnections(conns);
          setBankAccounts(accs);
          refreshBankStatus();
        }}
      />
      <SetNewPasswordSheet
        open={isPasswordRecovery && Boolean(userId)}
        onDone={() => {
          endPasswordRecovery();
          showFeedbackToast({ id: 'password-updated', title: 'Lösenordet är bytt' });
        }}
        onSkip={endPasswordRecovery}
      />
    </>
);
