import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Config, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';
import { formatPaydaySummary } from '../utils/format';
import { Card, ListRow, Icon } from './ui';

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
  initialSection?: 'main' | 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency' | 'notifications';
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
  const [activeSection, setActiveSection] = useState<'main' | 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency' | 'notifications'>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const handleSectionClick = (section: any) => {
    setActiveSection(section);
    onNavigate('settings', section);
  };

  if (activeSection !== 'main') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5"
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
      className="space-y-4 max-w-md mx-auto"
    >
      <Card variant="default" padding="none" className="divide-y divide-subtle shadow-2xs">
        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="calendar" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={t('salary')}
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
          icon={<Icon name="chart-pie" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config.language === 'en' ? 'Budget' : 'Budget'}
          subtitle={config.language === 'en' ? 'Allocate monthly budget per category' : 'Fördela budget per kategori'}
          onClick={() => handleSectionClick('budget')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="tag" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config.language === 'en' ? 'Categories' : 'Kategorier'}
          subtitle={config.language === 'en' ? 'Manage expense and income categories' : 'Hantera utgifts- och inkomstkategorier'}
          onClick={() => handleSectionClick('categories')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="credit-card" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config?.language === 'en' ? 'Payment methods' : 'Betalmetoder'}
          subtitle={`${(config.paymentMethods || []).length} ${config?.language === 'en' ? 'methods' : 'metoder'}`}
          onClick={() => handleSectionClick('paymentMethods')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="coins" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config?.language === 'en' ? 'Currency' : 'Valuta'}
          subtitle={config.currency || 'kr'}
          onClick={() => handleSectionClick('currency')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="globe" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={t('language')}
          subtitle={config.language === 'en' ? 'English' : 'Svenska'}
          onClick={() => handleSectionClick('language')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="palette" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config?.language === 'en' ? 'Appearance' : 'Utseende'}
          subtitle={config.themeMode === 'light' ? 'Ljust' : config.themeMode === 'dark' ? 'Mörkt' : 'System'}
          onClick={() => handleSectionClick('appearance')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="bell" size={18} />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config?.language === 'en' ? 'Notifications' : 'Notiser'}
          subtitle={config?.language === 'en' ? 'Manage notification preferences' : 'Anpassa vilka notiser du vill få'}
          onClick={() => handleSectionClick('notifications')}
        />

        <ListRow
          variant="grouped"
          showChevron
          icon={<Icon name="ban" size={18} className="text-rose-500" />}
          iconBg="bg-black/5 dark:bg-white/5"
          title={config?.language === 'en' ? 'Cancelled Subscriptions' : 'Uppsagda abonnemang'}
          subtitle={config?.language === 'en' ? 'History and reactivate subscriptions' : 'Visa historik och återaktivera tjänster'}
          onClick={onCancelledSubscriptionsClick}
        />
      </Card>
    </motion.div>
  );
}
