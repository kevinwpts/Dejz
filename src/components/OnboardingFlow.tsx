import React, { useState, useEffect } from 'react';
import { estimateFromAmounts } from '../utils/variableBills';
import { SWEDISH_EXPENSE_PRESETS } from '../data/swedishExpensePresets';
import {
  getMarketingConsent,
  hasPendingSignupConsent,
  setMarketingConsent,
} from '../utils/marketingConsent';
import { isDemoMode } from '../utils/demoUtils';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  Plus,
  Trash,
  Check,
  X,
  MagnifyingGlass,
  ShieldCheck,
  SpinnerGap,
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
import {
  extractOnboardingAiCandidates,
  inferCategoryAndMethodFromName,
} from '../utils/bankHistoryAnalyzer';
import { getLogoUrl } from '../utils/logo';
import { hasConnectedHouseholdPartner } from '../utils/householdSync';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  syncAllUserPreferencesToSupabase,
  setManualBalance,
} from '../utils/appCache';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon, PaymentMethodIcon } from './CategoryIcon';
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

const EXCLUDED_B2B_OR_FOREIGN_ASPSP_PATTERNS = [
  /corporate/i,
  /first card/i,
  /airplus/i,
  /airwallex/i,
  /dipocket/i,
  /finductive/i,
  /finom/i,
  /genome/i,
  /intergiro/i,
  /pleo/i,
  /payhawk/i,
  /soldo/i,
  /qonto/i,
  /paysera/i,
  /satchel/i,
  /wallester/i,
  /worldfirst/i,
  /viva\.com/i,
  /transfermate/i,
  /equals money/i,
  /3s money/i,
  /ebanx/i,
  /nium/i,
  /banking circle/i,
];

const CONSUMER_SWEDISH_BANKS: BankAspsp[] = SWEDISH_BANKS_CATALOG.filter(
  (b) => !EXCLUDED_B2B_OR_FOREIGN_ASPSP_PATTERNS.some((rx) => rx.test(b.name))
);

