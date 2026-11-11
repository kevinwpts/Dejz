/** Samlar alla lokala inställningar och synkar dem med ditt konto i Supabase. */
import { FixedExpenseItem, IncomeItem } from '../../components/HomeTab';
import { Category } from '../../types';
import { type Database, type Json } from '../../types/database';
import { isLocalDemoMode, supabase } from '../../supabaseClient';
import { DELETED_FIXED_IDS_KEY, DELETED_INCOME_IDS_KEY, DISMISSED_FIXED_KEY, DISMISSED_INCOME_KEY, MANUAL_FIXED_OVERRIDES_KEY, MANUAL_INCOME_OVERRIDES_KEY, MERCHANT_ALIASES_KEY, ManualFixedOverride, ManualIncomeOverride, getDeletedFixedIds, getDeletedIncomeIds, getDismissedFixedMerchants, getDismissedIncomeMerchants, getManualFixedOverrides, getManualIncomeOverrides, getMerchantAliases } from './merchants';
import { CATEGORY_REMAP_KEY, CUSTOM_EXPENSE_CATEGORIES_KEY, CUSTOM_INCOME_CATEGORIES_KEY, CUSTOM_PAYMENT_METHODS_KEY, EXCLUDED_TX_IDS_KEY, EXCLUDE_INTERNAL_TRANSFERS_KEY, PaymentMethodItem, getCategoryRemap, getExcludeInternalTransfers, getExcludedTransactionIds, getShowAccountsOnHome, getStoredExpenseCategories, getStoredIncomeCategories, getStoredPaymentMethods } from './categories';
import { ACCOUNT_META_KEY, AccountMetaPatch, CATEGORY_BUDGETS_KEY, REVIEWED_TX_IDS_KEY, SAVINGS_GOALS_KEY, SavingsGoalItem, TRANSACTION_META_KEY, TransactionMetaPatch, getAccountMetaMap, getCategoryBudgets, getLightweightTransactionMetaMapForSync, getReviewedTransactionIds, getSavingsGoals } from './itemMeta';
import { INCOME_FIRST_SEEN_KEY, MANUAL_BALANCE_KEY, ManualBalance, getManualBalance, safeJson } from './manualBalance';
import { SHOW_ACCOUNTS_ON_HOME_KEY, loadCachedAppState } from './appState';

// --- Full Supabase Sync & Hydration for All User Choices ---
// Alla användarval som sparas i profiles.user_preferences.
export interface UserPreferences {
  showAccountsOnHome: boolean;
  excludeInternalTransfers: boolean;
  excludedTransactionIds: string[];
  dismissedFixedMerchants: string[];
  dismissedIncomeMerchants: string[];
  deletedFixedIds: string[];
  deletedIncomeIds: string[];
  savedFixedExpenses: FixedExpenseItem[];
  savedIncomes: IncomeItem[];
  manualFixedOverrides: Record<string, ManualFixedOverride>;
  manualIncomeOverrides: Record<string, ManualIncomeOverride>;
  merchantAliasesV3: Record<string, { name: string; category: string }>;
  categoryRemap: Record<string, string>;
  customExpenseCategories: Category[];
  customIncomeCategories: Category[];
  customPaymentMethods: PaymentMethodItem[];
  transactionMeta: Record<string, TransactionMetaPatch>;
  accountMeta: Record<string, AccountMetaPatch>;
  categoryBudgets: Record<string, number>;
  savingsGoals: SavingsGoalItem[];
  reviewedTransactionIds: string[];
  preferCategoryIconMerchants: string[];
  learnedBrandDomains: Record<string, string>;
  mySwishPhone: string;
  swishContacts: unknown[];
  household: unknown;
  weekendHandling: string;
  darkMode: string;
  onboardingCompleted: boolean;
  onboardingInProgress: boolean;
  onboardingStep: string;
  manualBalance: ManualBalance | null;
  incomeFirstSeen: Record<string, string>;
  updatedAt: string;
}

