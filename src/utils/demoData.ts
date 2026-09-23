import { Config, Income, FixedExpense, Transaction, Account, PaydayType, Frequency, PaymentMethod } from '../types';

export function seedDemoData() {
  if (!localStorage.getItem('cookie_consent')) {
    localStorage.setItem('cookie_consent', 'demo_accepted');
  }
  const now = Date.now();
  const dayMs = 86400000;

  const demoConfig: Config = {
    currency: 'kr',
    language: 'sv',
    payday: 25,
    paydayType: PaydayType.TWENTY_FIFTH,
    paydayBeforeWeekend: true,
    categories: [
      { name: 'Mat & Livsmedel', icon: 'ShoppingCart', color: '#ef4444' },
      { name: 'Restaurang & Fika', icon: 'Coffee', color: '#f59e0b' },
      { name: 'Transport & Bensin', icon: 'Car', color: '#0ea5e9' },
      { name: 'Nöje & Fritid', icon: 'Gamepad2', color: '#8b5cf6' },
      { name: 'Shopping & Kläder', icon: 'ShoppingBag', color: '#ec4899' },
      { name: 'Hälsa & Skönhet', icon: 'Heart', color: '#10b981' },
      { name: 'Boende', icon: 'Home', color: '#6366f1' },
      { name: 'Räkningar', icon: 'Receipt', color: '#64748b' },
      { name: 'Övrigt', icon: 'MoreHorizontal', color: '#94a3b8' },
    ],
    incomeCategories: [
      { name: 'Lön', icon: 'Briefcase', color: '#10b981' },
      { name: 'Sidoinkomst', icon: 'DollarSign', color: '#3b82f6' },
      { name: 'Bidrag', icon: 'Gift', color: '#f59e0b' },
      { name: 'Övrigt', icon: 'MoreHorizontal', color: '#94a3b8' },
    ],
    paymentMethods: ['Kortbetalning', 'Swish', 'Autogiro', 'Faktura', 'Kontanter', 'Övrigt'],
    initialSpent: 0,
    notifications: {
      salaryDayReminder: true,
      weeklySummary: true,
    },
    securityLock: false,
    darkMode: true,
    quickChoices: [
      { id: 'demo-qc-1', merchant: 'ICA Kvantum', note: 'Middagshandel', amount: 385, category: 'Mat & Livsmedel', icon: 'ShoppingCart' },
      { id: 'demo-qc-2', merchant: 'Espresso House', note: 'Kaffe & Smörgås', amount: 79, category: 'Restaurang & Fika', icon: 'Coffee' },
      { id: 'demo-qc-3', merchant: 'SL', note: 'Enkelbiljett SL', amount: 42, category: 'Transport & Bensin', icon: 'Car' },
      { id: 'demo-qc-4', merchant: 'Lunchrestaurang', note: 'Dagens lunch', amount: 145, category: 'Restaurang & Fika', icon: 'Utensils' },
    ],
    savingsPot: 5400,
    savingsGoals: [
      {
        id: 'goal-1',
        title: 'Semester i Italien',
        targetAmount: 25000,
        currentAmount: 18500,
        deadline: '2026-07-15',
        icon: 'Palmtree',
        priority: 1,
        createdAt: now,
      },
      {
        id: 'goal-2',
        title: 'Trygghetsbuffert (SEB)',
        targetAmount: 40000,
        currentAmount: 32000,
        icon: 'ShieldCheck',
        priority: 2,
        createdAt: now,
      },
      {
        id: 'goal-3',
        title: 'Avanza Fonder & Aktier',
        targetAmount: 100000,
        currentAmount: 65000,
        icon: 'TrendingUp',
        priority: 3,
        createdAt: now,
      }
    ],
    totalSavedLifetime: 115500,
    surplusIncome: 0,
    monthlySavings: 5000,
    monthlySavingsItems: [
      { id: 'ms-1', name: 'Semesterkonto', amount: 2000 },
      { id: 'ms-2', name: 'Buffertsparande', amount: 2000 },
      { id: 'ms-3', name: 'Månadsspar Avanza', amount: 1000 }
    ],
    appIconTheme: 'accent',
    includeFixedExpensesInAnalysis: true,
    showFixedExpensesInTodayView: true,
    showFixedExpensesInCalendar: false,
  };

  const demoIncomes: Income[] = [
    {
      id: 'demo-inc-1',
      name: 'Spotify AB',
      amount: 31200,
      deductionDay: 25,
      icon: 'Briefcase',
      category: 'Lön',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-inc-2',
      name: 'Frilans & Konsulting',
      amount: 3500,
      deductionDay: 28,
      icon: 'DollarSign',
      category: 'Sidoinkomst',
      paymentMethod: PaymentMethod.AUTOGIRO,
    }
  ];

  const demoFixedExpenses: FixedExpense[] = [
    {
      id: 'demo-exp-1',
      name: 'Hyra & Bostad (Vasastaden)',
      amount: 8950,
      frequency: Frequency.MONTHLY,
      deductionDay: 27,
      category: 'Boende',
      icon: 'Home',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-2',
      name: 'Vattenfall El & Nät',
      amount: 420,
      frequency: Frequency.MONTHLY,
      deductionDay: 28,
      category: 'Räkningar',
      icon: 'Zap',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-3',
      name: 'Bahnhof Bredband 250/250',
      amount: 399,
      frequency: Frequency.MONTHLY,
      deductionDay: 27,
      category: 'Räkningar',
      icon: 'Wifi',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-4',
      name: 'Tre Mobilabonnemang Unlimited',
      amount: 299,
      frequency: Frequency.MONTHLY,
      deductionDay: 27,
      category: 'Räkningar',
      icon: 'Smartphone',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-5',
      name: 'Hedvig Hemförsäkring',
      amount: 215,
      frequency: Frequency.MONTHLY,
      deductionDay: 26,
      category: 'Räkningar',
      icon: 'ShieldCheck',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-6',
      name: 'SATS Medlemskap',
      amount: 649,
      frequency: Frequency.MONTHLY,
      deductionDay: 28,
      category: 'Hälsa & Skönhet',
      icon: 'Dumbbell',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-7',
      name: 'Unionen A-kassa & Fack',
      amount: 185,
      frequency: Frequency.MONTHLY,
      deductionDay: 25,
      category: 'Räkningar',
      icon: 'Briefcase',
      paymentMethod: PaymentMethod.AUTOGIRO,
    },
    {
      id: 'demo-exp-8',
      name: 'Spotify Premium',
      amount: 119,
      frequency: Frequency.MONTHLY,
      deductionDay: 14,
      category: 'Nöje & Fritid',
      icon: 'Music',
      paymentMethod: PaymentMethod.KORTBETALNING,
    },
    {
      id: 'demo-exp-9',
      name: 'Netflix Standard HD',
      amount: 149,
      frequency: Frequency.MONTHLY,
      deductionDay: 21,
      category: 'Nöje & Fritid',
      icon: 'Tv',
      paymentMethod: PaymentMethod.KORTBETALNING,
    },
    {
      id: 'demo-exp-10',
      name: 'iCloud 200 GB Lagring',
      amount: 29,
      frequency: Frequency.MONTHLY,
      deductionDay: 5,
      category: 'Räkningar',
      icon: 'Cloud',
      paymentMethod: PaymentMethod.KORTBETALNING,
    },
  ];

  const demoTransactions: Transaction[] = [
    {
      id: 'demo-tx-1',
      amount: 342,
      category: 'Mat & Livsmedel',
      merchant: 'ICA Supermarket',
      note: 'Middagshandling & färskvaror',
      timestamp: now - dayMs * 0.15,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-2',
      amount: 78,
      category: 'Restaurang & Fika',
      merchant: 'Espresso House',
      note: 'Havrelatte & croissant',
      timestamp: now - dayMs * 0.35,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-3',
      amount: 155,
      category: 'Restaurang & Fika',
      merchant: 'Holy Greens',
      note: 'Salladslunch med kollegor',
      timestamp: now - dayMs * 1.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-4',
      amount: 42,
      category: 'Transport & Bensin',
      merchant: 'SL',
      note: 'Tunnelbana enkelbiljett',
      timestamp: now - dayMs * 1.4,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.SWISH
    },
    {
      id: 'demo-tx-5',
      amount: 890,
      category: 'Mat & Livsmedel',
      merchant: 'Willys Fridhemsplan',
      note: 'Vecko- och basvaruhandling',
      timestamp: now - dayMs * 2.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-6',
      amount: 210,
      category: 'Swish / Återbetalning',
      merchant: 'Swish (Maja)',
      note: 'Andel för middagsutlägg',
      timestamp: now - dayMs * 2.5,
      type: 'income',
      tags: [],
      paymentMethod: PaymentMethod.SWISH
    },
    {
      id: 'demo-tx-7',
      amount: 320,
      category: 'Nöje & Fritid',
      merchant: 'Padel Zenter',
      note: 'Match & banhyra',
      timestamp: now - dayMs * 3.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.SWISH
    },
    {
      id: 'demo-tx-8',
      amount: 245,
      category: 'Mat & Livsmedel',
      merchant: 'Systembolaget',
      note: 'Middagsvin helg',
      timestamp: now - dayMs * 3.8,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-9',
      amount: 430,
      category: 'Restaurang & Fika',
      merchant: 'Vapiano Gamla Stan',
      note: 'Middag & dryck',
      timestamp: now - dayMs * 4.4,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-10',
      amount: 215,
      category: 'Hälsa & Skönhet',
      merchant: 'Apoteket Hjärtat',
      note: 'Hudvård och vitaminer',
      timestamp: now - dayMs * 5.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-11',
      amount: 590,
      category: 'Shopping & Kläder',
      merchant: 'Stadium',
      note: 'Nya träningsplagg',
      timestamp: now - dayMs * 6.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-12',
      amount: 450,
      category: 'Transport & Bensin',
      merchant: 'Circle K',
      note: 'Bensin & vindrutetorkare',
      timestamp: now - dayMs * 7.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-13',
      amount: 1000,
      category: 'Övrigt',
      merchant: 'Avanza Fonder',
      note: 'Månadsöverföring till fondkonto',
      timestamp: now - dayMs * 8.2,
      type: 'savings',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-14',
      amount: 165,
      category: 'Mat & Livsmedel',
      merchant: 'Hemköp City',
      note: 'Frukostpåfyllning & frukt',
      timestamp: now - dayMs * 9.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-15',
      amount: 340,
      category: 'Nöje & Fritid',
      merchant: 'Filmstaden Sergel',
      note: 'Biobiljetter & popcorn',
      timestamp: now - dayMs * 10.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-16',
      amount: 680,
      category: 'Mat & Livsmedel',
      merchant: 'ICA Kvantum',
      note: 'Helghandling',
      timestamp: now - dayMs * 12.3,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    }
  ];

  const demoAccounts: Account[] = [
    {
      id: 'demo-acc-1',
      name: 'Lönekonto (SEB)',
      initialBalance: 12450,
      currentBalance: 12450,
      currency: 'kr'
    },
    {
      id: 'demo-acc-2',
      name: 'Sparkonto (Avanza)',
      initialBalance: 115500,
      currentBalance: 115500,
      currency: 'kr'
    }
  ];

  const demoProfile = {
    id: 'demo-user',
    email: 'demo@dejz.se',
    full_name: 'Elin Lindqvist',
    currency: 'kr',
    language: 'sv',
    onboarding_completed: true,
    categories: demoConfig.categories,
    income_categories: demoConfig.incomeCategories,
    payment_methods: demoConfig.paymentMethods,
  };

  localStorage.setItem('demo_settings', JSON.stringify(demoConfig));
  localStorage.setItem('demo_incomes', JSON.stringify(demoIncomes));
  localStorage.setItem('demo_fixed', JSON.stringify(demoFixedExpenses));
  localStorage.setItem('demo_transactions', JSON.stringify(demoTransactions));
  localStorage.setItem('demo_accounts', JSON.stringify(demoAccounts));
  localStorage.setItem('demo_profile', JSON.stringify(demoProfile));
  localStorage.setItem('demo_data_version', 'v5_realistic_light');

  const mockSession = {
    access_token: 'demo-token',
    refresh_token: 'demo-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'demo-user',
      email: 'demo@dejz.se',
      user_metadata: { full_name: 'Elin Lindqvist' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    }
  };

  localStorage.setItem('dejz_demo_session', JSON.stringify(mockSession));
  return mockSession;
}

