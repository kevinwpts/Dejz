import { supabase } from '../supabaseClient';
import { Config, Income, FixedExpense, Transaction } from '../types';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { seedDemoData } from '../utils/demoData';

function extractMissingColumn(error: any): string | null {
  if (!error) return null;
  const msg = error.message || '';
  // PostgREST schema cache: Could not find the 'column_name' column of 'table_name' in the schema cache
  const postgrestMatch = msg.match(/Could not find the ['"]([^'"]+)['"] column/i);
  if (postgrestMatch && postgrestMatch[1]) return postgrestMatch[1];

  // Postgres 42703: column "column_name" of relation "table_name" does not exist
  const postgresMatch = msg.match(/column ['"]([^'"]+)['"]/i);
  if (postgresMatch && postgresMatch[1]) return postgresMatch[1];

  return null;
}

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
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (profileError) {
      console.error('[Supabase Error] getSettings:', profileError);
      throw profileError;
    }
    
    if (!profileData) return null;
    
    let localSavedConfig: any = null;
    try {
      const cached = localStorage.getItem(`user_settings_${userId}`);
      if (cached) localSavedConfig = JSON.parse(cached);
    } catch {
      // Ignore localStorage read errors
    }

    return {
      currency: profileData.currency,
      language: profileData.language,
      payday: profileData.payday,
      paydayType: profileData.payday_type,
      paydayBeforeWeekend: profileData.payday_before_weekend,
      categories: profileData.categories,
      incomeCategories: profileData.income_categories,
      paymentMethods: profileData.payment_methods || ['Kortbetalning', 'Swish', 'Autogiro', 'Apple', 'Klarna', 'PayPal', 'Faktura', 'Banköverföring', 'Kontanter', 'Övrigt'],
      initialSpent: profileData.initial_spent,
      notifications: profileData.notifications,
      securityLock: profileData.security_lock,
      darkMode: (profileData.dark_mode !== undefined && profileData.dark_mode !== null) ? profileData.dark_mode : true,
      themeMode: profileData.theme_mode || localSavedConfig?.themeMode || 'system',
      themeColor: profileData.theme_color || localSavedConfig?.themeColor || '#3B82F6',
      quickChoices: profileData.quick_choices || [],
      savingsGoals: (profileData.savings_goals && Array.isArray(profileData.savings_goals) && profileData.savings_goals.length > 0)
        ? profileData.savings_goals
        : (localSavedConfig?.savingsGoals || []),
      totalSavedLifetime: profileData.total_saved_lifetime || 0,
      surplusIncome: profileData.surplus_income || 0,
      monthlySavings: profileData.monthly_savings || localSavedConfig?.monthlySavings || 0,
      monthlySavingsItems: (profileData.monthly_savings_items && Array.isArray(profileData.monthly_savings_items) && profileData.monthly_savings_items.length > 0)
        ? profileData.monthly_savings_items
        : (localSavedConfig?.monthlySavingsItems || []),
      appIconTheme: profileData.app_icon_theme,
      includeFixedExpensesInAnalysis: profileData.include_fixed_expenses_in_analysis !== undefined 
        ? profileData.include_fixed_expenses_in_analysis 
        : (localSavedConfig?.includeFixedExpensesInAnalysis !== undefined ? localSavedConfig.includeFixedExpensesInAnalysis : true),
      showFixedExpensesInTodayView: profileData.show_fixed_expenses_in_today_view !== undefined 
        ? profileData.show_fixed_expenses_in_today_view 
        : (localSavedConfig?.showFixedExpensesInTodayView !== undefined ? localSavedConfig.showFixedExpensesInTodayView : true),
      showFixedExpensesInCalendar: profileData.show_fixed_expenses_in_calendar !== undefined 
        ? profileData.show_fixed_expenses_in_calendar 
        : (localSavedConfig?.showFixedExpensesInCalendar !== undefined 
            ? localSavedConfig.showFixedExpensesInCalendar 
            : (profileData.show_fixed_expenses_in_today_view !== undefined ? profileData.show_fixed_expenses_in_today_view : false)),
      showFixedExpensesInHistory: profileData.show_fixed_expenses_in_history !== undefined
        ? profileData.show_fixed_expenses_in_history
        : (localSavedConfig?.showFixedExpensesInHistory !== undefined ? localSavedConfig.showFixedExpensesInHistory : false),
      homeWidgets: profileData.home_widgets || localSavedConfig?.homeWidgets || undefined,
      hideEmptyCategories: profileData.hide_empty_categories !== undefined
        ? profileData.hide_empty_categories
        : (localSavedConfig?.hideEmptyCategories !== undefined ? localSavedConfig.hideEmptyCategories : false),
      hasSavedInitialBudget: profileData.has_saved_initial_budget !== undefined && profileData.has_saved_initial_budget !== null
        ? Boolean(profileData.has_saved_initial_budget)
        : (localSavedConfig?.hasSavedInitialBudget !== undefined 
            ? Boolean(localSavedConfig.hasSavedInitialBudget) 
            : (Array.isArray(profileData.categories) && profileData.categories.some((c: any) => typeof c.budget === 'number' && c.budget > 0)
                ? true
                : (typeof window !== 'undefined' && localStorage.getItem('dejz_has_saved_initial_budget') === 'true'))),
    };
  },

  async getProfile(userId: string) {
    if (userId === 'demo-user') {
      const savedProfile = localStorage.getItem('demo_profile');
      const profile = savedProfile ? JSON.parse(savedProfile) : { email: 'demo@dejz.se' };
      const savedSettings = localStorage.getItem('demo_settings');
      let settings: any = null;
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
    const { data: profileData, error: profileError } = await supabase
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

  async updateProfile(userId: string, updates: any) {
    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_profile');
      const profile = saved ? JSON.parse(saved) : {};
      const updatedProfile = { ...profile, ...updates };
      localStorage.setItem('demo_profile', JSON.stringify(updatedProfile));
      return;
    }
    const { error } = await supabase
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

    try {
      localStorage.setItem(`user_settings_${userId}`, JSON.stringify(config));
    } catch {
      // Ignore localStorage write errors
    }

    const payload: any = {
      id: userId,
      currency: config.currency,
      language: config.language,
      payday: config.payday,
      payday_type: config.paydayType,
      payday_before_weekend: config.paydayBeforeWeekend,
      categories: config.categories,
      income_categories: config.incomeCategories,
      payment_methods: config.paymentMethods,
      initial_spent: config.initialSpent,
      notifications: config.notifications,
      security_lock: config.securityLock,
      dark_mode: config.darkMode,
      theme_mode: config.themeMode || 'system',
      theme_color: config.themeColor || '#3B82F6',
      quick_choices: config.quickChoices,
      savings_pot: config.savingsPot,
      savings_goals: config.savingsGoals,
      total_saved_lifetime: config.totalSavedLifetime,
      surplus_income: config.surplusIncome,
      monthly_savings: config.monthlySavings !== undefined ? config.monthlySavings : (config.monthlySavingsItems?.reduce((sum, s) => sum + (Number(s.amount) || 0), 0) || 0),
      monthly_savings_items: config.monthlySavingsItems || [],
      app_icon_theme: config.appIconTheme,
      include_fixed_expenses_in_analysis: config.includeFixedExpensesInAnalysis,
      show_fixed_expenses_in_today_view: config.showFixedExpensesInTodayView,
      show_fixed_expenses_in_calendar: config.showFixedExpensesInCalendar,
      show_fixed_expenses_in_history: config.showFixedExpensesInHistory,
      home_widgets: config.homeWidgets,
      hide_empty_categories: config.hideEmptyCategories,
      has_saved_initial_budget: config.hasSavedInitialBudget,
      updated_at: new Date().toISOString()
    };

    let { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);
    
    // Robust fallback if user's Supabase profiles table is missing newly added columns
    let attempts = 0;
    while (error && attempts < 35) {
      attempts++;
      const missingCol = extractMissingColumn(error);
      if (missingCol && missingCol in payload) {
        console.warn(`[Supabase saveSettings] Column "${missingCol}" missing. Stripping and retrying UPDATE (${attempts}/35)...`);
        delete payload[missingCol];
        const retryResult = await supabase.from('profiles').update(payload).eq('id', userId);
        error = retryResult.error;
      } else {
        break;
      }
    }

    // Fallback to UPSERT if UPDATE fails due to row missing or other issues
    if (error) {
      console.warn("[Supabase saveSettings] UPDATE failed, falling back to UPSERT...", error);
      let upsertError = null;
      const upsertResult = await supabase.from('profiles').upsert(payload);
      upsertError = upsertResult.error;
      
      let upsertAttempts = 0;
      while (upsertError && upsertAttempts < 35) {
        upsertAttempts++;
        const missingCol = extractMissingColumn(upsertError);
        if (missingCol && missingCol in payload) {
          console.warn(`[Supabase saveSettings] Column "${missingCol}" missing. Stripping and retrying UPSERT (${upsertAttempts}/35)...`);
          delete payload[missingCol];
          const retryResult = await supabase.from('profiles').upsert(payload);
          upsertError = retryResult.error;
        } else {
          break;
        }
      }
      error = upsertError;
    }

    if (error) {
      console.error("Error saving settings to Supabase profiles:", error);
      throw error;
    }
  },

  // --- Transactions (Expenses/Incomes) ---
  async getTransactions(userId: string): Promise<Transaction[]> {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_transactions');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(t => ({
      id: t.id,
      amount: Number(t.amount),
      category: t.category,
      note: t.note,
      merchant: t.merchant,
      timestamp: Number(t.timestamp),
      type: t.type,
      isBackdated: t.is_backdated,
      logo: t.logo,
      icon: t.icon || (t.logo && (isEmojiString(t.logo) || ICON_MAP[t.logo]) ? t.logo : undefined),
      paymentMethod: t.payment_method,
      receiptUrl: t.receipt_url,
      tags: t.tags || [],
      splits: t.splits || []
    }));
  },

  async addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_transactions');
      const list = saved ? JSON.parse(saved) : [];
      const newTx: Transaction = {
        ...transaction,
        id: `demo-tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      };
      list.unshift(newTx);
      localStorage.setItem('demo_transactions', JSON.stringify(list));
      return newTx;
    }
    // First, ensure the profile exists to avoid foreign key violations
    const { data: profile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
    
    if (!profile) {
      console.warn('[Data] Profile missing during transaction add, attempting repair...');
      // Minimal profile insert with default dark mode
      await supabase.from('profiles').upsert({ id: userId, dark_mode: true });
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        merchant: transaction.merchant,
        timestamp: transaction.timestamp,
        type: transaction.type,
        is_backdated: transaction.isBackdated,
        logo: transaction.logo,
        icon: transaction.icon,
        payment_method: transaction.paymentMethod,
        receipt_url: transaction.receiptUrl,
        tags: transaction.tags,
        splits: transaction.splits
      })
      .select();
    
    if (error) {
      console.error('[Supabase Error] addTransaction:', error);
      throw error;
    }
    if (!data || data.length === 0) throw new Error('Ingen data returnerades från databasen');
    
    const row = data[0];
    return {
      id: row.id,
      amount: Number(row.amount),
      category: row.category,
      note: row.note,
      merchant: row.merchant,
      timestamp: Number(row.timestamp),
      type: row.type,
      isBackdated: row.is_backdated,
      logo: row.logo,
      icon: row.icon || (row.logo && (isEmojiString(row.logo) || ICON_MAP[row.logo]) ? row.logo : undefined),
      paymentMethod: row.payment_method,
      receiptUrl: row.receipt_url,
      tags: row.tags || [],
      splits: row.splits || []
    };
  },

  async updateTransaction(id: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction> {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_transactions');
      const list: Transaction[] = saved ? JSON.parse(saved) : [];
      const index = list.findIndex(t => t.id === id);
      const updatedTx: Transaction = { ...transaction, id };
      if (index !== -1) {
        list[index] = updatedTx;
      } else {
        list.unshift(updatedTx);
      }
      localStorage.setItem('demo_transactions', JSON.stringify(list));
      return updatedTx;
    }
    const { data, error } = await supabase
      .from('transactions')
      .update({
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        merchant: transaction.merchant,
        timestamp: transaction.timestamp,
        type: transaction.type,
        is_backdated: transaction.isBackdated,
        logo: transaction.logo,
        icon: transaction.icon,
        payment_method: transaction.paymentMethod,
        receipt_url: transaction.receiptUrl,
        tags: transaction.tags,
        splits: transaction.splits
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Kunde inte uppdatera transaktionen');
    
    const row = data[0];
    return {
      id: row.id,
      amount: Number(row.amount),
      category: row.category,
      note: row.note,
      merchant: row.merchant,
      timestamp: Number(row.timestamp),
      type: row.type,
      isBackdated: row.is_backdated,
      logo: row.logo,
      icon: row.icon || (row.logo && (isEmojiString(row.logo) || ICON_MAP[row.logo]) ? row.logo : undefined),
      paymentMethod: row.payment_method,
      receiptUrl: row.receipt_url,
      tags: row.tags || [],
      splits: row.splits || []
    };
  },

  async deleteTransaction(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_transactions');
      const list: Transaction[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(t => t.id !== id);
      localStorage.setItem('demo_transactions', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
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
    const { data, error } = await supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map(i => ({
      id: i.id,
      name: i.name,
      amount: Number(i.amount),
      category: i.category,
      icon: i.icon,
      logo: i.logo,
      deductionDay: i.deduction_day,
      isVariable: i.is_variable,
      periodOverrides: i.period_overrides || {},
      note: i.note || undefined
    }));
  },

  async saveIncomeSource(userId: string, income: Income) {    if (userId === 'demo-user') {
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
    const payload: any = {
      id: income.id.includes('-') ? income.id : undefined,
      user_id: userId,
      name: income.name,
      amount: income.amount,
      category: income.category,
      icon: income.icon,
      logo: income.logo,
      deduction_day: income.deductionDay,
      is_variable: income.isVariable,
      period_overrides: income.periodOverrides || {},
      note: income.note && income.note.trim() ? income.note.trim() : null
    };

    const currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const { error } = await supabase
        .from('income_sources')
        .upsert(currentPayload);
      
      if (!error) return;

      const missingCol = extractMissingColumn(error) || (error.message?.includes('note') ? 'note' : null);
      if (missingCol && missingCol in currentPayload) {
        console.warn(`[Supabase income_sources] Column "${missingCol}" missing in schema. Stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
      throw error;
    }
  },

  async deleteIncomeSource(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_incomes');
      const list: Income[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(i => i.id !== id);
      localStorage.setItem('demo_incomes', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // --- Fixed Expenses ---
  async getFixedExpenses(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_fixed');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      name: e.name,
      amount: Number(e.amount),
      paymentMethod: e.payment_method,
      frequency: e.frequency,
      icon: e.icon,
      category: e.category,
      logo: e.logo,
      deductionDay: e.deduction_day,
      startMonth: e.start_month !== undefined && e.start_month !== null 
        ? e.start_month 
        : (e.period_overrides?._start_month !== undefined && e.period_overrides?._start_month !== null ? Number(e.period_overrides._start_month) : undefined),
      isVariable: e.is_variable,
      periodOverrides: e.period_overrides || {},
      note: e.note || undefined,
      isCancelled: e.is_cancelled || false,
      cancellationDate: e.cancellation_date || undefined,
      cancelledAt: e.cancelled_at || undefined
    }));
  },

  async saveFixedExpense(userId: string, expense: FixedExpense) {
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

    const periodOverrides = {
      ...(expense.periodOverrides || {}),
      ...(expense.startMonth !== undefined && expense.startMonth !== null ? { _start_month: expense.startMonth } : {})
    };

    const payload: any = {
      id: expense.id,
      user_id: userId,
      name: expense.name,
      amount: expense.amount,
      payment_method: expense.paymentMethod,
      frequency: expense.frequency,
      icon: expense.icon,
      category: expense.category,
      logo: expense.logo,
      deduction_day: expense.deductionDay,
      start_month: expense.startMonth !== undefined ? expense.startMonth : null,
      is_variable: expense.isVariable,
      period_overrides: periodOverrides,
      note: expense.note && expense.note.trim() ? expense.note.trim() : null,
      is_cancelled: expense.isCancelled || false,
      cancellation_date: expense.cancellationDate || null,
      cancelled_at: expense.cancelledAt || null
    };

    const currentPayload = { ...payload };
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const { error } = await supabase
        .from('fixed_expenses')
        .upsert(currentPayload);
      
      if (!error) return;

      const missingCol = extractMissingColumn(error);
      if (missingCol && missingCol in currentPayload) {
        console.warn(`[Supabase fixed_expenses] Column "${missingCol}" missing in schema. Stripping and retrying...`);
        delete currentPayload[missingCol];
        continue;
      }
      throw error;
    }
  },

  async deleteFixedExpense(id: string) {    if (id.startsWith('demo-')) {
      const saved = localStorage.getItem('demo_fixed');
      const list: FixedExpense[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(e => e.id !== id);
      localStorage.setItem('demo_fixed', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
      .from('fixed_expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // --- Accounts ---
  async getAccounts(userId: string) {    if (userId === 'demo-user') {
      const saved = localStorage.getItem('demo_accounts');
      return saved ? JSON.parse(saved) : [];
    }
    const { data, error } = await supabase
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
      const list: any[] = saved ? JSON.parse(saved) : [];
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
    const { error } = await supabase
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
      const list: any[] = saved ? JSON.parse(saved) : [];
      const filtered = list.filter(a => a.id !== id);
      localStorage.setItem('demo_accounts', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
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
      const { error } = await supabase
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
      const { data, error } = await supabase
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
      const demoFeedbacks = JSON.parse(localStorage.getItem('demo_feedback') || '[]').filter((f: any) => f.id !== id);
      localStorage.setItem('demo_feedback', JSON.stringify(demoFeedbacks));
      return;
    }
    await supabase.from('feedback').delete().eq('id', id);
  },

  async getAdminStats(): Promise<{ totalUsers: number; dbHealthy: boolean; timestamp: string }> {
    try {
      const { count, error } = await supabase
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
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)
      .in('category', ['Spargris', 'Budgetökning']);
    
    if (deleteError) throw deleteError;

    // 2. Reset savings_pot in profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ savings_pot: 0 })
      .eq('id', userId);
    
    if (profileError) throw profileError;
  },

  distributeSavingsPot(totalPot: number, goals: any[]): any[] {
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
              const nextSplits = t.splits.map((s: any) => {
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
            cfg.quickChoices = cfg.quickChoices.map((qc: any) =>
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
      await supabase
        .from('transactions')
        .update({ category: trimmedNew })
        .eq('user_id', userId)
        .eq('type', txTypeFilter)
        .ilike('category', trimmedOld);

      // 2. Update splits inside transactions if present
      const { data: splitRows } = await supabase
        .from('transactions')
        .select('id, splits')
        .eq('user_id', userId)
        .not('splits', 'is', null);

      if (splitRows && splitRows.length > 0) {
        for (const row of splitRows) {
          if (Array.isArray(row.splits)) {
            let splitChanged = false;
            const updatedSplits = row.splits.map((s: any) => {
              if ((s.category || '').trim().toLowerCase() === trimmedOld.toLowerCase()) {
                splitChanged = true;
                return { ...s, category: trimmedNew };
              }
              return s;
            });
            if (splitChanged) {
              await supabase
                .from('transactions')
                .update({ splits: updatedSplits })
                .eq('id', row.id);
            }
          }
        }
      }

      // 3. Fixed expenses
      if (type === 'expense') {
        await supabase
          .from('fixed_expenses')
          .update({ category: trimmedNew })
          .eq('user_id', userId)
          .ilike('category', trimmedOld);
      }

      // 4. Income sources
      if (type === 'income') {
        await supabase
          .from('income_sources')
          .update({ category: trimmedNew })
          .eq('user_id', userId)
          .ilike('category', trimmedOld);
      }
    } catch (err) {
      console.error('Error renaming category in Supabase:', err);
      throw err;
    }
  }
};
