import {
  Zap,
  BellRing,
  Activity,
  PiggyBank,
  SunMedium,
  PieChart,
  Receipt,
  LucideIcon,
} from 'lucide-react';
import { HomeWidgetId, HomeWidgetConfig } from '../types';

export interface WidgetDefinition {
  id: HomeWidgetId;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: LucideIcon;
  color: string;
  defaultEnabled: boolean;
}

export const AVAILABLE_WIDGETS: WidgetDefinition[] = [
  {
    id: 'quick_expense',
    title: 'Snabb utgift',
    titleEn: 'Quick expense',
    description: 'Smart inmatning för att snabbt registrera utgifter och inkomster.',
    descriptionEn: 'Smart one-tap bar to quickly register expenses and incomes.',
    icon: Zap,
    color: '#f43f5e',
    defaultEnabled: false,
  },
  {
    id: 'attention_items',
    title: 'Åtgärder som krävs',
    titleEn: 'Action required',
    description: 'Påminnelser om obekräftade eller fördröjda räkningar och inkomster.',
    descriptionEn: 'Alerts for unconfirmed or delayed recurring bills and incomes.',
    icon: BellRing,
    color: '#e58a17',
    defaultEnabled: true,
  },
  {
    id: 'monthly_pulse',
    title: 'Månadspuls & Takt',
    titleEn: 'Monthly pulse & pace',
    description: 'Snabbvy över periodens budgettakt, sparkvot och återstående pott.',
    descriptionEn: 'Quick snapshot of period budget pace, savings rate and remaining pot.',
    icon: Activity,
    color: '#6366f1',
    defaultEnabled: true,
  },
  {
    id: 'savings_goals',
    title: 'Sparmål',
    titleEn: 'Savings goals',
    description: 'Dina aktiva sparmål med framstegsmätare och insättningsknapp.',
    descriptionEn: 'Active savings goals with visual progress bars and quick deposits.',
    icon: PiggyBank,
    color: '#f59e0b',
    defaultEnabled: true,
  },
  {
    id: 'daily_summary',
    title: 'Dagsbudget sammanfattning',
    titleEn: 'Daily budget summary',
    description: 'Kompakt kort över dagens budgetutrymme vs spenderat idag.',
    descriptionEn: 'Compact card showing today’s daily budget vs spent today.',
    icon: SunMedium,
    color: '#8b5cf6',
    defaultEnabled: false,
  },
  {
    id: 'category_budgets',
    title: 'Kategoribudgetar',
    titleEn: 'Category budgets',
    description: 'Översiktliga staplar över budget och förbrukning per kategori.',
    descriptionEn: 'Visual overview of budget and spending limits per category.',
    icon: PieChart,
    color: '#f59e0b',
    defaultEnabled: false,
  },
  {
    id: 'recent_receipts',
    title: 'Senaste sparade kvitton',
    titleEn: 'Recent receipts',
    description: 'Snabbåtkomst till nyligen fotade eller bifogade kvitton.',
    descriptionEn: 'Quick access to recently captured or uploaded receipts.',
    icon: Receipt,
    color: '#06b6d4',
    defaultEnabled: false,
  },
];

export const DEFAULT_HOME_WIDGETS: HomeWidgetConfig[] = AVAILABLE_WIDGETS.map((w, index) => ({
  id: w.id,
  enabled: w.defaultEnabled,
  order: index,
}));

export function getResolvedHomeWidgets(savedWidgets?: HomeWidgetConfig[]): HomeWidgetConfig[] {
  if (!savedWidgets || savedWidgets.length === 0) {
    return DEFAULT_HOME_WIDGETS;
  }

  // Ensure all available widgets are in the list (if new ones were added to app)
  const existingIds = new Set(savedWidgets.map((w) => w.id));
  const merged: HomeWidgetConfig[] = [...savedWidgets];

  AVAILABLE_WIDGETS.forEach((def, index) => {
    if (!existingIds.has(def.id)) {
      merged.push({
        id: def.id,
        enabled: def.defaultEnabled,
        order: merged.length + index,
      });
    }
  });

  return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}
