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
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
} from '../utils/appCache';
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
  const [step2View, setStep2View] = useState<'grid' | 'select-accounts'>('grid');
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
  const [verifyingBankReturn, setVerifyingBankReturn] = useState(false);

  // Analysera RIKTIGA banktransaktioner från Enable Banking + Gemini AI först när användaren når steg 3 eller 4 (efter att konton valts i steg 2)
  useEffect(() => {
    if (step !== 3 && step !== 4) return;
    if (hasAnalyzedBank && isBankDataDetected && !pendingSyncConnectionIdRef.current) return;

    let isMounted = true;
    const runBankAnalysis = async () => {
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
          if (status && onBankStateUpdated && isMounted) {
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
          accountsForAnalysis = await bankService.getAccounts().catch(() => []);
        }

        if (bankTxs.length > 0) {
          const { baseAnalysis, expenseCandidates, incomeCandidates } =
            extractOnboardingAiCandidates(
              bankTxs,
              payday,
              weekendHandling === 'before',
              accountsForAnalysis
            );

          if (isMounted) {
            const realDetectedFixed = baseAnalysis.detectedFixedExpenses.map((item, idx) => ({
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

          // Förfina med Gemini AI för att fånga nystartade 1-dragningsabonnemang och verifiera exakta utbetalningsdagar (t.ex. A-kassa den 22:a),
          // utan att NÅGONSIN radera regelbekräftade fasta utgifter eller inkomster!
          if (expenseCandidates.length > 0 || incomeCandidates.length > 0) {
            try {
              const aiRes = await fetch('/api/ai/analyze-onboarding', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expenseCandidates, incomeCandidates }),
              });
              if (aiRes.ok && isMounted) {
                const aiData = await aiRes.json();
                if (!aiData?.fallback) {
                  const aiExpByKey = new Map<string, any>();
                  if (Array.isArray(aiData.expenses)) {
                    for (const e of aiData.expenses) {
                      if (e && e.key) aiExpByKey.set(String(e.key), e);
                    }
                  }

                  const mergedExpenses = expenseCandidates
                    .filter((cand) => {
                      if (cand.isRuleDetected) return true;
                      const aiItem = aiExpByKey.get(cand.key);
                      return aiItem?.include === true && Number(aiItem?.amount || cand.latestAmount) > 0;
                    })
                    .map((cand, idx) => {
                      const aiItem = aiExpByKey.get(cand.key);
                      const cleanName = String(
                        cand.isRuleDetected ? cand.name : aiItem?.name || cand.name || 'Fast utgift'
                      ).trim();
                      const cleanCat = String(
                        aiItem?.category || cand.category || 'Räkningar'
                      ).trim();
                      const cleanDay =
                        typeof aiItem?.day === 'number' && aiItem.day >= 1 && aiItem.day <= 31
                          ? Math.round(aiItem.day)
                          : cand.ruleDay || 27;
                      const cleanAmt = Math.round(
                        cand.latestAmount || Number(aiItem?.amount) || 0
                      );
                      const cleanMethod =
                        aiItem?.paymentMethod || cand.paymentMethod || 'Autogiro';
                      const occ = cand.occurrences || 1;
                      const lastD = cand.rawDates?.[0] || '';
                      const summary = `${occ} ${occ === 1 ? 'betalning' : 'betalningar'}${
                        lastD ? ` (senast ${lastD})` : ''
                      } · ${cleanAmt} kr`;

                      return {
                        id: `bank-ai-exp-${idx}`,
                        name: cleanName,
                        amount: cleanAmt,
                        dueDay: cleanDay,
                        category: cleanCat,
                        paymentMethod: cleanMethod,
                        evidenceSummary: summary,
                        checked: true,
                        logo: getLogoUrl(cleanName, cleanCat),
                        isFromBank: true,
                      };
                    })
                    .sort((a, b) => b.amount - a.amount);

                  if (mergedExpenses.length > 0) {
                    setSuggestedFixedExpenses((prev) => {
                      const uncheckedNames = new Set(
                        prev.filter((p) => !p.checked).map((p) => p.name.toLowerCase())
                      );
                      return mergedExpenses.map((item) => ({
                        ...item,
                        checked: !uncheckedNames.has(item.name.toLowerCase()),
                      }));
                    });
                  }

                  const aiIncByKey = new Map<string, any>();
                  if (Array.isArray(aiData.incomes)) {
                    for (const inc of aiData.incomes) {
                      if (inc && inc.key) aiIncByKey.set(String(inc.key), inc);
                    }
                  }

                  const mergedIncomes = incomeCandidates
                    .filter((cand) => {
                      if (cand.isRuleDetected) return true;
                      const aiItem = aiIncByKey.get(cand.key);
                      return aiItem?.include === true && Number(aiItem?.amount || cand.latestAmount) > 0;
                    })
                    .map((cand, idx) => {
                      const aiItem = aiIncByKey.get(cand.key);
                      const cleanName = String(
                        cand.isRuleDetected ? cand.name : aiItem?.name || cand.name || 'Inkomst'
                      ).trim();
                      const cleanCat = String(
                        aiItem?.category || cand.category || 'Lön'
                      ).trim();
                      const cleanDay =
                        typeof aiItem?.day === 'number' && aiItem.day >= 1 && aiItem.day <= 31
                          ? Math.round(aiItem.day)
                          : cand.ruleDay || 25;
                      const cleanAmt = Math.round(
                        cand.latestAmount || Number(aiItem?.amount) || 0
                      );
                      const occ = cand.occurrences || 1;
                      const lastD = cand.rawDates?.[0] || '';
                      const summary = `${occ} ${occ === 1 ? 'insättning' : 'insättningar'}${
                        lastD ? ` (senast ${lastD})` : ''
                      } · ${cleanAmt} kr`;

                      return {
                        id: `bank-ai-inc-${idx}`,
                        name: cleanName,
                        amount: cleanAmt,
                        payday: cleanDay,
                        category: cleanCat,
                        evidenceSummary: summary,
                        checked: true,
                        logo: getLogoUrl(cleanName, cleanCat),
                        isFromBank: true,
                      };
                    })
                    .sort((a, b) => b.amount - a.amount);

                  if (mergedIncomes.length > 0) {
                    setSuggestedIncomes((prev) => {
                      const uncheckedNames = new Set(
                        prev.filter((p) => !p.checked).map((p) => p.name.toLowerCase())
                      );
                      return mergedIncomes.map((item) => ({
                        ...item,
                        checked: !uncheckedNames.has(item.name.toLowerCase()),
                      }));
                    });

                    const primaryAiInc = mergedIncomes[0];
                    const bestPayday =
                      primaryAiInc?.payday ||
                      (typeof aiData.suggestedPayday === 'number' &&
                      aiData.suggestedPayday >= 1 &&
                      aiData.suggestedPayday <= 31
                        ? aiData.suggestedPayday
                        : null);

                    if (bestPayday && bestPayday >= 1 && bestPayday <= 31) {
                      setPayday(bestPayday);
                    }
                  }
                }
              }
            } catch {
              // Ignorera nätverksfel – regelmotorn har redan satt alla poster
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
    suggestedFixedExpenses.forEach((item) => {
      const existing = fixedExpenses.find(
        (f) => f.id === item.id || f.name.toLowerCase() === item.name.toLowerCase()
      );
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
        } else if (
          onUpdateFixed &&
          (existing.amount !== item.amount ||
            existing.dueDay !== item.dueDay ||
            existing.name !== item.name ||
            existing.category !== item.category ||
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

    // Utgå automatiskt från dagen på den valda/hittade lönen i nästa steg (När får du lön?)
    const checkedList = suggestedIncomes.filter((i) => i.checked);
    if (checkedList.length > 0) {
      const primaryInc =
        checkedList.find((i) => i.category === 'Lön' || i.category === 'Ersättning') ||
        [...checkedList].sort((a, b) => b.amount - a.amount)[0];
      if (primaryInc && primaryInc.payday >= 1 && primaryInc.payday <= 31) {
        setPayday(primaryInc.payday);
      }
    }

    navigateStep(5, 'forward');
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

  const openEditSuggestedFixed = (item: {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    paymentMethod?: string;
    logo?: string;
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
      if (sheetEditor.mode === 'add') {
        onAddFixed({
          name: cleanTitle,
          amount: cleanAmt,
          dueDay: cleanDay,
          category: nextCat,
          paymentMethod: nextMethod,
          logo: nextLogo,
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
              <div className="flex-1 min-h-0 flex flex-col justify-center py-2 space-y-4">
                <div className="shrink-0">
                  <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                    Koppla din bank
                  </h1>
                </div>

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
                                <span className="font-display font-semibold text-[11px] sm:text-[11.5px] text-center truncate max-w-full leading-tight">
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
                              <span className="font-display font-semibold text-[11px] sm:text-[11.5px] text-center truncate max-w-full leading-tight">
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
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-2.5 pb-2">
            {analyzingBank && (
              <div className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center gap-2.5 text-xs text-[var(--text-secondary)] animate-pulse">
                <SpinnerGap size={18} className="animate-spin text-[var(--text-primary)] shrink-0" />
                <span>Synkar och analyserar dina banktransaktioner...</span>
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
              className="w-full py-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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

            <button
              type="button"
              onClick={() => openAddSheet('income')}
              className="w-full py-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
            </div>

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
                  setWeekendHandling((prev) => (prev === 'before' ? 'exact' : 'before'))
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
          <div className="my-auto py-4 space-y-8">
            <div>
              <h1 className="font-display font-semibold text-2xl sm:text-3xl tracking-[-0.012em] text-[var(--text-primary)]">
                Kvar efter fasta räkningar
              </h1>
            </div>

            <div className="space-y-6">
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
                    -{formatKr(totalFix)}
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
          </div>

          <div className="shrink-0 pt-3">
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
                        <span
                          className={`truncate ${
                            isSel
                              ? 'font-medium text-[var(--text-primary)]'
                              : 'font-normal text-[var(--text-primary)]'
                          }`}
                        >
                          {m}
                        </span>
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
                        autoFocus={sheetEditor.mode === 'add'}
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
                <div className="ui-sheet-group text-[13.5px] sm:text-sm">

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

