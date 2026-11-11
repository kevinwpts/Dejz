import React, { useState, useRef, useEffect } from 'react';
import { isDemoMode } from '../utils/demoUtils';
import { EmailVerificationStatus } from './EmailVerification';
import { isBankEnabledForEmail } from '../utils/bankFeatureFlag';
import {
  ArrowCounterClockwise,
  UserCircle,
  SignOut,
  CalendarBlank,
  ShieldCheck,
  CreditCard,
  ArrowsLeftRight,
  Tag,
  CaretRight,
  Sun,
  Moon,
  Wallet,
  Plus,
  Trash,
  Check,
  X,
  ChatCircleText,
  LockKey,
  SlidersHorizontal,
  PiggyBank,
  Paperclip,
  Package,
} from '@phosphor-icons/react';
import { BankConnection, BankAccount } from '../services/bankService';
import { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';
import { CategorySettings } from './CategorySettings';
import { RecurringDiscoveryView } from './RecurringDiscoveryView';
import { HouseholdBudgetView } from './HouseholdBudgetView';
import { TransactionItem, FixedExpenseItem, IncomeItem, AccountItem } from './HomeTab';
import {
  getStoredPaymentMethods,
  saveStoredPaymentMethods,
  compressImageFileToDataUrl,
  getPrivacyBlurMode,
  getSavingsGoals,
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getTransactionMetaMap,
  getAccountMetaMap,
} from '../utils/appCache';
import { DEFAULT_PAYMENT_METHODS, PaymentMethodOption } from '../constants';
import { BottomSheet } from './ui/BottomSheet';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { DayOfMonthPicker } from './ui/DayOfMonthPicker';
import { PaymentMethodIcon, AVAILABLE_PAYMENT_METHOD_ICONS } from './CategoryIcon';
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
  period: PeriodInfo;
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
  onAddIncome?: (data: Omit<IncomeItem, 'id'>) => Promise<any> | void;
  onAddFixed?: (data: Omit<FixedExpenseItem, 'id'>) => Promise<any> | void;
  onUpdateIncome?: (item: IncomeItem) => Promise<any> | void;
  onUpdateFixed?: (item: FixedExpenseItem) => Promise<any> | void;
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
  onOpenPreviewFixedModal?: (exp?: any) => void;
  onOpenAddIncomeModal?: () => void;
  onOpenAddTransactionModal?: () => void;
  onOpenPreviewTransactionModal?: (tx?: any) => void;
  onApplyFixedExpenses?: (next: FixedExpenseItem[]) => void;
  /** Öppnar Sparmål, Kvitton eller Paket (låg tidigare under "Mer" i menyn) */
  onOpenSection?: (section: 'goals' | 'receipts' | 'packages') => void;
  sectionCounts?: { goals?: number; receipts?: number; packages?: number };
}

export type { SettingsSubView } from './settings/subviews';
export { SETTINGS_SUBVIEW_TITLES } from './settings/subviews';

