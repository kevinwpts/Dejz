import { SearchModal, NotificationsModal } from '../lazyScreens';
import { useApp } from '../AppContext';
import React from 'react';
import { CheckCircle, SpinnerGap, WarningCircle } from '@phosphor-icons/react';
import { Navbar } from '../../components/Navbar';
import { SETTINGS_SUBVIEW_TITLES } from '../../components/settings/subviews';

export const AppTopBar: React.FC = () => {
  const {
    userEmail,
    userName,
    userAvatar,
    activeTab,
    settingsSubView,
    selectedHistoryAccountId,
    accounts,
    selectedGoalIdInView,
    setSelectedGoalIdInView,
    setSettingsSubView,
    setActiveTab,
    setIsSearchModalOpen,
    setIsNotificationsModalOpen,
    callbackStatusMsg,
    isSearchModalOpen,
    displayTransactions,
    fixedExpenses,
    incomes,
    period,
    setSelectedTransaction,
    setIsTxModalOpen,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setSelectedIncome,
    setIsIncomeModalOpen,
    isNotificationsModalOpen,
    kvarAttSpendera,
    dagsbudget,
  } = useApp();
  // Flikrubrik i övre raden (Hem har hemkortet som rubrik).
  // Historik för ett konto: kontots namn som rubrik.
  const historyAccountName = selectedHistoryAccountId
    ? accounts.find((a) => a.id === selectedHistoryAccountId)?.name
    : undefined;
  const tabTitle =
    activeTab === 'transactions'
      ? historyAccountName || 'Historik'
      : activeTab === 'analysis'
      ? 'Analys'
      : activeTab === 'fixed'
      ? 'Fasta'
      : null;
  return (
      <>
        <Navbar
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
          navigationKey={`${activeTab}:${settingsSubView}:${selectedHistoryAccountId || ''}:${selectedGoalIdInView || ''}`}
          hasUnreadNotifications={false}
          hideActions={activeTab === 'settings'}
          hideSearch
          tabTitle={tabTitle}
          pageTitle={
            activeTab === 'settings'
              ? settingsSubView === 'main'
                ? 'Inställningar'
                : SETTINGS_SUBVIEW_TITLES[settingsSubView]
              : activeTab === 'goals'
              ? 'Sparmål'
              : activeTab === 'packages'
              ? 'Väntar på paket'
              : activeTab === 'receipts'
              ? 'Kvitton'
              : null
          }
          onBack={() => {
            if (
              selectedGoalIdInView &&
              activeTab === 'goals'
            ) {
              setSelectedGoalIdInView(null);
              return;
            }
            if (
              activeTab === 'settings' &&
              (settingsSubView === 'privacy' ||
                settingsSubView === 'terms' ||
                settingsSubView === 'psd2' ||
                settingsSubView === 'cookies')
            ) {
              setSettingsSubView('legal');
              return;
            }
            if (activeTab === 'settings' && settingsSubView !== 'main') {
              setSettingsSubView('main');
            } else if (
              activeTab === 'goals' ||
              activeTab === 'receipts' ||
              activeTab === 'packages'
            ) {
              // Sparmål, kvitton och paket öppnas från profilen – tillbaka dit
              setSettingsSubView('main');
              setActiveTab('settings');
            } else {
              setActiveTab('home');
            }
          }}
          onLogoClick={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSelectedGoalIdInView(null);
            setSettingsSubView('main');
            setActiveTab('home');
          }}
          onProfileClick={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(false);
            setSelectedGoalIdInView(null);
            setSettingsSubView('main');
            setActiveTab('settings');
          }}
          onSearchClick={() => {
            setIsNotificationsModalOpen(false);
            setIsSearchModalOpen(true);
          }}
          onNotificationsClick={() => {
            setIsSearchModalOpen(false);
            setIsNotificationsModalOpen(true);
          }}
        />

        {callbackStatusMsg && (
          // Statusrad för bankkopplingen: snurra medan det pågår, varning vid fel, bock när klart
          <div className="max-w-md mx-auto w-full px-4 pt-3" role="status" aria-live="polite">
            <div className="ui-card px-4 py-3 flex items-center gap-3">
              {/kunde inte|fel/i.test(callbackStatusMsg) ? (
                <WarningCircle size={20} weight="fill" className="text-negative shrink-0" />
              ) : /\.\.\.$|…$/.test(callbackStatusMsg) ? (
                <SpinnerGap size={20} className="text-[var(--on-accent-container)] animate-spin shrink-0" />
              ) : (
                <CheckCircle size={20} weight="fill" className="text-positive shrink-0" />
              )}
              <p className="text-callout font-medium text-[var(--text-primary)] min-w-0">
                {callbackStatusMsg.replace(/\.\.\.$/, ' …')}
              </p>
            </div>
          </div>
        )}

        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          transactions={displayTransactions}
          fixedExpenses={fixedExpenses}
          incomes={incomes}
          period={period}
          onSelectTransaction={(tx) => {
            setSelectedTransaction(tx);
            setIsTxModalOpen(true);
          }}
          onSelectFixed={(exp) => {
            setSelectedFixedExpense(exp);
            setIsFixedModalOpen(true);
          }}
          onSelectIncome={(inc) => {
            setSelectedIncome(inc);
            setIsIncomeModalOpen(true);
          }}
        />

        <NotificationsModal
          isOpen={isNotificationsModalOpen}
          onClose={() => setIsNotificationsModalOpen(false)}
          period={period}
          kvarAttSpendera={kvarAttSpendera}
          dagsbudget={dagsbudget}
          fixedExpenses={fixedExpenses}
          incomes={incomes}
          transactions={displayTransactions}
          onSelectFixed={(exp) => {
            setSelectedFixedExpense(exp);
            setIsFixedModalOpen(true);
          }}
          onSelectTransaction={(tx) => {
            setSelectedTransaction(tx);
            setIsTxModalOpen(true);
          }}
        />
      </>
  );
};
