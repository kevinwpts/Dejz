import { supabase } from '../supabaseClient';
import {
  Account,
  Category,
  Config,
  HomeWidgetConfig,
  Income,
  FixedExpense,
  MonthlySaving,
  PaydayType,
  QuickChoice,
  SavingsGoal,
  Transaction,
} from '../types';
import type { Database } from '../types/database';
import { seedDemoData } from '../utils/demoData';
import { getTransactionReceipts } from '../utils/format';
import {
  TransactionInsert,
  TransactionRow,
  TransactionUpdate,
  transactionFromRow,
  transactionToRow,
} from './transactionRows';
import {
  FixedExpenseInput,
  fixedExpenseFromRow,
  fixedExpenseToRow,
  incomeFromRow,
  incomeToRow,
  fromJson,
  toJson,
} from './budgetRows';

/**
 * All läsning och skrivning av appens data i Supabase (och demoläget i localStorage).
 * Använder den strikt typade klienten: en kolumn som inte finns i databasen ger ett fel när koden byggs.
 * Varje sparning är ett enda anrop – inga omförsök där kolumner plockas bort.
 */
const db = supabase;

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export function hasValidSavedCategoryBudgets(cats: unknown): boolean {
  if (!Array.isArray(cats) || cats.length === 0) return false;
  const budgetVals = cats.map((c: { budget?: unknown } | null) => Number(c?.budget) || 0);
  const totalSum = budgetVals.reduce((a: number, b: number) => a + b, 0);
  const maxVal = Math.max(...budgetVals, 0);
  const isLegacyPercentDefault = maxVal <= 100 && totalSum <= 100 && totalSum > 0;
  return !isLegacyPercentDefault && budgetVals.some((v: number) => v > 0);
}

const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

