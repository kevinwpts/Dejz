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
} from '@phosphor-icons/react';
import { BankConnection } from '../services/bankService';
import { PeriodInfo, WeekendHandlingMode } from '../utils/periodEngine';
import { CategorySettings } from './CategorySettings';
import { TransactionItem, FixedExpenseItem, IncomeItem, AccountItem } from './HomeTab';
import {
  getStoredPaymentMethods,
  saveStoredPaymentMethods,
  compressImageFileToDataUrl,
} from '../utils/appCache';
import { DEFAULT_PAYMENT_METHODS, PaymentMethodOption } from '../constants';
import { BottomSheet } from './ui/BottomSheet';
import { ItemLogo } from './ItemLogo';

interface SettingsTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  connections: BankConnection[];
  accounts?: AccountItem[];
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
  | 'categories'
  | 'paymentMethods'
  | 'period'
  | 'bank'
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
  categories: 'Kategorier',
  paymentMethods: 'Betalsätt',
  period: 'Lönedag',
  bank: 'Bankkonton',
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
  accounts = [],
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

  // Security confirmation sheet
  const [securityConfirmAction, setSecurityConfirmAction] = useState<'reset' | 'delete' | null>(
    null
  );

  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'idea' | 'bug' | 'praise'>('idea');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Theme state
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    try {
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

  const applyTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.backgroundColor = '#141414';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.backgroundColor = '#F4F3F1';
    }
    try {
      localStorage.setItem('dejz_dark_mode', mode);
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
          {/* Centered 64x64 Hero Avatar */}
          <div className="text-center pb-5 border-b border-[var(--border-subtle)]">
            <div className="relative inline-block mb-3">
              <div className="w-16 h-16 rounded-[20px] bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] border-2 border-[var(--surface-color)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                title="Byt profilbild"
              >
                <Camera size={12} weight="bold" />
              </button>
            </div>

            <h3 className="font-display font-bold text-lg text-[var(--text-primary)] truncate px-4">
              {editName.trim() || userName || userEmail || 'Gästkonto'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate px-4">
              {userEmail || 'Lokalt läge'}
            </p>
            {userAvatar && onUpdateAvatar && (
              <button
                type="button"
                onClick={() => onUpdateAvatar(null)}
                className="mt-2 text-[11px] font-semibold text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
              >
                Ta bort bild
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="ui-sheet-group">
              <label className="ui-input-row">
                <span className="text-[var(--text-muted)] shrink-0">Namn</span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ditt förnamn"
                  className="ui-inline-input"
                />
              </label>
              <label className="ui-input-row">
                <span className="text-[var(--text-muted)] shrink-0">E-post</span>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="namn@exempel.se"
                  className="ui-inline-input"
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
              Spara
            </button>
          </form>
        </div>
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

    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => {
                setSelectedPm(method);
                setPmFormName(method.name);
                setPmDeleteConfirm(false);
                setPmSheetMode('edit');
              }}
              className="ui-row-btn"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="ui-icon-badge">
                  <Wallet size={15} />
                </div>
                <span className="ui-row-title">
                  {method.name}
                </span>
              </div>
              <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
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

          {pmResetConfirm ? (
            <div className="ui-confirm-neutral">
              <span className="font-medium text-[var(--text-secondary)]">
                Återställa standardbetalsätt?
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setPmResetConfirm(false)}
                  className="ui-btn-sm"
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleResetMethods}
                  className="ui-btn-sm-primary"
                >
                  Återställ
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setPmResetConfirm(true)}
                className="py-1.5 px-3 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowCounterClockwise size={13} />
                <span>Återställ standardbetalsätt</span>
              </button>
            </div>
          )}
        </div>

        <BottomSheet
          isOpen={pmSheetMode !== null}
          onClose={closePmSheet}
          contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] overflow-y-auto"
        >
          <div className="ui-sheet-header mb-5">
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

          <div className="ui-hero-header">
            <div className="ui-hero-icon">
              <Wallet size={28} />
            </div>
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)] truncate px-4">
              {pmFormName.trim() || 'Namnlöst betalsätt'}
            </h2>
          </div>

          <form onSubmit={handleSavePmSheet} className="space-y-4">
            <div className="ui-sheet-group">
              <label className="ui-input-row">
                <span className="text-[var(--text-muted)] shrink-0">Namn</span>
                <input
                  type="text"
                  value={pmFormName}
                  onChange={(e) => setPmFormName(e.target.value)}
                  placeholder="T.ex. Kort, Swish, Faktura..."
                  required
                  className="ui-inline-input"
                />
              </label>
            </div>

            {pmDeleteConfirm ? (
              <div className="ui-confirm-danger">
                <span className="font-medium text-rose-700 dark:text-rose-300">
                  Ta bort betalsättet?
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPmDeleteConfirm(false)}
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold cursor-pointer"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteMethod}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`grid gap-2 ${
                  pmSheetMode === 'edit' && paymentMethods.length > 1
                    ? 'grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {pmSheetMode === 'edit' && paymentMethods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPmDeleteConfirm(true)}
                    className="ui-btn-danger"
                  >
                    <Trash size={14} />
                    <span>Ta bort</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="ui-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Spara</span>
                </button>
              </div>
            )}
          </form>
        </BottomSheet>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: LÖNEDAG
  // ==========================================
  if (subView === 'period') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card">
          <div className="p-4 space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">Ordinarie lönedag</span>
              <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
                Den {targetPayday}:e
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const isSelected = targetPayday === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdatePayday(d)}
                    className={`py-2 rounded-xl text-xs font-display font-bold tabular-nums transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] scale-[1.03]'
                        : 'bg-[var(--bg-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="ui-row">
            <span className="text-[var(--text-muted)]">Aktuell period</span>
            <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
              {period.startLabel} – {period.endLabel}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
            Om lönedag infaller på helg
          </span>
          <div className="ui-group-card">
            {[
              {
                mode: 'before' as WeekendHandlingMode,
                title: 'Fredagen före',
              },
              {
                mode: 'after' as WeekendHandlingMode,
                title: 'Måndagen efter',
              },
              {
                mode: 'none' as WeekendHandlingMode,
                title: 'Ingen justering',
              },
            ].map((option) => {
              const isSelected = weekendHandling === option.mode;
              return (
                <button
                  key={option.mode}
                  type="button"
                  onClick={() => onUpdateWeekendHandling(option.mode)}
                  className="ui-row-btn"
                >
                  <span
                    className={
                      isSelected
                        ? 'font-bold text-[var(--text-primary)]'
                        : 'font-semibold text-[var(--text-primary)]'
                    }
                  >
                    {option.title}
                  </span>
                  {isSelected && (
                    <Check size={14} weight="bold" className="text-[var(--text-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
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
                      <div
                        key={conn.id}
                        className="ui-row"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ItemLogo
                            name={conn.aspsp_name}
                            logoUrl={conn.aspsp_logo || undefined}
                            size="md"
                          />
                          <div className="min-w-0">
                            <span className="ui-row-title">
                              {conn.aspsp_name}
                            </span>
                            {isExpired ? (
                              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium block">
                                Samtycket har gått ut · Förnya åtkomst
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium block">
                                Samtycke går ut om {computedDaysLeft} {computedDaysLeft === 1 ? 'dag' : 'dagar'}
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
                            onClick={() => onDisconnectBank(conn.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
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
                        <span className="ui-row-title">
                          {connectedBank}
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium block">
                          Ansluten
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDisconnectBank()}
                      className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                    >
                      Koppla från
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Kontolista utan råa kontonummer */}
            {accounts.length > 0 && (
              <div className="space-y-1.5">
                <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                  Konton
                </span>
                <div className="ui-group-card">
                  {accounts.map((acc) => {
                    const cleanName = stripRawAccountDigits(acc.name) || 'Bankkonto';
                    const cleanBank = stripRawAccountDigits(acc.bank || connectedBank || 'Bank');
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={onOpenBank}
                        className="ui-row-btn"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ItemLogo name={cleanBank} size="md" />
                          <div className="min-w-0 flex-1">
                            <span className="ui-row-title">
                              {cleanName}
                            </span>
                            <span className="ui-row-subtitle">
                              {cleanBank}
                            </span>
                          </div>
                        </div>
                        <span className="ui-row-amount shrink-0">
                          {formatKr(acc.balance)}
                        </span>
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
                <Bank size={15} />
                <span>Hantera konton</span>
              </button>
            </div>
          </>
        ) : (
          <div className="ui-card p-6 text-center space-y-4">
            <div className="ui-hero-icon mb-0">
              <Bank size={28} weight="duotone" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
                Ingen bank ansluten
              </h3>
              <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                Anslut din bank med Mobilt BankID för att hämta konton och köp automatiskt.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenBank}
              className="w-full ui-btn-primary"
            >
              <Bank size={15} />
              <span>Anslut bank</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: ÖVERFÖRINGAR
  // ==========================================
  if (subView === 'preferences') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-card-p">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="ui-row-title text-[13px] sm:text-sm">
                Dölj egna överföringar
              </span>
              <p className="ui-row-subtitle">
                Räknas inte med i utgifter eller inkomster.
              </p>
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
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: DATA & SÄKERHET
  // ==========================================
  if (subView === 'security') {
    return (
      <div className="ui-page animate-slide-in-right">
        <div className="ui-group-card">
          <div className="ui-row">
            <div className="min-w-0">
              <span className="ui-row-title text-[13px] sm:text-sm">
                Exportera data
              </span>
              <span className="ui-row-subtitle">
                Ladda ner som JSON-fil
              </span>
            </div>
            <button
              type="button"
              onClick={handleExportGdprData}
              className="ui-btn-sm shrink-0 flex items-center gap-1.5"
            >
              <DownloadSimple size={14} />
              <span>Exportera</span>
            </button>
          </div>

          <div className="ui-row">
            <div className="min-w-0">
              <span className="ui-row-title text-[13px] sm:text-sm">
                Prisvarningar
              </span>
              <span className="ui-row-subtitle">
                Visa dolda varningar igen
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.removeItem('dejz_dismissed_price_alerts');
                } catch {
                  // ignore
                }
                setSavedMsg(true);
                setTimeout(() => setSavedMsg(false), 2000);
              }}
              className="ui-btn-sm shrink-0"
            >
              {savedMsg ? 'Återställt!' : 'Återställ'}
            </button>
          </div>

          <div className="ui-row">
            <div className="min-w-0">
              <span className="ui-row-title text-[13px] sm:text-sm">
                Nollställ data
              </span>
              <span className="ui-row-subtitle">
                Rensa alla poster och börja om
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSecurityConfirmAction('reset')}
              className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
            >
              Nollställ
            </button>
          </div>

          <div className="ui-row">
            <div className="min-w-0">
              <span className="ui-row-title text-[13px] sm:text-sm">
                Radera konto
              </span>
              <span className="ui-row-subtitle">
                Ta bort konto och all data permanent
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSecurityConfirmAction('delete')}
              className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
            >
              Radera
            </button>
          </div>
        </div>

        <BottomSheet
          isOpen={securityConfirmAction !== null}
          onClose={() => setSecurityConfirmAction(null)}
          contentClassName="px-5 pt-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
        >
          <div className="ui-sheet-header">
            <span className="ui-sheet-title">
              {securityConfirmAction === 'delete' ? 'Radera konto' : 'Nollställ data'}
            </span>
            <button
              type="button"
              onClick={() => setSecurityConfirmAction(null)}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {securityConfirmAction === 'delete'
                ? 'Detta raderar ditt konto och all tillhörande data permanent. Åtgärden går inte att ångra.'
                : 'Detta rensar dina sparade transaktioner, fasta utgifter, inkomster och bankkopplingar.'}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSecurityConfirmAction(null)}
                className="ui-btn-secondary"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = securityConfirmAction;
                  setSecurityConfirmAction(null);
                  if (action === 'delete') {
                    onDeleteAccount();
                  } else if (action === 'reset') {
                    onResetAccount();
                  }
                }}
                className={`py-2.5 px-3 rounded-xl font-bold text-white cursor-pointer ${
                  securityConfirmAction === 'delete' ? 'bg-rose-600' : 'bg-amber-600'
                }`}
              >
                {securityConfirmAction === 'delete' ? 'Radera permanent' : 'Nollställ'}
              </button>
            </div>
          </div>
        </BottomSheet>
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
              placeholder="Beskriv vad du tänker på..."
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
  // MAIN SETTINGS & PROFILE MENU
  // ==========================================
  const initialChar = (userName || userEmail || '').trim().charAt(0);

  return (
    <div className="ui-page animate-slide-in-left">
      {hiddenAvatarInput}

      {/* 1. Clean Profile Header Card */}
      <button
        type="button"
        onClick={() => setSubView('profile')}
        className="w-full ui-card p-4 sm:p-5 flex items-center justify-between gap-3.5 text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
              {userAvatar ? (
                <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
              ) : initialChar ? (
                <span className="font-display font-bold text-base uppercase text-[var(--text-primary)]">
                  {initialChar}
                </span>
              ) : (
                <UserCircle size={26} weight="duotone" className="text-[var(--text-secondary)]" />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] border-2 border-[var(--surface-color)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              title="Byt profilbild"
            >
              <Camera size={11} weight="bold" />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
              {userName || userEmail || 'Gästkonto'}
            </h2>
            <span className="ui-row-subtitle truncate">
              {userName && userEmail ? userEmail : 'Redigera profil'}
            </span>
          </div>
        </div>

        <CaretRight
          size={15}
          className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
        />
      </button>

      {/* 2. Ekonomi */}
      <div className="ui-section">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Ekonomi
        </span>
        <div className="ui-group-card">
          {/* Bankkonton */}
          <button
            type="button"
            onClick={() => setSubView('bank')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <CreditCard size={16} />
              </div>
              <span className="ui-row-title">Bankkonton</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-medium ${
                  hasActiveBank
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {hasActiveBank ? 'Ansluten' : 'Ej ansluten'}
              </span>
              <CaretRight size={14} className="text-[var(--text-muted)]" />
            </div>
          </button>

          {/* Lönedag */}
          <button
            type="button"
            onClick={() => setSubView('period')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <CalendarBlank size={16} />
              </div>
              <span className="ui-row-title">Lönedag</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums">
                Den {targetPayday}:e
              </span>
              <CaretRight size={14} className="text-[var(--text-muted)]" />
            </div>
          </button>

          {/* Kategorier */}
          <button
            type="button"
            onClick={() => setSubView('categories')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <Tag size={16} />
              </div>
              <span className="ui-row-title">Kategorier</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          {/* Betalsätt */}
          <button
            type="button"
            onClick={() => setSubView('paymentMethods')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <Wallet size={16} />
              </div>
              <span className="ui-row-title">Betalsätt</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          {/* Överföringar */}
          <button
            type="button"
            onClick={() => setSubView('preferences')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <ArrowsLeftRight size={16} />
              </div>
              <span className="ui-row-title">Överföringar</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {excludeInternalTransfers ? 'Dolda' : 'Visas'}
              </span>
              <CaretRight size={14} className="text-[var(--text-muted)]" />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Konto & app */}
      <div className="ui-section">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Konto & app
        </span>
        <div className="ui-group-card">
          {/* Utseende */}
          <button
            type="button"
            onClick={() => applyTheme(themeMode === 'dark' ? 'light' : 'dark')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                {themeMode === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </div>
              <span className="ui-row-title">Utseende</span>
            </div>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {themeMode === 'dark' ? 'Mörkt' : 'Ljust'}
            </span>
          </button>

          {/* Skicka feedback */}
          <button
            type="button"
            onClick={() => setSubView('feedback')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <ChatCircleText size={16} />
              </div>
              <span className="ui-row-title">Skicka feedback</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          {/* Introduktion */}
          {onStartOnboarding && (
            <button
              type="button"
              onClick={onStartOnboarding}
              className="ui-row-btn"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="ui-icon-badge">
                  <Compass size={16} />
                </div>
                <span className="ui-row-title">Introduktion</span>
              </div>
              <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
          )}

          {/* Data & säkerhet */}
          <button
            type="button"
            onClick={() => setSubView('security')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <ShieldCheck size={16} />
              </div>
              <span className="ui-row-title">Data & säkerhet</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          {/* Logga in / Logga ut */}
          {userEmail ? (
            <button
              type="button"
              onClick={onSignOut}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-rose-500/5 active:scale-[0.995] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <SignOut size={16} />
                </div>
                <span className="text-[13px] sm:text-sm font-semibold text-rose-600 dark:text-rose-400">
                  Logga ut
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="ui-row-btn"
            >
              <div className="flex items-center gap-3">
                <div className="ui-icon-badge">
                  <UserCircle size={16} />
                </div>
                <span className="ui-row-title">Logga in</span>
              </div>
              <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Juridik & integritet */}
      <div className="ui-section">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Juridik & integritet
        </span>
        <div className="ui-group-card">
          <button
            type="button"
            onClick={() => setSubView('privacy')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <LockKey size={16} />
              </div>
              <span className="ui-row-title">Integritetspolicy</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSubView('terms')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <FileText size={16} />
              </div>
              <span className="ui-row-title">Användarvillkor</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSubView('psd2')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <Scales size={16} />
              </div>
              <span className="ui-row-title">Open Banking</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSubView('cookies')}
            className="ui-row-btn"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="ui-icon-badge">
                <Cookie size={16} />
              </div>
              <span className="ui-row-title">Cookies & lagring</span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="flex items-center justify-center pt-6 pb-4">
        <img
          src="/dejz_mork.png"
          alt="Dejz"
          className="h-5 w-auto object-contain opacity-60 dark:opacity-75 dark:invert"
        />
      </div>
    </div>
  );
};

