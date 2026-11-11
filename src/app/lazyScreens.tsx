import React, { lazy, Suspense } from 'react';
import type { AnalysisTab as AnalysisTabT } from '../components/AnalysisTab';
import type { TransactionsTab as TransactionsTabT } from '../components/TransactionsTab';
import type { FixedTab as FixedTabT } from '../components/FixedTab';
import type { SettingsTab as SettingsTabT } from '../components/SettingsTab';
import type { SavingsGoalsView as SavingsGoalsViewT } from '../components/SavingsGoalsView';
import type { BankModal as BankModalT } from '../components/modals/BankModal';
import type { IncomeModal as IncomeModalT } from '../components/modals/IncomeModal';
import type {
  FixedExpenseModal as FixedExpenseModalT,
} from '../components/modals/FixedExpenseModal';
import type { TransactionModal as TransactionModalT } from '../components/modals/TransactionModal';
import type { AuthModal as AuthModalT } from '../components/modals/AuthModal';
import type { SearchModal as SearchModalT } from '../components/modals/SearchModal';
import type {
  NotificationsModal as NotificationsModalT,
} from '../components/modals/NotificationsModal';
import type { OnboardingFlow as OnboardingFlowT } from '../components/OnboardingFlow';
import type { LandingPage as LandingPageT } from '../components/LandingPage';

/**
 * Skärmar som laddas först när de behövs (code splitting). Då startar appen snabbare i
 * telefonen. Allt förladdas i bakgrunden när telefonen är ledig, så att bytet ändå går direkt.
 */

type Loader = () => Promise<Record<string, unknown>>;
const loaders: Loader[] = [];

function lazyScreen<C extends React.ComponentType<any>>(
  loader: () => Promise<Record<string, unknown>>,
  name: string,
  fallback: React.ReactNode = null
): React.FC<React.ComponentProps<C>> {
  loaders.push(loader);
  const L = lazy(async () => ({ default: (await loader())[name] as C }));
  const Wrapped: React.FC<React.ComponentProps<C>> = (props) => (
    <Suspense fallback={fallback}>
      <L {...(props as any)} />
    </Suspense>
  );
  Wrapped.displayName = `Lazy(${name})`;
  return Wrapped;
}

/** Ladda ned alla skärmar i bakgrunden när webbläsaren är ledig */
export function preloadScreens(): void {
  const run = () => loaders.forEach((l) => void l().catch(() => {}));
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void };
  if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 2500);
}

const tabFallback = <div className="min-h-[60vh]" aria-busy="true" />;

export const AnalysisTab = lazyScreen<typeof AnalysisTabT>(() => import('../components/AnalysisTab'), 'AnalysisTab', tabFallback);
export const TransactionsTab = lazyScreen<typeof TransactionsTabT>(() => import('../components/TransactionsTab'), 'TransactionsTab', tabFallback);
export const FixedTab = lazyScreen<typeof FixedTabT>(() => import('../components/FixedTab'), 'FixedTab', tabFallback);
export const SettingsTab = lazyScreen<typeof SettingsTabT>(() => import('../components/SettingsTab'), 'SettingsTab', tabFallback);
export const SavingsGoalsView = lazyScreen<typeof SavingsGoalsViewT>(() => import('../components/SavingsGoalsView'), 'SavingsGoalsView', tabFallback);
export const BankModal = lazyScreen<typeof BankModalT>(() => import('../components/modals/BankModal'), 'BankModal');
export const IncomeModal = lazyScreen<typeof IncomeModalT>(() => import('../components/modals/IncomeModal'), 'IncomeModal');
export const FixedExpenseModal = lazyScreen<typeof FixedExpenseModalT>(() => import('../components/modals/FixedExpenseModal'), 'FixedExpenseModal');
export const TransactionModal = lazyScreen<typeof TransactionModalT>(() => import('../components/modals/TransactionModal'), 'TransactionModal');
export const AuthModal = lazyScreen<typeof AuthModalT>(() => import('../components/modals/AuthModal'), 'AuthModal');
export const SearchModal = lazyScreen<typeof SearchModalT>(() => import('../components/modals/SearchModal'), 'SearchModal');
export const NotificationsModal = lazyScreen<typeof NotificationsModalT>(() => import('../components/modals/NotificationsModal'), 'NotificationsModal');
export const OnboardingFlow = lazyScreen<typeof OnboardingFlowT>(() => import('../components/OnboardingFlow'), 'OnboardingFlow', <div className="min-h-dvh bg-[var(--bg-color)]" />);
export const LandingPage = lazyScreen<typeof LandingPageT>(() => import('../components/LandingPage'), 'LandingPage', <div className="min-h-dvh bg-[var(--bg-color)]" />);
