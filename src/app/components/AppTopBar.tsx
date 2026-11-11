import { SearchModal, NotificationsModal } from '../lazyScreens';
import { useApp } from '../AppContext';
import React from 'react';
import { Navbar } from '../../components/Navbar';
import { SETTINGS_SUBVIEW_TITLES } from '../../components/settings/subviews';
import { getStoredFriends } from '../../utils/friendsChatSync';

export const AppTopBar: React.FC = () => {
  const {
    userEmail,
    userName,
    userAvatar,
    activeTab,
    settingsSubView,
    selectedHistoryAccountId,
    selectedGoalIdInView,
    selectedChatFriendKey,
    friendsUnreadCount,
    setSelectedChatFriendKey,
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
  return (
      <>
        <Navbar
          userEmail={userEmail}
          userName={userName}
          userAvatar={userAvatar}
          navigationKey={`${activeTab}:${settingsSubView}:${selectedHistoryAccountId || ''}:${selectedGoalIdInView || ''}:${selectedChatFriendKey || ''}`}
          hasUnreadNotifications={false}
          friendsUnreadCount={friendsUnreadCount}
          hideActions={activeTab === 'settings'}
          hideSearch
          pageTitle={
            activeTab === 'settings'
              ? settingsSubView === 'main'
                ? 'Inställningar'
                : SETTINGS_SUBVIEW_TITLES[settingsSubView]
              : activeTab === 'goals'
              ? 'Sparmål'
              : activeTab === 'saved'
              ? 'Sparade köp'
              : activeTab === 'packages'
              ? 'Väntar på paket'
              : activeTab === 'receipts'
              ? 'Kvitton'
              : activeTab === 'friends'
              ? selectedChatFriendKey
                ? getStoredFriends().find((f) => f.key === selectedChatFriendKey)?.name ||
                  'Chatt'
                : 'Vänner & chatt'
              : null
          }
          onBack={() => {
            if (activeTab === 'friends' && selectedChatFriendKey) {
              setSelectedChatFriendKey(null);
              return;
            }
            if (
              selectedGoalIdInView &&
              (activeTab === 'goals' || (activeTab === 'settings' && settingsSubView === 'goals'))
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
              activeTab === 'packages' ||
              activeTab === 'saved'
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
          <div className="max-w-md mx-auto w-full px-4 pt-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
              {callbackStatusMsg}
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
