import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { ToggleSwitch } from './ToggleSwitch';
import { LogOut, Camera, Loader2, ChevronRight, Trash2, Calendar, Moon, Lock, Mail, Tag, CreditCard, Globe, PieChart, Shield, Download, FileText } from 'lucide-react';
import { Config, Transaction, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';
import { ManageAccountView } from './ManageAccountView';
import { ReceiptsView } from './ReceiptsView';

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
  onExitDemo?: () => void;
  onViewTransaction: (t: Transaction) => void;
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
  onViewTransaction
}: ProfileViewProps) {
  const [activePage, setActivePage] = useState<'main' | 'manageAccount' | 'salary' | 'categories' | 'paymentMethods' | 'language' | 'pro' | 'receipts'>(initialSection as any);

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

  const SettingsMenuItem = ({ icon: Icon, label, onClick, rightNode, iconBgColor = "bg-[var(--surface-muted)]", iconTextColor = "text-[var(--text-primary)]" }: { icon: any, label: string, onClick?: () => void, rightNode?: React.ReactNode, iconBgColor?: string, iconTextColor?: string }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 hover:bg-[var(--surface-color)] transition-all group ${!onClick ? 'cursor-default hover:bg-transparent' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg ${iconBgColor} ${iconTextColor} flex items-center justify-center relative`}>
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      </div>
      {rightNode || (onClick && <ChevronRight size={16} strokeWidth={1.5} className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />)}
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      {/* User Header */}
      <div className="flex items-center gap-6">
        <div className="relative">
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
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden relative bg-[var(--surface-color)] border-[0.5px] border-[var(--border-color)] group-hover:border-accent/50 transition-all duration-500">
              {avatarUrl ? (
                <img src={avatarUrl} alt={t('profilePicture')} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--surface-muted)] text-[var(--text-primary)] text-4xl font-semibold">
                  {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="div-spin text-[var(--text-primary)]" size={24} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Camera size={24} strokeWidth={1.5} className="text-[var(--text-primary)]" />
              </div>
            </div>
          </label>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-2xl text-[var(--text-primary)] truncate tracking-tight">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
            </h3>
          </div>
          <p className="text-sm font-semibold text-[var(--text-secondary)] truncate opacity-40 mb-3 tracking-tight">
            {user?.email}
          </p>
          <button 
            onClick={() => handleSectionClick('manageAccount')}
            className="px-4 py-2 bg-[var(--surface-color)] text-xs font-semibold text-[var(--text-primary)] rounded-[12px] hover:bg-[var(--surface-muted)] shadow-2xs transition-all flex items-center gap-2 w-fit"
          >
            {t('manageAccount')}
            <ChevronRight size={12} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Ekonomi & Budget */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] px-1 opacity-50">
            {t('economy')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-sm">
            <SettingsMenuItem 
              icon={Calendar} 
              label={t('salary')} 
              onClick={() => handleSectionClick('salary')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem 
              icon={Tag} 
              label={t('categories')} 
              onClick={() => handleSectionClick('categories')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem 
              icon={CreditCard} 
              label={t('paymentMethod')} 
              onClick={() => handleSectionClick('paymentMethods')} 
            />
          </div>
        </div>

        {/* App Settings */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] px-1 opacity-50">
            {t('appSettings')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-sm">
            <SettingsMenuItem 
              icon={Moon} 
              label={t('darkMode')} 
              iconBgColor="bg-warning/10"
              iconTextColor="text-warning"
              rightNode={(
                <ToggleSwitch 
                  isOn={config.darkMode} 
                  onToggle={() => setConfig({ ...config, darkMode: !config.darkMode })} 
                />
              )}
            />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem 
              icon={Globe} 
              label={t('language')} 
              onClick={() => handleSectionClick('language')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem 
              icon={Lock} 
              label={t('pinLock')} 
              onClick={onSecurityClick} 
            />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <div className="p-4 space-y-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center">
                    <Calendar size={20} strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t('showFixedExpensesInCalendar')}</span>
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
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed pl-14 mt-1">
                {t('showFixedExpensesInCalendarDesc')}
              </p>
            </div>
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <div className="p-4 space-y-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                    <PieChart size={20} strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{t('includeFixedExpensesInAnalysis')}</span>
                </div>
                <ToggleSwitch 
                  isOn={config.includeFixedExpensesInAnalysis} 
                  onToggle={() => setConfig({ ...config, includeFixedExpensesInAnalysis: !config.includeFixedExpensesInAnalysis })} 
                />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed pl-14 mt-1">
                {t('includeFixedExpensesInAnalysisDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Support & Legal */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-[var(--text-secondary)] px-1 opacity-50">
            {t('support')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-sm">
            <SettingsMenuItem icon={Mail} label={t('feedback')} onClick={onFeedbackClick} />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem icon={Download} label={t('exportData')} onClick={onExportData} />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem icon={Shield} label={t('privacyPolicy')} onClick={() => onLegalClick('privacy')} />
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <SettingsMenuItem icon={FileText} label={t('termsOfService')} onClick={() => onLegalClick('terms')} />
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-danger px-1 opacity-50">
            {t('dangerZone')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-sm">
            {isDemoMode && (
              <>
                <div className="p-4 bg-[var(--surface-muted)]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color)] opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-color)]" />
                      </span>
                      <span className="text-xs font-semibold text-[var(--accent-color)]">{t('demoModeActive')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] opacity-80 leading-relaxed">
                    Du utforskar appen med exempeldata. När du är redo kan du avsluta demot för att skapa ett nytt konto eller logga in.
                  </p>
                  <button 
                    onClick={onExitDemo}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:opacity-90 active:scale-[0.98]"
                  >
                    <LogOut size={14} strokeWidth={2} />
                    <span>{t('exitDemo')}</span>
                  </button>
                </div>
                <div className="h-px bg-[var(--border-color)] opacity-50" />
              </>
            )}
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-4 p-4 hover:bg-[var(--surface-color)] transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--bg-color)] text-[var(--text-secondary)] flex items-center justify-center">
                <LogOut size={20} strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{t('logout')}</span>
            </button>
            <div className="h-px bg-[var(--border-color)] mx-4 opacity-50" />
            <button 
              onClick={onDeleteAccount}
              className="w-full flex items-center gap-4 p-4 hover:bg-danger/5 transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-danger/10 text-danger flex items-center justify-center">
                <Trash2 size={20} strokeWidth={1.5} />
              </div>
              <span className="text-sm font-semibold text-danger">{t('deleteAccount')}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pt-8 pb-4 opacity-75">
          <img 
            src="https://i.imgur.com/QmqMPRy.png" 
            alt="Logo" 
            className="h-10 w-auto object-contain" 
            onError={(e) => { e.currentTarget.src = "/logo.png"; }}
            referrerPolicy="no-referrer" 
          />
        </div>
      </div>
    </motion.div>
  );
}
