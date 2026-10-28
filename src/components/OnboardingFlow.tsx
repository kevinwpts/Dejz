import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Plus,
  Trash,
  Check,
  PencilSimple,
  X,
  MagnifyingGlass,
  ShieldCheck,
  CalendarCheck,
  ArrowSquareOut,
  SpinnerGap,
  ArrowClockwise,
  WarningCircle,
} from '@phosphor-icons/react';
import { IncomeItem, FixedExpenseItem } from './HomeTab';
import {
  bankService,
  BankAspsp,
  BankConnection,
  BankAccount,
  SWEDISH_BANKS_CATALOG,
} from '../services/bankService';
import { WeekendHandlingMode } from '../utils/periodEngine';
import { ItemLogo } from './ItemLogo';
import { BottomSheet } from './ui/BottomSheet';
import { DayOfMonthPicker } from './ui/DayOfMonthPicker';

export const POPULAR_SWEDISH_BANKS: { id: string; name: string; displayName: string }[] = [
  { id: 'swedbank', name: 'Swedbank', displayName: 'Swedbank' },
  { id: 'handelsbanken', name: 'Handelsbanken', displayName: 'Handelsbanken' },
  { id: 'seb', name: 'SEB', displayName: 'SEB' },
  { id: 'nordea', name: 'Nordea', displayName: 'Nordea' },
  { id: 'lansforsakringar', name: 'Länsförsäkringar Bank', displayName: 'Länsförsäkringar' },
  { id: 'danske', name: 'Danske Bank', displayName: 'Danske Bank' },
  { id: 'icabanken', name: 'ICA Banken', displayName: 'ICA Banken' },
  { id: 'sbab', name: 'SBAB', displayName: 'SBAB' },
  { id: 'avanza', name: 'Avanza', displayName: 'Avanza' },
];

interface OnboardingFlowProps {
  initialName: string;
  targetPayday?: number;
  initialWeekendHandling?: WeekendHandlingMode;
  onUpdateWeekendHandling?: (mode: WeekendHandlingMode) => void;
  connections: BankConnection[];
  bankAccounts?: BankAccount[];
  onBankStateUpdated?: (connections: BankConnection[], accounts: BankAccount[]) => void;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  onSaveName: (name: string) => void;
  onUpdatePayday?: (day: number) => void;
  onOpenBankModal?: (bankName?: string) => void;
  onAddIncome: (item: Omit<IncomeItem, 'id'>) => void;
  onUpdateIncome?: (item: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
  onAddFixed: (item: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdateFixed?: (item: FixedExpenseItem) => void;
  onDeleteFixed: (id: string) => void;
  onComplete: () => void;
  onBackToLanding?: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4;

interface SheetEditorState {
  mode: 'add' | 'edit';
  type: 'income' | 'fixed';
  id?: string;
  name: string;
  amount: string;
  day: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialName,
  targetPayday = 25,
  initialWeekendHandling = 'before',
  onUpdateWeekendHandling,
  connections,
  bankAccounts: _bankAccounts = [],
  onBankStateUpdated,
  incomes,
  fixedExpenses,
  onSaveName,
  onUpdatePayday,
  onOpenBankModal: _onOpenBankModal,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  onAddFixed,
  onUpdateFixed,
  onDeleteFixed,
  onComplete,
  onBackToLanding,
}) => {
  const [step, setStep] = useState<OnboardingStep>(() => {
    try {
      const savedStep = Number(localStorage.getItem('dejz_onboarding_step'));
      if (savedStep >= 1 && savedStep <= 4) {
        return savedStep as OnboardingStep;
      }
    } catch {
      // ignore
    }
    return 1;
  });
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState<string>(() => {
    if (initialName) return initialName;
    try {
      return localStorage.getItem('dejz_user_name') || '';
    } catch {
      return '';
    }
  });
  const [payday, setPayday] = useState<number>(() => {
    if (targetPayday) return targetPayday;
    try {
      const saved = Number(localStorage.getItem('dejz_target_payday'));
      if (saved >= 1 && saved <= 31) return saved;
    } catch {
      // ignore
    }
    return 25;
  });
  const [weekendHandling, setWeekendHandling] = useState<WeekendHandlingMode>(() => {
    if (initialWeekendHandling) return initialWeekendHandling;
    try {
      const saved = localStorage.getItem('dejz_weekend_handling');
      if (saved === 'before' || saved === 'after' || saved === 'exact') return saved;
    } catch {
      // ignore
    }
    return 'before';
  });

  useEffect(() => {
    try {
      localStorage.setItem('dejz_onboarding_in_progress', 'true');
      localStorage.setItem('dejz_onboarding_step', String(step));
    } catch {
      // ignore
    }
  }, [step]);

  // Steg 3: Inline bank anslutning och vyer direkt på sidan
  const [step3View, setStep3View] = useState<'grid' | 'search' | 'authorizing' | 'select-accounts'>('grid');
  const [selectedBank, setSelectedBank] = useState<BankAspsp | null>(null);
  const [startingAuth, setStartingAuth] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authState, setAuthState] = useState<string | null>(null);
  const [showManualCallback, setShowManualCallback] = useState(false);
  const [manualCallbackUrl, setManualCallbackUrl] = useState('');
  const [exchangingCode, setExchangingCode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allBanks, setAllBanks] = useState<BankAspsp[]>(SWEDISH_BANKS_CATALOG);
  const [loadingAllBanks, setLoadingAllBanks] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  // Kontoval efter lyckad autentisering
  const [fetchedAccounts, setFetchedAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [accountCustomNames, setAccountCustomNames] = useState<Record<string, string>>({});
  const [activeConnection, setActiveConnection] = useState<BankConnection | null>(null);
  const [savingAccounts, setSavingAccounts] = useState(false);

  // BottomSheet editor state for Step 4 (replaces cramped inline forms)
  const [sheetEditor, setSheetEditor] = useState<SheetEditorState | null>(null);
  const [sheetSubView, setSheetSubView] = useState<'main' | 'day-picker'>('main');
  const [sheetNavDir, setSheetNavDir] = useState<'forward' | 'back'>('forward');

  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName, name]);

