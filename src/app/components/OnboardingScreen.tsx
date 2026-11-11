import { OnboardingFlow, BankModal } from '../lazyScreens';
import { useApp } from '../AppContext';
import React from 'react';
import { isBankEnabledForEmail } from '../../utils/bankFeatureFlag';
import { SetNewPasswordSheet } from '../../components/SetNewPasswordSheet';
import { syncAllUserPreferencesToSupabase } from '../../utils/appCache';

export const OnboardingScreen: React.FC = () => {
  const {
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
  } = useApp();
  return (
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
};