// Profilrad (eller del av den) som kan bära sparade användarval.
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export type ProfileWithPreferences = Partial<
  Pick<
    ProfileRow,
    'user_preferences' | 'show_accounts_on_home' | 'exclude_internal_transfers' | 'my_swish_phone' | 'swish_contacts'
  >
>;

// Valen är vanlig JSON-data (de sparas även i localStorage), så de kan skickas som Json.
function toJson(value: unknown): Json {
  return value as Json;
}

function readProfilePreferences(profile: ProfileWithPreferences): Partial<UserPreferences> {
  // JSON från databasen – formen kommer från collectAllUserPreferences.
  return (
    profile.user_preferences && typeof profile.user_preferences === 'object'
      ? profile.user_preferences
      : {}
  ) as Partial<UserPreferences>;
}

export function collectAllUserPreferences(): Partial<UserPreferences> {
  if (typeof window === 'undefined') return {};
  const safeParse = <T,>(key: string, fallback: T): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const cachedApp = loadCachedAppState();
  return {
    showAccountsOnHome: getShowAccountsOnHome(),
    excludeInternalTransfers: getExcludeInternalTransfers(),
    excludedTransactionIds: Array.from(getExcludedTransactionIds()),
    dismissedFixedMerchants: Array.from(getDismissedFixedMerchants()),
    dismissedIncomeMerchants: Array.from(getDismissedIncomeMerchants()),
    deletedFixedIds: Array.from(getDeletedFixedIds()),
    deletedIncomeIds: Array.from(getDeletedIncomeIds()),
    savedFixedExpenses: Array.isArray(cachedApp?.fixedExpenses) ? cachedApp!.fixedExpenses : [],
    savedIncomes: Array.isArray(cachedApp?.incomes) ? cachedApp!.incomes : [],
    manualFixedOverrides: getManualFixedOverrides(),
    manualIncomeOverrides: getManualIncomeOverrides(),
    merchantAliasesV3: getMerchantAliases(),
    categoryRemap: getCategoryRemap(),
    customExpenseCategories: getStoredExpenseCategories(),
    customIncomeCategories: getStoredIncomeCategories(),
    customPaymentMethods: getStoredPaymentMethods(),
    transactionMeta: getLightweightTransactionMetaMapForSync(),
    accountMeta: getAccountMetaMap(),
    categoryBudgets: getCategoryBudgets(),
    savingsGoals: getSavingsGoals(),
    reviewedTransactionIds: Array.from(getReviewedTransactionIds()),
    preferCategoryIconMerchants: safeParse<string[]>('dejz_prefer_category_icon_merchants_v1', []),
    learnedBrandDomains: safeParse<Record<string, string>>('dejz_learned_brand_domains_v1', {}),
    mySwishPhone: localStorage.getItem('dejz_my_swish_phone') || '',
    swishContacts: safeParse<unknown[]>('dejz_swish_contacts', []),
    household: safeParse<unknown>('dejz_household_state_v1', null),
    weekendHandling: localStorage.getItem('dejz_weekend_handling') || 'before',
    darkMode: localStorage.getItem('dejz_dark_mode') || 'light',
    onboardingCompleted:
      localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
      localStorage.getItem('dejz_onboarding_completed') === 'true',
    onboardingInProgress:
      localStorage.getItem('dejz_onboarding_v2_done') !== 'true' &&
      localStorage.getItem('dejz_onboarding_completed') !== 'true' &&
      localStorage.getItem('dejz_onboarding_in_progress') === 'true',
    onboardingStep: localStorage.getItem('dejz_onboarding_step') || '1',
    manualBalance: safeParse<ManualBalance | null>('dejz_manual_balance_v1', null),
    incomeFirstSeen: safeParse<Record<string, string>>('dejz_income_first_seen', {}),
    updatedAt: new Date().toISOString(),
  };
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;

export function cancelPendingPreferenceSync(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

export function clearAllLocalAppData(preserveTheme = false): void {
  cancelPendingPreferenceSync();
  if (typeof window === 'undefined') return;
  try {
    if (!preserveTheme) {
      // Vid permanent kontoradering: rensa ALLT i localStorage och sessionStorage så att inte ett enda spår finns kvar
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('dejz_logged_out', 'true');
      return;
    }

    const savedTheme = localStorage.getItem('dejz_dark_mode');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('dejz_') ||
        key.startsWith('user_settings_') ||
        key.startsWith('demo_')
      ) {
        localStorage.removeItem(key);
      }
    }
    if (savedTheme) {
      localStorage.setItem('dejz_dark_mode', savedTheme);
    }
  } catch {
    // ignore storage errors
  }
}

