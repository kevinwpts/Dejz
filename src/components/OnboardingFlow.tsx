import React, { useState, useEffect } from 'react';
import { useOnboardingSheet } from './onboarding/useOnboardingSheet';
import { OnboardingItemSheet } from './onboarding/OnboardingItemSheet';
import { estimateFromAmounts } from '../utils/variableBills';
import { getMarketingConsent, hasPendingSignupConsent } from '../utils/marketingConsent';
import { isDemoMode } from '../utils/demoUtils';
import { CaretLeft } from '@phosphor-icons/react';
import { IncomeItem, FixedExpenseItem } from './HomeTab';
import { bankService, BankAspsp, BankConnection, BankAccount } from '../services/bankService';
import { WeekendHandlingMode } from '../utils/periodEngine';
import {
  extractOnboardingAiCandidates,
} from '../utils/bankHistoryAnalyzer';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
  syncAllUserPreferencesToSupabase,
} from '../utils/appCache';
import {
  BANK_RETURN_MARKER_KEY,
  CONSUMER_SWEDISH_BANKS,
  OnboardingStep,
  STEP_ORDER_MANUAL,
  STEP_ORDER_WITH_BANK,
  SheetEditorState,
  clearBankReturnMarker,
  hasFreshBankReturnMarker,
} from './onboarding/onboardingConfig';
import { BankSummaryStep } from './onboarding/BankSummaryStep';
import { OnboardingStepName } from './onboarding/OnboardingStepName';
import { OnboardingStepBank } from './onboarding/OnboardingStepBank';
import { OnboardingStepFixedList } from './onboarding/OnboardingStepFixedList';
import { OnboardingStepIncomeList } from './onboarding/OnboardingStepIncomeList';
import { OnboardingStepPayday } from './onboarding/OnboardingStepPayday';
import { OnboardingStepResult } from './onboarding/OnboardingStepResult';
import { OnboardingStepBalance } from './onboarding/OnboardingStepBalance';
import { appOrigin } from '../utils/platform';

export interface OnboardingFlowProps {
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
  // Med bank: när lönen hittats i banken behövs inget eget steg för lönedagen
  const [paydayFromBank, setPaydayFromBank] = useState(false);
  const stepOrder = bankEnabled
    ? paydayFromBank
      ? STEP_ORDER_WITH_BANK.filter((s) => s !== 5)
      : STEP_ORDER_WITH_BANK
    : STEP_ORDER_MANUAL;
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
  // Med bank visas först ett kort att bekräfta ("Stämmer"); listan finns bakom "Visa och ändra"
  const [showIncomeList, setShowIncomeList] = useState(false);
  const [showFixedList, setShowFixedList] = useState(false);
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

  // Senaste värdena som analysen läser när den startar. Ligger i en ref så att analysen
  // INTE startas om när de ändras (se ovan) men ändå får färska värden vid start.
  const bankAnalysisInputsRef = React.useRef({
    connectionsCount: connections.length,
    fetchedAccounts,
    bankAccounts: _bankAccounts,
    onBankStateUpdated,
    payday,
    weekendHandling,
  });
  useEffect(() => {
    bankAnalysisInputsRef.current = {
      connectionsCount: connections.length,
      fetchedAccounts,
      bankAccounts: _bankAccounts,
      onBankStateUpdated,
      payday,
      weekendHandling,
    };
  });

