import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';

export interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bankName: string;
  balance: number;
  type: 'checking' | 'savings';
}

export interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  payday: number;
  category: string;
}

export interface FixedExpenseItem {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  paymentMethod?: string;
  isPaid?: boolean;
}

export interface TransactionItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  accountId?: string;
  note?: string;
}

export interface AppSettings {
  payday: number;
  currency: string;
  isBankConnected: boolean;
  connectedBankName: string;
  lastBankSync: string | null;
}

const DEFAULT_ACCOUNTS: BankAccount[] = [
  {
    id: 'acc-1',
    name: 'Lönekonto (Vardag)',
    accountNumber: '•••• 4821',
    bankName: 'Swedbank',
    balance: 23450,
    type: 'checking',
  },
  {
    id: 'acc-2',
    name: 'Sparkonto (Buffert)',
    accountNumber: '•••• 9102',
    bankName: 'Swedbank',
    balance: 5000,
    type: 'savings',
  },
];

const DEFAULT_INCOMES: IncomeItem[] = [
  {
    id: 'inc-1',
    name: 'Månadslön',
    amount: 32000,
    payday: 25,
    category: 'Lön',
  },
  {
    id: 'inc-2',
    name: 'Barnbidrag',
    amount: 1250,
    payday: 20,
    category: 'Bidrag',
  },
];

const DEFAULT_FIXED_EXPENSES: FixedExpenseItem[] = [
  { id: 'fix-1', name: 'Hyra / Boende', amount: 8450, dueDay: 27, category: 'Boende', paymentMethod: 'Bankgiro' },
  { id: 'fix-2', name: 'CSN studielån', amount: 950, dueDay: 25, category: 'Lån', paymentMethod: 'Autogiro' },
  { id: 'fix-3', name: 'El & Uppvärmning', amount: 680, dueDay: 28, category: 'Boende', paymentMethod: 'Faktura' },
  { id: 'fix-4', name: 'Bredband 500/500', amount: 399, dueDay: 28, category: 'Räkningar', paymentMethod: 'Autogiro' },
  { id: 'fix-5', name: 'Hemförsäkring', amount: 249, dueDay: 27, category: 'Försäkring', paymentMethod: 'Autogiro' },
  { id: 'fix-6', name: 'Gym / SATS', amount: 399, dueDay: 27, category: 'Hälsa', paymentMethod: 'Autogiro' },
  { id: 'fix-7', name: 'Mobilabonnemang', amount: 299, dueDay: 26, category: 'Räkningar', paymentMethod: 'Autogiro' },
  { id: 'fix-8', name: 'Spotify & Netflix', amount: 258, dueDay: 15, category: 'Abonnemang', paymentMethod: 'Kort' },
];

const DEFAULT_TRANSACTIONS: TransactionItem[] = [
  { id: 'tx-1', title: 'ICA Kvantum', amount: 842, category: 'Mat', date: new Date().toISOString().slice(0, 10), note: 'Veckohandling' },
  { id: 'tx-2', title: 'Pressbyrån', amount: 49, category: 'Fika', date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), note: 'Kaffe' },
  { id: 'tx-3', title: 'Apotek Hjärtat', amount: 189, category: 'Hälsa', date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) },
  { id: 'tx-4', title: 'SL Lokaltrafik', amount: 45, category: 'Transport', date: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) },
  { id: 'tx-5', title: 'Lunchrestaurang', amount: 135, category: 'Mat', date: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10) },
];

const DEFAULT_SETTINGS: AppSettings = {
  payday: 25,
  currency: 'kr',
  isBankConnected: true,
  connectedBankName: 'Swedbank',
  lastBankSync: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
};