export function syncAllUserPreferencesToSupabase(immediate = false): void {
  if (typeof window === 'undefined') return;
  // Demoläget får aldrig skriva inställningar till en riktig profil
  if (isLocalDemoMode) return;
  try {
    if (localStorage.getItem('dejz_logged_out') === 'true') {
      cancelPendingPreferenceSync();
      return;
    }
  } catch {
    // ignore
  }
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }

  const performSync = async () => {
    try {
      if (localStorage.getItem('dejz_logged_out') === 'true') return;
      const { data } = await supabase.auth.getSession();
      const uid = data?.session?.user?.id;
      if (!uid) return;
      const prefs = collectAllUserPreferences();
      const prefsJson = toJson(prefs);
      const payload: Database['public']['Tables']['profiles']['Update'] = {
        user_preferences: prefsJson,
        show_accounts_on_home: prefs.showAccountsOnHome,
        exclude_internal_transfers: prefs.excludeInternalTransfers,
        my_swish_phone: prefs.mySwishPhone,
        swish_contacts: toJson(prefs.swishContacts),
        categories: toJson(prefs.customExpenseCategories),
        income_categories: toJson(prefs.customIncomeCategories),
      };
      // Attempt full update; fallback to user_preferences or base columns if some columns aren't migrated yet
      const { error } = await supabase.from('profiles').update(payload).eq('id', uid);
      if (error) {
        await supabase
          .from('profiles')
          .update({
            user_preferences: prefsJson,
          })
          .eq('id', uid);
      }
    } catch {
      // ignore offline or schema error
    }
  };

  if (immediate) {
    void performSync();
  } else {
    syncTimeout = setTimeout(() => {
      syncTimeout = null;
      void performSync();
    }, 300);
  }
}

export function extractSavedFixedFromProfile(profile: ProfileWithPreferences | null | undefined): FixedExpenseItem[] {
  if (!profile || typeof profile !== 'object') return [];
  const prefs = readProfilePreferences(profile);
  return Array.isArray(prefs.savedFixedExpenses) ? prefs.savedFixedExpenses : [];
}

export function extractSavedIncomesFromProfile(profile: ProfileWithPreferences | null | undefined): IncomeItem[] {
  if (!profile || typeof profile !== 'object') return [];
  const prefs = readProfilePreferences(profile);
  return Array.isArray(prefs.savedIncomes) ? prefs.savedIncomes : [];
}

