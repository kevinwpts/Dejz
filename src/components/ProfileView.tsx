import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { ToggleSwitch } from './ToggleSwitch';
import { LogOut, Camera, Loader2, ChevronRight, Trash2, Calendar, Lock, Mail, Tag, CreditCard, Globe, Shield, Download, FileText, SlidersHorizontal, Palette, Coins } from 'lucide-react';
import { Config, Transaction, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';
import { ManageAccountView } from './ManageAccountView';
import { ReceiptsView } from './ReceiptsView';
import { DejzLogo } from './DejzLogo';

interface ProfileViewProps {
  onBack: () => void;
  user: any;
  onLogout: () => void;
  onUploadAvatar: (file: File) => void;
  avatarUrl?: string | null;
  config: Config;
  setConfig: (config: Config) => void;
  stats: any;
  t: (key: TranslationKey) => string;
  onFeedbackClick: () => void;
  onDeleteAccount: () => void;
  onExportData: () => void;
  onLegalClick: (type: 'privacy' | 'terms' | 'cookies' | 'contact') => void;
  subscriptionStatus: string | null;
  trialEnd: string | null;
  nextBillingDate: string | null;
  onPaymentSuccess: () => void;
  onShowToast: (message: string, type: 'success' | 'error') => void;
  onSecurityClick: () => void;
  profile: any;
  userId: string;
  session: any;
  onRefresh: () => void;
  onResetSavingsPot: () => void;
  onResetCompletedGoals: () => void;
  onClearTransactions: () => void;
  onResetAll: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
  onNavigate: (tab: string, section?: string) => void;
  transactions: Transaction[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  initialSection?: 'main' | 'manageAccount' | 'salary' | 'categories' | 'paymentMethods' | 'language' | 'pro' | 'receipts';
  setCurrentPeriodDate: (date: Date) => void;
  periods: any[];
  onCalculatorClick?: () => void;
  onTriggerProUpgradeModal?: () => void;
  isDemoMode?: boolean;
  onViewTransaction: (t: Transaction) => void;
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
  onMigrateAndDeleteCategory?: (type: 'income' | 'expense', deleteCategoryId: string, migrateToCategoryId?: string) => void;
}

export function ProfileView({ 
  onBack: _onBack, 
  user, 
  onLogout, 
  onUploadAvatar, 
  avatarUrl, 
  config,
  setConfig,
  stats: _stats,
  t,
  onFeedbackClick,
  onDeleteAccount,
  onExportData,
  onLegalClick,
  subscriptionStatus,
  trialEnd,
  nextBillingDate,
  onPaymentSuccess,
  onShowToast: _onShowToast,
  onSecurityClick,
  profile,
  userId,
  session,
  onRefresh,
  onResetSavingsPot,
  onResetCompletedGoals,
  onClearTransactions,
  onResetAll,
  addToast,
  onNavigate,
  transactions: _transactions = [],
  incomes: _incomes = [],
  fixedExpenses: _fixedExpenses = [],
  initialSection = 'main',
  setCurrentPeriodDate: _setCurrentPeriodDate,
  periods: _periods = [],
  onCalculatorClick: _onCalculatorClick,
  onTriggerProUpgradeModal,
  isDemoMode,
  onExitDemo,
  onViewTransaction,
  onRenameCategory,
  onMigrateAndDeleteCategory,
}: ProfileViewProps) {
  const [activePage, setActivePage] = useState<'main' | 'manageAccount' | 'salary' | 'categories' | 'paymentMethods' | 'language' | 'appearance' | 'currency' | 'pro' | 'receipts'>(initialSection as any);

  useEffect(() => {
    setActivePage(initialSection);
  }, [initialSection]);
  const [isUploading, setIsUploading] = useState(false);

  if (activePage === 'receipts') {
    return (
      <ReceiptsView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        transactions={_transactions}
        config={config}
        onViewTransaction={onViewTransaction}
      />
    );
  }

  if (activePage !== 'main' && activePage !== 'manageAccount') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <SettingsView 
          activeSection={activePage as any}
          onBack={() => setActivePage('main')}
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
          onNavigateToProfile={() => setActivePage('main')}
          onResetSavingsPot={onResetSavingsPot}
          onResetCompletedGoals={onResetCompletedGoals}
          onClearTransactions={onClearTransactions}
          onResetAll={onResetAll}
          onTriggerProUpgradeModal={onTriggerProUpgradeModal}
          onRenameCategory={onRenameCategory}
          onMigrateAndDeleteCategory={onMigrateAndDeleteCategory}
        />
      </motion.div>
    );
  }


  if (activePage === 'manageAccount') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <ManageAccountView
          onBack={() => {
            setActivePage('main');
            onNavigate('profile', 'main');
          }}
          user={user}
          onUpdateProfile={onRefresh}
          onLogout={onLogout}
          t={t}
          addToast={addToast}
          onUploadAvatar={onUploadAvatar}
          avatarUrl={avatarUrl}
          subscriptionStatus={subscriptionStatus}
          trialEnd={trialEnd}
          nextBillingDate={nextBillingDate}
          onPaymentSuccess={onPaymentSuccess}
        />
      </motion.div>
    );
  }

  const handleSectionClick = (section: any) => {
    setActivePage(section);
    onNavigate('profile', section);
  };

  const SettingsMenuItem = ({ icon: Icon, label, onClick, rightNode, iconBgColor = "bg-black/[0.04] dark:bg-[#222222]", iconTextColor = "text-white" }: { icon: any, label: string, onClick?: () => void, rightNode?: React.ReactNode, iconBgColor?: string, iconTextColor?: string }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between py-3.5 px-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all group ${!onClick ? 'cursor-default hover:bg-transparent' : 'cursor-pointer active:scale-[0.99]'}`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-9 h-9 rounded-xl ${iconBgColor} ${iconTextColor} border-none flex items-center justify-center relative shrink-0`}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate tracking-tight">{label}</span>
      </div>
      {rightNode || (onClick && <ChevronRight size={15} strokeWidth={2} className="text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform shrink-0 opacity-60" />)}
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5 w-full pb-12 font-sans"
    >
      {/* User Header Module */}
      <div className="bg-white dark:bg-[#191919] backdrop-blur-xl border-none rounded-[22px] p-5 shadow-none flex items-center gap-4">
        <div className="relative shrink-0">
          <label htmlFor="avatar-upload" className="cursor-pointer group block">
            <input 
              type="file" 
              className="hidden" 
              accept="image/*"
              id="avatar-upload"
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  setIsUploading(true);
                  try {
                    await onUploadAvatar(e.target.files[0]);
                  } finally {
                    setIsUploading(false);
                  }
                }
              }}
            />
            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-[18px] flex items-center justify-center overflow-hidden relative bg-black/[0.04] dark:bg-[#222222] border-none group-hover:scale-[1.02] transition-all duration-300 shadow-none">
              {avatarUrl ? (
                <img src={avatarUrl} alt={t('profilePicture')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-2xl font-bold">
                  {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="animate-spin text-white" size={18} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Camera size={18} strokeWidth={2} className="text-white" />
              </div>
            </div>
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-base sm:text-lg text-[var(--text-primary)] truncate tracking-tight">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
            </h3>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] truncate opacity-60 mb-2.5 tracking-tight">
            {user?.email}
          </p>
          <button 
            onClick={() => handleSectionClick('manageAccount')}
            className="px-3 py-1.5 bg-black/[0.04] dark:bg-[#222222] text-[11px] font-semibold text-[var(--text-primary)] rounded-[12px] border-none hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-all flex items-center gap-1.5 w-fit active:scale-95 cursor-pointer shadow-none"
          >
            {t('manageAccount')}
            <ChevronRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Ekonomi & Budget */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1.5 opacity-60">
            {t('economy')}
          </h4>
          <div className="overflow-hidden border-none rounded-[22px] bg-white dark:bg-[#191919] backdrop-blur-xl shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <SettingsMenuItem 
              icon={Calendar} 
              label={t('salary')} 
              onClick={() => handleSectionClick('salary')} 
            />
            <SettingsMenuItem 
              icon={Tag} 
              label={t('categories')} 
              onClick={() => handleSectionClick('categories')} 
            />
            <SettingsMenuItem 
              icon={CreditCard} 
              label={t('paymentMethod')} 
              onClick={() => handleSectionClick('paymentMethods')} 
            />
            <SettingsMenuItem 
              icon={Coins} 
              label={config.language === 'en' ? 'Currency' : 'Valuta'} 
              onClick={() => handleSectionClick('currency')} 
              rightNode={(
                <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="text-xs font-semibold">
                    {config.currency || 'kr'}
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            />
          </div>
        </div>

        {/* App Settings */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1.5 opacity-60">
            {t('appSettings')}
          </h4>
          <div className="overflow-hidden border-none rounded-[22px] bg-white dark:bg-[#191919] backdrop-blur-xl shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <SettingsMenuItem 
              icon={SlidersHorizontal} 
              label={'Budget'} 
              onClick={() => onNavigate('budget', 'allocate')} 
            />
            <SettingsMenuItem 
              icon={Palette} 
              label={t('appearance' as any) || 'Utseende'} 
              onClick={() => handleSectionClick('appearance')}
              rightNode={(
                <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                  <span className="text-xs font-semibold">
                    {config.themeMode === 'light' ? 'Ljust' : config.themeMode === 'dark' ? 'Mörkt' : 'System'}
                  </span>
                  <ChevronRight size={14} strokeWidth={2} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            />
            <SettingsMenuItem 
              icon={Globe} 
              label={t('language')} 
              onClick={() => handleSectionClick('language')} 
            />
            <SettingsMenuItem 
              icon={Lock} 
              label={t('pinLock')} 
              onClick={onSecurityClick} 
            />
            <div className="py-3.5 px-4 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-[#222222] text-white border-none flex items-center justify-center shrink-0">
                    <Calendar size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-tight">{t('showFixedExpensesInCalendar')}</span>
                </div>
                <ToggleSwitch 
                  isOn={config.showFixedExpensesInCalendar} 
                  onToggle={() => {
                    const next = !config.showFixedExpensesInCalendar;
                    setConfig({
                      ...config,
                      showFixedExpensesInCalendar: next,
                      showFixedExpensesInTodayView: next,
                    });
                  }} 
                />
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] opacity-70 leading-relaxed pl-12">
                {t('showFixedExpensesInCalendarDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Support & Legal */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-secondary)] px-1.5 opacity-60">
            {t('support')}
          </h4>
          <div className="overflow-hidden border-none rounded-[22px] bg-white dark:bg-[#191919] backdrop-blur-xl shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            <SettingsMenuItem icon={Mail} label={t('feedback')} onClick={onFeedbackClick} />
            <SettingsMenuItem icon={Download} label={t('exportData')} onClick={onExportData} />
            <SettingsMenuItem icon={Shield} label={t('privacyPolicy')} onClick={() => onLegalClick('privacy')} />
            <SettingsMenuItem icon={FileText} label={t('termsOfService')} onClick={() => onLegalClick('terms')} />
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-danger px-1.5 opacity-70">
            {t('dangerZone')}
          </h4>
          <div className="overflow-hidden border-none rounded-[22px] bg-white dark:bg-[#191919] backdrop-blur-xl shadow-none divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {isDemoMode && (
              <div className="p-4 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-color)]" />
                    </span>
                    <span className="text-xs font-semibold text-[var(--accent-color)]">{t('demoModeActive')}</span>
                  </div>
                </div>
                <p className="text-[11.5px] text-[var(--text-secondary)] opacity-80 leading-relaxed">
                  Du utforskar appen med exempeldata. När du är redo kan du avsluta demot för att skapa ett nytt konto eller logga in.
                </p>
                <button 
                  onClick={onExitDemo}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none hover:opacity-90 active:scale-[0.98]"
                >
                  <LogOut size={13} strokeWidth={2} />
                  <span>{t('exitDemo')}</span>
                </button>
              </div>
            )}
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3.5 py-3.5 px-4 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-[#222222] text-white border-none flex items-center justify-center shrink-0">
                <LogOut size={16} strokeWidth={1.8} />
              </div>
              <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">{t('logout')}</span>
            </button>
            <button 
              onClick={onDeleteAccount}
              className="w-full flex items-center gap-3.5 py-3.5 px-4 hover:bg-danger/5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="w-9 h-9 rounded-xl bg-black/[0.04] dark:bg-[#222222] text-white border-none flex items-center justify-center shrink-0">
                <Trash2 size={16} strokeWidth={1.8} />
              </div>
              <span className="text-[13.5px] font-semibold text-danger">{t('deleteAccount')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-5 pb-2 opacity-50">
          <DejzLogo className="h-5 w-auto" textColor="var(--logo-color)" />
        </div>
      </div>
    </motion.div>
  );
}
