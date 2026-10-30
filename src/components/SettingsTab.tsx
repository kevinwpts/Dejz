import React, { useState, useRef, useEffect } from 'react';
import {
  Bank,
  ArrowClockwise,
  ArrowCounterClockwise,
  UserCircle,
  SignOut,
  CalendarBlank,
  Camera,
  ShieldCheck,
  CreditCard,
  ArrowsLeftRight,
  Tag,
  CaretRight,
  Compass,
  Sun,
  Moon,
  Wallet,
  Plus,
  Trash,
  Check,
  X,
  ChatCircleText,
  PaperPlaneTilt,
  Scales,
  FileText,
  LockKey,
  Cookie,
  DownloadSimple,
  PiggyBank,
  Sparkle,
} from '@phosphor-icons/react';
import { bankService, BankConnection, BankAccount } from '../services/bankService';
import { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';
import { CategorySettings } from './CategorySettings';
import { SavingsGoalsView } from './SavingsGoalsView';
import { RecurringDiscoveryView } from './RecurringDiscoveryView';
import { TransactionItem, FixedExpenseItem, IncomeItem, AccountItem } from './HomeTab';
import {
  getStoredPaymentMethods,
  saveStoredPaymentMethods,
  compressImageFileToDataUrl,
  getSavingsGoals,
} from '../utils/appCache';
import { DEFAULT_PAYMENT_METHODS, PaymentMethodOption } from '../constants';
import { BottomSheet } from './ui/BottomSheet';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { DayOfMonthPicker } from './ui/DayOfMonthPicker';
import { ItemLogo } from './ItemLogo';

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
}

export type SettingsSubView =
  | 'main'
  | 'discover'
  | 'categories'
  | 'goals'
  | 'paymentMethods'
  | 'period'
  | 'bank'
  | 'appearance'
  | 'security'
  | 'preferences'
  | 'profile'
  | 'feedback'
  | 'privacy'
  | 'terms'
  | 'psd2'
  | 'cookies';

export const SETTINGS_SUBVIEW_TITLES: Record<Exclude<SettingsSubView, 'main'>, string> = {
  profile: 'Profil',
  discover: 'Hitta fasta poster',
  categories: 'Kategorier',
  goals: 'Sparmål & buffert',
  paymentMethods: 'Betalsätt',
  period: 'Lönedag',
  bank: 'Bankkonton',
  appearance: 'Utseende',
  preferences: 'Överföringar',
  security: 'Data & säkerhet',
  feedback: 'Skicka feedback',
  privacy: 'Integritetspolicy',
  terms: 'Användarvillkor',
  psd2: 'Open Banking',
  cookies: 'Cookies & lagring',
};