  useEffect(() => {
    if (step !== 3 && step !== 4) return;

    // Utan bank: hämta inget från banken. Inga påhittade belopp – användaren trycker på
    // snabbknapparna (Lön, Hyra …) och fyller i sina egna siffror.
    if (!bankEnabled) return;

    if (bankAnalysisInFlightRef.current) return;
    if (bankAnalysisDoneRef.current && !pendingSyncConnectionIdRef.current) return;
    bankAnalysisInFlightRef.current = true;
    const {
      connectionsCount,
      fetchedAccounts: fetchedAccountsAtStart,
      bankAccounts: bankAccountsAtStart,
      onBankStateUpdated: onBankStateUpdatedAtStart,
      payday: paydayAtStart,
      weekendHandling: weekendHandlingAtStart,
    } = bankAnalysisInputsRef.current;

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
          if (status && onBankStateUpdatedAtStart && isMounted()) {
            onBankStateUpdatedAtStart(status.connections, status.accounts);
          }
        }

        let bankTxs = await bankService
          .listAllTransactionsForReconciliation(5000, false)
          .catch(() => []);

        // Om användaren laddade om på steg 3 och transaktionerna inte hunnit hämtas än, kör en full synk av valda konton nu
        if ((!bankTxs || bankTxs.length === 0) && connectionsCount > 0) {
          await bankService.sync({ fullSync: true }).catch(() => {});
          bankTxs = await bankService
            .listAllTransactionsForReconciliation(5000, false)
            .catch(() => []);
        }

        let accountsForAnalysis =
          fetchedAccountsAtStart.length > 0 ? fetchedAccountsAtStart : bankAccountsAtStart;
        if (!accountsForAnalysis || accountsForAnalysis.length === 0) {
          accountsForAnalysis = (await bankService.getStatus().catch(() => null))?.accounts || [];
        }

        if (bankTxs.length > 0) {
          const { baseAnalysis } =
            extractOnboardingAiCandidates(
              bankTxs,
              paydayAtStart,
              weekendHandlingAtStart === 'before',
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
        // Lönen kommer från banken – spara lönedagen direkt och hoppa över lönedagssteget
        if (primaryInc.isFromBank) {
          try {
            localStorage.setItem('dejz_target_payday', String(primaryInc.payday));
            localStorage.setItem('dejz_weekend_handling', weekendHandling);
          } catch {
            // ignore
          }
          onUpdatePayday?.(primaryInc.payday);
          onUpdateWeekendHandling?.(weekendHandling);
          setPaydayFromBank(true);
        }
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

  // Kategorierna ligger i localStorage – läs om dem när redigeringsrutan öppnas/byter läge
  const sheetEditorType = sheetEditor?.type;
  const sheetEditorMode = sheetEditor?.mode;
  const availableExpenseCategories = React.useMemo(() => {
    void sheetEditorType;
    void sheetEditorMode;
    return getStoredExpenseCategories().map((c) => c.name);
  }, [sheetEditorType, sheetEditorMode]);

  const availableIncomeCategories = React.useMemo(() => {
    void sheetEditorType;
    void sheetEditorMode;
    return getStoredIncomeCategories().map((c) => c.name);
  }, [sheetEditorType, sheetEditorMode]);

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

    let safetyTimer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
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

      const redirectUrl = `${appOrigin()}/bank/callback`;
      const authPromise = bankService.startAuth({
        aspspName: bank.name,
        aspspCountry: bank.country || 'SE',
        aspspLogo: bank.logo || null,
        originContext: 'onboarding',
        environment: 'production',
        redirectUrl,
      });

      const res = await Promise.race([authPromise, timeoutPromise]);
      if (safetyTimer) clearTimeout(safetyTimer);

      if (res?.url) {
        window.location.assign(res.url);
      } else {
        throw new Error('Kunde inte hämta anslutningslänk från banken.');
      }
    } catch (err: unknown) {
      if (safetyTimer) clearTimeout(safetyTimer);
      setConnectingBankName(null);
      setAuthError((err as { message?: string }).message || 'Kunde inte starta autentisering mot banken. Testa igen.');
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
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

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
      goNext(2);
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
      goNext(2);
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

  // ---------------------------------------------------------------------------
  // Bekräfta-kort (med bank): visa det banken hittade som EN siffra och EN knapp.
  // Den som vill ändra något trycker "Visa och ändra" och får hela listan.
  // ---------------------------------------------------------------------------
  const bankIncomeItems = suggestedIncomes.filter((i) => i.checked);
  const bankFixedItems = suggestedFixedExpenses.filter((f) => f.checked);
  const incomeSummaryMode =
    bankEnabled &&
    !showIncomeList &&
    (analyzingBank || suggestedIncomes.some((i) => i.isFromBank));
  const fixedSummaryMode =
    bankEnabled &&
    !showFixedList &&
    (analyzingBank || suggestedFixedExpenses.some((f) => f.isFromBank));

  const listNames = (names: string[], max = 3) =>
    names.length <= max
      ? names.join(', ').replace(/, ([^,]*)$/, ' och $1')
      : `${names.slice(0, max).join(', ')} och ${names.length - max} till`;

  const sumOf = (items: { amount: number }[]) => items.reduce((sum, x) => sum + (Number(x.amount) || 0), 0);
  const primaryBankIncome = bankIncomeItems[0];
  const incomeSummaryAmount = `+${formatKr(sumOf(bankIncomeItems))}`;
  const incomeSummaryDetail =
    bankIncomeItems.length === 0
      ? 'Ingen inkomst vald'
      : bankIncomeItems.length === 1
      ? `${primaryBankIncome.category === 'Lön' ? 'Lön' : primaryBankIncome.name} · den ${primaryBankIncome.payday}:e varje månad`
      : `${listNames(bankIncomeItems.map((i) => i.name))} · varje månad`;
  const fixedSummaryAmount = `−${formatKr(sumOf(bankFixedItems))}/mån`;
  const fixedSummaryDetail =
    bankFixedItems.length === 0
      ? 'Inga fasta utgifter valda'
      : `${bankFixedItems.length} st · ${listNames(
          [...bankFixedItems].sort((a, b) => b.amount - a.amount).map((f) => f.name)
        )}`;

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
  const { openEditSuggestedFixed, renderQuickChips, openEditSuggestedIncome, handleSaveSheet, handleDeleteFromSheet } = useOnboardingSheet({
    setSheetSubView,
    setSheetNavDir,
    setSheetEditor,
    payday,
    sheetEditor,
    setSuggestedIncomes,
    setPayday,
    suggestedIncomes,
    setSuggestedFixedExpenses,
    suggestedFixedExpenses,
      incomes,
    fixedExpenses,
    onAddIncome,
    onAddFixed,
    onUpdateIncome,
    onUpdateFixed,
    onDeleteIncome,
    onDeleteFixed,
});

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
      <OnboardingStepName
        step={step}
        handleNextFromStep1={handleNextFromStep1}
        pageAnimClass={pageAnimClass}
        name={name}
        setName={setName}
      />

      {/* ============================================================== */}
      {/* STEG 2: KOPPLA DIN BANK (Inline sök + 3x3 grid + kontoval)     */}
      {/* ============================================================== */}
      <OnboardingStepBank
        step={step}
        pageAnimClass={pageAnimClass}
        step2View={step2View}
        fetchedAccounts={fetchedAccounts}
        selectedAccountIds={selectedAccountIds}
        getSmartAccountDefaultName={getSmartAccountDefaultName}
        toggleAccountSelection={toggleAccountSelection}
        formatKr={formatKr}
        savingAccounts={savingAccounts}
        handleSaveSelectedAccounts={handleSaveSelectedAccounts}
        authError={authError}
        setAuthError={setAuthError}
        bankCallbackStatusMsg={bankCallbackStatusMsg}
        verifyingBankReturn={verifyingBankReturn}
        hasConnectedBank={hasConnectedBank}
        connections={connections}
        _bankAccounts={_bankAccounts}
        applyConnectedBankState={applyConnectedBankState}
        bankSearchQuery={bankSearchQuery}
        setBankSearchQuery={setBankSearchQuery}
        filteredBanks={filteredBanks}
        startingAuth={startingAuth}
        connectingBankName={connectingBankName}
        handleSelectBankInline={handleSelectBankInline}
        goNext={goNext}
      />

      {/* ============================================================== */}
      {/* STEG 3: VILKA FASTA UTGIFTER HAR DU? (Bocka i/ur + redigera)   */}
      {/* ============================================================== */}
      {step === 3 && fixedSummaryMode && (
        <BankSummaryStep
          stepKey="step-3-summary"
          title="Dina fasta utgifter"
          subtitle="Räkningar och abonnemang som dras varje månad."
          loadingText="Letar efter dina räkningar …"
          amountText={fixedSummaryAmount}
          detailText={fixedSummaryDetail}
          amountClassName="text-[var(--text-primary)]"
          confirmLabel="Ser rätt ut"
          onConfirm={handleSaveSuggestedFixed}
          onShowList={() => setShowFixedList(true)}
          animClass={pageAnimClass}
          loading={analyzingBank}
        />
      )}

      <OnboardingStepFixedList
        step={step}
        fixedSummaryMode={fixedSummaryMode}
        pageAnimClass={pageAnimClass}
        analyzingBank={analyzingBank}
        suggestedFixedExpenses={suggestedFixedExpenses}
        setSuggestedFixedExpenses={setSuggestedFixedExpenses}
        openEditSuggestedFixed={openEditSuggestedFixed}
        formatKr={formatKr}
        renderQuickChips={renderQuickChips}
        handleSaveSuggestedFixed={handleSaveSuggestedFixed}
      />

      {/* ============================================================== */}
      {/* STEG 4: VILKA FASTA INKOMSTER HAR DU? (Bocka i/ur + redigera)  */}
      {/* ============================================================== */}
      {step === 4 && incomeSummaryMode && (
        <BankSummaryStep
          stepKey="step-4-summary"
          title={bankIncomeItems.length > 1 ? 'Dina inkomster' : 'Din lön'}
          subtitle="Vi hittade den bland dina transaktioner. Stämmer det?"
          loadingText="Letar efter din lön …"
          amountText={incomeSummaryAmount}
          detailText={incomeSummaryDetail}
          amountClassName="text-emerald-600 dark:text-emerald-400"
          confirmLabel="Stämmer"
          onConfirm={handleSaveSuggestedIncomes}
          onShowList={() => setShowIncomeList(true)}
          animClass={pageAnimClass}
          loading={analyzingBank}
        />
      )}

      <OnboardingStepIncomeList
        step={step}
        incomeSummaryMode={incomeSummaryMode}
        pageAnimClass={pageAnimClass}
        analyzingBank={analyzingBank}
        suggestedIncomes={suggestedIncomes}
        setSuggestedIncomes={setSuggestedIncomes}
        openEditSuggestedIncome={openEditSuggestedIncome}
        formatKr={formatKr}
        renderQuickChips={renderQuickChips}
        handleSaveSuggestedIncomes={handleSaveSuggestedIncomes}
      />

      {/* ============================================================== */}
      {/* STEG 5: NÄR FÅR DU LÖN? (Minimalistisk dragrad, auto-förvald)  */}
      {/* ============================================================== */}
      <OnboardingStepPayday
        step={step}
        pageAnimClass={pageAnimClass}
        payday={payday}
        setPayday={setPayday}
        weekendHandling={weekendHandling}
        setWeekendHandling={setWeekendHandling}
        handleNextFromStep5Payday={handleNextFromStep5Payday}
      />

      {/* ============================================================== */}
      {/* STEG 6: AVSKALAD ÖVERSIKT (Ingen dubblettlista, noll scroll)   */}
      {/* ============================================================== */}
      <OnboardingStepResult
        step={step}
        pageAnimClass={pageAnimClass}
        formatKr={formatKr}
        kvarAttSpendera={kvarAttSpendera}
        totalInc={totalInc}
        totalFix={totalFix}
        payday={payday}
        stepOrder={stepOrder}
        goNext={goNext}
        onComplete={onComplete}
      />

      {/* ============================================================== */}
      {/* STEG 7 (utan bank): SALDO JUST NU                              */}
      {/* ============================================================== */}
      <OnboardingStepBalance
        step={step}
        balanceInput={balanceInput}
        onComplete={onComplete}
        pageAnimClass={pageAnimClass}
        setBalanceInput={setBalanceInput}
        showConsentQuestion={showConsentQuestion}
        consentChecked={consentChecked}
        setConsentChecked={setConsentChecked}
      />

      {/* ============================================================== */}
      {/* RIKTIGT BOTTOM-SHEET FÖR ATT LÄGGA TILL / ÄNDRA POSTER         */}
      {/* ============================================================== */}
      <OnboardingItemSheet
        sheetEditor={sheetEditor}
        setSheetEditor={setSheetEditor}
        sheetSubView={sheetSubView}
        setSheetNavDir={setSheetNavDir}
        setSheetSubView={setSheetSubView}
        availableIncomeCategories={availableIncomeCategories}
        availableExpenseCategories={availableExpenseCategories}
        availablePaymentMethods={availablePaymentMethods}
        handleSaveSheet={handleSaveSheet}
        sheetNavDir={sheetNavDir}
        handleDeleteFromSheet={handleDeleteFromSheet}
      />
    </div>
  );
};

