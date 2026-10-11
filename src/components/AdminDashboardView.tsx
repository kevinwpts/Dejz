import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Crown, 
  Sparkles, 
  Database, 
  MessageSquare, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ChevronLeft, 
  FileCode,
  Users,
  Play
} from 'lucide-react';
import { Config, Transaction, Income, FixedExpense } from '../types';
import { dataService } from '../services/dataService';
import { createFreshTestAccount, seedDemoData } from '../utils/demoData';
import { feedback } from '../utils/feedback';
import { Modal, Button } from './ui';

interface AdminDashboardViewProps {
  onBack: () => void;
  user: any;
  config: Config;
  setConfig: (config: Config) => void;
  subscriptionStatus: string | null;
  onSetSubscriptionStatus?: (status: string | null) => void;
  transactions: Transaction[];
  incomes: Income[];
  fixedExpenses: FixedExpense[];
  onRefresh: () => void;
  addToast: (message: string, type: 'success' | 'error') => void;
}

export function AdminDashboardView({
  onBack,
  user,
  config,
  setConfig: _setConfig,
  subscriptionStatus,
  onSetSubscriptionStatus,
  transactions,
  incomes,
  fixedExpenses,
  onRefresh,
  addToast,
}: AdminDashboardViewProps) {
  const [feedbackList, setFeedbackList] = useState<Array<{ id: string; user_id?: string; message: string; created_at: string }>>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [adminStats, setAdminStats] = useState<{ totalUsers: number; dbHealthy: boolean; timestamp: string }>({
    totalUsers: 1,
    dbHealthy: true,
    timestamp: new Date().toISOString()
  });
  const [copiedDebug, setCopiedDebug] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isEn = config.language === 'en';

  useEffect(() => {
    loadFeedback();
    loadAdminStats();
  }, []);

  const loadFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const list = await dataService.getFeedbackList();
      setFeedbackList(list);
    } catch (e) {
      console.error('Error fetching feedback:', e);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const loadAdminStats = async () => {
    try {
      const stats = await dataService.getAdminStats();
      setAdminStats(stats);
    } catch (e) {
      console.error('Error fetching admin stats:', e);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    try {
      await dataService.deleteFeedback(id);
      setFeedbackList(prev => prev.filter(f => f.id !== id));
      addToast(isEn ? 'Feedback deleted' : 'Feedback borttagen', 'success');
    } catch {
      addToast(isEn ? 'Could not delete feedback' : 'Kunde inte ta bort feedback', 'error');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleCopyDiagnostics = () => {
    const diagnosticData = {
      app: 'Dejz',
      version: '1.4.2',
      environment: 'production',
      userEmail: user?.email,
      userId: user?.id,
      subscriptionStatus: subscriptionStatus || 'free',
      currency: config.currency,
      language: config.language,
      themeMode: config.themeMode,
      totalTransactions: transactions.length,
      totalIncomes: incomes.length,
      totalFixedExpenses: fixedExpenses.length,
      totalCategories: config.categories?.length || 0,
      totalSavingsGoals: config.savingsGoals?.length || 0,
      timestamp: new Date().toISOString(),
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticData, null, 2));
    setCopiedDebug(true);
    feedback.success();
    addToast(isEn ? 'System diagnostic copied to clipboard!' : 'Systemrapport kopierad till urklipp!', 'success');
    setTimeout(() => setCopiedDebug(false), 2000);
  };

  const handleSimulateSubscription = (status: 'pro' | 'trial' | 'free') => {
    feedback.light();
    try {
      localStorage.setItem('dejz_simulated_sub_status', status);
      if (onSetSubscriptionStatus) {
        onSetSubscriptionStatus(status === 'free' ? null : status);
      }
      addToast(
        isEn 
          ? `Subscription set to ${status.toUpperCase()}` 
          : `Prenumerationsläge ändrat till ${status.toUpperCase()}`,
        'success'
      );
    } catch {
      addToast('Kunde inte uppdatera läge', 'error');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
      className="space-y-[var(--card-gap)] pb-16 font-sans"
    >
      {/* Header & Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors">
            <ChevronLeft size={16} strokeWidth={2.5} />
          </div>
          <span>{isEn ? 'Back to profile' : 'Tillbaka till profilen'}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--warning-container)] text-[var(--warning-color)] text-xs font-bold border border-[var(--warning-color)]/20">
          <Crown size={14} strokeWidth={2} />
          <span>{isEn ? 'App Owner' : 'Appägare'}</span>
        </div>
      </div>

      {/* Admin Hero Card */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,12px)] p-5 sm:p-6 border border-subtle shadow-none space-y-[var(--card-gap)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[var(--radius-xs,8px)] bg-gradient-to-tr from-[var(--accent-color)] to-[var(--warning-color)] text-white flex items-center justify-center shadow-subtle shadow-[var(--accent-color)]/20">
              <ShieldCheck size={26} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold font-display text-[var(--text-primary)] tracking-tight">
                {isEn ? 'Admin Dashboard' : 'Adminpanel'}
              </h2>
              <p className="text-xs font-medium text-[var(--text-secondary)] mt-0.5">
                {user?.email || 'kevinwpts@gmail.com'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onRefresh();
              loadFeedback();
              loadAdminStats();
              addToast(isEn ? 'Data refreshed' : 'Data uppdaterad', 'success');
            }}
            className="w-9 h-9 rounded-[var(--radius-xs,8px)] bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title={isEn ? 'Refresh' : 'Uppdatera'}
          >
            <RefreshCw size={16} strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          <div className="p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-[var(--radius-xs,8px)] border border-subtle">
            <span className="text-label font-medium text-[var(--text-secondary)] block">
              {isEn ? 'Database' : 'Databas'}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {adminStats.dbHealthy ? (
                <>
                  <CheckCircle2 size={15} strokeWidth={2} className="text-[var(--success-color)]" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Online</span>
                </>
              ) : (
                <>
                  <XCircle size={15} strokeWidth={2} className="text-[var(--danger-color)]" />
                  <span className="text-xs font-bold text-[var(--danger-color)]">Offline</span>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-[var(--radius-xs,8px)] border border-subtle">
            <span className="text-label font-medium text-[var(--text-secondary)] block">
              {isEn ? 'Subscription' : 'Status'}
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)] block mt-1 tracking-tight">
              {subscriptionStatus || 'Free'}
            </span>
          </div>

          <div className="p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-[var(--radius-xs,8px)] border border-subtle">
            <span className="text-label font-medium text-[var(--text-secondary)] block">
              {isEn ? 'Transactions' : 'Transaktioner'}
            </span>
            <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)] block mt-1">
              {transactions.length} st
            </span>
          </div>

          <div className="p-3 bg-black/[0.02] dark:bg-white/[0.03] rounded-[var(--radius-xs,8px)] border border-subtle">
            <span className="text-label font-medium text-[var(--text-secondary)] block">
              {isEn ? 'Categories' : 'Kategorier'}
            </span>
            <span className="text-xs font-bold font-amount tabular-nums text-[var(--text-primary)] block mt-1">
              {config.categories?.length || 0} st
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Simulator */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,12px)] p-5 sm:p-6 border border-subtle shadow-none space-y-[var(--card-gap)]">
        <div className="flex items-center gap-2">
          <Sparkles size={18} strokeWidth={2} className="text-[var(--accent-color)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Subscription Simulator (Testing)' : 'Prenumerationssimulator (Testa vyer)'}
          </h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {isEn
            ? 'Instantly switch your account mode to test how the app behaves for Free, Trial, or Pro subscribers without billing.'
            : 'Växla direkt mellan olika kontolägen för att testa hur appen och funktioner ser ut för gratis-, prov- eller Pro-användare.'}
        </p>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => handleSimulateSubscription('pro')}
            className={`py-3 px-3 rounded-[var(--radius-xs,8px)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
              subscriptionStatus === 'pro'
                ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-subtle'
                : 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <Crown size={16} strokeWidth={2} />
            <span>Dejz Pro</span>
          </button>

          <button
            type="button"
            onClick={() => handleSimulateSubscription('trial')}
            className={`py-3 px-3 rounded-[var(--radius-xs,8px)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
              subscriptionStatus === 'trial'
                ? 'bg-[var(--accent-color)] text-[var(--on-accent)] shadow-subtle'
                : 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <Sparkles size={16} strokeWidth={2} />
            <span>{isEn ? '14-Day Trial' : '14 dagars prov'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSimulateSubscription('free')}
            className={`py-3 px-3 rounded-[var(--radius-xs,8px)] text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 ${
              !subscriptionStatus || subscriptionStatus === 'free'
                ? 'bg-black/80 dark:bg-white/80 text-white dark:text-black shadow-subtle'
                : 'bg-black/5 dark:bg-white/5 text-[var(--text-primary)] hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            <Users size={16} strokeWidth={2} />
            <span>{isEn ? 'Free user' : 'Gratiskonto'}</span>
          </button>
        </div>
      </div>

      {/* Quick Test Account Tools (Admin Only) */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,12px)] p-5 sm:p-6 border border-subtle shadow-none space-y-[var(--card-gap)]">
        <div className="flex items-center gap-2">
          <Sparkles size={18} strokeWidth={2} className="text-[var(--warning-color)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Quick Test Account (Admin Only)' : 'Snabbtest & Testkonto (Endast Admin)'}
          </h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          {isEn
            ? 'Launch a clean test account to test onboarding from scratch, or load complete demo data. This tool is now exclusively accessible from your admin dashboard.'
            : 'Starta ett helt rent testkonto för att testa onboardingflödet från början, eller ladda in fullständig exempeldata. Denna snabbknapp är nu flyttad hit och endast tillgänglig för dig som admin.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              feedback.tap();
              createFreshTestAccount(config.language);
              addToast(isEn ? 'Fresh test account initialized! Starting onboarding...' : 'Nytt testkonto initierat! Startar onboarding...', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 400);
            }}
            className="p-4 rounded-[var(--radius-card-nested,12px)] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.07] border border-subtle text-left transition-all cursor-pointer active:scale-[0.98] group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                {isEn ? 'Start Fresh Onboarding Test' : 'Testa Onboarding (Rent testkonto)'}
              </span>
              <Play size={14} strokeWidth={2.5} className="text-[var(--warning-color)] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-label text-[var(--text-secondary)] opacity-75">
              {isEn ? 'Clears test data and opens initial setup wizard' : 'Nollställer testdata och öppnar introduktionsguiden'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              feedback.tap();
              seedDemoData();
              const mockSession = {
                access_token: 'demo-token',
                refresh_token: 'demo-refresh',
                expires_in: 3600,
                token_type: 'bearer',
                user: {
                  id: 'demo-user',
                  email: 'demo@dejz.se',
                  user_metadata: {},
                  app_metadata: {},
                  aud: 'authenticated',
                  created_at: new Date().toISOString()
                }
              };
              localStorage.setItem('dejz_demo_session', JSON.stringify(mockSession));
              addToast(isEn ? 'Demo data loaded successfully!' : 'Exempeldata inläst i demoläge!', 'success');
              setTimeout(() => {
                window.location.reload();
              }, 400);
            }}
            className="p-4 rounded-[var(--radius-card-nested,12px)] bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.07] border border-subtle text-left transition-all cursor-pointer active:scale-[0.98] group flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] tracking-tight">
                {isEn ? 'Load Full Demo Data' : 'Ladda in fullständig exempeldata'}
              </span>
              <Play size={14} strokeWidth={2.5} className="text-[var(--success-color)] group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-label text-[var(--text-secondary)] opacity-75">
              {isEn ? 'Pre-populates realistic incomes, expenses & goals' : 'Laddar färdiga inkomster, utgifter och sparmål'}
            </p>
          </button>
        </div>
      </div>

      {/* User Feedback Module */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,12px)] p-5 sm:p-6 border border-subtle shadow-none space-y-[var(--card-gap)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} strokeWidth={2} className="text-[var(--accent-color)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              {isEn ? 'User Feedback & Bug Reports' : 'Inkommen Användarfeedback'}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] font-amount tabular-nums">
            {feedbackList.length} st
          </span>
        </div>

        {loadingFeedback ? (
          <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
            {isEn ? 'Loading feedback...' : 'Hämtar feedback...'}
          </div>
        ) : feedbackList.length > 0 ? (
          <div className="space-y-[var(--card-gap)] max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
            {feedbackList.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-black/[0.02] dark:bg-white/[0.03] rounded-[var(--radius-card-nested,12px)] border border-subtle space-y-2 group"
              >
                <div className="flex items-center justify-between text-label text-[var(--text-secondary)]">
                  <span className="font-mono opacity-60">
                    {new Date(item.created_at).toLocaleString(isEn ? 'en-US' : 'sv-SE', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-[var(--danger-color)] transition-opacity cursor-pointer p-1"
                    title={isEn ? 'Delete' : 'Ta bort'}
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </div>
                <p className="text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-[var(--text-secondary)] opacity-70">
            {isEn ? 'No feedback received yet.' : 'Ingen feedback har inkommit än.'}
          </div>
        )}
      </div>

      {/* Developer & Diagnostic Tools */}
      <div className="bg-[var(--surface-color)] rounded-[var(--radius-card,20px)] card-p border-none shadow-subtle space-y-[var(--card-gap)]">
        <div className="flex items-center gap-2">
          <Database size={18} strokeWidth={2} className="text-[var(--success-color)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
            {isEn ? 'Developer Tools' : 'Utvecklarverktyg & Diagnostik'}
          </h3>
        </div>

        <div className="space-y-[var(--card-gap)]">
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="w-full flex items-center justify-between p-3.5 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-[var(--radius-card-nested,12px)] border border-subtle text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer touch-press"
          >
            <div className="flex items-center gap-2.5">
              <FileCode size={16} strokeWidth={2} className="text-[var(--text-secondary)]" />
              <span>{isEn ? 'Copy system diagnostic JSON' : 'Kopiera systemdiagnostik (JSON)'}</span>
            </div>
            {copiedDebug ? (
              <Check size={16} strokeWidth={2.5} className="text-[var(--success-color)]" />
            ) : (
              <Copy size={16} strokeWidth={2} className="text-[var(--text-secondary)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              try {
                // Clear localStorage cached settings
                localStorage.removeItem(`user_settings_${user?.id}`);
                onRefresh();
                addToast(isEn ? 'Local cache cleared & synced' : 'Lokal cache rensad och omsynkad', 'success');
              } catch {
                addToast('Kunde inte rensa cache', 'error');
              }
            }}
            className="w-full flex items-center justify-between p-3.5 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] rounded-[var(--radius-card-nested,12px)] border border-subtle text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer touch-press"
          >
            <div className="flex items-center gap-2.5">
              <RefreshCw size={16} strokeWidth={2} className="text-[var(--text-secondary)]" />
              <span>{isEn ? 'Clear local cache & refresh schema' : 'Töm lokal cache & hämta färsk data'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Delete Feedback Confirmation Modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          center
          size="sm"
          title={isEn ? 'Delete feedback?' : 'Ta bort feedback?'}
          showCloseButton={true}
          bodyClassName="p-6 space-y-[var(--card-gap)]"
        >
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            {isEn
              ? 'Are you sure you want to delete this feedback entry?'
              : 'Är du säker på att du vill ta bort detta feedback-meddelande?'}
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="danger"
              size="md"
              fullWidth
              onClick={() => handleDeleteFeedback(deleteConfirmId)}
            >
              {isEn ? 'Delete' : 'Ta bort'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setDeleteConfirmId(null)}
            >
              {isEn ? 'Cancel' : 'Avbryt'}
            </Button>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}
