import { FRIENDS_CHAT_ENABLED } from '../../utils/friendsChatSync';
import { useApp } from '../AppContext';
import React from 'react';
import { HomeTab, TransactionItem, getTransactionTime } from '../../components/HomeTab';
import { FixedTab } from '../../components/FixedTab';
import { AnalysisTab } from '../../components/AnalysisTab';
import { TransactionsTab } from '../../components/TransactionsTab';
import { SettingsTab } from '../../components/SettingsTab';
import { SavingsGoalsView } from '../../components/SavingsGoalsView';
import { FriendsChatView } from '../../components/FriendsChatView';
import { ItemLogo } from '../../components/ItemLogo';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Heart, Package, Paperclip, FileText, Eye } from '@phosphor-icons/react';
import { PullToRefresh } from '../../components/ui/PullToRefresh';
import { EmptyClusterArtwork } from '../../components/ui/VisualArtwork';
import { formatSwedishDateHeading, getItemReceipts } from '../../utils/swedishDate';
import { saveAccountMeta, getSavingsGoals } from '../../utils/appCache';
import { checkIsRecurringTransaction } from '../../utils/recurring';

export const AppTabContent: React.FC = () => {
  const {
    activeTab,
    selectedChatFriendKey,
    performSilentBankSync,
    refreshBankStatus,
    hasActiveBankConnection,
    period,
    connectedBank,
    accounts,
    incomes,
    fixedExpenses,
    displayTransactions,
    totalBalance,
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    kvarAttSpendera,
    dagsbudget,
    isInitialLoading,
    setIsBankModalOpen,
    setSelectedTransaction,
    setIsTxModalOpen,
    setSelectedFixedExpense,
    setIsFixedModalOpen,
    setSelectedIncome,
    setIsIncomeModalOpen,
    setActiveTab,
    setSelectedGoalIdInView,
    setSettingsSubView,
    activeManualBalance,
    setIsBalanceSheetOpen,
    userEmail,
    userName,
    setSelectedHistoryAccountId,
    setAccountMetaVersion,
    handleToggleHeart,
    handleTogglePackage,
    handleExcludeTransaction,
    handleUpdateTransaction,
    periodRecurringMatches,
    handleDeleteIncome,
    handleDeleteFixed,
    handleUpdateFixed,
    targetPayday,
    weekendHandling,
    excludeInternalTransfers,
    bankAccounts,
    selectedHistoryAccountId,
    handleDeleteTransaction,
    handleAddFixed,
    showFeedbackToast,
    selectedGoalIdInView,
    autoOpenGoalWizard,
    setAutoOpenGoalWizard,
    userAvatar,
    setSelectedChatFriendKey,
    setPreviewReceipt,
    connections,
    syncingBank,
    handleToggleExcludeInternalTransfers,
    handleUpdatePayday,
    handleUpdateWeekendHandling,
    handleUpdateAvatar,
    handleDisconnectBank,
    handleSyncBank,
    setIsAuthModalOpen,
    handleSignOut,
    handleDeleteAccount,
    handleResetAccount,
    handleAddIncome,
    handleUpdateIncome,
    handleUpdateEmail,
    handleUpdateName,
    setIsOnboardingActive,
    handleCategoryMutated,
    settingsSubView,
    splitSimulatorActive,
    handleToggleSplitSimulator,
    setFixedExpenses,
  } = useApp();
  return (
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        <PullToRefresh
          disabled={activeTab === 'friends' && Boolean(selectedChatFriendKey)}
          onRefresh={async () => {
            await performSilentBankSync(true);
            await refreshBankStatus();
          }}
        >
          <>
            {activeTab === 'home' && (
                <HomeTab
                  hasBankConnection={hasActiveBankConnection}
                  period={period}
                  connectedBank={connectedBank}
                  accounts={accounts}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  transactions={displayTransactions}
                  totalBalance={totalBalance}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  totalVariableSpent={totalVariableSpent}
                  kvarAttSpendera={kvarAttSpendera}
                  dagsbudget={dagsbudget}
                  isInitialLoading={isInitialLoading}
                  onOpenBank={() => setIsBankModalOpen(true)}
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
                  onNavigateToFixed={() => setActiveTab('fixed')}
                  onNavigateToTransactions={() => setActiveTab('transactions')}
                  onNavigateToGoals={() => {
                    setSelectedGoalIdInView(null);
                    setActiveTab('goals');
                  }}
                  onNavigateToHousehold={() => {
                    setSettingsSubView('household');
                    setActiveTab('settings');
                  }}
                  manualBalance={activeManualBalance}
                  onOpenBalance={hasActiveBankConnection ? undefined : () => setIsBalanceSheetOpen(true)}
                  userEmail={userEmail}
                  userName={userName}
                  onSelectAccount={(accountId) => {
                    setSelectedHistoryAccountId(accountId);
                    setActiveTab('transactions');
                  }}
                  onUpdateAccountMeta={(accountId, patch) => {
                    saveAccountMeta(accountId, patch);
                    setAccountMetaVersion((v) => v + 1);
                  }}
                  onToggleHeart={handleToggleHeart}
                  onTogglePackage={handleTogglePackage}
                  onExcludeTransaction={handleExcludeTransaction}
                  onUpdateTransaction={handleUpdateTransaction}
                />
              )}

              {activeTab === 'fixed' && (
                <FixedTab
                  periodMatches={periodRecurringMatches}
                  period={period}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  transactions={displayTransactions}
                  accounts={accounts}
                  userEmail={userEmail}
                  userName={userName}
                  onSelectIncome={(inc) => {
                    setSelectedIncome(inc);
                    setIsIncomeModalOpen(true);
                  }}
                  onSelectFixed={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onAddIncome={() => {
                    setSelectedIncome(null);
                    setIsIncomeModalOpen(true);
                  }}
                  onAddFixed={() => {
                    setSelectedFixedExpense(null);
                    setIsFixedModalOpen(true);
                  }}
                  onOpenDiscover={() => {
                    setSettingsSubView('discover');
                    setActiveTab('settings');
                  }}
                  onOpenHousehold={() => {
                    setSettingsSubView('household');
                    setActiveTab('settings');
                  }}
                  onOpenGoals={() => setActiveTab('goals')}
                  onDeleteIncome={handleDeleteIncome}
                  onDeleteFixed={handleDeleteFixed}
                  onUpdateFixed={handleUpdateFixed}
                />
              )}

              {activeTab === 'analysis' && (
                <AnalysisTab
                  period={period}
                  incomes={incomes}
                  fixedExpenses={fixedExpenses}
                  transactions={displayTransactions}
                  totalIncome={totalIncome}
                  totalFixedExpenses={totalFixedExpenses}
                  totalVariableSpent={totalVariableSpent}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  excludeInternalTransfers={excludeInternalTransfers}
                  bankAccounts={bankAccounts}
                  userEmail={userEmail}
                  userName={userName}
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
              )}

              {activeTab === 'transactions' && (
                <TransactionsTab
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  totalVariableSpent={totalVariableSpent}
                  period={period}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  accounts={accounts}
                  selectedAccountId={selectedHistoryAccountId}
                  onSelectAccount={setSelectedHistoryAccountId}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddTransaction={() => {
                    setSelectedTransaction(null);
                    setIsTxModalOpen(true);
                  }}
                  onDeleteTransaction={handleDeleteTransaction}
                  onToggleHeart={handleToggleHeart}
                  onTogglePackage={handleTogglePackage}
                  onExcludeTransaction={handleExcludeTransaction}
                />
              )}

              {activeTab === 'goals' && (
                <SavingsGoalsView
                  onCreateMonthlySaving={({ goalId, goalName, amount }) => {
                    void handleAddFixed({
                      name: `Sparande: ${goalName}`,
                      amount,
                      dueDay: targetPayday || 25,
                      category: 'Sparande',
                      paymentMethod: 'Överföring',
                      linkedGoalId: goalId,
                    });
                    showFeedbackToast({ id: `monthly-saving-${goalId}`, title: 'Månadssparande tillagt' });
                  }}
                  userName={userName}
                  transactions={displayTransactions}
                  accounts={accounts}
                  totalBalance={totalBalance}
                  selectedGoalId={selectedGoalIdInView}
                  onSelectGoalId={setSelectedGoalIdInView}
                  autoOpenCreate={autoOpenGoalWizard}
                  onAutoOpenConsumed={() => setAutoOpenGoalWizard(false)}
                />
              )}

              {activeTab === 'friends' && (
                <FriendsChatView
                  period={period}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  initialSelectedFriendKey={selectedChatFriendKey}
                  onSelectFriendKey={setSelectedChatFriendKey}
                  onOpenHousehold={() => {
                    setSettingsSubView('household');
                    setActiveTab('settings');
                  }}
                  onOpenGoals={() => setActiveTab('goals')}
                />
              )}

              {activeTab === 'saved' && (
                <div className="ui-page">
                  {(() => {
                    const heartedList = displayTransactions.filter((t) => t.isHearted);
                    if (heartedList.length === 0) {
                      return (
                        <section className="ui-empty-state-page animate-fade-in">
                          <EmptyClusterArtwork variant="saved" />
                          <p className="ui-empty-title">
                            Inga sparade köp än
                          </p>
                          <p className="ui-empty-sub">
                            Markera en transaktion med ett hjärta för att enkelt hitta den här.
                          </p>
                        </section>
                      );
                    }

                    const map = new Map<string, TransactionItem[]>();
                    for (const tx of heartedList) {
                      const key = tx.date || 'Okänt';
                      const arr = map.get(key) || [];
                      arr.push(tx);
                      map.set(key, arr);
                    }
                    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

                    return sortedKeys.map((dateKey) => {
                      const dayItems = map.get(dateKey)!;
                      const net = dayItems.reduce((acc, item) => {
                        const amt = Number(item.amount) || 0;
                        return item.type === 'income' ? acc + amt : acc - amt;
                      }, 0);
                      const netStr =
                        new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';

                      return (
                        <section key={`saved-${dateKey}`} className="ui-section">
                          <div className="ui-date-header">
                            <span className="ui-date-header-title">
                              {formatSwedishDateHeading(dateKey)}
                            </span>
                            <span
                              className={`ui-date-header-sum ${
                                net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              {net > 0 ? `+${netStr}` : `−${netStr}`}
                            </span>
                          </div>

                          <div className="ui-list-card">
                            {dayItems.map((tx) => {
                              const isIncome = tx.type === 'income';
                              const formattedAmt =
                                new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                              return (
                                <button
                                  key={tx.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsTxModalOpen(true);
                                  }}
                                  className="ui-tx-row"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <ItemLogo
                                      name={tx.title}
                                      category={tx.category}
                                      logoUrl={tx.logo}
                                      size="md"
                                      isRecurring={false}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className="ui-row-title">
                                        {tx.title}
                                      </span>
                                      <span className="ui-row-subtitle flex items-center gap-1.5">
                                        <CategoryIcon
                                          category={tx.category}
                                          size={11}
                                          className="shrink-0 text-[var(--text-secondary)]"
                                        />
                                        <span className="truncate">{tx.category}</span>
                                        {tx.isHearted && (
                                          <Heart
                                            size={11}
                                            weight="fill"
                                            className="text-rose-500 shrink-0"
                                          />
                                        )}
                                        {tx.isWaitingForPackage && (
                                          <Package
                                            size={11}
                                            weight="fill"
                                            className="text-amber-500 shrink-0"
                                          />
                                        )}
                                        {tx.receiptUrl && (
                                          <Paperclip
                                            size={11}
                                            weight="bold"
                                            className="text-[var(--text-secondary)] shrink-0"
                                          />
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span
                                      className={`ui-row-amount ${
                                        isIncome ? 'ui-row-amount-income' : ''
                                      }`}
                                    >
                                      {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                                    </span>
                                    <span className="ui-row-meta">
                                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                        ? 'Reserverat'
                                        : getTransactionTime(tx)}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === 'packages' && (
                <div className="ui-page">
                  {(() => {
                    const packageList = displayTransactions.filter((t) => t.isWaitingForPackage);
                    if (packageList.length === 0) {
                      return (
                        <section className="ui-empty-state-page animate-fade-in">
                          <EmptyClusterArtwork variant="packages" />
                          <p className="ui-empty-title">
                            Inga paket på väg
                          </p>
                          <p className="ui-empty-sub">
                            Markera ett onlineköp som &quot;Väntar på paket&quot; för att hålla koll tills det har levererats.
                          </p>
                        </section>
                      );
                    }

                    const map = new Map<string, TransactionItem[]>();
                    for (const tx of packageList) {
                      const key = tx.date || 'Okänt';
                      const arr = map.get(key) || [];
                      arr.push(tx);
                      map.set(key, arr);
                    }
                    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));

                    return sortedKeys.map((dateKey) => {
                      const dayItems = map.get(dateKey)!;
                      const net = dayItems.reduce((acc, item) => {
                        const amt = Number(item.amount) || 0;
                        return item.type === 'income' ? acc + amt : acc - amt;
                      }, 0);
                      const netStr =
                        new Intl.NumberFormat('sv-SE').format(Math.round(Math.abs(net))) + ' kr';

                      return (
                        <section key={`pkg-${dateKey}`} className="ui-section">
                          <div className="ui-date-header">
                            <span className="ui-date-header-title">
                              {formatSwedishDateHeading(dateKey)}
                            </span>
                            <span
                              className={`ui-date-header-sum ${
                                net > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''
                              }`}
                            >
                              {net > 0 ? `+${netStr}` : `−${netStr}`}
                            </span>
                          </div>

                          <div className="ui-list-card">
                            {dayItems.map((tx) => {
                              const isIncome = tx.type === 'income';
                              const formattedAmt =
                                new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                              return (
                                <div
                                  key={tx.id}
                                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTransaction(tx);
                                      setIsTxModalOpen(true);
                                    }}
                                    className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 active:scale-[0.99] transition-all cursor-pointer"
                                  >
                                    <ItemLogo
                                      name={tx.title}
                                      category={tx.category}
                                      logoUrl={tx.logo}
                                      size="md"
                                      isRecurring={false}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <span className="ui-row-title">
                                        {tx.title}
                                      </span>
                                      <span className="ui-row-subtitle flex items-center gap-1.5">
                                        <CategoryIcon
                                          category={tx.category}
                                          size={11}
                                          className="shrink-0 text-[var(--text-secondary)]"
                                        />
                                        <span className="truncate">{tx.category}</span>
                                        {tx.isHearted && (
                                          <Heart
                                            size={11}
                                            weight="fill"
                                            className="text-rose-500 shrink-0"
                                          />
                                        )}
                                        {tx.isWaitingForPackage && (
                                          <Package
                                            size={11}
                                            weight="fill"
                                            className="text-amber-500 shrink-0"
                                          />
                                        )}
                                        {tx.receiptUrl && (
                                          <Paperclip
                                            size={11}
                                            weight="bold"
                                            className="text-[var(--text-secondary)] shrink-0"
                                          />
                                        )}
                                      </span>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <div className="text-right">
                                      <span
                                        className={`ui-row-amount ${
                                          isIncome ? 'ui-row-amount-income' : ''
                                        }`}
                                      >
                                        {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                                      </span>
                                      <span className="ui-row-meta">
                                        {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                          ? 'Reserverat'
                                          : getTransactionTime(tx)}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleTogglePackage(tx.id, false)}
                                      title="Markera som mottaget"
                                      className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    >
                                      <Package size={14} weight="fill" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </section>
                      );
                    });
                  })()}
                </div>
              )}

              {activeTab === 'receipts' && (
                <div className="ui-page">
                  {displayTransactions.some((t) => getItemReceipts(t).length > 0) ||
                  fixedExpenses.some((f) => getItemReceipts(f).length > 0) ? (
                    <section className="ui-list-card">
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {fixedExpenses
                          .filter((f) => getItemReceipts(f).length > 0)
                          .map((exp) => {
                            const expReceipts = getItemReceipts(exp);
                            const formattedAmt =
                              new Intl.NumberFormat('sv-SE').format(Math.round(exp.amount)) +
                              ' kr';
                            return (
                              <div
                                key={`receipt-fix-${exp.id}`}
                                className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFixedExpense(exp);
                                    setIsFixedModalOpen(true);
                                  }}
                                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <ItemLogo
                                    name={exp.name}
                                    category={exp.category}
                                    logoUrl={exp.logo}
                                    size="md"
                                    isRecurring={true}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {exp.name}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <CategoryIcon
                                        category={exp.category || 'Räkningar'}
                                        size={11}
                                        className="shrink-0 text-[var(--text-secondary)]"
                                      />
                                      <span className="truncate">{exp.category}</span>
                                      <Paperclip
                                        size={11}
                                        weight="bold"
                                        className="text-[var(--text-secondary)] shrink-0"
                                      />
                                      {expReceipts.length > 1 && (
                                        <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                                          {expReceipts.length} st
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="text-right">
                                    <span className="ui-row-amount">
                                      −{formattedAmt}
                                    </span>
                                    <span className="ui-row-meta truncate max-w-[110px]">
                                      {expReceipts.length > 1
                                        ? `${expReceipts.length} kvitton`
                                        : expReceipts[0]?.name || 'Kvitto'}
                                    </span>
                                  </div>
                                  {expReceipts[0] && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewReceipt({
                                          url: expReceipts[0].url,
                                          name: expReceipts[0].name || exp.name || 'Kvitto',
                                        });
                                      }}
                                      className="ui-icon-btn"
                                      title="Öppna kvitto"
                                    >
                                      {expReceipts[0].url.startsWith('data:image/') ? (
                                        <Eye size={14} />
                                      ) : (
                                        <FileText size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {displayTransactions
                          .filter((t) => getItemReceipts(t).length > 0)
                          .map((tx) => {
                            const txReceipts = getItemReceipts(tx);
                            const isIncome = tx.type === 'income';
                            const recurring = checkIsRecurringTransaction(
                              tx,
                              fixedExpenses,
                              incomes
                            );
                            const formattedAmt =
                              new Intl.NumberFormat('sv-SE').format(Math.round(tx.amount)) + ' kr';
                            return (
                              <div
                                key={`receipt-tx-${tx.id}`}
                                className="py-3 sm:py-3.5 flex items-center justify-between gap-3.5 text-[13px] sm:text-sm"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedTransaction(tx);
                                    setIsTxModalOpen(true);
                                  }}
                                  className="flex items-center gap-3.5 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                                >
                                  <ItemLogo
                                    name={tx.title}
                                    category={tx.category}
                                    logoUrl={tx.logo}
                                    size="md"
                                    isRecurring={recurring.isRecurring}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="ui-row-title">
                                      {tx.title}
                                    </span>
                                    <span className="ui-row-subtitle flex items-center gap-1.5">
                                      <CategoryIcon
                                        category={tx.category}
                                        size={11}
                                        className="shrink-0 text-[var(--text-secondary)]"
                                      />
                                      <span className="truncate">{tx.category}</span>
                                      {tx.isHearted && (
                                        <Heart
                                          size={11}
                                          weight="fill"
                                          className="text-rose-500 shrink-0"
                                        />
                                      )}
                                      {tx.isWaitingForPackage && (
                                        <Package
                                          size={11}
                                          weight="fill"
                                          className="text-amber-500 shrink-0"
                                        />
                                      )}
                                      <Paperclip
                                        size={11}
                                        weight="bold"
                                        className="text-[var(--text-secondary)] shrink-0"
                                      />
                                      <span className="truncate">
                                        ·{' '}
                                        {txReceipts.length > 1
                                          ? `${txReceipts.length} kvitton`
                                          : txReceipts[0]?.name || 'Kvitto'}
                                      </span>
                                    </span>
                                  </div>
                                </button>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <div className="text-right">
                                    <span
                                      className={`ui-row-amount ${
                                        isIncome ? 'ui-row-amount-income' : ''
                                      }`}
                                    >
                                      {isIncome ? `+${formattedAmt}` : `−${formattedAmt}`}
                                    </span>
                                    <span className="ui-row-meta">
                                      {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                                        ? 'Reserverat'
                                        : getTransactionTime(tx)}
                                    </span>
                                  </div>
                                  {txReceipts[0] && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewReceipt({
                                          url: txReceipts[0].url,
                                          name: txReceipts[0].name || tx.title || 'Kvitto',
                                        });
                                      }}
                                      className="ui-icon-btn"
                                      title="Öppna kvitto"
                                    >
                                      {txReceipts[0].url.startsWith('data:image/') ? (
                                        <Eye size={14} />
                                      ) : (
                                        <FileText size={14} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </section>
                  ) : (
                    <section className="ui-empty-state-page animate-fade-in">
                      <EmptyClusterArtwork variant="receipts" />
                      <p className="ui-empty-title">
                        Inga bifogade kvitton än
                      </p>
                      <p className="ui-empty-sub">
                        Fota eller ladda upp kvitton på dina köp och fasta utgifter så samlas alla här.
                      </p>
                    </section>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <SettingsTab
                  period={period}
                  connectedBank={connectedBank}
                  connections={connections}
                  bankAccounts={bankAccounts}
                  accounts={accounts}
                  onRefreshBankStatus={refreshBankStatus}
                  syncingBank={syncingBank}
                  targetPayday={targetPayday}
                  weekendHandling={weekendHandling}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  excludeInternalTransfers={excludeInternalTransfers}
                  transactions={displayTransactions}
                  fixedExpenses={fixedExpenses}
                  incomes={incomes}
                  onToggleExcludeInternalTransfers={handleToggleExcludeInternalTransfers}
                  onUpdatePayday={handleUpdatePayday}
                  onUpdateWeekendHandling={handleUpdateWeekendHandling}
                  onUpdateAvatar={handleUpdateAvatar}
                  onOpenBank={() => setIsBankModalOpen(true)}
                  onDisconnectBank={handleDisconnectBank}
                  onSyncBank={handleSyncBank}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onSignOut={handleSignOut}
                  onDeleteAccount={handleDeleteAccount}
                  onResetAccount={handleResetAccount}
                  onSelectTransaction={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onAddIncome={handleAddIncome}
                  onAddFixed={handleAddFixed}
                  onUpdateIncome={handleUpdateIncome}
                  onUpdateFixed={handleUpdateFixed}
                  onUpdateEmail={handleUpdateEmail}
                  onUpdateName={handleUpdateName}
                  onStartOnboarding={() => setIsOnboardingActive(true)}
                  onCategoryMutated={handleCategoryMutated}
                  subView={settingsSubView}
                  onSubViewChange={(next) => {
                    setSelectedGoalIdInView(null);
                    setSettingsSubView(next);
                  }}
                  selectedGoalId={selectedGoalIdInView}
                  onSelectGoalId={setSelectedGoalIdInView}
                  onOpenFriendsChat={
                    FRIENDS_CHAT_ENABLED
                      ? (friendKey) => {
                      setSelectedChatFriendKey(friendKey || null);
                      setActiveTab('friends');
                    }
                      : undefined
                  }
                  splitSimulatorActive={splitSimulatorActive}
                  onToggleSplitSimulator={handleToggleSplitSimulator}
                  onStartCreateGoalWizard={() => {
                    setSelectedGoalIdInView(null);
                    setAutoOpenGoalWizard(true);
                    setActiveTab('goals');
                  }}
                  onOpenAddFixedModal={() => {
                    setSelectedFixedExpense(null);
                    setIsFixedModalOpen(true);
                  }}
                  onOpenPreviewFixedModal={(exp) => {
                    setSelectedFixedExpense(exp);
                    setIsFixedModalOpen(true);
                  }}
                  onOpenAddIncomeModal={() => {
                    setSelectedIncome(null);
                    setIsIncomeModalOpen(true);
                  }}
                  onOpenAddTransactionModal={() => {
                    setSelectedTransaction(null);
                    setIsTxModalOpen(true);
                  }}
                  onOpenPreviewTransactionModal={(tx) => {
                    setSelectedTransaction(tx);
                    setIsTxModalOpen(true);
                  }}
                  onApplyFixedExpenses={(items) => {
                    setFixedExpenses(items);
                  }}
                  onOpenSection={(section) => {
                    setSelectedGoalIdInView(null);
                    setActiveTab(section);
                  }}
                  sectionCounts={{
                    goals: getSavingsGoals().length,
                    packages: displayTransactions.filter((t) => t.isWaitingForPackage).length,
                    receipts:
                      displayTransactions.reduce((sum, t) => sum + getItemReceipts(t).length, 0) +
                      fixedExpenses.reduce((sum, f) => sum + getItemReceipts(f).length, 0),
                  }}
                />
              )}
          </>
        </PullToRefresh>
      </main>
  );
};
