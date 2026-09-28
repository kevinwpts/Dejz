import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Tag, CreditCard, Globe, Palette } from 'lucide-react';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';
import { Card, ListRow } from './ui';

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
  onNavigate: (tab: string, section?: string) => void;
  initialSection?: 'main' | 'salary' | 'categories' | 'paymentMethods' | 'language' | 'appearance';
}

export function SettingsMainView({
  _onBack,
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
  onNavigate,
  initialSection = 'main'
}: SettingsMainViewProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'salary' | 'categories' | 'paymentMethods' | 'language'>(initialSection);

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
        className="space-y-6"
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
          onNavigateToProfile={() => {
            setActiveSection('main');
            onNavigate('settings', 'main');
          }}
          onResetSavingsPot={onResetSavingsPot}
          onResetCompletedGoals={onResetCompletedGoals}
          onClearTransactions={onClearTransactions}
          onResetAll={onResetAll}
          onTriggerProUpgradeModal={onTriggerProUpgradeModal}
          onRenameCategory={onRenameCategory}
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
      <Card padding="none" className="overflow-hidden divide-y divide-[var(--border-color)]/30 rounded-[18px] bg-[var(--surface-color)] backdrop-blur-xl border border-[var(--border-color)]/60 shadow-sm">
        <ListRow
          icon={<Calendar size={18} strokeWidth={1.5} />}
          title={t('salary')}
          subtitle={t('settings_salary_desc')}
          onClick={() => handleSectionClick('salary')}
        />
        <ListRow
          icon={<Tag size={18} strokeWidth={1.5} />}
          title={t('categories')}
          subtitle={t('settings_categories_desc')}
          onClick={() => handleSectionClick('categories')}
        />
        <ListRow
          icon={<CreditCard size={18} strokeWidth={1.5} />}
          title={t('paymentMethod')}
          subtitle={t('settings_payment_methods_desc')}
          onClick={() => handleSectionClick('paymentMethods')}
        />
        <ListRow
          icon={<Globe size={18} strokeWidth={1.5} />}
          title={t('language')}
          subtitle={t('settings_language_desc')}
          onClick={() => handleSectionClick('language')}
        />
        <ListRow
          icon={<Palette size={18} strokeWidth={1.5} />}
          title={t('appearance' as any) || 'Utseende'}
          subtitle={t('settings_appearance_desc' as any) || 'Välj ljust, mörkt eller systemläge'}
          onClick={() => handleSectionClick('appearance')}
        />
      </Card>
    </motion.div>
  );
}

