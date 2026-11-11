import React, { useState, useRef, useEffect } from 'react';
import { SettingsMainList } from './settings/SettingsMainList';
import { PaymentMethodsSettingsView } from './settings/PaymentMethodsSettingsView';
import { isBankEnabledForEmail } from '../utils/bankFeatureFlag';


import { BankConnection, BankAccount } from '../services/bankService';
import { WeekendHandlingMode } from '../utils/periodEngine';
import { CategorySettings } from './CategorySettings';
import { RecurringDiscoveryView } from './RecurringDiscoveryView';
import { TransactionItem, FixedExpenseItem, IncomeItem, AccountItem } from './HomeTab';
import {
  getStoredPaymentMethods,
  compressImageFileToDataUrl,
  getPrivacyBlurMode,
  getSavingsGoals,
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getTransactionMetaMap,
  getAccountMetaMap,
} from '../utils/appCache';
import { PaymentMethodOption } from '../constants';
import { DayOfMonthPicker } from './ui/DayOfMonthPicker';
import {
  CookiesPage,
  OpenBankingInfoPage,
  PrivacySettingsPage,
  TermsPage,
} from './settings/LegalPages';
import { AdminSettingsView } from './settings/AdminSettingsView';
import { AppearanceSettingsView } from './settings/AppearanceSettingsView';
import { LegalMenuView } from './settings/LegalMenuView';
import { FeedbackSettingsView } from './settings/FeedbackSettingsView';
import { SecuritySettingsView } from './settings/SecuritySettingsView';
import { BankSettingsView } from './settings/BankSettingsView';
import { GoalsSettingsView } from './settings/GoalsSettingsView';
import { ProfileSettingsView } from './settings/ProfileSettingsView';
import type { SettingsSubView } from './settings/subviews';

interface SettingsTabProps {
  connectedBank: string | null;
  connections: BankConnection[];
  bankAccounts?: BankAccount[];
  accounts?: AccountItem[];
  onRefreshBankStatus?: () => void;
  syncingBank: boolean;
  targetPayday: number;
  weekendHandling: WeekendHandlingMode;
  userEmail: string | null;
  userName?: string | null;
  userAvatar?: string | null;
  excludeInternalTransfers?: boolean;
  transactions?: TransactionItem[];
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  onToggleExcludeInternalTransfers?: (enabled: boolean) => void;
  onUpdatePayday: (day: number) => void;
  onUpdateWeekendHandling: (mode: WeekendHandlingMode) => void;
  onUpdateAvatar?: (avatarDataUrl: string | null) => void;
  onOpenBank: () => void;
  onDisconnectBank: (connectionId?: string) => void;
  onSyncBank: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onResetAccount: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onAddIncome?: (data: Omit<IncomeItem, 'id'>) => Promise<unknown> | void;
  onAddFixed?: (data: Omit<FixedExpenseItem, 'id'>) => Promise<unknown> | void;
  onUpdateIncome?: (item: IncomeItem) => Promise<unknown> | void;
  onUpdateFixed?: (item: FixedExpenseItem) => Promise<unknown> | void;
  onUpdateEmail?: (email: string) => void;
  onUpdateName?: (name: string) => void;
  onStartOnboarding?: () => void;
  onCategoryMutated?: (
    oldName: string,
    newName: string,
    kind: 'expense' | 'income'
  ) => void;
  subView?: SettingsSubView;
  onSubViewChange?: (view: SettingsSubView) => void;
  selectedGoalId?: string | null;
  onSelectGoalId?: (goalId: string | null) => void;
  onStartCreateGoalWizard?: () => void;
  onOpenAddFixedModal?: () => void;
  onOpenPreviewFixedModal?: (exp?: FixedExpenseItem) => void;
  onOpenAddIncomeModal?: () => void;
  onOpenAddTransactionModal?: () => void;
  onOpenPreviewTransactionModal?: (tx?: TransactionItem) => void;
  /** Öppnar Sparmål, Kvitton eller Paket (låg tidigare under "Mer" i menyn) */
  onOpenSection?: (section: 'goals' | 'receipts' | 'packages') => void;
  sectionCounts?: { goals?: number; receipts?: number; packages?: number };
}