const STORAGE_KEY_PREFIX = 'dejz_app_v2_';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useDejzStore() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Core state
  const [accounts, setAccounts] = useState<BankAccount[]>(() =>
    loadFromStorage('accounts', DEFAULT_ACCOUNTS)
  );
  const [incomes, setIncomes] = useState<IncomeItem[]>(() =>
    loadFromStorage('incomes', DEFAULT_INCOMES)
  );
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseItem[]>(() =>
    loadFromStorage('fixed_expenses', DEFAULT_FIXED_EXPENSES)
  );
  const [transactions, setTransactions] = useState<TransactionItem[]>(() =>
    loadFromStorage('transactions', DEFAULT_TRANSACTIONS)
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    loadFromStorage('settings', DEFAULT_SETTINGS)
  );

  // Sync to localStorage
  useEffect(() => { saveToStorage('accounts', accounts); }, [accounts]);
  useEffect(() => { saveToStorage('incomes', incomes); }, [incomes]);
  useEffect(() => { saveToStorage('fixed_expenses', fixedExpenses); }, [fixedExpenses]);
  useEffect(() => { saveToStorage('transactions', transactions); }, [transactions]);
  useEffect(() => { saveToStorage('settings', settings); }, [settings]);

  // Auth setup
  useEffect(() => {
    let isMounted = true;
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      } catch {
        if (isMounted) setAuthLoading(false);
      }
    }
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Compute Pay Period details
  const period = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentDay = now.getDate();
    const pDay = settings.payday || 25;

    let periodStart: Date;
    let periodEnd: Date;
    let nextPaydayDate: Date;

    if (currentDay >= pDay) {
      // We are in current month's payday to next month's (pDay - 1)
      periodStart = new Date(currentYear, currentMonth, pDay, 0, 0, 0);
      periodEnd = new Date(currentYear, currentMonth + 1, pDay - 1, 23, 59, 59);
      nextPaydayDate = new Date(currentYear, currentMonth + 1, pDay, 0, 0, 0);
    } else {
      // We are before payday, so period started last month on pDay
      periodStart = new Date(currentYear, currentMonth - 1, pDay, 0, 0, 0);
      periodEnd = new Date(currentYear, currentMonth, pDay - 1, 23, 59, 59);
      nextPaydayDate = new Date(currentYear, currentMonth, pDay, 0, 0, 0);
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const diffTime = nextPaydayDate.getTime() - now.getTime();
    const daysLeft = Math.max(1, Math.ceil(diffTime / msPerDay));

    const totalDaysInPeriod = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / msPerDay) + 1);
    const daysElapsed = Math.min(totalDaysInPeriod, Math.max(0, totalDaysInPeriod - daysLeft));

    const monthNames = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    const startStr = `${periodStart.getDate()} ${monthNames[periodStart.getMonth()]}`;
    const endStr = `${periodEnd.getDate()} ${monthNames[periodEnd.getMonth()]}`;
    const nextPayStr = `${nextPaydayDate.getDate()} ${monthNames[nextPaydayDate.getMonth()]}`;

    return {
      start: periodStart,
      end: periodEnd,
      nextPaydayDate,
      startLabel: startStr,
      endLabel: endStr,
      nextPayLabel: nextPayStr,
      daysLeft,
      daysElapsed,
      totalDaysInPeriod,
    };
  }, [settings.payday]);

  // Aggregate numbers
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [incomes]);

  const totalFixedExpenses = useMemo(() => {
    return fixedExpenses.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [fixedExpenses]);

  // Filter transactions within period
  const periodTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txTime = new Date(tx.date).getTime();
      return txTime >= period.start.getTime() && txTime <= period.end.getTime();
    });
  }, [transactions, period]);

  const totalVariableSpent = useMemo(() => {
    return periodTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  }, [periodTransactions]);

  // Calculate upcoming fixed expenses in current period based on current day
  const todayDay = new Date().getDate();
  const upcomingFixedExpenses = useMemo(() => {
    return fixedExpenses.map(f => {
      const isPast = f.dueDay < todayDay;
      return {
        ...f,
        isDeducted: isPast,
      };
    });
  }, [fixedExpenses, todayDay]);

  const remainingFixedToPay = useMemo(() => {
    return upcomingFixedExpenses
      .filter(f => !f.isDeducted)
      .reduce((sum, f) => sum + f.amount, 0);
  }, [upcomingFixedExpenses]);

  // Core KPI: Kvar att spendera från lön till nästa lön
  // (Total Inkomst - Totala Fasta Utgifter - Hittills Spenderat Rörligt)
  const kvarAttSpendera = useMemo(() => {
    return Math.max(0, totalIncome - totalFixedExpenses - totalVariableSpent);
  }, [totalIncome, totalFixedExpenses, totalVariableSpent]);

  // Daily budget remaining
  const dagsbudget = useMemo(() => {
    if (period.daysLeft <= 0) return 0;
    return Math.round(kvarAttSpendera / period.daysLeft);
  }, [kvarAttSpendera, period.daysLeft]);

  // Disposable balance on bank accounts: (Total balance - upcoming remaining bills)
  const disponibeltSaldo = useMemo(() => {
    return Math.max(0, totalBalance - remainingFixedToPay);
  }, [totalBalance, remainingFixedToPay]);

  // Actions
  const addTransaction = useCallback((tx: Omit<TransactionItem, 'id'>) => {
    const newItem: TransactionItem = {
      ...tx,
      id: 'tx-' + Date.now(),
    };
    setTransactions(prev => [newItem, ...prev]);

    // Also deduct from primary account if bank is connected
    setAccounts(prev => {
      if (prev.length === 0) return prev;
      return prev.map((acc, idx) => {
        if (idx === 0) {
          return { ...acc, balance: Math.max(0, acc.balance - newItem.amount) };
        }
        return acc;
      });
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const addFixedExpense = useCallback((item: Omit<FixedExpenseItem, 'id'>) => {
    const newItem: FixedExpenseItem = {
      ...item,
      id: 'fix-' + Date.now(),
    };
    setFixedExpenses(prev => [...prev, newItem].sort((a, b) => a.dueDay - b.dueDay));
  }, []);

  const deleteFixedExpense = useCallback((id: string) => {
    setFixedExpenses(prev => prev.filter(f => f.id !== id));
  }, []);

  const addIncome = useCallback((item: Omit<IncomeItem, 'id'>) => {
    const newItem: IncomeItem = {
      ...item,
      id: 'inc-' + Date.now(),
    };
    setIncomes(prev => [...prev, newItem]);
  }, []);

  const deleteIncome = useCallback((id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
  }, []);

  const updatePayday = useCallback((day: number) => {
    setSettings(prev => ({ ...prev, payday: day }));
  }, []);

  const toggleBankConnection = useCallback((connected: boolean, bankName = 'Swedbank') => {
    setSettings(prev => ({
      ...prev,
      isBankConnected: connected,
      connectedBankName: bankName,
      lastBankSync: connected ? new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : null,
    }));
  }, []);

  const syncBankAccounts = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      lastBankSync: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
    }));
  }, []);

  const resetToDefault = useCallback(() => {
    setAccounts(DEFAULT_ACCOUNTS);
    setIncomes(DEFAULT_INCOMES);
    setFixedExpenses(DEFAULT_FIXED_EXPENSES);
    setTransactions(DEFAULT_TRANSACTIONS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const clearAllData = useCallback(() => {
    setAccounts([]);
    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
  }, []);

  return {
    user,
    authLoading,
    accounts,
    incomes,
    fixedExpenses,
    transactions,
    periodTransactions,
    settings,
    period,
    totalBalance,
    totalIncome,
    totalFixedExpenses,
    totalVariableSpent,
    upcomingFixedExpenses,
    remainingFixedToPay,
    kvarAttSpendera,
    dagsbudget,
    disponibeltSaldo,
    addTransaction,
    deleteTransaction,
    addFixedExpense,
    deleteFixedExpense,
    addIncome,
    deleteIncome,
    updatePayday,
    toggleBankConnection,
    syncBankAccounts,
    resetToDefault,
    clearAllData,
  };
}
