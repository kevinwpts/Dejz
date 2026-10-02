import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Tag, CreditCard, Globe, Palette, Coins, ChevronRight } from 'lucide-react';
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
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
  transactions?: any[];
  onMigrateAndDeleteCategory?: (type: 'income' | 'expense', deleteCategoryId: string, migrateToCategoryId?: string) => void;
  onNavigate: (tab: string, section?: string) => void;
  initialSection?: 'main' | 'salary' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency';
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
  initialSection = 'main'
}: SettingsMainViewProps) {
  const [activeSection, setActiveSection] = useState<'main' | 'salary' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency'>(initialSection);

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
          transactions={transactions}
          onMigrateAndDeleteCategory={onMigrateAndDeleteCategory}
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
      <div className="overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04] rounded-[22px] bg-white dark:bg-[#202020] backdrop-blur-xl border-none shadow-none">
        <button
          type="button"
          onClick={() => handleSectionClick('salary')}
          className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#2D2D2D] text-white">
              <Calendar size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{t('salary')}</span>
              <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                {config.payday ? `${config.payday}:e i varje månad` : 'Ej angivet'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => handleSectionClick('categories')}
          className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#2D2D2D] text-white">
              <Tag size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{t('categories')}</span>
              <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                {`${(config.categories || []).length} ${t('expenses').toLowerCase()}, ${(config.incomeCategories || []).length} ${t('incomes').toLowerCase()}`}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => handleSectionClick('paymentMethods')}
          className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#2D2D2D] text-white">
              <CreditCard size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{config?.language === 'en' ? 'Payment methods' : 'Betalmetoder'}</span>
              <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                {`${(config.paymentMethods || []).length} ${config?.language === 'en' ? 'methods' : 'metoder'}`}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => handleSectionClick('currency')}
          className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#2D2D2D] text-white">
              <Coins size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{config?.language === 'en' ? 'Currency' : 'Valuta'}</span>
              <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                {config.currency || 'kr'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => handleSectionClick('language')}
          className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#2D2D2D] text-white">
              <Globe size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{t('language')}</span>
              <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                {config.language === 'en' ? 'English' : 'Svenska'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => handleSectionClick('appearance')}
          className="w-full flex items-center justify-between p-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left group"
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-black/[0.04] dark:bg-[#2D2D2D] text-white">
              <Palette size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">{config?.language === 'en' ? 'Appearance' : 'Utseende'}</span>
              <span className="text-[12px] font-normal text-[var(--text-secondary)] opacity-70 mt-0.5">
                {config.themeMode === 'light' ? 'Ljust' : config.themeMode === 'dark' ? 'Mörkt' : 'System'}
              </span>
            </div>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-60 group-hover:translate-x-0.5 transition-transform shrink-0" />
        </button>
      </div>
    </motion.div>
  );
}