export const SettingsTab: React.FC<SettingsTabProps> = ({
  period,
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
  onApplyFixedExpenses,
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
  const [copiedPersonalCode, setCopiedPersonalCode] = useState(false);

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
  const [pmSheetMode, setPmSheetMode] = useState<'new' | 'edit' | null>(null);
  const [selectedPm, setSelectedPm] = useState<PaymentMethodOption | null>(null);
  const [pmFormName, setPmFormName] = useState('');
  const [pmFormIcon, setPmFormIcon] = useState('credit-card');
  const [pmDeleteConfirm, setPmDeleteConfirm] = useState(false);
  const [pmResetConfirm, setPmResetConfirm] = useState(false);

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
        setCopiedPersonalCode={setCopiedPersonalCode}
        copiedPersonalCode={copiedPersonalCode}
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
  // SUB-VIEW: DELAD BUDGET (HUSHÅLL)
  // ==========================================
  if (subView === 'household') {
    return (
      <HouseholdBudgetView
        period={period}
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        transactions={transactions}
        onAddFixed={onAddFixed}
      />
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
    const closePmSheet = () => {
      setPmSheetMode(null);
      setSelectedPm(null);
      setPmDeleteConfirm(false);
    };

    const handleSavePmSheet = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = pmFormName.trim();
      if (!trimmed) return;

      if (pmSheetMode === 'edit' && selectedPm) {
        const next = paymentMethods.map((m) =>
          m.id === selectedPm.id ? { ...m, name: trimmed, icon: pmFormIcon } : m
        );
        setPaymentMethods(next);
        saveStoredPaymentMethods(next);
        closePmSheet();
        return;
      }

      if (pmSheetMode === 'new') {
        if (paymentMethods.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
          closePmSheet();
          return;
        }
        const next: PaymentMethodOption[] = [
          ...paymentMethods,
          { id: `pm-${Date.now()}`, name: trimmed, icon: pmFormIcon, isCustom: true },
        ];
        setPaymentMethods(next);
        saveStoredPaymentMethods(next);
        closePmSheet();
      }
    };

    const handleDeleteMethod = () => {
      if (!selectedPm || paymentMethods.length <= 1) return;
      const next = paymentMethods.filter((m) => m.id !== selectedPm.id);
      setPaymentMethods(next);
      saveStoredPaymentMethods(next);
      closePmSheet();
    };

    const handleResetMethods = () => {
      setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      saveStoredPaymentMethods(DEFAULT_PAYMENT_METHODS);
      setPmResetConfirm(false);
    };

    const pmUsageCounts: Record<string, number> = {};
    for (const tx of transactions) {
      const m = (tx.paymentMethod || '').toLowerCase().trim();
      if (m) pmUsageCounts[m] = (pmUsageCounts[m] || 0) + 1;
    }
    for (const f of fixedExpenses) {
      const m = (f.paymentMethod || 'Autogiro').toLowerCase().trim();
      if (m) pmUsageCounts[m] = (pmUsageCounts[m] || 0) + 1;
    }

    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-admin-card">
          {paymentMethods.map((method) => {
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setSelectedPm(method);
                  setPmFormName(method.name);
                  setPmFormIcon(method.icon || method.id || 'credit-card');
                  setPmDeleteConfirm(false);
                  setPmSheetMode('edit');
                }}
                className="ui-admin-row"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="ui-admin-icon-slot">
                    <PaymentMethodIcon method={method.name} iconId={method.icon || method.id} size={20} />
                  </span>
                  <span className="font-medium text-[13px] sm:text-[14px] text-[var(--text-primary)] truncate">
                    {method.name}
                  </span>
                </div>
                <div className="ui-admin-right">
                  <span className="ui-admin-chevron">
                    <CaretRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setSelectedPm(null);
              setPmFormName('');
              setPmFormIcon('credit-card');
              setPmDeleteConfirm(false);
              setPmSheetMode('new');
            }}
            className="w-full ui-btn-primary"
          >
            <Plus size={15} weight="bold" />
            <span>Nytt betalsätt</span>
          </button>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setPmResetConfirm(true)}
              className="ui-reset-btn"
            >
              <ArrowCounterClockwise size={13} />
              <span>Återställ standardbetalsätt</span>
            </button>
          </div>

          <ConfirmDialog
            isOpen={pmResetConfirm}
            title="Återställ standardbetalsätt?"
            description="Dina egna betalsätt ersätts med standardvalen."
            confirmLabel="Återställ"
            variant="primary"
            onConfirm={handleResetMethods}
            onCancel={() => setPmResetConfirm(false)}
          />
        </div>

        <BottomSheet
          isOpen={pmSheetMode !== null}
          onClose={closePmSheet}
          contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
        >
          <div className="ui-sheet-header mb-4">
            <span className="ui-sheet-title">
              {pmSheetMode === 'new' ? 'Nytt betalsätt' : 'Redigera betalsätt'}
            </span>
            <button
              type="button"
              onClick={closePmSheet}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSavePmSheet} className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4">
              <label className="flex items-center gap-3.5 cursor-text">
                <div className="w-11 h-11 flex items-center justify-center shrink-0">
                  <PaymentMethodIcon
                    method={pmFormName || 'Betalsätt'}
                    iconId={pmFormIcon}
                    size={30}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                    Namn på betalsätt
                  </span>
                  <input
                    type="text"
                    autoFocus={pmSheetMode === 'new'}
                    value={pmFormName}
                    onChange={(e) => setPmFormName(e.target.value)}
                    placeholder="Namn"
                    required
                    className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                  />
                </div>
              </label>
            </div>

            <div className="space-y-1.5">
              <span className="px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                Välj ikon
              </span>
              <div className="grid grid-cols-6 gap-2 p-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
                {AVAILABLE_PAYMENT_METHOD_ICONS.map((item) => {
                  const isSelected = pmFormIcon === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => setPmFormIcon(item.id)}
                      className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[var(--surface-color)] ring-2 ring-[var(--text-primary)] scale-[1.04]'
                          : 'bg-transparent hover:bg-[var(--surface-color)]'
                      }`}
                    >
                      <PaymentMethodIcon iconId={item.id} size={22} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="submit"
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Spara betalsätt</span>
              </button>

              {pmSheetMode === 'edit' && paymentMethods.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPmDeleteConfirm(true)}
                  className="ui-btn-danger"
                >
                  <Trash size={14} />
                  <span>Ta bort betalsätt</span>
                </button>
              )}
            </div>

            <ConfirmDialog
              isOpen={pmDeleteConfirm}
              title="Ta bort betalsätt?"
              description={`${pmFormName || 'Betalsättet'} tas bort.`}
              confirmLabel="Ta bort"
              onConfirm={handleDeleteMethod}
              onCancel={() => setPmDeleteConfirm(false)}
            />
          </form>
        </BottomSheet>
      </div>
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
        period={period}
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        transactions={transactions}
        onStartOnboarding={onStartOnboarding}
        onStartCreateGoalWizard={onStartCreateGoalWizard}
        setSubView={setSubView}
        onOpenAddFixedModal={onOpenAddFixedModal}
        onOpenPreviewFixedModal={onOpenPreviewFixedModal}
        onOpenAddIncomeModal={onOpenAddIncomeModal}
        onOpenAddTransactionModal={onOpenAddTransactionModal}
        onOpenPreviewTransactionModal={onOpenPreviewTransactionModal}
        onApplyFixedExpenses={onApplyFixedExpenses}
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
      {hiddenAvatarInput}

      {/* 1. Konto / Profil */}
      <div className="ui-admin-card">
        <button
          type="button"
          onClick={() => setSubView('profile')}
          className="ui-admin-row py-3.5"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full bg-[var(--surface-raised)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center shrink-0">
              {userAvatar ? (
                <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
              ) : initialChar ? (
                <span className="font-display font-semibold text-xs uppercase text-[var(--text-primary)]">
                  {initialChar}
                </span>
              ) : (
                <UserCircle size={20} weight="regular" className="text-[var(--text-secondary)]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className={rowTitleClass}>{userName || 'Konto'}</span>
              <span className={rowSubClass}>
                {userEmail || 'Profil, namn och e-post'}
              </span>
              {userEmail && !isDemoMode() && <EmailVerificationStatus compact />}
            </div>
          </div>

          <span className="ui-admin-chevron">
            <CaretRight size={14} />
          </span>
        </button>
      </div>

      {/* 2. Mitt – sparmål, kvitton och paket */}
      {onOpenSection && (
        <div className="ui-admin-card">
          {(
            [
              { id: 'goals', label: 'Sparmål', icon: PiggyBank },
              { id: 'receipts', label: 'Kvitton', icon: Paperclip },
              { id: 'packages', label: 'Väntar på paket', icon: Package },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const count = sectionCounts[item.id] || 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenSection(item.id)}
                className="ui-admin-row"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="ui-admin-icon-slot">
                    <Icon size={18} weight="regular" />
                  </span>
                  <span className={rowTitleClass}>{item.label}</span>
                </div>
                <div className="ui-admin-right">
                  {count > 0 && <span className="ui-admin-value tabular-nums">{count}</span>}
                  <span className="ui-admin-chevron">
                    <CaretRight size={13} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Ekonomi */}
      <section className="space-y-2">
        <span className={sectionLabelClass}>Ekonomi</span>
        <div className="ui-admin-card">
          {/* Bankkonton – bara för admin tills bankkopplingen finns för alla */}
          {bankEnabled ? (
            <button
              type="button"
              onClick={() => setSubView('bank')}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <CreditCard size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Bankkonton</span>
              </div>
              <div className="ui-admin-right">
                <span
                  className={`ui-admin-value ${
                    hasActiveBank
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : ''
                  }`}
                >
                  {hasActiveBank ? 'Ansluten' : 'Anslut'}
                </span>
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          ) : (
            <div className="ui-admin-row cursor-default">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <CreditCard size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Bankkoppling</span>
              </div>
              <div className="ui-admin-right">
                <span className="px-2.5 py-0.5 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-muted)]">
                  Kommer snart
                </span>
              </div>
            </div>
          )}

          {/* Lönedag */}
          <button
            type="button"
            onClick={() => setSubView('period')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <CalendarBlank size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Lönedag</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-value">Den {targetPayday}:e</span>
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Kategorier */}
          <button
            type="button"
            onClick={() => setSubView('categories')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Tag size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Kategorier</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Betalsätt */}
          <button
            type="button"
            onClick={() => setSubView('paymentMethods')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Wallet size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Betalsätt</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Dölj egna överföringar */}
          <div className="ui-admin-row-static">
            <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
              <span className="ui-admin-icon-slot">
                <ArrowsLeftRight size={18} weight="regular" />
              </span>
              <div className="min-w-0 flex-1">
                <span className={rowTitleClass}>Dölj egna överföringar</span>
                <span className={rowSubClass}>
                  Räknar inte flytt mellan egna konton som inkomst eller utgift
                </span>
              </div>
            </div>
            {onToggleExcludeInternalTransfers && (
              <button
                type="button"
                role="switch"
                aria-checked={excludeInternalTransfers}
                onClick={() => onToggleExcludeInternalTransfers(!excludeInternalTransfers)}
                className={`ui-switch ${
                  excludeInternalTransfers ? 'ui-switch-on' : 'ui-switch-off'
                }`}
              >
                <span
                  className={`ui-switch-thumb ${
                    excludeInternalTransfers ? 'ui-switch-thumb-on' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 3. App & konto */}
      <section className="space-y-1.5">
        <span className={sectionLabelClass}>App & konto</span>
        <div className="ui-admin-card">
          {/* Utseende */}
          <button
            type="button"
            onClick={() => setSubView('appearance')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                {themeMode === 'dark' ? (
                  <Moon size={18} weight="regular" />
                ) : (
                  <Sun size={18} weight="regular" />
                )}
              </span>
              <span className={rowTitleClass}>Utseende</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-value">
                {themeMode === 'system'
                  ? 'System'
                  : themeMode === 'dark'
                  ? 'Mörkt'
                  : 'Ljust'}
              </span>
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Data & säkerhet */}
          <button
            type="button"
            onClick={() => setSubView('security')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ShieldCheck size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Data & säkerhet</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Hjälp & feedback */}
          <button
            type="button"
            onClick={() => setSubView('feedback')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ChatCircleText size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Hjälp & feedback</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Villkor & integritet */}
          <button
            type="button"
            onClick={() => setSubView('legal')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <LockKey size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Villkor & integritet</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Admin & test (Endast synlig för admin) */}
          {(userEmail || '').trim().toLowerCase() === 'kevinwpts@gmail.com' && (
            <button
              type="button"
              onClick={() => setSubView('admin')}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <SlidersHorizontal size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Admin & test</span>
              </div>
              <div className="ui-admin-right">
                <span className="ui-admin-value">Scenarion & flöden</span>
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 5. Logga ut / Logga in */}
      <div className="ui-admin-card">
        {userEmail ? (
          <button
            type="button"
            onClick={onSignOut}
            className="ui-admin-row hover:bg-rose-500/5"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-5 h-5 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <SignOut size={18} weight="regular" />
              </div>
              <span className="text-[13px] sm:text-[14px] font-medium text-rose-600 dark:text-rose-400">
                Logga ut
              </span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenAuth}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5">
              <span className="ui-admin-icon-slot">
                <UserCircle size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Logga in</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

