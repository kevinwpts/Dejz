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
import { PrefSyncMeta, emptyMeta, findDirtyKeys, hashValue, planHydrate } from './prefsMerge';

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
    'id' | 'user_preferences' | 'show_accounts_on_home' | 'exclude_internal_transfers' | 'my_swish_phone' | 'swish_contacts'
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

// --- Synk per nyckel (flera enheter) ---------------------------------------------------------
// Varje enhet skickar bara det den själv har ändrat, och databasen slår ihop det
// (merge_user_preferences). Se prefsMerge.ts för reglerna.
const PREF_SYNC_META_KEY = 'dejz_pref_sync_meta_v1';

function loadPrefSyncMeta(uid: string): PrefSyncMeta {
  try {
    const raw = localStorage.getItem(PREF_SYNC_META_KEY);
    const parsed = raw ? (JSON.parse(raw) as PrefSyncMeta) : null;
    if (parsed && parsed.uid === uid && parsed.seen && parsed.hash) return parsed;
  } catch {
    // ignore
  }
  return emptyMeta(uid);
}

function savePrefSyncMeta(meta: PrefSyncMeta): void {
  try {
    localStorage.setItem(PREF_SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

/** Kolumner i profiles som speglar vissa val (läses av äldre kod och av servern). */
function mirrorColumnsFor(
  dirty: string[],
  prefs: Partial<UserPreferences>
): Database['public']['Tables']['profiles']['Update'] {
  const cols: Database['public']['Tables']['profiles']['Update'] = {};
  if (dirty.includes('showAccountsOnHome')) cols.show_accounts_on_home = prefs.showAccountsOnHome;
  if (dirty.includes('excludeInternalTransfers')) cols.exclude_internal_transfers = prefs.excludeInternalTransfers;
  if (dirty.includes('mySwishPhone')) cols.my_swish_phone = prefs.mySwishPhone;
  if (dirty.includes('swishContacts')) cols.swish_contacts = toJson(prefs.swishContacts);
  if (dirty.includes('customExpenseCategories')) cols.categories = toJson(prefs.customExpenseCategories);
  if (dirty.includes('customIncomeCategories')) cols.income_categories = toJson(prefs.customIncomeCategories);
  return cols;
}

let syncInFlight: Promise<void> | null = null;
let syncAgain = false;

async function performPreferenceSync(): Promise<void> {
  if (localStorage.getItem('dejz_logged_out') === 'true') return;
  const { data } = await supabase.auth.getSession();
  const uid = data?.session?.user?.id;
  if (!uid) return;

  const meta = loadPrefSyncMeta(uid);
  // Innan enheten har jämfört med servern skickas ingenting – annars kunde gammal data skriva över ny
  if (!meta.initialized) return;

  const prefs = collectAllUserPreferences() as Record<string, unknown>;
  const dirty = findDirtyKeys(prefs, meta);
  if (dirty.length === 0) return;

  const patch: Record<string, unknown> = {};
  for (const k of dirty) patch[k] = prefs[k];
  const { data: written, error } = await supabase.rpc('merge_user_preferences', { patch: toJson(patch) });
  if (error) return; // försök igen vid nästa ändring

  const stamps = (written && typeof written === 'object' ? written : {}) as Record<string, string>;
  const latest = loadPrefSyncMeta(uid);
  // Bara det servern bekräftat räknas som sparat (saknas profilraden försöker vi igen senare)
  for (const k of dirty) {
    if (!stamps[k]) continue;
    latest.seen[k] = stamps[k];
    latest.hash[k] = hashValue(patch[k]);
  }
  savePrefSyncMeta(latest);

  const cols = mirrorColumnsFor(dirty, prefs as Partial<UserPreferences>);
  if (Object.keys(cols).length > 0) {
    await supabase.from('profiles').update(cols).eq('id', uid);
  }
}

function runPreferenceSync(): void {
  if (syncInFlight) {
    syncAgain = true;
    return;
  }
  syncInFlight = performPreferenceSync()
    .catch(() => {
      // offline – försök igen vid nästa ändring
    })
    .finally(() => {
      syncInFlight = null;
      if (syncAgain) {
        syncAgain = false;
        runPreferenceSync();
      }
    });
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
  if (immediate) {
    runPreferenceSync();
  } else {
    syncTimeout = setTimeout(() => {
      syncTimeout = null;
      runPreferenceSync();
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

/** Var varje synkad inställning ligger i localStorage och hur den skrivs. */
// Byggs först när den behövs: filerna under cache/ importerar varandra, så nycklarna finns inte vid laddning.
type PrefStorage = Partial<Record<keyof UserPreferences, { key: string; kind: 'json' | 'bool' | 'string' }>>;
let prefStorageCache: PrefStorage | null = null;
function prefStorage(): PrefStorage {
  if (prefStorageCache) return prefStorageCache;
  prefStorageCache = {
  showAccountsOnHome: { key: SHOW_ACCOUNTS_ON_HOME_KEY, kind: 'bool' },
  excludeInternalTransfers: { key: EXCLUDE_INTERNAL_TRANSFERS_KEY, kind: 'bool' },
  mySwishPhone: { key: 'dejz_my_swish_phone', kind: 'string' },
  swishContacts: { key: 'dejz_swish_contacts', kind: 'json' },
  excludedTransactionIds: { key: EXCLUDED_TX_IDS_KEY, kind: 'json' },
  dismissedFixedMerchants: { key: DISMISSED_FIXED_KEY, kind: 'json' },
  dismissedIncomeMerchants: { key: DISMISSED_INCOME_KEY, kind: 'json' },
  deletedFixedIds: { key: DELETED_FIXED_IDS_KEY, kind: 'json' },
  deletedIncomeIds: { key: DELETED_INCOME_IDS_KEY, kind: 'json' },
  manualFixedOverrides: { key: MANUAL_FIXED_OVERRIDES_KEY, kind: 'json' },
  manualIncomeOverrides: { key: MANUAL_INCOME_OVERRIDES_KEY, kind: 'json' },
  merchantAliasesV3: { key: MERCHANT_ALIASES_KEY, kind: 'json' },
  categoryRemap: { key: CATEGORY_REMAP_KEY, kind: 'json' },
  transactionMeta: { key: TRANSACTION_META_KEY, kind: 'json' },
  accountMeta: { key: ACCOUNT_META_KEY, kind: 'json' },
  categoryBudgets: { key: CATEGORY_BUDGETS_KEY, kind: 'json' },
  savingsGoals: { key: SAVINGS_GOALS_KEY, kind: 'json' },
  household: { key: 'dejz_household_state_v1', kind: 'json' },
  reviewedTransactionIds: { key: REVIEWED_TX_IDS_KEY, kind: 'json' },
  preferCategoryIconMerchants: { key: 'dejz_prefer_category_icon_merchants_v1', kind: 'json' },
  learnedBrandDomains: { key: 'dejz_learned_brand_domains_v1', kind: 'json' },
  customExpenseCategories: { key: CUSTOM_EXPENSE_CATEGORIES_KEY, kind: 'json' },
  customIncomeCategories: { key: CUSTOM_INCOME_CATEGORIES_KEY, kind: 'json' },
  customPaymentMethods: { key: CUSTOM_PAYMENT_METHODS_KEY, kind: 'json' },
  };
  return prefStorageCache;
}

/** Köpinfo från servern saknar kvittobilder sparade i telefonen – de behålls. */
function mergeRemoteTransactionMeta(remote: Record<string, TransactionMetaPatch>): Record<string, TransactionMetaPatch> {
  const local = safeJson<Record<string, TransactionMetaPatch>>(TRANSACTION_META_KEY, {});
  const merged: Record<string, TransactionMetaPatch> = { ...remote };
  for (const [id, entry] of Object.entries(local)) {
    if (!entry) continue;
    const keep: TransactionMetaPatch = {};
    if (entry.receiptUrl?.startsWith('data:')) {
      keep.receiptUrl = entry.receiptUrl;
      keep.receiptName = entry.receiptName;
    }
    const inline = (entry.receipts || []).filter((r) => r?.url?.startsWith('data:'));
    if (inline.length > 0) keep.receipts = [...(merged[id]?.receipts || []), ...inline];
    if (Object.keys(keep).length > 0) merged[id] = { ...(merged[id] || {}), ...keep };
  }
  return merged;
}

function writePref(name: keyof UserPreferences, value: unknown): void {
  const target = prefStorage()[name];
  if (!target) return;
  if (value === undefined || value === null) {
    localStorage.removeItem(target.key);
    return;
  }
  if (target.kind === 'bool') localStorage.setItem(target.key, String(Boolean(value)));
  else if (target.kind === 'string') localStorage.setItem(target.key, String(value));
  else if (name === 'transactionMeta')
    localStorage.setItem(target.key, JSON.stringify(mergeRemoteTransactionMeta(value as Record<string, TransactionMetaPatch>)));
  else localStorage.setItem(target.key, JSON.stringify(value));
}

/** Skickar ut händelser så att vyerna läser om det som ändrats. */
function announceAppliedPreferences(applied: string[]): void {
  if (applied.length === 0) return;
  const fire = (name: string) => window.dispatchEvent(new CustomEvent(name));
  if (applied.includes('savingsGoals')) fire('dejz:goals-updated');
  if (applied.includes('household')) fire('dejz:household-updated');
  if (applied.includes('mySwishPhone') || applied.includes('swishContacts')) fire('dejz:swish-directory-updated');
  fire('dejz:preferences-updated');
}

/**
 * Hämtar inställningar från servern till enheten, en nyckel i taget.
 * Ändringar från andra enheter skrivs in; enhetens egna osparade ändringar behålls och skickas sen.
 * Returnerar namnen på det som ändrades här.
 */
export function hydrateAllUserPreferencesFromProfile(
  profile: ProfileWithPreferences | null | undefined,
  uidOverride?: string
): string[] {
  if (typeof window === 'undefined' || !profile || typeof profile !== 'object') return [];
  const uid = uidOverride || profile.id;
  let applied: string[] = [];
  let firstTime = false;
  try {
    const typed = readProfilePreferences(profile);
    const prefs = typed as Record<string, unknown>;
    // Äldre profiler: vissa val låg bara i egna kolumner
    const remote: Record<string, unknown> = { ...prefs };
    if (!('showAccountsOnHome' in remote) && typeof profile.show_accounts_on_home === 'boolean')
      remote.showAccountsOnHome = profile.show_accounts_on_home;
    if (!('excludeInternalTransfers' in remote) && typeof profile.exclude_internal_transfers === 'boolean')
      remote.excludeInternalTransfers = profile.exclude_internal_transfers;
    if (!('mySwishPhone' in remote) && profile.my_swish_phone) remote.mySwishPhone = profile.my_swish_phone;
    if (!('swishContacts' in remote) && Array.isArray(profile.swish_contacts)) remote.swishContacts = profile.swish_contacts;

    if (uid) {
      const stamps = (prefs._updatedAt && typeof prefs._updatedAt === 'object' ? prefs._updatedAt : {}) as Record<string, string>;
      const legacyStamp = typeof prefs.updatedAt === 'string' ? prefs.updatedAt : '';
      const local = collectAllUserPreferences() as Record<string, unknown>;
      const before = loadPrefSyncMeta(uid);
      firstTime = !before.initialized;
      const plan = planHydrate(Object.keys(prefStorage()), local, remote, stamps, legacyStamp, before);
      for (const k of plan.apply) writePref(k as keyof UserPreferences, remote[k]);
      // Fingeravtrycket ska spegla hur värdet ser ut i appen efter att det skrivits
      if (plan.apply.length > 0) {
        const after = collectAllUserPreferences() as Record<string, unknown>;
        for (const k of plan.apply) plan.meta.hash[k] = hashValue(after[k]);
      }
      savePrefSyncMeta(plan.meta);
      applied = plan.apply;
    }

    const isAlreadyDoneLocally =
      localStorage.getItem('dejz_onboarding_v2_done') === 'true' ||
      localStorage.getItem('dejz_onboarding_completed') === 'true';
    if (typed.onboardingCompleted === true || isAlreadyDoneLocally) {
      localStorage.setItem('dejz_onboarding_v2_done', 'true');
      localStorage.setItem('dejz_onboarding_completed', 'true');
      localStorage.removeItem('dejz_onboarding_in_progress');
    } else if (typed.onboardingInProgress === true) {
      localStorage.setItem('dejz_onboarding_in_progress', 'true');
      if (typed.onboardingStep && !localStorage.getItem('dejz_onboarding_step')) {
        localStorage.setItem('dejz_onboarding_step', String(typed.onboardingStep));
      }
    }

    // Saldo just nu: den senast inmatade vinner (från vilken enhet som helst)
    const remoteBalance = typed.manualBalance;
    if (remoteBalance && typeof remoteBalance.amount === 'number' && remoteBalance.at) {
      const local = getManualBalance();
      if (!local || String(remoteBalance.at) > local.at) {
        localStorage.setItem(MANUAL_BALANCE_KEY, JSON.stringify(remoteBalance));
        applied = [...applied, 'manualBalance'];
      }
    }
    if (typed.incomeFirstSeen && typeof typed.incomeFirstSeen === 'object') {
      const localSeen = safeJson<Record<string, string>>(INCOME_FIRST_SEEN_KEY, {});
      const merged: Record<string, string> = { ...typed.incomeFirstSeen };
      for (const [id, date] of Object.entries(localSeen)) {
        if (!merged[id] || date < merged[id]) merged[id] = date;
      }
      localStorage.setItem(INCOME_FIRST_SEEN_KEY, JSON.stringify(merged));
    }

    // Övriga val (introduktion, saldo, tema …) har egna regler ovan. Första gången räknas det
    // som redan finns här som "i synk", så att en gammal enhet inte skickar ut gammal data.
    if (uid) {
      const meta = loadPrefSyncMeta(uid);
      const after = collectAllUserPreferences() as Record<string, unknown>;
      for (const k of Object.keys(after)) {
        if (k === 'updatedAt' || k in prefStorage()) continue;
        if (firstTime || (k === 'manualBalance' && applied.includes(k))) meta.hash[k] = hashValue(after[k]);
      }
      savePrefSyncMeta(meta);
    }
  } catch {
    // ignore
  }
  announceAppliedPreferences(applied);
  // Skicka det som bara finns här (eller ändrats här) nu när enheten har jämfört med servern
  syncAllUserPreferencesToSupabase();
  return applied;
}

/** Hämtar senaste inställningarna från servern (t.ex. när appen öppnas igen). */
export async function pullUserPreferences(uid: string): Promise<string[]> {
  if (!uid || isLocalDemoMode) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_preferences, show_accounts_on_home, exclude_internal_transfers, my_swish_phone, swish_contacts')
    .eq('id', uid)
    .maybeSingle();
  if (error || !data) return [];
  return hydrateAllUserPreferencesFromProfile(data, uid);
}
