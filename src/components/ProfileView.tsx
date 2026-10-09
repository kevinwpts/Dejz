import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Switch, Card, ListRow } from './ui';
import { LogOut, ChevronRight, Trash2, Calendar, Lock, Mail, CreditCard, Globe, Shield, Download, FileText, Palette, Coins, EyeOff, Crown, ShieldCheck, History, HandCoins, Receipt, Users2, BookOpen, Bell, PieChart, Tag } from 'lucide-react';
import { Config, Transaction, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';
import { ManageAccountView } from './ManageAccountView';
import { ReceiptsView } from './ReceiptsView';
import { DebtsView } from './DebtsView';
import { SharedBudgetView } from './SharedBudgetView';
import { GuidesView } from './GuidesView';
import { AdminDashboardView } from './AdminDashboardView';
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
  onSetSubscriptionStatus?: (status: string | null) => void;
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
  initialSection?: 'main' | 'manageAccount' | 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'pro' | 'receipts' | 'debts' | 'sharedBudget' | 'guides' | 'notifications';
  navTrigger?: number;
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
  onSetSubscriptionStatus,
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
  navTrigger,
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
  const [activePage, setActivePage] = useState<
    | 'main'
    | 'manageAccount'
    | 'salary'
    | 'budget'
    | 'categories'
    | 'paymentMethods'
    | 'language'
    | 'appearance'
    | 'currency'
    | 'pro'
    | 'receipts'
    | 'debts'
    | 'sharedBudget'
    | 'guides'
    | 'notifications'
    | 'admin'
  >(initialSection as any);

  const isAdmin = user?.email?.toLowerCase() === 'kevinwpts@gmail.com' || profile?.role === 'admin' || user?.user_metadata?.role === 'admin';

  useEffect(() => {
    setActivePage(initialSection as any);
  }, [initialSection, navTrigger]);

  if (activePage === 'admin') {
    return (
      <AdminDashboardView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        user={user}
        config={config}
        setConfig={setConfig}
        subscriptionStatus={subscriptionStatus}
        onSetSubscriptionStatus={onSetSubscriptionStatus}
        transactions={_transactions}
        incomes={_incomes}
        fixedExpenses={_fixedExpenses}
        onRefresh={onRefresh}
        addToast={addToast}
      />
    );
  }

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

  if (activePage === 'debts') {
    return (
      <DebtsView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        config={config}
        setConfig={setConfig}
      />
    );
  }

  if (activePage === 'sharedBudget') {
    return (
      <SharedBudgetView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        config={config}
        setConfig={setConfig}
      />
    );
  }

  if (activePage === 'guides') {
    return (
      <GuidesView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        config={config}
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
          onBack={() => {
            setActivePage('main');
            onNavigate('profile', 'main');
          }}
          config={config}
          setConfig={setConfig}
          t={t}
          incomes={_incomes}
          fixedExpenses={_fixedExpenses}
          stats={_stats}
          currentPeriodId={_stats?.periodId || _periods[0]?.id || 'current'}
          transactions={_transactions}
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
            setActivePage('main');
            onNavigate('profile', 'main');
          }}
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


  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5 w-full pb-12 font-sans"
    >
      {/* User Header Module */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card,14px)] p-5 border border-subtle shadow-2xs flex items-center gap-4">
        <div 
          onClick={() => handleSectionClick('manageAccount')}
          className="relative shrink-0 cursor-pointer group"
          title={t('manageAccount')}
        >
          <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[var(--radius-card-nested,10px)] flex items-center justify-center overflow-hidden relative bg-black/[0.04] dark:bg-white/5 border-none group-hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 shadow-none">
            {avatarUrl ? (
              <img src={avatarUrl} alt={t('profilePicture')} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-2xl font-bold">
                {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-card-title font-bold text-[var(--text-primary)] truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
            </h3>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-micro-label font-bold border border-amber-500/20 shrink-0">
                <Crown size={11} strokeWidth={2} />
                Admin
              </span>
            )}
          </div>
          <p className="text-secondary truncate opacity-60 mb-2.5">
            {user?.email}
          </p>
          <button 
            onClick={() => handleSectionClick('manageAccount')}
            className="px-3 py-1.5 bg-black/[0.04] dark:bg-white/5 text-micro-label font-semibold text-[var(--text-primary)] rounded-[6px] border-none hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-all flex items-center gap-1.5 w-fit active:scale-95 cursor-pointer shadow-none"
          >
            {t('manageAccount')}
            <ChevronRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Admin Tools for App Owner */}
        {isAdmin && (
          <div className="space-y-2">
            <h4 className="text-label font-semibold text-amber-600 dark:text-amber-400 px-1.5 flex items-center gap-1.5">
              <Crown size={13} strokeWidth={2} />
              <span>{config.language === 'en' ? 'Administration' : 'Administration'}</span>
            </h4>
            <Card variant="default" padding="none" className="divide-y divide-menu border border-amber-500/25">
              <ListRow
                variant="grouped"
                density="compact"
                showChevron
                icon={<ShieldCheck size={18} strokeWidth={2} />}
                iconBg="bg-amber-500/10"
                iconColor="text-amber-600 dark:text-amber-400"
                title={config.language === 'en' ? 'Admin Dashboard' : 'Adminpanel'}
                subtitle={config.language === 'en' ? 'Owner tools, subscription simulator & feedback' : 'Ägarverktyg, prenumerationssimulator & feedback'}
                onClick={() => handleSectionClick('admin')}
              />
            </Card>
          </div>
        )}

        {/* Ekonomi & Budget */}
        <div className="space-y-2">
          <h4 className="text-label font-semibold text-[var(--text-secondary)] px-1.5">
            {t('economy')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Calendar size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('salary')}
              onClick={() => handleSectionClick('salary')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<PieChart size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Budget' : 'Budget'}
              onClick={() => handleSectionClick('budget')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Tag size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Categories' : 'Kategorier'}
              onClick={() => handleSectionClick('categories')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<CreditCard size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('paymentMethod')}
              onClick={() => handleSectionClick('paymentMethods')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Coins size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Currency' : 'Valuta'}
              value={
                <span className="text-label font-semibold text-[var(--text-secondary)]">
                  {config.currency || 'kr'}
                </span>
              }
              onClick={() => handleSectionClick('currency')}
            />
          </Card>
        </div>

        {/* Verktyg & Delning */}
        <div className="space-y-2">
          <h4 className="text-label font-semibold text-[var(--text-secondary)] px-1.5">
            {config.language === 'en' ? 'Tools & Sharing' : 'Verktyg & Funktioner'}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<HandCoins size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Debts & IOUs' : 'Skyldig (Skulder & utlägg)'}
              onClick={() => handleSectionClick('debts')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Receipt size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Receipts' : 'Kvitton'}
              onClick={() => handleSectionClick('receipts')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Users2 size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Shared budget' : 'Delad budget (Par-läge)'}
              onClick={() => handleSectionClick('sharedBudget')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<BookOpen size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Guides & instructions' : 'Guider & Instruktioner'}
              onClick={() => handleSectionClick('guides')}
            />
          </Card>
        </div>

        {/* App Settings */}
        <div className="space-y-2">
          <h4 className="text-label font-semibold text-[var(--text-secondary)] px-1.5">
            {t('appSettings')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Bell size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={config.language === 'en' ? 'Notifications' : 'Notiser'}
              onClick={() => handleSectionClick('notifications')}
            />

            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Palette size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('appearance' as any) || 'Utseende'}
              value={
                <span className="text-label font-semibold text-[var(--text-secondary)]">
                  {config.themeMode === 'light' ? 'Ljust' : config.themeMode === 'dark' ? 'Mörkt' : 'System'}
                </span>
              }
              onClick={() => handleSectionClick('appearance')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Globe size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('language')}
              onClick={() => handleSectionClick('language')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Lock size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('pinLock')}
              onClick={onSecurityClick}
            />
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              icon={<Calendar size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('showFixedExpensesInCalendar')}
              subtitle={t('showFixedExpensesInCalendarDesc')}
              control={
                <Switch
                  checked={Boolean(config.showFixedExpensesInCalendar)}
                  onChange={() => {
                    const next = !config.showFixedExpensesInCalendar;
                    setConfig({
                      ...config,
                      showFixedExpensesInCalendar: next,
                      showFixedExpensesInTodayView: next,
                    });
                  }}
                  aria-label={t('showFixedExpensesInCalendar')}
                />
              }
            />
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              icon={<History size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('showFixedExpensesInHistory')}
              subtitle={t('showFixedExpensesInHistoryDesc')}
              control={
                <Switch
                  checked={Boolean(config.showFixedExpensesInHistory ?? (localStorage.getItem('dejz_show_fixed_in_history') === 'true'))}
                  onChange={() => {
                    const currentVal = Boolean(config.showFixedExpensesInHistory ?? (localStorage.getItem('dejz_show_fixed_in_history') === 'true'));
                    const next = !currentVal;
                    try {
                      localStorage.setItem('dejz_show_fixed_in_history', next ? 'true' : 'false');
                    } catch (err) {
                      void err;
                    }
                    setConfig({
                      ...config,
                      showFixedExpensesInHistory: next,
                    });
                  }}
                  aria-label={t('showFixedExpensesInHistory')}
                />
              }
            />
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              icon={<EyeOff size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('hideEmptyCategories' as any) || 'Dölj inaktiva kategorier'}
              subtitle={t('hideEmptyCategoriesDesc' as any) || 'Dölj kategorier som inte har några utgifter eller aktiv budget under perioden.'}
              control={
                <Switch
                  checked={Boolean(config.hideEmptyCategories ?? (localStorage.getItem('dejz_hide_empty_categories') === 'true'))}
                  onChange={() => {
                    const currentVal = Boolean(config.hideEmptyCategories ?? (localStorage.getItem('dejz_hide_empty_categories') === 'true'));
                    const nextVal = !currentVal;
                    try {
                      localStorage.setItem('dejz_hide_empty_categories', nextVal ? 'true' : 'false');
                    } catch (err) {
                      void err;
                    }
                    setConfig({ ...config, hideEmptyCategories: nextVal });
                  }}
                  aria-label={t('hideEmptyCategories' as any) || 'Dölj inaktiva kategorier'}
                />
              }
            />
          </Card>
        </div>

        {/* Support & Legal */}
        <div className="space-y-2">
          <h4 className="text-label font-semibold text-[var(--text-secondary)] px-1.5">
            {t('support')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Mail size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('feedback')}
              onClick={onFeedbackClick}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Download size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('exportData')}
              onClick={onExportData}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Shield size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('privacyPolicy')}
              onClick={() => onLegalClick('privacy')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<FileText size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('termsOfService')}
              onClick={() => onLegalClick('terms')}
            />
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-2">
          <h4 className="text-label font-semibold text-rose-500 dark:text-rose-400 px-1.5">
            {t('dangerZone')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            {isDemoMode && (
              <div className="p-4 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-color)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-color)]" />
                    </span>
                    <span className="text-label font-semibold text-[var(--accent-color)]">{t('demoModeActive')}</span>
                  </div>
                </div>
                <p className="text-micro-label text-[var(--text-secondary)] opacity-80 leading-relaxed">
                  Du utforskar appen med exempeldata. När du är redo kan du avsluta demot för att skapa ett nytt konto eller logga in.
                </p>
                <button 
                  onClick={onExitDemo}
                  className="w-full py-2.5 px-4 rounded-btn bg-[var(--accent-color)] text-[var(--text-on-accent)] font-semibold text-label flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none hover:opacity-90 active:scale-[0.98]"
                >
                  <LogOut size={13} strokeWidth={2} />
                  <span>{t('exitDemo')}</span>
                </button>
              </div>
            )}
            <ListRow
              variant="grouped"
              density="compact"
              icon={<LogOut size={18} strokeWidth={2} />}
              iconBg="bg-black/5 dark:bg-white/5"
              title={t('logout')}
              onClick={onLogout}
            />
            <ListRow
              variant="grouped"
              density="compact"
              destructive
              icon={<Trash2 size={18} strokeWidth={2} />}
              iconBg="bg-rose-500/10"
              iconColor="text-rose-600 dark:text-rose-400"
              title={t('deleteAccount')}
              titleClassName="text-rose-600 dark:text-rose-400"
              onClick={onDeleteAccount}
            />
          </Card>
        </div>

        <div className="flex flex-col items-center justify-center pt-5 pb-2 opacity-50">
          <DejzLogo className="h-5 w-auto" textColor="var(--logo-color)" />
        </div>
      </div>
    </motion.div>
  );
}
