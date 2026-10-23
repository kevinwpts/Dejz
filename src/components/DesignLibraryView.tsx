import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Smartphone,
  Tablet,
  Monitor,
  Plus,
  Check,
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronRight,
  ChevronDown,
  RotateCcw,
  Edit2,
  CreditCard,
  ShoppingBag,
  FileCode,
  MapPin,
  Sliders,
} from 'lucide-react';
import {
  Button,
  IconButton,
  Input,
  Select,
  Card,
  Badge,
  Pill,
  SegmentedControl,
  FilterButtonGroup,
  FilterSelectButton,
  FilterMenuModal,
  ListRow,
  SelectionRow,
  Switch,
  Divider,
  BottomSheet,
  BottomSheetOption,
  BottomSheetHeader,
  EmptyState as UiEmptyState,
  SmartInput,
} from './ui';
import { TransactionItemSkeleton } from './ui/Skeleton';
import { EmptyState as AppEmptyState } from './EmptyState';
import { DS } from '../constants/designSystem';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../constants';
import { Config, Transaction, FixedExpense, Income, Category } from '../types';
import { TranslationKey, translations, Language } from '../i18n';
import { TransactionItem } from './TransactionItem';
import { BudgetItem } from './BudgetItem';
import { AppHeader } from './AppHeader';
import { ToastContainer, ToastMessage } from './Toast';
import { ConfirmModal } from './ConfirmModal';
import { CalendarModal } from './CalendarModal';
import { PeriodSelectorModal } from './PeriodSelectorModal';
import { TransactionModal } from './TransactionModal';
import { TransactionViewModal } from './TransactionViewModal';
import { IncomeModal, FixedExpenseModal, FixedExpenseViewModal } from './BudgetModals';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import { CancelledSubscriptionsModal } from './CancelledSubscriptionsModal';
import { VariableAmountUpdateModal } from './VariableAmountUpdateModal';
import { CategoryModal } from './CategoryModal';
import { CategoryBottomSheetModal } from './CategoryBottomSheetModal';
import { SearchModal } from './SearchModal';
import { FeedbackModal } from './FeedbackModal';
import { SecurityModal } from './SecurityModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { OnboardingModal } from './OnboardingModal';
import { PinLockScreen } from './PinLockScreen';
import { LanguagePicker } from './LanguagePicker';
import { TodayView } from './TodayView';
import { LogView } from './LogView';
import { BudgetView } from './BudgetView';
import { AnalysisView } from './AnalysisView';
import { BudgetCategoriesView } from './BudgetCategoriesView';
import { DebtsView } from './DebtsView';
import { SharedBudgetView } from './SharedBudgetView';
import { SettingsView } from './SettingsView';
import { Auth } from './Auth';
import { LandingPage } from './LandingPage';
import {
  applyThemeColor,
  applyLibraryAccentPreview,
  LIBRARY_ACCENT_OPTIONS,
  DEJZ_SIGNATURE_COLOR,
} from '../utils/theme';
import { formatAmount } from '../utils/format';

export type LibraryTheme = 'light' | 'dark' | 'black';
export type PreviewViewport = 'mobile' | 'tablet' | 'desktop';
export type TestDataPreset = 'realistic' | 'empty' | 'long' | 'extreme_amounts' | 'loading_error';
export type LibrarySection = 'foundations' | 'components' | 'overlays' | 'pages';
export type FoundationSubTab = 'colors' | 'typography' | 'shapes';
export type ComponentSubTab = 'buttons' | 'inputs' | 'selection' | 'cards_lists' | 'navigation' | 'feedback' | 'all';
export type OverlayCategoryTab = 'subscriptions' | 'transactions' | 'budget_dates' | 'account_system' | 'all';
export type FlowCategoryTab = 'main_views' | 'key_flows' | 'other_views';
export type InteractiveStateMode = 'normal' | 'selected' | 'disabled' | 'error' | 'focus';

const COLOR_TOKENS_METADATA: {
  cssVar: string;
  name: string;
  usage: string;
  group: 'Ytor & Bakgrund' | 'Text & Ikoner' | 'Accent & Status' | 'Linjer & Kontroller';
}[] = [
  { cssVar: '--bg-color', name: 'Sidbakgrund', usage: 'Appens huvudsakliga bakgrundsyta', group: 'Ytor & Bakgrund' },
  { cssVar: '--surface-color', name: 'Kort & Yta', usage: 'Standardkort, fält och navigeringsfält', group: 'Ytor & Bakgrund' },
  { cssVar: '--surface-elevated', name: 'Upphöjd yta', usage: 'Popupfönster, menyer och bottom sheets', group: 'Ytor & Bakgrund' },
  { cssVar: '--surface-nested', name: 'Inre ruta (Nästlad)', usage: 'Grupperade rutor inuti ett kort eller en modal', group: 'Ytor & Bakgrund' },
  { cssVar: '--surface-muted', name: 'Dämpad yta', usage: 'Flikbakgrunder och ikoncirklar', group: 'Ytor & Bakgrund' },
  { cssVar: '--surface-hover', name: 'Hover-yta', usage: 'Bakgrund när man pekar på en rad eller knapp', group: 'Ytor & Bakgrund' },
  { cssVar: '--text-primary', name: 'Primär text', usage: 'Rubriker, belopp och vanlig brödtext', group: 'Text & Ikoner' },
  { cssVar: '--text-secondary', name: 'Sekundär text', usage: 'Underrubriker, beskrivningar och status i listor', group: 'Text & Ikoner' },
  { cssVar: '--text-muted', name: 'Dämpad text', usage: 'Hjälptexter, placeholders och inaktiva ikoner', group: 'Text & Ikoner' },
  { cssVar: '--accent-color', name: 'Accentfärg', usage: 'Primära knappar, valda lägen och aktiva ikoner', group: 'Accent & Status' },
  { cssVar: '--accent-soft', name: 'Mjuk accent', usage: 'Bakgrund på valda rader och fokusmarkeringar', group: 'Accent & Status' },
  { cssVar: '--success-color', name: 'Grön (Positivt)', usage: 'Inkomster, sparande och klarmarkeringar', group: 'Accent & Status' },
  { cssVar: '--warning-color', name: 'Gul/Orange (Varning)', usage: 'Nära budgetgräns eller saker att se över', group: 'Accent & Status' },
  { cssVar: '--danger-color', name: 'Röd (Fel / Radera)', usage: 'Felmeddelanden, överskriden budget och raderingsknappar', group: 'Accent & Status' },
  { cssVar: '--border-divider', name: 'Avdelare (Divider)', usage: 'Subtila linjer mellan listrader, sektioner och i modaler', group: 'Linjer & Kontroller' },
  { cssVar: '--focus-color', name: 'Fokusmarkering', usage: 'Tydlig fokusram vid tangentbordsnavigering', group: 'Linjer & Kontroller' },
];

const TYPOGRAPHY_ROLES: {
  label: string;
  className: string;
  fontRole: 'Outfit (Rubriker & Siffror)' | 'Manrope (Text & Kontroller)';
  sampleText: string;
  usage: string;
}[] = [
  {
    label: 'Huvudbelopp (.text-hero-number)',
    className: 'text-hero-number',
    fontRole: 'Outfit (Rubriker & Siffror)',
    sampleText: '14 850 kr',
    usage: 'Stora siffror högst upp på Hem (t.ex. Kvar att spendera)',
  },
  {
    label: 'Sektions-/kortbelopp (.text-hero-amount)',
    className: 'text-hero-amount',
    fontRole: 'Outfit (Rubriker & Siffror)',
    sampleText: '4 290 kr',
    usage: 'Primära summor på kort och i modaler (32px / 36px med tabular-nums)',
  },
  {
    label: 'Sidrubrik (.text-page-title)',
    className: 'text-page-title',
    fontRole: 'Outfit (Rubriker & Siffror)',
    sampleText: 'Ekonomi & Fasta utgifter',
    usage: 'Huvudrubrik på sidor och i popupfönster',
  },
  {
    label: 'Kortrubrik (.text-card-title)',
    className: 'text-card-title',
    fontRole: 'Manrope (Text & Kontroller)',
    sampleText: 'Spotify Duo',
    usage: 'Rubrik inuti kort och viktiga rader',
  },
  {
    label: 'Sektionsrubrik (.text-section-header)',
    className: 'text-section-header',
    fontRole: 'Manrope (Text & Kontroller)',
    sampleText: 'FASTA UTGIFTER',
    usage: 'Små versala rubriker ovanför listor och grupper',
  },
  {
    label: 'Brödtext (.text-body)',
    className: 'text-body',
    fontRole: 'Manrope (Text & Kontroller)',
    sampleText: 'Du säger själv upp tjänsten hos företaget. Dejz registrerar uppsägningen i din budget.',
    usage: 'Vanlig löpande text, formulärfält och rader',
  },
  {
    label: 'Sekundär text (.text-secondary)',
    className: 'text-secondary',
    fontRole: 'Manrope (Text & Kontroller)',
    sampleText: 'Uppsagd · Sista betalning 15 nov',
    usage: 'Underrader i listor och förklarande hjälptext',
  },
  {
    label: 'Mikrotext (.text-caption)',
    className: 'text-caption',
    fontRole: 'Manrope (Text & Kontroller)',
    sampleText: 'Valfritt · Uppdaterad idag kl. 14:20',
    usage: 'Tidsstämplar och små etiketter',
  },
];

function SectionCard({
  title,
  description,
  sourcePath,
  usedIn,
  reviewNote,
  showTechDetails,
  children,
}: {
  title: string;
  description?: string;
  sourcePath: string;
  usedIn: string[];
  reviewNote?: string;
  showTechDetails: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card variant="default" padding="lg" className="space-y-4">
      <div className="pb-3 border-b border-[var(--border-divider)] space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-card-title text-[var(--text-primary)]">{title}</h3>
            {description && (
              <p className="text-secondary mt-0.5">{description}</p>
            )}
          </div>
          {reviewNote && (
            <Badge variant="warning" size="sm" icon={<AlertCircle size={11} />}>
              Varianter att se över
            </Badge>
          )}
        </div>

        {/* Spårbarhet (Källa & Användningsställen) – kompakt och lättläst */}
        {showTechDetails && (
          <div className="pt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--surface-nested)] font-mono text-[var(--text-primary)] border border-[var(--border-divider)]">
              <FileCode size={11} className="shrink-0 text-[var(--accent-color)]" />
              {sourcePath}
            </span>
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <MapPin size={11} className="shrink-0" />
              Används i:
            </span>
            {usedIn.map((place) => (
              <span
                key={place}
                className="px-1.5 py-0.5 rounded bg-[var(--surface-nested)] text-[var(--text-secondary)] border border-[var(--border-divider)]"
              >
                {place}
              </span>
            ))}
          </div>
        )}

        {reviewNote && (
          <div className="px-3 py-2 rounded-card-nested bg-[var(--warning-color)]/10 border border-[var(--warning-color)]/25 text-xs text-[var(--text-primary)] flex items-start gap-2">
            <AlertCircle size={14} className="text-[var(--warning-color)] shrink-0 mt-0.5" />
            <span>{reviewNote}</span>
          </div>
        )}
      </div>

      <div>{children}</div>
    </Card>
  );
}

