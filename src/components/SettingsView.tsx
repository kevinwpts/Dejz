import React, { useState } from 'react';
import { Plus, Check, Sun, Moon, Monitor, Calendar, Clock, ChevronRight, RotateCcw } from 'lucide-react';
import { Config } from '../types';
import { Language, TranslationKey } from '../i18n';
import { LanguageFlag } from './LanguageFlag';
import { DEFAULT_PAYMENT_METHODS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { CategoryModal } from './CategoryModal';
import { PaymentMethodModal } from './BudgetModals';
import { ConfirmModal } from './ConfirmModal';
import { CategoryIcon } from './CategoryIcon';
import { Button, Modal } from './ui';
import { ToggleSwitch } from './ToggleSwitch';
import { formatPaydaySummary, formatOrdinalDay } from '../utils/format';
import { getCategoryColor } from '../utils/categoryColors';
import { getPaymentMethodIcon } from '../utils/icons';

interface SettingsViewProps {
  activeSection: 'salary' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency';
  onBack: () => void;
  config: Config;
  setConfig: (config: Config) => void;
  t: (key: TranslationKey) => string;
  onSecurityClick?: () => void;
  subscriptionStatus?: string | null;
  onFeedbackClick?: () => void;
  onExportData?: () => void;
  onLegalClick?: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  profile?: any;
  userId?: string;
  session?: any;
  onRefresh?: () => void;
  onNavigateToProfile?: () => void;
  onResetSavingsPot?: () => void;
  onResetCompletedGoals?: () => void;
  onClearTransactions?: () => void;
  onResetAll?: () => void;
  onTriggerProUpgradeModal?: () => void;
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
  transactions?: any[];
  onMigrateAndDeleteCategory?: (type: 'income' | 'expense', deleteCategoryId: string, migrateToCategoryId?: string) => void;
}

export function SettingsView({ 
  activeSection,
  onBack: _onBack,
  config, 
  setConfig, 
  t, 
  onSecurityClick: _onSecurityClick, 
  subscriptionStatus: _subscriptionStatus,
  onFeedbackClick: _onFeedbackClick,
  onExportData: _onExportData,
  onLegalClick: _onLegalClick,
  profile: _profile,
  userId: _userId,
  session: _session,
  onRefresh: _onRefresh,
  onNavigateToProfile: _onNavigateToProfile,
  onResetSavingsPot: _onResetSavingsPot,
  onResetCompletedGoals: _onResetCompletedGoals,
  onClearTransactions: _onClearTransactions,
  onResetAll: _onResetAll,
  onTriggerProUpgradeModal: _onTriggerProUpgradeModal,
  onRenameCategory,
  transactions = [],
  onMigrateAndDeleteCategory,
}: SettingsViewProps) {
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');

  // Reset scroll position when switching sections
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [paymentMethodModalData, setPaymentMethodModalData] = useState<{ index?: number, name: string } | null>(null);
  const [categoryModalData, setCategoryModalData] = useState<{ type: 'income' | 'expense', index?: number, name: string, icon: string, color?: string } | null>(null);

  // Deletion migration modal state
  const [deleteMigrationData, setDeleteMigrationData] = useState<{ type: 'income' | 'expense', category: any, count: number } | null>(null);
  const [targetMigrationId, setTargetMigrationId] = useState<string>('');
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<{ type: 'income' | 'expense', index: number, category: any } | null>(null);

  const [pendingPayday, setPendingPayday] = useState<number | null>(null);
  const [isPaydayModalOpen, setIsPaydayModalOpen] = useState(false);
  const [isResetCategoriesModalOpen, setIsResetCategoriesModalOpen] = useState(false);
  const [isResetPaymentMethodsModalOpen, setIsResetPaymentMethodsModalOpen] = useState(false);

  const handleUpdatePayday = (day: number) => {
    if (day === config.payday) return;
    setPendingPayday(day);
  };

  const handleEditCategory = (type: 'income' | 'expense', index: number, name: string, icon: string, color?: string) => {
    setCategoryModalData({ type, index, name, icon, color });
    setIsCategoryModalOpen(true);
  };

  const handleAddCategory = (type: 'income' | 'expense') => {
    setCategoryModalData({ type, name: '', icon: 'tag' });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategoryModal = (data: { name: string; icon: string; color?: string; index?: number }) => {
    if (!categoryModalData) return;
    const { type } = categoryModalData;
    const field = type === 'income' ? 'incomeCategories' : 'categories';
    const currentCategories = [...(config[field] || [])];
    
    const oldName = categoryModalData.index !== undefined ? categoryModalData.name : null;
    const newName = (data.name || '').trim();

    if (data.index !== undefined) {
      currentCategories[data.index] = { ...currentCategories[data.index], name: data.name, icon: data.icon, color: data.color };
    } else {
      const newId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      currentCategories.push({ id: newId, name: data.name, icon: data.icon, color: data.color });
    }
    
    setConfig({ ...config, [field]: currentCategories });
    setIsCategoryModalOpen(false);

    if (oldName && newName && oldName.trim().toLowerCase() !== newName.toLowerCase()) {
      onRenameCategory?.(type, oldName.trim(), newName);
    }
  };

  const handleDeleteCategory = (type: 'income' | 'expense', index: number) => {
    const field = type === 'income' ? 'incomeCategories' : 'categories';
    const currentCategories = config[field] || [];
    const cat = currentCategories[index];
    if (!cat) return;

    const affected = transactions.filter(t => t.categoryId === cat.id || (t.category && cat.name && t.category.trim().toLowerCase() === cat.name.trim().toLowerCase()));
    if (affected.length > 0) {
      const otherCats = currentCategories.filter(c => c.id !== cat.id);
      const ovrigt = otherCats.find(c => c.id === 'ovrigt' || c.name.toLowerCase() === 'övrigt') || otherCats[0];
      setTargetMigrationId(ovrigt?.id || otherCats[0]?.id || '');
      setDeleteMigrationData({ type, category: cat, count: affected.length });
    } else {
      setDeleteConfirmIndex({ type, index, category: cat });
    }
  };

  const renderCategoryList = (type: 'expense' | 'income') => {
    const field = type === 'income' ? 'incomeCategories' : 'categories';
    const list = config[field] || [];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-3 px-1 gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {list.length} {config.language === 'en' ? 'categories' : 'kategorier'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={13} strokeWidth={2} />}
              onClick={() => setIsResetCategoriesModalOpen(true)}
            >
              {config.language === 'en' ? 'Reset to default' : 'Återställ standard'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} strokeWidth={2} />}
              onClick={() => handleAddCategory(type)}
            >
              {t('newCategory')}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {list.map((cat: any, index: number) => (
            <div
              key={cat.id || index}
              onClick={() => handleEditCategory(type, index, cat.name, cat.icon, cat.color)}
              style={{ backgroundColor: cat.color || getCategoryColor(cat.name, config?.categories) }}
              className="h-32 sm:h-36 p-4 rounded-[22px] flex flex-col items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden"
            >
              <CategoryIcon icon={cat.icon} size="lg" noBackground whiteIcon />
              <span className="text-[14px] sm:text-[15px] font-bold text-white text-center truncate w-full px-1 drop-shadow-xs">
                {cat.name}
              </span>
            </div>
          ))}

          {/* Dashed Add New Category Card */}
          <button
            type="button"
            onClick={() => handleAddCategory(type)}
            className="h-32 sm:h-36 p-4 rounded-[22px] border-2 border-dashed border-black/10 dark:border-white/15 hover:border-[var(--accent-color)] dark:hover:border-[var(--accent-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] group-hover:bg-[var(--accent-color)]/10 transition-colors">
              <Plus size={18} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
              {t('newCategory')}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderCategoriesSettings = () => {
    return (
      <div className="space-y-6 w-full py-2">
        <div className="flex p-1 bg-black/[0.04] dark:bg-[#1C1C1C] rounded-[14px]">
          <button
            onClick={() => setCategoryTab('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
              categoryTab === 'expense'
                ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('expenses')}
          </button>
          <button
            onClick={() => setCategoryTab('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
              categoryTab === 'income'
                ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('incomes')}
          </button>
        </div>

        <div key={categoryTab}>
            {categoryTab === 'expense' ? renderCategoryList('expense') : renderCategoryList('income')}
        </div>
      </div>
    );
  };

  const renderPaymentMethodsSettings = () => {
    const methodsList = (config.paymentMethods || []).map((method, index) => {
      if (typeof method === 'string') {
        const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === (method as string).toLowerCase());
        return found || { name: method, icon: 'credit-card', color: '#6366f1' };
      }
      return {
        ...method,
        color: method.color || DEFAULT_PAYMENT_METHODS[index % DEFAULT_PAYMENT_METHODS.length]?.color || '#6366f1',
        icon: method.icon || 'credit-card'
      };
    });

    return (
      <div className="space-y-4 w-full py-2">
        <div className="flex items-center justify-between mb-2 px-1 gap-2 flex-wrap">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">
            {methodsList.length} {config.language === 'en' ? 'payment methods' : 'betalningsmetoder'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={13} strokeWidth={2} />}
              onClick={() => setIsResetPaymentMethodsModalOpen(true)}
            >
              {config.language === 'en' ? 'Reset to default' : 'Återställ standard'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={14} strokeWidth={2} />}
              onClick={() => {
                setPaymentMethodModalData({ name: '' });
                setIsPaymentMethodModalOpen(true);
              }}
            >
              {config.language === 'en' ? 'New payment method' : 'Ny betalmetod'}
            </Button>
          </div>
        </div>

        {/* Clean grouped list */}
        <div className="bg-[var(--surface-color)] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-none overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {methodsList.map((method: any, index: number) => {
            const IconComp = getPaymentMethodIcon(method.name);
            return (
              <button
                key={method.name || index}
                type="button"
                onClick={() => {
                  setPaymentMethodModalData({ index, name: method.name });
                  setIsPaymentMethodModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-[var(--text-secondary)] shrink-0 group-hover:text-[var(--text-primary)] group-hover:bg-black/[0.07] dark:group-hover:bg-white/[0.1] transition-all">
                    {IconComp ? (
                      <IconComp size={18} strokeWidth={2} />
                    ) : (
                      <CategoryIcon icon={method.icon || 'credit-card'} size="sm" noBackground />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] tracking-tight truncate">
                    {method.name}
                  </span>
                </div>
                <div className="text-[var(--text-tertiary)] shrink-0 pl-2 group-hover:text-[var(--text-secondary)] transition-colors">
                  <ChevronRight size={16} strokeWidth={2} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Dashed Add New Button at bottom */}
        <button
          type="button"
          onClick={() => {
            setPaymentMethodModalData({ name: '' });
            setIsPaymentMethodModalOpen(true);
          }}
          className="w-full py-3.5 px-4 rounded-[18px] border-2 border-dashed border-black/10 dark:border-white/15 hover:border-[var(--accent-color)] dark:hover:border-[var(--accent-color)] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer group active:scale-[0.99]"
        >
          <div className="w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-[var(--text-secondary)] group-hover:text-[var(--accent-color)] group-hover:bg-[var(--accent-color)]/10 transition-colors">
            <Plus size={13} strokeWidth={2.5} />
          </div>
          <span>{config.language === 'en' ? 'Add new payment method' : 'Lägg till betalningsmetod'}</span>
        </button>
      </div>
    );
  };

  const renderLanguageSettings = () => {
    const languages: { code: Language; label: string }[] = [
      { code: 'sv', label: 'Svenska' },
      { code: 'en', label: 'English' },
      { code: 'no', label: 'Norsk' },
      { code: 'fi', label: 'Suomi' },
    ];

    return (
      <div className="w-full py-2">
        <div className="bg-[var(--surface-color)] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-none overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {languages.map((l) => {
            const isSelected = config.language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setConfig({ ...config, language: l.code });
                }}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <LanguageFlag code={l.code} size="md" />
                  <span className={`text-sm tracking-tight ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}`}>
                    {l.label}
                  </span>
                </div>
                {isSelected && (
                  <div className="text-[var(--accent-color)] shrink-0 pl-2">
                    <Check size={18} strokeWidth={2} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const isEn = config.language === 'en';

  const THEME_COLOR_OPTIONS = [
    { id: 'dejz', name: 'Dejz', hex: '#3B82F6' },
    { id: 'purple', name: isEn ? 'Purple' : 'Lila', hex: '#635BFF' },
    { id: 'black', name: isEn ? 'Black' : 'Svart', hex: '#1C1917' },
    { id: 'green', name: isEn ? 'Green' : 'Grön', hex: '#16B878' },
    { id: 'pink', name: isEn ? 'Pink' : 'Rosa', hex: '#EC5F8D' },
    { id: 'orange', name: 'Orange', hex: '#F59E42' },
  ];

  const renderAppearanceSettings = () => {
    return (
      <div className="space-y-6 w-full py-2">
        <div className="space-y-3">
          <label className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight px-1 block">
            {isEn ? 'Appearance mode' : 'Utseendeläge'}
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'system', label: isEn ? 'System' : 'System', icon: <Monitor size={18} /> },
              { id: 'light', label: isEn ? 'Light' : 'Ljust', icon: <Sun size={18} /> },
              { id: 'dark', label: isEn ? 'Dark' : 'Mörkt', icon: <Moon size={18} /> },
            ].map((mode) => {
              const isSelected = config.themeMode === mode.id || (!config.themeMode && mode.id === 'system');
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    const isDark = mode.id === 'dark' || (mode.id === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    setConfig({ ...config, themeMode: mode.id as any, darkMode: isDark });
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 sm:p-4 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-none border-[var(--accent-color)]'
                      : 'bg-[var(--surface-color)] text-[var(--text-primary)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  {mode.icon}
                  <span className="text-xs font-bold">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Temafärg */}
        <div className="space-y-3 pt-2">
          <label className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight px-1 block">
            {isEn ? 'Theme color' : 'Temafärg'}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5">
            {THEME_COLOR_OPTIONS.map((theme) => {
              const currentHex = (config.themeColor || '#3B82F6').toLowerCase();
              const isSelected = currentHex === theme.hex.toLowerCase();

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setConfig({ ...config, themeColor: theme.hex });
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-2.5 sm:p-3 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--surface-color)] ring-2 ring-[var(--accent-color)] shadow-none'
                      : 'bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white transition-transform border border-black/10 dark:border-white/20 shadow-2xs"
                    style={{ backgroundColor: theme.hex }}
                  >
                    {isSelected && <Check size={15} strokeWidth={2.5} />}
                  </div>
                  <span className={`text-[11px] font-medium tracking-tight truncate w-full text-center ${
                    isSelected ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'
                  }`}>
                    {theme.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const PRESET_CURRENCIES = [
    { code: 'SEK', symbol: 'kr', name: { sv: 'Svenska kronor (kr)', en: 'Swedish Krona (kr)' }, flag: '🇸🇪', example: '1 250 kr' },
    { code: 'EUR', symbol: '€', name: { sv: 'Euro (€)', en: 'Euro (€)' }, flag: '🇪🇺', example: '1 250 €' },
    { code: 'USD', symbol: '$', name: { sv: 'US Dollar ($)', en: 'US Dollar ($)' }, flag: '🇺🇸', example: '1 250 $' },
    { code: 'NOK', symbol: 'kr', name: { sv: 'Norske kroner (kr)', en: 'Norwegian Krone (kr)' }, flag: '🇳🇴', example: '1 250 kr' },
    { code: 'DKK', symbol: 'kr', name: { sv: 'Danske kroner (kr)', en: 'Danish Krone (kr)' }, flag: '🇩🇰', example: '1 250 kr' },
    { code: 'GBP', symbol: '£', name: { sv: 'Brittiska pund (£)', en: 'British Pound (£)' }, flag: '🇬🇧', example: '1 250 £' },
    { code: 'CHF', symbol: 'CHF', name: { sv: 'Schweiziska franc (CHF)', en: 'Swiss Franc (CHF)' }, flag: '🇨🇭', example: '1 250 CHF' },
    { code: 'PLN', symbol: 'zł', name: { sv: 'Polska złoty (zł)', en: 'Polish Złoty (zł)' }, flag: '🇵🇱', example: '1 250 zł' },
    { code: 'JPY', symbol: '¥', name: { sv: 'Japanska yen (¥)', en: 'Japanese Yen (¥)' }, flag: '🇯🇵', example: '1 250 ¥' },
    { code: 'CAD', symbol: 'CAD $', name: { sv: 'Kanadensiska dollar', en: 'Canadian Dollar' }, flag: '🇨🇦', example: '1 250 CAD $' },
    { code: 'AUD', symbol: 'AUD $', name: { sv: 'Australiska dollar', en: 'Australian Dollar' }, flag: '🇦🇺', example: '1 250 AUD $' },
    { code: 'THB', symbol: '฿', name: { sv: 'Thailändska baht (฿)', en: 'Thai Baht (฿)' }, flag: '🇹🇭', example: '1 250 ฿' },
    { code: 'ISK', symbol: 'kr', name: { sv: 'Isländska krónur (kr)', en: 'Icelandic Króna (kr)' }, flag: '🇮🇸', example: '1 250 kr' },
  ];

  const handleSelectCurrency = (c: typeof PRESET_CURRENCIES[0]) => {
    setConfig({ ...config, currency: c.symbol, currencyCode: c.code });
  };

  const renderCurrencySettings = () => {
    const isEn = config.language === 'en';
    const activeCurrencyCode = config.currencyCode || (config.currency === 'kr' ? 'SEK' : PRESET_CURRENCIES.find(p => p.symbol === config.currency)?.code || 'SEK');

    return (
      <div className="w-full py-2">
        <div className="bg-[var(--surface-color)] rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04] overflow-hidden">
          {PRESET_CURRENCIES.map((c) => {
            const isSelected = activeCurrencyCode === c.code;
            const nameText = isEn ? c.name.en : c.name.sv;

            return (
              <button
                key={`${c.code}-${c.symbol}`}
                type="button"
                onClick={() => handleSelectCurrency(c)}
                className="w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0 select-none">{c.flag}</span>
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className={`text-[14px] tracking-tight ${isSelected ? 'font-semibold text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
                        {c.code}
                      </span>
                      <span className="text-[12px] font-normal text-[var(--text-secondary)]">
                        ({c.symbol})
                      </span>
                    </div>
                    <span className="text-[12px] font-normal text-[var(--text-secondary)] truncate mt-0.5">
                      {nameText}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <div className="text-[var(--accent-color)] shrink-0 pl-2">
                    <Check size={18} strokeWidth={2} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-12 max-w-md mx-auto">
      <div>
        {activeSection === 'salary' && (
          <div className="w-full py-2 space-y-4">
            <div className="overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04] rounded-[22px] bg-[var(--surface-color)] backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-none">
              
              {/* Payday Setting Row */}
              <button
                type="button"
                onClick={() => setIsPaydayModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.99] transition-all cursor-pointer text-left group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-primary)]">
                    <Calendar size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                      {config.language === 'en' ? 'Payday' : 'Lönedag'}
                    </span>
                    <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                      {formatPaydaySummary(config.payday || 25, config.language)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                    {config.language === 'en' 
                      ? `The ${formatOrdinalDay(config.payday || 25, 'en')}` 
                      : `Den ${formatOrdinalDay(config.payday || 25, 'sv')}`}
                  </span>
                  <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Weekend Handling Row */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 bg-black/5 dark:bg-white/5 text-[var(--text-primary)]">
                    <Clock size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                      {config.language === 'en' ? 'Pay early if weekend' : 'Helghantering'}
                    </span>
                    <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                      {config.language === 'en' 
                        ? 'Get paid Friday before if payday is on a weekend' 
                        : 'Få lön fredagen innan om lönedagen är en helg'}
                    </span>
                  </div>
                </div>
                <ToggleSwitch
                  isOn={!!config.paydayBeforeWeekend}
                  onToggle={() => {
                    setConfig({ ...config, paydayBeforeWeekend: !config.paydayBeforeWeekend });
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeSection === 'categories' && renderCategoriesSettings()}
        {activeSection === 'paymentMethods' && renderPaymentMethodsSettings()}
        {activeSection === 'language' && renderLanguageSettings()}
        {activeSection === 'appearance' && renderAppearanceSettings()}
        {activeSection === 'currency' && renderCurrencySettings()}
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        type={categoryModalData?.type || 'expense'}
        initialData={categoryModalData}
        onSave={handleSaveCategoryModal}
        onDelete={(index) => {
          handleDeleteCategory(categoryModalData!.type, index);
          setIsCategoryModalOpen(false);
        }}
        t={t}
      />

      <PaymentMethodModal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => setIsPaymentMethodModalOpen(false)}
        initialName={paymentMethodModalData?.name}
        initialIcon={paymentMethodModalData?.index !== undefined ? (typeof config.paymentMethods[paymentMethodModalData.index] === 'string' ? 'credit-card' : (config.paymentMethods[paymentMethodModalData.index]?.icon || 'credit-card')) : 'credit-card'}
        initialColor={paymentMethodModalData?.index !== undefined ? (typeof config.paymentMethods[paymentMethodModalData.index] === 'string' ? '#6366f1' : (config.paymentMethods[paymentMethodModalData.index]?.color || '#6366f1')) : '#6366f1'}
        onSave={(name, icon, color) => {
          const methods = [...(config.paymentMethods || [])].map((m) => {
            if (typeof m === 'string') {
              const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === m.toLowerCase());
              return found || { name: m, icon: 'credit-card', color: '#6366f1' };
            }
            return m;
          });
          if (paymentMethodModalData?.index !== undefined) {
            methods[paymentMethodModalData.index] = { name, icon, color };
          } else {
            methods.push({ name, icon, color });
          }
          setConfig({ ...config, paymentMethods: methods });
          setIsPaymentMethodModalOpen(false);
        }}
        onDelete={paymentMethodModalData?.index !== undefined ? () => {
          const methods = [...(config.paymentMethods || [])].filter((_, i) => i !== paymentMethodModalData.index);
          setConfig({ ...config, paymentMethods: methods });
          setIsPaymentMethodModalOpen(false);
        } : undefined}
        t={t}
      />

      {/* Category Deletion Migration Modal */}
      {deleteMigrationData && (
        <Modal
          isOpen={!!deleteMigrationData}
          onClose={() => setDeleteMigrationData(null)}
          center
          size="sm"
          title={config.language === 'en' ? `Delete ${deleteMigrationData.category.name}?` : `Ta bort ${deleteMigrationData.category.name}?`}
          showCloseButton={true}
          bodyClassName="p-6 space-y-4"
        >
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            {config.language === 'en'
              ? `This category is used by ${deleteMigrationData.count} transactions. Choose which category to move them to before deleting.`
              : `Kategorin används av ${deleteMigrationData.count} transaktioner. Välj vilken kategori de ska flyttas till innan den tas bort.`}
          </p>
          <div className="space-y-2 mb-2">
            <label className="text-xs font-semibold font-display tracking-wider text-[var(--text-secondary)]">
              {config.language === 'en' ? 'Move transactions to:' : 'Flytta transaktioner till:'}
            </label>
            <select
              value={targetMigrationId}
              onChange={(e) => setTargetMigrationId(e.target.value)}
              className="w-full h-[48px] bg-[var(--surface-muted)] border border-black/[0.06] dark:border-white/[0.08] rounded-[14px] px-3 text-[14px] font-normal text-[var(--text-primary)] outline-none"
            >
              {(deleteMigrationData.type === 'income' ? (config.incomeCategories || []) : (config.categories || []))
                .filter(c => c.id !== deleteMigrationData.category.id)
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={() => {
                onMigrateAndDeleteCategory?.(deleteMigrationData.type, deleteMigrationData.category.id, targetMigrationId);
                setDeleteMigrationData(null);
              }}
              variant="danger"
              fullWidth
            >
              {config.language === 'en' ? 'Move & Delete' : 'Flytta & ta bort'}
            </Button>
            <Button
              onClick={() => setDeleteMigrationData(null)}
              variant="ghost"
              fullWidth
            >
              {config.language === 'en' ? 'Cancel' : 'Avbryt'}
            </Button>
          </div>
        </Modal>
      )}

      {deleteConfirmIndex && (
        <ConfirmModal
          isOpen={!!deleteConfirmIndex}
          title={config.language === 'en' ? `Delete ${deleteConfirmIndex.category.name}?` : `Ta bort ${deleteConfirmIndex.category.name}?`}
          message={config.language === 'en' 
            ? 'Are you sure you want to delete this category? It is not used by any transactions.' 
            : 'Är du säker på att du vill ta bort denna kategori? Den används inte av några transaktioner.'}
          confirmText={config.language === 'en' ? 'Delete' : 'Ta bort'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          onConfirm={() => {
            const field = deleteConfirmIndex.type === 'income' ? 'incomeCategories' : 'categories';
            const currentCategories = config[field] || [];
            const newCategories = currentCategories.filter((_, i) => i !== deleteConfirmIndex.index);
            setConfig({ ...config, [field]: newCategories });
            setDeleteConfirmIndex(null);
          }}
          onCancel={() => setDeleteConfirmIndex(null)}
          variant="danger"
          t={t}
        />
      )}

      {pendingPayday !== null && (
        <ConfirmModal
          isOpen={pendingPayday !== null}
          title={config.language === 'en' 
            ? `Change payday to the ${formatOrdinalDay(pendingPayday, 'en')}?` 
            : `Ändra lönedag till den ${formatOrdinalDay(pendingPayday, 'sv')}?`}
          message={config.language === 'en'
            ? 'Your current period will adjust to your next salary. Previous periods and history will not be affected.'
            : 'Din aktuella period anpassas efter din nästa lön. Tidigare perioder och din historik påverkas inte.'}
          confirmText={config.language === 'en' ? 'Change payday' : 'Ändra lönedag'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          variant="info"
          onConfirm={() => {
            if (pendingPayday !== null) {
              setConfig({ ...config, payday: pendingPayday });
            }
            setPendingPayday(null);
          }}
          onCancel={() => setPendingPayday(null)}
          t={t}
        />
      )}

      {isResetCategoriesModalOpen && (
        <ConfirmModal
          isOpen={isResetCategoriesModalOpen}
          title={config.language === 'en' ? 'Reset categories to default?' : 'Återställ kategorier till standard?'}
          message={config.language === 'en'
            ? 'This will restore all standard expense and income categories with their original colors and icons.'
            : 'Detta återställer alla utgifts- och inkomstkategorier till standardlistan med ursprungliga ikoner och färger.'}
          confirmText={config.language === 'en' ? 'Reset' : 'Återställ'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={() => {
            setConfig({
              ...config,
              categories: DEFAULT_EXPENSE_CATEGORIES,
              incomeCategories: DEFAULT_INCOME_CATEGORIES
            });
            setIsResetCategoriesModalOpen(false);
          }}
          onCancel={() => setIsResetCategoriesModalOpen(false)}
          t={t}
        />
      )}

      {isResetPaymentMethodsModalOpen && (
        <ConfirmModal
          isOpen={isResetPaymentMethodsModalOpen}
          title={config.language === 'en' ? 'Reset payment methods to default?' : 'Återställ betalningsmetoder?'}
          message={config.language === 'en'
            ? 'This will restore all standard payment methods including Apple, Klarna, PayPal, Swish, Kortbetalning, Autogiro etc.'
            : 'Detta återställer alla betalningsmetoder till standardlistan inklusive Apple, Klarna, PayPal, Swish, Kortbetalning, Autogiro m.fl.'}
          confirmText={config.language === 'en' ? 'Reset' : 'Återställ'}
          cancelText={config.language === 'en' ? 'Cancel' : 'Avbryt'}
          variant="danger"
          onConfirm={() => {
            setConfig({
              ...config,
              paymentMethods: DEFAULT_PAYMENT_METHODS
            });
            setIsResetPaymentMethodsModalOpen(false);
          }}
          onCancel={() => setIsResetPaymentMethodsModalOpen(false)}
          t={t}
        />
      )}

      <Modal
        isOpen={isPaydayModalOpen}
        onClose={() => setIsPaydayModalOpen(false)}
        title={config.language === 'en' ? 'Choose payday' : 'Välj lönedag'}
        subtitle={config.language === 'en' ? 'Select the day of the month you receive your salary' : 'Välj vilken dag i månaden du får lön'}
        size="sm"
      >
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2.5 py-2">
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
            const isSelected = config.payday === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  handleUpdatePayday(day);
                  setIsPaydayModalOpen(false);
                }}
                className={`py-3 rounded-[14px] text-sm font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-md scale-105'
                    : 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/15'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