export const dataService = {
  // --- User Settings ---
  async getSettings(userId: string): Promise<Config | null> {    // Get settings from profiles table
    if (userId === 'demo-user') {
      let saved = localStorage.getItem('demo_settings');
      if (!saved || !JSON.parse(saved).categories) {
        seedDemoData();
        saved = localStorage.getItem('demo_settings');
      }
      return saved ? JSON.parse(saved) : null;
    }
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error('[Supabase Error] getSettings:', profileError);
      throw profileError;
    }
    
    if (!profileData) return null;
    
    let localSavedConfig: Partial<Config> | null = null;
    try {
      const cached = localStorage.getItem(`user_settings_${userId}`);
      if (cached) localSavedConfig = JSON.parse(cached);
    } catch {
      // Ignore localStorage read errors
    }

    // JSON-kolumnerna innehåller appens egna objekt – tolka dem som rätt typ.
    const dbCategories = fromJson<Category[] | null>(profileData.categories);
    const dbSavingsGoals = fromJson<SavingsGoal[] | null>(profileData.savings_goals);

    const resolvedCategories = hasValidSavedCategoryBudgets(dbCategories)
      ? dbCategories
      : (localSavedConfig?.hasSavedInitialBudget !== false && hasValidSavedCategoryBudgets(localSavedConfig?.categories)
          ? localSavedConfig.categories
          : (dbCategories || localSavedConfig?.categories));

    return {
      currency: profileData.currency,
      currencyCode: profileData.currency_code || localSavedConfig?.currencyCode || undefined,
      language: profileData.language,
      country: profileData.country || localSavedConfig?.country || undefined,
      locale: profileData.locale || localSavedConfig?.locale || undefined,
      timezone: profileData.timezone || localSavedConfig?.timezone || undefined,
      savingsPot: Number(profileData.savings_pot ?? localSavedConfig?.savingsPot) || 0,
      surplusIncome: Number(profileData.surplus_income ?? localSavedConfig?.surplusIncome) || 0,
      payday: profileData.payday,
      paydayType: profileData.payday_type as PaydayType,
      paydayBeforeWeekend: profileData.payday_before_weekend,
      categories: resolvedCategories,
      incomeCategories: fromJson<Category[] | null>(profileData.income_categories) || localSavedConfig?.incomeCategories,
      paymentMethods: (profileData.payment_methods as Config['paymentMethods'] | null) || ['Kortbetalning', 'Swish', 'Autogiro', 'Apple', 'Klarna', 'PayPal', 'Faktura', 'Banköverföring', 'Kontanter', 'Övrigt'],
      initialSpent: profileData.initial_spent,
      notifications: profileData.notifications as Config['notifications'],
      securityLock: profileData.security_lock,
      darkMode: (profileData.theme_mode === 'dark' || localSavedConfig?.themeMode === 'dark') ? true : false,
      themeMode: (profileData.theme_mode === 'dark' || localSavedConfig?.themeMode === 'dark') ? 'dark' : 'light',
      themeColor: profileData.theme_color || localSavedConfig?.themeColor || 'neutral',
      quickChoices: fromJson<QuickChoice[] | null>(profileData.quick_choices) || [],
      savingsGoals: (dbSavingsGoals && Array.isArray(dbSavingsGoals) && dbSavingsGoals.length > 0)
        ? dbSavingsGoals
        : (localSavedConfig?.savingsGoals || []),
      totalSavedLifetime: profileData.total_saved_lifetime || 0,
      monthlySavings: (profileData.monthly_savings !== undefined && profileData.monthly_savings !== null)
        ? profileData.monthly_savings
        : (localSavedConfig?.monthlySavings !== undefined ? localSavedConfig.monthlySavings : 0),
      monthlySavingsItems: Array.isArray(profileData.monthly_savings_items)
        ? fromJson<MonthlySaving[]>(profileData.monthly_savings_items)
        : (Array.isArray(localSavedConfig?.monthlySavingsItems) ? localSavedConfig.monthlySavingsItems : []),
      appIconTheme: profileData.app_icon_theme as Config['appIconTheme'],
      includeFixedExpensesInAnalysis: profileData.include_fixed_expenses_in_analysis !== undefined 
        ? profileData.include_fixed_expenses_in_analysis 
        : (localSavedConfig?.includeFixedExpensesInAnalysis !== undefined ? localSavedConfig.includeFixedExpensesInAnalysis : true),
      showFixedExpensesInTodayView: (profileData.show_fixed_expenses_in_today_view !== undefined && profileData.show_fixed_expenses_in_today_view !== null)
        ? Boolean(profileData.show_fixed_expenses_in_today_view)
        : (localSavedConfig?.showFixedExpensesInTodayView !== undefined ? Boolean(localSavedConfig.showFixedExpensesInTodayView) : false),
      showFixedExpensesInCalendar: (profileData.show_fixed_expenses_in_calendar !== undefined && profileData.show_fixed_expenses_in_calendar !== null)
        ? Boolean(profileData.show_fixed_expenses_in_calendar)
        : (localSavedConfig?.showFixedExpensesInCalendar !== undefined 
            ? Boolean(localSavedConfig.showFixedExpensesInCalendar) 
            : false),
      showFixedExpensesInHistory: (profileData.show_fixed_expenses_in_history !== undefined && profileData.show_fixed_expenses_in_history !== null)
        ? Boolean(profileData.show_fixed_expenses_in_history)
        : (localSavedConfig?.showFixedExpensesInHistory !== undefined ? Boolean(localSavedConfig.showFixedExpensesInHistory) : false),
      homeWidgets: fromJson<HomeWidgetConfig[] | null>(profileData.home_widgets) || localSavedConfig?.homeWidgets || undefined,
      hideEmptyCategories: profileData.hide_empty_categories !== undefined
        ? profileData.hide_empty_categories
        : (localSavedConfig?.hideEmptyCategories !== undefined ? localSavedConfig.hideEmptyCategories : false),
      hideBudgetOnHome: (profileData.hide_budget_on_home !== undefined && profileData.hide_budget_on_home !== null)
        ? Boolean(profileData.hide_budget_on_home)
        : (localSavedConfig?.hideBudgetOnHome !== undefined
            ? Boolean(localSavedConfig.hideBudgetOnHome)
            : (typeof window !== 'undefined' && localStorage.getItem('dejz_hide_budget_on_home') === 'true')),
      hasSavedInitialBudget: hasValidSavedCategoryBudgets(resolvedCategories),
    };
  },

  async getProfile(userId: string) {
    if (userId === 'demo-user') {
      const savedProfile = localStorage.getItem('demo_profile');
      const profile = savedProfile ? JSON.parse(savedProfile) : { email: 'demo@dejz.se' };
      const savedSettings = localStorage.getItem('demo_settings');
      let settings: Partial<Config> | null = null;
      if (savedSettings) {
        try {
          settings = JSON.parse(savedSettings);
        } catch (_e) {
          console.warn('Failed to parse demo_settings:', _e);
        }
      }
      return {
        ...profile,
        categories: (profile.categories && profile.categories.length > 0)
          ? profile.categories
          : (settings?.categories || null),
        income_categories: (profile.income_categories && profile.income_categories.length > 0)
          ? profile.income_categories
          : (settings?.incomeCategories || null),
      };
    }
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error fetching profile:", profileError);
      // Don't throw, just return a default so the app doesn't crash
      return { };
    }

    return profileData || { };
  },

  async updateProfile(userId: string, updates: ProfileUpdate) {
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_profile');
      const profile = saved ? JSON.parse(saved) : {};
      const updatedProfile = { ...profile, ...updates };
      localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
      return;
    }
    const { error } = await db
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
  },

  async saveSettings(userId: string, config: Config) {
    if (userId === 'demo-user') {
      localStorage.setItem('demo_settings', JSON.stringify(config));
      // Also sync to demo_profile so categories and income_categories are correctly reflected in getProfile!
      const savedProfile = localStorage.getItem('demo_profile');
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile);
          profile.categories = config.categories;
          profile.income_categories = config.incomeCategories;
          localStorage.setItem('demo_profile', JSON.stringify(profile));
        } catch (_e) {
          console.error("Failed to sync demo_profile:", _e);
        }
      }
      return;
    }

    const effectiveHasSavedBudget = Boolean(
      config.hasSavedInitialBudget || hasValidSavedCategoryBudgets(config.categories)
    );
    const configToPersist = {
      ...config,
      hasSavedInitialBudget: effectiveHasSavedBudget,
      updatedAt: Date.now(),
    };

    try {
      localStorage.setItem(`user_settings_${userId}`, JSON.stringify(configToPersist));
      if (effectiveHasSavedBudget) {
        localStorage.setItem(`dejz_has_saved_initial_budget_${userId}`, 'true');
      } else {
        localStorage.removeItem(`dejz_has_saved_initial_budget_${userId}`);
      }
    } catch {
      // Ignore localStorage write errors
    }

    const notificationsPayload = {
      ...(config.notifications || {}),
      _hasSavedInitialBudget: effectiveHasSavedBudget,
      _onboardingCompleted: true,
    };

    // "Har sparat budget" och "onboarding klar" har inga egna kolumner – de ligger i notifications ovan.
    const payload: ProfileInsert = {
      id: userId,
      currency: config.currency,
      currency_code: config.currencyCode || null,
      language: config.language,
      country: config.country || null,
      locale: config.locale || null,
      timezone: config.timezone || null,
      payday: config.payday,
      payday_type: config.paydayType,
      payday_before_weekend: config.paydayBeforeWeekend,
      categories: toJson(config.categories),
      income_categories: toJson(config.incomeCategories),
      payment_methods: toJson(config.paymentMethods),
      initial_spent: config.initialSpent,
      notifications: notificationsPayload,
      security_lock: config.securityLock,
      dark_mode: Boolean(config.darkMode),
      theme_mode: config.darkMode ? 'dark' : 'light',
      theme_color: config.themeColor || 'neutral',
      quick_choices: toJson(config.quickChoices),
      savings_pot: config.savingsPot,
      savings_goals: toJson(config.savingsGoals),
      total_saved_lifetime: config.totalSavedLifetime,
      surplus_income: config.surplusIncome,
      monthly_savings: config.monthlySavings !== undefined ? config.monthlySavings : (config.monthlySavingsItems?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0),
      monthly_savings_items: toJson(config.monthlySavingsItems || []),
      app_icon_theme: config.appIconTheme,
      include_fixed_expenses_in_analysis: config.includeFixedExpensesInAnalysis,
      show_fixed_expenses_in_today_view: config.showFixedExpensesInTodayView,
      show_fixed_expenses_in_calendar: config.showFixedExpensesInCalendar,
      show_fixed_expenses_in_history: config.showFixedExpensesInHistory,
      home_widgets: toJson(config.homeWidgets),
      hide_empty_categories: config.hideEmptyCategories,
      updated_at: new Date().toISOString()
    };

    let { error } = await db
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    // Om UPDATE misslyckas (t.ex. profilraden saknas): försök en gång med UPSERT
    if (error) {
      console.warn("[Supabase saveSettings] UPDATE failed, falling back to UPSERT...", error);
      const upsertResult = await db.from('profiles').upsert(payload);
      error = upsertResult.error;
    }

    if (error) {
      console.error("Error saving settings to Supabase profiles:", error);
      throw error;
    }
  },

  // --- Transactions (Expenses/Incomes) ---
  async getTransactions(userId: string): Promise<Transaction[]> {
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_transactions');
      const parsed: Transaction[] = saved ? JSON.parse(saved) : [];
      return parsed.map((t) => {
        const urls = getTransactionReceipts(t);
        return {
          ...t,
          receiptUrl: urls[0],
          receiptUrls: urls,
        };
      });
    }
    const { data, error } = await db
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map((t) => transactionFromRow(t));
  },

  async addTransaction(
    userId: string,
    transaction: Omit<Transaction, 'id'>
  ): Promise<Transaction> {
    const normalizedReceipts = getTransactionReceipts(transaction);
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_transactions');
      const list = saved ? JSON.parse(saved) : [];
      const newTx: Transaction = {
        ...transaction,
        receiptUrl: normalizedReceipts[0],
        receiptUrls: normalizedReceipts,
        id: `demo-tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
      list.unshift(newTx);
      localStorage.setItem('demo_transactions', JSON.stringify(list));
      return newTx;
    }
    // First, ensure the profile exists to avoid foreign key violations
    const { data: profile } = await db
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!profile) {
      console.warn('[Data] Profile missing during transaction add, attempting repair...');
      await db
        .from('profiles')
        .upsert({ id: userId, dark_mode: false, theme_mode: 'light' });
    }

    const payload: TransactionInsert = { user_id: userId, ...transactionToRow(transaction, 'insert') };

    const res = await db.from('transactions').insert(payload).select();
    let data: TransactionRow[] | null = res.data;
    let error = res.error;

    // Samma bankköp finns redan (unikt bank-id): använd raden som redan är sparad
    if (error && error.code === '23505' && transaction.bankTransactionId) {
      const { data: existingRows } = await db
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .contains('tags', [`bank_tx:${transaction.bankTransactionId}`])
        .limit(1);
      if (existingRows && existingRows.length > 0) {
        data = existingRows;
        error = null;
      }
    }

    if (error) {
      console.error('[Supabase Error] addTransaction:', error);
      throw error;
    }
    if (!data || data.length === 0) throw new Error('Ingen data returnerades från databasen');

    return transactionFromRow(data[0], transaction);
  },

  async updateTransaction(
    id: string,
    transaction: Omit<Transaction, 'id'>
  ): Promise<Transaction> {
    const normalizedReceipts = getTransactionReceipts(transaction);
    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_transactions');
      const list: Transaction[] = saved ? JSON.parse(saved) : [];
      const index = list.findIndex((t) => t.id === id);
      const updatedTx: Transaction = {
        ...transaction,
        receiptUrl: normalizedReceipts[0],
        receiptUrls: normalizedReceipts,
        id,
      };
      if (index !== -1) {
        list[index] = updatedTx;
      } else {
        list.unshift(updatedTx);
      }
      localStorage.setItem('demo_transactions', JSON.stringify(list));
      return updatedTx;
    }

    const payload: TransactionUpdate = transactionToRow(transaction, 'update');

    const { data, error } = await db.from('transactions').update(payload).eq('id', id).select();

    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Kunde inte uppdatera transaktionen');

    return transactionFromRow(data[0], transaction);
  },

  async deleteTransaction(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_transactions');
      const list: Transaction[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(t => t.id !== id);
      localStorage.setItem('demo_transactions', JSON.stringify(filtered));
      return;
    }
    const { error } = await db
      .from('transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // --- Income Sources ---
  async getIncomeSources(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_incomes');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await db
      .from('income_sources')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map((i) => incomeFromRow(i));
  },

  async saveIncomeSource(userId: string, income: Income & { originalName?: string }) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_incomes');
      const list: Income[] = saved ? JSON.parse(saved) : [];
      const targetId = income.id && income.id.startsWith('demo-') ? income.id : `demo-inc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const updatedIncome = { ...income, id: targetId };
      const index = list.findIndex(i => i.id === income.id);
      if (index !== -1) {
        list[index] = updatedIncome;
      } else {
        list.push(updatedIncome);
      }
      localStorage.setItem('demo_incomes', JSON.stringify(list));
      return;
    }
    const { error } = await db
      .from('income_sources')
      .upsert(incomeToRow(userId, income));

    if (error) throw error;
  },

  async deleteIncomeSource(id: string, userId?: string, namesToDelete?: string[]) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_incomes');
      const list: Income[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(i => i.id !== id);
      localStorage.setItem('demo_incomes', JSON.stringify(filtered));
      return;
    }
    if (isUuid(id)) {
      await db
        .from('income_sources')
        .delete()
        .eq('id', id);
    }
    if (userId && Array.isArray(namesToDelete) && namesToDelete.length > 0) {
      const validNames = Array.from(new Set(namesToDelete.filter(Boolean)));
      if (validNames.length > 0) {
        await db
          .from('income_sources')
          .delete()
          .eq('user_id', userId)
          .in('name', validNames);
      }
    }
  },

  // --- Fixed Expenses ---
  async getFixedExpenses(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_fixed');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await db
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map((e) => fixedExpenseFromRow(e));
  },

  async saveFixedExpense(
    userId: string,
    expense: FixedExpenseInput
  ) {
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_fixed');
      const list: FixedExpense[] = saved ? JSON.parse(saved) : [];
      const targetId = expense.id && expense.id.startsWith('demo-') ? expense.id : `demo-exp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const updatedExpense = { ...expense, id: targetId };
      const index = list.findIndex(e => e.id === expense.id);
      if (index !== -1) {
        list[index] = updatedExpense;
      } else {
        list.push(updatedExpense);
      }
      localStorage.setItem('demo_fixed', JSON.stringify(list));
      return;
    }

    const { error } = await db
      .from('fixed_expenses')
      .upsert(fixedExpenseToRow(userId, expense));

    if (error) throw error;
  },

  async deleteFixedExpense(id: string, userId?: string, namesToDelete?: string[]) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_fixed');
      const list: FixedExpense[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(e => e.id !== id);
      localStorage.setItem('demo_fixed', JSON.stringify(filtered));
      return;
    }
    if (isUuid(id)) {
      await db
        .from('fixed_expenses')
        .delete()
        .eq('id', id);
    }
    if (userId && Array.isArray(namesToDelete) && namesToDelete.length > 0) {
      const validNames = Array.from(new Set(namesToDelete.filter(Boolean)));
      if (validNames.length > 0) {
        await db
          .from('fixed_expenses')
          .delete()
          .eq('user_id', userId)
          .in('name', validNames);
      }
    }
  },

  // --- Accounts ---
  async getAccounts(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_accounts');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await db
      .from('accounts')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      name: a.name,
      initialBalance: Number(a.initial_balance),
      currentBalance: Number(a.current_balance),
      currency: a.currency
    }));
  },

  async saveAccount(userId: string, account: import('../types').Account) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_accounts');
      const list: Account[] = saved ? JSON.parse(saved) : [];
      const targetId = account.id && account.id.startsWith('demo-') ? account.id : `demo-acc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const updatedAccount = { ...account, id: targetId };
      const index = list.findIndex(a => a.id === account.id);
      if (index !== -1) {
        list[index] = updatedAccount;
      } else {
        list.push(updatedAccount);
      }
      localStorage.setItem('demo_accounts', JSON.stringify(list));
      return;
    }
    const { error } = await db
      .from('accounts')
      .upsert({
        id: account.id.includes('-') ? account.id : undefined,
        user_id: userId,
        name: account.name,
        initial_balance: account.initialBalance,
        current_balance: account.currentBalance,
        currency: account.currency || 'kr',
      });
    
    if (error) throw error;
  },

  async deleteAccount(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_accounts');
      const list: Account[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(a => a.id !== id);
      localStorage.setItem('demo_accounts', JSON.stringify(filtered));
      return;
    }
    const { error } = await db
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // --- Feedback ---
  async saveFeedback(userId: string, message: string) {
    const activeUserId = userId || 'demo-user';
    try {
      if (activeUserId === 'demo-user' || activeUserId.startsWith('demo-')) {
        const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
        demoFeedbacks.unshift({
          id: 'demo-' + Date.now(),
          user_id: activeUserId,
          message,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
        return;
      }
      const { error } = await db
        .from('feedback')
        .insert({
          user_id: activeUserId,
          message: message,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.warn('Supabase feedback insert error, saving to local store:', error);
        const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
        demoFeedbacks.unshift({
          id: 'local-' + Date.now(),
          user_id: activeUserId,
          message,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
      }
    } catch (e) {
      console.warn('Feedback fallback to local storage:', e);
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
      demoFeedbacks.unshift({
        id: 'local-' + Date.now(),
        user_id: activeUserId,
        message,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
    }
  },

  async getFeedbackList(): Promise<Array<{ id: string; user_id?: string; message: string; created_at: string }>> {
    try {
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]');
      const { data, error } = await db
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.warn('Could not fetch remote feedback:', error);
        return demoFeedbacks;
      }
      return [...(data || []), ...demoFeedbacks];
    } catch {
      return JSON.parse(localStorage.getItem('demo_feedback') || '[]');
    }
  },

  async deleteFeedback(id: string) {
    if (id.startsWith('demo-')) {
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]').filter((f: { id?: string }) => f.id !== id);
      localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
      return;
    }
    await db.from('feedback').delete().eq('id', id);
  },

  async getAdminStats(): Promise<{ totalUsers: number; dbHealthy: boolean; timestamp: string }> {
    try {
      const { count, error } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      return {
        totalUsers: error ? 1 : (count || 1),
        dbHealthy: !error,
        timestamp: new Date().toISOString()
      };
    } catch {
      return {
        totalUsers: 1,
        dbHealthy: false,
        timestamp: new Date().toISOString()
      };
    }
  },

  async resetSavingsPot(userId: string) {    if (userId === 'demo-user') {
      const savedT = localStorage.getItem('demo_transactions');
      const listT: Transaction[] = savedT ? JSON.parse(savedT) : [];
      const filteredT = listT.filter(t => !['Spargris', 'Budgetökning'].includes(t.category));
      localStorage.setItem('demo_transactions', JSON.stringify(filteredT));

      const savedS = localStorage.getItem('demo_settings');
      if (savedS) {
        const config = JSON.parse(savedS);
        config.savingsPot = 0;
        localStorage.setItem('demo_settings', JSON.stringify(config));
      }
      return;
    }
    // 1. Delete all transactions with category 'Spargris' or 'Budgetökning'
    const { error: deleteError } = await db
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('category', ['Spargris', 'Budgetökning']);
    
    if (deleteError) throw deleteError;

    // 2. Reset savings_pot in profile
    const { error: profileError } = await db
      .from('profiles')
      .update({ savings_pot: 0 })
      .eq('id', userId);
    
    if (profileError) throw profileError;
  },

  distributeSavingsPot(totalPot: number, goals: SavingsGoal[]): SavingsGoal[] {
    if (!goals || goals.length === 0) return [];
    
    let remaining = totalPot;
    
    return (goals || []).map(goal => {
      if (!goal) return goal;
      if (goal.isCompleted) return goal; // Skip completed goals
      
      const target = Number(goal.targetAmount) || 0;
      const allocated = Math.min(remaining, target);
      remaining = Math.max(0, remaining - allocated);
      
      return {
        ...goal,
        currentAmount: allocated
      };
    });
  },

  async renameCategory(userId: string, type: 'income' | 'expense', oldName: string, newName: string): Promise<void> {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedOld || !trimmedNew || trimmedOld.toLowerCase() === trimmedNew.toLowerCase()) return;

    if (userId.startsWith('demo-')) {
      // 1. Transactions in localStorage
      const savedTx = localStorage.getItem('demo_transactions');
      if (savedTx) {
        try {
          const txList: Transaction[] = JSON.parse(savedTx);
          let txChanged = false;
          const updatedList = txList.map((t) => {
            let changed = false;
            let newCat = t.category;
            let newSplits = t.splits;

            const isMatchingType = type === 'income' ? t.type === 'income' : t.type !== 'income';
            if (isMatchingType && (t.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
              newCat = trimmedNew;
              changed = true;
            }

            if (t.splits && Array.isArray(t.splits)) {
              const nextSplits = t.splits.map((s) => {
                if ((s.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
                  changed = true;
                  return { ...s, category: trimmedNew };
                }
                return s;
              });
              if (changed) {
                newSplits = nextSplits;
              }
            }

            if (changed) {
              txChanged = true;
              return { ...t, category: newCat, splits: newSplits };
            }
            return t;
          });
          if (txChanged) {
            localStorage.setItem('demo_transactions', JSON.stringify(updatedList));
          }
        } catch (e) {
          console.error('Error updating demo_transactions:', e);
        }
      }

      // 2. Fixed expenses in localStorage
      if (type === 'expense') {
        const savedFixed = localStorage.getItem('demo_fixed');
        if (savedFixed) {
          try {
            const fixedList: FixedExpense[] = JSON.parse(savedFixed);
            const updated = fixedList.map((e) =>
              (e.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()
                ? { ...e, category: trimmedNew }
                : e
            );
            localStorage.setItem('demo_fixed', JSON.stringify(updated));
          } catch (e) {
            console.error('Error updating demo_fixed:', e);
          }
        }
      }

      // 3. Incomes in localStorage
      if (type === 'income') {
        const savedIncomes = localStorage.getItem('demo_incomes');
        if (savedIncomes) {
          try {
            const incList: Income[] = JSON.parse(savedIncomes);
            const updated = incList.map((i) =>
              (i.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()
                ? { ...i, category: trimmedNew }
                : i
            );
            localStorage.setItem('demo_incomes', JSON.stringify(updated));
          } catch (e) {
            console.error('Error updating demo_incomes:', e);
          }
        }
      }

      // 4. Quick choices in demo_settings
      const savedSettings = localStorage.getItem('demo_settings');
      if (savedSettings) {
        try {
          const cfg = JSON.parse(savedSettings);
          if (cfg.quickChoices) {
            cfg.quickChoices = cfg.quickChoices.map((qc: { category?: string }) =>
              (qc.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()
                ? { ...qc, category: trimmedNew }
                : qc
            );
            localStorage.setItem('demo_settings', JSON.stringify(cfg));
          }
        } catch (e) {
          console.error('Error updating demo_settings quickChoices:', e);
        }
      }

      return;
    }

    // Real Supabase persistence
    try {
      const txTypeFilter = type === 'income' ? 'income' : 'expense';

      // 1. Update transactions with matching category
      await db
        .from('transactions')
        .update({ category: trimmedNew })
        .eq('user_id', userId)
        .eq('type', txTypeFilter)
        .ilike('category', trimmedOld);

      // 2. Update splits inside transactions if present
      const { data: splitRows } = await db
        .from('transactions')
        .select('id, splits')
        .eq('user_id', userId)
        .not('splits', 'is', null);

      if (splitRows && splitRows.length > 0) {
        for (const row of splitRows) {
          if (Array.isArray(row.splits)) {
            let splitChanged = false;
            const updatedSplits = row.splits.map((s: { category?: string }) => {
              if ((s.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
                splitChanged = true;
                return { ...s, category: trimmedNew };
              }
              return s;
            });
            if (splitChanged) {
              await db
                .from('transactions')
                .update({ splits: updatedSplits })
                .eq('id', row.id);
            }
          }
        }
      }

      // 3. Fixed expenses
      if (type === 'expense') {
        await db
          .from('fixed_expenses')
          .update({ category: trimmedNew })
          .eq('user_id', userId)
          .ilike('category', trimmedOld);
      }

      // 4. Income sources
      if (type === 'income') {
        await db
          .from('income_sources')
          .update({ category: trimmedNew })
          .eq('user_id', userId)
          .ilike('category', trimmedOld);
      }
    } catch (err) {
      console.error('Error renaming category in Supabase:', err);
      throw err;
    }
  },

  async deleteAllUserData(userId: string, includeProfile = false) {
    if (!userId || userId === 'demo-user' || userId === 'preview-user') {
      if (includeProfile) {
        localStorage.clear();
      }
      return;
    }

    // Wave 1: Clear nullable foreign-key references in parallel
    await Promise.allSettled([
      db
        .from('transactions')
        .update({
          refund_of_transaction_id: null,
          bank_transaction_id: null,
          bank_account_id: null,
          linked_fixed_expense_id: null,
          account_id: null,
        })
        .eq('user_id', userId),
      db
        .from('bank_transactions')
        .update({
          linked_transfer_bank_tx_id: null,
          replaced_by_bank_tx_id: null,
        })
        .eq('user_id', userId),
    ]);

    // Wave 2: Delete leaf tables in parallel (ett anrop per tabell så att varje anrop typkontrolleras)
    await Promise.allSettled([
      db.from('transactions').delete().eq('user_id', userId),
      db.from('bank_transactions').delete().eq('user_id', userId),
      db.from('bank_auth_states').delete().eq('user_id', userId),
      db.from('bank_provider_sessions').delete().eq('user_id', userId),
      db.from('fixed_expenses').delete().eq('user_id', userId),
      db.from('income_sources').delete().eq('user_id', userId),
      db.from('savings_goals').delete().eq('user_id', userId),
      db.from('feedback').delete().eq('user_id', userId),
    ]);

    // Wave 3: Delete parent account tables and clear profile preferences in parallel
    await Promise.allSettled([
      db.from('bank_accounts').delete().eq('user_id', userId),
      db.from('accounts').delete().eq('user_id', userId),
      db
        .from('profiles')
        .update({
          user_preferences: {},
          show_accounts_on_home: false,
          exclude_internal_transfers: true,
          categories: null,
          income_categories: null,
          my_swish_phone: null,
          swish_contacts: null,
        })
        .eq('id', userId),
    ]);

    await db.from('bank_connections').delete().eq('user_id', userId);

    if (includeProfile) {
      await db.from('profiles').delete().eq('id', userId);
    }
  }
};