export function hydrateAllUserPreferencesFromProfile(profile: ProfileWithPreferences | null | undefined): void {
  if (typeof window === 'undefined' || !profile || typeof profile !== 'object') return;
  try {
    const prefs = readProfilePreferences(profile);

    const showAcc =
      typeof profile.show_accounts_on_home === 'boolean'
        ? profile.show_accounts_on_home
        : typeof prefs.showAccountsOnHome === 'boolean'
        ? prefs.showAccountsOnHome
        : null;
    if (showAcc !== null && localStorage.getItem(SHOW_ACCOUNTS_ON_HOME_KEY) === null) {
      localStorage.setItem(SHOW_ACCOUNTS_ON_HOME_KEY, String(showAcc));
    }

    const exclTransfers =
      typeof profile.exclude_internal_transfers === 'boolean'
        ? profile.exclude_internal_transfers
        : typeof prefs.excludeInternalTransfers === 'boolean'
        ? prefs.excludeInternalTransfers
        : null;
    if (exclTransfers !== null && localStorage.getItem(EXCLUDE_INTERNAL_TRANSFERS_KEY) === null) {
      localStorage.setItem(EXCLUDE_INTERNAL_TRANSFERS_KEY, String(exclTransfers));
    }

    const swishPhone = profile.my_swish_phone || prefs.mySwishPhone;
    if (swishPhone && !localStorage.getItem('dejz_my_swish_phone')) {
      localStorage.setItem('dejz_my_swish_phone', String(swishPhone));
    }

    const swishContacts = Array.isArray(profile.swish_contacts)
      ? profile.swish_contacts
      : Array.isArray(prefs.swishContacts)
      ? prefs.swishContacts
      : null;
    if (swishContacts && swishContacts.length > 0 && !localStorage.getItem('dejz_swish_contacts')) {
      localStorage.setItem('dejz_swish_contacts', JSON.stringify(swishContacts));
    }

    if (Array.isArray(prefs.excludedTransactionIds) && !localStorage.getItem(EXCLUDED_TX_IDS_KEY)) {
      localStorage.setItem(EXCLUDED_TX_IDS_KEY, JSON.stringify(prefs.excludedTransactionIds));
    }
    if (Array.isArray(prefs.dismissedFixedMerchants) && !localStorage.getItem(DISMISSED_FIXED_KEY)) {
      localStorage.setItem(DISMISSED_FIXED_KEY, JSON.stringify(prefs.dismissedFixedMerchants));
    }
    if (Array.isArray(prefs.dismissedIncomeMerchants) && !localStorage.getItem(DISMISSED_INCOME_KEY)) {
      localStorage.setItem(DISMISSED_INCOME_KEY, JSON.stringify(prefs.dismissedIncomeMerchants));
    }
    if (Array.isArray(prefs.deletedFixedIds) && !localStorage.getItem(DELETED_FIXED_IDS_KEY)) {
      localStorage.setItem(DELETED_FIXED_IDS_KEY, JSON.stringify(prefs.deletedFixedIds));
    }
    if (Array.isArray(prefs.deletedIncomeIds) && !localStorage.getItem(DELETED_INCOME_IDS_KEY)) {
      localStorage.setItem(DELETED_INCOME_IDS_KEY, JSON.stringify(prefs.deletedIncomeIds));
    }
    if (prefs.manualFixedOverrides && !localStorage.getItem(MANUAL_FIXED_OVERRIDES_KEY)) {
      localStorage.setItem(MANUAL_FIXED_OVERRIDES_KEY, JSON.stringify(prefs.manualFixedOverrides));
    }
    if (prefs.manualIncomeOverrides && !localStorage.getItem(MANUAL_INCOME_OVERRIDES_KEY)) {
      localStorage.setItem(MANUAL_INCOME_OVERRIDES_KEY, JSON.stringify(prefs.manualIncomeOverrides));
    }
    if (prefs.merchantAliasesV3 && !localStorage.getItem(MERCHANT_ALIASES_KEY)) {
      localStorage.setItem(MERCHANT_ALIASES_KEY, JSON.stringify(prefs.merchantAliasesV3));
    }
    if (prefs.categoryRemap && !localStorage.getItem(CATEGORY_REMAP_KEY)) {
      localStorage.setItem(CATEGORY_REMAP_KEY, JSON.stringify(prefs.categoryRemap));
    }
    if (prefs.transactionMeta && !localStorage.getItem(TRANSACTION_META_KEY)) {
      localStorage.setItem(TRANSACTION_META_KEY, JSON.stringify(prefs.transactionMeta));
    }
    if (prefs.accountMeta && !localStorage.getItem(ACCOUNT_META_KEY)) {
      localStorage.setItem(ACCOUNT_META_KEY, JSON.stringify(prefs.accountMeta));
    }
    if (prefs.categoryBudgets && !localStorage.getItem(CATEGORY_BUDGETS_KEY)) {
      localStorage.setItem(CATEGORY_BUDGETS_KEY, JSON.stringify(prefs.categoryBudgets));
    }
    if (Array.isArray(prefs.savingsGoals) && !localStorage.getItem(SAVINGS_GOALS_KEY)) {
      localStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(prefs.savingsGoals));
    }
    if (
      prefs.household &&
      typeof prefs.household === 'object' &&
      !localStorage.getItem('dejz_household_state_v1')
    ) {
      localStorage.setItem('dejz_household_state_v1', JSON.stringify(prefs.household));
    }
    if (Array.isArray(prefs.reviewedTransactionIds) && !localStorage.getItem(REVIEWED_TX_IDS_KEY)) {
      localStorage.setItem(REVIEWED_TX_IDS_KEY, JSON.stringify(prefs.reviewedTransactionIds));
    }
    if (
      Array.isArray(prefs.preferCategoryIconMerchants) &&
      !localStorage.getItem('dejz_prefer_category_icon_merchants_v1')
    ) {
      localStorage.setItem(
        'dejz_prefer_category_icon_merchants_v1',
        JSON.stringify(prefs.preferCategoryIconMerchants)
      );
    }
    if (
      prefs.learnedBrandDomains &&
      typeof prefs.learnedBrandDomains === 'object' &&
      !localStorage.getItem('dejz_learned_brand_domains_v1')
    ) {
      localStorage.setItem(
        'dejz_learned_brand_domains_v1',
        JSON.stringify(prefs.learnedBrandDomains)
      );
    }
    if (
      Array.isArray(prefs.customExpenseCategories) &&
      prefs.customExpenseCategories.length > 0 &&
      !localStorage.getItem(CUSTOM_EXPENSE_CATEGORIES_KEY)
    ) {
      localStorage.setItem(
        CUSTOM_EXPENSE_CATEGORIES_KEY,
        JSON.stringify(prefs.customExpenseCategories)
      );
    }
    if (
      Array.isArray(prefs.customIncomeCategories) &&
      prefs.customIncomeCategories.length > 0 &&
      !localStorage.getItem(CUSTOM_INCOME_CATEGORIES_KEY)
    ) {
      localStorage.setItem(
        CUSTOM_INCOME_CATEGORIES_KEY,
        JSON.stringify(prefs.customIncomeCategories)
      );
    }
    if (
      Array.isArray(prefs.customPaymentMethods) &&
      prefs.customPaymentMethods.length > 0 &&
      !localStorage.getItem(CUSTOM_PAYMENT_METHODS_KEY)
    ) {
      localStorage.setItem(
        CUSTOM_PAYMENT_METHODS_KEY,
        JSON.stringify(prefs.customPaymentMethods)
      );
    }
    const isAlreadyDoneLocally =
      localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
      localStorage.getItem('dejz_onboarding_completed') === 'true';
    if (prefs.onboardingCompleted === true || isAlreadyDoneLocally) {
      localStorage.setItem('dejz_onboarding_v2_done', 'true');
      localStorage.setItem('dejz_onboarding_completed', 'true');
      localStorage.removeItem('dejz_onboarding_in_progress');
    } else if (prefs.onboardingInProgress === true) {
      localStorage.setItem('dejz_onboarding_in_progress', 'true');
      if (prefs.onboardingStep && !localStorage.getItem('dejz_onboarding_step')) {
        localStorage.setItem('dejz_onboarding_step', String(prefs.onboardingStep));
      }
    }

    // Saldo just nu: den senast inmatade vinner (från vilken enhet som helst)
    const remoteBalance = prefs.manualBalance;
    if (remoteBalance && typeof remoteBalance.amount === 'number' && remoteBalance.at) {
      const local = getManualBalance();
      if (!local || String(remoteBalance.at) > local.at) {
        localStorage.setItem(MANUAL_BALANCE_KEY, JSON.stringify(remoteBalance));
      }
    }
    if (prefs.incomeFirstSeen && typeof prefs.incomeFirstSeen === 'object') {
      const localSeen = safeJson<Record<string, string>>(INCOME_FIRST_SEEN_KEY, {});
      const merged: Record<string, string> = { ...prefs.incomeFirstSeen };
      for (const [id, date] of Object.entries(localSeen)) {
        if (!merged[id] || date < merged[id]) merged[id] = date;
      }
      localStorage.setItem(INCOME_FIRST_SEEN_KEY, JSON.stringify(merged));
    }
  } catch {
    // ignore
  }
}