export type { SettingsSubView } from './settings/subviews';
export { SETTINGS_SUBVIEW_TITLES } from './settings/subviews';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  connectedBank,
  connections,
  bankAccounts = [],
  accounts = [],
  onRefreshBankStatus,
  syncingBank,
  targetPayday,
  weekendHandling,
  userEmail,
  userName,
  userAvatar,
  excludeInternalTransfers = true,
  transactions = [],
  fixedExpenses = [],
  incomes = [],
  onToggleExcludeInternalTransfers,
  onUpdatePayday,
  onUpdateWeekendHandling,
  onUpdateAvatar,
  onOpenBank,
  onDisconnectBank,
  onSyncBank,
  onOpenAuth,
  onSignOut,
  onDeleteAccount,
  onResetAccount,
  onAddIncome,
  onAddFixed,
  onUpdateIncome,
  onUpdateFixed,
  onUpdateEmail,
  onUpdateName,
  onStartOnboarding,
  onCategoryMutated,
  subView: controlledSubView,
  onSubViewChange,
  selectedGoalId,
  onSelectGoalId,
  onStartCreateGoalWizard,
  onOpenAddFixedModal,
  onOpenPreviewFixedModal,
  onOpenAddIncomeModal,
  onOpenAddTransactionModal,
  onOpenPreviewTransactionModal,
  onOpenSection,
  sectionCounts = {},
}) => {
  const [internalSubView, setInternalSubView] = useState<SettingsSubView>('main');
  const subView = controlledSubView ?? internalSubView;
  const setSubView = (next: SettingsSubView) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
    setInternalSubView(next);
    if (onSubViewChange) onSubViewChange(next);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [subView]);
  const [editName, setEditName] = useState(userName || '');
  const [editEmail, setEditEmail] = useState(userEmail || '');
  const [editPhone, setEditPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('dejz_user_phone') || '';
    } catch {
      return '';
    }
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Password change & reset state in Profile
  const [isPasswordSheetOpen, setIsPasswordSheetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [resetEmailStatus, setResetEmailStatus] = useState<string | null>(null);
  const [privacyBlurProfile, setPrivacyBlurProfile] = useState<boolean>(() =>
    getPrivacyBlurMode()
  );

  // Payment methods sheet state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(() =>
    getStoredPaymentMethods()
  );

  // Bank account edit sheet & disconnect confirm state
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [accountNameInput, setAccountNameInput] = useState('');
  const [accountIncludedInput, setAccountIncludedInput] = useState(true);
  const [savingAccountEdit, setSavingAccountEdit] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [selectingAccountsConn, setSelectingAccountsConn] = useState<BankConnection | null>(null);
  const [selectedConnAccountIds, setSelectedConnAccountIds] = useState<string[]>([]);
  const [savingConnAccounts, setSavingConnAccounts] = useState(false);
  const [reconnectingBankId, setReconnectingBankId] = useState<string | null>(null);
  const [disconnectConfirmConnId, setDisconnectConfirmConnId] = useState<string | null>(null);

  // Security confirmation dialog & loading state
  const [securityConfirmAction, setSecurityConfirmAction] = useState<'reset' | 'delete' | null>(
    null
  );
  const [securityProcessing, setSecurityProcessing] = useState(false);

  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'idea' | 'bug' | 'praise'>('idea');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Theme state ('light' | 'dark' | 'system')
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const savedPref = localStorage.getItem('dejz_theme_pref');
      if (savedPref === 'light' || savedPref === 'dark' || savedPref === 'system') {
        return savedPref;
      }
      return localStorage.getItem('dejz_dark_mode') === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    setEditName(userName || '');
  }, [userName]);

  useEffect(() => {
    setEditEmail(userEmail || '');
  }, [userEmail]);

  const applyTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    const root = document.documentElement;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectiveMode = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (effectiveMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.backgroundColor = '#0C0B11';
      if (metaTheme) metaTheme.setAttribute('content', '#0C0B11');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.backgroundColor = '#F5F4FA';
      if (metaTheme) metaTheme.setAttribute('content', '#F5F4FA');
    }
    try {
      localStorage.setItem('dejz_theme_pref', mode);
      localStorage.setItem('dejz_dark_mode', effectiveMode);
      localStorage.setItem('dejz_onboarding_completed', 'true');
    } catch {
      // ignore
    }
  };

  const hasActiveBank = Boolean(connectedBank || connections.length > 0);
  // Visa bankinställningarna för admin, eller för den som redan har en bank ansluten
  const bankEnabled = isBankEnabledForEmail(userEmail) || hasActiveBank;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAvatar) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 256, 0.8);
      onUpdateAvatar(compressed);
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const handleExportGdprData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      dataController: 'Dejz',
      profile: {
        name: userName || null,
        email: userEmail || null,
        phone: editPhone || null,
        targetPayday,
        weekendHandling,
        excludeInternalTransfers,
      },
      bankConnections: connections,
      bankAccounts,
      accounts,
      incomes,
      fixedExpenses,
      transactions,
      savingsGoals: getSavingsGoals(),
      expenseCategories: getStoredExpenseCategories(),
      incomeCategories: getStoredIncomeCategories(),
      paymentMethods,
      transactionCustomMetadata: getTransactionMetaMap(),
      accountCustomMetadata: getAccountMetaMap(),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dejz-dataexport-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hiddenAvatarInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      onChange={handleFileChange}
      className="hidden"
    />
  );

  // ==========================================
  // SUB-VIEW: PROFILE
  // ==========================================
  if (subView === 'profile') {
    return (
      <ProfileSettingsView
        onUpdateName={onUpdateName}
        editName={editName}
        editEmail={editEmail}
        onUpdateEmail={onUpdateEmail}
        userEmail={userEmail}
        editPhone={editPhone}
        setProfileSaved={setProfileSaved}
        newPassword={newPassword}
        setPasswordStatus={setPasswordStatus}
        confirmPassword={confirmPassword}
        setPasswordSaving={setPasswordSaving}
        setNewPassword={setNewPassword}
        setConfirmPassword={setConfirmPassword}
        setIsPasswordSheetOpen={setIsPasswordSheetOpen}
        setResetEmailStatus={setResetEmailStatus}
        userName={userName}
        hiddenAvatarInput={hiddenAvatarInput}
        fileInputRef={fileInputRef}
        userAvatar={userAvatar}
        onUpdateAvatar={onUpdateAvatar}
        setEditName={setEditName}
        setEditEmail={setEditEmail}
        setEditPhone={setEditPhone}
        profileSaved={profileSaved}
        privacyBlurProfile={privacyBlurProfile}
        setPrivacyBlurProfile={setPrivacyBlurProfile}
        resetEmailStatus={resetEmailStatus}
        isPasswordSheetOpen={isPasswordSheetOpen}
        showNewPassword={showNewPassword}
        setShowNewPassword={setShowNewPassword}
        passwordStatus={passwordStatus}
        passwordSaving={passwordSaving}
        securityConfirmAction={securityConfirmAction}
        securityProcessing={securityProcessing}
        setSecurityProcessing={setSecurityProcessing}
        onDeleteAccount={onDeleteAccount}
        setSecurityConfirmAction={setSecurityConfirmAction}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: HITTA INKOMSTER & FASTA UTGIFTER
  // ==========================================
  if (subView === 'discover') {
    return (
      <div className="animate-slide-in-right">
        <RecurringDiscoveryView
          transactions={transactions}
          incomes={incomes}
          fixedExpenses={fixedExpenses}
          bankAccounts={bankAccounts}
          targetPayday={targetPayday}
          paydayBeforeWeekend={weekendHandling === 'before'}
          onAddIncome={onAddIncome || (() => {})}
          onAddFixed={onAddFixed || (() => {})}
          onUpdateIncome={onUpdateIncome}
          onUpdateFixed={onUpdateFixed}
        />
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: KATEGORIER
  // ==========================================
  if (subView === 'categories') {
    return (
      <div className="ui-page animate-slide-in-right">
        <CategorySettings
          transactions={transactions}
          fixedExpenses={fixedExpenses}
          incomes={incomes}
          onCategoryMutated={onCategoryMutated}
        />
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: SPARMÅL & BUFFERT
  // ==========================================
  if (subView === 'goals') {
    return (
      <GoalsSettingsView
        userName={userName}
        transactions={transactions}
        accounts={accounts}
        selectedGoalId={selectedGoalId}
        onSelectGoalId={onSelectGoalId}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: BETALSÄTT
  // ==========================================
  if (subView === 'paymentMethods') {
    return (
      <PaymentMethodsSettingsView
        paymentMethods={paymentMethods}
        setPaymentMethods={setPaymentMethods}
        transactions={transactions}
        fixedExpenses={fixedExpenses}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: LÖNEDAG
  // ==========================================
  if (subView === 'period') {
    const isWeekendBeforeEnabled = weekendHandling !== 'none';

    return (
      <div className="ui-page animate-slide-in-right">
        <DayOfMonthPicker
          selectedDay={targetPayday}
          onSelectDay={onUpdatePayday}
          mode="payday"
        />

        <div className="ui-card-p">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="ui-row-title text-[14px] sm:text-sm">
                Helghantering
              </span>
              <p className="ui-row-subtitle">
                Fredagen före om lönedagen infaller på helg
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isWeekendBeforeEnabled}
              onClick={() =>
                onUpdateWeekendHandling(isWeekendBeforeEnabled ? 'none' : 'before')
              }
              className={`ui-switch ${
                isWeekendBeforeEnabled ? 'ui-switch-on' : 'ui-switch-off'
              }`}
            >
              <span
                className={`ui-switch-thumb ${
                  isWeekendBeforeEnabled ? 'ui-switch-thumb-on' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: BANKKONTON
  // ==========================================
  if (subView === 'bank') {
    return (
      <BankSettingsView
        bankAccounts={bankAccounts}
        connections={connections}
        connectedBank={connectedBank}
        accounts={accounts}
        setEditingAccount={setEditingAccount}
        setAccountNameInput={setAccountNameInput}
        setAccountIncludedInput={setAccountIncludedInput}
        onRefreshBankStatus={onRefreshBankStatus}
        syncingAccountId={syncingAccountId}
        setSyncingAccountId={setSyncingAccountId}
        onOpenBank={onOpenBank}
        setSelectingAccountsConn={setSelectingAccountsConn}
        setSelectedConnAccountIds={setSelectedConnAccountIds}
        selectingAccountsConn={selectingAccountsConn}
        setSavingConnAccounts={setSavingConnAccounts}
        selectedConnAccountIds={selectedConnAccountIds}
        reconnectingBankId={reconnectingBankId}
        setReconnectingBankId={setReconnectingBankId}
        editingAccount={editingAccount}
        setSavingAccountEdit={setSavingAccountEdit}
        accountNameInput={accountNameInput}
        accountIncludedInput={accountIncludedInput}
        hasActiveBank={hasActiveBank}
        setDisconnectConfirmConnId={setDisconnectConfirmConnId}
        onSyncBank={onSyncBank}
        syncingBank={syncingBank}
        savingAccountEdit={savingAccountEdit}
        savingConnAccounts={savingConnAccounts}
        disconnectConfirmConnId={disconnectConfirmConnId}
        onDisconnectBank={onDisconnectBank}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: DATA & SÄKERHET
  // ==========================================
  if (subView === 'security') {
    return (
      <SecuritySettingsView
        handleExportGdprData={handleExportGdprData}
        securityProcessing={securityProcessing}
        setSecurityConfirmAction={setSecurityConfirmAction}
        securityConfirmAction={securityConfirmAction}
        setSecurityProcessing={setSecurityProcessing}
        onDeleteAccount={onDeleteAccount}
        onResetAccount={onResetAccount}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: SKICKA FEEDBACK
  // ==========================================
  if (subView === 'feedback') {
    return (
      <FeedbackSettingsView
        feedbackMessage={feedbackMessage}
        feedbackSending={feedbackSending}
        setFeedbackSending={setFeedbackSending}
        feedbackType={feedbackType}
        userEmail={userEmail}
        setFeedbackSent={setFeedbackSent}
        setFeedbackMessage={setFeedbackMessage}
        setFeedbackType={setFeedbackType}
        feedbackSent={feedbackSent}
        onStartOnboarding={onStartOnboarding}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: VILLKOR & INTEGRITET (Samlad juridikvy)
  // ==========================================
  if (subView === 'legal') {
    return (
      <LegalMenuView
        setSubView={setSubView}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: INTEGRITETSPOLICY
  // ==========================================
  if (subView === 'privacy') {
    return <PrivacySettingsPage />;
  }

  // ==========================================
  // SUB-VIEW: ANVÄNDARVILLKOR
  // ==========================================
  if (subView === 'terms') {
    return <TermsPage />;
  }

  // ==========================================
  // SUB-VIEW: OPEN BANKING
  // ==========================================
  if (subView === 'psd2') {
    return <OpenBankingInfoPage />;
  }

  // ==========================================
  // SUB-VIEW: COOKIES & LAGRING
  // ==========================================
  if (subView === 'cookies') {
    return <CookiesPage />;
  }

  // ==========================================
  // SUB-VIEW: UTSEENDE
  // ==========================================
  if (subView === 'appearance') {
    return (
      <AppearanceSettingsView
        themeMode={themeMode}
        applyTheme={applyTheme}
      />
    );
  }

  // ==========================================
  // SUB-VIEW: ADMIN & TESTSIMULATOR
  // ==========================================
  if (subView === 'admin') {
    return (
      <AdminSettingsView
        onStartOnboarding={onStartOnboarding}
        onStartCreateGoalWizard={onStartCreateGoalWizard}
        setSubView={setSubView}
        onOpenAddFixedModal={onOpenAddFixedModal}
        onOpenPreviewFixedModal={onOpenPreviewFixedModal}
        onOpenAddIncomeModal={onOpenAddIncomeModal}
        onOpenAddTransactionModal={onOpenAddTransactionModal}
        onOpenPreviewTransactionModal={onOpenPreviewTransactionModal}
      />
    );
  }

  // ==========================================
  // MAIN SETTINGS & PROFILE MENU (Clean grouped layout with generous breathing room)
  // ==========================================
  const initialChar = (userName || userEmail || '').trim().charAt(0);
  const rowTitleClass =
    'font-normal text-[13px] sm:text-[14px] tracking-[-0.005em] leading-[1.35] text-[var(--text-primary)] block truncate';
  const rowSubClass =
    'font-normal text-[12px] leading-[1.35] text-[var(--text-secondary)] mt-0.5 block truncate';
  const sectionLabelClass =
    'px-1 pt-1.5 pb-0.5 text-[14px] sm:text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] block';

  return (
    <div className="space-y-5 pb-40 sm:pb-44 animate-slide-in-left">
      <SettingsMainList
        hiddenAvatarInput={hiddenAvatarInput}
        setSubView={setSubView}
        userAvatar={userAvatar}
        initialChar={initialChar}
        rowTitleClass={rowTitleClass}
        userName={userName}
        rowSubClass={rowSubClass}
        userEmail={userEmail}
        onOpenSection={onOpenSection}
        sectionCounts={sectionCounts}
        sectionLabelClass={sectionLabelClass}
        bankEnabled={bankEnabled}
        hasActiveBank={hasActiveBank}
        targetPayday={targetPayday}
        onToggleExcludeInternalTransfers={onToggleExcludeInternalTransfers}
        excludeInternalTransfers={excludeInternalTransfers}
        themeMode={themeMode}
        onSignOut={onSignOut}
        onOpenAuth={onOpenAuth}
      />
    </div>
  );
};

