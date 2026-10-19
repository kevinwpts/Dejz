import { Config, Income, FixedExpense, Transaction, Account, PaydayType, Frequency, PaymentMethod } from '../types';

export function seedDemoData() {
  if (!localStorage.getItem('cookie_consent')) {
    localStorage.setItem('cookie_consent', 'demo_accepted');
  }
  const now = Date.now();
  const dayMs = 86400000;
  const lang = (localStorage.getItem('app_language') as any) || 'sv';

  const demoConfig: Config = {
    currency: 'kr',
    language: lang,
    payday: 25,
    paydayType: PaydayType.TWENTY_FIFTH,
    paydayBeforeWeekend: true,
    categories: [
      { name: 'Mat & Dagligvaror', icon: 'ShoppingCart', color: '#ef4444' },
      { name: 'Restaurang', icon: 'Utensils', color: '#f97316' },
      { name: 'Fika', icon: 'Coffee', color: '#d97706' },
      { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
      { name: 'Boende', icon: 'Home', color: '#6366f1' },
      { name: 'Transport', icon: 'Car', color: '#0ea5e9' },
      { name: 'Abonnemang', icon: 'Smartphone', color: '#3b82f6' },
      { name: 'Streaming', icon: 'Tv', color: '#8b5cf6' },
      { name: 'Nöjen', icon: 'Gamepad2', color: '#a855f7' },
      { name: 'Hälsa', icon: 'Dumbbell', color: '#10b981' },
      { name: 'Räkningar', icon: 'Receipt', color: '#e11d48' },
      { name: 'Försäkringar', icon: 'ShieldCheck', color: '#0284c7' },
      { name: 'Resor', icon: 'Plane', color: '#06b6d4' },
      { name: 'Övrigt', icon: 'Package', color: '#0d9488' },
    ],
    incomeCategories: [
      { name: 'Lön', icon: 'Briefcase', color: '#10b981' },
      { name: 'Sidoinkomst', icon: 'DollarSign', color: '#3b82f6' },
      { name: 'Bidrag', icon: 'Gift', color: '#f59e0b' },
      { name: 'Övrigt', icon: 'MoreHorizontal', color: '#4f46e5' },
    ],
    paymentMethods: ['Kortbetalning', 'Swish', 'Autogiro', 'Apple', 'Klarna', 'PayPal', 'Faktura', 'Banköverföring', 'Kontanter', 'Övrigt'],
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
    showFixedExpensesInTodayView: false,
    showFixedExpensesInCalendar: false,
    showFixedExpensesInHistory: false,
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
    // --- NUVARANDE MÅNAD (0-14 dagar sedan) ---
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
    },
    {
      id: 'demo-tx-sub-1',
      amount: 119,
      category: 'Nöje & Fritid',
      merchant: 'Spotify Premium',
      note: 'Månadsabonnemang musik',
      timestamp: now - dayMs * 14.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },

    // --- FÖRRA MÅNADEN / PERIODEN (15-44 dagar sedan) ---
    {
      id: 'demo-tx-income-1',
      amount: 31200,
      category: 'Lön',
      merchant: 'Spotify AB',
      note: 'Månadslön Elin',
      timestamp: now - dayMs * 29.1,
      type: 'income',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-rent-1',
      amount: 8950,
      category: 'Boende',
      merchant: 'Hyra & Bostad',
      note: 'Månadshyra Vasastaden',
      timestamp: now - dayMs * 27.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-vattenfall-1',
      amount: 420,
      category: 'Räkningar',
      merchant: 'Vattenfall',
      note: 'Elräkning',
      timestamp: now - dayMs * 28.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-bahnhof-1',
      amount: 399,
      category: 'Räkningar',
      merchant: 'Bahnhof',
      note: 'Bredband 250/250',
      timestamp: now - dayMs * 27.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-sats-1',
      amount: 649,
      category: 'Hälsa & Skönhet',
      merchant: 'SATS Gym',
      note: 'Träningskort',
      timestamp: now - dayMs * 28.3,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-netflix-1',
      amount: 149,
      category: 'Nöje & Fritid',
      merchant: 'Netflix',
      note: 'Standard HD streaming',
      timestamp: now - dayMs * 21.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-1',
      amount: 720,
      category: 'Mat & Livsmedel',
      merchant: 'ICA Kvantum',
      note: 'Veckohandling',
      timestamp: now - dayMs * 16.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-2',
      amount: 610,
      category: 'Mat & Livsmedel',
      merchant: 'Willys',
      note: 'Storhandling torrvaror',
      timestamp: now - dayMs * 18.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-3',
      amount: 85,
      category: 'Restaurang & Fika',
      merchant: 'Espresso House',
      note: 'Fika möte',
      timestamp: now - dayMs * 20.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-4',
      amount: 540,
      category: 'Transport & Bensin',
      merchant: 'Circle K',
      note: 'Tanka bilen',
      timestamp: now - dayMs * 22.4,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-5',
      amount: 450,
      category: 'Shopping & Kläder',
      merchant: 'H&M',
      note: 'Presenter & strumpor',
      timestamp: now - dayMs * 25.3,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-6',
      amount: 320,
      category: 'Nöje & Fritid',
      merchant: 'Padel Zenter',
      note: 'Träning med kompis',
      timestamp: now - dayMs * 28.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.SWISH
    },
    {
      id: 'demo-tx-m1-7',
      amount: 310,
      category: 'Mat & Livsmedel',
      merchant: 'Systembolaget',
      note: 'Helg dryck',
      timestamp: now - dayMs * 30.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-8',
      amount: 180,
      category: 'Transport & Bensin',
      merchant: 'Uber',
      note: 'Taxiresa hem',
      timestamp: now - dayMs * 32.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-9',
      amount: 450,
      category: 'Mat & Livsmedel',
      merchant: 'Coop Konsum',
      note: 'Middagsköp',
      timestamp: now - dayMs * 35.4,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m1-10',
      amount: 380,
      category: 'Mat & Livsmedel',
      merchant: 'ICA Supermarket',
      note: 'Kompletteringshandling',
      timestamp: now - dayMs * 40.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-sub-2',
      amount: 119,
      category: 'Nöje & Fritid',
      merchant: 'Spotify Premium',
      note: 'Månadsabonnemang musik',
      timestamp: now - dayMs * 44.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },

    // --- TVÅ MÅNADER SEDAN (45-74 dagar sedan) ---
    {
      id: 'demo-tx-income-2',
      amount: 31200,
      category: 'Lön',
      merchant: 'Spotify AB',
      note: 'Månadslön Elin',
      timestamp: now - dayMs * 59.1,
      type: 'income',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-rent-2',
      amount: 8950,
      category: 'Boende',
      merchant: 'Hyra & Bostad',
      note: 'Månadshyra Vasastaden',
      timestamp: now - dayMs * 57.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-bahnhof-2',
      amount: 399,
      category: 'Räkningar',
      merchant: 'Bahnhof',
      note: 'Bredband 250/250',
      timestamp: now - dayMs * 57.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-sats-2',
      amount: 649,
      category: 'Hälsa & Skönhet',
      merchant: 'SATS Gym',
      note: 'Träningskort',
      timestamp: now - dayMs * 58.3,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-netflix-2',
      amount: 149,
      category: 'Nöje & Fritid',
      merchant: 'Netflix',
      note: 'Standard HD streaming',
      timestamp: now - dayMs * 51.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m2-1',
      amount: 145,
      category: 'Restaurang & Fika',
      merchant: 'Lunchrestaurang',
      note: 'Lunch med kollegor',
      timestamp: now - dayMs * 45.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m2-2',
      amount: 1290,
      category: 'Shopping & Kläder',
      merchant: 'Elgiganten',
      note: 'Hörlurar bluetooth',
      timestamp: now - dayMs * 50.4,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m2-3',
      amount: 165,
      category: 'Hälsa & Skönhet',
      merchant: 'Apoteket',
      note: 'Apoteksvaror',
      timestamp: now - dayMs * 52.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m2-4',
      amount: 890,
      category: 'Mat & Livsmedel',
      merchant: 'Willys',
      note: 'Veckohandling mat',
      timestamp: now - dayMs * 60.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m2-5',
      amount: 320,
      category: 'Nöje & Fritid',
      merchant: 'Padel Zenter',
      note: 'Padel med gänget',
      timestamp: now - dayMs * 65.5,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.SWISH
    },
    {
      id: 'demo-tx-m2-6',
      amount: 620,
      category: 'Transport & Bensin',
      merchant: 'Shell',
      note: 'Tanka bilen inför helg',
      timestamp: now - dayMs * 70.1,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-sub-3',
      amount: 119,
      category: 'Nöje & Fritid',
      merchant: 'Spotify Premium',
      note: 'Månadsabonnemang musik',
      timestamp: now - dayMs * 74.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },

    // --- TRE MÅNADER SEDAN (75-95 dagar sedan) ---
    {
      id: 'demo-tx-income-3',
      amount: 31200,
      category: 'Lön',
      merchant: 'Spotify AB',
      note: 'Månadslön Elin',
      timestamp: now - dayMs * 89.1,
      type: 'income',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-rent-3',
      amount: 8950,
      category: 'Boende',
      merchant: 'Hyra & Bostad',
      note: 'Månadshyra Vasastaden',
      timestamp: now - dayMs * 87.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.AUTOGIRO
    },
    {
      id: 'demo-tx-netflix-3',
      amount: 149,
      category: 'Nöje & Fritid',
      merchant: 'Netflix',
      note: 'Standard HD streaming',
      timestamp: now - dayMs * 81.2,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m3-1',
      amount: 850,
      category: 'Restaurang & Fika',
      merchant: 'Middag ute',
      note: 'Lördagsmiddag restaurang',
      timestamp: now - dayMs * 75.3,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m3-2',
      amount: 750,
      category: 'Mat & Livsmedel',
      merchant: 'ICA Kvantum',
      note: 'Veckohandel familj',
      timestamp: now - dayMs * 80.4,
      type: 'expense',
      tags: [],
      paymentMethod: PaymentMethod.KORTBETALNING
    },
    {
      id: 'demo-tx-m3-3',
      amount: 120,
      category: 'Hälsa & Skönhet',
      merchant: 'Apoteket Hjärtat',
      note: 'Apoteksköp',
      timestamp: now - dayMs * 85.1,
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
  localStorage.setItem('demo_data_version', 'v6_historical_rich');

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
      { name: 'Mat & Dagligvaror', icon: 'ShoppingCart', color: '#ef4444' },
      { name: 'Restaurang', icon: 'Utensils', color: '#f97316' },
      { name: 'Fika', icon: 'Coffee', color: '#d97706' },
      { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
      { name: 'Boende', icon: 'Home', color: '#6366f1' },
      { name: 'Transport', icon: 'Car', color: '#0ea5e9' },
      { name: 'Abonnemang', icon: 'Smartphone', color: '#3b82f6' },
      { name: 'Streaming', icon: 'Tv', color: '#8b5cf6' },
      { name: 'Nöjen', icon: 'Gamepad2', color: '#a855f7' },
      { name: 'Hälsa', icon: 'Dumbbell', color: '#10b981' },
      { name: 'Räkningar', icon: 'Receipt', color: '#e11d48' },
      { name: 'Försäkringar', icon: 'ShieldCheck', color: '#0284c7' },
      { name: 'Resor', icon: 'Plane', color: '#06b6d4' },
      { name: 'Övrigt', icon: 'Package', color: '#0d9488' },
    ],
    incomeCategories: [
      { name: 'Lön', icon: 'Briefcase', color: '#10b981' },
      { name: 'Sidoinkomst', icon: 'DollarSign', color: '#3b82f6' },
      { name: 'Bidrag', icon: 'Gift', color: '#f59e0b' },
      { name: 'Övrigt', icon: 'MoreHorizontal', color: '#4f46e5' },
    ],
    paymentMethods: ['Kortbetalning', 'Swish', 'Autogiro', 'Apple', 'Klarna', 'PayPal', 'Faktura', 'Banköverföring', 'Kontanter', 'Övrigt'],
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
    showFixedExpensesInTodayView: false,
    showFixedExpensesInCalendar: false,
    showFixedExpensesInHistory: false,
  };

  const freshProfile = {
    id: 'demo-user',
    email: 'test@example.com',
    full_name: '',
    currency: 'kr',
    language: lang,
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