function buildSandboxDataset(preset: TestDataPreset) {
  const now = new Date();
  const todayIso = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString().split('T')[0];
  const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 20).toISOString().split('T')[0];

  const baseCategories: Category[] = DEFAULT_EXPENSE_CATEGORIES.map((c) => {
    if (preset === 'empty') {
      return { ...c, budget: 0 };
    }
    if (preset === 'extreme_amounts') {
      return {
        ...c,
        budget: c.name === 'Mat & Dryck' ? 1250000 : c.name === 'Boende' ? 0 : 45000,
      };
    }
    if (preset === 'long') {
      return {
        ...c,
        subcategories: [...(c.subcategories || []), 'Extra lång underkategoribenämning för radbrytningstest'],
        budget: c.name === 'Mat & Dryck' ? 4500 : c.name === 'Shopping' ? 2000 : c.name === 'Transport' ? 1500 : 1200,
      };
    }
    return {
      ...c,
      budget: c.name === 'Mat & Dryck' ? 4500 : c.name === 'Shopping' ? 1800 : c.name === 'Transport' ? 1200 : c.name === 'Nöje' ? 1500 : 0,
    };
  });

  const baseConfig: Config = {
    startDay: 25,
    AdjustForWeekends: true,
    dailyGoal: preset === 'empty' ? 0 : preset === 'extreme_amounts' ? 98500 : 420,
    currency: 'kr',
    language: 'sv',
    darkMode: false,
    themeMode: 'light',
    themeColor: DEJZ_SIGNATURE_COLOR,
    notificationsEnabled: true,
    notificationTime: '20:00',
    categories: baseCategories,
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    budgetSetupCompleted: preset !== 'empty',
  };

  if (preset === 'empty') {
    return {
      config: baseConfig,
      incomes: [] as Income[],
      fixedExpenses: [] as FixedExpense[],
      transactions: [] as Transaction[],
    };
  }

  if (preset === 'long') {
    return {
      config: baseConfig,
      incomes: [
        {
          id: 'inc-long-1',
          name: 'Månadslön från Internationella Konsultbolaget i Norden AB (Huvudinkomst med lönetillägg)',
          amount: 36500,
          type: 'fixed',
          frequency: 'monthly',
          category: 'Lön',
          paymentDay: 25,
        },
      ] as Income[],
      fixedExpenses: [
        {
          id: 'fix-long-1',
          name: 'Bredband, TV-paket och Familjeabonnemang via Samfällighetsföreningen Östra Kvarteret',
          amount: 849,
          category: 'Boende',
          subcategory: 'Bredband & Media',
          billingDay: 28,
          frequency: 'monthly',
          isVariable: false,
        },
        {
          id: 'fix-long-2',
          name: 'Streamingpaket Premium Ultra HD 4K med extra familjemedlemmar och sporttillägg',
          amount: 449,
          category: 'Nöje',
          subcategory: 'Streaming',
          billingDay: 15,
          frequency: 'monthly',
          isCancelled: true,
          cancelledAt: todayIso,
          hasRemainingPayment: true,
          finalPaymentDate: nextMonthDate,
          finalPaymentAmount: 449,
          cancellationEndDate: nextMonthEnd,
        },
      ] as FixedExpense[],
      transactions: [
        {
          id: 'tx-long-1',
          amount: 1249.5,
          type: 'expense',
          category: 'Mat & Dryck',
          subcategory: 'Matbutik',
          merchant: 'ICA Maxi Stormarknad Västra Hamnen Storhandlingskvitto inför helgen',
          note: 'Storhandling inklusive ekologiska varor, hushållspapper och födelsedagsfrukost för hela familjen',
          timestamp: `${todayIso}T14:30:00.000Z`,
        },
        {
          id: 'tx-long-2',
          amount: 389,
          type: 'expense',
          category: 'Transport',
          subcategory: 'Kollektivtrafik',
          merchant: 'Skånetrafiken Pendlarbiljett Tåg & Buss Öresundsregionen',
          note: 'Resa till kundmöte och retur under rusningstrafik',
          timestamp: `${yesterday}T08:15:00.000Z`,
        },
      ] as Transaction[],
    };
  }

  if (preset === 'extreme_amounts') {
    return {
      config: baseConfig,
      incomes: [
        {
          id: 'inc-ext-1',
          name: 'Företagsutdelning & Fastighetsförsäljning',
          amount: 12500000,
          type: 'fixed',
          frequency: 'monthly',
          category: 'Lön',
          paymentDay: 25,
        },
        {
          id: 'inc-ext-2',
          name: 'Nollställd bonuspost',
          amount: 0,
          type: 'variable',
          frequency: 'monthly',
          category: 'Övrigt',
          paymentDay: 25,
        },
      ] as Income[],
      fixedExpenses: [
        {
          id: 'fix-ext-1',
          name: 'Amortering & Storbolån Villa',
          amount: 148500,
          category: 'Boende',
          billingDay: 28,
          frequency: 'monthly',
        },
        {
          id: 'fix-ext-2',
          name: 'Gratistjänst (0 kr)',
          amount: 0,
          category: 'Nöje',
          billingDay: 1,
          frequency: 'monthly',
          isCancelled: true,
          cancelledAt: todayIso,
          hasRemainingPayment: false,
        },
      ] as FixedExpense[],
      transactions: [
        {
          id: 'tx-ext-1',
          amount: 985420.75,
          type: 'expense',
          category: 'Boende',
          merchant: 'Kontantinsats & Renoveringsfaktura',
          note: 'Stort belopp med ören',
          timestamp: `${todayIso}T12:00:00.000Z`,
        },
        {
          id: 'tx-ext-2',
          amount: -450,
          type: 'expense',
          category: 'Shopping',
          merchant: 'Återköp / Retur av vinterjacka',
          note: 'Negativt belopp (retur)',
          timestamp: `${yesterday}T16:20:00.000Z`,
        },
        {
          id: 'tx-ext-3',
          amount: 0,
          type: 'expense',
          category: 'Mat & Dryck',
          merchant: 'Bonuscheck 0 kr',
          note: 'Nollställt belopp',
          timestamp: `${twoDaysAgo}T10:00:00.000Z`,
        },
      ] as Transaction[],
    };
  }

  // Default: 'realistic' or 'loading_error'
  return {
    config: baseConfig,
    incomes: [
      {
        id: 'inc-real-1',
        name: 'Lön',
        amount: 34500,
        type: 'fixed',
        frequency: 'monthly',
        category: 'Lön',
        paymentDay: 25,
      },
    ] as Income[],
    fixedExpenses: [
      {
        id: 'fix-real-1',
        name: 'Hyra & Bredband',
        amount: 8900,
        category: 'Boende',
        subcategory: 'Hyra',
        billingDay: 28,
        frequency: 'monthly',
      },
      {
        id: 'fix-real-2',
        name: 'Spotify Duo',
        amount: 169,
        category: 'Nöje',
        subcategory: 'Musik',
        billingDay: 15,
        frequency: 'monthly',
      },
      {
        id: 'fix-real-3',
        name: 'Netflix Standard',
        amount: 149,
        category: 'Nöje',
        subcategory: 'Streaming',
        billingDay: 15,
        frequency: 'monthly',
        isCancelled: true,
        cancelledAt: todayIso,
        hasRemainingPayment: true,
        finalPaymentDate: nextMonthDate,
        finalPaymentAmount: 149,
        cancellationEndDate: nextMonthEnd,
      },
      {
        id: 'fix-real-4',
        name: 'Viaplay Film & Serier',
        amount: 159,
        category: 'Nöje',
        subcategory: 'Streaming',
        billingDay: 10,
        frequency: 'monthly',
        isCancelled: true,
        cancelledAt: yesterday,
        hasRemainingPayment: false,
      },
    ] as FixedExpense[],
    transactions: [
      {
        id: 'tx-real-1',
        amount: 485,
        type: 'expense',
        category: 'Mat & Dryck',
        subcategory: 'Matbutik',
        merchant: 'ICA Kvantum',
        note: 'Middag och frukost',
        timestamp: `${todayIso}T17:15:00.000Z`,
      },
      {
        id: 'tx-real-2',
        amount: 135,
        type: 'expense',
        category: 'Mat & Dryck',
        subcategory: 'Restaurang & Café',
        merchant: 'Espresso House',
        note: 'Kaffe och smörgås',
        timestamp: `${yesterday}T09:40:00.000Z`,
      },
      {
        id: 'tx-real-3',
        amount: 599,
        type: 'expense',
        category: 'Shopping',
        subcategory: 'Kläder',
        merchant: 'Arket',
        note: 'Tröja',
        timestamp: `${twoDaysAgo}T13:10:00.000Z`,
        isStarred: true,
      },
    ] as Transaction[],
  };
}

