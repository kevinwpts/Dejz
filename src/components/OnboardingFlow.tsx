import React, { useState, useEffect } from 'react';
import { createOnboardingSheetActions } from './onboarding/useOnboardingSheet';
import { useOnboardingBank } from './onboarding/useOnboardingBank';
import { OnboardingItemSheet } from './onboarding/OnboardingItemSheet';
import { getMarketingConsent, hasPendingSignupConsent } from '../utils/marketingConsent';
import { isDemoMode } from '../utils/demoUtils';
import { CaretLeft } from '@phosphor-icons/react';
import { IncomeItem, FixedExpenseItem } from '../app/models';
import { BankConnection, BankAccount } from '../services/bank/types';
import { WeekendHandlingMode } from '../utils/periodEngine';
import { getStoredExpenseCategories, getStoredIncomeCategories, getStoredPaymentMethods } from '../utils/cache/categories';
import { syncAllUserPreferencesToSupabase } from '../utils/cache/preferencesSync';
import {
  OnboardingStep,
  STEP_ORDER_MANUAL,
  STEP_ORDER_WITH_BANK,
  SheetEditorState,
  clearBankReturnMarker,
  hasFreshBankReturnMarker,
} from './onboarding/onboardingConfig';
import {
  buildBankSummaryTexts,
  persistSuggestedFixed,
  persistSuggestedIncomes,
  pickPrimaryIncome,
} from './onboarding/onboardingSuggestions';
import { BankSummaryStep } from './onboarding/BankSummaryStep';
import { OnboardingStepName } from './onboarding/OnboardingStepName';
import { OnboardingStepBank } from './onboarding/OnboardingStepBank';
import { OnboardingStepFixedList } from './onboarding/OnboardingStepFixedList';
import { OnboardingStepIncomeList } from './onboarding/OnboardingStepIncomeList';
import { OnboardingStepPayday } from './onboarding/OnboardingStepPayday';
import { OnboardingStepResult } from './onboarding/OnboardingStepResult';
import { OnboardingStepBalance } from './onboarding/OnboardingStepBalance';
import { useExternalSnapshot } from '../utils/hooks/useExternalSnapshot';

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

// Samma tomma lista varje gång – en ny [] vid varje render skulle få kontovalet att räknas om hela tiden
const NO_BANK_ACCOUNTS: BankAccount[] = [];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialName,
  targetPayday = 25,
  initialWeekendHandling = 'before',
  onUpdateWeekendHandling,
  connections,
  bankAccounts: _bankAccounts = NO_BANK_ACCOUNTS,
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

  // Steg 2–4: bankkoppling, kontoval och förslag från bankens transaktioner
  const {
    step2View,
    setStep2View,
    connectingBankName,
    startingAuth,
    authError,
    setAuthError,
    bankSearchQuery,
    setBankSearchQuery,
    filteredBanks,
    fetchedAccounts,
    selectedAccountIds,
    toggleAccountSelection,
    savingAccounts,
    handleSaveSelectedAccounts,
    verifyingBankReturn,
    applyConnectedBankState,
    getSmartAccountDefaultName,
    handleSelectBankInline,
    suggestedFixedExpenses,
    setSuggestedFixedExpenses,
    suggestedIncomes,
    setSuggestedIncomes,
    analyzingBank,
  } = useOnboardingBank({
    step,
    bankEnabled,
    connections,
    bankAccounts: _bankAccounts,
    bankCallbackStatusMsg,
    onBankStateUpdated,
    incomes,
    fixedExpenses,
    payday,
    setPayday,
    weekendHandling,
    goNext,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [step, step2View]);

  // Med bank visas först ett kort att bekräfta ("Stämmer"); listan finns bakom "Visa och ändra"
  const [showIncomeList, setShowIncomeList] = useState(false);
  const [showFixedList, setShowFixedList] = useState(false);

  const handleSaveSuggestedFixed = () => {
    persistSuggestedFixed(suggestedFixedExpenses, fixedExpenses, {
      onAddFixed,
      onUpdateFixed,
      onDeleteFixed,
    });
    goNext(3);
  };

  const handleSaveSuggestedIncomes = () => {
    persistSuggestedIncomes(suggestedIncomes, incomes, {
      onAddIncome,
      onUpdateIncome,
      onDeleteIncome,
    });

    // Utgå automatiskt från dagen på den valda/hittade lönen i nästa steg (När får du lön?).
    // Utan bank har lönedagen redan valts innan inkomsterna, så då rör vi den inte.
    const primaryInc = bankEnabled ? pickPrimaryIncome(suggestedIncomes) : undefined;
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
  // Kategorierna ligger i localStorage – läs om dem när redigeringsbladet byts
  const availableExpenseCategories = useExternalSnapshot(
    () => getStoredExpenseCategories().map((c) => c.name),
    [sheetEditorType, sheetEditorMode]
  );

  const availableIncomeCategories = useExternalSnapshot(
    () => getStoredIncomeCategories().map((c) => c.name),
    [sheetEditorType, sheetEditorMode]
  );

  const sheetPaymentMethod = sheetEditor?.paymentMethod;
  const availablePaymentMethods = React.useMemo(() => {
    const stored = getStoredPaymentMethods().map((m) => m.name);
    if (sheetPaymentMethod && !stored.includes(sheetPaymentMethod)) {
      return [...stored, sheetPaymentMethod];
    }
    return stored;
  }, [sheetPaymentMethod]);

  // Fyll i namnet från kontot om fältet är tomt (justeras direkt under render)
  if (initialName && !name) {
    setName(initialName);
  }

  const hasConnectedBank = connections.length > 0;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  // ---------------------------------------------------------------------------
  // Bekräfta-kort (med bank): visa det banken hittade som EN siffra och EN knapp.
  // Den som vill ändra något trycker "Visa och ändra" och får hela listan.
  // ---------------------------------------------------------------------------
  const incomeSummaryMode =
    bankEnabled &&
    !showIncomeList &&
    (analyzingBank || suggestedIncomes.some((i) => i.isFromBank));
  const fixedSummaryMode =
    bankEnabled &&
    !showFixedList &&
    (analyzingBank || suggestedFixedExpenses.some((f) => f.isFromBank));
  const {
    bankIncomeCount,
    incomeSummaryAmount,
    incomeSummaryDetail,
    fixedSummaryAmount,
    fixedSummaryDetail,
  } = buildBankSummaryTexts(suggestedIncomes, suggestedFixedExpenses, formatKr);

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
  const { openEditSuggestedFixed, renderQuickChips, openEditSuggestedIncome, handleSaveSheet, handleDeleteFromSheet } = createOnboardingSheetActions({
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
            className="ui-header-btn"
            aria-label="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" />
          </button>
        </div>

        {/* En enda lång sammanhängande progress-bar utan stegtext */}
        <div className="w-full h-1 rounded-full bg-[var(--segment-track)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--cta-bg)] transition-all duration-300 ease-out"
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
          title={bankIncomeCount > 1 ? 'Dina inkomster' : 'Din lön'}
          subtitle="Vi hittade den bland dina transaktioner. Stämmer det?"
          loadingText="Letar efter din lön …"
          amountText={incomeSummaryAmount}
          detailText={incomeSummaryDetail}
          amountClassName="text-positive"
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

