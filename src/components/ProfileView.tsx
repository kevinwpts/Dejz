import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

import { ToggleSwitch } from './ToggleSwitch';
import { LogOut, Camera, Loader2, ChevronRight, Trash2, Calendar, Moon, Lock, Mail, Tag, CreditCard, Globe, Shield, Download, FileText, SlidersHorizontal } from 'lucide-react';
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
      className={`w-full flex items-center justify-between py-3 px-3.5 hover:bg-[var(--surface-muted)]/50 transition-all group ${!onClick ? 'cursor-default hover:bg-transparent' : 'cursor-pointer active:scale-[0.99]'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-[10px] ${iconBgColor} ${iconTextColor} flex items-center justify-center relative shrink-0`}>
          <Icon size={16} strokeWidth={1.8} />
        </div>
        <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{label}</span>
      </div>
      {rightNode || (onClick && <ChevronRight size={14} strokeWidth={2} className="text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform shrink-0" />)}
    </button>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5 w-full pb-8"
    >
      {/* User Header */}
      <div className="flex items-center gap-4 py-1">
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
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-[18px] flex items-center justify-center overflow-hidden relative bg-[var(--surface-color)] border border-[var(--border-color)]/60 group-hover:border-accent/50 transition-all duration-300 shadow-xs">
              {avatarUrl ? (
                <img src={avatarUrl} alt={t('profilePicture')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--surface-muted)] text-[var(--text-primary)] text-2xl font-bold">
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
            <h3 className="font-bold text-lg text-[var(--text-primary)] truncate tracking-tight">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
            </h3>
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] truncate opacity-60 mb-2.5 tracking-tight">
            {user?.email}
          </p>
          <button 
            onClick={() => handleSectionClick('manageAccount')}
            className="px-3 py-1.5 bg-[var(--surface-color)] text-[11px] font-semibold text-[var(--text-primary)] rounded-[10px] border border-[var(--border-color)]/50 hover:bg-[var(--surface-muted)] transition-all flex items-center gap-1.5 w-fit active:scale-95 shadow-2xs cursor-pointer"
          >
            {t('manageAccount')}
            <ChevronRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Ekonomi & Budget */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1 opacity-60">
            {t('economy')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-xs">
            <SettingsMenuItem 
              icon={Calendar} 
              label={t('salary')} 
              onClick={() => handleSectionClick('salary')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem 
              icon={Tag} 
              label={t('categories')} 
              onClick={() => handleSectionClick('categories')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem 
              icon={CreditCard} 
              label={t('paymentMethod')} 
              onClick={() => handleSectionClick('paymentMethods')} 
            />
          </div>
        </div>

        {/* App Settings */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1 opacity-60">
            {t('appSettings')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-xs">
            <SettingsMenuItem 
              icon={SlidersHorizontal} 
              label={config.language === 'en' ? 'Allocate Budget' : 'Fördela budget'} 
              iconBgColor="bg-accent/10"
              iconTextColor="text-[var(--accent-color)]"
              onClick={() => onNavigate('budget', 'allocate')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
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
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem 
              icon={Globe} 
              label={t('language')} 
              onClick={() => handleSectionClick('language')} 
            />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem 
              icon={Lock} 
              label={t('pinLock')} 
              onClick={onSecurityClick} 
            />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <div className="py-3 px-3.5 space-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <Calendar size={16} strokeWidth={1.8} />
                  </div>
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">{t('showFixedExpensesInCalendar')}</span>
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
              <p className="text-[10.5px] text-[var(--text-secondary)] opacity-70 leading-relaxed pl-11">
                {t('showFixedExpensesInCalendarDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Support & Legal */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1 opacity-60">
            {t('support')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-xs">
            <SettingsMenuItem icon={Mail} label={t('feedback')} onClick={onFeedbackClick} />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem icon={Download} label={t('exportData')} onClick={onExportData} />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem icon={Shield} label={t('privacyPolicy')} onClick={() => onLegalClick('privacy')} />
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <SettingsMenuItem icon={FileText} label={t('termsOfService')} onClick={() => onLegalClick('terms')} />
          </div>
        </div>

        {/* Account Actions */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-danger px-1 opacity-70">
            {t('dangerZone')}
          </h4>
          <div className="overflow-hidden border border-[var(--border-color)]/60 rounded-2xl bg-[var(--surface-color)] shadow-xs">
            {isDemoMode && (
              <>
                <div className="p-3.5 bg-[var(--surface-muted)]/50 space-y-2.5">
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
                    className="w-full py-2 px-3.5 rounded-xl bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:opacity-90 active:scale-[0.98]"
                  >
                    <LogOut size={13} strokeWidth={2} />
                    <span>{t('exitDemo')}</span>
                  </button>
                </div>
                <div className="h-px bg-[var(--border-color)] opacity-40" />
              </>
            )}
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 py-3 px-3.5 hover:bg-[var(--surface-muted)]/50 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="w-8 h-8 rounded-[10px] bg-[var(--surface-muted)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
                <LogOut size={16} strokeWidth={1.8} />
              </div>
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">{t('logout')}</span>
            </button>
            <div className="h-px bg-[var(--border-color)] mx-3.5 opacity-40" />
            <button 
              onClick={onDeleteAccount}
              className="w-full flex items-center gap-3 py-3 px-3.5 hover:bg-danger/5 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="w-8 h-8 rounded-[10px] bg-danger/10 text-danger flex items-center justify-center shrink-0">
                <Trash2 size={16} strokeWidth={1.8} />
              </div>
              <span className="text-[13px] font-semibold text-danger">{t('deleteAccount')}</span>
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
