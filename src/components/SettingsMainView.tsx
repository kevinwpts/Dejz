import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Tag, CreditCard, Globe, ChevronRight } from 'lucide-react';
import { Config } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';

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
  onNavigate: (tab: string, section?: string) => void;
  initialSection?: 'main' | 'salary' | 'categories' | 'paymentMethods' | 'language';
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
      <div className="surface-card overflow-hidden border-[0.5px] border-[var(--border-color)] rounded-2xl bg-[var(--surface-color)]/50">
        <button
          onClick={() => handleSectionClick('salary')}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-color)] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">{t('salary')}</span>
              <span className="text-[11px] text-[var(--text-secondary)] opacity-60">{t('settings_salary_desc')}</span>
            </div>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />

        <button
          onClick={() => handleSectionClick('categories')}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-color)] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <Tag size={20} strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">{t('categories')}</span>
              <span className="text-[11px] text-[var(--text-secondary)] opacity-60">{t('settings_categories_desc')}</span>
            </div>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />

        <button
          onClick={() => handleSectionClick('paymentMethods')}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-color)] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <CreditCard size={20} strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">{t('paymentMethod')}</span>
              <span className="text-[11px] text-[var(--text-secondary)] opacity-60">{t('settings_payment_methods_desc')}</span>
            </div>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />

        <button
          onClick={() => handleSectionClick('language')}
          className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-color)] transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-color)] flex items-center justify-center">
              <Globe size={20} strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">{t('language')}</span>
              <span className="text-[11px] text-[var(--text-secondary)] opacity-60">{t('settings_language_desc')}</span>
            </div>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
