// Inställningar och profil: läser och sparar användarens inställningar (profiles-tabellen eller demoläget).
import { supabase } from '../../supabaseClient';
import {
  Category,
  Config,
  HomeWidgetConfig,
  MonthlySaving,
  PaydayType,
  QuickChoice,
  SavingsGoal,
} from '../../types';
import type { Database } from '../../types/database';
import { seedDemoData } from '../../utils/demoData';
import { fromJson, toJson } from '../budgetRows';

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

/**
 * Inställningarna som de läses från profiles-tabellen. Kolumnerna kan vara null i databasen,
 * så de fälten är typade som de faktiskt kommer tillbaka (inte som en färdig Config).
 */
export type StoredSettings = Omit<
  Config,
  | 'currency'
  | 'language'
  | 'payday'
  | 'paydayBeforeWeekend'
  | 'categories'
  | 'incomeCategories'
  | 'initialSpent'
  | 'securityLock'
  | 'includeFixedExpensesInAnalysis'
  | 'hideEmptyCategories'
> & {
  currency: string | null;
  language: string | null;
  payday: number | null;
  paydayBeforeWeekend: boolean | null;
  categories: Category[] | null | undefined;
  incomeCategories: Category[] | undefined;
  initialSpent: number | null;
  securityLock: boolean | null;
  includeFixedExpensesInAnalysis: boolean | null;
  hideEmptyCategories?: boolean | null;
};

export const settingsData = {
  // --- User Settings ---
  async getSettings(userId: string): Promise<StoredSettings | null> {    // Get settings from profiles table
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
          ? localSavedConfig?.categories
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
};
