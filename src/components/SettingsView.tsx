import React, { useState } from 'react';
import { Config } from '../types';
import { Language, TranslationKey } from '../i18n';
import { LanguageFlag } from './LanguageFlag';
import { DEFAULT_PAYMENT_METHODS } from '../constants';
import { PaymentMethodModal } from './BudgetModals';
import { ConfirmModal } from './ConfirmModal';
import { Button, Modal, Card, ListRow, Switch, Icon } from './ui';
import { formatPaydaySummary, formatOrdinalDay } from '../utils/format';
import { getPaymentMethodIcon } from '../utils/icons';
import { CategoryIcon } from './CategoryIcon';

import { BudgetCategoriesView } from './BudgetCategoriesView';

interface SettingsViewProps {
  activeSection: 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency' | 'notifications';
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
  incomes?: any[];
  fixedExpenses?: any[];
  stats?: any;
  currentPeriodId?: string;
}

export function SettingsView({ 
  activeSection,
  onBack,
  config, 
  setConfig, 
  t, 
  onSecurityClick: _onSecurityClick, 
  subscriptionStatus: _subscriptionStatus,
  onFeedbackClick: _onFeedbackClick,
  onExportData: _onExportData,
  onLegalClick: _onLegalClick,
  profile: _profile,
  userId,
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
  incomes = [],
  fixedExpenses = [],
  stats,
  currentPeriodId,
}: SettingsViewProps) {
  // Reset scroll position when switching sections
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);

  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [paymentMethodModalData, setPaymentMethodModalData] = useState<{ index?: number, name: string } | null>(null);

  const [pendingPayday, setPendingPayday] = useState<number | null>(null);
  const [isPaydayModalOpen, setIsPaydayModalOpen] = useState(false);
  const [isResetPaymentMethodsModalOpen, setIsResetPaymentMethodsModalOpen] = useState(false);

  const handleUpdatePayday = (day: number) => {
    if (day === config.payday) return;
    setPendingPayday(day);
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
        <div className="flex items-center justify-end mb-2 px-1">
          <Button
            variant="secondary"
            size="sm"
            icon={<Icon name="plus" size={14} />}
            onClick={() => {
              setPaymentMethodModalData({ name: '' });
              setIsPaymentMethodModalOpen(true);
            }}
          >
            {config.language === 'en' ? 'New payment method' : 'Ny betalmetod'}
          </Button>
        </div>

        {/* Clean grouped list */}
        <Card variant="default" padding="none" className="divide-y divide-menu">
          {methodsList.map((method: any, index: number) => {
            const isDefault = DEFAULT_PAYMENT_METHODS.some(dm => dm.name.toLowerCase() === method.name.toLowerCase());
            const IconComp = isDefault ? getPaymentMethodIcon(method.name) : null;
            return (
              <ListRow
                key={method.name || index}
                variant="grouped"
                density="compact"
                showChevron
                icon={
                  IconComp ? (
                    <IconComp size={18} strokeWidth={2} />
                  ) : (
                    <CategoryIcon icon={method.icon || 'credit-card'} size="sm" noBackground />
                  )
                }
                iconBg="bg-black/5 dark:bg-white/5"
                iconColor="text-[var(--text-secondary)]"
                title={method.name}
                onClick={() => {
                  setPaymentMethodModalData({ index, name: method.name });
                  setIsPaymentMethodModalOpen(true);
                }}
              />
            );
          })}
        </Card>

        {/* Reset button placed under everything */}
        <div className="pt-2 pb-1 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<Icon name="arrow-counter-clockwise" size={13} />}
            onClick={() => setIsResetPaymentMethodsModalOpen(true)}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            {config.language === 'en' ? 'Reset payment methods' : 'Återställ betalningsmetoder'}
          </Button>
        </div>
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
        <Card variant="default" padding="none" className="divide-y divide-menu">
          {languages.map((l) => {
            const isSelected = config.language === l.code;
            return (
              <ListRow
                key={l.code}
                variant="grouped"
                density="compact"
                icon={<LanguageFlag code={l.code} size="md" />}
                iconBg="bg-transparent"
                title={l.label}
                titleClassName={isSelected ? 'font-medium text-[var(--text-primary)]' : 'font-medium text-[var(--text-secondary)]'}
                showCheck={isSelected}
                onClick={() => {
                  setConfig({ ...config, language: l.code });
                }}
              />
            );
          })}
        </Card>
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
              { id: 'system', label: isEn ? 'System' : 'System', icon: <Icon name="monitor" size={18} /> },
              { id: 'light', label: isEn ? 'Light' : 'Ljust', icon: <Icon name="sun" size={18} /> },
              { id: 'dark', label: isEn ? 'Dark' : 'Mörkt', icon: <Icon name="moon" size={18} /> },
            ].map((mode) => {
              const isSelected = config.themeMode === mode.id || (!config.themeMode && mode.id === 'system');
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    const isDark = mode.id === 'dark' || (mode.id === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    setConfig({ ...config, themeMode: mode.id as any, darkMode: isDark });
                  }}
                  className={`flex flex-col items-center justify-center gap-2 p-3.5 sm:p-4 rounded-[var(--radius-card)] transition-all cursor-pointer ${
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
                  className={`flex flex-col items-center justify-center gap-2 p-2.5 sm:p-3 rounded-[var(--radius-card)] transition-all cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'bg-[var(--surface-color)] ring-2 ring-[var(--accent-color)] shadow-none'
                      : 'bg-[var(--surface-color)] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white transition-transform border border-subtle shadow-2xs"
                    style={{ backgroundColor: theme.hex }}
                  >
                    {isSelected && <Icon name="check" size={15} weight="bold" />}
                  </div>
                  <span className={`text-[11px] font-medium tracking-tight truncate w-full text-center ${
                    isSelected ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
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
        <Card variant="default" padding="none" className="divide-y divide-menu">
          {PRESET_CURRENCIES.map((c) => {
            const isSelected = activeCurrencyCode === c.code;
            const nameText = isEn ? c.name.en : c.name.sv;

            return (
              <ListRow
                key={`${c.code}-${c.symbol}`}
                variant="grouped"
                icon={<span className="text-xl shrink-0 select-none">{c.flag}</span>}
                iconBg="bg-transparent"
                title={
                  <div className="flex items-center gap-2">
                    <span className={`text-sm tracking-tight ${isSelected ? 'font-medium text-[var(--text-primary)]' : 'font-medium text-[var(--text-primary)]'}`}>
                      {c.code}
                    </span>
                    <span className="text-xs font-normal text-[var(--text-secondary)]">
                      ({c.symbol})
                    </span>
                  </div>
                }
                subtitle={nameText}
                showCheck={isSelected}
                onClick={() => handleSelectCurrency(c)}
              />
            );
          })}
        </Card>
      </div>
    );
  };

  const renderNotificationsSettings = () => {
    const isEn = config.language === 'en';
    const notifs = config.notifications || {};

    const handleToggle = (key: keyof NonNullable<Config['notifications']>) => {
      setConfig({
        ...config,
        notifications: {
          ...config.notifications,
          [key]: notifs[key] === false ? true : false,
        },
      });
    };

    return (
      <div className="w-full py-2 space-y-4">
        <Card variant="default" padding="none" className="divide-y divide-menu">
          {/* 1. Variable Amounts / Rörliga belopp */}
          <ListRow
            variant="grouped"
            multiline
            icon={<Icon name="receipt" size={18} />}
            iconBg="bg-black/5 dark:bg-white/5"
            title={isEn ? 'Variable amounts' : 'Rörliga belopp'}
            subtitle={
              isEn
                ? 'Reminders when a new period starts to enter updated amounts for variable bills and income'
                : 'Påminnelse vid ny månad/period att fylla i belopp för rörliga räkningar och inkomster'
            }
            control={
              <Switch
                checked={notifs.variableAmountsReminder !== false}
                onChange={() => handleToggle('variableAmountsReminder')}
                aria-label={isEn ? 'Variable amounts' : 'Rörliga belopp'}
              />
            }
          />

          {/* 2. Salary / Lön & Utbetalningar */}
          <ListRow
            variant="grouped"
            multiline
            icon={<Icon name="calendar" size={18} />}
            iconBg="bg-black/5 dark:bg-white/5"
            title={isEn ? 'Payday & income' : 'Lön & utbetalningar'}
            subtitle={
              isEn
                ? 'Notification on payday when your new budget period starts'
                : 'Notis på lönedagen när den nya budgetperioden påbörjas'
            }
            control={
              <Switch
                checked={notifs.salaryDayReminder !== false}
                onChange={() => handleToggle('salaryDayReminder')}
                aria-label={isEn ? 'Payday & income' : 'Lön & utbetalningar'}
              />
            }
          />

          {/* 3. Fixed Expense Due Dates / Fasta utgifter & förfallodagar */}
          <ListRow
            variant="grouped"
            multiline
            icon={<Icon name="clock" size={18} />}
            iconBg="bg-black/5 dark:bg-white/5"
            title={isEn ? 'Fixed expense due dates' : 'Fasta utgifter & förfallodagar'}
            subtitle={
              isEn
                ? 'Reminders before fixed subscriptions or bills are due'
                : 'Påminnelse innan fasta abonnemang och räkningar dras'
            }
            control={
              <Switch
                checked={notifs.fixedExpenseDueReminder !== false}
                onChange={() => handleToggle('fixedExpenseDueReminder')}
                aria-label={isEn ? 'Fixed expense due dates' : 'Fasta utgifter & förfallodagar'}
              />
            }
          />

          {/* 4. Weekly Summary & Budget Alerts / Veckoöversikt & budgetvarningar */}
          <ListRow
            variant="grouped"
            multiline
            icon={<Icon name="bell" size={18} />}
            iconBg="bg-black/5 dark:bg-white/5"
            title={isEn ? 'Weekly summary & budget alerts' : 'Veckoöversikt & budgetvarningar'}
            subtitle={
              isEn
                ? 'Weekly overview and warnings when nearing category budget limits'
                : 'Veckovis sammanfattning samt notis när du närmar dig en budgetgräns'
            }
            control={
              <Switch
                checked={notifs.weeklySummary !== false}
                onChange={() => handleToggle('weeklySummary')}
                aria-label={isEn ? 'Weekly summary & budget alerts' : 'Veckoöversikt & budgetvarningar'}
              />
            }
          />
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-5 font-sans pb-12 page-max mx-auto w-full">
      <div>
        {activeSection === 'salary' && (
          <div className="w-full py-2 space-y-4">
            <Card variant="default" padding="none" className="divide-y divide-menu">
              {/* Payday Setting Row */}
              <ListRow
                variant="grouped"
                showChevron
                icon={<Icon name="calendar" size={18} />}
                iconBg="bg-black/5 dark:bg-white/5"
                title={config.language === 'en' ? 'Payday' : 'Lönedag'}
                subtitle={formatPaydaySummary(config.payday || 25, config.language)}
                value={
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-primary)]">
                    {config.language === 'en' 
                      ? `The ${formatOrdinalDay(config.payday || 25, 'en')}` 
                      : `Den ${formatOrdinalDay(config.payday || 25, 'sv')}`}
                  </span>
                }
                onClick={() => setIsPaydayModalOpen(true)}
              />

              {/* Weekend Handling Row */}
              <ListRow
                variant="grouped"
                multiline
                icon={<Icon name="clock" size={18} />}
                iconBg="bg-black/5 dark:bg-white/5"
                title={config.language === 'en' ? 'Pay early if weekend' : 'Helghantering'}
                subtitle={
                  config.language === 'en' 
                    ? 'Get paid Friday before if payday is on a weekend' 
                    : 'Få lön fredagen innan om lönedagen är en helg'
                }
                control={
                  <Switch
                    checked={!!config.paydayBeforeWeekend}
                    onChange={() => {
                      setConfig({ ...config, paydayBeforeWeekend: !config.paydayBeforeWeekend });
                    }}
                    aria-label={config.language === 'en' ? 'Pay early if weekend' : 'Helghantering'}
                  />
                }
              />
            </Card>
          </div>
        )}

        {activeSection === 'budget' && (
          <BudgetCategoriesView
            mode="budget"
            config={config}
            setConfig={setConfig}
            incomes={incomes}
            fixedExpenses={fixedExpenses}
            stats={stats}
            currentPeriodId={currentPeriodId}
            transactions={transactions}
            t={t}
            onRenameCategory={onRenameCategory}
            onMigrateAndDeleteCategory={onMigrateAndDeleteCategory}
            initialTab="budget"
            onDone={onBack}
            userId={userId}
          />
        )}

        {activeSection === 'categories' && (
          <BudgetCategoriesView
            mode="categories"
            config={config}
            setConfig={setConfig}
            incomes={incomes}
            fixedExpenses={fixedExpenses}
            stats={stats}
            currentPeriodId={currentPeriodId}
            transactions={transactions}
            t={t}
            onRenameCategory={onRenameCategory}
            onMigrateAndDeleteCategory={onMigrateAndDeleteCategory}
            initialTab="categories"
            onDone={onBack}
            userId={userId}
          />
        )}
        {activeSection === 'paymentMethods' && renderPaymentMethodsSettings()}
        {activeSection === 'language' && renderLanguageSettings()}
        {activeSection === 'appearance' && renderAppearanceSettings()}
        {activeSection === 'currency' && renderCurrencySettings()}
        {activeSection === 'notifications' && renderNotificationsSettings()}
      </div>

      <PaymentMethodModal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => {
          setIsPaymentMethodModalOpen(false);
          setPaymentMethodModalData(null);
        }}
        initialName={paymentMethodModalData?.name}
        initialIcon={(() => {
          if (paymentMethodModalData?.index === undefined) return 'credit-card';
          const method = config.paymentMethods[paymentMethodModalData.index];
          if (!method) return 'credit-card';
          if (typeof method === 'string') {
            const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === method.toLowerCase());
            return found?.icon || 'credit-card';
          }
          return method.icon || 'credit-card';
        })()}
        initialColor={(() => {
          if (paymentMethodModalData?.index === undefined) return '#6366f1';
          const method = config.paymentMethods[paymentMethodModalData.index];
          if (!method) return '#6366f1';
          if (typeof method === 'string') {
            const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === method.toLowerCase());
            return found?.color || '#6366f1';
          }
          return method.color || '#6366f1';
        })()}
        onSave={(name, icon, color) => {
          const oldName = paymentMethodModalData?.name;
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

          const updatedConfig = { ...config, paymentMethods: methods };

          if (oldName && oldName.trim() && oldName.trim().toLowerCase() !== name.trim().toLowerCase()) {
            if (updatedConfig.fixedExpenses) {
              updatedConfig.fixedExpenses = updatedConfig.fixedExpenses.map(fe => 
                fe.paymentMethod === oldName ? { ...fe, paymentMethod: name } : fe
              );
            }
            if (updatedConfig.incomes) {
              updatedConfig.incomes = updatedConfig.incomes.map(inc => 
                inc.paymentMethod === oldName ? { ...inc, paymentMethod: name } : inc
              );
            }
            if (updatedConfig.savings) {
              updatedConfig.savings = updatedConfig.savings.map(s => 
                s.paymentMethod === oldName ? { ...s, paymentMethod: name } : s
              );
            }
          }

          setConfig(updatedConfig);
          if (onRefresh) onRefresh();
          setIsPaymentMethodModalOpen(false);
          setPaymentMethodModalData(null);
        }}
        onDelete={paymentMethodModalData?.index !== undefined ? () => {
          const methods = [...(config.paymentMethods || [])].filter((_, i) => i !== paymentMethodModalData.index);
          setConfig({ ...config, paymentMethods: methods });
          setIsPaymentMethodModalOpen(false);
          setPaymentMethodModalData(null);
        } : undefined}
        t={t}
      />

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
        size="md"
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
                className={`py-3 rounded-[var(--radius-card-nested,10px)] text-sm font-bold transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-subtle scale-105'
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
