export enum PaymentMethod {
  AUTOGIRO = 'Autogiro',
  FAKTURA = 'Faktura',
  KORTBETALNING = 'Kortbetalning',
  SWISH = 'Swish',
  OVRIGT = 'Övrigt',
}

export enum Frequency {
  MONTHLY = 'Månadsvis',
  QUARTERLY = 'Kvartalsvis',
  SEMI_ANNUALLY = 'Halvårsvis',
  ANNUALLY = 'Årsvis',
}

export enum WeekendAdjustment {
  BEFORE = 'Närmaste vardag före',
  AFTER = 'Närmaste vardag efter',
  NONE = 'Ingen justering',
}

export enum PaydayType {
  FIRST_DAY = 'FIRST_DAY',
  LAST_DAY = 'LAST_DAY',
  TWENTY_FIFTH = 'TWENTY_FIFTH',
  CUSTOM = 'CUSTOM',
}

export enum SortOrder {
  ALPHABETICAL = 'ALPHABETICAL',
  DATE = 'DATE',
  AMOUNT = 'AMOUNT',
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
  budget?: number;
  pinned?: boolean;
  pinOrder?: number;
}

export interface QuickChoice {
  id: string;
  amount?: number;
  category: string;
  note: string;
  merchant?: string;
  icon: string;
  logo?: string;
  paymentMethod?: PaymentMethod;
}

export interface MonthlySaving {
  id: string;
  name: string;
  amount: number;
  icon?: string;
  logo?: string;
  deductionDay?: number;
  frequency?: Frequency;
  startMonth?: number; // 0-11
  paymentMethod?: string;
  isVariable?: boolean;
  periodOverrides?: Record<string, number>;
}

export interface Account {
  id: string;
  name: string;
  initialBalance: number;
  currentBalance: number;
  currency: string;
}

export interface PaymentMethod {
  name: string;
  icon: string;
  color?: string;
}

// ...

export interface Config {
  currency: string;
  language: string;
  payday: number;
  paydayType: PaydayType;
  paydayBeforeWeekend: boolean;
  categories: Category[];
  incomeCategories: Category[];
  paymentMethods: PaymentMethod[];
  initialSpent: number;
  notifications: {
    salaryDayReminder: boolean;
    weeklySummary: boolean;
    lastSurplusPromptDate?: string;
  };
  securityLock: boolean;
  darkMode: boolean;
  themeMode?: 'system' | 'light' | 'dark';
  quickChoices: QuickChoice[];
  savingsPot: number;
  savingsGoals: SavingsGoal[];
  totalSavedLifetime: number;
  surplusIncome: number;
  monthlySavings: number;
  monthlySavingsItems?: MonthlySaving[];
  appIconTheme?: 'accent' | 'midnight' | 'sunset' | 'ocean' | 'gold';
  includeFixedExpensesInAnalysis: boolean;
  showFixedExpensesInTodayView: boolean;
  showFixedExpensesInCalendar: boolean;
  heroBackgroundImage?: string;
  userAgeGroup?: string;
  userGender?: string;
  homeWidgets?: HomeWidgetConfig[];
}

export type HomeWidgetId =
  | 'quick_expense'
  | 'attention_items'
  | 'monthly_pulse'
  | 'savings_goals'
  | 'daily_summary'
  | 'category_budgets'
  | 'recent_receipts';

export interface HomeWidgetConfig {
  id: HomeWidgetId;
  enabled: boolean;
  order?: number;
  size?: 'small' | 'medium' | 'large';
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  priority: number;
  createdAt: number;
  isCompleted?: boolean;
  completedAt?: number;
  icon?: string;
  logo?: string;
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  category?: string;
  icon?: string;
  logo?: string;
  deductionDay?: number;
  frequency?: Frequency;
  startMonth?: number; // 0-11
  paymentMethod?: string;
  isVariable?: boolean;
  periodOverrides?: Record<string, number>;
  note?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  paymentMethod: string;
  frequency: Frequency;
  icon?: string;
  logo?: string;
  deductionDay?: number;
  startMonth?: number; // 0-11
  isVariable?: boolean;
  periodOverrides?: Record<string, number>;
  note?: string;
}

export interface SavingsPotTransaction {
  id: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface TransactionSplit {
  id: string;
  amount: number;
  category: string;
  tags: string[];
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  categoryId?: string;
  tags: string[];
  note?: string;
  merchant?: string;
  timestamp: number;
  type: 'income' | 'expense' | 'savings';
  isBackdated?: boolean;
  logo?: string;
  icon?: string;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  splits?: TransactionSplit[];
}

export interface AppNotification {
  id: string;
  type: 'variable_expense' | 'variable_income' | 'variable_savings' | 'general';
  item: any;
  title: string;
  subtitle: string;
  deductionDay: number;
  expectedAmount: number;
  date?: Date;
}
