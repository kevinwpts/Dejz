import { supabase } from '../supabaseClient';
import { Config, Income, FixedExpense, Transaction } from '../types';
import { ICON_MAP, isEmojiString } from '../utils/icons';
import { seedDemoData } from '../utils/demoData';

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
      paymentMethods: profileData.payment_methods || ['Autogiro', 'Faktura', 'Kortbetalning', 'Swish', 'Övrigt'],
      initialSpent: profileData.initial_spent,
      notifications: profileData.notifications,
      securityLock: profileData.security_lock,
      darkMode: (profileData.dark_mode !== undefined && profileData.dark_mode !== null) ? profileData.dark_mode : true,
      themeMode: profileData.theme_mode || 'system',
      quickChoices: profileData.quick_choices || [],
      savingsPot: profileData.savings_pot || 0,
      savingsGoals: profileData.savings_goals || [],
      totalSavedLifetime: profileData.total_saved_lifetime || 0,
      surplusIncome: profileData.surplus_income || 0,
      monthlySavings: profileData.monthly_savings || 0,
      monthlySavingsItems: profileData.monthly_savings_items || [],
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
      homeWidgets: profileData.home_widgets || localSavedConfig?.homeWidgets || undefined,
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
      quick_choices: config.quickChoices,
      savings_pot: config.savingsPot,
      savings_goals: config.savingsGoals,
      total_saved_lifetime: config.totalSavedLifetime,
      surplus_income: config.surplusIncome,
      monthly_savings: config.monthlySavings,
      monthly_savings_items: config.monthlySavingsItems || [],
      app_icon_theme: config.appIconTheme,
      include_fixed_expenses_in_analysis: config.includeFixedExpensesInAnalysis,
      show_fixed_expenses_in_today_view: config.showFixedExpensesInTodayView,
      show_fixed_expenses_in_calendar: config.showFixedExpensesInCalendar,
      home_widgets: config.homeWidgets,
      updated_at: new Date().toISOString()
    };

    let { error } = await supabase
      .from('profiles')
      .upsert(payload);
    
    // Robust fallback if user's Supabase profiles table is missing newly added columns
    let attempts = 0;
    while (error && (error as any).code === '42703' && attempts < 5) {
      attempts++;
      const match = error.message?.match(/column "([^"]+)"/);
      if (match && match[1] && match[1] in payload) {
        delete payload[match[1]];
        const retryResult = await supabase.from('profiles').upsert(payload);
        error = retryResult.error;
      } else {
        break;
      }
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
    const { error } = await supabase
      .from('income_sources')
      .upsert(payload);
    
    if (error) {
      if (error.code === '42703' || error.message?.includes('note')) {
        delete payload.note;
        const retry = await supabase.from('income_sources').upsert(payload);
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
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
      isVariable: e.is_variable,
      periodOverrides: e.period_overrides || {},
      note: e.note || undefined
    }));
  },

  async saveFixedExpense(userId: string, expense: FixedExpense) {    if (userId === 'demo-user') {
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
      is_variable: expense.isVariable,
      period_overrides: expense.periodOverrides || {},
      note: expense.note && expense.note.trim() ? expense.note.trim() : null
    };
    const { error } = await supabase
      .from('fixed_expenses')
      .upsert(payload);
    
    if (error) {
      if (error.code === '42703' || error.message?.includes('note')) {
        delete payload.note;
        const retry = await supabase.from('fixed_expenses').upsert(payload);
        if (retry.error) throw retry.error;
      } else {
        throw error;
      }
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
  async saveFeedback(userId: string, message: string) {    if (userId === 'demo-user') {
      console.log('Feedback saved in demo:', message);
      return;
    }
    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        message: message,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
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
  }
};
