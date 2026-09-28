import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CreditCard, Tag, Plus, Check, Globe, RotateCcw, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { Config, PaydayType, WeekendAdjustment } from '../types';
import { getActualPayday } from '../utils/date';
import { Language, TranslationKey, languageInfo } from '../i18n';
import { LanguageFlag } from './LanguageFlag';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_PAYMENT_METHODS } from '../constants';
import { CategoryModal } from './CategoryModal';
import { PaymentMethodModal } from './BudgetModals';
import { ConfirmModal } from './ConfirmModal';
import { CategoryTile } from './CategoryTile';
import { CategoryIcon } from './CategoryIcon';

interface SettingsViewProps {
  activeSection: 'salary' | 'categories' | 'paymentMethods' | 'language' | 'appearance';
  onBack: () => void;
  config: Config;
  setConfig: (config: Config) => void;
  t: (key: TranslationKey) => string;
  onSecurityClick: () => void;
  subscriptionStatus: string | null;
  onFeedbackClick: () => void;
  onExportData: () => void;
  onLegalClick: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  profile: any;
  userId: string;
  session: any;
  onRefresh: () => void;
  onNavigateToProfile: () => void;
  onResetSavingsPot: () => void;
  onResetCompletedGoals: () => void;
  onClearTransactions: () => void;
  onResetAll: () => void;
  onTriggerProUpgradeModal?: () => void;
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
}


const sectionHeaders: Record<Language, Record<string, { title: string; subtitle?: string }>> = {
  sv: {
    appearance: {
      title: "Hur vill du att appen ska se ut?",
      subtitle: "Välj mellan automatiskt systemläge, ljust eller mörkt tema"
    },
    language: {
      title: "Vilket språk ska appen vara i?",
      subtitle: "Välj det språk du föredrar för gränssnitt och kategorier"
    },
    salary: {
      title: "När får du din lön?",
      subtitle: "Ställ in ditt månatliga lönedatum för att beräkna dina dagsbudgetar rätt"
    },
    categories: {
      title: "Hantera dina kategorier",
      subtitle: "Skapa och redigera dina utgifts- och inkomstkategorier"
    },
    paymentMethods: {
      title: "Vilka betalningsmetoder använder du?",
      subtitle: "Anpassa listan över betalsätt som visas när du registrerar köp"
    }
  },
  en: {
    appearance: {
      title: "How would you like the app to look?",
      subtitle: "Choose between automatic system mode, light or dark theme"
    },
    language: {
      title: "Which language should the app be in?",
      subtitle: "Choose your preferred language for interfaces and categories"
    },
    salary: {
      title: "When do you get paid?",
      subtitle: "Set up your monthly payday to calculate your daily budgets correctly"
    },
    categories: {
      title: "Manage your categories",
      subtitle: "Create and edit your expense and income categories"
    },
    paymentMethods: {
      title: "Which payment methods do you use?",
      subtitle: "Customize the list of payment options visible when registering purchases"
    }
  },
  no: {
    language: {
      title: "Hvilket språk skal appen være på?",
      subtitle: "Velg ditt foretrukne språk for grensesnitt og kategorier"
    },
    salary: {
      title: "Når får du lønn?",
      subtitle: "Konfigurer din månedlige lønningsdag for å beregne dagsbudsjettene dine riktig"
    },
    categories: {
      title: "Administrer kategoriene dine",
      subtitle: "Opprett og rediger dine utgifts- og inntektskategorier"
    },
    paymentMethods: {
      title: "Hvilke betalingsmåter bruker du?",
      subtitle: "Tilpass listen over betalingsmåter som vises når du registrerer kjøp"
    }
  },
  da: {
    language: {
      title: "Hvilket sprog skal appen være på?",
      subtitle: "Vælg dit foretrukne sprog til grænseflade og kategorier"
    },
    salary: {
      title: "Hvornår får du løn?",
      subtitle: "Indstil din månedlige lønningsdag for at beregne dine daglige budgetter korrekt"
    },
    categories: {
      title: "Administrer dine kategorier",
      subtitle: "Opret og rediger dine udgifts- og indkomstkategorier"
    },
    paymentMethods: {
      title: "Hvilke betalingsmetoder bruger du?",
      subtitle: "Tilpas listen over betalingsmetoder, der vises, når du registrerer køb"
    }
  },
  fi: {
    language: {
      title: "Millä kielellä haluat käyttää sovellusta?",
      subtitle: "Valitse haluamasi kieli käyttöliittymälle ja kategorioille"
    },
    salary: {
      title: "Milloin saat palkkasi?",
      subtitle: "Valitse kuukausittainen palkkapäiväsi päivittäisten budjettien laskemiseksi oikein"
    },
    categories: {
      title: "Hallitse kategorioitasi",
      subtitle: "Luo ja muokkaa meno- ja tulokategorioitasi"
    },
    paymentMethods: {
      title: "Mitä maksutapoja käytät?",
      subtitle: "Muokkaa maksutapojen luetteloa, joka näkyy ostoksia kirjattaessa"
    }
  }
};