export function DesignLibraryView() {
  // --- Huvudnavigering & Underkategorier (för att slippa långa röriga listor) ---
  const [activeSection, setActiveSection] = useState<LibrarySection>('components');
  const [foundationTab, setFoundationTab] = useState<FoundationSubTab>('colors');
  const [componentTab, setComponentTab] = useState<ComponentSubTab>('buttons');
  const [overlayTab, setOverlayTab] = useState<OverlayCategoryTab>('subscriptions');
  const [flowCategoryTab, setFlowCategoryTab] = useState<FlowCategoryTab>('main_views');

  // --- Kontroller & Filter ---
  const [searchQuery, setSearchQuery] = useState('');
  const [showControlsPanel, setShowControlsPanel] = useState(false);
  const [showTechDetails, setShowTechDetails] = useState(true);

  const [libraryTheme, setLibraryTheme] = useState<LibraryTheme>(() => {
    if (document.documentElement.classList.contains('theme-black')) return 'black';
    if (document.documentElement.classList.contains('dark')) return 'dark';
    return 'light';
  });
  const [libraryAccent, setLibraryAccent] = useState<string>(DEJZ_SIGNATURE_COLOR);
  const [viewport, setViewport] = useState<PreviewViewport>('desktop');
  const [testPreset, setTestPreset] = useState<TestDataPreset>('realistic');
  const [stateMode, setStateMode] = useState<InteractiveStateMode>('normal');

  // --- Isolated Sandbox State ---
  const initialData = useMemo(() => buildSandboxDataset(testPreset), [testPreset]);
  const [sandboxConfig, setSandboxConfig] = useState<Config>(initialData.config);
  const [sandboxIncomes, setSandboxIncomes] = useState<Income[]>(initialData.incomes);
  const [sandboxFixedExpenses, setSandboxFixedExpenses] = useState<FixedExpense[]>(initialData.fixedExpenses);
  const [sandboxTransactions, setSandboxTransactions] = useState<Transaction[]>(initialData.transactions);
  const [sandboxToasts, setSandboxToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const next = buildSandboxDataset(testPreset);
    setSandboxConfig(next.config);
    setSandboxIncomes(next.incomes);
    setSandboxFixedExpenses(next.fixedExpenses);
    setSandboxTransactions(next.transactions);
  }, [testPreset]);

  const addSandboxToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `sb-toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setSandboxToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissSandboxToast = useCallback((id: string) => {
    setSandboxToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const dict = translations[sandboxConfig.language || 'sv'] || translations.sv;
    return (dict as Record<string, string>)[key] || (translations.sv as Record<string, string>)[key] || String(key);
  }, [sandboxConfig.language]);

  // --- Isolated Theme & Accent Application (Restores user's saved theme on unmount) ---
  const initialDomStateRef = useRef<{
    isDark: boolean;
    isBlack: boolean;
    savedThemeColor: string;
  } | null>(null);

  if (!initialDomStateRef.current && typeof document !== 'undefined') {
    initialDomStateRef.current = {
      isDark: document.documentElement.classList.contains('dark'),
      isBlack: document.documentElement.classList.contains('theme-black'),
      savedThemeColor: localStorage.getItem('dejz_theme_color') || DEJZ_SIGNATURE_COLOR,
    };
  }

  useEffect(() => {
    const root = document.documentElement;
    if (libraryTheme === 'black') {
      root.classList.add('dark', 'theme-black');
    } else if (libraryTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('theme-black');
    } else {
      root.classList.remove('dark', 'theme-black');
    }
    applyLibraryAccentPreview(libraryAccent, libraryTheme === 'dark' || libraryTheme === 'black');
  }, [libraryTheme, libraryAccent]);

  useEffect(() => {
    const snapshot = initialDomStateRef.current;
    return () => {
      if (!snapshot) return;
      const root = document.documentElement;
      if (snapshot.isBlack) {
        root.classList.add('dark', 'theme-black');
      } else if (snapshot.isDark) {
        root.classList.add('dark');
        root.classList.remove('theme-black');
      } else {
        root.classList.remove('dark', 'theme-black');
      }
      applyThemeColor(snapshot.savedThemeColor, snapshot.isDark || snapshot.isBlack);
    };
  }, []);

  // --- Live Computed CSS Variables & Typography Inspector ---
  const [computedColors, setComputedColors] = useState<Record<string, string>>({});
  const [computedRadii, setComputedRadii] = useState<Record<string, string>>({});
  const typographyRefs = useRef<Record<string, HTMLElement | null>>({});
  const [computedTypography, setComputedTypography] = useState<
    Record<string, { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string }>
  >({});

  useEffect(() => {
    const timer = setTimeout(() => {
      const rootStyles = getComputedStyle(document.documentElement);
      const nextColors: Record<string, string> = {};
      for (const item of COLOR_TOKENS_METADATA) {
        nextColors[item.cssVar] = rootStyles.getPropertyValue(item.cssVar).trim();
      }
      setComputedColors(nextColors);

      const radiusVars = [
        '--radius-card',
        '--radius-nested',
        '--radius-control',
        '--radius-modal',
        '--radius-sheet',
        '--radius-pill',
        '--control-height-sm',
        '--control-height',
        '--control-height-lg',
      ];
      const nextRadii: Record<string, string> = {};
      for (const rv of radiusVars) {
        nextRadii[rv] = rootStyles.getPropertyValue(rv).trim();
      }
      setComputedRadii(nextRadii);

      const nextTypo: Record<string, { fontFamily: string; fontSize: string; fontWeight: string; lineHeight: string }> = {};
      for (const role of TYPOGRAPHY_ROLES) {
        const el = typographyRefs.current[role.label];
        if (el) {
          const cs = getComputedStyle(el);
          nextTypo[role.label] = {
            fontFamily: cs.fontFamily.split(',')[0].replace(/['"]/g, ''),
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            lineHeight: cs.lineHeight,
          };
        }
      }
      setComputedTypography(nextTypo);
    }, 40);
    return () => clearTimeout(timer);
  }, [libraryTheme, libraryAccent, activeSection, foundationTab]);

  // --- Interactive Component Demo State ---
  const [demoInputVal, setDemoInputVal] = useState('ICA Kvantum');
  const [demoSmartAmount, setDemoSmartAmount] = useState('485');
  const [demoSearchText, setDemoSearchText] = useState('');
  const [demoSelectVal, setDemoSelectVal] = useState('monthly');
  const [demoSwitchA, setDemoSwitchA] = useState(true);
  const [demoSwitchB, setDemoSwitchB] = useState(false);
  const [demoRadioChoice, setDemoRadioChoice] = useState<'none' | 'remaining'>('remaining');
  const [demoCheckChoice, setDemoCheckChoice] = useState<string[]>(['Mat & Dryck', 'Boende']);
  const [demoSegmented, setDemoSegmented] = useState<'overview' | 'fixed' | 'income'>('overview');
  const [demoFilterGroup, setDemoFilterGroup] = useState<'all' | 'expense' | 'income'>('all');
  const [demoActiveTab, setDemoActiveTab] = useState('today');
  const [demoDate, setDemoDate] = useState<Date>(new Date());

  useEffect(() => {
    if (testPreset === 'empty') {
      setDemoInputVal('');
      setDemoSmartAmount('');
    } else if (testPreset === 'long') {
      setDemoInputVal('Storhandling på ICA Maxi Stormarknad Västra Hamnen inför helgen');
      setDemoSmartAmount('1249,50');
    } else if (testPreset === 'extreme_amounts') {
      setDemoInputVal('Kontantinsats & Renoveringsfaktura');
      setDemoSmartAmount('985420,75');
    } else {
      setDemoInputVal('ICA Kvantum');
      setDemoSmartAmount('485');
    }
  }, [testPreset]);

  // --- Popup & Bottom Sheet Active Launcher State ---
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null);
  const [editingFixed, setEditingFixed] = useState<FixedExpense | null>(null);
  const [fixedModalStartInEdit, setFixedModalStartInEdit] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [cancelModalTarget, setCancelModalTarget] = useState<FixedExpense | null>(null);
  const [cancelModalMode, setCancelModalMode] = useState<'register' | 'help'>('register');

  // --- Page & Flow Sandbox State ---
  const [activeFlowId, setActiveFlowId] = useState<
    | 'today_active'
    | 'budget_fixed'
    | 'transactions_log'
    | 'analysis'
    | 'today_new'
    | 'budget_categories'
    | 'auth_register'
    | 'landing'
    | 'debts'
    | 'shared_budget'
    | 'profile_settings'
    | 'pin_lock'
  >('today_active');

  // Computed sandbox stats
  const sandboxStats = useMemo(() => {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalDays = periodEnd.getDate();
    const daysLeft = Math.max(1, totalDays - now.getDate() + 1);

    const totalIncome = sandboxIncomes.reduce((acc, inc) => acc + (Number(inc.amount) || 0), 0);
    const totalFixed = sandboxFixedExpenses
      .filter((fe) => !(fe.isCancelled && fe.hasRemainingPayment === false))
      .reduce((acc, fe) => acc + (Number(fe.amount) || 0), 0);
    const spentTotal = sandboxTransactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
    const spentToday = sandboxTransactions
      .filter((tx) => tx.type === 'expense' && tx.timestamp.startsWith(now.toISOString().split('T')[0]))
      .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);

    const monthlyBudget = Math.max(0, totalIncome - totalFixed);
    const remainingBudget = monthlyBudget - spentTotal;
    const dailyAvailable = Math.round(remainingBudget / daysLeft);

    return {
      totalIncome,
      totalFixed,
      monthlySavings: 0,
      monthlySavingsList: [],
      disposableIncome: monthlyBudget,
      monthlyBudget,
      remainingBudget,
      spentTotal,
      spentToday,
      dailyAvailable,
      dailyGoal: sandboxConfig.dailyGoal || dailyAvailable,
      daysLeft,
      totalDays,
      periodStart,
      periodEnd,
      categoryBreakdown: {},
    };
  }, [sandboxIncomes, sandboxFixedExpenses, sandboxTransactions, sandboxConfig.dailyGoal]);

  const sandboxPeriods = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return [
      {
        id: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        label: now.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' }),
        start,
        end,
        isCurrent: true,
      },
    ];
  }, []);

  const isSearching = searchQuery.trim().length > 0;

  const matchesSearch = useCallback(
    (keywords: string[]) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return keywords.some((kw) => kw.toLowerCase().includes(q));
    },
    [searchQuery]
  );

  const previewWidthClass =
    viewport === 'mobile'
      ? 'max-w-[390px] mx-auto border-x border-[var(--border-subtle)] px-3 sm:px-4 py-4 rounded-card bg-[var(--bg-color)] shadow-card transition-all duration-200'
      : viewport === 'tablet'
      ? 'max-w-[768px] mx-auto border-x border-[var(--border-subtle)] px-5 py-5 rounded-card bg-[var(--bg-color)] shadow-card transition-all duration-200'
      : 'w-full transition-all duration-200';

  const isDisabledState = stateMode === 'disabled' || testPreset === 'loading_error';
  const isErrorState = stateMode === 'error' || testPreset === 'loading_error';
  const isSelectedState = stateMode === 'selected';
  const isFocusState = stateMode === 'focus';

  const POPUP_ITEMS = [
    // Grupp 1: Fasta utgifter & Uppsägning
    {
      id: 'cancel_subscription_register',
      category: 'subscriptions' as const,
      title: 'Registrera uppsägning',
      subtitle: 'När en användare markerar ett aktivt abonnemang som uppsagt',
      source: 'src/components/CancelSubscriptionModal.tsx',
      usedIn: 'Ekonomi (BudgetView), Fast utgift-detaljvy',
      desc: 'Frågar om betalningar återstår, sista betalningsdatum, valfritt slutdatum och visar tydlig sammanfattning.',
      onOpen: () => {
        setCancelModalTarget(
          sandboxFixedExpenses.find((e) => !e.isCancelled) || {
            id: 'demo-spotify',
            name: 'Spotify Duo',
            amount: 169,
            category: 'Nöje',
            billingDay: 15,
            frequency: 'monthly',
          }
        );
        setCancelModalMode('register');
        setActiveOverlay('cancel_subscription');
      },
    },
    {
      id: 'cancel_subscription_edit',
      category: 'subscriptions' as const,
      title: 'Ändra eller ångra uppsägning',
      subtitle: 'När ett abonnemang redan är markerat som uppsagt',
      source: 'src/components/CancelSubscriptionModal.tsx',
      usedIn: 'Ekonomi (BudgetView), Fast utgift ("Ändra")',
      desc: 'Öppnar sparade uppsägningsuppgifter med möjlighet att uppdatera datum eller välja ”Återställ till aktiv i Dejz”.',
      onOpen: () => {
        setCancelModalTarget(
          sandboxFixedExpenses.find((e) => e.isCancelled) || {
            id: 'demo-netflix',
            name: 'Netflix Standard',
            amount: 149,
            category: 'Nöje',
            billingDay: 15,
            frequency: 'monthly',
            isCancelled: true,
            hasRemainingPayment: true,
            finalPaymentDate: '2026-11-15',
            finalPaymentAmount: 149,
            cancellationEndDate: '2026-11-20',
          }
        );
        setCancelModalMode('register');
        setActiveOverlay('cancel_subscription');
      },
    },
    {
      id: 'cancel_subscription_help',
      category: 'subscriptions' as const,
      title: 'Så säger du upp (Uppsägningshjälp)',
      subtitle: 'Hjälpvy med instruktioner och länk till tjänsten',
      source: 'src/components/CancelSubscriptionModal.tsx (mode="help")',
      usedIn: 'Fast utgift ("Så säger du upp")',
      desc: 'Visar steg-för-steg hur man säger upp hos leverantören utan att automatiskt ändra status i Dejz.',
      onOpen: () => {
        setCancelModalTarget({
          id: 'demo-spotify',
          name: 'Spotify',
          amount: 169,
          category: 'Nöje',
          billingDay: 15,
          frequency: 'monthly',
        });
        setCancelModalMode('help');
        setActiveOverlay('cancel_subscription');
      },
    },
    {
      id: 'fixed_expense_preview',
      category: 'subscriptions' as const,
      title: 'Fast utgift (Detaljvy & Redigera)',
      subtitle: 'Visar en fast utgift eller ett abonnemang',
      source: 'src/components/BudgetModals.tsx (FixedExpenseModal)',
      usedIn: 'Ekonomi (BudgetView), Hem (TodayView)',
      desc: 'Har gemensam statusrad (”Aktiv · Markera som uppsagd” eller ”Uppsagd · Ändra”) och redigeringsläge.',
      onOpen: () => {
        setEditingFixed(
          sandboxFixedExpenses[0] || {
            id: 'demo-spotify',
            name: 'Spotify Duo',
            amount: 169,
            category: 'Nöje',
            billingDay: 15,
            frequency: 'monthly',
          }
        );
        setFixedModalStartInEdit(false);
        setActiveOverlay('fixed_expense');
      },
    },
    {
      id: 'cancelled_list',
      category: 'subscriptions' as const,
      title: 'Uppsagda & avslutade abonnemang',
      subtitle: 'Historik över uppsagda tjänster',
      source: 'src/components/CancelledSubscriptionsModal.tsx',
      usedIn: 'Ekonomi (BudgetView)',
      desc: 'Samlar alla uppsagda och avslutade abonnemang med möjlighet att återaktivera eller ta bort.',
      onOpen: () => setActiveOverlay('cancelled_subscriptions'),
    },

    // Grupp 2: Transaktioner & Sök
    {
      id: 'transaction_form',
      category: 'transactions' as const,
      title: 'Lägg till / Redigera transaktion',
      subtitle: 'Formuläret som öppnas från plusknappen',
      source: 'src/components/TransactionModal.tsx',
      usedIn: 'Bottenmenyn (+), Hem, Historik',
      desc: 'Registrera utgift eller inkomst med belopp, kategori, datum och kvittoskanning.',
      onOpen: () => {
        setEditingTx(null);
        setActiveOverlay('transaction_form');
      },
    },
    {
      id: 'transaction_view',
      category: 'transactions' as const,
      title: 'Förhandsgranska transaktion',
      subtitle: 'Detaljvy när man klickar på ett köp i listan',
      source: 'src/components/TransactionViewModal.tsx',
      usedIn: 'Hem, Historik, Insikter',
      desc: 'Visar butik, kategori, datum och knappar för att redigera eller radera.',
      onOpen: () => {
        setViewingTx(
          sandboxTransactions[0] || {
            id: 'tx-demo-1',
            amount: 485,
            type: 'expense',
            category: 'Mat & Dryck',
            subcategory: 'Matbutik',
            merchant: 'ICA Kvantum',
            note: 'Veckohandling',
            timestamp: new Date().toISOString(),
          }
        );
        setActiveOverlay('transaction_view');
      },
    },
    {
      id: 'search',
      category: 'transactions' as const,
      title: 'Global sökning',
      subtitle: 'Sökfönstret från förstoringsglaset i toppen',
      source: 'src/components/SearchModal.tsx',
      usedIn: 'Toppbar (AppHeader)',
      desc: 'Sök direkt bland alla transaktioner, fasta utgifter och inkomster.',
      onOpen: () => setActiveOverlay('search'),
    },

    // Grupp 3: Budget, Kategorier & Datum
    {
      id: 'income_modal',
      category: 'budget_dates' as const,
      title: 'Lägg till / Redigera inkomst',
      subtitle: 'Hantera lön och andra inkomster',
      source: 'src/components/BudgetModals.tsx (IncomeModal)',
      usedIn: 'Ekonomi (BudgetView), Hem',
      desc: 'Detaljvy och formulär för fasta och rörliga inkomster.',
      onOpen: () => {
        setEditingIncome(sandboxIncomes[0] || null);
        setActiveOverlay('income_modal');
      },
    },
    {
      id: 'variable_amount',
      category: 'budget_dates' as const,
      title: 'Uppdatera rörligt belopp',
      subtitle: 'Frågar efter månadens faktiska kostnad',
      source: 'src/components/VariableAmountUpdateModal.tsx',
      usedIn: 'Hem (vid ny period för t.ex. elräkning)',
      desc: 'Snabbdialog för att fylla i månadens belopp på en rörlig fast utgift.',
      onOpen: () => setActiveOverlay('variable_amount'),
    },
    {
      id: 'category_sheet',
      category: 'budget_dates' as const,
      title: 'Välj kategori & underkategori',
      subtitle: 'Bottom sheet vid val av kategori',
      source: 'src/components/CategoryBottomSheetModal.tsx',
      usedIn: 'Transaktionsformulär, Hem',
      desc: 'Visar alla kategorier med ikoner och tillhörande underkategorier.',
      onOpen: () => setActiveOverlay('category_sheet'),
    },
    {
      id: 'category_modal',
      category: 'budget_dates' as const,
      title: 'Skapa / Redigera kategori',
      subtitle: 'Anpassa kategorinamn, färg och ikon',
      source: 'src/components/CategoryModal.tsx',
      usedIn: 'Kategoribudgetar (BudgetCategoriesView)',
      desc: 'Formulär för att skapa nya kategorier eller lägga till underkategorier.',
      onOpen: () => setActiveOverlay('category_modal'),
    },
    {
      id: 'calendar',
      category: 'budget_dates' as const,
      title: 'Datumväljare (Kalender)',
      subtitle: 'Månadskalender för val av datum',
      source: 'src/components/CalendarModal.tsx',
      usedIn: 'Transaktioner, Uppsägning, Insikter',
      desc: 'Välj transaktionsdatum eller sista betalningsdatum.',
      onOpen: () => setActiveOverlay('calendar'),
    },
    {
      id: 'period_selector',
      category: 'budget_dates' as const,
      title: 'Välj budgetperiod',
      subtitle: 'Byt mellan aktuell och tidigare månader',
      source: 'src/components/PeriodSelectorModal.tsx',
      usedIn: 'Hem, Historik, Insikter',
      desc: 'Lista över budgetperioder baserat på vald lönedag.',
      onOpen: () => setActiveOverlay('period_selector'),
    },

    // Grupp 4: Konto, Onboarding & System
    {
      id: 'onboarding',
      category: 'account_system' as const,
      title: 'Onboarding (Välkomstflöde)',
      subtitle: 'Visas första gången man skapar konto',
      source: 'src/components/OnboardingModal.tsx',
      usedIn: 'Appstart för nya användare',
      desc: 'Steg-för-steg-inställning av valuta, lönedag och första inkomst.',
      onOpen: () => setActiveOverlay('onboarding'),
    },
    {
      id: 'security',
      category: 'account_system' as const,
      title: 'Säkerhet & App-lås',
      subtitle: 'PIN-kod och biometrisk inloggning',
      source: 'src/components/SecurityModal.tsx',
      usedIn: 'Inställningar',
      desc: 'Hantera 4-siffrig PIN-kod med inbyggd PIN-skärm.',
      onOpen: () => setActiveOverlay('security'),
    },
    {
      id: 'feedback',
      category: 'account_system' as const,
      title: 'Skicka feedback',
      subtitle: 'Rapportera bugg eller skicka förslag',
      source: 'src/components/FeedbackModal.tsx',
      usedIn: 'Profil & Inställningar',
      desc: 'Formulär med kategorival (Bugg, Idé, Övrigt) – skickar inget skarpt i testläget.',
      onOpen: () => setActiveOverlay('feedback'),
    },
    {
      id: 'confirm_destructive',
      category: 'account_system' as const,
      title: 'Bekräftelsedialog (Ta bort)',
      subtitle: 'Frågar ”Är du säker?” vid radering',
      source: 'src/components/ConfirmModal.tsx',
      usedIn: 'Hela appen vid radering',
      desc: 'Standardmodal med varningsfärg för att förhindra oavsiktlig borttagning.',
      onOpen: () => setActiveOverlay('confirm_destructive'),
    },
    {
      id: 'delete_account',
      category: 'account_system' as const,
      title: 'Radera konto',
      subtitle: 'Säkerhetsbekräftelse för att ta bort konto',
      source: 'src/components/DeleteAccountModal.tsx',
      usedIn: 'Inställningar',
      desc: 'Kräver att man skriver ”RADERA” (helt simulerat här i biblioteket).',
      onOpen: () => setActiveOverlay('delete_account'),
    },
    {
      id: 'base_bottom_sheet',
      category: 'account_system' as const,
      title: 'Bas-BottomSheet (Grundkomponent)',
      subtitle: 'Appens gemensamma bottom sheet-ram',
      source: 'src/components/ui/BottomSheet.tsx',
      usedIn: 'Grund för alla bottom sheets',
      desc: 'Visar drag-handtag, rubrik, valbara rader (BottomSheetOption) och fast knapprad längst ner.',
      onOpen: () => setActiveOverlay('base_bottom_sheet'),
    },
  ];

  const FLOW_ITEMS = [
    // Huvudsidor
    {
      id: 'today_active' as const,
      category: 'main_views' as const,
      label: 'Hem (Aktiv budget)',
      source: 'src/components/TodayView.tsx',
      desc: 'Startsidan med ”Kvar per dag”, kategoribudgetar och senaste köp.',
      tryHint: 'Klicka på en transaktion i listan eller lägg till ett nytt köp.',
    },
    {
      id: 'budget_fixed' as const,
      category: 'main_views' as const,
      label: 'Ekonomi (Inkomster & Fasta utgifter)',
      source: 'src/components/BudgetView.tsx',
      desc: 'Översikt över lön, räkningar samt aktiva och uppsagda abonnemang.',
      tryHint: 'Klicka på Spotify eller Netflix i listan för att testa uppsägningsflödet!',
    },
    {
      id: 'transactions_log' as const,
      category: 'main_views' as const,
      label: 'Historik (Alla transaktioner)',
      source: 'src/components/LogView.tsx',
      desc: 'Sökbar och filtrerbar lista över alla inkomster och utgifter.',
      tryHint: 'Testa att filtrera på kategori eller klicka på en rad för att redigera.',
    },
    {
      id: 'analysis' as const,
      category: 'main_views' as const,
      label: 'Insikter & Analys',
      source: 'src/components/AnalysisView.tsx',
      desc: 'Diagram och sammanställning av vad pengarna går till.',
      tryHint: 'Inspektera utgiftsfördelningen med olika testdata-paket.',
    },

    // Viktiga flöden
    {
      id: 'today_new' as const,
      category: 'key_flows' as const,
      label: 'Nytt konto – ”Sätt upp din budget”',
      source: 'src/components/TodayView.tsx (budgetSetupCompleted=false)',
      desc: 'Så ser Hem ut för en ny användare innan budgeten är skapad (inga tomma 0 kr-kategorier visas).',
      tryHint: 'Klicka på kortet ”Sätt upp din budget” för att gå vidare till budgetuppsättningen.',
    },
    {
      id: 'budget_categories' as const,
      category: 'key_flows' as const,
      label: 'Sätta upp kategoribudgetar',
      source: 'src/components/BudgetCategoriesView.tsx',
      desc: 'Fördela månadsbudget på kategorier och skapa egna kategorier.',
      tryHint: 'Ändra belopp på en kategori och klicka på Spara.',
    },
    {
      id: 'auth_register' as const,
      category: 'key_flows' as const,
      label: 'Registrering & Inloggning',
      source: 'src/components/Auth.tsx',
      desc: 'Skapa konto, logga in eller återställ lösenord (helt isolerat utan mejlutskick).',
      tryHint: 'Växla mellan ”Logga in” och ”Skapa konto” eller prova språkvalet.',
    },
    {
      id: 'landing' as const,
      category: 'key_flows' as const,
      label: 'Publik Landningssida',
      source: 'src/components/LandingPage.tsx',
      desc: 'Förstasidan som besökare ser innan de loggar in.',
      tryHint: 'Klicka på ”Kom igång” för att testa övergången till registrering.',
    },

    // Övriga vyer
    {
      id: 'debts' as const,
      category: 'other_views' as const,
      label: 'Skulder & Lån',
      source: 'src/components/DebtsView.tsx',
      desc: 'Håll koll på privatlån och avbetalningar.',
      tryHint: 'Lägg till en ny skuld eller registrera en delbetalning.',
    },
    {
      id: 'shared_budget' as const,
      category: 'other_views' as const,
      label: 'Delad ekonomi',
      source: 'src/components/SharedBudgetView.tsx',
      desc: 'Fördela gemensamma utgifter mellan två personer.',
      tryHint: 'Testa uträkningen för delade utgifter.',
    },
    {
      id: 'profile_settings' as const,
      category: 'other_views' as const,
      label: 'Utseende- & Appinställningar',
      source: 'src/components/SettingsView.tsx',
      desc: 'Inställningsvy för tema, accentfärg och lönedag.',
      tryHint: 'Testa inställningsraderna i sandlådan.',
    },
    {
      id: 'pin_lock' as const,
      category: 'other_views' as const,
      label: 'PIN-låsskärm',
      source: 'src/components/PinLockScreen.tsx',
      desc: 'Skärmen som låser upp appen med 4-siffrig kod.',
      tryHint: 'Knappa in valfria 4 siffror på knappsatsen.',
    },
  ];

  const activeAccentLabel =
    LIBRARY_ACCENT_OPTIONS.find((a) => a.value === libraryAccent)?.label || 'Signatur';
  const activeFlowMeta = FLOW_ITEMS.find((f) => f.id === activeFlowId) || FLOW_ITEMS[0];

  return (
    <div className="space-y-4 pb-20 text-left">
      {/* Sandbox Toast Feedback */}
      <ToastContainer toasts={sandboxToasts} onDismiss={dismissSandboxToast} />

      {/* ================================================================== */}
      {/* STEG 1: TYDLIG TOPPNAVIGATION & KOMPAKT VERKTYGSRAD                */}
      {/* ================================================================== */}
      <Card variant="elevated" padding="md" className="sticky top-2 z-30 backdrop-blur-xl bg-[var(--surface-color)]/95 space-y-3">
        {/* Rad 1: De 4 huvuddelarna i biblioteket */}
        <SegmentedControl
          value={activeSection}
          onChange={(val) => {
            setActiveSection(val);
            if (searchQuery) setSearchQuery('');
          }}
          options={[
            { value: 'foundations', label: '1. Grundstil' },
            { value: 'components', label: '2. Komponenter' },
            { value: 'overlays', label: '3. Popups (20)' },
            { value: 'pages', label: '4. Sidor & Flöden' },
          ]}
        />

        {/* Rad 2: Sökfält + Snabbknapp för Utseende, Skärmbredd & Testdata */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök t.ex. knapp, uppsägning, kalender, färg..."
              icon={<Search size={16} />}
              suffix={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1"
                  >
                    Rensa
                  </button>
                ) : undefined
              }
            />
          </div>

          <button
            type="button"
            onClick={() => setShowControlsPanel((prev) => !prev)}
            className={`h-[var(--control-height)] px-3.5 rounded-control border text-xs font-bold flex items-center justify-between sm:justify-center gap-2 shrink-0 transition-all ${
              showControlsPanel
                ? 'border-[var(--accent-color)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-nested)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <Sliders size={14} className="text-[var(--accent-color)]" />
              <span>Tema, Bredd & Testdata</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--surface-color)] text-[11px] font-medium text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              {libraryTheme === 'light' ? 'Light' : libraryTheme === 'dark' ? 'Dark' : 'Black'} · {activeAccentLabel} ·{' '}
              {viewport === 'mobile' ? 'Mobil' : viewport === 'tablet' ? 'Platta' : 'Dator'}
            </span>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] transition-transform ${showControlsPanel ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Utfällbar panel för Tema, Accent, Skärmbredd, Testdata och Kod-info */}
        {showControlsPanel && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 1. Tema */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                  Tema (ändrar inte sparade inställningar)
                </span>
                <SegmentedControl
                  size="sm"
                  value={libraryTheme}
                  onChange={setLibraryTheme}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'black', label: 'Black' },
                  ]}
                />
              </div>

              {/* 2. Förhandsgranskningsbredd */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                  Skärmbredd
                </span>
                <SegmentedControl
                  size="sm"
                  value={viewport}
                  onChange={setViewport}
                  options={[
                    { value: 'mobile', label: 'Mobil (390px)', icon: <Smartphone size={13} /> },
                    { value: 'tablet', label: 'Platta (768px)', icon: <Tablet size={13} /> },
                    { value: 'desktop', label: 'Dator (100%)', icon: <Monitor size={13} /> },
                  ]}
                />
              </div>

              {/* 3. Testdata */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Exempeldata i sandlådan
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const fresh = buildSandboxDataset(testPreset);
                      setSandboxConfig(fresh.config);
                      setSandboxIncomes(fresh.incomes);
                      setSandboxFixedExpenses(fresh.fixedExpenses);
                      setSandboxTransactions(fresh.transactions);
                      addSandboxToast('Exempeldata återställd.', 'info');
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-color)] hover:underline"
                  >
                    <RotateCcw size={11} />
                    Återställ
                  </button>
                </div>
                <Select
                  value={testPreset}
                  onChange={(e) => setTestPreset(e.target.value as TestDataPreset)}
                  options={[
                    { value: 'realistic', label: 'Realistiskt innehåll (Standard)' },
                    { value: 'empty', label: 'Tomt innehåll (Nytt konto)' },
                    { value: 'long', label: 'Långa namn och texter' },
                    { value: 'extreme_amounts', label: 'Stora, negativa och 0 kr-belopp' },
                    { value: 'loading_error', label: 'Laddning och felmeddelanden' },
                  ]}
                />
              </div>
            </div>

            {/* Accentfärg + Visa/dölj teknisk filinfo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
                  Accentfärg:
                </span>
                {LIBRARY_ACCENT_OPTIONS.map((acc) => {
                  const isSelected = libraryAccent === acc.value;
                  const swatchBg = acc.value === 'neutral' ? 'var(--text-primary)' : acc.value;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setLibraryAccent(acc.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'border-[var(--accent-color)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-nested)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                        style={{ backgroundColor: swatchBg }}
                      />
                      <span>{acc.label}</span>
                    </button>
                  );
                })}
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none">
                <Switch checked={showTechDetails} onChange={setShowTechDetails} />
                <span>Visa filnamn & var komponenten används</span>
              </label>
            </div>
          </div>
        )}
      </Card>

      {/* Sök-indikator när man söker */}
      {isSearching && (
        <div className="flex items-center justify-between px-3 py-2 rounded-card-nested bg-[var(--accent-soft)] border border-[var(--accent-color)]/30 text-xs">
          <span className="font-semibold text-[var(--text-primary)]">
            Visar sökträffar i hela designbiblioteket för ”{searchQuery}”
          </span>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="font-bold text-[var(--accent-color)] hover:underline"
          >
            Avsluta sökning
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEG 2: UNDERKATEGORIER FÖR VALD SEKTION (GÖR DET LÄTTÖVERSKÅDLIGT)*/}
      {/* ================================================================== */}
      {!isSearching && activeSection === 'foundations' && (
        <Card variant="nested" padding="md" className="space-y-2">
          <div className="text-xs font-bold text-[var(--text-secondary)]">
            Välj del av grundstilen att granska:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'colors' as const, label: 'Färger & Ytor' },
              { id: 'typography' as const, label: 'Typsnitt & Textstorlekar' },
              { id: 'shapes' as const, label: 'Hörnradier, Höjder & Skuggor' },
            ].map((sub) => (
              <Pill
                key={sub.id}
                active={foundationTab === sub.id}
                onClick={() => setFoundationTab(sub.id)}
              >
                {sub.label}
              </Pill>
            ))}
          </div>
        </Card>
      )}

      {!isSearching && activeSection === 'components' && (
        <Card variant="nested" padding="md" className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-[var(--text-secondary)]">
              Välj komponentgrupp:
            </span>
            {/* Interaktiv tillståndsväljare */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] mr-1">
                Testa tillstånd:
              </span>
              {([
                { value: 'normal', label: 'Normalt' },
                { value: 'selected', label: 'Valt' },
                { value: 'disabled', label: 'Inaktiverat' },
                { value: 'error', label: 'Fel' },
                { value: 'focus', label: 'Fokus' },
              ] as const).map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setStateMode(st.value)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all ${
                    stateMode === st.value
                      ? 'border-[var(--accent-color)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-color)] text-[var(--text-secondary)]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { id: 'buttons' as const, label: 'Knappar' },
              { id: 'inputs' as const, label: 'Text-, Belopp- & Sökfält' },
              { id: 'selection' as const, label: 'Val, Switchar & Flikar' },
              { id: 'cards_lists' as const, label: 'Kort & Listrader' },
              { id: 'navigation' as const, label: 'Navigation & Headers' },
              { id: 'feedback' as const, label: 'Tomlägen, Laddning & Toasts' },
              { id: 'all' as const, label: 'Visa alla samtidigt' },
            ].map((sub) => (
              <Pill
                key={sub.id}
                active={componentTab === sub.id}
                onClick={() => setComponentTab(sub.id)}
              >
                {sub.label}
              </Pill>
            ))}
          </div>
        </Card>
      )}

      {!isSearching && activeSection === 'overlays' && (
        <Card variant="nested" padding="md" className="space-y-2">
          <div className="text-xs font-bold text-[var(--text-secondary)]">
            Välj kategori av popupfönster & bottom sheets:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'subscriptions' as const, label: 'Fasta utgifter & Uppsägning (5)' },
              { id: 'transactions' as const, label: 'Transaktioner & Sök (3)' },
              { id: 'budget_dates' as const, label: 'Budget, Kategorier & Datum (6)' },
              { id: 'account_system' as const, label: 'Konto, Säkerhet & System (6)' },
              { id: 'all' as const, label: 'Visa alla (20)' },
            ].map((sub) => (
              <Pill
                key={sub.id}
                active={overlayTab === sub.id}
                onClick={() => setOverlayTab(sub.id)}
              >
                {sub.label}
              </Pill>
            ))}
          </div>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEG 3: INNEHÅLLSYTA (ANPASSAS EFTER VALD SKÄRMBREDD)              */}
      {/* ================================================================== */}
      <div className={previewWidthClass}>
        {/* ================================================================ */}
        {/* 1. GRUNDSTIL                                                     */}
        {/* ================================================================ */}
        {(activeSection === 'foundations' || isSearching) && (
          <div className="space-y-5 mb-6">
            {/* 1.1 Färger */}
            {(foundationTab === 'colors' || isSearching) &&
              matchesSearch(['färger', 'colors', 'grundstil', 'tema', 'accent', 'bakgrund', 'surface', 'text', 'border']) && (
                <SectionCard
                  title="Färger & Ytor"
                  description={`Aktuella färgkoder läses av live från valt tema (${libraryTheme.toUpperCase()}) och accent (${activeAccentLabel}).`}
                  sourcePath="src/index.css & src/utils/theme.ts"
                  usedIn={['Hela appen', 'Light / Dark / Black theme']}
                  showTechDetails={showTechDetails}
                >
                  <div className="space-y-5">
                    {(['Ytor & Bakgrund', 'Text & Ikoner', 'Accent & Status', 'Linjer & Kontroller'] as const).map((groupName) => (
                      <div key={groupName}>
                        <h4 className="text-section-header mb-2">{groupName}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {COLOR_TOKENS_METADATA.filter((c) => c.group === groupName).map((token) => {
                            const liveVal = computedColors[token.cssVar] || '—';
                            return (
                              <div
                                key={token.cssVar}
                                className="flex items-center gap-3 p-3 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-subtle)]"
                              >
                                <div
                                  className="w-10 h-10 rounded-control shrink-0 border border-[var(--border-strong)] shadow-xs"
                                  style={{ background: `var(${token.cssVar})` }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                      {token.name}
                                    </span>
                                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] shrink-0">
                                      {liveVal}
                                    </span>
                                  </div>
                                  <div className="text-caption truncate">{token.usage}</div>
                                  {showTechDetails && (
                                    <div className="text-[10px] font-mono text-[var(--accent-color)] truncate mt-0.5">
                                      {token.cssVar}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}

            {/* 1.2 Typsnitt */}
            {(foundationTab === 'typography' || isSearching) &&
              matchesSearch(['typsnitt', 'typografi', 'font', 'outfit', 'manrope', 'textstorlek', 'rubrik']) && (
                <SectionCard
                  title="Typsnitt, Textstorlekar & Vikter"
                  description="Dejz använder två typsnitt: Outfit för rubriker och belopp, samt Manrope för brödtext och knappar."
                  sourcePath="src/index.css & src/constants/designSystem.ts"
                  usedIn={['Alla sidor och komponenter']}
                  showTechDetails={showTechDetails}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <div className="p-3.5 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-divider)]">
                      <div className="text-caption uppercase font-bold tracking-wider mb-1">Text & Kontroller</div>
                      <div className="font-sans text-lg font-bold text-[var(--text-primary)]">Manrope</div>
                      <div className="text-caption mt-1">Används för brödtext, knappar, formulär, listrader och etiketter.</div>
                    </div>
                    <div className="p-3.5 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-divider)]">
                      <div className="text-caption uppercase font-bold tracking-wider mb-1">Rubriker & Belopp</div>
                      <div className="font-display text-lg font-bold text-[var(--text-primary)]">Outfit</div>
                      <div className="text-caption mt-1">Används för sidrubriker och alla ekonomiska siffror.</div>
                    </div>
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-card-nested overflow-hidden">
                    {TYPOGRAPHY_ROLES.map((role) => {
                      const live = computedTypography[role.label];
                      return (
                        <div key={role.label} className="p-3.5 bg-[var(--surface-color)] flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{role.label}</span>
                            <span className="px-2 py-0.5 rounded bg-[var(--surface-nested)] text-[11px] font-mono text-[var(--text-muted)]">
                              {live ? `${live.fontFamily} · ${live.fontSize} · Vikt ${live.fontWeight}` : role.fontRole}
                            </span>
                          </div>
                          <div
                            ref={(el) => {
                              typographyRefs.current[role.label] = el;
                            }}
                            className={`${role.className} text-[var(--text-primary)]`}
                          >
                            {role.sampleText}
                          </div>
                          <div className="text-caption">{role.usage}</div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              )}

            {/* 1.3 Former, mått & skuggor */}
            {(foundationTab === 'shapes' || isSearching) &&
              matchesSearch(['avstånd', 'hörnradier', 'radius', 'linjer', 'skuggor', 'shadow', 'spacing', 'höjd']) && (
                <SectionCard
                  title="Hörnradier, Höjder, Avstånd & Skuggor"
                  description="Gemensamma mått som styr hur runda kort och knappar är samt hur mycket luft som finns mellan sektioner."
                  sourcePath="src/constants/designSystem.ts & src/index.css"
                  usedIn={['Card', 'Button', 'Input', 'Modal', 'BottomSheet']}
                  showTechDetails={showTechDetails}
                >
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-section-header mb-2.5">Hörnradier</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {[
                          { key: 'card', cssVar: '--radius-card', className: DS.radius.card, label: 'Standardkort' },
                          { key: 'cardNested', cssVar: '--radius-card-nested', className: DS.radius.cardNested, label: 'Inre ruta' },
                          { key: 'button', cssVar: '--radius-button', className: DS.radius.button, label: 'Knapp & Fält' },
                          { key: 'modal', cssVar: '--radius-modal', className: DS.radius.modal, label: 'Popupfönster' },
                          { key: 'modalSheet', cssVar: '--radius-modal', className: DS.radius.modalSheet, label: 'Bottom Sheet' },
                          { key: 'pill', cssVar: '--radius-pill', className: DS.radius.pill, label: 'Pill / Rund knapp' },
                        ].map((r) => (
                          <div
                            key={r.key}
                            className="p-3 bg-[var(--surface-nested)] border border-[var(--border-subtle)] rounded-card-nested flex items-center gap-3"
                          >
                            <div
                              className={`w-10 h-10 bg-[var(--accent-soft)] border-2 border-[var(--accent-color)] shrink-0 ${r.className}`}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-primary)]">{r.label}</div>
                              <div className="text-[11px] font-mono text-[var(--text-secondary)]">
                                {computedRadii[r.cssVar] || r.cssVar}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-subtle)] space-y-2">
                        <h4 className="text-section-header">Fasta höjder (Knappar & Fält)</h4>
                        {Object.entries(DS.heights).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)] last:border-0">
                            <span className="font-semibold text-[var(--text-primary)]">{k}</span>
                            <code className="font-mono text-[11px] text-[var(--accent-color)]">{v}</code>
                          </div>
                        ))}
                      </div>

                      <div className="p-3.5 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-subtle)] space-y-2">
                        <h4 className="text-section-header">Avstånd & Padding</h4>
                        {Object.entries(DS.spacing).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)] last:border-0">
                            <span className="font-semibold text-[var(--text-primary)]">{k}</span>
                            <code className="font-mono text-[11px] text-[var(--text-secondary)]">{v}</code>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-card bg-[var(--surface-color)] border border-[var(--border-divider)] shadow-none">
                        <div className="text-xs font-bold text-[var(--text-primary)]">Ytskugga (.shadow-none)</div>
                        <div className="text-caption mt-1">Standard på vanliga kort (Zero-shadow)</div>
                      </div>
                      <div className="p-4 rounded-card bg-[var(--surface-elevated)] border border-[var(--border-divider)] shadow-subtle">
                        <div className="text-xs font-bold text-[var(--text-primary)]">Subtil (.shadow-subtle)</div>
                        <div className="text-caption mt-1">Används på aktiva flikar, sökfält och sekundärknappar</div>
                      </div>
                      <div className="p-4 rounded-card bg-[var(--surface-elevated)] border border-[var(--border-divider)] shadow-modal">
                        <div className="text-xs font-bold text-[var(--text-primary)]">Modal (.shadow-modal)</div>
                        <div className="text-caption mt-1">Används på popupfönster och bottom sheets</div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 2. KOMPONENTER (UPPDELADE I TYDLIGA GRUPPER)                     */}
        {/* ================================================================ */}
        {(activeSection === 'components' || isSearching) && (
          <div className="space-y-5 mb-6">
            {/* Grupp 1: Knappar */}
            {(componentTab === 'buttons' || componentTab === 'all' || isSearching) &&
              matchesSearch(['knappar', 'button', 'iconbutton', 'ikonknappar', 'primary', 'secondary', 'danger', 'ghost']) && (
                <SectionCard
                  title="Knappar & Ikonknappar"
                  description="Alla klickbara standardknappar och runda/fyrkantiga ikonknappar i appen."
                  sourcePath="src/components/ui/Button.tsx & IconButton.tsx"
                  usedIn={['Alla popupfönster', 'Formulär', 'Toppbar', 'Kort']}
                  showTechDetails={showTechDetails}
                >
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-section-header mb-2.5">Knappstilar (Button)</h4>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {([
                          { v: 'primary', label: 'Primär (Spara / Fortsätt)' },
                          { v: 'secondary', label: 'Sekundär (Avbryt / Val)' },
                          { v: 'outline', label: 'Ram (Outline)' },
                          { v: 'subtle', label: 'Mjuk (Subtle)' },
                          { v: 'ghost', label: 'Textknapp (Ghost)' },
                          { v: 'danger', label: 'Radera (Danger)' },
                        ] as const).map((item) => (
                          <Button
                            key={item.v}
                            variant={item.v}
                            disabled={isDisabledState}
                            loading={testPreset === 'loading_error' && item.v === 'primary'}
                            icon={<Plus size={16} />}
                            className={isFocusState ? 'ring-2 ring-[var(--accent-color)] ring-offset-2' : ''}
                            onClick={() => addSandboxToast(`Klickade på ${item.label}`, 'info')}
                          >
                            {item.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-section-header mb-2.5">Storlekar & Tillstånd</h4>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Button size="xs" variant="secondary">Extra liten (XS)</Button>
                        <Button size="sm" variant="secondary">Liten (SM)</Button>
                        <Button size="md" variant="primary">Standard (MD)</Button>
                        <Button size="lg" variant="primary">Stor (LG)</Button>
                        <Button size="md" variant="primary" loading>Laddar...</Button>
                        <Button size="md" variant="primary" disabled>Inaktiverad</Button>
                      </div>
                    </div>

                    <Divider />

                    <div>
                      <h4 className="text-section-header mb-2.5">Ikonknappar (IconButton)</h4>
                      <div className="flex flex-wrap items-center gap-3">
                        {(['default', 'surface', 'ghost', 'accent', 'danger'] as const).map((v) => (
                          <div key={v} className="flex items-center gap-2 p-2 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-subtle)]">
                            <IconButton
                              variant={v}
                              size="md"
                              disabled={isDisabledState}
                              icon={<Edit2 size={16} />}
                              aria-label={v}
                              onClick={() => addSandboxToast(`Klickade på IconButton (${v})`, 'info')}
                            />
                            <span className="text-xs font-medium text-[var(--text-secondary)] pr-1">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

            {/* Grupp 2: Fält, Dropdowns & Datum */}
            {(componentTab === 'inputs' || componentTab === 'all' || isSearching) &&
              matchesSearch(['textfält', 'input', 'beloppsfält', 'smartinput', 'sökfält', 'search', 'dropdown', 'select', 'datumväljare', 'calendar']) && (
                <>
                  <SectionCard
                    title="Textfält, Beloppsfält & Sökfält"
                    description="Inmatningsfält för namn, belopp (med inbyggd miniräknare) och sökning."
                    sourcePath="src/components/ui/Input.tsx & SmartInput.tsx"
                    usedIn={['Transaktionsformulär', 'Fasta utgifter', 'Inloggning', 'Sök']}
                    showTechDetails={showTechDetails}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Vanligt textfält"
                        placeholder="T.ex. Spotify eller ICA"
                        value={demoInputVal}
                        onChange={(e) => setDemoInputVal(e.target.value)}
                        disabled={isDisabledState}
                        icon={<ShoppingBag size={16} />}
                        helperText="Hjälptext under fältet"
                        error={isErrorState ? 'Detta fält måste fyllas i.' : undefined}
                        className={isFocusState ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-soft)]' : ''}
                      />

                      <Input
                        label="Textfält med felmeddelande"
                        placeholder="Ange belopp..."
                        value={demoInputVal}
                        onChange={(e) => setDemoInputVal(e.target.value)}
                        disabled={isDisabledState}
                        error="Ange ett giltigt värde för att spara."
                      />

                      <div className="space-y-1.5">
                        <label className="block text-label text-[var(--text-secondary)] ml-1">
                          Beloppsfält med uträkning (SmartInput)
                        </label>
                        <SmartInput
                          value={demoSmartAmount}
                          onChange={setDemoSmartAmount}
                          placeholder="Prova att skriva 120+45"
                          suffix="kr"
                          disabled={isDisabledState}
                          className={`w-full h-[var(--control-height)] px-4 bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-control text-[var(--text-primary)] font-display font-bold tabular-nums focus:outline-none focus:border-[var(--accent-color)] ${
                            isFocusState ? 'border-[var(--accent-color)] ring-2 ring-[var(--accent-soft)]' : ''
                          }`}
                        />
                        <p className="text-caption ml-1">Du kan räkna direkt i fältet, t.ex. 150+75.</p>
                      </div>

                      <Input
                        label="Sökfält"
                        placeholder="Sök transaktioner eller butik..."
                        value={demoSearchText}
                        onChange={(e) => setDemoSearchText(e.target.value)}
                        disabled={isDisabledState}
                        icon={<Search size={16} />}
                        suffix={
                          demoSearchText ? (
                            <button
                              type="button"
                              onClick={() => setDemoSearchText('')}
                              className="text-xs font-semibold text-[var(--text-secondary)]"
                            >
                              Rensa
                            </button>
                          ) : undefined
                        }
                      />
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Dropdowns, Datumväljare & Språkval"
                    description="Menyer för att välja intervall, kategori, datum och språk."
                    sourcePath="src/components/ui/Select.tsx, FilterSelectButton.tsx & CalendarModal.tsx"
                    usedIn={['Fasta utgifter', 'Registrera uppsägning', 'Historik', 'Inställningar']}
                    reviewNote="Appen har både en enkel <Select> för korta val och <FilterSelectButton> som öppnar en sökbar meny."
                    showTechDetails={showTechDetails}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <Select
                        label="Enkel dropdown (Select)"
                        value={demoSelectVal}
                        onChange={(e) => setDemoSelectVal(e.target.value)}
                        disabled={isDisabledState}
                        error={isErrorState ? 'Välj ett alternativ' : undefined}
                        options={[
                          { value: 'monthly', label: 'Månadsvis' },
                          { value: 'quarterly', label: 'Kvartalsvis' },
                          { value: 'yearly', label: 'Årsvis' },
                        ]}
                      />

                      <div className="space-y-1.5">
                        <label className="block text-label text-[var(--text-secondary)] ml-1">
                          Kategoriväljare (Öppnar sökbar lista)
                        </label>
                        <FilterSelectButton
                          label="Kategori: Mat & Dryck"
                          active={isSelectedState}
                          onClick={() => setActiveOverlay('filter_menu')}
                          className="w-full justify-between"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-label text-[var(--text-secondary)] ml-1">
                          Datumknapp (Öppnar kalender)
                        </label>
                        <button
                          type="button"
                          disabled={isDisabledState}
                          onClick={() => setActiveOverlay('calendar')}
                          className="w-full h-[var(--control-height)] px-3.5 rounded-control bg-[var(--surface-nested)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] flex items-center justify-between text-sm font-medium text-[var(--text-primary)] transition-colors disabled:opacity-50"
                        >
                          <span className="inline-flex items-center gap-2">
                            <CalendarIcon size={15} className="text-[var(--text-secondary)]" />
                            {demoDate.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <ChevronRight size={15} className="text-[var(--text-muted)]" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        Språkväljare (används på Landningssida & Inloggning):
                      </span>
                      <LanguagePicker
                        currentLanguage={sandboxConfig.language || 'sv'}
                        onLanguageChange={(lang: Language) => {
                          setSandboxConfig((prev) => ({ ...prev, language: lang }));
                          addSandboxToast(`Språk i sandlådan ändrat till ${lang.toUpperCase()}`, 'info');
                        }}
                      />
                    </div>
                  </SectionCard>
                </>
              )}

            {/* Grupp 3: Switchar, Val, Flikar & Status */}
            {(componentTab === 'selection' || componentTab === 'all' || isSearching) &&
              matchesSearch(['switch', 'kryssruta', 'radio', 'selectionrow', 'flikar', 'filter', 'status', 'badge', 'pill', 'segmentedcontrol']) && (
                <>
                  <SectionCard
                    title="Switchar, Radioknappar & Kryssrutor"
                    description="Komponenter för att slå på/av funktioner eller välja ett alternativ i en lista."
                    sourcePath="src/components/ui/Switch.tsx & SelectionRow.tsx"
                    usedIn={['Inställningar', 'Fasta utgifter', 'Registrera uppsägning']}
                    reviewNote="Tre valmönster finns: SelectionRow, BottomSheetOption (i bottom sheets) samt kompakta radval i Registrera uppsägning."
                    showTechDetails={showTechDetails}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2.5">
                        <h4 className="text-section-header">Switch (På / Av / Inaktiverad)</h4>
                        <Card variant="nested" padding="none" className="divide-y divide-[var(--border-subtle)]">
                          <ListRow
                            variant="grouped"
                            title="Rörligt belopp (På)"
                            subtitle="Beloppet varierar mellan månader"
                            control={<Switch checked={demoSwitchA} onChange={setDemoSwitchA} disabled={isDisabledState} />}
                          />
                          <ListRow
                            variant="grouped"
                            title="Påminnelser (Av)"
                            subtitle="Skicka notis på betalningsdagen"
                            control={<Switch checked={demoSwitchB} onChange={setDemoSwitchB} disabled={isDisabledState} />}
                          />
                          <ListRow
                            variant="grouped"
                            title="Låst inställning (Inaktiverad)"
                            disabled
                            control={<Switch checked={true} onChange={() => {}} disabled />}
                          />
                        </Card>
                      </div>

                      <div className="space-y-2.5">
                        <h4 className="text-section-header">Valbara rader (Radioknapp & Kryssruta)</h4>
                        <div className="space-y-2">
                          <SelectionRow
                            title="Nej, inga fler betalningar"
                            subtitle="Radioval (endast ett val möjligt)"
                            selected={demoRadioChoice === 'none' || isSelectedState}
                            indicatorType="radio"
                            disabled={isDisabledState}
                            onClick={() => setDemoRadioChoice('none')}
                          />
                          <SelectionRow
                            title="Ja, betalningar återstår"
                            subtitle="Radioval (endast ett val möjligt)"
                            selected={demoRadioChoice === 'remaining'}
                            indicatorType="radio"
                            disabled={isDisabledState}
                            onClick={() => setDemoRadioChoice('remaining')}
                          />
                          <SelectionRow
                            title="Inkludera i månadsbudget"
                            subtitle="Kryssruta (flera val möjliga)"
                            selected={demoCheckChoice.includes('Mat & Dryck')}
                            indicatorType="check"
                            disabled={isDisabledState}
                            onClick={() =>
                              setDemoCheckChoice((prev) =>
                                prev.includes('Mat & Dryck')
                                  ? prev.filter((x) => x !== 'Mat & Dryck')
                                  : [...prev, 'Mat & Dryck']
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Flikar, Filterknappar & Statusmärken (Badges)"
                    description="Används för att byta vy eller filtrera innehåll."
                    sourcePath="src/components/ui/SegmentedControl.tsx, FilterButtonGroup.tsx, Pill.tsx & Badge.tsx"
                    usedIn={['Ekonomi', 'Historik', 'Insikter', 'Feedback']}
                    reviewNote="Både SegmentedControl och FilterButtonGroup används för flikval på olika sidor."
                    showTechDetails={showTechDetails}
                  >
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <span className="text-section-header block">Flikväljare (SegmentedControl)</span>
                          <SegmentedControl
                            value={demoSegmented}
                            onChange={setDemoSegmented}
                            options={[
                              { value: 'overview', label: 'Översikt' },
                              { value: 'fixed', label: 'Fasta utgifter', badge: 4 },
                              { value: 'income', label: 'Inkomster' },
                            ]}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-section-header block">Filtergrupp (FilterButtonGroup)</span>
                          <FilterButtonGroup
                            value={demoFilterGroup}
                            onChange={setDemoFilterGroup}
                            options={[
                              { value: 'all', label: 'Alla', count: 12 },
                              { value: 'expense', label: 'Utgifter', count: 10 },
                              { value: 'income', label: 'Inkomster', count: 2 },
                            ]}
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-section-header block mb-2">Filter-pills (Pill)</span>
                        <div className="flex flex-wrap gap-2">
                          <Pill active={true} onClick={() => {}}>Valt filter</Pill>
                          <Pill active={false} onClick={() => {}}>Ovalt filter</Pill>
                          <Pill variant="subtle" active={true} onClick={() => {}}>Mjuk aktiv</Pill>
                          <Pill variant="outline" active={false} onClick={() => {}}>Med ram</Pill>
                        </div>
                      </div>

                      <div>
                        <span className="text-section-header block mb-2">Statusmärken (Badge)</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="default">Standard</Badge>
                          <Badge variant="secondary">Sekundär</Badge>
                          <Badge variant="accent">Accent</Badge>
                          <Badge variant="success">Aktiv / Klart</Badge>
                          <Badge variant="warning">Rörligt belopp</Badge>
                          <Badge variant="danger">Överskriden</Badge>
                        </div>
                      </div>
                    </div>
                  </SectionCard>
                </>
              )}

            {/* Grupp 4: Kort & Listrader */}
            {(componentTab === 'cards_lists' || componentTab === 'all' || isSearching) &&
              matchesSearch(['kort', 'card', 'listrow', 'listrader', 'transactionitem', 'budgetitem', 'uppsagd', 'abonnemang']) && (
                <SectionCard
                  title="Kort, Fasta utgifter & Transaktionsrader"
                  description="Visar hur kort och rader ser ut i listor – inklusive skillnaden mellan en aktiv och en uppsagd fast utgift."
                  sourcePath="src/components/ui/Card.tsx, BudgetItem.tsx & TransactionItem.tsx"
                  usedIn={['Hem', 'Ekonomi', 'Historik', 'Profil']}
                  showTechDetails={showTechDetails}
                >
                  <div className="space-y-6">
                    {/* 1. Korttyper */}
                    <div>
                      <h4 className="text-section-header mb-2">De 3 vanligaste korttyperna</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card variant="default" padding="md">
                          <div className="text-xs font-bold text-[var(--text-primary)]">1. Standardkort</div>
                          <div className="text-caption mt-1">Används för huvudsektioner på sidor.</div>
                        </Card>
                        <Card variant="nested" padding="md">
                          <div className="text-xs font-bold text-[var(--text-primary)]">2. Inre ruta (Nested)</div>
                          <div className="text-caption mt-1">Används för grupperade fält inuti kort/modaler.</div>
                        </Card>
                        <Card
                          variant="interactive"
                          padding="md"
                          onClick={() => addSandboxToast('Klickade på kortet!', 'info')}
                        >
                          <div className="text-xs font-bold text-[var(--text-primary)]">3. Klickbart kort</div>
                          <div className="text-caption mt-1">Reagerar när man pekar eller klickar.</div>
                        </Card>
                      </div>
                    </div>

                    {/* 2. Fasta utgifter: Aktiv vs Uppsagd */}
                    <div>
                      <h4 className="text-section-header mb-1">
                        Fasta utgifter i lista (Klicka på en rad för att öppna detaljvyn)
                      </h4>
                      <p className="text-caption mb-2.5">
                        Visar max två textrader per objekt: Namn + belopp på rad 1, och kategori eller lugn uppsägningsstatus på rad 2.
                      </p>
                      <Card variant="nested" padding="none" className="divide-y divide-[var(--border-subtle)] overflow-hidden">
                        {sandboxFixedExpenses.length === 0 ? (
                          <div className="p-4 text-center text-secondary">
                            Inga fasta utgifter i valt testdata-paket (”Tomt innehåll”).
                          </div>
                        ) : (
                          sandboxFixedExpenses.map((exp) => (
                            <BudgetItem
                              key={exp.id}
                              item={exp}
                              type="expense"
                              currency={sandboxConfig.currency}
                              language={sandboxConfig.language || 'sv'}
                              config={sandboxConfig}
                              isFixedExpenseList={true}
                              t={t}
                              onClick={() => {
                                setEditingFixed(exp);
                                setFixedModalStartInEdit(false);
                                setActiveOverlay('fixed_expense');
                              }}
                            />
                          ))
                        )}
                      </Card>
                    </div>

                    {/* 3. Statusrad inuti Fast utgift */}
                    <div>
                      <h4 className="text-section-header mb-2">
                        Statusrad inuti detaljvy & redigeringsläge för abonnemang
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--surface-nested)] border border-[var(--border-subtle)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium text-[var(--text-secondary)]">Status</span>
                            <span className="text-xs text-[var(--text-muted)]">·</span>
                            <span className="text-xs font-bold text-[var(--text-primary)]">Aktiv</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalTarget(
                                sandboxFixedExpenses.find((e) => !e.isCancelled) || {
                                  id: 'sample-active',
                                  name: 'Spotify Duo',
                                  amount: 169,
                                  category: 'Nöje',
                                  billingDay: 15,
                                  frequency: 'monthly',
                                }
                              );
                              setCancelModalMode('register');
                              setActiveOverlay('cancel_subscription');
                            }}
                            className="text-xs font-bold text-[var(--accent-color)] hover:opacity-80 transition-opacity shrink-0 ml-3"
                          >
                            Markera som uppsagd
                          </button>
                        </div>

                        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[var(--surface-nested)] border border-[var(--border-subtle)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-medium text-[var(--text-secondary)]">Status</span>
                            <span className="text-xs text-[var(--text-muted)]">·</span>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">Uppsagd</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCancelModalTarget(
                                sandboxFixedExpenses.find((e) => e.isCancelled) || {
                                  id: 'sample-cancelled',
                                  name: 'Netflix Standard',
                                  amount: 149,
                                  category: 'Nöje',
                                  billingDay: 15,
                                  frequency: 'monthly',
                                  isCancelled: true,
                                  hasRemainingPayment: true,
                                  finalPaymentDate: '2026-11-15',
                                  finalPaymentAmount: 149,
                                  cancellationEndDate: '2026-11-20',
                                }
                              );
                              setCancelModalMode('register');
                              setActiveOverlay('cancel_subscription');
                            }}
                            className="text-xs font-bold text-[var(--accent-color)] hover:opacity-80 transition-opacity shrink-0 ml-3"
                          >
                            Ändra
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 4. Transaktionsrader */}
                    <div>
                      <h4 className="text-section-header mb-2">
                        Transaktionsrader (Klicka på en rad för att öppna detaljvyn)
                      </h4>
                      <Card variant="nested" padding="none" className="divide-y divide-[var(--border-subtle)] overflow-hidden">
                        {sandboxTransactions.length === 0 ? (
                          <div className="p-4 text-center text-secondary">
                            Inga transaktioner i valt testdata-paket (”Tomt innehåll”).
                          </div>
                        ) : (
                          sandboxTransactions.map((tx) => (
                            <TransactionItem
                              key={tx.id}
                              transaction={tx}
                              config={sandboxConfig}
                              isGrouped={true}
                              onClick={() => {
                                setViewingTx(tx);
                                setActiveOverlay('transaction_view');
                              }}
                            />
                          ))
                        )}
                      </Card>
                    </div>
                  </div>
                </SectionCard>
              )}

            {/* Grupp 5: Navigation & Headers */}
            {(componentTab === 'navigation' || componentTab === 'all' || isSearching) &&
              matchesSearch(['navigation', 'header', 'appheader', 'bottomnavigation', 'bottomsheetheader']) && (
                <SectionCard
                  title="Toppbar, BottomSheet-huvud & Bottenmeny"
                  description="Så ser sidhuvuden och huvudmenyn längst ner ut."
                  sourcePath="src/components/AppHeader.tsx, ui/BottomSheetHeader.tsx & CustomBottomNavigation.tsx"
                  usedIn={['Hela appen']}
                  showTechDetails={showTechDetails}
                >
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-section-header mb-2">Toppbar (Huvudsida vs Undersida med Tillbaka-pil)</h4>
                      <div className="space-y-3 rounded-card-nested p-3 bg-[var(--bg-color)] border border-[var(--border-subtle)]">
                        <div className="relative h-16 overflow-hidden rounded-card-nested border border-[var(--border-subtle)] transform-gpu">
                          <AppHeader
                            date={demoDate}
                            onNavigate={() => {}}
                            onOpenSearch={() => setActiveOverlay('search')}
                            userName="Alex"
                            language={sandboxConfig.language}
                          />
                        </div>
                        <div className="relative h-16 overflow-hidden rounded-card-nested border border-[var(--border-subtle)] transform-gpu">
                          <AppHeader
                            date={demoDate}
                            onNavigate={() => {}}
                            title="Fasta utgifter"
                            onBack={() => addSandboxToast('Klickade på Tillbaka', 'info')}
                            language={sandboxConfig.language}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-section-header mb-2">Topphuvud i Bottom Sheet</h4>
                      <div className="rounded-card-nested bg-[var(--surface-elevated)] border border-[var(--border-subtle)] overflow-hidden">
                        <BottomSheetHeader
                          title="Registrera uppsägning"
                          subtitle="Detta ändrar din budget i Dejz. Tjänsten behöver vara uppsagd hos företaget."
                          onClose={() => addSandboxToast('Stängknapp klickad', 'info')}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-section-header mb-2">Bottenmeny med Plusknapp</h4>
                      <div className="relative h-24 rounded-card-nested bg-[var(--bg-color)] border border-[var(--border-subtle)] overflow-hidden flex items-end justify-center p-3">
                        <div className="w-full max-w-md flex items-center justify-between gap-2">
                          <div className="flex-1 flex items-center justify-around h-14 rounded-full bg-[var(--surface-color)]/95 border border-[var(--border-subtle)] shadow-elevated px-2">
                            {[
                              { id: 'today', label: 'Hem' },
                              { id: 'budget', label: 'Ekonomi' },
                              { id: 'transactions', label: 'Historik' },
                              { id: 'analysis', label: 'Insikter' },
                            ].map((tab) => (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setDemoActiveTab(tab.id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  demoActiveTab === tab.id
                                    ? 'bg-[var(--accent-soft)] text-[var(--accent-color)]'
                                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTx(null);
                              setActiveOverlay('transaction_form');
                            }}
                            className="w-14 h-14 rounded-full bg-[var(--accent-color)] text-[var(--text-on-accent)] shadow-accent flex items-center justify-center shrink-0"
                            aria-label="Lägg till transaktion"
                          >
                            <Plus size={24} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

            {/* Grupp 6: Tomlägen, Laddning & Toasts */}
            {(componentTab === 'feedback' || componentTab === 'all' || isSearching) &&
              matchesSearch(['tomläge', 'emptystate', 'skeleton', 'laddning', 'felmeddelande', 'toast', 'bekräftelse']) && (
                <SectionCard
                  title="Tomlägen, Laddning & Meddelanden (Toasts)"
                  description="Visas när en lista är tom, när data laddas in eller när något sparats."
                  sourcePath="src/components/ui/EmptyState.tsx, src/components/EmptyState.tsx, Skeleton.tsx & Toast.tsx"
                  usedIn={['Hem', 'Historik', 'Ekonomi']}
                  reviewNote="Två olika EmptyState-komponenter finns i projektet – båda visas bredvid varandra här."
                  showTechDetails={showTechDetails}
                >
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-card-nested border border-[var(--border-subtle)] bg-[var(--surface-nested)] p-3">
                        <div className="text-caption font-semibold mb-2 text-[var(--text-secondary)]">
                          Variant 1: Kompakt EmptyState (ui/EmptyState.tsx)
                        </div>
                        <UiEmptyState
                          icon={<CreditCard size={22} />}
                          title="Inga fasta utgifter ännu"
                          description="Lägg till hyra, bredband och abonnemang för att se din månadskostnad."
                          action={
                            <Button size="sm" variant="primary" onClick={() => setActiveOverlay('fixed_expense')}>
                              Lägg till fast utgift
                            </Button>
                          }
                        />
                      </div>

                      <div className="rounded-card-nested border border-[var(--border-subtle)] bg-[var(--surface-nested)] p-3">
                        <div className="text-caption font-semibold mb-2 text-[var(--text-secondary)]">
                          Variant 2: Animerad EmptyState (EmptyState.tsx)
                        </div>
                        <AppEmptyState
                          icon={ShoppingBag}
                          title="Inga transaktioner registrerade"
                          description="När du lägger till dina köp dyker de upp här."
                          actionLabel="Lägg till utgift"
                          onAction={() => setActiveOverlay('transaction_form')}
                        />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-section-header mb-2">Laddningsplatshållare (Skeleton)</h4>
                      <div className="p-4 rounded-card-nested bg-[var(--surface-nested)] border border-[var(--border-subtle)] space-y-3">
                        <TransactionItemSkeleton />
                        <TransactionItemSkeleton />
                      </div>
                    </div>

                    <div>
                      <h4 className="text-section-header mb-2">Testa meddelanden (Toasts) & Bekräftelsedialog</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addSandboxToast('Sparat i budgeten!', 'success')}
                        >
                          Visa Grön Toast (Klart)
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addSandboxToast('Kunde inte spara: Datum saknas.', 'error')}
                        >
                          Visa Röd Toast (Fel)
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => addSandboxToast('Information i testläget.', 'info')}
                        >
                          Visa Blå Toast (Info)
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setActiveOverlay('confirm_destructive')}
                        >
                          Öppna ”Är du säker?”-dialog
                        </Button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}
          </div>
        )}

        {/* ================================================================ */}
        {/* 3. POPUPFÖNSTER & BOTTOM SHEETS (UPPDELADE I 4 KATEGORIER)       */}
        {/* ================================================================ */}
        {(activeSection === 'overlays' || isSearching) && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {POPUP_ITEMS.filter(
                (item) =>
                  (overlayTab === 'all' || item.category === overlayTab || isSearching) &&
                  matchesSearch([item.title, item.subtitle, item.source, item.usedIn, item.desc])
              ).map((item) => (
                <Card
                  key={item.id}
                  variant="default"
                  padding="md"
                  className="flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.title}</h4>
                    <div className="text-xs font-medium text-[var(--accent-color)]">{item.subtitle}</div>
                    <p className="text-caption leading-relaxed">{item.desc}</p>

                    {showTechDetails && (
                      <div className="pt-2 mt-2 border-t border-[var(--border-subtle)] space-y-1 text-[11px] text-[var(--text-muted)]">
                        <div className="font-mono text-[var(--text-secondary)] truncate">{item.source}</div>
                        <div>Används i: {item.usedIn}</div>
                      </div>
                    )}
                  </div>

                  <Button size="sm" variant="primary" fullWidth onClick={item.onOpen}>
                    Öppna fönster
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* 4. SIDOR OCH FLÖDEN (UPPDELADE I 3 TYDLIGA GRUPPER)              */}
        {/* ================================================================ */}
        {(activeSection === 'pages' || isSearching) && (
          <div className="space-y-4">
            {/* Steg 1: Välj kategori av sida/flöde + välj vy */}
            <Card variant="default" padding="md" className="space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Välj sida eller flöde att testa
                  </h3>
                  <p className="text-caption">
                    Alla sidor nedan är interaktiva. Du kan klicka på rader, lägga till poster och testa flödena utan att ditt riktiga konto påverkas.
                  </p>
                </div>

                {!isSearching && (
                  <FilterButtonGroup
                    size="sm"
                    value={flowCategoryTab}
                    onChange={setFlowCategoryTab}
                    options={[
                      { value: 'main_views', label: 'Huvudsidor (4)' },
                      { value: 'key_flows', label: 'Viktiga flöden (4)' },
                      { value: 'other_views', label: 'Övriga sidor (4)' },
                    ]}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {FLOW_ITEMS.filter(
                  (f) =>
                    (f.category === flowCategoryTab || isSearching) &&
                    matchesSearch([f.label, f.source, f.desc, f.tryHint])
                ).map((flow) => {
                  const isSelected = activeFlowId === flow.id;
                  return (
                    <button
                      key={flow.id}
                      type="button"
                      onClick={() => setActiveFlowId(flow.id)}
                      className={`p-3 rounded-card-nested border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'border-[var(--accent-color)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-nested)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">{flow.label}</span>
                        {isSelected && <Check size={14} className="text-[var(--accent-color)] shrink-0" />}
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{flow.desc}</span>
                      {showTechDetails && (
                        <span className="text-[10px] font-mono text-[var(--text-muted)] truncate">{flow.source}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Steg 2: Tydlig informationsrad ovanför själva förhandsgranskningen */}
            <div className="rounded-card border border-[var(--border-strong)] bg-[var(--bg-color)] p-3 sm:p-5 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-[var(--border-subtle)]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="accent" size="sm">Visar nu</Badge>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {activeFlowMeta.label}
                    </span>
                    {showTechDetails && (
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        ({activeFlowMeta.source})
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    <strong>Tips att testa här:</strong> {activeFlowMeta.tryHint}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setEditingTx(null);
                      setActiveOverlay('transaction_form');
                    }}
                  >
                    + Ny transaktion
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setEditingFixed(null);
                      setFixedModalStartInEdit(true);
                      setActiveOverlay('fixed_expense');
                    }}
                  >
                    + Ny fast utgift
                  </Button>
                </div>
              </div>

              {/* Render selected real view */}
              {activeFlowId === 'today_new' && (
                <TodayView
                  stats={{
                    ...sandboxStats,
                    totalIncome: 0,
                    totalFixed: 0,
                    monthlyBudget: 0,
                    remainingBudget: 0,
                    dailyAvailable: 0,
                  }}
                  config={{
                    ...sandboxConfig,
                    budgetSetupCompleted: false,
                    categories: sandboxConfig.categories.map((c) => ({ ...c, budget: 0 })),
                  }}
                  userName="Alex"
                  incomes={[]}
                  fixedExpenses={[]}
                  selectedDate={demoDate}
                  setSelectedDate={setDemoDate}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setActiveOverlay('transaction_form');
                  }}
                  onAddIncome={() => {
                    setEditingIncome(null);
                    setActiveOverlay('income_modal');
                  }}
                  onViewTransaction={(tx) => {
                    setViewingTx(tx);
                    setActiveOverlay('transaction_view');
                  }}
                  onDeleteTransaction={(id) => {
                    setSandboxTransactions((prev) => prev.filter((x) => x.id !== id));
                  }}
                  onNavigate={(tab) => {
                    if (tab === 'budget') {
                      setActiveFlowId('budget_categories');
                      addSandboxToast('Öppnade ”Sätt upp din budget” i sandlådan.', 'info');
                    }
                  }}
                  transactions={[]}
                  allTransactions={[]}
                  t={t}
                  currentPeriodDate={demoDate}
                  currentPeriodStart={sandboxStats.periodStart}
                  currentPeriodEnd={sandboxStats.periodEnd}
                  isCurrentPeriod={true}
                  periods={sandboxPeriods}
                  setCurrentPeriodDate={setDemoDate}
                />
              )}

              {activeFlowId === 'today_active' && (
                <TodayView
                  stats={sandboxStats}
                  config={sandboxConfig}
                  userName="Alex"
                  incomes={sandboxIncomes}
                  fixedExpenses={sandboxFixedExpenses}
                  selectedDate={demoDate}
                  setSelectedDate={setDemoDate}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setActiveOverlay('transaction_form');
                  }}
                  onAddIncome={() => {
                    setEditingIncome(null);
                    setActiveOverlay('income_modal');
                  }}
                  onViewTransaction={(tx) => {
                    setViewingTx(tx);
                    setActiveOverlay('transaction_view');
                  }}
                  onDeleteTransaction={(id) => {
                    setSandboxTransactions((prev) => prev.filter((x) => x.id !== id));
                    addSandboxToast('Transaktion raderad i sandlådan.', 'info');
                  }}
                  onNavigate={(tab) => {
                    if (tab === 'budget') setActiveFlowId('budget_fixed');
                    if (tab === 'transactions') setActiveFlowId('transactions_log');
                  }}
                  transactions={sandboxTransactions}
                  allTransactions={sandboxTransactions}
                  t={t}
                  currentPeriodDate={demoDate}
                  currentPeriodStart={sandboxStats.periodStart}
                  currentPeriodEnd={sandboxStats.periodEnd}
                  isCurrentPeriod={true}
                  periods={sandboxPeriods}
                  setCurrentPeriodDate={setDemoDate}
                  onViewFixedExpense={(exp) => {
                    setEditingFixed(exp);
                    setFixedModalStartInEdit(false);
                    setActiveOverlay('fixed_expense');
                  }}
                  onViewIncome={(inc) => {
                    setEditingIncome(inc);
                    setActiveOverlay('income_modal');
                  }}
                  onUpdateConfig={setSandboxConfig}
                />
              )}

              {activeFlowId === 'budget_fixed' && (
                <BudgetView
                  incomes={sandboxIncomes}
                  setIncomes={setSandboxIncomes}
                  fixedExpenses={sandboxFixedExpenses}
                  setFixedExpenses={setSandboxFixedExpenses}
                  onAddIncome={() => {
                    setEditingIncome(null);
                    setActiveOverlay('income_modal');
                  }}
                  onEditIncome={(inc) => {
                    setEditingIncome(inc);
                    setActiveOverlay('income_modal');
                  }}
                  onViewIncome={(inc) => {
                    setEditingIncome(inc);
                    setActiveOverlay('income_modal');
                  }}
                  onAddFixedExpense={() => {
                    setEditingFixed(null);
                    setFixedModalStartInEdit(true);
                    setActiveOverlay('fixed_expense');
                  }}
                  onEditFixedExpense={(exp) => {
                    setEditingFixed(exp);
                    setFixedModalStartInEdit(true);
                    setActiveOverlay('fixed_expense');
                  }}
                  onViewFixedExpense={(exp) => {
                    setEditingFixed(exp);
                    setFixedModalStartInEdit(false);
                    setActiveOverlay('fixed_expense');
                  }}
                  onAddMonthlySaving={() => {}}
                  onEditMonthlySaving={() => {}}
                  onViewMonthlySaving={() => {}}
                  onResetSavingsPot={() => {}}
                  config={sandboxConfig}
                  setConfig={setSandboxConfig}
                  stats={sandboxStats}
                  t={t}
                  currentPeriodId={sandboxPeriods[0]?.id || 'current'}
                  allTransactions={sandboxTransactions}
                />
              )}

              {activeFlowId === 'budget_categories' && (
                <BudgetCategoriesView
                  config={sandboxConfig}
                  setConfig={(next) => {
                    setSandboxConfig({ ...next, budgetSetupCompleted: true });
                    addSandboxToast('Kategoribudget uppdaterad i sandlådan.', 'success');
                  }}
                  incomes={sandboxIncomes}
                  fixedExpenses={sandboxFixedExpenses}
                  stats={sandboxStats}
                  transactions={sandboxTransactions}
                  t={t}
                  userId="sandbox"
                  onDone={() => {
                    setSandboxConfig((prev) => ({ ...prev, budgetSetupCompleted: true }));
                    setActiveFlowId('today_active');
                    addSandboxToast('Budget sparad! Visar nu aktiv Hem-vy.', 'success');
                  }}
                />
              )}

              {activeFlowId === 'transactions_log' && (
                <LogView
                  transactions={sandboxTransactions}
                  fixedExpenses={sandboxFixedExpenses}
                  incomes={sandboxIncomes}
                  stats={sandboxStats}
                  config={sandboxConfig}
                  periods={sandboxPeriods}
                  onAddTransaction={() => {
                    setEditingTx(null);
                    setActiveOverlay('transaction_form');
                  }}
                  onAddIncome={() => {
                    setEditingIncome(null);
                    setActiveOverlay('income_modal');
                  }}
                  onViewTransaction={(tx) => {
                    setViewingTx(tx);
                    setActiveOverlay('transaction_view');
                  }}
                  onViewFixedExpense={(exp) => {
                    setEditingFixed(exp);
                    setFixedModalStartInEdit(false);
                    setActiveOverlay('fixed_expense');
                  }}
                  onDeleteTransaction={(id) => {
                    setSandboxTransactions((prev) => prev.filter((x) => x.id !== id));
                    addSandboxToast('Transaktion raderad i sandlådan.', 'info');
                  }}
                  t={t}
                  currentLang={sandboxConfig.language || 'sv'}
                />
              )}

              {activeFlowId === 'analysis' && (
                <AnalysisView
                  transactions={sandboxTransactions}
                  stats={sandboxStats}
                  config={sandboxConfig}
                  t={t}
                  fixedExpenses={sandboxFixedExpenses}
                  currentLang={sandboxConfig.language || 'sv'}
                  periods={sandboxPeriods}
                  currentPeriodDate={demoDate}
                  onViewTransaction={(tx) => {
                    setViewingTx(tx);
                    setActiveOverlay('transaction_view');
                  }}
                  onViewFixedExpense={(exp) => {
                    setEditingFixed(exp);
                    setFixedModalStartInEdit(false);
                    setActiveOverlay('fixed_expense');
                  }}
                />
              )}

              {activeFlowId === 'debts' && (
                <DebtsView
                  onBack={() => setActiveFlowId('today_active')}
                  config={sandboxConfig}
                  setConfig={setSandboxConfig}
                />
              )}

              {activeFlowId === 'shared_budget' && (
                <SharedBudgetView
                  onBack={() => setActiveFlowId('today_active')}
                  config={sandboxConfig}
                  setConfig={setSandboxConfig}
                />
              )}

              {activeFlowId === 'auth_register' && (
                <Auth
                  t={t}
                  initialIsRegistering={true}
                  sandboxMode={true}
                  currentLanguage={sandboxConfig.language || 'sv'}
                  onLanguageChange={(lang) => setSandboxConfig((prev) => ({ ...prev, language: lang }))}
                  onShowToast={(msg, type) => addSandboxToast(msg, type)}
                  onLegalClick={(type) => addSandboxToast(`Öppnade villkorsvy (${type}) i sandlådan`, 'info')}
                  onSandboxComplete={(action, email) => {
                    if (action === 'register') {
                      setActiveOverlay('onboarding');
                    } else {
                      addSandboxToast(`Sandlåde-auth (${action}) klar för ${email}`, 'success');
                    }
                  }}
                />
              )}

              {activeFlowId === 'landing' && (
                <LandingPage
                  currentLanguage={sandboxConfig.language || 'sv'}
                  onLanguageChange={(lang) => setSandboxConfig((prev) => ({ ...prev, language: lang }))}
                  onGetStarted={() => setActiveFlowId('auth_register')}
                  onLogin={() => setActiveFlowId('auth_register')}
                  onStartDemo={() => setActiveFlowId('today_active')}
                />
              )}

              {activeFlowId === 'profile_settings' && (
                <div className="space-y-6">
                  <SettingsView
                    activeSection="appearance"
                    onBack={() => setActiveFlowId('today_active')}
                    config={sandboxConfig}
                    setConfig={setSandboxConfig}
                    t={t}
                    userId="sandbox"
                    transactions={sandboxTransactions}
                    incomes={sandboxIncomes}
                    fixedExpenses={sandboxFixedExpenses}
                    stats={sandboxStats}
                  />
                </div>
              )}

              {activeFlowId === 'pin_lock' && (
                <div className="max-w-sm mx-auto py-4">
                  <PinLockScreen
                    mode="setup"
                    t={t}
                    onSuccess={() => addSandboxToast('PIN-kod verifierad i sandlådan!', 'success')}
                    onCancel={() => setActiveFlowId('today_active')}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* RIKTIGA POPUPFÖNSTER & BOTTOM SHEETS (ISOLERADE MOT SANDLÅDAN)     */}
      {/* ================================================================== */}

      {/* 1. Registrera uppsägning / Så säger du upp (CancelSubscriptionModal) */}
      {activeOverlay === 'cancel_subscription' && cancelModalTarget && (
        <CancelSubscriptionModal
          isOpen={true}
          expense={cancelModalTarget}
          config={sandboxConfig}
          mode={cancelModalMode === 'help' ? 'guide' : 'register'}
          onClose={() => setActiveOverlay(null)}
          onUpdateExpense={(updatedExp) => {
            setSandboxFixedExpenses((prev) =>
              prev.map((item) => (item.id === updatedExp.id ? updatedExp : item))
            );
            setActiveOverlay(null);
            addSandboxToast(
              updatedExp.isCancelled
                ? 'Uppsägning sparad i sandlådans budget.'
                : 'Återställd till aktiv i Dejz (sandlåda).',
              'success'
            );
          }}
          onDeleteExpense={(id) => {
            setSandboxFixedExpenses((prev) => prev.filter((e) => e.id !== id));
            setActiveOverlay(null);
            addSandboxToast('Fast utgift raderad i sandlådan.', 'info');
          }}
        />
      )}

      {/* 2. Fast utgift – Förhandsgranskning (FixedExpenseViewModal) & Redigera (FixedExpenseModal) */}
      {activeOverlay === 'fixed_expense' && editingFixed && !fixedModalStartInEdit && (
        <FixedExpenseViewModal
          expense={editingFixed}
          config={sandboxConfig}
          currency={sandboxConfig.currency}
          currentPeriodId={sandboxPeriods[0]?.id || 'current'}
          t={t}
          onClose={() => setActiveOverlay(null)}
          onEdit={(exp) => {
            setEditingFixed(exp);
            setFixedModalStartInEdit(true);
          }}
          onUpdateExpense={(updatedExp) => {
            setEditingFixed(updatedExp);
            setSandboxFixedExpenses((prev) =>
              prev.map((e) => (e.id === updatedExp.id ? updatedExp : e))
            );
            addSandboxToast('Status för fast utgift uppdaterad i sandlådan.', 'success');
          }}
          onDelete={(id) => {
            setSandboxFixedExpenses((prev) => prev.filter((e) => e.id !== id));
            setActiveOverlay(null);
            addSandboxToast('Fast utgift raderad i sandlådan.', 'info');
          }}
        />
      )}

      {activeOverlay === 'fixed_expense' && (fixedModalStartInEdit || !editingFixed) && (
        <FixedExpenseModal
          expense={editingFixed}
          config={sandboxConfig}
          currency={sandboxConfig.currency}
          categories={sandboxConfig.categories}
          paymentMethods={sandboxConfig.paymentMethods || DEFAULT_PAYMENT_METHODS}
          isPro={true}
          userId="sandbox"
          currentPeriodId={sandboxPeriods[0]?.id || 'current'}
          t={t}
          onClose={() => setActiveOverlay(null)}
          onSave={(savedData) => {
            const savedExp: FixedExpense = {
              ...(editingFixed || {}),
              ...savedData,
              id: editingFixed?.id || `sb-fix-${Date.now()}`,
            };
            setSandboxFixedExpenses((prev) => {
              const exists = prev.some((e) => e.id === savedExp.id);
              return exists ? prev.map((e) => (e.id === savedExp.id ? savedExp : e)) : [savedExp, ...prev];
            });
            setActiveOverlay(null);
            addSandboxToast('Fast utgift sparad i sandlådan.', 'success');
          }}
          onDelete={
            editingFixed
              ? () => {
                  setSandboxFixedExpenses((prev) => prev.filter((e) => e.id !== editingFixed.id));
                  setActiveOverlay(null);
                  addSandboxToast('Fast utgift raderad i sandlådan.', 'info');
                }
              : undefined
          }
        />
      )}

      {/* 3. Uppsagda & Avslutade abonnemang (CancelledSubscriptionsModal) */}
      {activeOverlay === 'cancelled_subscriptions' && (
        <CancelledSubscriptionsModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          fixedExpenses={sandboxFixedExpenses}
          config={sandboxConfig}
          onUpdateExpense={(updated) => {
            setSandboxFixedExpenses((prev) =>
              prev.map((e) => (e.id === updated.id ? updated : e))
            );
            addSandboxToast('Abonnemang uppdaterat i sandlådan.', 'success');
          }}
          onDeleteExpense={(id) => {
            setSandboxFixedExpenses((prev) => prev.filter((e) => e.id !== id));
            addSandboxToast('Post borttagen i sandlådan.', 'info');
          }}
        />
      )}

      {/* 4. Lägg till / Redigera transaktion (TransactionModal) */}
      {activeOverlay === 'transaction_form' && (
        <TransactionModal
          onClose={() => setActiveOverlay(null)}
          transaction={editingTx}
          transactions={sandboxTransactions}
          categories={sandboxConfig.categories}
          calendarDays={[]}
          periodStart={sandboxStats.periodStart}
          periodEnd={sandboxStats.periodEnd}
          currentLang={sandboxConfig.language || 'sv'}
          isPro={true}
          config={sandboxConfig}
          t={t}
          userId="sandbox"
          onSave={(txData) => {
            const saved: Transaction = {
              id: editingTx?.id || `sb-tx-${Date.now()}`,
              amount: txData.amount,
              type: txData.type,
              category: txData.category,
              subcategory: (txData as any).subcategory,
              merchant: txData.merchant,
              note: txData.note,
              timestamp: txData.date ? txData.date.toISOString() : new Date().toISOString(),
              receiptUrl: txData.receiptUrl,
            };
            setSandboxTransactions((prev) => {
              const exists = prev.some((x) => x.id === saved.id);
              return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
            });
            setActiveOverlay(null);
            addSandboxToast('Transaktion sparad i sandlådan.', 'success');
          }}
          onDelete={(id) => {
            setSandboxTransactions((prev) => prev.filter((x) => x.id !== id));
            setActiveOverlay(null);
            addSandboxToast('Transaktion raderad i sandlådan.', 'info');
          }}
        />
      )}

      {/* 5. Förhandsgranska transaktion (TransactionViewModal) */}
      {activeOverlay === 'transaction_view' && viewingTx && (
        <TransactionViewModal
          transaction={viewingTx}
          transactions={sandboxTransactions}
          config={sandboxConfig}
          t={t}
          onClose={() => setActiveOverlay(null)}
          onEdit={(tx) => {
            setEditingTx(tx);
            setActiveOverlay('transaction_form');
          }}
          onDuplicate={(tx) => {
            const copy: Transaction = {
              ...tx,
              id: `sb-tx-dup-${Date.now()}`,
              timestamp: new Date().toISOString(),
            };
            setSandboxTransactions((prev) => [copy, ...prev]);
            setActiveOverlay(null);
            addSandboxToast('Transaktion duplicerad i sandlådan.', 'success');
          }}
          onDelete={(id) => {
            setSandboxTransactions((prev) => prev.filter((x) => x.id !== id));
            setActiveOverlay(null);
            addSandboxToast('Transaktion raderad i sandlådan.', 'info');
          }}
        />
      )}

      {/* 6. Inkomst (IncomeModal) */}
      {activeOverlay === 'income_modal' && (
        <IncomeModal
          income={editingIncome}
          config={sandboxConfig}
          currency={sandboxConfig.currency}
          categories={sandboxConfig.incomeCategories || DEFAULT_INCOME_CATEGORIES}
          paymentMethods={sandboxConfig.paymentMethods || DEFAULT_PAYMENT_METHODS}
          isPro={true}
          userId="sandbox"
          currentPeriodId={sandboxPeriods[0]?.id || 'current'}
          t={t}
          onClose={() => setActiveOverlay(null)}
          onSave={(incData) => {
            const savedInc: Income = {
              ...(editingIncome || {}),
              ...incData,
              id: editingIncome?.id || `sb-inc-${Date.now()}`,
            };
            setSandboxIncomes((prev) => {
              const exists = prev.some((i) => i.id === savedInc.id);
              return exists ? prev.map((i) => (i.id === savedInc.id ? savedInc : i)) : [savedInc, ...prev];
            });
            setActiveOverlay(null);
            addSandboxToast('Inkomst sparad i sandlådan.', 'success');
          }}
          onDelete={
            editingIncome
              ? () => {
                  setSandboxIncomes((prev) => prev.filter((i) => i.id !== editingIncome.id));
                  setActiveOverlay(null);
                  addSandboxToast('Inkomst raderad i sandlådan.', 'info');
                }
              : undefined
          }
        />
      )}

      {/* 7. Uppdatera rörligt belopp (VariableAmountUpdateModal) */}
      {activeOverlay === 'variable_amount' && (
        <VariableAmountUpdateModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          item={{
            id: 'var-el',
            name: 'Elräkning (Rörlig)',
            amount: 650,
            category: 'Boende',
            billingDay: 28,
            frequency: 'monthly',
            isVariable: true,
            itemType: 'expense',
          }}
          config={sandboxConfig}
          t={t}
          onSave={(newAmount) => {
            setActiveOverlay(null);
            addSandboxToast(
              `Rörligt belopp uppdaterat till ${formatAmount(newAmount)} ${sandboxConfig.currency} i sandlådan.`,
              'success'
            );
          }}
        />
      )}

      {/* 8. Välj kategori (CategoryBottomSheetModal) */}
      {activeOverlay === 'category_sheet' && (
        <CategoryBottomSheetModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          categoryName="Mat & Dryck"
          categoryData={{
            name: 'Mat & Dryck',
            spent: 620,
            budget: 4500,
            remaining: 3880,
            hasBudget: true,
            isOverBudget: false,
          }}
          selectedDate={demoDate}
          allTransactions={sandboxTransactions}
          fixedExpenses={sandboxFixedExpenses}
          stats={sandboxStats}
          config={sandboxConfig}
          language={sandboxConfig.language}
          onViewTransaction={(tx) => {
            setViewingTx(tx);
            setActiveOverlay('transaction_view');
          }}
          onUpdateConfig={setSandboxConfig}
          t={t}
        />
      )}

      {/* 9. Skapa / Redigera kategori (CategoryModal) */}
      {activeOverlay === 'category_modal' && (
        <CategoryModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          initialData={
            sandboxConfig.categories[0]
              ? {
                  name: sandboxConfig.categories[0].name,
                  icon: sandboxConfig.categories[0].icon || 'ShoppingCart',
                  color: sandboxConfig.categories[0].color,
                  budget: sandboxConfig.categories[0].budget,
                  index: 0,
                }
              : null
          }
          currency={sandboxConfig.currency}
          type="expense"
          t={t}
          onSave={(catData) => {
            setActiveOverlay(null);
            addSandboxToast(`Kategori "${catData.name}" sparad i sandlådan.`, 'success');
          }}
        />
      )}

      {/* 10. Datumväljare (CalendarModal) */}
      {activeOverlay === 'calendar' && (
        <CalendarModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          selectedDate={demoDate}
          periods={sandboxPeriods}
          currentPeriodDate={demoDate}
          onPeriodChange={setDemoDate}
          periodName={sandboxPeriods[0]?.label}
          isCurrentPeriod={true}
          language={sandboxConfig.language || 'sv'}
          onSelectDate={(d) => {
            setDemoDate(d);
            setActiveOverlay(null);
            addSandboxToast(`Valde datum: ${d.toLocaleDateString('sv-SE')}`, 'info');
          }}
          t={t}
        />
      )}

      {/* 11. PeriodSelectorModal */}
      {activeOverlay === 'period_selector' && (
        <PeriodSelectorModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          periods={sandboxPeriods}
          selectedPeriod={sandboxPeriods[0]}
          selectedDate={null}
          currentLang={sandboxConfig.language || 'sv'}
          onSelectPeriod={(p) => {
            setActiveOverlay(null);
            addSandboxToast(`Valde period: ${p.label || 'Vald period'}`, 'info');
          }}
          onSelectDate={() => setActiveOverlay(null)}
        />
      )}

      {/* 12. FilterMenuModal */}
      {activeOverlay === 'filter_menu' && (
        <FilterMenuModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          title="Välj kategori"
          searchable
          searchPlaceholder="Sök kategori..."
          selectedValue="Mat & Dryck"
          onSelect={(val) => {
            setActiveOverlay(null);
            addSandboxToast(`Valde filter: ${val}`, 'info');
          }}
          options={sandboxConfig.categories.map((c) => ({
            value: c.name,
            label: c.name,
            count: 3,
          }))}
        />
      )}

      {/* 13. SearchModal */}
      {activeOverlay === 'search' && (
        <SearchModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          transactions={sandboxTransactions}
          fixedExpenses={sandboxFixedExpenses}
          incomes={sandboxIncomes}
          config={sandboxConfig}
          onNavigate={() => {}}
          onViewTransaction={(tx) => {
            setViewingTx(tx);
            setActiveOverlay('transaction_view');
          }}
          onViewFixedExpense={(exp) => {
            setEditingFixed(exp);
            setFixedModalStartInEdit(false);
            setActiveOverlay('fixed_expense');
          }}
          onViewIncome={(inc) => {
            setEditingIncome(inc);
            setActiveOverlay('income_modal');
          }}
        />
      )}

      {/* 14. OnboardingModal */}
      {activeOverlay === 'onboarding' && (
        <OnboardingModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          onComplete={() => {
            setActiveOverlay(null);
            addSandboxToast('Onboarding slutförd i sandlådan!', 'success');
          }}
          config={sandboxConfig}
          isPro={true}
          currentPeriodId={sandboxPeriods[0]?.id || 'current'}
          t={t}
          userId="sandbox"
        />
      )}

      {/* 15. SecurityModal */}
      {activeOverlay === 'security' && (
        <SecurityModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          t={t}
          addToast={addSandboxToast}
          sandboxMode={true}
        />
      )}

      {/* 16. FeedbackModal */}
      {activeOverlay === 'feedback' && (
        <FeedbackModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          t={t}
          language={sandboxConfig.language}
          onSubmit={async (msg) => {
            addSandboxToast(`Testläge: Feedback mottagen i sandlådan ("${msg.slice(0, 30)}...")`, 'success');
          }}
        />
      )}

      {/* 17. DeleteAccountModal */}
      {activeOverlay === 'delete_account' && (
        <DeleteAccountModal
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          t={t}
          onConfirm={async () => {
            setActiveOverlay(null);
            addSandboxToast('Testläge: Radering av konto simulerad (inget konto raderades).', 'info');
          }}
        />
      )}

      {/* 18. ConfirmModal */}
      {activeOverlay === 'confirm_destructive' && (
        <ConfirmModal
          isOpen={true}
          title="Radera transaktion?"
          message="Är du säker på att du vill ta bort den här transaktionen? Åtgärden sker här endast i Designbibliotekets sandlåda."
          confirmText="Radera"
          cancelText="Avbryt"
          variant="danger"
          onCancel={() => setActiveOverlay(null)}
          onConfirm={() => {
            setActiveOverlay(null);
            addSandboxToast('Bekräftad åtgärd genomförd i sandlådan.', 'success');
          }}
        />
      )}

      {/* 19. Bas-komponent BottomSheet */}
      {activeOverlay === 'base_bottom_sheet' && (
        <BottomSheet
          isOpen={true}
          onClose={() => setActiveOverlay(null)}
          title="Exempel på BottomSheet"
          subtitle="Samma komponent, placering och scrollbeteende som i appen"
          footer={
            <Button variant="primary" fullWidth onClick={() => setActiveOverlay(null)}>
              Klar
            </Button>
          }
        >
          <div className="space-y-2">
            <BottomSheetOption
              label="Månadsvis betalning"
              description="Dras varje månad på valt datum"
              selected={true}
              onClick={() => addSandboxToast('Valde Månadsvis i BottomSheet', 'info')}
            />
            <BottomSheetOption
              label="Kvartalsvis betalning"
              description="Dras var tredje månad"
              selected={false}
              onClick={() => addSandboxToast('Valde Kvartalsvis i BottomSheet', 'info')}
            />
            <BottomSheetOption
              label="Årsvis betalning"
              description="Dras en gång per år"
              selected={false}
              onClick={() => addSandboxToast('Valde Årsvis i BottomSheet', 'info')}
            />
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