export function createFreshTestAccount() {
  if (!localStorage.getItem('cookie_consent')) {
    localStorage.setItem('cookie_consent', 'demo_accepted');
  }

  const lang = (localStorage.getItem('app_language') as any) || 'sv';

  const defaultFreshConfig: Config = {
    currency: 'kr',
    language: lang,
    payday: 25,
    paydayType: PaydayType.TWENTY_FIFTH,
    paydayBeforeWeekend: true,
    categories: [
      { name: 'Mat & Livsmedel', icon: 'ShoppingCart', color: '#ef4444' },
      { name: 'Restaurang & Fika', icon: 'Coffee', color: '#f59e0b' },
      { name: 'Transport & Bensin', icon: 'Car', color: '#0ea5e9' },
      { name: 'Nöje & Fritid', icon: 'Gamepad2', color: '#8b5cf6' },
      { name: 'Shopping & Kläder', icon: 'ShoppingBag', color: '#ec4899' },
      { name: 'Hälsa & Skönhet', icon: 'Heart', color: '#10b981' },
      { name: 'Boende', icon: 'Home', color: '#6366f1' },
      { name: 'Räkningar', icon: 'Receipt', color: '#64748b' },
      { name: 'Övrigt', icon: 'MoreHorizontal', color: '#94a3b8' },
    ],
    incomeCategories: [
      { name: 'Lön', icon: 'Briefcase', color: '#10b981' },
      { name: 'Sidoinkomst', icon: 'DollarSign', color: '#3b82f6' },
      { name: 'Bidrag', icon: 'Gift', color: '#f59e0b' },
      { name: 'Övrigt', icon: 'MoreHorizontal', color: '#94a3b8' },
    ],
    paymentMethods: ['Kortbetalning', 'Swish', 'Autogiro', 'Faktura', 'Kontanter', 'Övrigt'],
    initialSpent: 0,
    notifications: {
      salaryDayReminder: true,
      weeklySummary: true,
    },
    securityLock: false,
    darkMode: true,
    quickChoices: [],
    savingsPot: 0,
    savingsGoals: [],
    totalSavedLifetime: 0,
    surplusIncome: 0,
    monthlySavings: 0,
    monthlySavingsItems: [],
    appIconTheme: 'accent',
    includeFixedExpensesInAnalysis: true,
    showFixedExpensesInTodayView: true,
    showFixedExpensesInCalendar: false,
  };

  const freshProfile = {
    id: 'demo-user',
    email: 'test@example.com',
    full_name: '',
    currency: 'kr',
    language: lang,
    dark_mode: true,
    onboarding_completed: false,
    categories: defaultFreshConfig.categories,
    income_categories: defaultFreshConfig.incomeCategories,
    payment_methods: defaultFreshConfig.paymentMethods,
  };

  localStorage.setItem('demo_settings', JSON.stringify(defaultFreshConfig));
  localStorage.setItem('demo_incomes', JSON.stringify([]));
  localStorage.setItem('demo_fixed', JSON.stringify([]));
  localStorage.setItem('demo_transactions', JSON.stringify([]));
  localStorage.setItem('demo_accounts', JSON.stringify([]));
  localStorage.setItem('demo_profile', JSON.stringify(freshProfile));
  localStorage.setItem('demo_data_version', 'v_fresh_test_account');

  const mockSession = {
    access_token: 'demo-token',
    refresh_token: 'demo-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'demo-user',
      email: 'test@example.com',
      user_metadata: {},
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString()
    }
  };

  localStorage.setItem('dejz_demo_session', JSON.stringify(mockSession));
  return mockSession;
}