  // Starta BankID-autentisering direkt på sidan
  const handleSelectBankInline = async (
    bank: BankAspsp | { name: string; country?: string; logo?: string | null }
  ) => {
    setSelectedBank({
      name: bank.name,
      country: bank.country || 'SE',
      logo: bank.logo || null,
      bic: null,
    });
    setStartingAuth(true);
    setAuthError(null);
    setShowManualCallback(false);
    setManualCallbackUrl('');
    setStep3View('authorizing');

    let safetyTimer: any = null;
    const timeoutPromise = new Promise((_, reject) => {
      safetyTimer = setTimeout(() => {
        reject(new Error('Initieringen tog för lång tid. Kontrollera din anslutning och försök igen.'));
      }, 14000);
    });

    try {
      const redirectUrl = `${window.location.origin}/bank/callback`;
      const authPromise = bankService.startAuth({
        aspspName: bank.name,
        aspspCountry: bank.country || 'SE',
        aspspLogo: bank.logo || null,
        originContext: 'onboarding',
        environment: 'production',
        redirectUrl,
      });

      const res = (await Promise.race([authPromise, timeoutPromise])) as any;
      if (safetyTimer) clearTimeout(safetyTimer);

      setAuthUrl(res.url);
      setAuthState(res.state);

      const isInIframe = window.self !== window.top;
      if (!isInIframe) {
        window.location.assign(res.url);
      }
    } catch (err: any) {
      if (safetyTimer) clearTimeout(safetyTimer);
      setAuthError(err.message || 'Kunde inte starta autentisering mot banken.');
    } finally {
      setStartingAuth(false);
    }
  };