const SectionHeading = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="max-w-md mx-auto mb-3 text-left select-none pt-1 pb-0.5 px-1">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center border border-[var(--accent-color)]/25 shrink-0 transition-transform duration-300 hover:rotate-6">
        <Icon size={18} strokeWidth={2} />
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[11px] font-medium text-[var(--text-secondary)] opacity-75 mt-0.5 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  </div>
);

export function SettingsView({ 
  activeSection,
  _onBack,
  config, 
  setConfig, 
  t, 
  _onSecurityClick, 
  subscriptionStatus: _subscriptionStatus,
  _onFeedbackClick,
  _onExportData,
  _onLegalClick,
  profile: _profile,
  _userId,
  session: _session,
  _onRefresh,
  onNavigateToProfile: _onNavigateToProfile,
  _onResetSavingsPot,
  _onResetCompletedGoals,
  _onClearTransactions,
  _onResetAll,
  onTriggerProUpgradeModal: _onTriggerProUpgradeModal,
  onRenameCategory,
}: SettingsViewProps) {
  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');

  // Reset scroll position when switching sections
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  // Code removed

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [paymentMethodModalData, setPaymentMethodModalData] = useState<{ index?: number, name: string } | null>(null);
  const [categoryModalData, setCategoryModalData] = useState<{ type: 'income' | 'expense', index?: number, name: string, icon: string, color?: string } | null>(null);
  const [resetConfirmType, setResetConfirmType] = useState<'expense' | 'income' | null>(null);

  const handleUpdatePayday = (day: number) => {
    setConfig({ ...config, payday: day });
  };

  const handleUpdatePaydayType = (type: PaydayType) => {
    setConfig({ ...config, paydayType: type });
  };

  const handleUpdateWeekendHandling = (enabled: boolean) => {
    setConfig({ ...config, paydayBeforeWeekend: enabled });
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
      currentCategories.push({ name: data.name, icon: data.icon, color: data.color });
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
    const newCategories = currentCategories.filter((_, i) => i !== index);
    
    setConfig({
      ...config,
      [field]: newCategories
    });
  };

  const handleResetPaymentMethods = () => {
    setConfig({
      ...config,
      paymentMethods: DEFAULT_PAYMENT_METHODS
    });
  };

  const isExpenseDefault = JSON.stringify(config.categories) === JSON.stringify(DEFAULT_EXPENSE_CATEGORIES);
  const isIncomeDefault = JSON.stringify(config.incomeCategories) === JSON.stringify(DEFAULT_INCOME_CATEGORIES);

  const _renderIconPicker = () => null;

  const renderSalarySettings = () => {
    const header = sectionHeaders[config.language || 'sv']?.salary || sectionHeaders.sv.salary;
    // 1. Calculate next payday
    const getNextPayday = () => {
      const now = new Date();
      const paydaySetting = config.payday || 25;
      const paydayType = config.paydayType || PaydayType.TWENTY_FIFTH;
      const adjustment = config.paydayBeforeWeekend ? WeekendAdjustment.BEFORE : WeekendAdjustment.NONE;

      let targetPayday = getActualPayday(now.getFullYear(), now.getMonth(), paydayType, paydaySetting, adjustment);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const paydayStart = new Date(targetPayday.getFullYear(), targetPayday.getMonth(), targetPayday.getDate());

      if (todayStart >= paydayStart) {
        const nextMonth = now.getMonth() + 1;
        const targetYear = now.getFullYear() + (nextMonth > 11 ? 1 : 0);
        const targetMonth = nextMonth % 12;
        targetPayday = getActualPayday(targetYear, targetMonth, paydayType, paydaySetting, adjustment);
      }
      return targetPayday;
    };

    const nextPayday = getNextPayday();
    const lang = config.language === 'en' ? 'en-US' : config.language === 'da' ? 'da-DK' : config.language === 'no' ? 'no-NO' : config.language === 'fi' ? 'fi-FI' : 'sv-SE';
    
    // Format payday name elegantly
    const formattedDate = nextPayday.toLocaleDateString(lang, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const paydayOptions = [
      { type: PaydayType.FIRST_DAY, label: t('firstDayOfMonth') },
      { type: PaydayType.LAST_DAY, label: t('lastDayOfMonth') },
      { type: PaydayType.TWENTY_FIFTH, label: t('twentyFifth') },
      { type: PaydayType.CUSTOM, label: t('customDay') }
    ];

    return (
      <div className="space-y-4 max-w-md mx-auto py-1">
        <SectionHeading icon={Calendar} title={header.title} subtitle={header.subtitle} />
        {/* Next Payday Status Line — Minimalist and subtle */}
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)] px-1">
          <Calendar size={13} className="opacity-60" />
          <span>
            {config.language === 'en' ? 'Next planned payday: ' : 'Nästa planerade lönedag: '}
            <strong className="text-[var(--text-primary)] font-semibold">{capitalizedDate}</strong>
          </span>
        </div>

        {/* Pure & Simple Modular list stacked vertically ("under varandra") */}
        <div className="flex flex-col gap-2">
          {paydayOptions.map((option) => {
            const isSelected = config.paydayType === option.type;
            return (
              <button
                key={option.type}
                onClick={() => handleUpdatePaydayType(option.type)}
                className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[20px] border backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer relative ${
                  isSelected 
                    ? 'bg-accent/10 border-[var(--accent-color)] text-[var(--text-primary)] shadow-xs' 
                    : 'bg-[var(--surface-color)] border-[var(--border-color)]/50 text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <span className="text-[13.5px] font-semibold tracking-tight leading-snug">{option.label}</span>
                <div className="relative flex items-center justify-center flex-shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--text-on-accent)] shadow-xs">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[var(--border-color)]/60 opacity-60" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Calendar-like Grid Selector cleanly placed directly under the options */}
        <AnimatePresence mode="popLayout">
          {config.paydayType === PaydayType.CUSTOM && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="bg-[var(--surface-color)] backdrop-blur-xl border border-[var(--border-color)]/60 rounded-[24px] p-4.5 mt-2 space-y-3 shadow-sm">
                <p className="text-[11px] text-[var(--text-secondary)] text-center font-semibold uppercase tracking-wider opacity-75">
                  {config.language === 'en' ? 'Select date of the month:' : 'Välj datum i månaden:'}
                </p>
                <div className="grid grid-cols-7 gap-1 px-1 justify-items-center max-w-[280px] mx-auto">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isDaySelected = config.payday === day;
                    return (
                      <button
                        key={day}
                        onClick={() => handleUpdatePayday(day)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all relative ${
                          isDaySelected
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold shadow-sm'
                            : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Weekend handling row, following the same list style */}
        <div className="border-b border-[var(--border-color)]/30 pb-5 pt-1 px-1 flex items-center justify-between gap-6">
          <div className="space-y-0.5">
            <span className="text-sm font-medium text-[var(--text-primary)] block">
              {t('weekendHandling')}
            </span>
            <span className="text-xs text-[var(--text-secondary)] opacity-80 leading-normal block">
              {config.language === 'en' 
                ? 'Get paid Friday if payday falls on a weekend' 
                : 'Få lön på fredagen om lönedagen är en helgdag'}
            </span>
          </div>

          <button 
            onClick={() => handleUpdateWeekendHandling(!config.paydayBeforeWeekend)}
            className={`w-10 h-6 rounded-full relative transition-colors duration-200 flex-shrink-0 outline-none ${
              config.paydayBeforeWeekend ? 'bg-[var(--accent-color)] dark:bg-white' : 'bg-[var(--surface-muted)]'
            }`}
          >
            <motion.div 
              layout
              className="w-4 h-4 bg-white dark:bg-black rounded-full absolute top-1 left-1" 
              animate={{ x: config.paydayBeforeWeekend ? 16 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>
    );
  };

  const renderCategoryList = (type: 'expense' | 'income') => {
    const field = type === 'expense' ? 'categories' : 'incomeCategories';
    const defaultCategories = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
    const defaultNames = defaultCategories.map(c => c.name);
    
    const allCategories = (config[field] || []).map((cat, index) => ({ ...cat, originalIndex: index })).filter(cat => cat && typeof cat.name === 'string' && cat.name.trim() !== '');
    
    const standardCats = allCategories.filter(c => defaultNames.includes(c.name));
    const customCats = allCategories.filter(c => !defaultNames.includes(c.name));

    const renderCat = (cat: any) => {
      const index = cat.originalIndex;
      
      return (
        <CategoryTile
          key={index}
          name={cat.name}
          icon={cat.icon}
          color={cat.color}
          onClick={() => handleEditCategory(type, index, cat.name, cat.icon, cat.color)}
        />
      );
    };

    const isDefault = type === 'expense' ? isExpenseDefault : isIncomeDefault;

    return (
      <div className="space-y-4">
        <div className="surface-card overflow-hidden relative p-4 space-y-6">
          {standardCats.length > 0 && (
            <div>
              <div className="px-1 mb-3 text-xs font-semibold text-[var(--text-secondary)]">
                Standardkategorier
              </div>
              <div className="grid grid-cols-3 gap-3">
                {standardCats.map(renderCat)}
              </div>
            </div>
          )}
          {customCats.length > 0 && (
            <div>
              <div className="px-1 mb-3 text-xs font-semibold text-[var(--text-secondary)]">
                Egna kategorier
              </div>
              <div className="grid grid-cols-3 gap-3">
                {customCats.map(renderCat)}
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <button
            onClick={() => handleAddCategory(type)}
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-[var(--accent-color)]/10 rounded-xl text-[var(--accent-color)] font-semibold text-xs hover:bg-[var(--accent-color)]/15 transition-all active:scale-[0.98] h-11"
          >
            <Plus size={15} />
            {t('newCategory')}
          </button>
        </div>

        {!isDefault && (
          <div className="mt-6 pt-6">
            <button
              onClick={() => setResetConfirmType(type)}
              className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-color)] transition-all active:scale-[0.98]"
            >
              <RotateCcw size={14} />
              <span className="text-xs font-semibold tracking-wide">{t('resetToDefaultCategories')}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCategoriesSettings = () => {
    const header = sectionHeaders[config.language || 'sv']?.categories || sectionHeaders.sv.categories;
    return (
      <div className="space-y-6 max-w-md mx-auto py-2">
        <SectionHeading icon={Tag} title={header.title} subtitle={header.subtitle} />
        <div className="flex p-1 bg-[var(--bg-color)] rounded-2xl border-[0.5px] border-[var(--border-color)]">
          <button
            onClick={() => setCategoryTab('expense')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              categoryTab === 'expense'
                ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)] '
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('expenses')}
          </button>
          <button
            onClick={() => setCategoryTab('income')}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all ${
              categoryTab === 'income'
                ? 'bg-success text-[var(--text-on-accent)] '
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
    const header = sectionHeaders[config.language || 'sv']?.paymentMethods || sectionHeaders.sv.paymentMethods;
    const methodsList = (config.paymentMethods || []).map((method) => {
      if (typeof method === 'string') {
        const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === (method as string).toLowerCase());
        return found || { name: method, icon: 'credit-card', color: '#6366f1' };
      }
      return method;
    });

    return (
      <div className="space-y-4 max-w-md mx-auto py-1">
        <SectionHeading icon={CreditCard} title={header.title} subtitle={header.subtitle} />
        <div className="grid grid-cols-3 gap-2.5">
          {methodsList.map((method, index) => (
            <button
              key={index}
              onClick={() => {
                setPaymentMethodModalData({ index, name: method.name });
                setIsPaymentMethodModalOpen(true);
              }}
              className="relative bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[14px] p-2.5 flex flex-col items-center gap-1.5 hover:bg-[var(--surface-muted)] transition-all cursor-pointer active:scale-95"
            >
              <div className="w-8.5 h-8.5 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center">
                <CategoryIcon icon={method.icon} color={method.color} size="sm" />
              </div>
              <span className="text-[11px] font-medium tracking-tight text-center line-clamp-2 leading-snug break-words hyphens-auto opacity-90 w-full px-0.5">
                {method.name}
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setPaymentMethodModalData({ name: '' });
              setIsPaymentMethodModalOpen(true);
            }}
            className="border-2 border-dashed border-[var(--border-color)] rounded-[14px] p-2.5 flex flex-col items-center justify-center gap-1.5 hover:border-[var(--accent-color)] text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-all cursor-pointer active:scale-95 min-h-[72px]"
          >
            <Plus size={16} />
            <span className="text-[11px] font-medium tracking-tight text-center">Ny</span>
          </button>
        </div>

        <div className="pt-1">
          <button 
            onClick={handleResetPaymentMethods}
            className="w-full h-10 flex items-center justify-center gap-2 p-2.5 bg-[var(--surface-color)] border border-[var(--border-color)]/20 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.98] group cursor-pointer"
          >
            <RotateCcw size={12} strokeWidth={2} className="opacity-75" />
            <span className="text-xs font-semibold tracking-wide">
              {config.language === 'en' ? "Reset to standard" : "Återställ till standard"}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderLanguageSettings = () => (
    <div className="space-y-4 max-w-md mx-auto py-1">
      <SectionHeading icon={Globe} title={(sectionHeaders[config.language || 'sv']?.language || sectionHeaders.sv.language).title} subtitle={(sectionHeaders[config.language || 'sv']?.language || sectionHeaders.sv.language).subtitle} />
      <div className="flex flex-col gap-2">
        {Object.entries(languageInfo).map(([code, info]) => {
          const isSelected = config.language === code;
          return (
            <button
               key={code}
               onClick={() => setConfig({ ...config, language: code as Language })}
               className={`w-full flex items-center justify-between py-3.5 px-4 rounded-[20px] border backdrop-blur-xl transition-all active:scale-[0.98] cursor-pointer relative ${
                 isSelected 
                   ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] text-[var(--text-primary)] shadow-xs' 
                   : 'bg-[var(--surface-color)] border-[var(--border-color)]/50 text-[var(--text-primary)] hover:border-[var(--border-color)]'
               }`}
             >
               <div className="flex items-center gap-3">
                 <LanguageFlag language={code as Language} size="md" />
                 <span className="text-[13.5px] font-semibold tracking-tight leading-snug">{info.label}</span>
               </div>
               <div className="relative flex items-center justify-center flex-shrink-0">
                 {isSelected ? (
                   <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--text-on-accent)] shadow-xs">
                     <Check size={11} strokeWidth={3} />
                   </div>
                 ) : (
                   <div className="w-5 h-5 rounded-full border border-[var(--border-color)]/60 opacity-60" />
                 )}
               </div>
             </button>
           );
         })}
       </div>
    </div>
  );

  const renderAppearanceSettings = () => {
    const currentMode = config.themeMode || 'system';

    const options: { id: 'system' | 'light' | 'dark'; label: string; desc: string; icon: any }[] = [
      {
        id: 'system',
        label: t('themeSystem' as any) || 'System',
        desc: t('themeSystemDesc' as any) || 'Följer enhetens automatiska läge',
        icon: Monitor
      },
      {
        id: 'light',
        label: t('themeLight' as any) || 'Ljust läge',
        desc: t('themeLightDesc' as any) || 'Klassiskt ljust utseende',
        icon: Sun
      },
      {
        id: 'dark',
        label: t('themeDark' as any) || 'Mörkt läge',
        desc: t('themeDarkDesc' as any) || 'Mörkt och behagligt för ögonen',
        icon: Moon
      }
    ];

    const handleSelectMode = (mode: 'system' | 'light' | 'dark') => {
      const isDark = mode === 'dark' 
        ? true 
        : mode === 'light' 
        ? false 
        : (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

      setConfig({
        ...config,
        themeMode: mode,
        darkMode: isDark
      });
    };

    return (
      <div className="space-y-4 max-w-md mx-auto py-1">
        <SectionHeading 
          icon={Palette} 
          title={(sectionHeaders[config.language || 'sv']?.appearance || sectionHeaders.sv.appearance).title} 
          subtitle={(sectionHeaders[config.language || 'sv']?.appearance || sectionHeaders.sv.appearance).subtitle} 
        />
        <div className="flex flex-col gap-2.5">
          {options.map((opt) => {
            const isSelected = currentMode === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectMode(opt.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer relative text-left ${
                  isSelected 
                    ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] text-[var(--text-primary)] shadow-xs' 
                    : 'bg-[var(--surface-color)] border-[var(--border-color)]/50 text-[var(--text-primary)] hover:border-[var(--border-color)]'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? 'bg-[var(--accent-color)] text-[var(--text-on-accent)]' : 'bg-[var(--surface-muted)] text-[var(--text-secondary)]'
                  }`}>
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold tracking-tight">{opt.label}</span>
                      {opt.id === 'system' && (
                        <span className="text-[10px] font-semibold bg-[var(--accent-color)]/15 text-[var(--accent-color)] px-2 py-0.5 rounded-full">
                          Förvalt
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] opacity-80 mt-0.5 truncate">{opt.desc}</p>
                  </div>
                </div>
                <div className="relative flex items-center justify-center flex-shrink-0 ml-3">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--text-on-accent)] shadow-xs">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-[var(--border-color)]/70 opacity-60" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div key={activeSection}>
          {activeSection === 'appearance' && renderAppearanceSettings()}
          {activeSection === 'salary' && renderSalarySettings()}
          {activeSection === 'categories' && renderCategoriesSettings()}
          {activeSection === 'paymentMethods' && renderPaymentMethodsSettings()}
          {activeSection === 'language' && renderLanguageSettings()}
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        type={categoryModalData?.type || 'expense'}
        initialData={categoryModalData}
        onSave={handleSaveCategoryModal}
        onDelete={(index) => {
          handleDeleteCategory(categoryModalData!.type, index);
        }}
        t={t}
      />

      <PaymentMethodModal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => setIsPaymentMethodModalOpen(false)}
        initialName={paymentMethodModalData?.name}
        initialIcon={paymentMethodModalData?.index !== undefined ? config.paymentMethods[paymentMethodModalData.index].icon : 'credit-card'}
        initialColor={paymentMethodModalData?.index !== undefined ? config.paymentMethods[paymentMethodModalData.index].color : '#6366f1'}
        onSave={(name, icon, color) => {
          if (paymentMethodModalData?.index !== undefined) {
            const currentMethods = [...(config.paymentMethods || [])];
            currentMethods[paymentMethodModalData.index] = { name, icon, color };
            setConfig({ ...config, paymentMethods: currentMethods });
          } else {
            setConfig({ ...config, paymentMethods: [...(config.paymentMethods || []), { name, icon, color }] });
          }
          setIsPaymentMethodModalOpen(false);
        }}
        onDelete={() => {
          if (paymentMethodModalData?.index !== undefined) {
            setConfig({
              ...config,
              paymentMethods: config.paymentMethods.filter((_, i) => i !== paymentMethodModalData.index)
            });
          }
          setIsPaymentMethodModalOpen(false);
        }}
        t={t}
      />

      <ConfirmModal
        isOpen={!!resetConfirmType}
        title={t('resetCategoriesConfirmTitle')}
        message={t('resetCategoriesConfirmMessage')}
        confirmText={t('resetCategoriesConfirmButton')}
        cancelText={t('cancel')}
        variant="danger"
        onConfirm={() => {
          if (resetConfirmType) {
            setConfig({
              ...config,
              [resetConfirmType === 'expense' ? 'categories' : 'incomeCategories']:
                resetConfirmType === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES
            });
            setResetConfirmType(null);
          }
        }}
        onCancel={() => setResetConfirmType(null)}
        t={t}
      />
    </div>
  );
}
