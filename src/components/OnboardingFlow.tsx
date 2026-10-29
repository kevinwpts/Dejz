import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  Plus,
  Trash,
  Check,
  PencilSimple,
  X,
  MagnifyingGlass,
  ShieldCheck,
  CalendarCheck,
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
import { analyzeBankTransactionsForOnboarding } from '../utils/bankHistoryAnalyzer';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';
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

type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

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
      if (savedStep >= 1 && savedStep <= 6) {
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
  const [detectedIncomeSourceLabel, setDetectedIncomeSourceLabel] = useState<string | null>(null);
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

  // Steg 2: Inline bankanslutning och vyer direkt på sidan
  const [step2View, setStep2View] = useState<'grid' | 'search' | 'select-accounts'>('grid');
  const [connectingBankName, setConnectingBankName] = useState<string | null>(null);
  const [startingAuth, setStartingAuth] = useState(false);
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
  const [hasAnalyzedBank, setHasAnalyzedBank] = useState(false);
  const [isBankDataDetected, setIsBankDataDetected] = useState(false);

  // Analysera RIKTIGA banktransaktioner från Enable Banking så fort bank är ansluten eller steg 3 / 4 visas
  useEffect(() => {
    if (step !== 3 && step !== 4 && connections.length === 0) return;
    if (hasAnalyzedBank && isBankDataDetected) return;
    if (step !== 3 && step !== 4 && hasAnalyzedBank) return;

    let isMounted = true;
    const runBankAnalysis = async () => {
      setAnalyzingBank(true);
      try {
        let bankTxs = await bankService.listAllTransactionsForReconciliation(5000).catch(() => []);
        if (!bankTxs || bankTxs.length === 0) {
          const txRes = await bankService.listTransactions({ pageSize: 500 });
          bankTxs = txRes?.transactions || [];
        }

        let accountsForAnalysis = fetchedAccounts.length > 0 ? fetchedAccounts : _bankAccounts;
        if (!accountsForAnalysis || accountsForAnalysis.length === 0) {
          accountsForAnalysis = await bankService.getAccounts().catch(() => []);
        }

        if (bankTxs.length > 0) {
          const analysis = analyzeBankTransactionsForOnboarding(
            bankTxs,
            payday,
            weekendHandling === 'before',
            accountsForAnalysis
          );

          if (isMounted) {
            const realDetectedFixed = analysis.detectedFixedExpenses.map((item, idx) => ({
              id: `bank-det-${idx}`,
              name: item.name,
              amount: Math.round(item.amount),
              dueDay: item.deductionDay || 27,
              category: item.category || 'Räkningar',
              paymentMethod: item.paymentMethod || 'Autogiro',
              evidenceSummary: item.evidenceSummary,
              checked: true,
              logo: item.logo,
              isFromBank: true,
            }));
            setSuggestedFixedExpenses(realDetectedFixed);

            const primaryDetectedInc = analysis.detectedIncomes[0];
            const inferredPayday =
              analysis.suggestedPayday || primaryDetectedInc?.deductionDay || null;

            const realDetectedIncomes = analysis.detectedIncomes.map((inc, idx) => ({
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
              if (primaryDetectedInc?.name) {
                setDetectedIncomeSourceLabel(primaryDetectedInc.name);
              }
            }
          }
        } else if (isMounted && connections.length === 0) {
          // Endast om användaren hoppade över bankkoppling helt visas vanliga förslag
          if (suggestedFixedExpenses.length === 0) {
            setSuggestedFixedExpenses([
              { id: '1', name: 'Hyra / Bostad', amount: 7500, dueDay: 27, category: 'Boende', checked: false },
              { id: '2', name: 'El & Nät', amount: 650, dueDay: 28, category: 'Boende', checked: false },
              { id: '3', name: 'Hemförsäkring', amount: 195, dueDay: 28, category: 'Försäkringar', checked: false },
              { id: '4', name: 'Mobil / Bredband', amount: 399, dueDay: 28, category: 'Abonnemang', checked: false },
            ]);
          }
          if (suggestedIncomes.length === 0) {
            setSuggestedIncomes([
              { id: 'inc-1', name: 'Lön', amount: 28500, payday: 25, category: 'Lön', checked: false },
              { id: 'inc-2', name: 'CSN', amount: 13156, payday: 25, category: 'CSN', checked: false },
              { id: 'inc-3', name: 'Barnbidrag', amount: 1250, payday: 20, category: 'Bidrag', checked: false },
            ]);
          }
        }
      } catch (err) {
        console.warn('Could not analyze bank transactions:', err);
      } finally {
        if (isMounted) {
          setAnalyzingBank(false);
          setHasAnalyzedBank(true);
        }
      }
    };

    runBankAnalysis();
    return () => {
      isMounted = false;
    };
  }, [
    step,
    connections.length,
    hasAnalyzedBank,
    isBankDataDetected,
    payday,
    weekendHandling,
    fetchedAccounts,
    _bankAccounts,
    suggestedFixedExpenses.length,
    suggestedIncomes.length,
  ]);

  // Synka om App.tsx redan hunnit populera fixedExpenses eller incomes via bakgrundssynk
  useEffect(() => {
    if (suggestedFixedExpenses.length === 0 && fixedExpenses.length > 0) {
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
      setIsBankDataDetected(true);
    }
  }, [fixedExpenses, suggestedFixedExpenses.length]);

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
        setDetectedIncomeSourceLabel(primary.name);
      }
    }
  }, [incomes, suggestedIncomes.length]);

  const handleSaveSuggestedFixed = () => {
    suggestedFixedExpenses.forEach((item) => {
      const existing = fixedExpenses.find((f) => f.name.toLowerCase() === item.name.toLowerCase());
      if (item.checked) {
        if (!existing) {
          onAddFixed({
            name: item.name,
            amount: item.amount,
            dueDay: item.dueDay,
            category: item.category,
            paymentMethod: item.paymentMethod || 'Autogiro',
            logo: item.logo,
          });
        }
      } else if (existing) {
        onDeleteFixed(existing.id);
      }
    });
    navigateStep(4, 'forward');
  };

  const handleSaveSuggestedIncomes = () => {
    suggestedIncomes.forEach((item) => {
      const existing = incomes.find((i) => i.name.toLowerCase() === item.name.toLowerCase());
      if (item.checked) {
        if (!existing) {
          onAddIncome({
            name: item.name,
            amount: item.amount,
            payday: item.payday,
            category: item.category || 'Lön',
            logo: item.logo,
          });
        }
      } else if (existing) {
        onDeleteIncome(existing.id);
      }
    });

    // Utgå automatiskt från dagen på den valda/hittade lönen i nästa steg (När får du lön?)
    const checkedList = suggestedIncomes.filter((i) => i.checked);
    if (checkedList.length > 0) {
      const primaryInc =
        checkedList.find((i) => i.category === 'Lön' || i.category === 'Ersättning') ||
        [...checkedList].sort((a, b) => b.amount - a.amount)[0];
      if (primaryInc && primaryInc.payday >= 1 && primaryInc.payday <= 31) {
        setPayday(primaryInc.payday);
        setDetectedIncomeSourceLabel(primaryInc.name);
      }
    }

    navigateStep(5, 'forward');
  };

  // BottomSheet editor state (för att lägga till eller ändra post)
  const [sheetEditor, setSheetEditor] = useState<SheetEditorState | null>(null);
  const [sheetSubView, setSheetSubView] = useState<'main' | 'day-picker'>('main');
  const [sheetNavDir, setSheetNavDir] = useState<'forward' | 'back'>('forward');

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

  // Poll status när fönstret återfår fokus under bankinloggning på steg 2
  useEffect(() => {
    if (step !== 2) return;
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
              setStep2View('select-accounts');
            } else {
              navigateStep(3, 'forward');
            }
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [step, connections.length, onBankStateUpdated]);

  // Spara valda konton och gå till steg 3 (Vilka fasta utgifter har du?)
  const handleSaveSelectedAccounts = async () => {
    if (!activeConnection) {
      navigateStep(3, 'forward');
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
      navigateStep(3, 'forward');
    }
  };

  // Öppna sökning bland alla banker direkt på sidan
  const handleOpenSearchBanks = () => {
    setStep2View('search');
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
    navigateStep(6, 'forward');
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
        if (step === 4) {
          setSuggestedIncomes((prev) => [
            ...prev,
            {
              id: `custom-inc-${Date.now()}`,
              name: cleanTitle,
              amount: cleanAmt,
              payday: cleanDay,
              category: sheetEditor.category || 'Lön',
              checked: true,
            },
          ]);
          setPayday(cleanDay);
          setDetectedIncomeSourceLabel(cleanTitle);
        }
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
        if (step === 3) {
          setSuggestedFixedExpenses((prev) => [
            ...prev,
            {
              id: `custom-${Date.now()}`,
              name: cleanTitle,
              amount: cleanAmt,
              dueDay: cleanDay,
              category: sheetEditor.category || 'Räkningar',
              paymentMethod: sheetEditor.paymentMethod || 'Autogiro',
              checked: true,
            },
          ]);
        }
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
        </div>

        {/* En enda lång sammanhängande progress-bar utan stegtext */}
        <div className="w-full h-1 rounded-full bg-[var(--border-subtle)] overflow-hidden">
          <div
            className={`h-full rounded-full bg-[var(--text-primary)] transition-all duration-300 ease-out ${
              step === 1
                ? 'w-1/6'
                : step === 2
                ? 'w-2/6'
                : step === 3
                ? 'w-3/6'
                : step === 4
                ? 'w-4/6'
                : step === 5
                ? 'w-5/6'
                : 'w-full'
            }`}
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
          {/* Centrerat innehåll utan scroll */}
          <div className="my-auto py-4">
            <div className="mb-6">
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

          {/* Pinnad knapp i botten */}
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
      {/* STEG 2: KOPPLA DIN BANK (Inline på sidan, pinnade knappar)     */}
      {/* ============================================================== */}
      {step === 2 && (
        <div
          key="step-2"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          {/* SUB-VIEW: SÖK BLAND ALLA BANKER (Bara banklistan scrollar) */}
          {step2View === 'search' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="shrink-0 pt-6 pb-3">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Sök bank
                </h1>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Välj din bank bland alla anslutna banker i Sverige.
                </p>

                <div className="relative mt-3.5">
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
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)]"
                  />
                </div>
                {authError && (
                  <div className="mt-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2.5 animate-scale-in">
                    <div className="flex items-center gap-2">
                      <WarningCircle size={15} weight="fill" className="shrink-0" />
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
              </div>

              {/* Endast banklistan scrollar */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5 rounded-2xl">
                {loadingAllBanks ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                    <SpinnerGap size={24} className="animate-spin text-[var(--text-primary)]" />
                    <span>Hämtar banker...</span>
                  </div>
                ) : (
                  allBanks
                    .filter((b) =>
                      b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())
                    )
                    .map((bank) => {
                      const isConnecting =
                        startingAuth &&
                        connectingBankName === bank.name;
                      return (
                        <button
                          key={bank.name}
                          type="button"
                          disabled={startingAuth}
                          onClick={() => handleSelectBankInline(bank)}
                          className={`w-full p-3 rounded-2xl bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 transition-colors cursor-pointer text-left ${
                            isConnecting
                              ? 'ring-2 ring-[var(--text-primary)]'
                              : startingAuth
                              ? 'opacity-40 pointer-events-none'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <ItemLogo name={bank.name} logoUrl={bank.logo || undefined} size="sm" />
                            <span className="font-display font-semibold text-xs text-[var(--text-primary)] truncate">
                              {bank.name}
                            </span>
                          </div>
                          {isConnecting ? (
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] shrink-0">
                              <SpinnerGap size={14} className="animate-spin" />
                              <span>Ansluter...</span>
                            </div>
                          ) : (
                            <CaretRight size={14} className="text-[var(--text-muted)] shrink-0" />
                          )}
                        </button>
                      );
                    })
                )}
              </div>

              {/* Pinnad bottenknapp */}
              <div className="shrink-0 pt-3">
                <button
                  type="button"
                  onClick={() => setStep2View('grid')}
                  className="w-full py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  ← Tillbaka till snabbval
                </button>
              </div>
            </div>
          )}

          {/* SUB-VIEW: VÄLJ KONTON (Bara kontolistan scrollar) */}
          {step2View === 'select-accounts' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="shrink-0 pt-6 pb-3">
                <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                  Välj konton
                </h1>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                  Välj vilka konton du vill använda i Dejz.
                </p>
              </div>

              {/* Scrollbar kontolista */}
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2.5 pr-0.5">
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

              {/* Pinnad knapp */}
              <div className="shrink-0 pt-3">
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

          {/* SUB-VIEW: GRUNDLÄGGANDE 3x3 BANK-GRID (Låst skärm) */}
          {step2View === 'grid' && (
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="my-auto py-4 space-y-5">
                <div>
                  <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                    Koppla din bank
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                    Välj din bank för att hämta dina konton och köp automatiskt.
                  </p>
                </div>

                {authError && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2.5 animate-scale-in">
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
                    <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
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
                            className={`p-2.5 sm:p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 sm:gap-2 transition-all duration-150 active:scale-95 cursor-pointer group shadow-xs ${
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
                            <span className="font-display font-semibold text-[11px] sm:text-[11.5px] text-center truncate max-w-full leading-tight">
                              {isConnecting ? 'Ansluter...' : b.displayName}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sök / välj annan bank */}
                    <button
                      type="button"
                      disabled={startingAuth}
                      onClick={handleOpenSearchBanks}
                      className="w-full py-2.5 px-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
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

              {/* Pinnad bottenknapp */}
              <div className="shrink-0 pt-3 space-y-2">
                <button
                  type="button"
                  onClick={() => navigateStep(3, 'forward')}
                  className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-sans font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>Fortsätt</span>
                  <ArrowRight size={16} weight="bold" />
                </button>

                {!hasConnectedBank && (
                  <button
                    type="button"
                    onClick={() => navigateStep(3, 'forward')}
                    className="w-full py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
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
      {/* STEG 3: VILKA FASTA UTGIFTER HAR DU? (Rubrik med luft i toppen)*/}
      {/* ============================================================== */}
      {step === 3 && (
        <div
          key="step-3"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          {/* Pinnad rubrik med luft ovanför, så att frågan inte ligger kloss mot toppen */}
          <div className="shrink-0 pt-6 pb-3">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Vilka fasta utgifter har du?
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {isBankDataDetected
                ? `Vi hittade ${suggestedFixedExpenses.length} återkommande utgifter i dina banktransaktioner. Bocka i de som stämmer.`
                : 'Bocka i dina vanliga fasta utgifter eller lägg till egna.'}
            </p>
          </div>

          {/* Scrollbar lista i mitten */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
            {analyzingBank && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-pulse">
                <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                <span>Analyserar transaktioner från din anslutna bank...</span>
              </div>
            )}

            <div className="space-y-2">
              {suggestedFixedExpenses.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    item.checked
                      ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestedFixedExpenses((prev) =>
                        prev.map((p) => (p.id === item.id ? { ...p, checked: !p.checked } : p))
                      )
                    }
                    className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        item.checked
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {item.checked && <Check size={12} weight="bold" />}
                    </div>

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
                        -{formatKr(item.amount)}
                      </span>
                      <span className="ui-row-meta">
                        Den {item.dueDay}:e
                      </span>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openAddSheet('fixed')}
              className="w-full py-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Lägg till egen fast utgift</span>
            </button>
          </div>

          <div className="shrink-0 pt-3">
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
      {/* STEG 4: VILKA FASTA INKOMSTER HAR DU? (Analyserat från banken) */}
      {/* ============================================================== */}
      {step === 4 && (
        <div
          key="step-4"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          {/* Pinnad rubrik med luft ovanför */}
          <div className="shrink-0 pt-6 pb-3">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Vilka fasta inkomster har du?
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
              {isBankDataDetected && suggestedIncomes.some((i) => i.isFromBank)
                ? `Vi hittade ${suggestedIncomes.length} återkommande ${
                    suggestedIncomes.length === 1 ? 'inkomst' : 'inkomster'
                  } i dina banktransaktioner. Bocka i de som stämmer.`
                : 'Bocka i dina fasta inkomster eller lägg till egna.'}
            </p>
          </div>

          {/* Scrollbar lista i mitten */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
            {analyzingBank && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-pulse">
                <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                <span>Analyserar inkomster från din anslutna bank...</span>
              </div>
            )}

            <div className="space-y-2">
              {suggestedIncomes.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    item.checked
                      ? 'bg-[var(--surface-color)] border-[var(--border-subtle)]'
                      : 'bg-[var(--surface-color)]/50 border-[var(--border-subtle)] opacity-55'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSuggestedIncomes((prev) =>
                        prev.map((p) => (p.id === item.id ? { ...p, checked: !p.checked } : p))
                      )
                    }
                    className="flex items-center gap-3 text-left cursor-pointer flex-1 min-w-0"
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        item.checked
                          ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-color)]'
                      }`}
                    >
                      {item.checked && <Check size={12} weight="bold" />}
                    </div>

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

            <button
              type="button"
              onClick={() => openAddSheet('income')}
              className="w-full py-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Lägg till egen fast inkomst</span>
            </button>
          </div>

          <div className="shrink-0 pt-3">
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
          <div className="my-auto py-4 space-y-10">
            <div>
              <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                När får du lön?
              </h1>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {detectedIncomeSourceLabel
                  ? `Vi har förvalt den ${payday}:e utifrån din inkomst (${detectedIncomeSourceLabel}). Dra för att ändra om det behövs.`
                  : 'Dra för att välja vilken dag i månaden din period ska börja.'}
              </p>
            </div>

            {/* Direkt på bakgrunden utan kort/modul och utan rubriken "Vald utbetalningsdag" */}
            <div className="space-y-6 py-2">
              <div className="font-display font-bold text-5xl sm:text-6xl tracking-tight text-[var(--text-primary)] tabular-nums text-center">
                {payday === 31 ? 'Sista dagen' : `Den ${payday}:e`}
              </div>

              <div className="space-y-3">
                <input
                  type="range"
                  min={1}
                  max={31}
                  value={payday}
                  onChange={(e) => setPayday(Number(e.target.value))}
                  aria-label="Välj lönedag"
                  className="w-full h-2 rounded-full bg-[var(--border-subtle)] accent-[var(--text-primary)] cursor-pointer"
                />
                <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)] tabular-nums px-0.5">
                  <span>1</span>
                  <span>31</span>
                </div>
              </div>
            </div>

            {/* Helghantering direkt på bakgrunden */}
            <div className="pt-2 border-t border-[var(--border-subtle)]/60 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <CalendarCheck size={16} weight="duotone" className="text-[var(--text-primary)] shrink-0" />
                  <span className="font-display font-semibold text-xs sm:text-sm text-[var(--text-primary)]">
                    Helghantering
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
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

          {/* Pinnad knapp i botten */}
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
      {/* STEG 6: STÄMMER DIN ÖVERSIKT? (Kategoriikoner + luftig rubrik) */}
      {/* ============================================================== */}
      {step === 6 && (
        <div
          key="step-6"
          className={`flex-1 min-h-0 flex flex-col justify-between overflow-hidden ${pageAnimClass}`}
        >
          {/* Pinnad rubrik med luft i toppen */}
          <div className="shrink-0 pt-6 pb-3">
            <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
              Stämmer din översikt?
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
              Tryck på en rad om du vill justera belopp eller dag innan du öppnar appen.
            </p>
          </div>

          {/* Mitten scrollar mjukt */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 pb-4 space-y-4">
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

            {/* Inkomster */}
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
                  {incomes.map((inc) => {
                    const catLabel = inc.category || 'Lön';
                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => openEditIncomeSheet(inc)}
                        className="ui-tx-row"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                            <span className="ui-row-subtitle flex items-center gap-1.5">
                              <CategoryIcon
                                category={catLabel}
                                size={11}
                                className="shrink-0 text-[var(--text-secondary)]"
                              />
                              <span className="truncate">{catLabel}</span>
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
                    );
                  })}
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

            {/* Fasta utgifter */}
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
                  {fixedExpenses.map((exp) => {
                    const catLabel = exp.category || 'Räkningar';
                    return (
                      <button
                        key={exp.id}
                        type="button"
                        onClick={() => openEditFixedSheet(exp)}
                        className="ui-tx-row"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
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
                            <span className="ui-row-subtitle flex items-center gap-1.5">
                              <CategoryIcon
                                category={catLabel}
                                size={11}
                                className="shrink-0 text-[var(--text-secondary)]"
                              />
                              <span className="truncate">{catLabel}</span>
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
                    );
                  })}
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

          {/* Solid pinnad knapp i botten */}
          <div className="shrink-0 pt-3 border-t border-[var(--border-subtle)]/40 bg-[var(--bg-color)]">
            <button
              type="button"
              onClick={onComplete}
              className="ui-btn-primary py-3.5 text-sm"
            >
              <span>Öppna Dejz</span>
              <Check size={16} weight="bold" />
            </button>
          </div>
        </div>
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
