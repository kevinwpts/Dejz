import { logWarn } from '../../utils/logger';
// Hook för bankdelen av onboardingen: BankID-start, återkomst från banken, kontoval och analys av banktransaktioner till förslag.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SetStateAction } from 'react';
import type { FixedExpenseItem, IncomeItem } from '../../app/models';
import { bankService, BankAspsp, BankConnection, BankAccount } from '../../services/bankService';
import { WeekendHandlingMode } from '../../utils/periodEngine';
import { extractOnboardingAiCandidates } from '../../utils/bankHistoryAnalyzer';
import { estimateFromAmounts } from '../../utils/variableBills';
import { appOrigin } from '../../utils/platform';
import {
  BANK_RETURN_MARKER_KEY,
  CONSUMER_SWEDISH_BANKS,
  OnboardingStep,
} from './onboardingConfig';
import type { SuggestedFixedExpense, SuggestedIncome } from './onboardingSuggestions';

interface UseOnboardingBankArgs {
  step: OnboardingStep;
  bankEnabled: boolean;
  connections: BankConnection[];
  bankAccounts: BankAccount[];
  bankCallbackStatusMsg: string | null;
  onBankStateUpdated?: (connections: BankConnection[], accounts: BankAccount[]) => void;
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  payday: number;
  setPayday: (value: SetStateAction<number>) => void;
  weekendHandling: WeekendHandlingMode;
  goNext: (from: OnboardingStep) => void;
}

/** Konton som hör till den senaste bankkopplingen (eller alla konton om inga matchar). */
function pickConnectedAccounts(conns: BankConnection[], accs: BankAccount[]): BankAccount[] {
  if (!conns || conns.length === 0) return [];
  const newestConn = conns[0];
  const connAccounts = accs.filter((a) => a.connection_id === newestConn.id);
  return connAccounts.length > 0 ? connAccounts : accs;
}

function clearPendingBankAuth() {
  try {
    localStorage.removeItem('dejz_onboarding_pending_bank_auth');
  } catch {
    // ignore
  }
}

