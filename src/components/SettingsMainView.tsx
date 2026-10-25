import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Building2 } from 'lucide-react';
import { Config, Income, FixedExpense } from '../types';
import { Language, TranslationKey, languageInfo } from '../i18n';
import { LanguageFlag } from './LanguageFlag';
import { SettingsView } from './SettingsView';
import { BankConnectionView } from './BankConnectionView';
import { isBankIntegrationEnabledForUser } from '../utils/bankFeatureFlag';
import { formatPaydaySummary } from '../utils/format';
import { Card, ListRow, Icon, SegmentedControl } from './ui';

interface SettingsMainViewProps {
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
  onResetSavingsPot: () => void;
  onResetCompletedGoals: () => void;
  onClearTransactions: () => void;
  onResetAll: () => void;
  onTriggerProUpgradeModal?: () => void;
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
  transactions?: any[];
  onMigrateAndDeleteCategory?: (type: 'income' | 'expense', deleteCategoryId: string, migrateToCategoryId?: string) => void;
  onNavigate: (tab: string, section?: string) => void;
  initialSection?: 'main' | 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency' | 'notifications' | 'bank' | 'bankTransactions';
  onCancelledSubscriptionsClick?: () => void;
  incomes?: Income[];
  fixedExpenses?: FixedExpense[];
  stats?: any;
  currentPeriodId?: string;
}

