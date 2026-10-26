import React, { useState, useRef, useEffect } from 'react';
import {
  Bank,
  ArrowClockwise,
  UserCircle,
  SignOut,
  CalendarBlank,
  Camera,
  ShieldCheck,
  CreditCard,
  ArrowsLeftRight,
  Tag,
  CaretRight,
  CaretLeft,
  Compass,
  Sun,
  Moon,
  Wallet,
  Plus,
  Trash,
  PencilSimple,
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
import { TransactionItem, FixedExpenseItem, IncomeItem } from './HomeTab';
import {
  getStoredPaymentMethods,
  saveStoredPaymentMethods,
} from '../utils/appCache';
import { DEFAULT_PAYMENT_METHODS, PaymentMethodOption } from '../constants';

interface SettingsTabProps {
  period: PeriodInfo;
  connectedBank: string | null;
  connections: BankConnection[];
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
  privacy: 'Integritetspolicy (GDPR)',
  terms: 'Användarvillkor',
  psd2: 'Open Banking & PSD2',
  cookies: 'Cookies & lokal lagring',
};

export const SettingsTab: React.FC<SettingsTabProps> = ({
  period,
  connectedBank,
  connections,
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

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(() =>
    getStoredPaymentMethods()
  );
  const [newMethodName, setNewMethodName] = useState('');
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);
  const [editingMethodName, setEditingMethodName] = useState('');

  // Feedback state
  const [feedbackType, setFeedbackType] = useState<'idea' | 'bug' | 'praise'>('idea');
  const [feedbackMessage, setFeedbackMessage] = useState('');
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
      root.style.backgroundColor = '#F2F0F0';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAvatar) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
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

  const renderSubViewHeader = (_title: string) => null;

  // ==========================================
  // SUB-VIEW: PROFILE (utan "Utseende")
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
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Profil')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-subtle)]">
            <div className="relative group shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] overflow-hidden flex items-center justify-center">
                {userAvatar ? (
                  <img src={userAvatar} alt="Profil" className="w-full h-full object-cover" />
                ) : initialChar ? (
                  <span className="font-display font-bold text-lg uppercase text-[var(--text-primary)]">
                    {initialChar}
                  </span>
                ) : (
                  <UserCircle size={32} weight="duotone" className="text-[var(--text-secondary)]" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                title="Byt profilbild"
              >
                <Camera size={12} weight="bold" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-bold text-sm text-[var(--text-primary)] truncate">
                {userName || userEmail || 'Gästkonto'}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                {userEmail || 'Lokalt läge'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                Namn
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ditt förnamn"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                E-post
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="namn@exempel.se"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
              />
            </div>

            {savedMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center animate-fade-in">
                Sparat!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
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
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Kategorier')}
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
    const handleAddPaymentMethod = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = newMethodName.trim();
      if (!trimmed) return;
      if (paymentMethods.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
        setNewMethodName('');
        return;
      }
      const next: PaymentMethodOption[] = [
        ...paymentMethods,
        { id: `pm-${Date.now()}`, name: trimmed, isCustom: true },
      ];
      setPaymentMethods(next);
      saveStoredPaymentMethods(next);
      setNewMethodName('');
    };

    const handleSaveEditMethod = (id: string) => {
      const trimmed = editingMethodName.trim();
      if (!trimmed) return;
      const next = paymentMethods.map((m) =>
        m.id === id ? { ...m, name: trimmed } : m
      );
      setPaymentMethods(next);
      saveStoredPaymentMethods(next);
      setEditingMethodId(null);
      setEditingMethodName('');
    };

    const handleDeleteMethod = (id: string) => {
      if (paymentMethods.length <= 1) return;
      const next = paymentMethods.filter((m) => m.id !== id);
      setPaymentMethods(next);
      saveStoredPaymentMethods(next);
    };

    const handleResetMethods = () => {
      setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      saveStoredPaymentMethods(DEFAULT_PAYMENT_METHODS);
    };

    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Betalsätt')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5 space-y-4">
          <form onSubmit={handleAddPaymentMethod} className="flex items-center gap-2">
            <input
              type="text"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Lägg till eget betalsätt (t.ex. Qliro, Kontant)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
            />
            <button
              type="submit"
              disabled={!newMethodName.trim()}
              className="px-3.5 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center gap-1.5 hover:opacity-90 disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Plus size={14} weight="bold" />
              <span>Lägg till</span>
            </button>
          </form>

          <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {paymentMethods.map((method) => {
              const isEditing = editingMethodId === method.id;
              return (
                <div
                  key={method.id}
                  className="py-3 first:pt-3 last:pb-0 flex items-center justify-between gap-3 text-xs"
                >
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingMethodName}
                        onChange={(e) => setEditingMethodName(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditMethod(method.id)}
                        className="p-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-color)] cursor-pointer"
                      >
                        <Check size={13} weight="bold" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingMethodId(null)}
                        className="p-1.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Wallet size={16} className="text-[var(--text-secondary)] shrink-0" />
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {method.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMethodId(method.id);
                            setEditingMethodName(method.name);
                          }}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-color)] transition-colors cursor-pointer"
                          title="Byt namn"
                        >
                          <PencilSimple size={14} />
                        </button>
                        {paymentMethods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMethod(method.id)}
                            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Ta bort"
                          >
                            <Trash size={14} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
            <button
              type="button"
              onClick={handleResetMethods}
              className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Återställ svenska standardbetalsätt
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: LÖNEDAG
  // ==========================================
  if (subView === 'period') {
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Lönedag')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-primary)] block">
              Ordinarie lönedag
            </label>
            <select
              value={targetPayday}
              onChange={(e) => onUpdatePayday(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Den {d}:e {d === 25 ? '(Standard)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-primary)] block">
              Om lönedag är på helg
            </label>
            <div className="grid grid-cols-1 gap-2">
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
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--surface-raised)] border-[var(--text-primary)]'
                        : 'bg-[var(--bg-color)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {option.title}
                    </span>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                          : 'border-[var(--text-muted)]'
                      }`}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--bg-color)]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">Aktuell period</span>
            <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
              {period.startLabel} – {period.endLabel}
            </span>
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
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Bankkonton')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Status
            </span>
            <span
              className={`text-xs font-semibold ${
                hasActiveBank
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {hasActiveBank ? 'Ansluten' : 'Ej ansluten'}
            </span>
          </div>

          {connections.length > 0 && (
            <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block">
                      {conn.aspsp_name}
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {conn.status === 'active' ? 'Autosynk aktiv' : conn.status}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDisconnectBank(conn.id)}
                    className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    Koppla från
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-1 flex items-center gap-2">
            {hasActiveBank && (
              <button
                type="button"
                onClick={onSyncBank}
                disabled={syncingBank}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] disabled:opacity-50 cursor-pointer"
              >
                <ArrowClockwise size={14} className={syncingBank ? 'animate-spin' : ''} />
                <span>{syncingBank ? 'Synkar...' : 'Synka'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenBank}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Bank size={15} />
              <span>{hasActiveBank ? 'Hantera' : 'Anslut bank'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: ÖVERFÖRINGAR
  // ==========================================
  if (subView === 'preferences') {
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Överföringar')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Dölj egna överföringar
              </span>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Räknas inte som utgift eller inkomst i budgeten.
              </p>
            </div>
            {onToggleExcludeInternalTransfers && (
              <button
                type="button"
                role="switch"
                aria-checked={excludeInternalTransfers}
                onClick={() => onToggleExcludeInternalTransfers(!excludeInternalTransfers)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  excludeInternalTransfers
                    ? 'bg-[var(--text-primary)]'
                    : 'bg-[var(--border-subtle)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--bg-color)] ring-0 transition duration-200 ease-in-out ${
                    excludeInternalTransfers ? 'translate-x-5' : 'translate-x-0'
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
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Data & säkerhet')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="p-4 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-[var(--text-primary)] block">
                Exportera min data (GDPR)
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                Ladda ner all din sparade information som JSON-fil
              </span>
            </div>
            <button
              type="button"
              onClick={handleExportGdprData}
              className="px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-semibold hover:bg-[var(--surface-hover)] transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <DownloadSimple size={14} />
              <span>Exportera</span>
            </button>
          </div>

          <div className="p-4 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-[var(--text-primary)] block">
                Nollställ data
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                Rensa alla transaktioner och börja om
              </span>
            </div>
            <button
              type="button"
              onClick={onResetAccount}
              className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-colors cursor-pointer shrink-0"
            >
              Nollställ
            </button>
          </div>

          <div className="p-4 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="font-semibold text-[var(--text-primary)] block">
                Radera konto
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                Ta bort konto och all data permanent (Rätten att bli glömd)
              </span>
            </div>
            <button
              type="button"
              onClick={onDeleteAccount}
              className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold hover:bg-rose-500/20 transition-colors cursor-pointer shrink-0"
            >
              Radera
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: SKICKA FEEDBACK
  // ==========================================
  if (subView === 'feedback') {
    const handleSendFeedback = (e: React.FormEvent) => {
      e.preventDefault();
      if (!feedbackMessage.trim()) return;
      try {
        const prev = JSON.parse(localStorage.getItem('dejz_user_feedback') || '[]');
        prev.unshift({
          id: Date.now(),
          type: feedbackType,
          message: feedbackMessage.trim(),
          userEmail: userEmail || 'anonym',
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('dejz_user_feedback', JSON.stringify(prev.slice(0, 50)));
      } catch {
        // ignore
      }
      setFeedbackSent(true);
      setFeedbackMessage('');
      setTimeout(() => setFeedbackSent(false), 3500);
    };

    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Skicka feedback')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Har du ett förslag på hur Dejz kan bli bättre, eller har du hittat något som
            kan slipas till? Skicka gärna dina tankar direkt till oss.
          </p>

          <form onSubmit={handleSendFeedback} className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)]">
              {[
                { id: 'idea' as const, label: 'Förslag' },
                { id: 'bug' as const, label: 'Bugg' },
                { id: 'praise' as const, label: 'Beröm' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFeedbackType(t.id)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    feedbackType === t.id
                      ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                Ditt meddelande
              </label>
              <textarea
                rows={4}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Beskriv vad du tänker på..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] resize-none"
              />
            </div>

            {feedbackSent && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center animate-fade-in">
                Tack för din feedback! Vi läser allt som skickas in.
              </div>
            )}

            <button
              type="submit"
              disabled={!feedbackMessage.trim()}
              className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
            >
              <PaperPlaneTilt size={15} weight="bold" />
              <span>Skicka feedback</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: INTEGRITETSPOLICY (GDPR)
  // ==========================================
  if (subView === 'privacy') {
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Integritetspolicy (GDPR)')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              1. Personuppgiftsansvar
            </h3>
            <p>
              Dejz behandlar dina personuppgifter i enlighet med EU:s dataskyddsförordning
              (GDPR, 2016/679) samt svensk kompletterande dataskyddslagstiftning
              (Lag 2018:218).
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              2. Vilka uppgifter som behandlas
            </h3>
            <p>
              Vi behandlar endast de uppgifter som krävs för att ge dig en sammanställning av
              din ekonomi: kontouppgifter (e-post, namn), lönedagsinställningar, manuellt
              inlagda poster samt de bankkonton och transaktioner du uttryckligen ger
              samtycke till att hämta via Open Banking (PSD2).
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              3. Ändamål och rättslig grund
            </h3>
            <p>
              Behandlingen sker med stöd av avtal (Artikel 6.1 b GDPR) för att leverera
              tjänsten samt uttryckligt samtycke (Artikel 6.1 a GDPR) vid hämtning av
              kontoinformation via licensierad kontoinformationstjänst (AISP). Vi säljer
              aldrig dina uppgifter vidare till tredje part.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              4. Dina rättigheter enligt GDPR
            </h3>
            <p>
              Du har rätt till registerutdrag (dataportabilitet), rättelse, begränsning av
              behandling samt rätten att bli glömd (radering). Under{' '}
              <span className="font-semibold text-[var(--text-primary)]">Data & säkerhet</span>{' '}
              kan du när som helst exportera all din data eller radera ditt konto permanent
              med omedelbar verkan. Du har även rätt att lämna klagomål till
              Integritetsskyddsmyndigheten (IMY).
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
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Användarvillkor')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              1. Om tjänsten
            </h3>
            <p>
              Dejz är ett digitalt verktyg för personlig ekonomiöversikt och
              löneperiodsbudgetering. Tjänsten tillhandahålls i befintligt skick för
              privat bruk.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              2. Ingen finansiell rådgivning
            </h3>
            <p>
              Information, sammanställningar och prognoser i Dejz utgör inte finansiell,
              juridisk eller skattemässig rådgivning enligt lagen (2003:862) om finansiell
              rådgivning till konsumenter. Samtliga ekonomiska beslut fattas av dig som
              användare.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              3. Avslutande av konto & tillämplig lag
            </h3>
            <p>
              Du kan när som helst avsluta ditt konto utan uppsägningstid under Inställningar.
              Svensk lag tillämpas på dessa villkor och eventuell tvist avgörs av svensk
              allmän domstol eller Allmänna reklamationsnämnden (ARN).
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: OPEN BANKING & PSD2
  // ==========================================
  if (subView === 'psd2') {
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Open Banking & PSD2')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              Säker bankanslutning (PSD2)
            </h3>
            <p>
              Bankkopplingar sker via Enable Banking i enlighet med EU:s andra
              betaltjänstdirektiv (PSD2) och lagen (2010:751) om betaltjänster. Autentisering
              sker alltid direkt mot din bank med Mobilt BankID.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              Endast läsrättigheter (Read-only)
            </h3>
            <p>
              Dejz har uteslutande läsrättigheter till dina valda konton och transaktioner.
              Appen kan aldrig flytta pengar, genomföra betalningar eller ändra något i din
              internetbank.
            </p>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              90-dagarssamtycke & återkallelse
            </h3>
            <p>
              Enligt PSD2-regelverket gäller ett banksamtycke i högst 90 dagar åt gången. Du
              kan när som helst återkalla ditt samtycke omedelbart under{' '}
              <span className="font-semibold text-[var(--text-primary)]">Bankkonton</span>{' '}
              genom att välja Koppla från.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SUB-VIEW: COOKIES & LOKAL LAGRING (LEK)
  // ==========================================
  if (subView === 'cookies') {
    return (
      <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
        {renderSubViewHeader('Cookies & lokal lagring')}

        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              Tekniskt nödvändig lagring (LEK)
            </h3>
            <p>
              Enligt lagen (2022:482) om elektronisk kommunikation (LEK) informerar vi om hur
              information lagras i din enhet. Dejz använder uteslutande tekniskt nödvändig
              lokal lagring (localStorage och sessionscookies) för att:
            </p>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              <li>Hålla dig inloggad på ett säkert sätt</li>
              <li>Spara ditt val av ljust/mörkt utseende och lönedag</li>
              <li>Spara dina egna kategorier och betalsätt</li>
            </ul>
          </div>

          <div>
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] mb-1">
              Inga spårnings- eller reklamcookies
            </h3>
            <p>
              Dejz använder inga tredjepartscookies för annonsering, profilering eller
              kommersiell spårning över webbplatser.
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
    <div className="space-y-4 pb-36 sm:pb-40 animate-fade-in">
      {/* 1. Clean Profile Header Card */}
      <button
        type="button"
        onClick={() => setSubView('profile')}
        className="w-full bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-3.5 text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
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
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
              title="Byt profilbild"
            >
              <Camera size={11} weight="bold" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-display font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
              {userName || userEmail || 'Gästkonto'}
            </h2>
            <span className="text-xs text-[var(--text-muted)] block mt-0.5 truncate">
              {userName && userEmail ? userEmail : 'Redigera profil'}
            </span>
          </div>
        </div>

        <CaretRight
          size={16}
          className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0"
        />
      </button>

      {/* 2. Ekonomi */}
      <div className="space-y-1.5">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Ekonomi
        </span>
        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden divide-y divide-[var(--border-subtle)]">
          {/* Bankkonton */}
          <button
            type="button"
            onClick={() => setSubView('bank')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CreditCard size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Bankkonton
              </span>
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
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CalendarBlank size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Lönedag
              </span>
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
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Tag size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Kategorier
              </span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          {/* Betalsätt */}
          <button
            type="button"
            onClick={() => setSubView('paymentMethods')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Wallet size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Betalsätt
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums">
                {paymentMethods.length} st
              </span>
              <CaretRight size={14} className="text-[var(--text-muted)]" />
            </div>
          </button>

          {/* Överföringar */}
          <button
            type="button"
            onClick={() => setSubView('preferences')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ArrowsLeftRight size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Överföringar
              </span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>
        </div>
      </div>

      {/* 3. Konto & support */}
      <div className="space-y-1.5">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Konto & app
        </span>
        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden divide-y divide-[var(--border-subtle)]">
          {/* Utseende (Snabbväxling Ljust / Mörkt) */}
          <button
            type="button"
            onClick={() => applyTheme(themeMode === 'dark' ? 'light' : 'dark')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {themeMode === 'dark' ? (
                <Moon size={18} className="text-[var(--text-secondary)] shrink-0" />
              ) : (
                <Sun size={18} className="text-[var(--text-secondary)] shrink-0" />
              )}
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Utseende
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-[var(--text-muted)]">
                {themeMode === 'dark' ? 'Mörkt' : 'Ljust'}
              </span>
              <CaretRight size={14} className="text-[var(--text-muted)]" />
            </div>
          </button>

          {/* Skicka feedback */}
          <button
            type="button"
            onClick={() => setSubView('feedback')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ChatCircleText size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Skicka feedback
              </span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          {/* Onboarding */}
          {onStartOnboarding && (
            <button
              type="button"
              onClick={onStartOnboarding}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Compass size={18} className="text-[var(--text-secondary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Kör onboarding
                </span>
              </div>
              <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
          )}

          {/* Data & säkerhet */}
          <button
            type="button"
            onClick={() => setSubView('security')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ShieldCheck size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Data & säkerhet
              </span>
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
                <SignOut size={18} className="text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Logga ut
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <UserCircle size={18} className="text-[var(--text-secondary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Logga in
                </span>
              </div>
              <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Juridik & integritet (Svenska lagar & regler) */}
      <div className="space-y-1.5">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
          Juridik & integritet
        </span>
        <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden divide-y divide-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setSubView('privacy')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <LockKey size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Integritetspolicy (GDPR)
              </span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSubView('terms')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <FileText size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Användarvillkor
              </span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSubView('psd2')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Scales size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Open Banking & PSD2
              </span>
            </div>
            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setSubView('cookies')}
            className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-[var(--surface-hover)] active:scale-[0.995] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Cookie size={18} className="text-[var(--text-secondary)] shrink-0" />
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                Cookies & lokal lagring
              </span>
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