function stripRawAccountDigits(value: string): string {
  return value
    .replace(/\b\d[\d\s-]{3,}\d\b/g, '')
    .replace(/[·•\-–—]\s*\d{2,}/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

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
}) => {
  const [internalSubView, setInternalSubView] = useState<SettingsSubView>('main');
  const subView = controlledSubView ?? internalSubView;
  const setSubView = (next: SettingsSubView) => {
    setInternalSubView(next);
    if (onSubViewChange) onSubViewChange(next);
  };
  const [editName, setEditName] = useState(userName || '');
  const [editEmail, setEditEmail] = useState(userEmail || '');
  const [savedMsg, setSavedMsg] = useState(false);

  // Payment methods sheet state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(() =>
    getStoredPaymentMethods()
  );
  const [pmSheetMode, setPmSheetMode] = useState<'new' | 'edit' | null>(null);
  const [selectedPm, setSelectedPm] = useState<PaymentMethodOption | null>(null);
  const [pmFormName, setPmFormName] = useState('');
  const [pmDeleteConfirm, setPmDeleteConfirm] = useState(false);
  const [pmResetConfirm, setPmResetConfirm] = useState(false);

  // Bank account edit sheet & disconnect confirm state
  const [editingAccount, setEditingAccount] = useState<AccountItem | null>(null);
  const [accountNameInput, setAccountNameInput] = useState('');
  const [accountIncludedInput, setAccountIncludedInput] = useState(true);
  const [savingAccountEdit, setSavingAccountEdit] = useState(false);
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
      root.style.backgroundColor = '#0A0A0C';
      if (metaTheme) metaTheme.setAttribute('content', '#0A0A0C');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.backgroundColor = '#F6F6F4';
      if (metaTheme) metaTheme.setAttribute('content', '#F6F6F4');
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
      profile: {
        name: userName || null,
        email: userEmail || null,
        targetPayday,
        weekendHandling,
      },
      incomes,
      fixedExpenses,
      transactions,
      paymentMethods,
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
    const handleSaveProfile = (e: React.FormEvent) => {
      e.preventDefault();
      if (onUpdateName) {
        onUpdateName(editName.trim());
      }
      if (onUpdateEmail && editEmail.trim() && editEmail.trim() !== userEmail) {
        onUpdateEmail(editEmail.trim());
      }
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2500);
    };

    const initialChar = (editName || userName || userEmail || '').trim().charAt(0);

    return (
      <div className="ui-page animate-slide-in-right">
        {hiddenAvatarInput}
        <div className="ui-card p-5 space-y-5">
          {/* Profilbild med samlade bildåtgärder (utan dubblerad namn/e-posttext) */}
          <div className="flex items-center gap-4 pb-5 border-b border-[var(--border-subtle)]">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
                ) : initialChar ? (
                  <span className="font-display font-bold text-xl uppercase text-[var(--text-primary)]">
                    {initialChar}
                  </span>
                ) : (
                  <UserCircle size={34} weight="duotone" className="text-[var(--text-secondary)]" />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <span className="block text-xs font-medium text-[var(--text-secondary)]">
                Profilbild
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-control)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera size={13} weight="regular" />
                  <span>{userAvatar ? 'Byt bild' : 'Välj bild'}</span>
                </button>
                {userAvatar && onUpdateAvatar && (
                  <button
                    type="button"
                    onClick={() => onUpdateAvatar(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/8 transition-colors cursor-pointer"
                  >
                    Ta bort
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] overflow-hidden">
              <label className="px-4 py-3.5 block cursor-text">
                <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  Namn
                </span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ditt förnamn"
                  className="w-full bg-transparent border-0 p-0 text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
                />
              </label>

              <label className="px-4 py-3.5 block cursor-text">
                <span className="text-xs font-medium text-[var(--text-secondary)] block mb-1">
                  E-postadress
                </span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                  className="w-full bg-transparent border-0 p-0 text-base font-normal text-[var(--text-primary)] placeholder-[var(--text-muted)]/55 focus:outline-none"
                />
              </label>
            </div>

            {savedMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center animate-fade-in">
                Sparat!
              </div>
            )}

            <button
              type="submit"
              className="w-full ui-btn-primary"
            >
              Spara ändringar
            </button>
          </form>
        </div>
      </div>
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
      <div className="animate-slide-in-right">
        <SavingsGoalsView />
      </div>
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
          m.id === selectedPm.id ? { ...m, name: trimmed } : m
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
          { id: `pm-${Date.now()}`, name: trimmed, isCustom: true },
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
            const count = pmUsageCounts[method.name.toLowerCase().trim()] || 0;
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => {
                  setSelectedPm(method);
                  setPmFormName(method.name);
                  setPmDeleteConfirm(false);
                  setPmSheetMode('edit');
                }}
                className="ui-admin-row"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <span className="ui-admin-icon-slot">
                    <Wallet size={17} weight="regular" />
                  </span>
                  <span className="font-medium text-[13px] sm:text-[13.5px] text-[var(--text-primary)] truncate">
                    {method.name}
                  </span>
                </div>
                <div className="ui-admin-right">
                  <span className="ui-admin-value">
                    {count > 0 ? count : ''}
                  </span>
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
                <div className="w-11 h-11 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Wallet size={22} weight="duotone" />
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
              <span className="ui-row-title text-[13.5px] sm:text-sm">
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
    const formatKr = (amount: number) =>
      `${new Intl.NumberFormat('sv-SE').format(Math.round(amount))} kr`;

    const displayAccountItems: AccountItem[] =
      bankAccounts.length > 0
        ? bankAccounts.map((ba, idx) => {
            const conn = connections.find((c) => c.id === ba.connection_id);
            const bName = conn?.aspsp_name || connectedBank || 'Bank';
            const cleanName =
              ba.custom_name?.trim() ||
              stripRawAccountDigits(ba.product || ba.name || '') ||
              (idx === 0 ? 'Lönekonto' : 'Sparkonto');
            return {
              id: ba.id,
              name: cleanName,
              accountNumber: ba.bban || ba.iban || undefined,
              bankName: bName,
              balance: Number(ba.balance_amount) || 0,
              type: 'checking',
              logo: conn?.aspsp_logo || undefined,
            };
          })
        : accounts;

    const handleOpenAccountDetail = (acc: AccountItem) => {
      const rawBa = bankAccounts.find((b) => b.id === acc.id);
      setEditingAccount(acc);
      setAccountNameInput(rawBa?.custom_name || stripRawAccountDigits(acc.name) || 'Bankkonto');
      setAccountIncludedInput(rawBa ? rawBa.is_selected !== false : true);
    };

    const handleSaveAccountDetail = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingAccount) return;
      setSavingAccountEdit(true);
      try {
        const cleanName = accountNameInput.trim() || 'Bankkonto';
        bankService.saveAccountOverlay(editingAccount.id, {
          custom_name: cleanName,
          is_selected: accountIncludedInput,
          include_in_budget: accountIncludedInput,
        });

        const rawBa = bankAccounts.find((b) => b.id === editingAccount.id);
        if (rawBa?.connection_id) {
          const connAccs = bankAccounts.filter((b) => b.connection_id === rawBa.connection_id);
          const nextSelectedIds = connAccs
            .filter((b) =>
              b.id === editingAccount.id ? accountIncludedInput : b.is_selected !== false
            )
            .map((b) => b.id);
          if (nextSelectedIds.length > 0) {
            await bankService
              .selectAccounts({
                connectionId: rawBa.connection_id,
                selectedAccountIds: nextSelectedIds,
              })
              .catch(() => {});
          }
        }
        if (onRefreshBankStatus) {
          onRefreshBankStatus();
        }
      } finally {
        setSavingAccountEdit(false);
        setEditingAccount(null);
      }
    };

    return (
      <div className="ui-page animate-slide-in-right">
        {hasActiveBank ? (
          <>
            {/* Anslutna banker */}
            <div className="space-y-1.5">
              <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                Ansluten bank
              </span>
              <div className="ui-group-card">
                {connections.length > 0 ? (
                  connections.map((conn) => {
                    const validMs = conn.valid_until ? new Date(conn.valid_until).getTime() : NaN;
                    const computedDaysLeft =
                      conn.days_until_expiry !== undefined && conn.days_until_expiry !== null
                        ? conn.days_until_expiry
                        : !Number.isNaN(validMs)
                        ? Math.ceil((validMs - Date.now()) / (24 * 60 * 60 * 1000))
                        : null;
                    const isExpired =
                      conn.status === 'expired' ||
                      (computedDaysLeft !== null && computedDaysLeft <= 0);
                    const isExpiringSoon =
                      !isExpired &&
                      (Boolean(conn.expiring_soon) ||
                        (computedDaysLeft !== null && computedDaysLeft <= 14));

                    return (
                      <div key={conn.id} className="ui-row">
                        <div className="flex items-center gap-3 min-w-0">
                          <ItemLogo
                            name={conn.aspsp_name}
                            logoUrl={conn.aspsp_logo || undefined}
                            size="md"
                          />
                          <div className="min-w-0">
                            <span className="ui-row-title">{conn.aspsp_name}</span>
                            {isExpired ? (
                              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium block">
                                Samtycket har gått ut · Förnya åtkomst
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
                                Samtycke går ut om {computedDaysLeft}{' '}
                                {computedDaysLeft === 1 ? 'dag' : 'dagar'}
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                                Ansluten
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(isExpired || isExpiringSoon) && (
                            <button
                              type="button"
                              onClick={onOpenBank}
                              className="px-2.5 py-1.5 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              Förnya
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDisconnectConfirmConnId(conn.id)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                          >
                            Koppla från
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="ui-row">
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemLogo name={connectedBank || 'Bank'} size="md" />
                      <div className="min-w-0">
                        <span className="ui-row-title">{connectedBank}</span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                          Ansluten
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDisconnectConfirmConnId('__default__')}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0"
                    >
                      Koppla från
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Kontolista där varje konto öppnar kontoinställningar/detaljer */}
            {displayAccountItems.length > 0 && (
              <div className="space-y-1.5">
                <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                  Konton
                </span>
                <div className="ui-group-card">
                  {displayAccountItems.map((acc) => {
                    const cleanName = stripRawAccountDigits(acc.name) || 'Bankkonto';
                    const cleanBank = stripRawAccountDigits(
                      acc.bankName || acc.bank || connectedBank || 'Bank'
                    );
                    const rawBa = bankAccounts.find((b) => b.id === acc.id);
                    const isHidden = rawBa && rawBa.is_selected === false;

                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleOpenAccountDetail(acc)}
                        className={`ui-row-btn ${isHidden ? 'opacity-55' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo name={cleanBank} logoUrl={acc.logo} size="md" />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">{cleanName}</span>
                            <span className="ui-row-subtitle">
                              {cleanBank}
                              {isHidden ? ' · Dold i översikt' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="ui-row-amount">{formatKr(acc.balance)}</span>
                          <CaretRight size={14} className="text-[var(--text-muted)]" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSyncBank}
                disabled={syncingBank}
                className="py-3 px-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ArrowClockwise size={14} className={syncingBank ? 'animate-spin' : ''} />
                <span>{syncingBank ? 'Synkar...' : 'Synka nu'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenBank}
                className="ui-btn-primary"
              >
                <Plus size={15} weight="bold" />
                <span>Lägg till bank</span>
              </button>
            </div>

            {/* Kontodetaljer / Redigera konto */}
            <BottomSheet
              isOpen={editingAccount !== null}
              onClose={() => setEditingAccount(null)}
              title="Kontoinställningar"
            >
              {editingAccount && (
                <form onSubmit={handleSaveAccountDetail} className="space-y-4">
                  <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
                    <label className="flex items-center gap-3.5 cursor-text">
                      <ItemLogo
                        name={editingAccount.bankName || editingAccount.bank || connectedBank || 'Bank'}
                        logoUrl={editingAccount.logo}
                        size="lg"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                          Kontonamn
                        </span>
                        <input
                          type="text"
                          value={accountNameInput}
                          onChange={(e) => setAccountNameInput(e.target.value)}
                          placeholder="Kontonamn"
                          required
                          className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                        />
                      </div>
                    </label>

                    <div className="border-t border-[var(--border-subtle)] pt-3.5 flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                        Saldo
                      </span>
                      <span className="font-display font-bold text-xl text-[var(--text-primary)] tabular-nums">
                        {formatKr(editingAccount.balance)}
                      </span>
                    </div>
                  </div>

                  <div className="ui-sheet-group">

                    <div className="ui-row">
                      <span className="text-[var(--text-muted)] shrink-0">Bank</span>
                      <span className="font-medium text-[var(--text-primary)]">
                        {editingAccount.bankName || editingAccount.bank || connectedBank || 'Bank'}
                      </span>
                    </div>

                    {editingAccount.accountNumber && (
                      <div className="ui-row">
                        <span className="text-[var(--text-muted)] shrink-0">Kontonummer</span>
                        <span className="font-display font-medium text-xs text-[var(--text-secondary)] tabular-nums">
                          {editingAccount.accountNumber}
                        </span>
                      </div>
                    )}

                    <div className="ui-row">
                      <div className="min-w-0 pr-3">
                        <span className="text-[var(--text-primary)] font-medium block">
                          Visa i appens översikt
                        </span>
                        <span className="text-xs text-[var(--text-muted)] block mt-0.5">
                          Räkna med saldo och händelser från detta konto
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={accountIncludedInput}
                        onClick={() => setAccountIncludedInput((prev) => !prev)}
                        className={`ui-switch ${
                          accountIncludedInput ? 'ui-switch-on' : 'ui-switch-off'
                        }`}
                      >
                        <span
                          className={`ui-switch-thumb ${
                            accountIncludedInput ? 'ui-switch-thumb-on' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAccountEdit || !accountNameInput.trim()}
                    className="ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>{savingAccountEdit ? 'Sparar...' : 'Spara'}</span>
                  </button>
                </form>
              )}
            </BottomSheet>

            <ConfirmDialog
              isOpen={disconnectConfirmConnId !== null}
              title="Koppla från bank?"
              description="Konton slutar synkas tills du ansluter igen."
              confirmLabel="Koppla från"
              onConfirm={() => {
                const id = disconnectConfirmConnId;
                setDisconnectConfirmConnId(null);
                if (id === '__default__') {
                  onDisconnectBank();
                } else if (id) {
                  onDisconnectBank(id);
                }
              }}
              onCancel={() => setDisconnectConfirmConnId(null)}
            />
          </>
        ) : (
          <section className="ui-empty-state-page">
            <Bank size={52} weight="light" className="ui-empty-icon" />
            <h3 className="ui-empty-title">Ingen bank ansluten</h3>
            <p className="ui-empty-sub mb-6">
              Anslut din bank med Mobilt BankID för att hämta konton och köp automatiskt.
            </p>
            <button
              type="button"
              onClick={onOpenBank}
              className="w-full max-w-xs ui-btn-primary"
            >
              <Bank size={15} />
              <span>Anslut bank</span>
            </button>
          </section>
        )}
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: DATA & SÄKERHET
  // ==========================================
  if (subView === 'security') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-admin-card">
          <button
            type="button"
            onClick={handleExportGdprData}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <DownloadSimple size={18} weight="regular" />
              </span>
              <span className="font-medium text-[13px] sm:text-[13.5px] text-[var(--text-primary)] truncate">
                Exportera data
              </span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-value">JSON</span>
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          <button
            type="button"
            disabled={securityProcessing}
            onClick={() => setSecurityConfirmAction('reset')}
            className="ui-admin-row disabled:opacity-50"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ArrowCounterClockwise size={18} weight="regular" />
              </span>
              <span className="font-medium text-[13px] sm:text-[13.5px] text-[var(--text-primary)] truncate">
                Nollställ data
              </span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>
        </div>

        <div className="ui-admin-card">
          <button
            type="button"
            disabled={securityProcessing}
            onClick={() => setSecurityConfirmAction('delete')}
            className="ui-admin-row disabled:opacity-50"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="w-5 h-5 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <Trash size={18} weight="regular" />
              </span>
              <span className="font-medium text-[13px] sm:text-[13.5px] text-rose-600 dark:text-rose-400 truncate">
                Radera konto
              </span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>
        </div>

        <ConfirmDialog
          isOpen={securityConfirmAction !== null}
          loading={securityProcessing}
          title={securityConfirmAction === 'delete' ? 'Radera konto?' : 'Nollställ data?'}
          description={
            securityConfirmAction === 'delete'
              ? 'Ditt konto och all data tas bort. Detta går inte att ångra.'
              : 'Alla poster och bankkopplingar tas bort så att du kan börja om.'
          }
          confirmLabel={securityConfirmAction === 'delete' ? 'Radera' : 'Nollställ'}
          variant="danger"
          onConfirm={async () => {
            const action = securityConfirmAction;
            if (!action || securityProcessing) return;
            setSecurityProcessing(true);
            try {
              if (action === 'delete') {
                await onDeleteAccount();
              } else if (action === 'reset') {
                await onResetAccount();
              }
            } catch (err) {
              console.error('Kunde inte utföra säkerhetsåtgärd:', err);
            } finally {
              setSecurityProcessing(false);
              setSecurityConfirmAction(null);
            }
          }}
          onCancel={() => {
            if (!securityProcessing) {
              setSecurityConfirmAction(null);
            }
          }}
        />
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: SKICKA FEEDBACK
  // ==========================================
  if (subView === 'feedback') {
    const handleSendFeedback = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanMessage = feedbackMessage.trim();
      if (!cleanMessage || feedbackSending) return;
      setFeedbackSending(true);
      try {
        const prev = JSON.parse(localStorage.getItem('dejz_user_feedback') || '[]');
        prev.unshift({
          id: Date.now(),
          type: feedbackType,
          message: cleanMessage,
          userEmail: userEmail || 'anonym',
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('dejz_user_feedback', JSON.stringify(prev.slice(0, 50)));
      } catch {
        // ignore
      }

      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: feedbackType,
            message: cleanMessage,
            userEmail: userEmail || 'anonym',
            userName: userName || null,
          }),
        });
      } catch {
        // fallback already stored locally
      } finally {
        setFeedbackSending(false);
        setFeedbackSent(true);
        setFeedbackMessage('');
        setTimeout(() => setFeedbackSent(false), 3500);
      }
    };

    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-card-p">
          <form onSubmit={handleSendFeedback} className="space-y-4">
            <div className="ui-segmented grid-cols-3">
              {[
                { id: 'idea' as const, label: 'Förslag' },
                { id: 'bug' as const, label: 'Bugg' },
                { id: 'praise' as const, label: 'Beröm' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFeedbackType(t.id)}
                  className={`ui-segmented-tab ${
                    feedbackType === t.id ? 'ui-segmented-tab-active' : ''
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <textarea
              rows={4}
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              placeholder="Ditt meddelande"
              required
              className="ui-box-input resize-none"
            />

            {feedbackSent && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center animate-fade-in">
                Tack för din feedback!
              </div>
            )}

            <button
              type="submit"
              disabled={!feedbackMessage.trim() || feedbackSending}
              className="ui-btn-primary"
            >
              <PaperPlaneTilt size={15} weight="bold" />
              <span>{feedbackSending ? 'Skickar...' : 'Skicka'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: INTEGRITETSPOLICY
  // ==========================================
  if (subView === 'privacy') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              1. Personuppgiftsansvar
            </h3>
            <p>
              Dejz behandlar dina personuppgifter i enlighet med EU:s dataskyddsförordning
              (GDPR, 2016/679) samt svensk dataskyddslagstiftning (Lag 2018:218).
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              2. Uppgifter som behandlas
            </h3>
            <p>
              Vi behandlar endast de uppgifter som krävs för din ekonomiöversikt:
              kontouppgifter, lönedagsinställningar, manuella poster samt de bankkonton och
              transaktioner du samtycker till att hämta via Open Banking.
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              3. Ändamål & rättslig grund
            </h3>
            <p>
              Behandlingen sker med stöd av avtal (Artikel 6.1 b GDPR) samt uttryckligt
              samtycke (Artikel 6.1 a GDPR) vid bankanslutning. Vi säljer aldrig dina
              uppgifter vidare.
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              4. Dina rättigheter
            </h3>
            <p>
              Under{' '}
              <span className="font-semibold text-[var(--text-primary)]">Data & säkerhet</span>{' '}
              kan du när som helst exportera all din data eller radera ditt konto permanent.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: ANVÄNDARVILLKOR
  // ==========================================
  if (subView === 'terms') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              1. Om tjänsten
            </h3>
            <p>
              Dejz är ett digitalt verktyg för personlig ekonomiöversikt och
              löneperiodsbudgetering för privat bruk.
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              2. Ingen finansiell rådgivning
            </h3>
            <p>
              Sammanställningar och prognoser i Dejz utgör inte finansiell, juridisk eller
              skattemässig rådgivning enligt lagen (2003:862).
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              3. Avslutande & tillämplig lag
            </h3>
            <p>
              Du kan när som helst avsluta ditt konto utan uppsägningstid. Svensk lag
              tillämpas på dessa villkor.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: OPEN BANKING
  // ==========================================
  if (subView === 'psd2') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              Säker bankanslutning (PSD2)
            </h3>
            <p>
              Bankkopplingar sker via Enable Banking i enlighet med EU:s andra
              betaltjänstdirektiv (PSD2). Autentisering sker direkt mot din bank med Mobilt
              BankID.
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              Endast läsrättigheter
            </h3>
            <p>
              Dejz har uteslutande läsrättigheter till dina valda konton och transaktioner.
              Appen kan aldrig flytta pengar eller genomföra betalningar.
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              Samtycke & återkallelse
            </h3>
            <p>
              Ett banksamtycke gäller i högst 90 dagar åt gången och kan när som helst
              återkallas direkt under{' '}
              <span className="font-semibold text-[var(--text-primary)]">Bankkonton</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: COOKIES & LAGRING
  // ==========================================
  if (subView === 'cookies') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              Tekniskt nödvändig lagring
            </h3>
            <p>
              Dejz använder lokal lagring (localStorage och sessionscookies) uteslutande för
              att hålla dig inloggad och spara dina inställningar såsom lönedag, utseende,
              kategorier och betalsätt.
            </p>
          </div>

          <div className="p-5">
            <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)] mb-1">
              Inga spårningscookies
            </h3>
            <p>
              Dejz använder inga tredjepartscookies för annonsering, profilering eller
              kommersiell spårning.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: UTSEENDE
  // ==========================================
  if (subView === 'appearance') {
    const themeOptions: {
      id: 'light' | 'dark' | 'system';
      label: string;
    }[] = [
      { id: 'light', label: 'Ljust' },
      { id: 'dark', label: 'Mörkt' },
      { id: 'system', label: 'System' },
    ];

    return (
      <div className="ui-page animate-slide-in-right">
        {/* Visual Preview Cards (like iOS / Revolut / Instagram) */}
        <div className="ui-card-p">
          <div className="grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const isSelected = themeMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => applyTheme(opt.id)}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group"
                >
                  <div
                    className={`w-full aspect-[4/5] rounded-2xl p-2.5 border-2 transition-all overflow-hidden relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--text-primary)] shadow-sm scale-[1.02]'
                        : 'border-[var(--border-subtle)] opacity-80 group-hover:opacity-100'
                    } ${
                      opt.id === 'light'
                        ? 'bg-[#F6F6F4]'
                        : opt.id === 'dark'
                        ? 'bg-[#0A0A0C]'
                        : 'bg-gradient-to-br from-[#F6F6F4] from-50% to-[#0A0A0C] to-50%'
                    }`}
                  >
                    {opt.id === 'system' ? (
                      <>
                        <div className="w-full h-5 rounded-lg bg-white/95 border border-black/5 px-1.5 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-[#111113]" />
                          <div className="h-1.5 w-8 rounded-full bg-black/15" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="w-full h-3.5 rounded-md bg-[#141417] border border-white/10" />
                          <div className="w-3/4 h-3.5 rounded-md bg-[#141417] border border-white/10" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className={`w-full h-5 rounded-lg px-1.5 flex items-center gap-1 ${
                            opt.id === 'light'
                              ? 'bg-white border border-black/5'
                              : 'bg-[#141417] border border-white/10'
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              opt.id === 'light' ? 'bg-[#111113]' : 'bg-[#F5F5F7]'
                            }`}
                          />
                          <div
                            className={`h-1.5 w-8 rounded-full ${
                              opt.id === 'light' ? 'bg-black/15' : 'bg-white/20'
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <div
                            className={`w-full h-3.5 rounded-md ${
                              opt.id === 'light'
                                ? 'bg-white border border-black/5'
                                : 'bg-[#141417] border border-white/10'
                            }`}
                          />
                          <div
                            className={`w-3/4 h-3.5 rounded-md ${
                              opt.id === 'light'
                                ? 'bg-white border border-black/5'
                                : 'bg-[#141417] border border-white/10'
                            }`}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <span
                    className={`text-xs ${
                      isSelected
                        ? 'font-semibold text-[var(--text-primary)]'
                        : 'font-medium text-[var(--text-muted)]'
                    }`}
                  >
                    {opt.label}
                  </span>

                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                        : 'border-[var(--border-control)] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check size={11} weight="bold" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN SETTINGS & PROFILE MENU (Clean grouped layout with generous breathing room)
  // ==========================================
  const initialChar = (userName || userEmail || '').trim().charAt(0);
  const rowTitleClass =
    'font-normal text-[13px] sm:text-[13.5px] tracking-[-0.005em] leading-[1.35] text-[var(--text-primary)] block truncate';
  const rowSubClass =
    'font-normal text-[11.5px] leading-[1.35] text-[var(--text-secondary)] mt-0.5 block truncate';
  const sectionLabelClass =
    'px-1 pt-1.5 pb-0.5 text-[14px] sm:text-[14.5px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] block';

  const savingsGoalsCount = getSavingsGoals().length;

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
            </div>
          </div>

          <span className="ui-admin-chevron">
            <CaretRight size={14} />
          </span>
        </button>
      </div>

      {/* 2. Ekonomi */}
      <section className="space-y-2">
        <span className={sectionLabelClass}>Ekonomi</span>
        <div className="ui-admin-card">
          {/* Bankkonton */}
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

          {/* Hitta fasta poster (kortad rubrik med bevarad betydelse) */}
          <button
            type="button"
            onClick={() => setSubView('discover')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Sparkle size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Hitta fasta poster</span>
            </div>
            <div className="ui-admin-right">
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

          {/* Sparmål & buffert */}
          <button
            type="button"
            onClick={() => setSubView('goals')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <PiggyBank size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Sparmål & buffert</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-value">
                {savingsGoalsCount > 0 ? `${savingsGoalsCount} st` : ''}
              </span>
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

          {/* Dölj överföringar */}
          <div className="ui-admin-row-static">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ArrowsLeftRight size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Dölj överföringar</span>
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

      {/* 3. Konto & app */}
      <section className="space-y-1.5">
        <span className={sectionLabelClass}>Konto & app</span>
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

          {/* Skicka feedback */}
          <button
            type="button"
            onClick={() => setSubView('feedback')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <ChatCircleText size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Skicka feedback</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          {/* Introduktion */}
          {onStartOnboarding && (
            <button
              type="button"
              onClick={onStartOnboarding}
              className="ui-admin-row"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="ui-admin-icon-slot">
                  <Compass size={18} weight="regular" />
                </span>
                <span className={rowTitleClass}>Introduktion</span>
              </div>
              <div className="ui-admin-right">
                <span className="ui-admin-chevron">
                  <CaretRight size={13} />
                </span>
              </div>
            </button>
          )}

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
        </div>
      </section>

      {/* 4. Juridik & integritet */}
      <section className="space-y-1.5">
        <span className={sectionLabelClass}>Juridik & integritet</span>
        <div className="ui-admin-card">
          <button
            type="button"
            onClick={() => setSubView('privacy')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <LockKey size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Integritetspolicy</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubView('terms')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <FileText size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Användarvillkor</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubView('psd2')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Scales size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Open Banking</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSubView('cookies')}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Cookie size={18} weight="regular" />
              </span>
              <span className={rowTitleClass}>Cookies & lagring</span>
            </div>
            <div className="ui-admin-right">
              <span className="ui-admin-chevron">
                <CaretRight size={13} />
              </span>
            </div>
          </button>
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
              <span className="text-[13px] sm:text-[13.5px] font-medium text-rose-600 dark:text-rose-400">
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