export function SettingsMainView({
  onBack: _onBack,
  config,
  setConfig,
  t,
  onSecurityClick,
  subscriptionStatus,
  onFeedbackClick,
  onExportData,
  onLegalClick,
  profile,
  userId,
  session,
  onRefresh,
  onResetSavingsPot,
  onResetCompletedGoals,
  onClearTransactions,
  onResetAll,
  onTriggerProUpgradeModal,
  onRenameCategory,
  transactions,
  onMigrateAndDeleteCategory,
  onNavigate,
  initialSection = 'main',
  onCancelledSubscriptionsClick,
  incomes = [],
  fixedExpenses = [],
  stats,
  currentPeriodId,
}: SettingsMainViewProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency' | 'notifications' | 'bank' | 'bankTransactions'>(initialSection);
  const canUseBankIntegration = isBankIntegrationEnabledForUser(session?.user, profile?.role);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const handleSectionClick = (section: any) => {
    setActiveSection(section);
    onNavigate('settings', section);
  };

  if ((activeSection === 'bank' || activeSection === 'bankTransactions') && canUseBankIntegration) {
    return (
      <BankConnectionView
        config={config}
        initialSubView={activeSection === 'bankTransactions' ? 'transactions' : 'connections'}
        onSubViewChange={(sub) => {
          const nextSection = sub === 'transactions' ? 'bankTransactions' : 'bank';
          setActiveSection(nextSection);
          onNavigate('settings', nextSection);
        }}
      />
    );
  }

  if (activeSection !== 'main') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-col gap-section w-full font-sans"
      >
        <SettingsView
          activeSection={activeSection as any}
          onBack={() => {
            setActiveSection('main');
            onNavigate('settings', 'main');
          }}
          config={config}
          setConfig={setConfig}
          t={t}
          onSecurityClick={onSecurityClick}
          subscriptionStatus={subscriptionStatus}
          onFeedbackClick={onFeedbackClick}
          onExportData={onExportData}
          onLegalClick={onLegalClick}
          profile={profile}
          userId={userId}
          session={session}
          onRefresh={onRefresh}
          onResetSavingsPot={onResetSavingsPot}
          onResetCompletedGoals={onResetCompletedGoals}
          onClearTransactions={onClearTransactions}
          onResetAll={onResetAll}
          onTriggerProUpgradeModal={onTriggerProUpgradeModal}
          onRenameCategory={onRenameCategory}
          transactions={transactions}
          onMigrateAndDeleteCategory={onMigrateAndDeleteCategory}
          onNavigate={onNavigate}
          onCancelledSubscriptionsClick={onCancelledSubscriptionsClick}
          incomes={incomes}
          fixedExpenses={fixedExpenses}
          stats={stats}
          currentPeriodId={currentPeriodId}
        />
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col gap-section w-full font-sans"
    >
      <Card variant="default" padding="none" className="divide-y divide-menu">
        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="calendar" size={22} />}
          title={t('salary')}
          titleWeight="semibold"
          subtitle={
            config.payday 
              ? formatPaydaySummary(config.payday, config.language)
              : (config.language === 'en' ? 'Not specified' : 'Ej angivet')
          }
          onClick={() => handleSectionClick('salary')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="chart-pie" size={22} />}
          title={config.language === 'en' ? 'Budget' : 'Budget'}
          titleWeight="semibold"
          subtitle={config.language === 'en' ? 'Allocate monthly budget per category' : 'Fördela budget per kategori'}
          onClick={() => handleSectionClick('budget')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="tag" size={22} />}
          title={config.language === 'en' ? 'Categories' : 'Kategorier'}
          titleWeight="semibold"
          subtitle={config.language === 'en' ? 'Manage expense and income categories' : 'Hantera utgifts- och inkomstkategorier'}
          onClick={() => handleSectionClick('categories')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="credit-card" size={22} />}
          title={config?.language === 'en' ? 'Payment methods' : 'Betalmetoder'}
          titleWeight="semibold"
          subtitle={`${(config.paymentMethods || []).length} ${config?.language === 'en' ? 'methods' : 'metoder'}`}
          onClick={() => handleSectionClick('paymentMethods')}
        />

        {canUseBankIntegration && (
          <ListRow
            variant="grouped"
            showChevron
            icon={<Building2 size={22} />}
            title="Bankkoppling"
            titleWeight="semibold"
            subtitle="Anslutna banker, saldon & transaktioner"
            onClick={() => handleSectionClick('bank')}
          />
        )}

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="coins" size={22} />}
          title={config?.language === 'en' ? 'Currency' : 'Valuta'}
          titleWeight="semibold"
          subtitle={config.currency || 'kr'}
          onClick={() => handleSectionClick('currency')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="globe" size={22} />}
          title={t('language')}
          titleWeight="semibold"
          subtitle={languageInfo[(config.language as Language) || 'sv']?.label || 'Svenska'}
          value={<LanguageFlag code={(config.language as Language) || 'sv'} size="md" />}
          onClick={() => handleSectionClick('language')}
        />

        <ListRow
          variant="grouped"
          icon={<Icon name="palette" size={22} />}
          title={config?.language === 'en' ? 'Appearance' : 'Utseende'}
          titleWeight="semibold"
          control={
            <SegmentedControl
              size="sm"
              fullWidth={false}
              value={config.themeMode || (config.darkMode ? 'dark' : 'light')}
              options={[
                { value: 'light', label: config?.language === 'en' ? 'Light' : 'Ljust' },
                { value: 'dark', label: config?.language === 'en' ? 'Dark' : 'Mörkt' },
                { value: 'system', label: 'System' },
              ]}
              onChange={(nextMode) => {
                const isSystemDark =
                  typeof window !== 'undefined' &&
                  window.matchMedia &&
                  window.matchMedia('(prefers-color-scheme: dark)').matches;
                const nextDark =
                  nextMode === 'dark' ? true : nextMode === 'light' ? false : isSystemDark;
                try {
                  localStorage.setItem('dejz_dark_mode', nextMode);
                } catch (_e) {
                  // ignore
                }
                setConfig({
                  ...config,
                  themeMode: nextMode,
                  darkMode: nextDark,
                });
              }}
            />
          }
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="bell" size={22} />}
          title={config?.language === 'en' ? 'Notifications' : 'Notiser'}
          titleWeight="semibold"
          subtitle={config?.language === 'en' ? 'Manage notification preferences' : 'Anpassa vilka notiser du vill få'}
          onClick={() => handleSectionClick('notifications')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="ban" size={22} className="text-[var(--danger-color)]" />}
          title={config?.language === 'en' ? 'Cancelled Subscriptions' : 'Uppsagda abonnemang'}
          titleWeight="semibold"
          subtitle={config?.language === 'en' ? 'History and reactivate subscriptions' : 'Visa historik och återaktivera tjänster'}
          onClick={onCancelledSubscriptionsClick}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="envelope" size={22} />}
          title={t('feedback')}
          titleWeight="semibold"
          subtitle={config?.language === 'en' ? 'Share thoughts or report an issue' : 'Skicka synpunkter eller rapportera fel'}
          onClick={onFeedbackClick}
        />
      </Card>
    </motion.div>
  );
}
