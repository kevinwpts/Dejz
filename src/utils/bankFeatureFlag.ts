const ADMIN_EMAILS = new Set([
  'kevinwpts@gmail.com',
  'hej@dejz.se',
]);

/**
 * Feature flag for Enable Banking in Onboarding and Settings.
 * Bank connection needs a company (AB), so it is admin-only for now.
 * Open it for everyone again by setting VITE_ENABLE_BANKING_PUBLIC="true".
 */
export function isBankEnabledForEmail(email: string | null | undefined): boolean {
  if (import.meta.env.VITE_ENABLE_BANKING_PUBLIC === 'true') return true;
  return !!email && ADMIN_EMAILS.has(email.toLowerCase().trim());
}

