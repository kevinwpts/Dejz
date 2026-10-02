import React, { useState } from 'react';
import { Plus, Check, Sun, Moon, Monitor } from 'lucide-react';
import { Config } from '../types';
import { Language, TranslationKey } from '../i18n';
import { LanguageFlag } from './LanguageFlag';
import { DEFAULT_PAYMENT_METHODS } from '../constants';
import { CategoryModal } from './CategoryModal';
import { PaymentMethodModal } from './BudgetModals';
import { ConfirmModal } from './ConfirmModal';
import { CategoryIcon } from './CategoryIcon';
import { Button, Modal } from './ui';
import { ToggleSwitch } from './ToggleSwitch';

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
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8]">
            {list.length} {t('categories').toLowerCase()}
          </span>
          <button
            onClick={() => handleAddCategory(type)}
            className="text-xs font-bold text-[#1C1917] dark:text-white flex items-center gap-1 bg-black/[0.04] dark:bg-[#222222] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] px-3.5 py-1.5 rounded-[12px] transition-colors cursor-pointer border-none"
          >
            <Plus size={14} strokeWidth={2} />
            {t('newCategory')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {list.map((cat: any, index: number) => (
            <div
              key={cat.id || index}
              onClick={() => handleEditCategory(type, index, cat.name, cat.icon, cat.color)}
              style={{ backgroundColor: cat.color || '#6E6961' }}
              className="h-32 sm:h-36 p-4 rounded-[24px] flex flex-col items-center justify-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-sm relative overflow-hidden"
            >
              <CategoryIcon icon={cat.icon} size="lg" noBackground whiteIcon />
              <span className="text-[14px] sm:text-[15px] font-bold text-white text-center truncate w-full px-1 drop-shadow-xs">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCategoriesSettings = () => {
    return (
      <div className="space-y-6 w-full py-2">
        <div className="flex p-1 bg-black/[0.04] dark:bg-[#222222] rounded-[16px]">
          <button
            onClick={() => setCategoryTab('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
              categoryTab === 'expense'
                ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] shadow-none'
                : 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white'
            }`}
          >
            {t('expenses')}
          </button>
          <button
            onClick={() => setCategoryTab('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-[12px] transition-all cursor-pointer ${
              categoryTab === 'income'
                ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] shadow-none'
                : 'text-[#6E6961] dark:text-[#A8A8A8] hover:text-[#1C1917] dark:hover:text-white'
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
    const methodsList = (config.paymentMethods || []).map((method) => {
      if (typeof method === 'string') {
        const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === (method as string).toLowerCase());
        return found || { name: method, icon: 'credit-card', color: '#6366f1' };
      }
      return method;
    });

    return (
      <div className="space-y-6 w-full py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8]">
            {methodsList.length} betalmetodsval
          </span>
          <button
            onClick={() => {
              setPaymentMethodModalData({ name: '' });
              setIsPaymentMethodModalOpen(true);
            }}
            className="text-xs font-bold text-[#1C1917] dark:text-white flex items-center gap-1 bg-black/[0.04] dark:bg-[#222222] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] px-3.5 py-1.5 rounded-[12px] transition-colors cursor-pointer border-none"
          >
            <Plus size={14} strokeWidth={2} />
            Ny betalmetod
          </button>
        </div>

        <div className="bg-white dark:bg-[#222222] rounded-[22px] border-none shadow-none overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {methodsList.map((method: any, index: number) => (
            <div
              key={method.name || index}
              onClick={() => {
                setPaymentMethodModalData({ index, name: method.name });
                setIsPaymentMethodModalOpen(true);
              }}
              className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon icon={method.icon} color={method.color} size="md" />
                <span className="text-sm font-semibold text-[#1C1917] dark:text-white">
                  {method.name}
                </span>
              </div>
              <span className="text-xs font-medium text-[#8C867C] dark:text-[#A8A8A8]">
                Redigera →
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLanguageSettings = () => {
    const languages: { code: Language; label: string }[] = [
      { code: 'sv', label: 'Svenska' },
      { code: 'en', label: 'English' },
    ];

    return (
      <div className="space-y-4 w-full py-2">
        <div className="bg-white dark:bg-[#222222] rounded-[22px] border-none shadow-none overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
          {languages.map((l) => (
            <div
              key={l.code}
              onClick={() => {
                setConfig({ ...config, language: l.code });
              }}
              className="flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LanguageFlag code={l.code} size="md" />
                <span className="text-sm font-semibold text-[#1C1917] dark:text-white">
                  {l.label}
                </span>
              </div>
              {config.language === l.code && (
                <div className="w-6 h-6 rounded-full bg-[#1C1917] dark:bg-white flex items-center justify-center text-white dark:text-[#1C1917]">
                  <Check size={14} strokeWidth={2.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const THEME_COLOR_OPTIONS = [
    { id: 'dejz', name: 'Dejz', hex: '#635BFF' },
    { id: 'blue', name: 'Blå', hex: '#3B82F6' },
    { id: 'green', name: 'Grön', hex: '#16B878' },
    { id: 'pink', name: 'Rosa', hex: '#EC5F8D' },
    { id: 'orange', name: 'Orange', hex: '#F59E42' },
  ];

  const renderAppearanceSettings = () => {
    return (
      <div className="space-y-6 w-full py-2">
        <div className="space-y-3">
          <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-1">
            Utseendeläge
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'system', label: 'System', icon: <Monitor size={18} className="text-white" /> },
              { id: 'light', label: 'Ljust', icon: <Sun size={18} className="text-white" /> },
              { id: 'dark', label: 'Mörkt', icon: <Moon size={18} className="text-white" /> },
            ].map((mode) => {
              const isSelected = config.themeMode === mode.id || (!config.themeMode && mode.id === 'system');
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    const isDark = mode.id === 'dark' || (mode.id === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    setConfig({ ...config, themeMode: mode.id as any, darkMode: isDark });
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[18px] border-none transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] shadow-none'
                      : 'bg-white dark:bg-[#1C1C1C] text-[#1C1917] dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
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
          <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8] ml-1">
            Temafärg
          </label>
          <div className="grid grid-cols-5 gap-2 sm:gap-3">
            {THEME_COLOR_OPTIONS.map((theme) => {
              const currentHex = (config.themeColor || '#635BFF').toLowerCase();
              const isSelected = currentHex === theme.hex.toLowerCase();

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => {
                    setConfig({ ...config, themeColor: theme.hex });
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-[18px] border-none transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-white dark:bg-[#1C1C1C] ring-2 ring-[var(--accent-color)] shadow-none'
                      : 'bg-white dark:bg-[#1C1C1C] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white transition-transform"
                    style={{ backgroundColor: theme.hex }}
                  >
                    {isSelected && <Check size={15} strokeWidth={2.5} />}
                  </div>
                  <span className={`text-[11px] font-medium tracking-tight truncate w-full text-center ${
                    isSelected ? 'text-[#1C1917] dark:text-white font-semibold' : 'text-[#6E6961] dark:text-[#A8A8A8]'
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

  const handleSelectCurrency = (newSymbol: string) => {
    setConfig({ ...config, currency: newSymbol });
  };

  const renderCurrencySettings = () => {
    const isEn = config.language === 'en';
    const activeCurrency = config.currency || 'kr';

    return (
      <div className="space-y-3 w-full py-2">
        <h3 className="text-[14px] font-semibold text-[#211F1C] dark:text-white px-1 tracking-tight">
          {isEn ? 'Select Currency' : 'Välj valuta'}
        </h3>

        <div className="bg-white dark:bg-[#222222] rounded-[22px] border-none shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04] overflow-hidden">
          {PRESET_CURRENCIES.map((c) => {
            const isSelected = activeCurrency === c.symbol || activeCurrency === c.code;
            const nameText = isEn ? c.name.en : c.name.sv;

            return (
              <button
                key={`${c.code}-${c.symbol}`}
                type="button"
                onClick={() => handleSelectCurrency(c.symbol)}
                className={`w-full flex items-center justify-between p-3.5 sm:p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors cursor-pointer text-left ${
                  isSelected ? 'bg-accent/10' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0 select-none">{c.flag}</span>
                  <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[#211F1C] dark:text-white tracking-tight">
                        {c.code}
                      </span>
                      <span className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8]">
                        ({c.symbol})
                      </span>
                    </div>
                    <span className="text-[12px] font-normal text-[#6D6962] dark:text-[#A8A8A8] truncate mt-0.5">
                      {nameText}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]'
                      : 'border border-black/10 dark:border-white/10'
                  }`}>
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-12">
       <div>
        {activeSection === 'salary' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#222222] p-5 rounded-[22px] border-none shadow-none space-y-5">
              <h2 className="text-sm font-bold text-[#1C1917] dark:text-white">Lönedag & Period</h2>
              
              {/* Payday Setting Row */}
              <div className="space-y-1.5">
                <button
                  onClick={() => setIsPaydayModalOpen(true)}
                  className="w-full flex items-center justify-between p-4 rounded-[16px] bg-black/[0.04] dark:bg-[#222222] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors cursor-pointer text-left border-none"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8]">Lönedag</span>
                    <span className="text-sm font-bold text-[#1C1917] dark:text-white mt-0.5">
                      {config.language === 'en' ? `The ${config.payday}` : `Den ${config.payday}:e`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8]">
                    <span>Ändra</span>
                    <span className="text-base">›</span>
                  </div>
                </button>
              </div>

              {/* Weekend Handling Row */}
              <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                <div className="flex items-center justify-between p-1">
                  <div className="flex flex-col pr-4">
                    <span className="text-xs font-semibold text-[#1C1917] dark:text-white">
                      {config.language === 'en' ? 'Pay early if payday is on a weekend' : 'Helghantering'}
                    </span>
                    <span className="text-[11px] text-[#6E6961] dark:text-[#A8A8A8] mt-0.5">
                      {config.language === 'en' ? 'Get paid the Friday before if payday is a weekend' : 'Få lön fredagen innan om lönedagen är helg'}
                    </span>
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
        initialIcon={paymentMethodModalData?.index !== undefined ? config.paymentMethods[paymentMethodModalData.index].icon : 'credit-card'}
        initialColor={paymentMethodModalData?.index !== undefined ? config.paymentMethods[paymentMethodModalData.index].color : '#6366f1'}
        onSave={(data) => {
          const methods = [...(config.paymentMethods || [])];
          if (paymentMethodModalData?.index !== undefined) {
            methods[paymentMethodModalData.index] = data;
          } else {
            methods.push(data);
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#222222] w-full max-w-sm rounded-[24px] p-6 relative border border-black/[0.08] dark:border-white/[0.08] shadow-2xl font-sans">
            <h3 className="text-lg font-bold text-[#1C1917] dark:text-white mb-2">
              Ta bort {deleteMigrationData.category.name}?
            </h3>
            <p className="text-xs text-[#6E6961] dark:text-[#A8A8A8] mb-4 leading-relaxed">
              Kategorin används av {deleteMigrationData.count} transaktioner. Välj vilken kategori de ska flyttas till innan den tas bort.
            </p>
            <div className="space-y-4 mb-6">
              <label className="text-xs font-semibold text-[#6E6961] dark:text-[#A8A8A8]">Flytta transaktioner till:</label>
              <select
                value={targetMigrationId}
                onChange={(e) => setTargetMigrationId(e.target.value)}
                className="w-full h-[48px] bg-black/5 dark:bg-[#222222] border border-black/10 dark:border-white/10 rounded-[14px] px-3 text-[14px] font-normal text-[#1C1917] dark:text-white outline-none"
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
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => {
                  onMigrateAndDeleteCategory?.(deleteMigrationData.type, deleteMigrationData.category.id, targetMigrationId);
                  setDeleteMigrationData(null);
                }}
                variant="danger"
                fullWidth
              >
                Flytta & ta bort
              </Button>
              <Button
                onClick={() => setDeleteMigrationData(null)}
                variant="ghost"
                fullWidth
              >
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmIndex && (
        <ConfirmModal
          isOpen={!!deleteConfirmIndex}
          title={`Ta bort ${deleteConfirmIndex.category.name}?`}
          message="Är du säker på att du vill ta bort denna kategori? Den används inte av några transaktioner."
          confirmText="Ta bort"
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
          title={`Ändra lönedag till den ${pendingPayday}:e?`}
          message="Din aktuella period anpassas efter din nästa lön. Tidigare perioder och din historik påverkas inte."
          confirmText="Ändra lönedag"
          cancelText="Avbryt"
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
                onClick={() => {
                  handleUpdatePayday(day);
                  setIsPaydayModalOpen(false);
                }}
                className={`py-3 rounded-[14px] text-sm font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-[#1C1917] dark:bg-white text-white dark:text-[#1C1917] shadow-md scale-105'
                    : 'bg-black/5 dark:bg-[#222222] text-[#1C1917] dark:text-white hover:bg-black/10 dark:hover:bg-white/15'
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
