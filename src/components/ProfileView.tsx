import { StarredTransactionsView } from './StarredTransactionsView';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Switch, Card, ListRow, SegmentedControl } from './ui';
import { LogOut, ChevronRight, Trash2, Calendar, Lock, Mail, CreditCard, Globe, Shield, Download, FileText, Palette, Coins, EyeOff, Crown, ShieldCheck, History, HandCoins, Receipt, Users2, BookOpen, Bell, PieChart, Tag, Heart, Building2 } from 'lucide-react';
import { Config, Transaction, Income, FixedExpense } from '../types';
import { TranslationKey } from '../i18n';
import { SettingsView } from './SettingsView';
import { ManageAccountView } from './ManageAccountView';
import { ReceiptsView } from './ReceiptsView';
import { DebtsView } from './DebtsView';
import { SharedBudgetView } from './SharedBudgetView';
import { GuidesView } from './GuidesView';
import { AdminDashboardView } from './AdminDashboardView';
import { BankConnectionView } from './BankConnectionView';
import { isBankIntegrationEnabledForUser, PendingBankCallback } from '../utils/bankFeatureFlag';
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
  initialSection?: 'main' | 'manageAccount' | 'salary' | 'budget' | 'categories' | 'paymentMethods' | 'language' | 'pro' | 'receipts'
    | 'starred' | 'debts' | 'sharedBudget' | 'guides' | 'notifications' | 'bank' | 'bankTransactions';
  navTrigger?: number;
  setCurrentPeriodDate: (date: Date) => void;
  periods: any[];
  onCalculatorClick?: () => void;
  onTriggerProUpgradeModal?: () => void;
  isDemoMode?: boolean;
  onExitDemo?: () => void;
  onViewTransaction: (t: Transaction) => void;
  onToggleStar?: (transaction: Transaction) => void;
  onRenameCategory?: (type: 'income' | 'expense', oldName: string, newName: string) => Promise<void> | void;
  onMigrateAndDeleteCategory?: (type: 'income' | 'expense', deleteCategoryId: string, migrateToCategoryId?: string) => void;
  onCancelledSubscriptionsClick?: () => void;
  onSettleDebtAsTransaction?: (debt: any) => Promise<void> | void;
  pendingBankCallback?: PendingBankCallback | null;
  onClearPendingBankCallback?: () => void;
  onStartOnboardingWithBank?: () => void;
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
  onToggleStar,
  onRenameCategory,
  onMigrateAndDeleteCategory,
  onSettleDebtAsTransaction,
  pendingBankCallback,
  onClearPendingBankCallback,
  onStartOnboardingWithBank,
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
    | 'designLibrary'
    | 'bank'
    | 'bankTransactions'
  >(initialSection as any);

  const isAdmin = user?.email?.toLowerCase() === 'kevinwpts@gmail.com' || profile?.role === 'admin' || user?.user_metadata?.role === 'admin';
  const canUseBankIntegration = isBankIntegrationEnabledForUser(user || session?.user, profile?.role);

  useEffect(() => {
    setActivePage(initialSection as any);
  }, [initialSection, navTrigger]);

  if ((activePage === 'bank' || activePage === 'bankTransactions') && canUseBankIntegration) {
    return (
      <BankConnectionView
        config={config}
        initialSubView={activePage === 'bankTransactions' ? 'transactions' : 'connections'}
        onSubViewChange={(sub) => {
          const nextSection = sub === 'transactions' ? 'bankTransactions' : 'bank';
          setActivePage(nextSection);
          onNavigate('profile', nextSection);
        }}
        pendingCallbackData={pendingBankCallback}
        onClearPendingCallback={onClearPendingBankCallback}
        addToast={addToast}
        onStartOnboardingWithBank={onStartOnboardingWithBank}
      />
    );
  }

  if (activePage === 'admin' || activePage === 'designLibrary') {
    return (
      <AdminDashboardView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        user={user}
        profile={profile}
        initialTab={activePage === 'designLibrary' ? 'designLibrary' : 'dashboard'}
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

  if (activePage === 'starred') {
    return (
      <StarredTransactionsView
        onBack={() => {
          setActivePage('main');
          onNavigate('profile', 'main');
        }}
        transactions={_transactions}
        config={config}
        onViewTransaction={onViewTransaction}
        onToggleStar={onToggleStar}
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
        onSettleAsTransaction={onSettleDebtAsTransaction}
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
        className="space-y-[var(--card-gap)]"
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
      <button
        type="button"
        onClick={() => handleSectionClick('manageAccount')}
        className="w-full bg-[var(--surface-color)] rounded-card p-4 shadow-subtle flex items-center justify-between gap-3.5 text-left hover:bg-black/[0.015] dark:hover:bg-white/[0.025] transition-colors cursor-pointer group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden relative bg-[var(--surface-muted)] shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={t('profilePicture')} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--accent-color)]/10 text-[var(--accent-color)] text-xl font-bold">
                {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-card-title font-bold text-[var(--text-primary)] truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || t('user')}
              </h3>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] text-micro-label font-semibold shrink-0">
                  <Crown size={11} strokeWidth={2} />
                  Admin
                </span>
              )}
            </div>
            <p className="text-secondary text-[var(--text-secondary)] truncate mt-0.5">
              {user?.email}
            </p>
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={2} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors shrink-0" />
      </button>

      {/* Quick Access Priority Modules */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          onClick={() => handleSectionClick('receipts')}
          className="flex flex-col items-center justify-center p-3 rounded-card bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-8 h-8 flex items-center justify-center text-[var(--text-primary)] mb-1.5 group-hover:text-[var(--accent-color)] transition-colors">
            <Receipt size={19} strokeWidth={2} />
          </div>
          <span className="text-label font-semibold text-[var(--text-primary)] truncate w-full text-center">
            {config.language === 'en' ? 'Receipts' : 'Kvitton'}
          </span>
        </button>

        <button
          onClick={() => handleSectionClick('debts')}
          className="flex flex-col items-center justify-center p-3 rounded-card bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-8 h-8 flex items-center justify-center text-[var(--text-primary)] mb-1.5 group-hover:text-[var(--accent-color)] transition-colors">
            <HandCoins size={19} strokeWidth={2} />
          </div>
          <span className="text-label font-semibold text-[var(--text-primary)] truncate w-full text-center">
            {config.language === 'en' ? 'Debts' : 'Skyldig'}
          </span>
        </button>

        <button
          onClick={() => handleSectionClick('starred')}
          className="flex flex-col items-center justify-center p-3 rounded-card bg-[var(--surface-color)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-8 h-8 flex items-center justify-center text-[var(--text-primary)] mb-1.5 group-hover:text-[var(--accent-color)] transition-colors">
            <Heart size={19} strokeWidth={2} />
          </div>
          <span className="text-label font-semibold text-[var(--text-primary)] truncate w-full text-center">
            {config.language === 'en' ? 'Starred' : 'Hjärtade'}
          </span>
        </button>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* Admin Tools for App Owner */}
        {isAdmin && (
          <div className="space-y-2">
            <h4 className="text-section-title px-1.5 flex items-center gap-1.5">
              <span>{config.language === 'en' ? 'Administration' : 'Administration'}</span>
              <Crown size={14} strokeWidth={2} className="text-[var(--warning-color)] shrink-0" />
            </h4>
            <Card variant="default" padding="none" className="divide-y divide-menu border border-[var(--warning-color)]/25">
              <ListRow
                variant="grouped"
                density="compact"
                showChevron
                multiline={true}
                icon={<ShieldCheck size={18} strokeWidth={2} />}
                iconColor="text-[var(--warning-color)]"
                title={config.language === 'en' ? 'Admin Dashboard' : 'Adminpanel'}
                subtitle={config.language === 'en' ? 'Owner tools, system overview & feedback' : 'Ägarverktyg, systemöversikt & feedback'}
                onClick={() => handleSectionClick('admin')}
              />
              <ListRow
                variant="grouped"
                density="compact"
                showChevron
                multiline={true}
                icon={<Palette size={18} strokeWidth={2} />}
                iconColor="text-[var(--accent-color)]"
                title="Designbibliotek"
                subtitle="Se och testa appens gemensamma design, komponenter och flöden"
                onClick={() => handleSectionClick('designLibrary')}
              />
            </Card>
          </div>
        )}

        {/* Ekonomi & Budget */}
        <div className="space-y-2">
          <h4 className="text-section-title px-1.5">
            {t('economy')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Calendar size={18} strokeWidth={2} />}
              title={t('salary')}
              onClick={() => handleSectionClick('salary')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<PieChart size={18} strokeWidth={2} />}
              title={config.language === 'en' ? 'Budget' : 'Budget'}
              onClick={() => handleSectionClick('budget')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Tag size={18} strokeWidth={2} />}
              title={config.language === 'en' ? 'Categories' : 'Kategorier'}
              onClick={() => handleSectionClick('categories')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<CreditCard size={18} strokeWidth={2} />}
              title={t('paymentMethod')}
              onClick={() => handleSectionClick('paymentMethods')}
            />
            {canUseBankIntegration && (
              <ListRow
                variant="grouped"
                density="compact"
                showChevron
                icon={<Building2 size={18} strokeWidth={2} />}
                title="Bankkoppling"
                onClick={() => handleSectionClick('bank')}
              />
            )}
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Coins size={18} strokeWidth={2} />}
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
          <h4 className="text-section-title px-1.5">
            {config.language === 'en' ? 'Tools & Sharing' : 'Verktyg & Funktioner'}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            
            
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Users2 size={18} strokeWidth={2} />}
              title={config.language === 'en' ? 'Shared budget' : 'Delad budget (Par-läge)'}
              onClick={() => handleSectionClick('sharedBudget')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<BookOpen size={18} strokeWidth={2} />}
              title={config.language === 'en' ? 'Guides & instructions' : 'Guider & Instruktioner'}
              onClick={() => handleSectionClick('guides')}
            />
          </Card>
        </div>

        {/* App Settings */}
        <div className="space-y-2">
          <h4 className="text-section-title px-1.5">
            {t('appSettings')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Bell size={18} strokeWidth={2} />}
              title={config.language === 'en' ? 'Notifications' : 'Notiser'}
              onClick={() => handleSectionClick('notifications')}
            />

            <ListRow
              variant="grouped"
              density="compact"
              icon={<Palette size={18} strokeWidth={2} />}
              title={t('appearance' as any) || 'Utseende'}
              control={
                <SegmentedControl
                  size="sm"
                  fullWidth={false}
                  value={config.themeMode || (config.darkMode ? 'dark' : 'light')}
                  options={[
                    { value: 'light', label: config.language === 'en' ? 'Light' : 'Ljust' },
                    { value: 'dark', label: config.language === 'en' ? 'Dark' : 'Mörkt' },
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
              density="compact"
              showChevron
              icon={<Globe size={18} strokeWidth={2} />}
              title={t('language')}
              onClick={() => handleSectionClick('language')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Lock size={18} strokeWidth={2} />}
              title={t('pinLock')}
              onClick={onSecurityClick}
            />
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              icon={<Calendar size={18} strokeWidth={2} />}
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
            <ListRow
              variant="grouped"
              density="compact"
              multiline
              icon={<PieChart size={18} strokeWidth={2} />}
              title={config.language === 'en' ? 'Hide budget on Home' : 'Dölj budget på hemfliken'}
              subtitle={
                config.language === 'en'
                  ? 'Hides category budgets from the Home tab for a cleaner view focused on Available to spend.'
                  : 'Döljer kategoribudgetar på hemfliken för en renare vy med fokus på Kvar att spendera.'
              }
              control={
                <Switch
                  checked={Boolean(config.hideBudgetOnHome ?? (localStorage.getItem('dejz_hide_budget_on_home') === 'true'))}
                  onChange={() => {
                    const currentVal = Boolean(config.hideBudgetOnHome ?? (localStorage.getItem('dejz_hide_budget_on_home') === 'true'));
                    const nextVal = !currentVal;
                    try {
                      localStorage.setItem('dejz_hide_budget_on_home', nextVal ? 'true' : 'false');
                    } catch (err) {
                      void err;
                    }
                    setConfig({ ...config, hideBudgetOnHome: nextVal });
                  }}
                  aria-label={config.language === 'en' ? 'Hide budget on Home' : 'Dölj budget på hemfliken'}
                />
              }
            />
          </Card>
        </div>

        {/* Support & Legal */}
        <div className="space-y-2">
          <h4 className="text-section-title px-1.5">
            {t('support')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Mail size={18} strokeWidth={2} />}
              title={t('feedback')}
              onClick={onFeedbackClick}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Download size={18} strokeWidth={2} />}
              title={t('exportData')}
              onClick={onExportData}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<Shield size={18} strokeWidth={2} />}
              title={t('privacyPolicy')}
              onClick={() => onLegalClick('privacy')}
            />
            <ListRow
              variant="grouped"
              density="compact"
              showChevron
              icon={<FileText size={18} strokeWidth={2} />}
              title={t('termsOfService')}
              onClick={() => onLegalClick('terms')}
            />
          </Card>
        </div>

        {/* Account Actions */}
        <div className="space-y-2">
          <h4 className="text-section-title text-[var(--danger-color)] px-1.5">
            {t('dangerZone')}
          </h4>
          <Card variant="default" padding="none" className="divide-y divide-menu">
            {isDemoMode && (
              <div className="p-4 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
                <span className="text-label font-semibold text-[var(--text-primary)] block">
                  {t('demoModeActive')}
                </span>
                <p className="text-micro-label text-[var(--text-secondary)] leading-relaxed">
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
              title={t('logout')}
              onClick={onLogout}
            />
            <ListRow
              variant="grouped"
              density="compact"
              destructive
              icon={<Trash2 size={18} strokeWidth={2} />}
              iconColor="text-[var(--danger-color)]"
              title={t('deleteAccount')}
              titleClassName="text-[var(--danger-color)]"
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
