import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, CreditCard, Tag, Plus, Check, Globe, RotateCcw } from 'lucide-react';
import { Config, PaydayType, WeekendAdjustment } from '../types';
import { getActualPayday } from '../utils/date';
import { Language, TranslationKey, languageInfo } from '../i18n';
import { LanguageFlag } from './LanguageFlag';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants';
import { CategoryModal } from './CategoryModal';
import { PaymentMethodModal } from './BudgetModals';
import { ConfirmModal } from './ConfirmModal';
import { CategoryTile } from './CategoryTile';
import { CategoryIcon } from './CategoryIcon';

interface SettingsViewProps {
  activeSection: 'salary' | 'categories' | 'paymentMethods' | 'language';
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
}


const sectionHeaders: Record<Language, Record<string, { title: string; subtitle?: string }>> = {
  sv: {
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
  <div className="max-w-md mx-auto mb-3 text-center select-none pt-2 pb-1">
    <div className="mx-auto w-12 h-12 rounded-2xl bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center border border-[var(--accent-color)]/20 mb-2 transition-transform duration-300 hover:rotate-6">
      <Icon size={22} className="stroke-[2.2]" />
    </div>
    <h3 className="text-lg font-bold text-[var(--text-primary)] tracking-tight px-2 leading-tight">
      {title}
    </h3>
    {subtitle && (
      <p className="text-xs font-semibold text-[var(--text-secondary)] opacity-60 mt-1 max-w-[280px] mx-auto leading-relaxed">
        {subtitle}
      </p>
    )}
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
  onTriggerProUpgradeModal: _onTriggerProUpgradeModal
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
    
    if (data.index !== undefined) {
      currentCategories[data.index] = { ...currentCategories[data.index], name: data.name, icon: data.icon, color: data.color };
    } else {
      currentCategories.push({ name: data.name, icon: data.icon, color: data.color });
    }
    
    setConfig({ ...config, [field]: currentCategories });
    setIsCategoryModalOpen(false);
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
      paymentMethods: ['Autogiro', 'Faktura', 'Kortbetalning', 'Swish', 'Övrigt']
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
      <div className="space-y-6 max-w-md mx-auto py-2">
        <SectionHeading icon={Calendar} title={header.title} subtitle={header.subtitle} />
        {/* Next Payday Status Line — Minimalist and subtle */}
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] px-1">
          <Calendar size={14} className="opacity-60" />
          <span>
            {config.language === 'en' ? 'Next planned payday: ' : 'Nästa planerade lönedag: '}
            <strong className="text-[var(--text-primary)] font-medium">{capitalizedDate}</strong>
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
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] relative ${
                  isSelected 
                    ? 'bg-accent/5 border-[var(--accent-color)] text-[var(--text-primary)] shadow-sm' 
                    : 'bg-[var(--surface-color)] border-[var(--border-color)]/30 text-[var(--text-primary)] hover:border-[var(--border-color)]/60'
                }`}
              >
                <span className="text-sm font-semibold tracking-tight leading-snug">{option.label}</span>
                <div className="relative flex items-center justify-center flex-shrink-0">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--text-on-accent)] shadow-sm">
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
              <div className="bg-[var(--surface-color)] border border-[var(--border-color)]/30 rounded-2xl p-4 mt-1.5 space-y-3">
                <p className="text-[11px] text-[var(--text-secondary)] text-center font-medium">
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
              config.paydayBeforeWeekend ? 'bg-[#356BFF]' : 'bg-[var(--border-color)]'
            }`}
          >
            <motion.div 
              layout
              className="w-4 h-4 bg-white rounded-full absolute top-1 left-1" 
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
    return (
      <div className="space-y-4 max-w-md mx-auto py-2">
        <SectionHeading icon={CreditCard} title={header.title} subtitle={header.subtitle} />
        <div className="grid grid-cols-3 gap-3">
          {(config.paymentMethods || []).map((method, index) => (
            <button
              key={index}
              onClick={() => {
                setPaymentMethodModalData({ index, name: method.name });
                setIsPaymentMethodModalOpen(true);
              }}
              className="relative bg-[var(--surface-muted)]/50 border border-[var(--border-color)] rounded-[16px] p-3 flex flex-col items-center gap-2 hover:bg-[var(--surface-muted)] transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-[var(--accent-color)]/10 text-[var(--accent-color)] flex items-center justify-center">
                <CategoryIcon icon={method.icon} color={method.color} size="md" />
              </div>
              <span className="text-[11.5px] font-medium tracking-tight text-center line-clamp-2 leading-snug break-words hyphens-auto opacity-90 w-full px-0.5">
                {method.name}
              </span>
            </button>
          ))}
          <button
            onClick={() => {
              setPaymentMethodModalData({ name: '' });
              setIsPaymentMethodModalOpen(true);
            }}
            className="border-2 border-dashed border-[var(--border-color)] rounded-[16px] p-3 flex flex-col items-center justify-center gap-2 hover:border-[var(--accent-color)] text-[var(--text-secondary)] hover:text-[var(--accent-color)] transition-all"
          >
            <Plus size={20} />
            <span className="text-[11.5px] font-medium tracking-tight text-center">Ny</span>
          </button>
        </div>

        <div className="pt-2">
          <button 
            onClick={handleResetPaymentMethods}
            className="w-full h-11 flex items-center justify-center gap-2 p-3 bg-[var(--surface-color)] border border-[var(--border-color)]/20 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.98] group"
          >
            <RotateCcw size={13} strokeWidth={2} className="opacity-75" />
            <span className="text-xs font-semibold tracking-wide">
              {config.language === 'en' ? "Reset to standard" : "Återställ till standard"}
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderLanguageSettings = () => (
    <div className="space-y-4 max-w-md mx-auto py-2">
      <SectionHeading icon={Globe} title={(sectionHeaders[config.language || 'sv']?.language || sectionHeaders.sv.language).title} subtitle={(sectionHeaders[config.language || 'sv']?.language || sectionHeaders.sv.language).subtitle} />
      <div className="flex flex-col gap-2">
        {Object.entries(languageInfo).map(([code, info]) => {
          const isSelected = config.language === code;
          return (
            <button
               key={code}
               onClick={() => setConfig({ ...config, language: code as Language })}
               className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-[0.98] relative ${
                 isSelected 
                   ? 'bg-[var(--accent-color)]/10 border-[var(--accent-color)] text-[var(--text-primary)] shadow-sm' 
                   : 'bg-[var(--surface-color)] border-[var(--border-color)]/30 text-[var(--text-primary)] hover:border-[var(--border-color)]/60'
               }`}
             >
               <div className="flex items-center gap-3">
                 <LanguageFlag language={code as Language} size="lg" />
                 <span className="text-sm font-semibold tracking-tight leading-snug">{info.label}</span>
               </div>
               <div className="relative flex items-center justify-center flex-shrink-0">
                 {isSelected ? (
                   <div className="w-5 h-5 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[var(--text-on-accent)] shadow-sm">
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

  return (
    <div className="space-y-6">
      <div key={activeSection}>
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