export function useOnboardingBank({
  step,
  bankEnabled,
  connections,
  bankAccounts,
  bankCallbackStatusMsg,
  onBankStateUpdated,
  incomes,
  fixedExpenses,
  payday,
  setPayday,
  weekendHandling,
  goNext,
}: UseOnboardingBankArgs) {
  // Steg 2: Inline bankanslutning och vyer direkt på sidan
  const [step2View, setStep2View] = useState<'grid' | 'select-accounts'>('grid');
  const [connectingBankName, setConnectingBankName] = useState<string | null>(null);
  const [startingAuth, setStartingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  // Kontoval efter lyckad autentisering
  const [fetchedAccounts, setFetchedAccounts] = useState<BankAccount[]>([]);
  // Valda konton + vilka konton vi redan sett (så att konton användaren bockat ur inte bockas i igen).
  // Ligger i samma state så att uppdateringen blir ren och kan göras direkt när nya konton dyker upp.
  const [accountPick, setAccountPick] = useState<{ seenIds: string[]; selectedIds: string[] }>({
    seenIds: [],
    selectedIds: [],
  });
  const selectedAccountIds = accountPick.selectedIds;
  const [activeConnection, setActiveConnection] = useState<BankConnection | null>(null);
  const [savingAccounts, setSavingAccounts] = useState(false);
  const pendingSyncConnectionIdRef = useRef<string | null>(null);

  // Föreslagna fasta utgifter för steg 3 (hämtas från riktiga banktransaktioner)
  const [suggestedFixedExpenses, setSuggestedFixedExpenses] = useState<SuggestedFixedExpense[]>([]);

  // Föreslagna fasta inkomster för steg 4 (hämtas från riktiga banktransaktioner)
  const [suggestedIncomes, setSuggestedIncomes] = useState<SuggestedIncome[]>([]);

  const [analyzingBank, setAnalyzingBank] = useState(false);
  const [_hasAnalyzedBank, setHasAnalyzedBank] = useState(false);
  const [_isBankDataDetected, setIsBankDataDetected] = useState(false);
  const [verifyingBankReturn, setVerifyingBankReturn] = useState(false);

  // Analysera RIKTIGA banktransaktioner från Enable Banking när användaren når steg 3 eller 4 (efter att konton valts i steg 2).
  // Körs EN gång. Den får inte startas om när saldon, konton eller lönedag uppdateras medan den pågår –
  // tidigare gjorde det att analysen började om gång på gång och "Letar efter …" stod kvar länge.
  const bankAnalysisInFlightRef = useRef(false);
  const bankAnalysisDoneRef = useRef(false);
  const onboardingMountedRef = useRef(true);
  useEffect(() => {
    onboardingMountedRef.current = true;
    return () => {
      onboardingMountedRef.current = false;
    };
  }, []);

  // Senaste värdena som analysen läser när den startar. Ligger i en ref så att analysen
  // INTE startas om när de ändras (se ovan) men ändå får färska värden vid start.
  const bankAnalysisInputsRef = useRef({
    connectionsCount: connections.length,
    fetchedAccounts,
    bankAccounts,
    onBankStateUpdated,
    payday,
    setPayday,
    weekendHandling,
  });
  useEffect(() => {
    bankAnalysisInputsRef.current = {
      connectionsCount: connections.length,
      fetchedAccounts,
      bankAccounts,
      onBankStateUpdated,
      payday,
      setPayday,
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
      setPayday: setPaydayAtStart,
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
              setPaydayAtStart(inferredPayday);
            }
          }
        }
        // Hoppade användaren över bankkopplingen visas snabbknapparna i stället för påhittade belopp
      } catch (err) {
        logWarn('Could not analyze bank transactions', err);
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

  // Synka om App.tsx redan hunnit populera fixedExpenses eller incomes via bakgrundssynk (utan att låsa runBankAnalysis).
  // Görs direkt under render: listan är tom → fyll den från det App redan har.
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

  const getSmartAccountDefaultName = useCallback((acc: BankAccount, idx: number) => {
    if (acc.custom_name && acc.custom_name.trim()) return acc.custom_name.trim();
    const prod = (acc.product || '').trim();
    if (prod) return prod;
    return idx === 0 ? 'Lönekonto' : 'Bankkonto';
  }, []);

  // Visa kontovalet för den senaste bankkopplingen. Rör bara state (ingen localStorage/ref),
  // så den kan även köras direkt under render när App skickar in nya konton.
  const showConnectedBankAccounts = useCallback(
    (conns: BankConnection[], accs: BankAccount[]) => {
      const accountsToUse = pickConnectedAccounts(conns, accs);
      if (accountsToUse.length === 0) return false;
      setVerifyingBankReturn(false);
      setConnectingBankName(null);
      setActiveConnection(conns[0]);
      setFetchedAccounts(accountsToUse);

      // Lägg automatiskt till nytillkomna konton som valda, utan att skriva över konton användaren själv bockat ur
      setAccountPick((prev) => {
        const newAccounts = accountsToUse.filter((acc) => !prev.seenIds.includes(acc.id));
        if (newAccounts.length === 0) return prev;
        const newlySelected = newAccounts.filter((acc) => acc.is_selected !== false).map((acc) => acc.id);
        return {
          seenIds: [...prev.seenIds, ...newAccounts.map((acc) => acc.id)],
          selectedIds: Array.from(new Set([...prev.selectedIds, ...newlySelected])),
        };
      });

      setStep2View('select-accounts');
      return true;
    },
    []
  );

  // Hjälpfunktion för att öppna och uppdatera kontoval så att samtliga bankkonton garanterat kommer med från start
  const applyConnectedBankState = useCallback(
    (conns: BankConnection[], accs: BankAccount[]) => {
      if (pickConnectedAccounts(conns, accs).length === 0) return false;
      clearPendingBankAuth();
      return showConnectedBankAccounts(conns, accs);
    },
    [showConnectedBankAccounts]
  );

  // Reagera DIREKT när App.tsx uppdaterar connections/bankAccounts (även om select-accounts redan visas så att ett 3:e konto aldrig missas!)
  // Mönstret "justera state när props ändras": vi sparar vilka värden vi senast reagerade på.
  const [prevBankProps, setPrevBankProps] = useState<{
    step: OnboardingStep;
    connections: BankConnection[];
    bankAccounts: BankAccount[];
  } | null>(null);
  if (
    !prevBankProps ||
    prevBankProps.step !== step ||
    prevBankProps.connections !== connections ||
    prevBankProps.bankAccounts !== bankAccounts
  ) {
    setPrevBankProps({ step, connections, bankAccounts });
    if (step === 2 && connections.length > 0 && bankAccounts.length > 0) {
      showConnectedBankAccounts(connections, bankAccounts);
    }
  }

  // Bankinloggningen är klar – ta bort markeringen om pågående inloggning (sidoeffekt → i en effekt)
  useEffect(() => {
    if (step !== 2) return;
    if (pickConnectedAccounts(connections, bankAccounts).length > 0) clearPendingBankAuth();
  }, [step, connections, bankAccounts]);

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
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
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
    setAccountPick((prev) => ({
      ...prev,
      selectedIds: prev.selectedIds.includes(accId)
        ? prev.selectedIds.filter((id) => id !== accId)
        : [...prev.selectedIds, accId],
    }));
  };

  const filteredBanks = useMemo(() => {
    const q = bankSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return CONSUMER_SWEDISH_BANKS.filter((b) => b.name.toLowerCase().includes(q));
  }, [bankSearchQuery]);

  return {
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
  };
}