  // Poll status när fönstret återfår fokus under bankinloggning
  useEffect(() => {
    if (step !== 3 || step3View !== 'authorizing') return;
    const handleFocus = async () => {
      try {
        const status = await bankService.getStatus();
        if (status.connections.length > connections.length || status.accounts.length > 0) {
          if (onBankStateUpdated) {
            onBankStateUpdated(status.connections, status.accounts);
          }
          const newestConn = status.connections[0];
          if (newestConn) {
            const connAccounts = status.accounts.filter((a) => a.connection_id === newestConn.id);
            if (connAccounts.length > 0) {
              setActiveConnection(newestConn);
              setFetchedAccounts(connAccounts);
              const selIds = connAccounts.filter((a) => a.is_selected !== false).map((a) => a.id);
              setSelectedAccountIds(selIds.length > 0 ? selIds : connAccounts.map((a) => a.id));
              const nameMap: Record<string, string> = {};
              connAccounts.forEach((a, idx) => {
                nameMap[a.id] = a.custom_name || (idx === 0 ? 'Lönekonto' : 'Sparkonto');
              });
              setAccountCustomNames(nameMap);
              setStep3View('select-accounts');
            } else {
              navigateStep(4, 'forward');
            }
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [step, step3View, connections.length, onBankStateUpdated]);

  // Manuell länk för callback i iframe/annan flik
  const handleExchangeManualCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCallbackUrl.trim()) return;
    setExchangingCode(true);
    setAuthError(null);

    try {
      let code = '';
      let state = authState || '';

      if (manualCallbackUrl.includes('code=')) {
        const urlObj = new URL(
          manualCallbackUrl.startsWith('http')
            ? manualCallbackUrl.trim()
            : `https://dejz.se/bank/callback?${manualCallbackUrl.trim()}`
        );
        code = urlObj.searchParams.get('code') || '';
        state = urlObj.searchParams.get('state') || state;
      } else {
        code = manualCallbackUrl.trim();
      }

      if (!code || !state) {
        throw new Error('Kunde inte hitta verifieringskod i länken.');
      }

      const res = await bankService.exchangeCode({ code, state });
      setActiveConnection(res.connection);
      const accs = res.accounts || [];
      setFetchedAccounts(accs);
      setSelectedAccountIds(accs.map((a) => a.id));
      const nameMap: Record<string, string> = {};
      accs.forEach((a, idx) => {
        nameMap[a.id] = a.custom_name || (idx === 0 ? 'Lönekonto' : 'Sparkonto');
      });
      setAccountCustomNames(nameMap);
      setStep3View('select-accounts');

      const status = await bankService.getStatus();
      if (onBankStateUpdated) {
        onBankStateUpdated(status.connections, status.accounts);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Kunde inte slutföra bankkopplingen.');
    } finally {
      setExchangingCode(false);
    }
  };

  // Spara valda konton och gå till steg 4
  const handleSaveSelectedAccounts = async () => {
    if (!activeConnection) {
      navigateStep(4, 'forward');
      return;
    }
    setSavingAccounts(true);
    try {
      for (const acc of fetchedAccounts) {
        const customName = accountCustomNames[acc.id]?.trim();
        if (customName !== undefined) {
          bankService.saveAccountOverlay(acc.id, { custom_name: customName });
        }
      }
      if (selectedAccountIds.length > 0) {
        await bankService
          .selectAccounts({
            connectionId: activeConnection.id,
            selectedAccountIds,
          })
          .catch(() => {});
      }
      const status = await bankService.getStatus();
      if (onBankStateUpdated) {
        onBankStateUpdated(status.connections, status.accounts);
      }
    } finally {
      setSavingAccounts(false);
      navigateStep(4, 'forward');
    }
  };

  // Öppna sökning bland alla banker direkt på sidan
  const handleOpenSearchBanks = () => {
    setStep3View('search');
    setBankSearchQuery('');
    if (allBanks.length === 0) {
      setAllBanks(SWEDISH_BANKS_CATALOG);
    }
    setLoadingAllBanks(false);
  };

  const toggleAccountSelection = (accId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  const hasConnectedBank = connections.length > 0;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const navigateStep = (next: OnboardingStep, dir: 'forward' | 'back') => {
    try {
      localStorage.setItem('dejz_onboarding_in_progress', 'true');
      localStorage.setItem('dejz_onboarding_step', String(next));
    } catch {
      // ignore
    }
    setSlideDir(dir);
    setStep(next);
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('dejz_user_name', trimmed);
    } catch {
      // ignore
    }
    onSaveName(trimmed);
    navigateStep(2, 'forward');
  };

  const handleNextFromStep2 = () => {
    try {
      localStorage.setItem('dejz_target_payday', String(payday));
      localStorage.setItem('dejz_weekend_handling', weekendHandling);
    } catch {
      // ignore
    }
    if (onUpdatePayday) {
      onUpdatePayday(payday);
    }
    if (onUpdateWeekendHandling) {
      onUpdateWeekendHandling(weekendHandling);
    }
    navigateStep(3, 'forward');
  };

  const openAddSheet = (type: 'income' | 'fixed') => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'add',
      type,
      name: '',
      amount: '',
      day: type === 'income' ? payday || 25 : 27,
      category: type === 'income' ? 'Lön' : 'Räkningar',
      paymentMethod: type === 'fixed' ? 'Autogiro' : undefined,
    });
  };

  const openEditIncomeSheet = (inc: IncomeItem) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'income',
      id: inc.id,
      name: inc.name,
      amount: String(Math.round(inc.amount)),
      day: inc.payday || payday || 25,
      category: inc.category || 'Lön',
      logo: inc.logo,
    });
  };

  const openEditFixedSheet = (exp: FixedExpenseItem) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'fixed',
      id: exp.id,
      name: exp.name,
      amount: String(Math.round(exp.amount)),
      day: exp.dueDay || 27,
      category: exp.category || 'Räkningar',
      paymentMethod: exp.paymentMethod || 'Autogiro',
      logo: exp.logo,
    });
  };

  const handleSaveSheet = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetEditor) return;

    const cleanTitle = sheetEditor.name.trim();
    const cleanAmt = Math.max(0, Math.round(Number(sheetEditor.amount) || 0));
    const cleanDay = Math.min(31, Math.max(1, Number(sheetEditor.day) || 25));

    if (!cleanTitle || cleanAmt <= 0) return;

    if (sheetEditor.type === 'income') {
      if (sheetEditor.mode === 'add') {
        onAddIncome({
          name: cleanTitle,
          amount: cleanAmt,
          payday: cleanDay,
          category: sheetEditor.category || 'Lön',
        });
      } else if (sheetEditor.id && onUpdateIncome) {
        const existing = incomes.find((i) => i.id === sheetEditor.id);
        if (existing) {
          onUpdateIncome({
            ...existing,
            name: cleanTitle,
            amount: cleanAmt,
            payday: cleanDay,
          });
        }
      }
    } else {
      if (sheetEditor.mode === 'add') {
        onAddFixed({
          name: cleanTitle,
          amount: cleanAmt,
          dueDay: cleanDay,
          category: sheetEditor.category || 'Räkningar',
          paymentMethod: sheetEditor.paymentMethod || 'Autogiro',
        });
      } else if (sheetEditor.id && onUpdateFixed) {
        const existing = fixedExpenses.find((f) => f.id === sheetEditor.id);
        if (existing) {
          onUpdateFixed({
            ...existing,
            name: cleanTitle,
            amount: cleanAmt,
            dueDay: cleanDay,
          });
        }
      }
    }

    setSheetEditor(null);
  };

  const handleDeleteFromSheet = () => {
    if (!sheetEditor || !sheetEditor.id) return;
    if (sheetEditor.type === 'income') {
      onDeleteIncome(sheetEditor.id);
    } else {
      onDeleteFixed(sheetEditor.id);
    }
    setSheetEditor(null);
  };

  const totalInc = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalFix = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
  const kvarAttSpendera = Math.max(0, totalInc - totalFix);

  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] font-sans overflow-x-hidden">
      {/* Top Progress Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between h-10">
          <button
            type="button"
            onClick={() => {
              if (step === 3 && step3View !== 'grid') {
                setStep3View('grid');
                setAuthError(null);
                return;
              }
              if (step > 1) {
                navigateStep((step - 1) as OnboardingStep, 'back');
              } else if (onBackToLanding) {
                onBackToLanding();
              }
            }}
            className="p-1.5 -ml-1.5 text-[var(--text-primary)] flex items-center justify-center hover:opacity-70 active:scale-95 transition-all cursor-pointer"
            aria-label="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" />
          </button>

          <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
            Steg {step} av 4
          </span>

          <div className="w-6" />
        </div>

        {/* Minimal 4-step bar */}
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-colors duration-300 ${
                s <= step ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-subtle)]'
              }`}
            />
          ))}
        </div>
      </header>

      {/* ============================================================== */}
      {/* STEG 1: ENDAST FÖRNAMN ("One question per screen")             */}
      {/* ============================================================== */}
      {step === 1 && (
        <form
          key="step-1"
          onSubmit={handleNextFromStep1}
          className={`flex-1 flex flex-col justify-between py-8 ${pageAnimClass}`}
        >
          <div className="my-auto">
            <div className="mb-8">
              <h1 className="font-display font-semibold text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                Vad heter du?
              </h1>
            </div>

            <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] focus-within:border-[var(--text-primary)] rounded-3xl px-5 py-4 transition-colors">
              <input
                type="text"
                autoFocus
                required
                placeholder="Skriv ditt förnamn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-0 p-0 font-display font-semibold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-35 transition-all cursor-pointer"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>
      )}

      {/* ============================================================== */}
      {/* STEG 2: LÖNEDAG MED SNABBALTERNATIV, KALENDER & HELGHANTERING  */}
      {/* ============================================================== */}
      {step === 2 && (
        <div
          key="step-2"
          className={`flex-1 flex flex-col justify-between py-6 ${pageAnimClass}`}
        >
          <div className="my-auto">
            <div className="mb-8">
              <h1 className="font-display font-semibold text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                När får du lön?
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                Välj din ordinarie lönedag så räknar Dejz ut din period och dagsbudget.
              </p>
            </div>

            <div className="space-y-3">
              {/* Tre snabbalternativ för de vanligaste lönedagarna */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { day: 25, label: 'Den 25:e' },
                  { day: 27, label: 'Den 27:e' },
                  { day: 31, label: 'Sista dagen' },
                ].map((preset) => {
                  const isSelected = payday === preset.day;
                  return (
                    <button
                      key={preset.day}
                      type="button"
                      onClick={() => setPayday(preset.day)}
                      className={`py-3.5 px-3 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs ${
                        isSelected
                          ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] shadow-sm'
                          : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)] text-[var(--text-primary)]'
                      }`}
                    >
                      <span className="font-display font-bold text-sm sm:text-[15px] leading-tight">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Kalender / Datumväljare */}
              <DayOfMonthPicker
                selectedDay={payday}
                onSelectDay={setPayday}
                mode="payday"
                showHeader={false}
              />

              {/* Helghantering - på som standard */}
              <div className="p-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <CalendarCheck size={16} weight="duotone" className="text-[var(--text-primary)] shrink-0" />
                    <span className="font-display font-semibold text-[13px] sm:text-sm text-[var(--text-primary)]">
                      Helghantering
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5 leading-snug">
                    Fredagen före om lönedagen infaller på helg
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={weekendHandling === 'before'}
                  onClick={() => setWeekendHandling((prev) => (prev === 'before' ? 'none' : 'before'))}
                  className={`ui-switch ${weekendHandling === 'before' ? 'ui-switch-on' : 'ui-switch-off'}`}
                >
                  <span
                    className={`ui-switch-thumb ${
                      weekendHandling === 'before' ? 'ui-switch-thumb-on' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3">
            <button
              type="button"
              onClick={handleNextFromStep2}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 3: ENABLE BANKING (Stora loggor direkt i vyn)             */}
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* STEG 3: KOPPLA BANK (Helt inline på sidan utan modal)          */}
      {/* ============================================================== */}
      {step === 3 && (
        <div
          key="step-3"
          className={`flex-1 flex flex-col justify-between py-6 ${pageAnimClass}`}
        >
          {/* SUB-VIEW 1: BANKID AUTENTISERING INLINE */}
          {step3View === 'authorizing' && (
            <div className="my-auto">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-3">
                  <ItemLogo
                    name={selectedBank?.name || 'Bank'}
                    logoUrl={selectedBank?.logo || undefined}
                    size="xl"
                  />
                </div>
                <h1 className="font-display font-semibold text-2xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Anslut {selectedBank?.name || 'bank'}
                </h1>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto mt-2 leading-relaxed">
                  Legitimera dig med Mobilt BankID för att hämta dina konton och transaktioner till Dejz.
                </p>
              </div>

              {startingAuth ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl">
                  <SpinnerGap size={28} className="animate-spin text-[var(--text-primary)]" />
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Initierar anslutning till {selectedBank?.name}...
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {authUrl && (
                    <div className="space-y-3">
                      <a
                        href={authUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-xs"
                      >
                        <span>Öppna BankID ({selectedBank?.name})</span>
                        <ArrowSquareOut size={16} weight="bold" />
                      </a>

                      <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] py-1">
                        <SpinnerGap size={14} className="animate-spin" />
                        <span>Väntar på signering i BankID...</span>
                      </div>
                    </div>
                  )}

                  {authError && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
                      <WarningCircle size={16} weight="fill" className="shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <p className="font-medium">{authError}</p>
                        <button
                          type="button"
                          onClick={() => selectedBank && handleSelectBankInline(selectedBank)}
                          className="text-xs font-semibold underline flex items-center gap-1 cursor-pointer"
                        >
                          <ArrowClockwise size={12} weight="bold" />
                          <span>Försök igen</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Manuell länk vid iframe/extern webbläsare */}
                  <div className="pt-2 text-center">
                    {!showManualCallback ? (
                      <button
                        type="button"
                        onClick={() => setShowManualCallback(true)}
                        className="text-[11.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline transition-colors cursor-pointer"
                      >
                        Öppnades inte BankID eller fastnade länken?
                      </button>
                    ) : (
                      <form
                        onSubmit={handleExchangeManualCallback}
                        className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-2.5 text-left animate-fade-in"
                      >
                        <label className="text-[11px] font-medium text-[var(--text-secondary)] block">
                          Klistra in returlänken eller koden från banken:
                        </label>
                        <input
                          type="text"
                          value={manualCallbackUrl}
                          onChange={(e) => setManualCallbackUrl(e.target.value)}
                          placeholder="https://... eller verifieringskod"
                          className="w-full text-xs px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                        />
                        <button
                          type="submit"
                          disabled={exchangingCode || !manualCallbackUrl.trim()}
                          className="w-full py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold disabled:opacity-40 cursor-pointer"
                        >
                          {exchangingCode ? 'Verifierar anslutning...' : 'Verifiera anslutning'}
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep3View('grid');
                    setAuthError(null);
                  }}
                  className="w-full py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  ← Välj en annan bank
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: SÖK BLAND ALLA BANKER INLINE */}
          {step3View === 'search' && (
            <div className="my-auto">
              <div className="mb-8">
                <h1 className="font-display font-semibold text-2xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Sök bank
                </h1>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                  Välj din bank bland alla anslutna banker i Sverige.
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <MagnifyingGlass
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                  <input
                    type="text"
                    autoFocus
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    placeholder="Sök bank..."
                    className="w-full pl-9 pr-3.5 py-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
                  />
                </div>

                {loadingAllBanks ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <SpinnerGap size={24} className="animate-spin text-[var(--text-primary)]" />
                    <span>Hämtar banker...</span>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-0.5 rounded-2xl">
                    {allBanks
                      .filter((b) =>
                        b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
                      )
                      .map((bank) => (
                        <button
                          key={bank.name}
                          type="button"
                          onClick={() => handleSelectBankInline(bank)}
                          className="w-full p-3 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ItemLogo name={bank.name} logoUrl={bank.logo || undefined} size="sm" />
                            <span className="font-display font-semibold text-xs text-[var(--text-primary)] truncate">
                              {bank.name}
                            </span>
                          </div>
                          <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
                        </button>
                      ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setStep3View('grid')}
                  className="w-full py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  ← Tillbaka till snabbval
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW 3: VÄLJ KONTON INLINE */}
          {step3View === 'select-accounts' && (
            <div className="my-auto">
              <div className="mb-8">
                <h1 className="font-display font-semibold text-2xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Välj konton
                </h1>
                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                  Välj vilka konton du vill använda i Dejz.
                </p>
              </div>

              <div className="space-y-4">
                <div className="max-h-72 overflow-y-auto space-y-2.5 pr-0.5">
                  {fetchedAccounts.map((acc, idx) => {
                    const isChecked = selectedAccountIds.includes(acc.id);
                    const currentName =
                      accountCustomNames[acc.id] !== undefined
                        ? accountCustomNames[acc.id]
                        : acc.custom_name || (idx === 0 ? 'Lönekonto' : 'Sparkonto');

                    return (
                      <div
                        key={acc.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isChecked
                            ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                            : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-60'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleAccountSelection(acc.id)}
                          className="w-full flex items-center gap-3 text-left cursor-pointer"
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                                : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                            }`}
                          >
                            {isChecked && <Check size={12} weight="bold" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-display font-semibold text-xs text-[var(--text-primary)] block truncate">
                              {currentName}
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] block">
                              {acc.account_id?.iban || acc.account_id?.bban || acc.bankName || 'Konto'}
                            </span>
                          </div>
                          {acc.balance !== null && acc.balance !== undefined && (
                            <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                              {formatKr(acc.balance)}
                            </span>
                          )}
                        </button>

                        {isChecked && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)]">
                            <input
                              type="text"
                              value={currentName}
                              onChange={(e) =>
                                setAccountCustomNames((prev) => ({
                                  ...prev,
                                  [acc.id]: e.target.value,
                                }))
                              }
                              placeholder="Namnge konto (t.ex. Lönekonto)"
                              className="w-full px-3 py-1.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={savingAccounts}
                  onClick={handleSaveSelectedAccounts}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                >
                  {savingAccounts ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" />
                      <span>Sparar konton...</span>
                    </>
                  ) : (
                    <>
                      <span>Fortsätt med valda konton</span>
                      <ArrowRight size={16} weight="bold" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW 4: GRUNDLÄGANDE 3x3 BANK-GRID */}
          {step3View === 'grid' && (
            <>
              <div className="my-auto">
                <div className="mb-8">
                  <h1 className="font-display font-semibold text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                    Koppla din bank
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Välj din bank för att hämta dina konton och köp automatiskt.
                  </p>
                </div>

                {hasConnectedBank ? (
                  <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
                    {connections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle size={20} weight="fill" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                              {conn.aspsp_name}
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              Ansluten · Fasta utgifter analyserade
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={handleOpenSearchBanks}
                      className="w-full py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      Koppla ytterligare en bank
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 3x3 Grid med stora, touch-vänliga bankloggor */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {POPULAR_SWEDISH_BANKS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleSelectBankInline(b)}
                          className="p-3 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] hover:border-[var(--text-primary)]/40 flex flex-col items-center justify-center gap-2 transition-all duration-150 active:scale-95 cursor-pointer group shadow-xs"
                        >
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-150 group-hover:scale-105 shrink-0">
                            <ItemLogo name={b.displayName} size="lg" />
                          </div>
                          <span className="font-display font-semibold text-[11.5px] text-[var(--text-primary)] text-center truncate max-w-full leading-tight">
                            {b.displayName}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Sök / välj annan bank */}
                    <button
                      type="button"
                      onClick={handleOpenSearchBanks}
                      className="w-full py-2.5 px-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <MagnifyingGlass size={14} weight="bold" />
                      <span>Sök bland fler banker...</span>
                    </button>

                    {/* Trygghetsbadge */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-0.5">
                      <ShieldCheck size={14} weight="regular" />
                      <span>Säker koppling via Mobilt BankID</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => navigateStep(4, 'forward')}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                  <ArrowRight size={16} weight="bold" />
                </button>

                {!hasConnectedBank && (
                  <button
                    type="button"
                    onClick={() => navigateStep(4, 'forward')}
                    className="w-full py-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Hoppa över just nu
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 4: INKOMSTER & FASTA UTGIFTER (Öppnas i riktiga Sheets)   */}
      {/* ============================================================== */}
      {step === 4 && (
        <div
          key="step-4"
          className={`flex-1 flex flex-col justify-between py-5 min-h-0 ${pageAnimClass}`}
        >
          <div className="overflow-y-auto pr-0.5 pb-4">
            <div className="mb-7">
              <h1 className="font-display font-semibold text-2xl tracking-[-0.012em] text-[var(--text-primary)]">
                Stämmer din översikt?
              </h1>
            </div>

            <div className="space-y-5">
            <div className="ui-card p-4 flex items-center justify-between gap-3">
              <div>
                <span className="ui-stat-label">
                  Kvar efter fasta räkningar
                </span>
                <span className="font-display font-semibold text-2xl text-[var(--text-primary)] tabular-nums">
                  {formatKr(kvarAttSpendera)}
                </span>
              </div>
              <div className="text-right text-xs space-y-0.5 tabular-nums">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  +{formatKr(totalInc)}
                </div>
                <div className="text-[var(--text-muted)] font-semibold">
                  -{formatKr(totalFix)}
                </div>
              </div>
            </div>

            {/* Inkomster (Enhetlig grupperad lista som i Ekonomi-fliken) */}
            <section className="ui-section">
              <div className="ui-section-header">
                <h2 className="ui-section-title">
                  Inkomster ({incomes.length})
                </h2>
                <button
                  type="button"
                  onClick={() => openAddSheet('income')}
                  className="ui-section-action"
                >
                  <Plus size={12} weight="bold" />
                  <span>Lägg till</span>
                </button>
              </div>

              {incomes.length > 0 ? (
                <div className="ui-list-card">
                  {incomes.map((inc) => (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => openEditIncomeSheet(inc)}
                      className="ui-tx-row"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={inc.name}
                          category={inc.category}
                          logoUrl={inc.logo}
                          size="md"
                          isRecurring={false}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">
                            {inc.name}
                          </span>
                          <span className="ui-row-subtitle flex items-center gap-1">
                            <span className="truncate">{inc.category || 'Lön'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="ui-row-amount ui-row-amount-income">
                            +{formatKr(inc.amount)}
                          </span>
                          <span className="ui-row-meta">
                            Den {inc.payday || payday}:e
                          </span>
                        </div>
                        <CaretRight size={13} className="text-[var(--text-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddSheet('income')}
                  className="w-full py-4 ui-card text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Lägg till din inkomst</span>
                </button>
              )}
            </section>

            {/* Fasta utgifter (Enhetlig grupperad lista som i Ekonomi-fliken) */}
            <section className="ui-section">
              <div className="ui-section-header">
                <h2 className="ui-section-title">
                  Fasta utgifter ({fixedExpenses.length})
                </h2>
                <button
                  type="button"
                  onClick={() => openAddSheet('fixed')}
                  className="ui-section-action"
                >
                  <Plus size={12} weight="bold" />
                  <span>Lägg till</span>
                </button>
              </div>

              {fixedExpenses.length > 0 ? (
                <div className="ui-list-card">
                  {fixedExpenses.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => openEditFixedSheet(exp)}
                      className="ui-tx-row"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={exp.name}
                          category={exp.category}
                          logoUrl={exp.logo}
                          size="md"
                          isRecurring={false}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">
                            {exp.name}
                          </span>
                          <span className="ui-row-subtitle flex items-center gap-1">
                            <span className="truncate">{exp.category || 'Räkningar'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="ui-row-amount">
                            -{formatKr(exp.amount)}
                          </span>
                          <span className="ui-row-meta">
                            Den {exp.dueDay}:e
                          </span>
                        </div>
                        <CaretRight size={13} className="text-[var(--text-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddSheet('fixed')}
                  className="w-full py-4 ui-card text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Lägg till fast utgift</span>
                </button>
              )}
            </section>
            </div>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="ui-btn-primary py-3.5 text-sm shrink-0"
          >
            <span>Öppna Dejz</span>
            <Check size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* RIKTIGT BOTTOM-SHEET FÖR ATT LÄGGA TILL / ÄNDRA I STEG 4       */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(sheetEditor)}
        onClose={() => setSheetEditor(null)}
      >
        {sheetEditor && (
          <div>
            {sheetSubView === 'day-picker' ? (
              <div
                key="sheet-day-picker"
                className="animate-page-forward space-y-4"
              >
                <div className="ui-sheet-sub-header">
                  <button
                    type="button"
                    onClick={() => {
                      setSheetNavDir('back');
                      setSheetSubView('main');
                    }}
                    title="Tillbaka"
                    aria-label="Tillbaka"
                    className="ui-icon-btn"
                  >
                    <CaretLeft size={15} weight="bold" />
                  </button>
                  <span className="ui-sheet-title">
                    {sheetEditor.type === 'income' ? 'Välj lönedag' : 'Välj förfallodag'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheetEditor(null)}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                <DayOfMonthPicker
                  selectedDay={sheetEditor.day}
                  onSelectDay={(d) => {
                    setSheetEditor({ ...sheetEditor, day: d });
                    setSheetNavDir('back');
                    setSheetSubView('main');
                  }}
                  mode={sheetEditor.type === 'income' ? 'payday' : 'dueday'}
                  title={
                    sheetEditor.type === 'income'
                      ? 'Utbetalningsdag i månaden'
                      : 'Dragningsdag i månaden'
                  }
                />
              </div>
            ) : (
              <form
                key="sheet-main"
                onSubmit={handleSaveSheet}
                className={`space-y-5 ${
                  sheetNavDir === 'back' ? 'animate-page-back' : ''
                }`}
              >
                <div className="ui-sheet-sub-header">
                  <span className="ui-sheet-title">
                    {sheetEditor.mode === 'add'
                      ? sheetEditor.type === 'income'
                        ? 'Lägg till inkomst'
                        : 'Lägg till fast utgift'
                      : sheetEditor.type === 'income'
                      ? 'Redigera inkomst'
                      : 'Redigera fast utgift'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheetEditor(null)}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Hero Amount & Logo Preview */}
                <div className="ui-hero-header">
                  <div className="ui-hero-icon">
                    <ItemLogo
                      name={
                        sheetEditor.name ||
                        (sheetEditor.type === 'income' ? 'Lön' : 'Fast utgift')
                      }
                      category={sheetEditor.category}
                      logoUrl={sheetEditor.logo}
                      size="xl"
                      isRecurring={true}
                    />
                  </div>
                  <div
                    className={`font-display font-extrabold text-3xl tabular-nums ${
                      sheetEditor.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {sheetEditor.type === 'income' ? '+' : '-'}
                    {formatKr(Math.max(0, Math.round(Number(sheetEditor.amount) || 0)))}
                  </div>
                </div>

                {/* Hairline-Divided Direct Manipulation Fields */}
                <div className="ui-sheet-group text-[13px] sm:text-sm">
                  <label className="ui-input-row">
                    <span className="text-[var(--text-muted)] shrink-0">Namn</span>
                    <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        required
                        autoFocus={sheetEditor.mode === 'add'}
                        placeholder={
                          sheetEditor.type === 'income' ? 't.ex. Lön' : 't.ex. Hyra'
                        }
                        value={sheetEditor.name}
                        onChange={(e) =>
                          setSheetEditor({ ...sheetEditor, name: e.target.value })
                        }
                        className="ui-inline-input"
                      />
                      <PencilSimple size={12} className="text-[var(--text-muted)] shrink-0 opacity-60" />
                    </div>
                  </label>

                  <label className="ui-input-row">
                    <span className="text-[var(--text-muted)] shrink-0">Belopp (kr)</span>
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="0"
                        value={sheetEditor.amount}
                        onChange={(e) =>
                          setSheetEditor({
                            ...sheetEditor,
                            amount: e.target.value.replace(/[^\d]/g, ''),
                          })
                        }
                        className="w-28 bg-transparent border-0 p-0 text-xs font-display font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)] text-right tabular-nums focus:outline-none"
                      />
                      <PencilSimple size={12} className="text-[var(--text-muted)] shrink-0 opacity-60" />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSheetNavDir('forward');
                      setSheetSubView('day-picker');
                    }}
                    className="ui-row-btn"
                  >
                    <span className="text-[var(--text-muted)] shrink-0">
                      {sheetEditor.type === 'income' ? 'Utbetalningsdag' : 'Förfallodag'}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                      <span>Den {sheetEditor.day}:e</span>
                      <CaretRight size={12} className="text-[var(--text-muted)]" />
                    </span>
                  </button>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={!sheetEditor.name.trim() || !(Number(sheetEditor.amount) > 0)}
                    className="ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>Spara</span>
                  </button>

                  {sheetEditor.mode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDeleteFromSheet}
                      className="ui-btn-danger"
                    >
                      <Trash size={14} />
                      <span>Ta bort</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

