import { User } from '@supabase/supabase-js';

const ADMIN_EMAILS = new Set([
  'kevinwpts@gmail.com',
  'hej@dejz.se',
]);

/**
 * Controlled feature flag for Enable Banking.
 * Production is currently in Restricted mode (only linked admin SEB accounts).
 * Until VITE_ENABLE_BANKING_PUBLIC === 'true', bank integration in both Onboarding
 * and Settings is strictly limited to the administrator account.
 */
export function isBankIntegrationEnabledForUser(
  user: User | null | undefined,
  userRole?: string | null
): boolean {
  if (!user) return false;

  const isPubliclyEnabled = import.meta.env.VITE_ENABLE_BANKING_PUBLIC === 'true';
  if (isPubliclyEnabled) return true;

  if (userRole === 'admin') return true;

  const email = (user.email || '').toLowerCase().trim();
  return ADMIN_EMAILS.has(email);
}

export const BANK_ONBOARDING_DRAFT_KEY = 'dejz_onboarding_bank_draft_v1';
export const BANK_PENDING_CALLBACK_KEY = 'dejz_pending_bank_callback_v1';
export const BANK_REDIRECT_ORIGIN_KEY = 'dejz_bank_redirect_origin_v1';

export interface OnboardingBankDraft {
  fullName: string;
  payday: number;
  paydayBeforeWeekend: boolean;
  incomes: Array<{ id: string; name: string; amount: string; type: 'salary' | 'benefit' | 'other' }>;
  fixedExpenses: Array<{ id: string; name: string; amount: string; category: string }>;
  savingsGoals: Array<{ id: string; name: string; targetAmount: string; savedAmount: string; targetDate?: string }>;
  monthlySavingsInput: string;
  midMonthSpent: string;
  step: string;
  savedAt: number;
}

export function saveOnboardingBankDraft(draft: OnboardingBankDraft): void {
  try {
    localStorage.setItem(BANK_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch (e) {
    console.error('Could not save onboarding bank draft:', e);
  }
}

export function loadOnboardingBankDraft(): OnboardingBankDraft | null {
  try {
    const raw = localStorage.getItem(BANK_ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingBankDraft;
    // Expire draft after 2 hours
    if (Date.now() - (parsed.savedAt || 0) > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(BANK_ONBOARDING_DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearOnboardingBankDraft(): void {
  try {
    localStorage.removeItem(BANK_ONBOARDING_DRAFT_KEY);
  } catch {
    // ignore
  }
}

export interface PendingBankCallback {
  code?: string;
  state?: string;
  error?: string;
  errorDescription?: string;
  capturedAt: number;
}

export function savePendingBankCallback(payload: PendingBankCallback): void {
  try {
    sessionStorage.setItem(BANK_PENDING_CALLBACK_KEY, JSON.stringify(payload));
    localStorage.setItem(BANK_PENDING_CALLBACK_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function loadPendingBankCallback(): PendingBankCallback | null {
  try {
    const raw =
      sessionStorage.getItem(BANK_PENDING_CALLBACK_KEY) ||
      localStorage.getItem(BANK_PENDING_CALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingBankCallback;
    if (Date.now() - (parsed.capturedAt || 0) > 30 * 60 * 1000) {
      clearPendingBankCallback();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingBankCallback(): void {
  try {
    sessionStorage.removeItem(BANK_PENDING_CALLBACK_KEY);
    localStorage.removeItem(BANK_PENDING_CALLBACK_KEY);
  } catch {
    // ignore
  }
}

export interface BankRedirectOriginMeta {
  originContext: 'onboarding' | 'settings';
  returnStep?: string | null;
  aspspName?: string;
  startedAt: number;
}

export function saveBankRedirectOrigin(meta: BankRedirectOriginMeta): void {
  try {
    localStorage.setItem(BANK_REDIRECT_ORIGIN_KEY, JSON.stringify(meta));
  } catch {
    // ignore
  }
}

export function loadBankRedirectOrigin(): BankRedirectOriginMeta | null {
  try {
    const raw = localStorage.getItem(BANK_REDIRECT_ORIGIN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BankRedirectOriginMeta;
    if (Date.now() - (parsed.startedAt || 0) > 60 * 60 * 1000) {
      localStorage.removeItem(BANK_REDIRECT_ORIGIN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBankRedirectOrigin(): void {
  try {
    localStorage.removeItem(BANK_REDIRECT_ORIGIN_KEY);
  } catch {
    // ignore
  }
}