interface OnboardingFlowProps {
  initialName: string;
  targetPayday?: number;
  initialWeekendHandling?: WeekendHandlingMode;
  onUpdateWeekendHandling?: (mode: WeekendHandlingMode) => void;
  connections: BankConnection[];
  bankAccounts?: BankAccount[];
  bankCallbackStatusMsg?: string | null;
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
  /** Bankkoppling (steg 2) visas bara när den är påslagen – idag bara för admin. */
  bankEnabled?: boolean;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Sätts när bankkopplingen startar i introduktionen – se bankReturnPending nedan. */
const BANK_RETURN_MARKER_KEY = 'dejz_onboarding_bank_return';
const BANK_RETURN_MAX_AGE_MS = 30 * 60 * 1000;

function hasFreshBankReturnMarker(): boolean {
  try {
    const ts = Number(localStorage.getItem(BANK_RETURN_MARKER_KEY));
    if (!ts) return false;
    if (Date.now() - ts > BANK_RETURN_MAX_AGE_MS) {
      localStorage.removeItem(BANK_RETURN_MARKER_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function clearBankReturnMarker() {
  try {
    localStorage.removeItem(BANK_RETURN_MARKER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Stegordning. Med bank: namn → bank → fasta (förslag från banken) → inkomster → lön → resultat.
 * Utan bank följer flödet hur man tänker lön till lön: namn → lönedag → inkomst → fasta → resultat.
 */
const STEP_ORDER_WITH_BANK: OnboardingStep[] = [1, 2, 3, 4, 5, 6];
// Utan bank: sist frågar vi efter saldot på kontot (steg 7), så "kvar till lön" stämmer från dag ett
const STEP_ORDER_MANUAL: OnboardingStep[] = [1, 5, 4, 3, 6, 7];

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
  isShared?: boolean;
  fullAmount?: string;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialName,
  targetPayday = 25,
  initialWeekendHandling = 'before',
  onUpdateWeekendHandling,
  connections,
  bankAccounts: _bankAccounts = [],
  bankCallbackStatusMsg = null,
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
  bankEnabled: bankEnabledProp = false,
}) => {
  // Kommer man tillbaka från banken laddas appen om, och i första ögonblicket vet appen inte
  // vem som är inloggad (bankEnabledProp är då false). Därför sparar vi en egen markering när
  // bankkopplingen startar, så att man alltid hamnar på "Välj konton" – aldrig på steg 1 igen.
  const [bankReturnPending] = useState<boolean>(() => hasFreshBankReturnMarker());
  const bankEnabled = bankEnabledProp || bankReturnPending || connections.length > 0;
  const stepOrder = bankEnabled ? STEP_ORDER_WITH_BANK : STEP_ORDER_MANUAL;
  const [step, setStep] = useState<OnboardingStep>(() => {
    if (bankReturnPending) return 2;
    try {
      const savedStep = Number(localStorage.getItem('dejz_onboarding_step'));
      if (stepOrder.includes(savedStep as OnboardingStep)) {
        return savedStep as OnboardingStep;
      }
    } catch {
      // ignore
    }
    return 1;
  });

  // Har man gått vidare från kontovalet behövs markeringen inte längre
  useEffect(() => {
    if (step !== 2) clearBankReturnMarker();
  }, [step]);
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward');
  const [balanceInput, setBalanceInput] = useState('');

  // Nyhetsbrev: fråga bara den som aldrig svarat (t.ex. Google-inloggning – de såg ingen ruta)
  const [showConsentQuestion, setShowConsentQuestion] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  useEffect(() => {
    if (isDemoMode() || hasPendingSignupConsent()) return;
    let cancelled = false;
    void getMarketingConsent().then((answer) => {
      if (!cancelled && answer === null) setShowConsentQuestion(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
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
      if (saved === 'before' || saved === 'after' || saved === 'none') return saved;
      if (saved === 'exact') return 'none';
    } catch {
      // ignore
    }
    return 'before';
  });

  useEffect(() => {
    try {
      localStorage.setItem('dejz_onboarding_in_progress', 'true');
      localStorage.setItem('dejz_onboarding_step', String(step));
      syncAllUserPreferencesToSupabase();
    } catch {
      // ignore
    }
  }, [step]);

  // Steg 2: Inline bankanslutning och vyer direkt på sidan
  const [step2View, setStep2View] = useState<'grid' | 'select-accounts'>('grid');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [step, step2View]);
  const [connectingBankName, setConnectingBankName] = useState<string | null>(null);
  const [startingAuth, setStartingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  // Kontoval efter lyckad autentisering
  const [fetchedAccounts, setFetchedAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const seenAccountIdsRef = React.useRef<Set<string>>(new Set());
  const [activeConnection, setActiveConnection] = useState<BankConnection | null>(null);
  const [savingAccounts, setSavingAccounts] = useState(false);
  const pendingSyncConnectionIdRef = React.useRef<string | null>(null);

  // Föreslagna fasta utgifter för steg 3 (hämtas från riktiga banktransaktioner)
  const [suggestedFixedExpenses, setSuggestedFixedExpenses] = useState<
    {
      id: string;
      name: string;
      amount: number;
      dueDay: number;
      category: string;
      paymentMethod?: string;
      evidenceSummary?: string;
      checked: boolean;
      logo?: string;
      isFromBank?: boolean;
      isShared?: boolean;
      fullAmount?: number;
    }[]
  >([]);

  // Föreslagna fasta inkomster för steg 4 (hämtas från riktiga banktransaktioner)
  const [suggestedIncomes, setSuggestedIncomes] = useState<
    {
      id: string;
      name: string;
      amount: number;
      payday: number;
      category: string;
      evidenceSummary?: string;
      checked: boolean;
      logo?: string;
      isFromBank?: boolean;
    }[]
  >([]);

  const [analyzingBank, setAnalyzingBank] = useState(false);
  const [_hasAnalyzedBank, setHasAnalyzedBank] = useState(false);
  const [_isBankDataDetected, setIsBankDataDetected] = useState(false);
  const [verifyingBankReturn, setVerifyingBankReturn] = useState(false);

  // Analysera RIKTIGA banktransaktioner från Enable Banking när användaren når steg 3 eller 4 (efter att konton valts i steg 2).
  // Körs EN gång. Den får inte startas om när saldon, konton eller lönedag uppdateras medan den pågår –
  // tidigare gjorde det att analysen började om gång på gång och "Letar efter …" stod kvar länge.
  const bankAnalysisInFlightRef = React.useRef(false);
  const bankAnalysisDoneRef = React.useRef(false);
  const onboardingMountedRef = React.useRef(true);
  useEffect(() => {
    onboardingMountedRef.current = true;
    return () => {
      onboardingMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 3 && step !== 4) return;

    // Utan bank: hämta inget från banken. Inga påhittade belopp – användaren trycker på
    // snabbknapparna (Lön, Hyra …) och fyller i sina egna siffror.
    if (!bankEnabled) return;

    if (bankAnalysisInFlightRef.current) return;
    if (bankAnalysisDoneRef.current && !pendingSyncConnectionIdRef.current) return;
    bankAnalysisInFlightRef.current = true;

    const runBankAnalysis = async () => {
      const isMounted = () => onboardingMountedRef.current;
      setAnalyzingBank(true);
      try {
        const pendingConnId = pendingSyncConnectionIdRef.current;
        if (pendingConnId) {
          pendingSyncConnectionIdRef.current = null;
          await bankService
            .sync({
              connectionId: pendingConnId,
              fullSync: true,
            })
            .catch(() => {});
          const status = await bankService.getStatus().catch(() => null);
          if (status && onBankStateUpdated && isMounted()) {
            onBankStateUpdated(status.connections, status.accounts);
          }
        }

        let bankTxs = await bankService
          .listAllTransactionsForReconciliation(5000, false)
          .catch(() => []);

        // Om användaren laddade om på steg 3 och transaktionerna inte hunnit hämtas än, kör en full synk av valda konton nu
        if ((!bankTxs || bankTxs.length === 0) && connections.length > 0) {
          await bankService.sync({ fullSync: true }).catch(() => {});
          bankTxs = await bankService
            .listAllTransactionsForReconciliation(5000, false)
            .catch(() => []);
        }

        let accountsForAnalysis = fetchedAccounts.length > 0 ? fetchedAccounts : _bankAccounts;
        if (!accountsForAnalysis || accountsForAnalysis.length === 0) {
          accountsForAnalysis = (await bankService.getStatus().catch(() => null))?.accounts || [];
        }

        if (bankTxs.length > 0) {
          const { baseAnalysis } =
            extractOnboardingAiCandidates(
              bankTxs,
              payday,
              weekendHandling === 'before',
              accountsForAnalysis
            );

          if (isMounted()) {
            const realDetectedFixed = baseAnalysis.detectedFixedExpenses.map((item, idx) => ({
              id: `bank-det-${idx}`,
              name: item.name,
              // Rörliga räkningar (el m.m.): snittet av de senaste 3 dragningarna i stället för bara den senaste
              amount: (() => {
                if (!item.isVariable) return Math.round(item.amount);
                const recent = (item.evidenceAmounts || [])
                  .map((amt, i) => ({ amt: Math.abs(Number(amt) || 0), date: item.evidenceDates?.[i] || '' }))
                  .filter((x) => x.amt > 0)
                  .sort((a, b) => (a.date < b.date ? 1 : -1))
                  .map((x) => x.amt);
                return estimateFromAmounts(recent)?.estimate ?? Math.round(item.amount);
              })(),
              dueDay: item.deductionDay || 27,
              category: item.category || 'Räkningar',
              paymentMethod: item.paymentMethod || 'Autogiro',
              evidenceSummary: item.evidenceSummary,
              checked: true,
              logo: item.logo,
              isFromBank: true,
            }));
            setSuggestedFixedExpenses(realDetectedFixed);

            const primaryDetectedInc = baseAnalysis.detectedIncomes[0];
            const inferredPayday =
              baseAnalysis.suggestedPayday || primaryDetectedInc?.deductionDay || null;

            const realDetectedIncomes = baseAnalysis.detectedIncomes.map((inc, idx) => ({
              id: `bank-inc-${idx}`,
              name: inc.name,
              amount: Math.round(inc.amount),
              payday: inc.deductionDay || inferredPayday || 25,
              category: inc.category || 'Lön',
              evidenceSummary: inc.evidenceSummary,
              checked: true,
              logo: inc.logo,
              isFromBank: true,
            }));
            setSuggestedIncomes(realDetectedIncomes);
            setIsBankDataDetected(true);

            // Sätt automatiskt lönedag utifrån analyserad inkomst från banken
            if (inferredPayday && inferredPayday >= 1 && inferredPayday <= 31) {
              setPayday(inferredPayday);
            }
          }
        }
        // Hoppade användaren över bankkopplingen visas snabbknapparna i stället för påhittade belopp
      } catch (err) {
        console.warn('Could not analyze bank transactions:', err);
      } finally {
        bankAnalysisInFlightRef.current = false;
        bankAnalysisDoneRef.current = true;
        if (isMounted()) {
          setAnalyzingBank(false);
          setHasAnalyzedBank(true);
        }
      }
    };

    void runBankAnalysis();
    // Avsiktligt bara step/bankEnabled: analysen ska inte startas om av att data uppdateras under tiden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, bankEnabled]);

  // Synka om App.tsx redan hunnit populera fixedExpenses eller incomes via bakgrundssynk (utan att låsa runBankAnalysis)
  useEffect(() => {
    if (suggestedFixedExpenses.length === 0 && fixedExpenses.length > 0 && !analyzingBank) {
      setSuggestedFixedExpenses(
        fixedExpenses.map((f) => ({
          id: f.id,
          name: f.name,
          amount: Math.round(f.amount),
          dueDay: f.dueDay || 27,
          category: f.category || 'Räkningar',
          paymentMethod: f.paymentMethod || 'Autogiro',
          checked: true,
          logo: f.logo,
          isFromBank: true,
        }))
      );
    }
  }, [fixedExpenses, suggestedFixedExpenses.length, analyzingBank]);

  useEffect(() => {
    if (suggestedIncomes.length === 0 && incomes.length > 0) {
      setSuggestedIncomes(
        incomes.map((inc) => ({
          id: inc.id,
          name: inc.name,
          amount: Math.round(inc.amount),
          payday: inc.payday || 25,
          category: inc.category || 'Lön',
          checked: true,
          logo: inc.logo,
          isFromBank: true,
        }))
      );
      const primary = incomes[0];
      if (primary?.payday && primary.payday >= 1 && primary.payday <= 31) {
        setPayday(primary.payday);
      }
    }
  }, [incomes, suggestedIncomes.length]);

  const handleSaveSuggestedFixed = () => {
    const sameNameCounts = new Map<string, number>();
    suggestedFixedExpenses.forEach((item) => {
      const k = item.name.toLowerCase();
      sameNameCounts.set(k, (sameNameCounts.get(k) || 0) + 1);
    });

    suggestedFixedExpenses.forEach((item) => {
      const hasMultipleSameName = (sameNameCounts.get(item.name.toLowerCase()) || 0) > 1;
      const existing = fixedExpenses.find((f) => {
        if (f.id === item.id) return true;
        if (f.name.toLowerCase() !== item.name.toLowerCase()) return false;
        return hasMultipleSameName ? Math.round(f.amount) === Math.round(item.amount) : true;
      });
      if (item.checked) {
        if (!existing) {
          onAddFixed({
            name: item.name,
            amount: item.amount,
            dueDay: item.dueDay,
            category: item.category,
            paymentMethod: item.paymentMethod || 'Autogiro',
            logo: item.logo,
            isShared: item.isShared,
            fullAmount: item.fullAmount,
          });
        } else if (
          onUpdateFixed &&
          (existing.amount !== item.amount ||
            existing.dueDay !== item.dueDay ||
            existing.name !== item.name ||
            existing.category !== item.category ||
            existing.isShared !== item.isShared ||
            existing.fullAmount !== item.fullAmount ||
            existing.paymentMethod !== (item.paymentMethod || existing.paymentMethod))
        ) {
          onUpdateFixed({
            ...existing,
            name: item.name,
            amount: item.amount,
            dueDay: item.dueDay,
            category: item.category || existing.category,
            paymentMethod: item.paymentMethod || existing.paymentMethod || 'Autogiro',
            logo: item.logo || existing.logo,
            isShared: item.isShared,
            fullAmount: item.fullAmount,
          });
        }
      } else if (existing) {
        onDeleteFixed(existing.id);
      }
    });
    goNext(3);
  };

  const handleSaveSuggestedIncomes = () => {
    suggestedIncomes.forEach((item) => {
      const existing = incomes.find(
        (i) => i.id === item.id || i.name.toLowerCase() === item.name.toLowerCase()
      );
      if (item.checked) {
        if (!existing) {
          onAddIncome({
            name: item.name,
            amount: item.amount,
            payday: item.payday,
            category: item.category || 'Lön',
            logo: item.logo,
          });
        } else if (
          onUpdateIncome &&
          (existing.amount !== item.amount ||
            existing.payday !== item.payday ||
            existing.name !== item.name ||
            existing.category !== item.category)
        ) {
          onUpdateIncome({
            ...existing,
            name: item.name,
            amount: item.amount,
            payday: item.payday,
            category: item.category || existing.category,
            logo: item.logo || existing.logo,
          });
        }
      } else if (existing) {
        onDeleteIncome(existing.id);
      }
    });

    // Utgå automatiskt från dagen på den valda/hittade lönen i nästa steg (När får du lön?).
    // Utan bank har lönedagen redan valts innan inkomsterna, så då rör vi den inte.
    const checkedList = suggestedIncomes.filter((i) => i.checked);
    if (bankEnabled && checkedList.length > 0) {
      const primaryInc =
        checkedList.find((i) => i.category === 'Lön' || i.category === 'Ersättning') ||
        [...checkedList].sort((a, b) => b.amount - a.amount)[0];
      if (primaryInc && primaryInc.payday >= 1 && primaryInc.payday <= 31) {
        setPayday(primaryInc.payday);
      }
    }

    goNext(4);
  };

  // BottomSheet editor state (för att lägga till eller ändra post)
  const [sheetEditor, setSheetEditor] = useState<SheetEditorState | null>(null);
  const [sheetSubView, setSheetSubView] = useState<
    'main' | 'day-picker' | 'category-picker' | 'payment-picker'
  >('main');
  const [sheetNavDir, setSheetNavDir] = useState<'forward' | 'back'>('forward');

  const availableExpenseCategories = React.useMemo(
    () => getStoredExpenseCategories().map((c) => c.name),
    [sheetEditor?.type, sheetEditor?.mode]
  );

  const availableIncomeCategories = React.useMemo(
    () => getStoredIncomeCategories().map((c) => c.name),
    [sheetEditor?.type, sheetEditor?.mode]
  );

  const availablePaymentMethods = React.useMemo(() => {
    const stored = getStoredPaymentMethods().map((m) => m.name);
    if (sheetEditor?.paymentMethod && !stored.includes(sheetEditor.paymentMethod)) {
      return [...stored, sheetEditor.paymentMethod];
    }
    return stored;
  }, [sheetEditor?.paymentMethod]);

  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName, name]);

  // Starta BankID-autentisering direkt och sömlöst
  const handleSelectBankInline = async (
    bank: BankAspsp | { name: string; country?: string; logo?: string | null }
  ) => {
    setConnectingBankName(bank.name);
    setStartingAuth(true);
    setAuthError(null);

    let safetyTimer: any = null;
    const timeoutPromise = new Promise((_, reject) => {
      safetyTimer = setTimeout(() => {
        reject(new Error('Initieringen tog för lång tid. Kontrollera din anslutning och försök igen.'));
      }, 14000);
    });

    try {
      try {
        localStorage.setItem('dejz_onboarding_in_progress', 'true');
        localStorage.setItem('dejz_onboarding_step', '2');
        localStorage.setItem(BANK_RETURN_MARKER_KEY, String(Date.now()));
        localStorage.setItem(
          'dejz_onboarding_pending_bank_auth',
          JSON.stringify({ bankName: bank.name, ts: Date.now() })
        );
      } catch {
        // ignore
      }

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

      if (res?.url) {
        window.location.assign(res.url);
      } else {
        throw new Error('Kunde inte hämta anslutningslänk från banken.');
      }
    } catch (err: any) {
      if (safetyTimer) clearTimeout(safetyTimer);
      setConnectingBankName(null);
      setAuthError(err.message || 'Kunde inte starta autentisering mot banken. Testa igen.');
    } finally {
      setStartingAuth(false);
    }
  };

  const getSmartAccountDefaultName = React.useCallback((acc: BankAccount, idx: number) => {
    if (acc.custom_name && acc.custom_name.trim()) return acc.custom_name.trim();
    const prod = (acc.product || '').trim();
    if (prod) return prod;
    return idx === 0 ? 'Lönekonto' : 'Bankkonto';
  }, []);

  // Hjälpfunktion för att öppna och uppdatera kontoval så att samtliga bankkonton garanterat kommer med från start
  const applyConnectedBankState = React.useCallback(
    (conns: BankConnection[], accs: BankAccount[]) => {
      if (!conns || conns.length === 0) return false;
      const newestConn = conns[0];
      const connAccounts = accs.filter((a) => a.connection_id === newestConn.id);
      const accountsToUse = connAccounts.length > 0 ? connAccounts : accs;
      if (accountsToUse.length > 0) {
        try {
          localStorage.removeItem('dejz_onboarding_pending_bank_auth');
        } catch {
          // ignore
        }
        setVerifyingBankReturn(false);
        setConnectingBankName(null);
        setActiveConnection(newestConn);
        setFetchedAccounts(accountsToUse);

        // Lägg automatiskt till nytillkomna konton som valda, utan att skriva över konton användaren själv bockat ur
        const newlyDiscoveredIds: string[] = [];
        for (const acc of accountsToUse) {
          if (!seenAccountIdsRef.current.has(acc.id)) {
            seenAccountIdsRef.current.add(acc.id);
            if (acc.is_selected !== false) {
              newlyDiscoveredIds.push(acc.id);
            }
          }
        }
        if (newlyDiscoveredIds.length > 0) {
          setSelectedAccountIds((prev) => {
            const merged = new Set([...prev, ...newlyDiscoveredIds]);
            return Array.from(merged);
          });
        }

        setStep2View('select-accounts');
        return true;
      }
      return false;
    },
    []
  );

  // Reagera DIREKT när App.tsx uppdaterar connections/bankAccounts (även om select-accounts redan visas så att ett 3:e konto aldrig missas!)
  useEffect(() => {
    if (step !== 2) return;
    if (connections.length > 0 && _bankAccounts.length > 0) {
      applyConnectedBankState(connections, _bankAccounts);
    }
  }, [step, connections, _bankAccounts, applyConnectedBankState]);

  // Poll status med automatiska omförsök när användaren återvänder från Mobilt BankID till appen
  useEffect(() => {
    if (step !== 2 || Boolean(bankCallbackStatusMsg)) return;
    let isCancelled = false;
    let retryTimer: any = null;

    const checkBankReturn = async (attempt = 0) => {
      if (isCancelled || step !== 2 || Boolean(bankCallbackStatusMsg)) return;

      let hasPendingAuth = false;
      try {
        const rawPending = localStorage.getItem('dejz_onboarding_pending_bank_auth');
        if (rawPending) {
          const parsed = JSON.parse(rawPending);
          if (parsed?.ts && Date.now() - Number(parsed.ts) < 15 * 60 * 1000) {
            hasPendingAuth = true;
          } else {
            localStorage.removeItem('dejz_onboarding_pending_bank_auth');
          }
        }
      } catch {
        // ignore
      }

      if (hasPendingAuth && attempt === 0 && step2View !== 'select-accounts') {
        setVerifyingBankReturn(true);
      }

      try {
        const status = await bankService.getStatus();
        if (isCancelled) return;

        if (status.connections.length > 0 && status.accounts.length > 0) {
          if (onBankStateUpdated) {
            onBankStateUpdated(status.connections, status.accounts);
          }
          applyConnectedBankState(status.connections, status.accounts);
          // Gör alltid en extra efterkoll 1.5s senare om backend-funktionen fortfarande hämtade saldo på det sista kontot
          if (attempt < 2 && !isCancelled) {
            retryTimer = setTimeout(() => {
              checkBankReturn(attempt + 1);
            }, 1500);
          }
          return;
        }

        // Om anslutningen precis skapats men kontona fortfarande hämtas av exchange-code, fortsätt polla!
        if (status.connections.length > 0 && status.accounts.length === 0) {
          hasPendingAuth = true;
          setVerifyingBankReturn(true);
        }
      } catch {
        // ignore
      }

      if (hasPendingAuth && attempt < 10 && !isCancelled) {
        retryTimer = setTimeout(() => {
          checkBankReturn(attempt + 1);
        }, 1200);
      } else if (!isCancelled) {
        setVerifyingBankReturn(false);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'hidden') return;
      checkBankReturn(0);
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Kör även en koll direkt om vi precis landat på steg 2
    checkBankReturn(0);

    return () => {
      isCancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [step, step2View, bankCallbackStatusMsg, connections.length, onBankStateUpdated, applyConnectedBankState]);

  // Spara valda konton och gå direkt till steg 3 där synk + analys sker i ett enda sammanhängande flöde
  const handleSaveSelectedAccounts = async () => {
    const connToSync = activeConnection || connections[0] || null;
    if (!connToSync) {
      navigateStep(3, 'forward');
      return;
    }
    setSavingAccounts(true);
    try {
      if (selectedAccountIds.length > 0) {
        await bankService
          .selectAccounts({
            connectionId: connToSync.id,
            selectedAccountIds,
          })
          .catch(() => {});
      }
      try {
        localStorage.setItem('dejz_onboarding_accounts_confirmed', 'true');
      } catch {
        // ignore
      }
      pendingSyncConnectionIdRef.current = connToSync.id;
      setSuggestedFixedExpenses([]);
      setSuggestedIncomes([]);
      setIsBankDataDetected(false);
      setHasAnalyzedBank(false);
      setAnalyzingBank(true);
    } finally {
      setSavingAccounts(false);
      navigateStep(3, 'forward');
    }
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

  const stepIndex = Math.max(0, stepOrder.indexOf(step));
  const goNext = (from: OnboardingStep) => {
    const next = stepOrder[stepOrder.indexOf(from) + 1];
    if (next) navigateStep(next, 'forward');
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
    goNext(1);
  };

  const handleNextFromStep5Payday = () => {
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
    goNext(5);
  };

  const openAddSheet = (
    type: 'income' | 'fixed',
    preset?: { name: string; category: string; day?: number; amount?: number; paymentMethod?: string }
  ) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'add',
      type,
      name: preset?.name ?? '',
      amount: preset?.amount ? String(preset.amount) : '',
      day: preset?.day ?? (type === 'income' ? payday || 25 : 27),
      category: preset?.category ?? (type === 'income' ? 'Lön' : 'Räkningar'),
      paymentMethod: type === 'fixed' ? preset?.paymentMethod ?? 'Autogiro' : undefined,
      logo: preset ? getLogoUrl(preset.name, preset.category) : undefined,
    });
  };

  // Snabbknappar: namn och kategori är ifyllda, användaren skriver bara sitt belopp
  const QUICK_INCOMES = [
    { name: 'Lön', category: 'Lön' },
    { name: 'CSN', category: 'Bidrag' },
    { name: 'Bidrag', category: 'Bidrag' },
    { name: 'Pension', category: 'Pension' },
  ];
  // Vanligaste fasta kostnaderna för unga vuxna i Sverige, i grupper.
  // Abonnemang med fast pris får priset ifyllt från prislistan (swedishExpensePresets) – det går att ändra.
  type QuickChip = { name: string; category: string; amount?: number; paymentMethod?: string };
  const fromPreset = (presetId: string, name: string, category: string): QuickChip => {
    const preset = SWEDISH_EXPENSE_PRESETS.find((x) => x.id === presetId);
    return { name, category, amount: preset?.defaultAmount, paymentMethod: preset?.paymentMethod };
  };
  const QUICK_FIXED_GROUPS: { title: string; items: QuickChip[] }[] = [
    {
      title: 'Boende och räkningar',
      items: [
        { name: 'Hyra', category: 'Boende' },
        { name: 'El', category: 'Boende' },
        { name: 'Hemförsäkring', category: 'Försäkring' },
        { name: 'Mobil', category: 'Abonnemang' },
        { name: 'Bredband', category: 'Abonnemang' },
        { name: 'CSN', category: 'Räkningar' },
        { name: 'A-kassa & fack', category: 'Räkningar' },
        { name: 'Lån', category: 'Räkningar' },
      ],
    },
    {
      title: 'Resor',
      items: [
        { name: 'Månadskort', category: 'Transport', paymentMethod: 'Kort' },
        { name: 'Bilförsäkring', category: 'Försäkring' },
        { name: 'Billån/leasing', category: 'Transport' },
      ],
    },
    {
      title: 'Abonnemang',
      items: [
        fromPreset('netflix-standard', 'Netflix', 'Nöje'),
        fromPreset('spotify-individual', 'Spotify', 'Nöje'),
        fromPreset('youtube-premium', 'YouTube Premium', 'Nöje'),
        fromPreset('disney-plus', 'Disney+', 'Nöje'),
        fromPreset('max-hbo', 'Max', 'Nöje'),
        fromPreset('viaplay-film-serier', 'Viaplay', 'Nöje'),
        fromPreset('storytel-ljudbok', 'Storytel', 'Nöje'),
        { name: 'Gym', category: 'Hälsa' },
      ],
    },
    {
      title: 'Sparande',
      items: [{ name: 'Sparande', category: 'Sparande', paymentMethod: 'Överföring' }],
    },
  ];
  const QUICK_FIXED: QuickChip[] = QUICK_FIXED_GROUPS.flatMap((g) => g.items);

  const openEditSuggestedFixed = (item: {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    paymentMethod?: string;
    logo?: string;
    isShared?: boolean;
    fullAmount?: number;
  }) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'fixed',
      id: item.id,
      name: item.name,
      amount: String(Math.round(item.amount)),
      day: item.dueDay || 27,
      category: normalizeCategoryToValid(item.category || 'Räkningar', 'expense'),
      paymentMethod: item.paymentMethod || 'Autogiro',
      logo: item.logo,
      isShared: Boolean(item.isShared),
      fullAmount: item.fullAmount ? String(Math.round(item.fullAmount)) : String(Math.round(item.amount * 2)),
    });
  };

  const openEditSuggestedIncome = (item: {
    id: string;
    name: string;
    amount: number;
    payday: number;
    category: string;
    logo?: string;
  }) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'income',
      id: item.id,
      name: item.name,
      amount: String(Math.round(item.amount)),
      day: item.payday || payday || 25,
      category: normalizeCategoryToValid(item.category || 'Lön', 'income'),
      logo: item.logo,
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
      const nextCat = normalizeCategoryToValid(sheetEditor.category || 'Lön', 'income');
      const nextLogo = sheetEditor.logo || getLogoUrl(cleanTitle, nextCat);
      if (sheetEditor.mode === 'add') {
        onAddIncome({
          name: cleanTitle,
          amount: cleanAmt,
          payday: cleanDay,
          category: nextCat,
          logo: nextLogo,
        });
        setSuggestedIncomes((prev) => [
          ...prev,
          {
            id: `custom-inc-${Date.now()}`,
            name: cleanTitle,
            amount: cleanAmt,
            payday: cleanDay,
            category: nextCat,
            logo: nextLogo,
            checked: true,
          },
        ]);
        setPayday(cleanDay);
      } else if (sheetEditor.id) {
        const prevSuggested = suggestedIncomes.find((i) => i.id === sheetEditor.id);
        setSuggestedIncomes((prev) =>
          prev.map((item) =>
            item.id === sheetEditor.id
              ? {
                  ...item,
                  name: cleanTitle,
                  amount: cleanAmt,
                  payday: cleanDay,
                  category: nextCat,
                  logo: nextLogo,
                  checked: true,
                }
              : item
          )
        );
        if (onUpdateIncome) {
          const existing = incomes.find(
            (i) =>
              i.id === sheetEditor.id ||
              (prevSuggested && i.name.toLowerCase() === prevSuggested.name.toLowerCase())
          );
          if (existing) {
            onUpdateIncome({
              ...existing,
              name: cleanTitle,
              amount: cleanAmt,
              payday: cleanDay,
              category: nextCat,
              logo: nextLogo,
            });
          }
        }
        setPayday(cleanDay);
      }
    } else {
      const nextCat = normalizeCategoryToValid(sheetEditor.category || 'Räkningar', 'expense');
      const nextMethod = sheetEditor.paymentMethod || 'Autogiro';
      const nextLogo = sheetEditor.logo || getLogoUrl(cleanTitle, nextCat);
      const nextIsShared = Boolean(sheetEditor.isShared);
      const nextFullAmt = nextIsShared
        ? Math.max(cleanAmt, Math.round(Number(sheetEditor.fullAmount) || cleanAmt * 2))
        : undefined;
      if (sheetEditor.mode === 'add') {
        onAddFixed({
          name: cleanTitle,
          amount: cleanAmt,
          dueDay: cleanDay,
          category: nextCat,
          paymentMethod: nextMethod,
          logo: nextLogo,
          isShared: nextIsShared,
          fullAmount: nextFullAmt,
        });
        setSuggestedFixedExpenses((prev) => [
          ...prev,
          {
            id: `custom-${Date.now()}`,
            name: cleanTitle,
            amount: cleanAmt,
            dueDay: cleanDay,
            category: nextCat,
            paymentMethod: nextMethod,
            logo: nextLogo,
            checked: true,
            isShared: nextIsShared,
            fullAmount: nextFullAmt,
          },
        ]);
      } else if (sheetEditor.id) {
        const prevSuggested = suggestedFixedExpenses.find((f) => f.id === sheetEditor.id);
        setSuggestedFixedExpenses((prev) =>
          prev.map((item) =>
            item.id === sheetEditor.id
              ? {
                  ...item,
                  name: cleanTitle,
                  amount: cleanAmt,
                  dueDay: cleanDay,
                  category: nextCat,
                  paymentMethod: nextMethod,
                  logo: nextLogo,
                  checked: true,
                  isShared: nextIsShared,
                  fullAmount: nextFullAmt,
                }
              : item
          )
        );
        if (onUpdateFixed) {
          const existing = fixedExpenses.find(
            (f) =>
              f.id === sheetEditor.id ||
              (prevSuggested && f.name.toLowerCase() === prevSuggested.name.toLowerCase())
          );
          if (existing) {
            onUpdateFixed({
              ...existing,
              name: cleanTitle,
              amount: cleanAmt,
              dueDay: cleanDay,
              category: nextCat,
              paymentMethod: nextMethod,
              logo: nextLogo,
              isShared: nextIsShared,
              fullAmount: nextFullAmt,
            });
          }
        }
      }
    }

    setSheetEditor(null);
  };

  const handleDeleteFromSheet = () => {
    if (!sheetEditor || !sheetEditor.id) return;
    if (sheetEditor.type === 'income') {
      const target = suggestedIncomes.find((i) => i.id === sheetEditor.id);
      setSuggestedIncomes((prev) => prev.filter((i) => i.id !== sheetEditor.id));
      const existing = incomes.find(
        (i) =>
          i.id === sheetEditor.id ||
          (target && i.name.toLowerCase() === target.name.toLowerCase())
      );
      if (existing) {
        onDeleteIncome(existing.id);
      }
    } else {
      const target = suggestedFixedExpenses.find((f) => f.id === sheetEditor.id);
      setSuggestedFixedExpenses((prev) => prev.filter((f) => f.id !== sheetEditor.id));
      const existing = fixedExpenses.find(
        (f) =>
          f.id === sheetEditor.id ||
          (target && f.name.toLowerCase() === target.name.toLowerCase())
      );
      if (existing) {
        onDeleteFixed(existing.id);
      }
    }
    setSheetEditor(null);
  };

  const renderQuickChips = (type: 'income' | 'fixed') => {
    const taken = new Set(
      (type === 'income' ? suggestedIncomes : suggestedFixedExpenses).map((i) =>
        i.name.toLowerCase()
      )
    );
    const chips = (type === 'income' ? QUICK_INCOMES : QUICK_FIXED).filter(
      (c) => !taken.has(c.name.toLowerCase())
    );
    const renderChip = (c: { name: string; category: string; amount?: number; paymentMethod?: string }) => (
      <button
        key={c.name}
        type="button"
        onClick={() => openAddSheet(type, c)}
        className="h-10 pl-3 pr-4 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.97] text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-all cursor-pointer"
      >
        <Plus size={14} weight="bold" className="text-[var(--text-secondary)]" />
        <span>{c.name}</span>
      </button>
    );
    if (type === 'fixed') {
      return (
        <div className="space-y-4">
          {QUICK_FIXED_GROUPS.map((group) => {
            const groupChips = group.items.filter((c) => !taken.has(c.name.toLowerCase()));
            if (groupChips.length === 0) return null;
            return (
              <div key={group.title} className="space-y-2">
                <p className="text-xs font-medium text-[var(--text-muted)]">{group.title}</p>
                <div className="flex flex-wrap gap-2">{groupChips.map(renderChip)}</div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => openAddSheet(type)}
            className="h-10 pl-3 pr-4 rounded-full border border-dashed border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.97] text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} weight="bold" />
            <span>Annat</span>
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => openAddSheet(type, c)}
            className="h-10 pl-3 pr-4 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.97] text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus size={14} weight="bold" className="text-[var(--text-secondary)]" />
            <span>{c.name}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => openAddSheet(type)}
          className="h-10 pl-3 pr-4 rounded-full border border-dashed border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] active:scale-[0.97] text-sm font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Plus size={14} weight="bold" />
          <span>Annat</span>
        </button>
      </div>
    );
  };

  const totalInc = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalFix = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
  const kvarAttSpendera = Math.max(0, totalInc - totalFix);

  const filteredBanks = React.useMemo(() => {
    const q = bankSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return CONSUMER_SWEDISH_BANKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [bankSearchQuery]);

  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

  return (
    <div className="h-dvh max-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] font-sans overflow-hidden select-none">
      {/* 1. TOP HEADER (Pinned / Non-scrolling) */}
      <header className="shrink-0 space-y-3 pb-1">
        <div className="flex items-center h-9">
          <button
            type="button"
            onClick={() => {
              if (step === 2 && step2View !== 'grid') {
                setStep2View('grid');
                setAuthError(null);
                return;
              }
              if (stepIndex > 0) {
                navigateStep(stepOrder[stepIndex - 1], 'back');
              } else if (onBackToLanding) {
                onBackToLanding();
              }
            }}
            className="p-1.5 -ml-1.5 text-[var(--text-primary)] flex items-center justify-center hover:opacity-70 active:scale-95 transition-all cursor-pointer"
            aria-label="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
        </div>

        {/* En enda lång sammanhängande progress-bar utan stegtext */}
        <div className="w-full h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-out"
            style={{ width: `${((stepIndex + 1) / stepOrder.length) * 100}%` }}
          />
        </div>
      </header>

      {/* ============================================================== */}
      {/* STEG 1: FÖRNAMN (Låst skärm, noll scroll, pinnad knapp)        */}
      {/* ============================================================== */}
      {step === 1 && (
        <form
          key="step-1"
          onSubmit={handleNextFromStep1}
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          <div className="shrink-0 pt-6 pb-4">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Vad heter du?
            </h1>
          </div>

          <div className="my-auto py-4">
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

          <div className="shrink-0 pt-3">
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-35 transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* STEG 2: KOPPLA DIN BANK (Inline sök + 3x3 grid + kontoval)     */}
      {/* ============================================================== */}
      {step === 2 && (
        <div
          key="step-2"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          {/* SUB-VIEW: VÄLJ KONTON (Bara kontolistan scrollar, inga dubbla namnfält) */}
          {step2View === 'select-accounts' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="shrink-0 pt-6 pb-4">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Välj konton att synka
                </h1>
              </div>

              {/* Scrollbar kontolista */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
                {fetchedAccounts.map((acc, idx) => {
                  const isChecked = selectedAccountIds.includes(acc.id);
                  const currentName = getSmartAccountDefaultName(acc, idx);
                  const rawNum = (acc.bban || acc.iban || '').trim();
                  const formattedNum =
                    rawNum.length === 11 && /^\d+$/.test(rawNum)
                      ? `${rawNum.slice(0, 4)}-${rawNum.slice(4)}`
                      : rawNum || acc.product || 'Bankkonto';

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleAccountSelection(acc.id)}
                      className={`w-full p-4 rounded-2xl border flex items-center gap-3.5 text-left transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                          : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                      }`}
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
                        <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                          {currentName}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] block tabular-nums mt-0.5">
                          {formattedNum}
                        </span>
                      </div>
                      {acc.balance_amount !== null && acc.balance_amount !== undefined && (
                        <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)] shrink-0">
                          {formatKr(acc.balance_amount)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pinnad knapp */}
              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  disabled={savingAccounts || selectedAccountIds.length === 0}
                  onClick={handleSaveSelectedAccounts}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-40 transition-all cursor-pointer"
                >
                  {savingAccounts ? (
                    <>
                      <SpinnerGap size={16} className="animate-spin" />
                      <span>Synkar valda konton...</span>
                    </>
                  ) : (
                    <>
                      <span>Fortsätt</span>
                      <ArrowRight size={16} weight="bold" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW: KOPPLA BANK MED DIREKT SÖKFÄLT + 3x3 GRID PÅ SAMMA SIDA */}
          {step2View === 'grid' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="shrink-0 pt-6 pb-4">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Koppla din bank
                </h1>
              </div>

              <div className="flex-1 min-h-0 flex flex-col justify-center py-1 space-y-4">
                {authError && (
                  <div className="shrink-0 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2.5 animate-scale-in">
                    <div className="flex items-center gap-2">
                      <WarningCircle size={16} weight="fill" className="shrink-0" />
                      <span>{authError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthError(null)}
                      className="text-xs font-semibold underline shrink-0 cursor-pointer"
                    >
                      Stäng
                    </button>
                  </div>
                )}

                {(bankCallbackStatusMsg || verifyingBankReturn) && (
                  <div className="shrink-0 p-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-3 text-xs font-medium text-[var(--text-primary)] animate-scale-in">
                    <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                    <span>
                      {bankCallbackStatusMsg ||
                        'Verifierar BankID-inloggning och hämtar dina konton...'}
                    </span>
                  </div>
                )}

                {hasConnectedBank ? (
                  <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
                    {connections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <ItemLogo name={conn.aspsp_name} logoUrl={conn.aspsp_logo || undefined} size="md" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[var(--surface-color)]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-display font-semibold text-sm text-[var(--text-primary)] block truncate">
                              {conn.aspsp_name}
                            </span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              Ansluten
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}

                    {_bankAccounts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => applyConnectedBankState(connections, _bankAccounts)}
                        className="w-full py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Välj vilka konton som ska synkas
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col justify-center space-y-3">
                    {/* Sökfält direkt på samma sida */}
                    <div className="relative shrink-0">
                      <MagnifyingGlass
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                      />
                      <input
                        type="text"
                        value={bankSearchQuery}
                        onChange={(e) => setBankSearchQuery(e.target.value)}
                        placeholder="Sök bank..."
                        className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                      />
                      {bankSearchQuery.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setBankSearchQuery('')}
                          aria-label="Rensa sökning"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                        >
                          <X size={14} weight="bold" />
                        </button>
                      )}
                    </div>

                    {bankSearchQuery.trim().length > 0 ? (
                      <div className="flex-1 min-h-0 max-h-72 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 sm:gap-2.5 content-start pr-0.5">
                        {filteredBanks.length > 0 ? (
                          filteredBanks.map((b) => {
                            const isConnecting =
                              startingAuth && connectingBankName === b.name;
                            const isAnyConnecting = startingAuth && Boolean(connectingBankName);

                            return (
                              <button
                                key={b.name}
                                type="button"
                                disabled={isAnyConnecting}
                                onClick={() => handleSelectBankInline(b)}
                                className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 active:scale-95 cursor-pointer group ${
                                  isConnecting
                                    ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] scale-[0.98]'
                                    : isAnyConnecting
                                    ? 'bg-[var(--surface-color)] border-[var(--border-subtle)] opacity-40 pointer-events-none'
                                    : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-primary)]'
                                }`}
                              >
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-150 group-hover:scale-105 shrink-0 relative">
                                  {isConnecting ? (
                                    <SpinnerGap size={24} className="animate-spin text-[var(--bg-color)]" />
                                  ) : (
                                    <ItemLogo name={b.name} logoUrl={b.logo || undefined} size="lg" />
                                  )}
                                </div>
                                <span className="font-display font-semibold text-[11px] sm:text-[12px] text-center truncate max-w-full leading-tight">
                                  {isConnecting ? 'Ansluter...' : b.name}
                                </span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="col-span-3 py-10 text-center text-xs text-[var(--text-muted)]">
                            Ingen bank hittades
                          </div>
                        )}
                      </div>
                    ) : (
                      /* 3x3 Grid med de 9 vanligaste svenska bankerna */
                      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 shrink-0">
                        {POPULAR_SWEDISH_BANKS.map((b) => {
                          const isConnecting =
                            startingAuth &&
                            (connectingBankName === b.name || connectingBankName === b.displayName);
                          const isAnyConnecting = startingAuth && Boolean(connectingBankName);

                          return (
                            <button
                              key={b.id}
                              type="button"
                              disabled={isAnyConnecting}
                              onClick={() => handleSelectBankInline(b)}
                              className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 active:scale-95 cursor-pointer group ${
                                isConnecting
                                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] scale-[0.98]'
                                  : isAnyConnecting
                                  ? 'bg-[var(--surface-color)] border-[var(--border-subtle)] opacity-40 pointer-events-none'
                                  : 'bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border-[var(--border-subtle)] hover:border-[var(--text-primary)]/40 text-[var(--text-primary)]'
                              }`}
                            >
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden transition-transform duration-150 group-hover:scale-105 shrink-0 relative">
                                {isConnecting ? (
                                  <SpinnerGap size={24} className="animate-spin text-[var(--bg-color)]" />
                                ) : (
                                  <ItemLogo name={b.displayName} size="lg" />
                                )}
                              </div>
                              <span className="font-display font-semibold text-[11px] sm:text-[12px] text-center truncate max-w-full leading-tight">
                                {isConnecting ? 'Ansluter...' : b.displayName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Trygghetsrad */}
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-muted)] pt-1 shrink-0">
                      <ShieldCheck size={14} weight="regular" />
                      <span>Säker koppling via Mobilt BankID</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinnad bottenknapp: Visa "Fortsätt" ENDAST om bank är ansluten, annars enbart "Hoppa över just nu" */}
              <div className="shrink-0 pt-3">
                {hasConnectedBank ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        _bankAccounts.length > 0 &&
                        localStorage.getItem('dejz_onboarding_accounts_confirmed') !== 'true'
                      ) {
                        applyConnectedBankState(connections, _bankAccounts);
                        return;
                      }
                      navigateStep(3, 'forward');
                    }}
                    className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Fortsätt</span>
                    <ArrowRight size={16} weight="bold" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateStep(3, 'forward')}
                    className="w-full py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    Hoppa över just nu
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 3: VILKA FASTA UTGIFTER HAR DU? (Bocka i/ur + redigera)   */}
      {/* ============================================================== */}
      {step === 3 && (
        <div
          key="step-3"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          <div className="shrink-0 pt-6 pb-4">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Vilka fasta utgifter har du?
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Räkningar som dras varje månad. Tryck och skriv beloppet.
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
            {analyzingBank && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-pulse">
                <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                <span>Letar efter dina räkningar …</span>
              </div>
            )}

            <div className="space-y-2">
              {suggestedFixedExpenses.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                    item.checked
                      ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                  }`}
                >
                  {/* Checkbox med generös träffyta */}
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestedFixedExpenses((prev) =>
                        prev.map((p) => (p.id === item.id ? { ...p, checked: !p.checked } : p))
                      )
                    }
                    aria-label={`Välj ${item.name}`}
                    className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        item.checked
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {item.checked && <Check size={12} weight="bold" />}
                    </span>
                  </button>

                  {/* Rad: tryck för att ändra belopp, namn, kategori eller dag direkt */}
                  <button
                    type="button"
                    onClick={() => openEditSuggestedFixed(item)}
                    className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                  >
                    <ItemLogo
                      name={item.name}
                      category={item.category}
                      logoUrl={item.logo}
                      size="md"
                      isRecurring={false}
                    />

                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {item.name}
                      </span>
                      <span className="ui-row-subtitle flex items-center gap-1.5">
                        <CategoryIcon
                          category={item.category || 'Räkningar'}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
                        <span className="truncate">
                          {item.category || 'Räkningar'}
                        </span>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="ui-row-amount">
                        −{formatKr(item.amount)}
                      </span>
                      <span className="ui-row-meta">
                        {item.isShared && hasConnectedHouseholdPartner()
                          ? `Delad · Den ${item.dueDay}:e`
                          : `Den ${item.dueDay}:e`}
                      </span>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            <div className={suggestedFixedExpenses.length > 0 ? 'pt-3' : ''}>
              {renderQuickChips('fixed')}
            </div>
          </div>

          <div className="shrink-0 pt-3 space-y-2">
            {suggestedFixedExpenses.some((f) => f.checked) && (
              <div className="flex items-center justify-between px-1 text-xs text-[var(--text-secondary)]">
                <span>
                  {suggestedFixedExpenses.filter((f) => f.checked).length} valda fasta utgifter
                </span>
                <span className="font-display font-semibold text-[var(--text-primary)] tabular-nums">
                  -
                  {formatKr(
                    suggestedFixedExpenses
                      .filter((f) => f.checked)
                      .reduce((sum, f) => sum + (Number(f.amount) || 0), 0)
                  )}
                  /mån
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSaveSuggestedFixed}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 4: VILKA FASTA INKOMSTER HAR DU? (Bocka i/ur + redigera)  */}
      {/* ============================================================== */}
      {step === 4 && (
        <div
          key="step-4"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          <div className="shrink-0 pt-6 pb-4">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Vilka fasta inkomster har du?
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Det du får in varje månad, efter skatt. Tryck och skriv beloppet.
            </p>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
            {analyzingBank && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-pulse">
                <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                <span>Analyserar dina inkomster...</span>
              </div>
            )}

            <div className="space-y-2">
              {suggestedIncomes.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center gap-2.5 ${
                    item.checked
                      ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                  }`}
                >
                  {/* Checkbox med generös träffyta */}
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestedIncomes((prev) =>
                        prev.map((p) => (p.id === item.id ? { ...p, checked: !p.checked } : p))
                      )
                    }
                    aria-label={`Välj ${item.name}`}
                    className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                        item.checked
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {item.checked && <Check size={12} weight="bold" />}
                    </span>
                  </button>

                  {/* Rad: tryck för att ändra belopp, namn, kategori eller dag direkt */}
                  <button
                    type="button"
                    onClick={() => openEditSuggestedIncome(item)}
                    className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                  >
                    <ItemLogo
                      name={item.name}
                      category={item.category}
                      logoUrl={item.logo}
                      size="md"
                      isRecurring={false}
                    />

                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {item.name}
                      </span>
                      <span className="ui-row-subtitle flex items-center gap-1.5">
                        <CategoryIcon
                          category={item.category || 'Lön'}
                          size={11}
                          className="shrink-0 text-[var(--text-secondary)]"
                        />
                        <span className="truncate">
                          {item.category || 'Lön'}
                        </span>
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="ui-row-amount ui-row-amount-income">
                        +{formatKr(item.amount)}
                      </span>
                      <span className="ui-row-meta">
                        Den {item.payday}:e
                      </span>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            <div className={suggestedIncomes.length > 0 ? 'pt-3' : ''}>
              {renderQuickChips('income')}
            </div>
          </div>

          <div className="shrink-0 pt-3 space-y-2">
            {suggestedIncomes.some((i) => i.checked) && (
              <div className="flex items-center justify-between px-1 text-xs text-[var(--text-secondary)]">
                <span>
                  {suggestedIncomes.filter((i) => i.checked).length} valda inkomster
                </span>
                <span className="font-display font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +
                  {formatKr(
                    suggestedIncomes
                      .filter((i) => i.checked)
                      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                  )}
                  /mån
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={handleSaveSuggestedIncomes}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 5: NÄR FÅR DU LÖN? (Minimalistisk dragrad, auto-förvald)  */}
      {/* ============================================================== */}
      {step === 5 && (
        <div
          key="step-5"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          <div className="shrink-0 pt-6 pb-4">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              När får du lön?
            </h1>
          </div>

          <div className="my-auto py-4 space-y-10">
            {/* Direkt på bakgrunden utan kort/modul */}
            <div className="space-y-6 py-2">
              <div className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-[var(--text-primary)] tabular-nums text-center">
                {payday === 31 ? 'Sista dagen' : `Den ${payday}:e`}
              </div>

              <div>
                <input
                  type="range"
                  min={1}
                  max={31}
                  value={payday}
                  onChange={(e) => setPayday(Number(e.target.value))}
                  aria-label="Välj lönedag"
                  style={{
                    background: `linear-gradient(to right, var(--text-primary) 0%, var(--text-primary) ${
                      ((payday - 1) / 30) * 100
                    }%, var(--border-subtle) ${
                      ((payday - 1) / 30) * 100
                    }%, var(--border-subtle) 100%)`,
                  }}
                  className="ui-payday-slider"
                />
              </div>
            </div>

            {/* En enda ren rad för helghantering direkt på bakgrunden */}
            <div className="pt-4 border-t border-[var(--border-subtle)]/60 flex items-center justify-between gap-4">
              <span className="font-sans font-medium text-xs sm:text-sm text-[var(--text-secondary)]">
                Betalas ut fredagen före vid helg
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={weekendHandling === 'before'}
                onClick={() =>
                  setWeekendHandling((prev) => (prev === 'before' ? 'none' : 'before'))
                }
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

          <div className="shrink-0 pt-3">
            <button
              type="button"
              onClick={handleNextFromStep5Payday}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 6: AVSKALAD ÖVERSIKT (Ingen dubblettlista, noll scroll)   */}
      {/* ============================================================== */}
      {step === 6 && (
        <div
          key="step-6"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          <div className="shrink-0 pt-6 pb-4">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Kvar efter fasta räkningar
            </h1>
          </div>

          <div className="my-auto py-4 space-y-6">
            <div className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-[var(--text-primary)] tabular-nums">
              {formatKr(kvarAttSpendera)}
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]/60 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">
                  Inkomster
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatKr(totalInc)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">
                  Fasta utgifter
                </span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  −{formatKr(totalFix)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[var(--text-muted)]">Lönedag</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  {payday === 31 ? 'Sista dagen' : `Den ${payday}:e`}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0 pt-3">
            {stepOrder.includes(7) ? (
              <button
                type="button"
                onClick={() => goNext(6)}
                className="ui-btn-primary py-3.5 text-sm"
              >
                <span>Fortsätt</span>
                <ArrowRight size={16} weight="bold" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onComplete}
                className="ui-btn-primary py-3.5 text-sm"
              >
                <span>Öppna Dejz</span>
                <Check size={16} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 7 (utan bank): SALDO JUST NU                              */}
      {/* ============================================================== */}
      {step === 7 && (
        <form
          key="step-7"
          onSubmit={(e) => {
            e.preventDefault();
            const amt = Math.round(Number(balanceInput.replace(/\s/g, '').replace(',', '.')));
            if (balanceInput.trim() !== '' && Number.isFinite(amt)) {
              setManualBalance({ amount: amt, at: new Date().toISOString() });
            }
            onComplete();
          }}
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          <div className="shrink-0 pt-6 pb-4">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Hur mycket har du på kontot just nu?
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Kolla i din bankapp. Dejz drar av räkningarna som är kvar före lön – då ser du exakt vad
              du kan spendera.
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Bankkoppling kommer snart. Tills dess skriver du in saldot själv – det ger dig full koll.
            </p>
          </div>

          <div className="my-auto py-4">
            <label className="flex items-baseline gap-2 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] px-4 py-4 cursor-text">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value.replace(/[^\d\s,.-]/g, ''))}
                className="flex-1 min-w-0 bg-transparent border-0 p-0 font-display font-semibold text-[34px] leading-none tabular-nums text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
              />
              <span className="text-base font-medium text-[var(--text-secondary)]">kr</span>
            </label>
          </div>

          <div className="shrink-0 pt-3 space-y-1">
            {/* Nyhetsbrev: bara för den som inte redan svarat (t.ex. Google-inloggning). Aldrig förkryssat. */}
            {showConsentQuestion && (
              <label className="flex items-start gap-3 px-1 pb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => {
                    setConsentChecked(e.target.checked);
                    void setMarketingConsent(e.target.checked, 'introduktion');
                  }}
                  className="mt-0.5 w-5 h-5 shrink-0 rounded-md accent-[var(--accent-color)] cursor-pointer"
                />
                <span className="text-[13px] leading-[1.45] text-[var(--text-secondary)]">
                  Ja, skicka mig tips och nyheter från Dejz. Du kan avsluta när du vill.
                </span>
              </label>
            )}
            <button
              type="submit"
              disabled={balanceInput.trim() === ''}
              className="ui-btn-primary py-3.5 text-sm disabled:opacity-35"
            >
              <span>Öppna Dejz</span>
              <Check size={16} weight="bold" />
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-2.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Hoppa över just nu
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* RIKTIGT BOTTOM-SHEET FÖR ATT LÄGGA TILL / ÄNDRA POSTER         */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(sheetEditor)}
        onClose={() => setSheetEditor(null)}
      >
        {sheetEditor && (
          <div>
            {sheetSubView === 'day-picker' && (
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
                    {sheetEditor.type === 'income' ? 'Välj utbetalningsdag' : 'Välj förfallodag'}
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
                />
              </div>
            )}

            {sheetSubView === 'category-picker' && (
              <div
                key="sheet-category-picker"
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
                  <span className="ui-sheet-title">Välj kategori</span>
                  <button
                    type="button"
                    onClick={() => setSheetEditor(null)}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="ui-sheet-group">
                  {(sheetEditor.type === 'income'
                    ? availableIncomeCategories
                    : availableExpenseCategories
                  ).map((c) => {
                    const isSel = c === sheetEditor.category;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setSheetEditor({ ...sheetEditor, category: c });
                          setSheetNavDir('back');
                          setSheetSubView('main');
                        }}
                        className="ui-row-btn"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon category={c} size={14} badge={true} />
                          <span
                            className={`truncate ${
                              isSel
                                ? 'font-medium text-[var(--text-primary)]'
                                : 'font-normal text-[var(--text-primary)]'
                            }`}
                          >
                            {c}
                          </span>
                        </div>
                        {isSel && (
                          <Check
                            size={14}
                            weight="bold"
                            className="text-[var(--text-primary)] shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sheetSubView === 'payment-picker' && (
              <div
                key="sheet-payment-picker"
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
                  <span className="ui-sheet-title">Välj betalsätt</span>
                  <button
                    type="button"
                    onClick={() => setSheetEditor(null)}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="ui-sheet-group">
                  {availablePaymentMethods.map((m) => {
                    const isSel = m === (sheetEditor.paymentMethod || 'Autogiro');
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setSheetEditor({ ...sheetEditor, paymentMethod: m });
                          setSheetNavDir('back');
                          setSheetSubView('main');
                        }}
                        className="ui-row-btn"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PaymentMethodIcon method={m} size={17} />
                          <span
                            className={`truncate ${
                              isSel
                                ? 'font-medium text-[var(--text-primary)]'
                                : 'font-normal text-[var(--text-primary)]'
                            }`}
                          >
                            {m}
                          </span>
                        </div>
                        {isSel && (
                          <Check
                            size={14}
                            weight="bold"
                            className="text-[var(--text-primary)] shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sheetSubView === 'main' && (
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

                {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
                  <label className="flex items-center gap-3.5 cursor-text">
                    <ItemLogo
                      name={
                        sheetEditor.name ||
                        (sheetEditor.type === 'income' ? 'Lön' : 'Fast utgift')
                      }
                      category={sheetEditor.category}
                      logoUrl={sheetEditor.logo}
                      size="lg"
                      isRecurring={true}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        Namn
                      </span>
                      <input
                        type="text"
                        required
                        autoFocus={sheetEditor.mode === 'add' && !sheetEditor.name}
                        placeholder={
                          sheetEditor.type === 'income'
                            ? 't.ex. Lön eller CSN'
                            : 't.ex. Riksbyggen eller Netflix'
                        }
                        value={sheetEditor.name}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          const inferred = inferCategoryAndMethodFromName(
                            nextName,
                            sheetEditor.type
                          );
                          setSheetEditor((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  name: nextName,
                                  ...(inferred?.category ? { category: inferred.category } : {}),
                                  ...(inferred?.paymentMethod && prev.type === 'fixed'
                                    ? { paymentMethod: inferred.paymentMethod }
                                    : {}),
                                  ...(inferred?.logo ? { logo: inferred.logo } : {}),
                                }
                              : prev
                          );
                        }}
                        className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                      />
                    </div>
                  </label>

                  <div className="border-t border-[var(--border-subtle)] pt-3.5">
                    <label className="block cursor-text">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                        Belopp per månad
                      </span>
                      <div className="flex items-baseline justify-between gap-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          autoFocus={sheetEditor.mode === 'add' && !!sheetEditor.name}
                          placeholder="0"
                          value={sheetEditor.amount}
                          onChange={(e) =>
                            setSheetEditor((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    amount: e.target.value.replace(/[^\d]/g, ''),
                                  }
                                : prev
                            )
                          }
                          className={`w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl tabular-nums focus:outline-none placeholder-[var(--text-muted)]/40 ${
                            sheetEditor.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-[var(--text-primary)]'
                          }`}
                        />
                        <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                          kr/mån
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Valbara rader för Kategori, Betalsätt och Dag */}
                <div className="ui-sheet-group text-[14px] sm:text-sm">

                  <button
                    type="button"
                    onClick={() => {
                      setSheetNavDir('forward');
                      setSheetSubView('category-picker');
                    }}
                    className="ui-row-btn"
                  >
                    <span className="text-[var(--text-muted)] shrink-0">Kategori</span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <CategoryIcon
                        category={
                          sheetEditor.category ||
                          (sheetEditor.type === 'income' ? 'Lön' : 'Räkningar')
                        }
                        size={13}
                        className="shrink-0 text-[var(--text-secondary)]"
                      />
                      <span>
                        {sheetEditor.category ||
                          (sheetEditor.type === 'income' ? 'Lön' : 'Räkningar')}
                      </span>
                      <CaretRight size={12} className="text-[var(--text-muted)]" />
                    </span>
                  </button>

                  {sheetEditor.type === 'fixed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSheetNavDir('forward');
                        setSheetSubView('payment-picker');
                      }}
                      className="ui-row-btn"
                    >
                      <span className="text-[var(--text-muted)] shrink-0">Betalsätt</span>
                      <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                        <PaymentMethodIcon method={sheetEditor.paymentMethod || 'Autogiro'} size={15} />
                        <span>{sheetEditor.paymentMethod || 'Autogiro'}</span>
                        <CaretRight size={12} className="text-[var(--text-muted)]" />
                      </span>
                    </button>
                  )}

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

                  {sheetEditor.type === 'fixed' && hasConnectedHouseholdPartner() && (
                    <div className="ui-row">
                      <div className="min-w-0">
                        <span className="text-[var(--text-muted)] block">Dela utgift (50 %)</span>
                        {sheetEditor.isShared && (
                          <span className="text-[11px] text-[var(--text-secondary)] tabular-nums block">
                            Din andel: {formatKr(Number(sheetEditor.amount) || 0)}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(sheetEditor.isShared)}
                        onClick={() =>
                          setSheetEditor((prev) => {
                            if (!prev) return prev;
                            const nextShared = !prev.isShared;
                            const currAmt = Math.max(0, Math.round(Number(prev.amount) || 0));
                            if (nextShared) {
                              const half = Math.max(1, Math.round(currAmt / 2));
                              return {
                                ...prev,
                                isShared: true,
                                fullAmount: String(currAmt),
                                amount: String(half),
                              };
                            } else {
                              const restored = Math.max(
                                currAmt,
                                Math.round(Number(prev.fullAmount) || currAmt * 2)
                              );
                              return {
                                ...prev,
                                isShared: false,
                                amount: String(restored),
                              };
                            }
                          })
                        }
                        className={`ui-switch ${
                          sheetEditor.isShared ? 'ui-switch-on' : 'ui-switch-off'
                        }`}
                      >
                        <span
                          className={`ui-switch-thumb ${
                            sheetEditor.isShared ? 'ui-switch-thumb-on' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}
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

