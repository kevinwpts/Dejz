/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { Analytics } from '@vercel/analytics/react';

function TabWrapper({
  tabKey,
  scrollPositionsRef,
  children,
}: {
  tabKey: string;
  scrollPositionsRef: React.MutableRefObject<Record<string, number>>;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    const targetY = scrollPositionsRef.current[tabKey] ?? 0;

    const raf1 = requestAnimationFrame(() => {
      window.scrollTo({ top: targetY, behavior: "instant" as any });
    });

    const handleScroll = () => {
      if (document.body.style.overflow === "hidden") return;
      scrollPositionsRef.current[tabKey] = window.scrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf1);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [tabKey, scrollPositionsRef]);

  return <>{children}</>;
}
import { motion, AnimatePresence } from "motion/react";
import {
  PaymentMethod,
  Frequency,
  Config,
  Income,
  FixedExpense,
  Transaction,
  WeekendAdjustment,
  PaydayType,
  SavingsGoal,
  AppNotification,
} from "./types";
import {
  AlertCircle,
  Loader2,
  LogOut,
} from "lucide-react";


import { UniversalPeriodSelector } from './components/UniversalPeriodSelector';
import {
  IncomeModal,
  FixedExpenseModal,
  FixedExpenseViewModal,
  IncomeViewModal,
  MonthlySavingModal,
  MonthlySavingViewModal,
} from "./components/BudgetModals";
import { CalculatorModal } from "./components/CalculatorModal";
import { TransactionViewModal } from "./components/TransactionViewModal";
import { BudgetView } from "./components/BudgetView";
import { TransactionModal } from "./components/TransactionModal";
import { OverviewView } from "./components/OverviewView";
import { TodayView } from "./components/TodayView";
import { AppHeader } from "./components/AppHeader";
import { ProfileView } from "./components/ProfileView";
import { SettingsMainView } from "./components/SettingsMainView";
import { AddToHomeScreenModal } from "./components/AddToHomeScreenModal";
import { CookieConsentModal } from "./components/CookieConsentModal";
import { FeedbackModal } from "./components/FeedbackModal";
import { DeleteAccountModal } from "./components/DeleteAccountModal";
import { SecurityModal } from "./components/SecurityModal";
import { ManageAccountModal } from "./components/ManageAccountModal";
import { PinLockScreen } from "./components/PinLockScreen";
import { VariableAmountUpdateModal } from "./components/VariableAmountUpdateModal";
import { NotificationsView } from "./components/NotificationsView";
import {
  supabase,
  isSupabaseConfigured,
  isSupabaseKeyValid,
  isSupabaseUrlValid,
  supabaseAnonKey,
} from "./supabaseClient";
import { Auth } from "./components/Auth";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { OnboardingModal } from "./components/OnboardingModal";
import { SearchModal } from "./components/SearchModal";

import { LegalModal } from "./components/LegalModals";
import { PullToRefresh } from "./components/PullToRefresh";
import { Session } from "@supabase/supabase-js";
import { ToastContainer, ToastMessage, ToastType } from "./components/Toast";
import { ConfirmModal } from "./components/ConfirmModal";

import { LandingPage } from "./components/LandingPage";
import { seedDemoData } from "./utils/demoData";
import { clearDemoData, isDemoMode as checkDemoMode } from "./utils/demoUtils";

import { dataService } from "./services/dataService";
import { Language, translations, TranslationKey } from "./i18n";
import { hasPin } from "./utils/security";
import {
  getPeriodBoundaries,
  getPeriodName,
  getPeriodId,
  isVariableItemDue,
} from "./utils/date";
import { verifyPayment, isPro } from "./utils/subscription";

import {
  SUPPORT_EMAIL,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
} from "./constants";
import { CustomBottomNavigation } from "./components/CustomBottomNavigation";
import { feedback } from "./utils/feedback";
import { LOGO_URL } from "./constants";
import { resolveLucideIcon, isEmojiString } from "./utils/icons";

// --- Types ---

type Tab = "today" | "transactions" | "analysis" | "budget" | "profile" | "settings" | "notifications";

// Header component removed as per user request to save space.

// Rebuild trigger: Accent theme
export default function App() {
  const _now = new Date();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null,
  );
  const [profile, setProfile] = useState<any>(null);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null);

  const [config, setConfig] = useState<Config | null>(null);
  const [landingLanguage, setLandingLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'sv';
  });
  const [currentPeriodDate, setCurrentPeriodDate] = useState(new Date());

  const _goToPreviousPeriod = () => {
    const newDate = new Date(currentPeriodDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentPeriodDate(newDate);
  };
  const _goToNextPeriod = () => {
    const newDate = new Date(currentPeriodDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentPeriodDate(newDate);
  };
  const _goToToday = () => {
    setCurrentPeriodDate(new Date());
  };

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
    if (["today", "transactions", "analysis", "budget", "profile", "settings", "notifications"].includes(path)) {
      return path as Tab;
    }
    return "today";
  });
  const [profileSection, setProfileSection] = useState<
    | "main"
    | "salary"
    | "categories"
    | "paymentMethods"
    | "language"
    | "manageAccount"
  >("main");
  const [settingsSection, setSettingsSection] = useState<
    | "main"
    | "salary"
    | "categories"
    | "paymentMethods"
    | "language"
  >("main");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionPrefill, setTransactionPrefill] = useState<any>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | "savings"
  >("expense");
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<Transaction | null>(null);
  const [targetDate, setTargetDate] = useState<Date>(new Date());

  // Reset to today on mount
  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setTargetDate(now);
    setCurrentPeriodDate(now);
  }, []);

  useEffect(() => {
    if (!config) return;
    const paydaySetting = config.payday || 25;
    const paydayType = config.paydayType || PaydayType.TWENTY_FIFTH;
    const paydayBeforeWeekend = config.paydayBeforeWeekend
      ? WeekendAdjustment.BEFORE
      : WeekendAdjustment.NONE;

    const referenceDate = new Date(
      currentPeriodDate.getFullYear(),
      currentPeriodDate.getMonth(),
      currentPeriodDate.getDate(),
    );
    referenceDate.setHours(0, 0, 0, 0);
    const { start, end } = getPeriodBoundaries(
      referenceDate,
      paydayType,
      paydaySetting,
      paydayBeforeWeekend,
    );

    const targetTime = targetDate.getTime();
    if (targetTime < start.getTime() || targetTime > end.getTime()) {
      const actualToday = new Date();
      actualToday.setHours(0, 0, 0, 0);
      if (actualToday >= start && actualToday <= end) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        setTargetDate(now);
      } else {
        setTargetDate(start);
      }
    }
  }, [currentPeriodDate, config, targetDate]);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [viewingIncome, setViewingIncome] = useState<Income | null>(null);
  const [editingFixedExpense, setEditingFixedExpense] =
    useState<FixedExpense | null>(null);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isFixedExpenseModalOpen, setIsFixedExpenseModalOpen] = useState(false);
  const [isMonthlySavingModalOpen, setIsMonthlySavingModalOpen] =
    useState(false);
  const [viewingFixedExpense, setViewingFixedExpense] =
    useState<FixedExpense | null>(null);
  const [viewingMonthlySaving, setViewingMonthlySaving] = useState<any | null>(
    null,
  );
  const [editingMonthlySaving, setEditingMonthlySaving] = useState<any | null>(
    null,
  );
  const [navTrigger, setNavTrigger] = useState(0);

  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] =
    useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isManageAccountModalOpen, setIsManageAccountModalOpen] =
    useState(false);
  const [legalModal, setLegalModal] = useState<{
    isOpen: boolean;
    type: "privacy" | "terms" | "cookies" | "contact";
  }>({
    isOpen: false,
    type: "terms",
  });

  const [isLocked, setIsLocked] = useState(false);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dejz_dismissed_notifications");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isVariableUpdateModalOpen, setIsVariableUpdateModalOpen] =
    useState(false);
  const [itemToUpdateVariable, setItemToUpdateVariable] = useState<any>(null);
  const [navHistory, setNavHistory] = useState<{ tab: Tab; section?: string }[]>([]);

  const tabScrollPositions = useRef<Record<string, number>>({});

  const handleLegalClick = (
    type: "privacy" | "terms" | "cookies" | "contact",
  ) => {
    setLegalModal({ isOpen: true, type });
  };

  // Update app icon and manifest based on theme
  useEffect(() => {
    const theme = config?.appIconTheme || "accent";

    // Update manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute("href", `/manifest.json?theme=${theme}`);
    }

    // Update apple-touch-icon
    const appleIconLink = document.querySelector(
      'link[rel="apple-touch-icon"]',
    );
    if (appleIconLink) {
      appleIconLink.setAttribute("href", `/api/icon.svg?theme=${theme}`);
    }

    // Update favicon
    const faviconLink = document.querySelector('link[rel="icon"]');
    if (faviconLink) {
      faviconLink.setAttribute("href", `/api/icon.svg?theme=${theme}`);
    }
  }, [config?.appIconTheme]);

  const handleRefresh = async () => {
    if (!session) return;
    try {
      let dbProfile = await dataService.getProfile(session.user.id);

      // Ensure profile exists
      if (!dbProfile || Object.keys(dbProfile).length === 0) {
        const { data, error } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            email: session.user.email,
            role:
              session.user.email === "kevinwpts@gmail.com" ? "admin" : "user",
            language: landingLanguage,
            dark_mode: false,
          })
          .select()
          .single();
        if (!error) dbProfile = data;
      }

      const [dbSettings, dbTransactions, dbIncomes, dbFixed] =
        await Promise.all([
          dataService.getSettings(session.user.id),
          dataService.getTransactions(session.user.id),
          dataService.getIncomeSources(session.user.id),
          dataService.getFixedExpenses(session.user.id),
        ]);

      if (dbProfile) {
        setProfile(dbProfile);
        setSubscriptionStatus(dbProfile.subscription_status || "free");
        setTrialEnd(dbProfile.trial_end);
        setNextBillingDate(dbProfile.next_billing_date);
      }

      if (dbSettings) {
        // Migrate category emojis back to Lucide icon names
        const migrateCategories = (categories: any[]) => {
          let hasChanged = false;
          const migrated = categories.map((cat) => {
            if (cat.icon && isEmojiString(cat.icon)) {
              hasChanged = true;
              return { ...cat, icon: resolveLucideIcon(cat.icon) };
            }
            return cat;
          });
          return { migrated, hasChanged };
        };

        const migrateExpenseCategories = (categories: any[]) => {
          const { migrated } = migrateCategories(categories);
          let { hasChanged } = migrateCategories(categories);
          const hasInsurance = migrated.some(
            (c) =>
              (c.name || '').trim().toLowerCase() === "försäkringar" ||
              (c.name || '').trim().toLowerCase() === "försäkring" ||
              (c.name || '').trim().toLowerCase() === "insurance",
          );
          if (!hasInsurance && migrated.length > 0) {
            const ovrigtIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "övrigt",
            );
            const newCat = {
              name: "Försäkringar",
              icon: "shield",
              color: "#0ea5e9",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, newCat);
            } else {
              migrated.push(newCat);
            }
            hasChanged = true;
          }
          return { migrated, hasChanged };
        };

        const { migrated: migratedExpense, hasChanged: expenseChanged } =
          migrateExpenseCategories(dbSettings.categories || []);
        const { migrated: migratedIncome, hasChanged: incomeChanged } =
          migrateCategories(dbSettings.incomeCategories || []);

        if (expenseChanged || incomeChanged) {
          console.log("[Migration] Migrated categories back to icons");
          const updatedSettings = {
            ...dbSettings,
            categories: migratedExpense,
            incomeCategories: migratedIncome,
          };
          dataService
            .saveSettings(session.user.id, updatedSettings)
            .catch((err) => {
              console.error(
                "[Migration] Failed to save migrated settings:",
                err,
              );
            });
          dbSettings.categories = migratedExpense;
          dbSettings.incomeCategories = migratedIncome;
        }

        let languageToUse = dbSettings.language;
        if (landingLanguage && dbSettings.language !== landingLanguage) {
          console.log("[Migration] Updating language to landing page selection:", landingLanguage);
          languageToUse = landingLanguage;
          dataService.saveSettings(session.user.id, { ...dbSettings, language: landingLanguage });
        }

        setConfig({
          currency: dbSettings.currency === "SEK" ? "kr" : dbSettings.currency,
          language: languageToUse,
          payday: dbSettings.payday,
          paydayType: dbSettings.paydayType || PaydayType.TWENTY_FIFTH,
          paydayBeforeWeekend: dbSettings.paydayBeforeWeekend,
          categories: dbSettings.categories,
          incomeCategories: dbSettings.incomeCategories,
          initialSpent: Number(dbSettings.initialSpent),
          notifications: dbSettings.notifications,
          securityLock: dbSettings.securityLock,
          darkMode:
            (dbSettings.darkMode !== undefined && dbSettings.darkMode !== null) ? dbSettings.darkMode : false,
          quickChoices: dbSettings.quickChoices || [],
          savingsPot: dbSettings.savingsPot || 0,
          savingsGoals: dbSettings.savingsGoals || [],
          totalSavedLifetime: dbSettings.totalSavedLifetime || 0,
          paymentMethods: dbSettings.paymentMethods || [
            "Autogiro",
            "E-faktura",
            "Kort",
            "Faktura",
            "Övrigt",
          ],
          surplusIncome: dbSettings.surplusIncome || 0,
          monthlySavings: dbSettings.monthlySavings || 0,
          appIconTheme: dbSettings.appIconTheme,
          includeFixedExpensesInAnalysis:
            dbSettings.includeFixedExpensesInAnalysis !== undefined
              ? dbSettings.includeFixedExpensesInAnalysis
              : true,
          showFixedExpensesInTodayView:
            dbSettings.showFixedExpensesInTodayView !== undefined
              ? dbSettings.showFixedExpensesInTodayView
              : true,
          showFixedExpensesInCalendar:
            dbSettings.showFixedExpensesInCalendar !== undefined
              ? dbSettings.showFixedExpensesInCalendar
              : false,
        });
      }

      setTransactions(dbTransactions || []);
      setIncomes(dbIncomes || []);
      setFixedExpenses(dbFixed || []);

      // Small delay to make the refresh feel "real"
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error("Refresh failed:", error);
    }
  };

  const handleResetSavingsPot = async () => {
    if (!session || !config) return;

    setConfirmModal({
      isOpen: true,
      title: t("resetSavingsPot"),
      message: t("resetSavingsPotMessage"),
      variant: "danger",
      onConfirm: async () => {
        try {
          const currentPot = config.savingsPot || 0;
          await dataService.resetSavingsPot(session.user.id);

          // Update local state
          setConfig((prev) =>
            prev
              ? {
                  ...prev,
                  savingsPot: 0,
                  totalSavedLifetime: Math.max(
                    0,
                    (prev.totalSavedLifetime || 0) - currentPot,
                  ),
                }
              : null,
          );
          setTransactions((prev) =>
            prev.filter(
              (e) => e.category !== "Spargris" && e.category !== "Budgetökning",
            ),
          );

          addToast(t("savingsPotResetSuccess"), "success");
        } catch (err) {
          console.error("Error resetting savings pot:", err);
          addToast(t("errorSaving"), "error");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleResetCompletedGoals = async () => {
    if (!session || !config) return;

    setConfirmModal({
      isOpen: true,
      title: t("reset"),
      message: t("confirmDelete"),
      variant: "danger",
      onConfirm: async () => {
        try {
          const updatedGoals = (config.savingsGoals || []).filter(
            (g) => !g.isCompleted,
          );
          const newConfig = { ...config, savingsGoals: updatedGoals };

          setConfig(newConfig);
          await dataService.saveSettings(session.user.id, newConfig);

          addToast(t("reset"), "success");
        } catch (err) {
          console.error("Error resetting completed goals:", err);
          addToast(t("error"), "error");
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleClearTransactions = async () => {
    if (!session) return;

    showConfirm(
      t("clearTransactionsTitle"),
      t("clearTransactionsMessage"),
      async () => {
        try {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("user_id", session.user.id);
          if (error) throw error;
          setTransactions([]);
          addToast(t("clearTransactionsSuccess"), "success");
        } catch (err) {
          console.error("Error clearing transactions:", err);
          addToast(t("errorSaving"), "error");
        }
      },
    );
  };

  const _handleAddSavingsGoal = async (
    goalData: Omit<SavingsGoal, "id" | "currentAmount" | "createdAt">,
  ) => {
    if (!session || !config) return;
    try {
      const newGoal: SavingsGoal = {
        ...goalData,
        id: crypto.randomUUID(),
        currentAmount: 0,
        createdAt: Date.now(),
      };

      const updatedGoals = [...(config.savingsGoals || []), newGoal];
      const redistributedGoals = dataService.distributeSavingsPot(
        config.savingsPot || 0,
        updatedGoals,
      );
      const newConfig = { ...config, savingsGoals: redistributedGoals };

      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
      addToast(t("settingsSaved"), "success");
    } catch (_error) {
      addToast(t("errorSaving"), "error");
    }
  };

  const _handleUpdateSavingsGoal = async (
    id: string,
    goalData: Partial<SavingsGoal>,
  ) => {
    if (!session || !config) return;
    try {
      const updatedGoals = (config.savingsGoals || []).map((g) =>
        g.id === id ? { ...g, ...goalData } : g,
      );

      const redistributedGoals = dataService.distributeSavingsPot(
        config.savingsPot || 0,
        updatedGoals,
      );
      const newConfig = { ...config, savingsGoals: redistributedGoals };

      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
      addToast(t("settingsSaved"), "success");
    } catch (_error) {
      addToast(t("errorSaving"), "error");
    }
  };

  const _handleDeleteSavingsGoal = async (id: string) => {
    if (!session || !config) return;
    try {
      const updatedGoals = (config.savingsGoals || []).filter(
        (g) => g.id !== id,
      );
      const redistributedGoals = dataService.distributeSavingsPot(
        config.savingsPot || 0,
        updatedGoals,
      );
      const newConfig = { ...config, savingsGoals: redistributedGoals };

      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
      addToast(t("settingsSaved"), "success");
    } catch (_error) {
      addToast(t("errorSaving"), "error");
    }
  };

  const _handleReorderSavingsGoal = async (id: string, direction: 'up' | 'down') => {
    if (!session || !config) return;
    try {
      const activeGoals = (config.savingsGoals || []).filter(g => !g.isCompleted);
      const completedGoals = (config.savingsGoals || []).filter(g => g.isCompleted);
      
      const index = activeGoals.findIndex(g => g.id === id);
      if (index === -1) return;
      
      const newActiveGoals = [...activeGoals];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex < 0 || targetIndex >= newActiveGoals.length) return;
      
      // Swap
      const temp = newActiveGoals[index];
      newActiveGoals[index] = newActiveGoals[targetIndex];
      newActiveGoals[targetIndex] = temp;
      
      // Re-distribute pot based on new order
      const redistributedGoals = dataService.distributeSavingsPot(
        config.savingsPot || 0,
        [...newActiveGoals, ...completedGoals]
      );
      
      const newConfig = { ...config, savingsGoals: redistributedGoals };
      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
    } catch (_error) {
      console.error('Reorder error:', error);
      addToast(t("errorSaving"), "error");
    }
  };

  const _handleCompleteSavingsGoal = async (id: string) => {
    if (!session || !config) return;
    try {
      const goal = (config.savingsGoals || []).find((g) => g.id === id);
      if (!goal) return;

      // Mark as completed
      const updatedGoals = (config.savingsGoals || []).map((g) =>
        g.id === id
          ? {
              ...g,
              isCompleted: true,
              completedAt: Date.now(),
              currentAmount: g.targetAmount,
            }
          : g,
      );

      // Subtract target amount from savings pot
      const newSavingsPot = Math.max(
        0,
        (config.savingsPot || 0) - goal.targetAmount,
      );

      // Redistribute remaining pot to other active goals
      const redistributedGoals = dataService.distributeSavingsPot(
        newSavingsPot,
        updatedGoals,
      );

      const newConfig = {
        ...config,
        savingsPot: newSavingsPot,
        savingsGoals: redistributedGoals,
      };

      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
      feedback.celebrate();
      addToast(t("goalCompleted"), "success");
    } catch (_error) {
      addToast(t("errorSaving"), "error");
    }
  };



  const _isAdmin =
    profile?.role === "admin" || session?.user?.email === "kevinwpts@gmail.com";

  const _handleResetTotalSaved = async () => {
    if (!session || !config) return;

    showConfirm(
      "Nollställ totalt sparat",
      "Är du säker på att du vill nollställa totalt sparat sedan start?",
      async () => {
        try {
          const updatedConfig = { ...config, totalSavedLifetime: 0 };
          await dataService.saveSettings(session.user.id, updatedConfig);
          setConfig(updatedConfig);
          addToast("Totalt sparat har nollställts", "success");
        } catch (err) {
          console.error("Error resetting total saved:", err);
          addToast(t("errorSaving"), "error");
        }
      },
    );
  };

  useEffect(() => {
    if (hasPin()) {
      setIsLocked(true);
    }
  }, []);

  useEffect(() => {
    if (subscriptionStatus !== null && !isPro(subscriptionStatus, trialEnd)) {
      setIsLocked(false);
    }
  }, [subscriptionStatus, trialEnd]);

  // Update manifest and favicon when theme changes
  useEffect(() => {
    if (!config) return;

    const theme = config.appIconTheme || "accent";

    // Update manifest
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
      manifestLink.setAttribute("href", `/manifest.json?theme=${theme}`);
    }

    // Update favicon and apple-touch-icon
    const iconUrl = `/api/icon.svg?theme=${theme}`;
    const iconLink = document.querySelector('link[rel="icon"]');
    if (iconLink) {
      iconLink.setAttribute("href", iconUrl);
    }

    const appleIconLink = document.querySelector(
      'link[rel="apple-touch-icon"]',
    );
    if (appleIconLink) {
      appleIconLink.setAttribute("href", iconUrl);
    }
  }, [config?.appIconTheme]);

  const handleFeedbackSubmit = async (message: string) => {
    if (!session) return;

    // Construct mailto link
    const subject = encodeURIComponent(`Feedback from ${session.user.email}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

    // Also try to save to DB if table exists (optional, silent fail)
    try {
      await dataService.saveFeedback(session.user.id, message);
    } catch (_error) {
      // Ignore DB error if table doesn't exist, since we opened email client
      console.warn("Could not save feedback to database:", error);
    }

    addToast(t("feedbackSent"), "success");
  };

  /*
  const handleDeleteSavingsPotTransaction = async (id: string) => {
    if (!session) return;
    try {
      await dataService.deleteSavingsPotTransaction(id);
      addToast(t('savingsPotTransactionDeleted'), 'success');
      // Also need to update savingsPot in config
      if (config) {
        // ...
      }
    } catch (_error) {
      addToast(t('error'), 'error');
    }
  };
  */

  const handleConfirmDeleteAccount = async (password?: string) => {
    if (!session) return;

    try {
      // Verify password by signing in (only for email users)
      if (password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: session.user.email!,
          password: password,
        });

        if (signInError) {
          throw new Error(t("wrongPassword"));
        }
      }

      // Try to revoke Google OAuth token if available
      if (providerToken && session.user.app_metadata.provider === "google") {
        try {
          await fetch(
            `https://accounts.google.com/o/oauth2/revoke?token=${providerToken}`,
            {
              method: "POST",
              mode: "no-cors", // Google's revoke endpoint doesn't support CORS but still works with no-cors
            },
          );
        } catch (_e) {
          console.warn("Could not revoke Google token automatically:", e);
        }
      }

      // Call server-side endpoint to delete account completely
      const response = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Kunde inte radera kontot");
      }

      // 2. Sign out (local cleanup)
      await supabase.auth.signOut();

      addToast(t("accountDeleted"), "success");
      setSession(null);
      setIsDeleteAccountModalOpen(false);
    } catch (err) {
      console.error("Error deleting account:", err);
      // Re-throw to be caught by the modal
      throw err;
    }
  };

  const handleExportData = async () => {
    if (!session) return;

    try {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", session.user.id);
      const { data: fixedExpenses } = await supabase
        .from("fixed_expenses")
        .select("*")
        .eq("user_id", session.user.id);
      const { data: incomeSources } = await supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", session.user.id);
      const { data: savingsGoals } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", session.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      const exportData = {
        transactions,
        fixedExpenses,
        incomeSources,
        savingsGoals,
        profile,
        exportDate: new Date().toISOString(),
        version: "1.0",
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `budget-app-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast("Data exporterad!", "success");
    } catch (_error) {
      console.error("Error exporting data:", _error);
      addToast("Kunde inte exportera data", "error");
    }
  };

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isOnboarding, setIsOnboarding] = useState(false);

  const [initialIsRegistering, setInitialIsRegistering] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const addToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: "danger" | "info" = "danger",
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
      variant,
    });
  };

  // --- Theme Logic ---
  useEffect(() => {
    const shouldUseDarkMode = config?.darkMode !== undefined ? config.darkMode : false;

    if (shouldUseDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.body.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.body.classList.add("light");
    }

    // Update theme-color meta tag for iOS Safari status bar and browser toolbar
    const themeColor = shouldUseDarkMode ? "#16181C" : "#FBFBFA";
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length > 0) {
      metaTags.forEach((tag) => tag.setAttribute("content", themeColor));
    } else {
      const meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      meta.setAttribute("content", themeColor);
      document.head.appendChild(meta);
    }
  }, [config?.darkMode, subscriptionStatus, config, session?.user?.email]);

  // --- Auth Logic ---
  useEffect(() => {
    const demoSessionStr = localStorage.getItem('dejz_demo_session');
    if (demoSessionStr) {
      try {
        const demoSession = JSON.parse(demoSessionStr);
        const demoVersion = localStorage.getItem('demo_data_version');
        if (demoVersion !== 'v5_realistic_light' && demoVersion !== 'v_fresh_test_account') {
          seedDemoData();
        }
        setSession(demoSession);
        setIsAuthLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing demo session:", e);
      }
    }

    if (!isSupabaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      // If we have a demo session, don't let Supabase override it unless demo session was cleared
      if (localStorage.getItem('dejz_demo_session')) return;
      
      setSession(session);
      if (session?.provider_token) {
        setProviderToken(session.provider_token);
      }
      if (
        session?.user?.user_metadata?.avatar_url ||
        session?.user?.user_metadata?.picture
      ) {
        setAvatarUrl(
          session.user.user_metadata.avatar_url ||
            session.user.user_metadata.picture,
        );
      }
    }).catch(err => {
      console.error("Error securing session:", err);
    }).finally(() => {
      if (!localStorage.getItem('dejz_demo_session')) {
        setIsAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (localStorage.getItem('dejz_demo_session')) return;
      
      setSession(session);
      setIsAuthLoading(false);
      if (session?.provider_token) {
        setProviderToken(session.provider_token);
      }
      if (
        session?.user?.user_metadata?.avatar_url ||
        session?.user?.user_metadata?.picture
      ) {
        setAvatarUrl(
          session.user.user_metadata.avatar_url ||
            session.user.user_metadata.picture,
        );
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    setIsDemoMode(checkDemoMode());
  }, [session]);

  const handleLogout = async () => {
    clearDemoData();
    setIsDemoMode(false);
    setSession(null);
    setShowLanding(true);
    setShowWelcome(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (isSupabaseConfigured) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

  const handleExitDemo = () => {
    clearDemoData();
    setIsDemoMode(false);
    setSession(null);
    setShowLanding(true);
    setShowWelcome(false);
    window.location.reload(); // Reload to clear all states and re-initialize
  };

  const handleGoogleLogin = async () => {
    try {
      let inIframe = false;
      try {
        inIframe = window.self !== window.top;
      } catch (_e) {
        inIframe = true;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: inIframe,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });
      if (error) throw error;
      
      if (inIframe && data?.url) {
        const popup = window.open(data.url, '_blank');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          addToast("Inloggningsfönstret blockerades. Tillåt popup-fönster i din webbläsare eller öppna appen i en ny flik.", "error");
        } else {
          addToast("Öppnade inloggning i ett nytt fönster.", "success");
        }
      }
    } catch (err: any) {
      let msg = err.message || t('error');
      if (msg.includes('provider is not enabled') || msg.includes('Unsupported provider')) {
        msg = "Google-inloggning är inte aktiverad i din Supabase-instrumentpanel ännu.";
      }
      addToast(msg, "error");
    }
  };

  const handleUploadAvatar = async (file: File) => {
    if (!session?.user) return;

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Update User Metadata
      const {
        data: { user },
        error: updateError,
      } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) {
        throw updateError;
      }

      if (user) {
        setSession((prev) => (prev ? { ...prev, user } : null));
      }
      setAvatarUrl(publicUrl);
      addToast("Bild uppdaterad!", "success");
    } catch (_error) {
      console.error("Error uploading avatar:", error.message);
      addToast(`Kunde inte ladda upp bild: ${error.message}`, "error");
    }
  };

  // Removed the useEffect that prevented scrolling on welcome/auth screens

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!session) return;

    const defaultConfig: Config = {
      currency: "kr",
      language: "sv",
      payday: 25,
      paydayType: PaydayType.TWENTY_FIFTH,
      paydayBeforeWeekend: true,
      categories: DEFAULT_EXPENSE_CATEGORIES,
      incomeCategories: DEFAULT_INCOME_CATEGORIES,
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      initialSpent: 0,
      notifications: { salaryDayReminder: true, weeklySummary: true },
      securityLock: false,
      darkMode: false,
      quickChoices: [],
      savingsPot: 0,
      savingsGoals: [],
      totalSavedLifetime: 0,
      surplusIncome: 0,
      monthlySavings: 0,
      monthlySavingsItems: [],
      includeFixedExpensesInAnalysis: true,
      showFixedExpensesInTodayView: true,
      showFixedExpensesInCalendar: false,
    };

    try {
      // Check for payment success
      const urlParams = new URLSearchParams(window.location.search);
      const paymentSuccess = urlParams.get("payment_success") === "true";
      const redirectStatus = urlParams.get("redirect_status");

      if (
        paymentSuccess ||
        redirectStatus === "succeeded" ||
        redirectStatus === "processing"
      ) {
        try {
          console.log(
            "[Payment] Verifying payment for user:",
            session.user.id,
          );
          const result = await verifyPayment(session.user.id);
          if (result.success) {
            setSubscriptionStatus(result.status);
            addToast("Betalning genomförd! Du är nu Pro.", "success");
          } else {
            console.warn("[Payment] Verification returned success=false");
            addToast(
              "Kunde inte verifiera betalningen automatiskt. Prova att uppdatera sidan om en stund.",
              "info",
            );
          }
        } catch (_e) {
          console.error("[Payment] Failed to verify payment:", _e);
          // Show a more helpful message
          const errorMsg = _e.message?.includes("string did not match")
            ? "Verifieringen misslyckades pga ett tekniskt fel i webbläsaren. Prova att ladda om sidan eller rensa cache."
            : `Verifiering misslyckades: ${_e.message}`;
          addToast(errorMsg, "error");
        } finally {
          // Clean up URL safely
          try {
            const cleanUrl =
              window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          } catch (historyError) {
            console.warn("[Payment] Failed to clean up URL:", historyError);
          }
        }
      }

      // Fetch everything in ONE optimized batch parallel call to minimize latencies!
      const [dbProfileResult, dbTransactions, dbIncomes, dbFixed] =
        await Promise.all([
          dataService.getProfile(session.user.id),
          dataService.getTransactions(session.user.id),
          dataService.getIncomeSources(session.user.id),
          dataService.getFixedExpenses(session.user.id),
        ]);

      let dbProfile = dbProfileResult;

      // If profile is missing (e.g. after a database reset), create it
      if (!dbProfile || Object.keys(dbProfile).length === 0) {
        console.log(
          "[Auth] Profile missing, creating/repairing profile for:",
          session.user.id,
        );

        // Prepare profile data carefully - only use snake_case columns that exist in DB
        const profilePayload = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || "",
          avatar_url: session.user.user_metadata?.avatar_url || "",
          role:
            session.user.email === "kevinwpts@gmail.com" ? "admin" : "user",
          currency: defaultConfig.currency,
          language: defaultConfig.language,
          payday: defaultConfig.payday,
          payday_type: defaultConfig.paydayType,
          payday_before_weekend: defaultConfig.paydayBeforeWeekend,
          categories: defaultConfig.categories,
          income_categories: defaultConfig.incomeCategories,
          initial_spent: defaultConfig.initialSpent,
          notifications: defaultConfig.notifications,
          security_lock: defaultConfig.securityLock,
          dark_mode: defaultConfig.darkMode,
          quick_choices: defaultConfig.quickChoices,
          monthly_savings: defaultConfig.monthlySavings,
          include_fixed_expenses_in_analysis:
            defaultConfig.includeFixedExpensesInAnalysis,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("profiles")
          .upsert(profilePayload)
          .select()
          .single();
        if (!error) {
          dbProfile = data;
          console.log("[Auth] Profile repaired successfully");
        } else {
          console.error("[Auth] Failed to repair profile:", error);
          addToast(
            `Kunde inte återställa din profil: ${error.message}`,
            "error",
          );
        }
      }

      if (dbProfile && Object.keys(dbProfile).length > 0) {
        setProfile(dbProfile);
        // Only set status if it's not already set by verifyPayment (which is more up-to-date)
        setSubscriptionStatus((prev) => {
          if (isPro(prev)) return prev;
          return dbProfile.subscription_status || "free";
        });
        setTrialEnd(dbProfile.trial_end);
        setNextBillingDate(dbProfile.next_billing_date);

        // Check if onboarding is needed (missing name)
        // We check both profile table and auth metadata
        const hasName =
          dbProfile.full_name || session.user.user_metadata?.full_name;
        if (!hasName) {
          setIsOnboarding(true);
        }
      } else {
        console.warn(
          "DEBUG: No profile data found for user",
          session.user.id,
        );
        setSubscriptionStatus("free");
      }

      // Parse/map settings locally from dbProfile to prevent redundant DB query level
      if (dbProfile && Object.keys(dbProfile).length > 0) {
        const mappedConfig = {
          currency: dbProfile.currency === "SEK" ? "kr" : dbProfile.currency,
          language: dbProfile.language,
          payday: dbProfile.payday,
          paydayType: dbProfile.payday_type || PaydayType.TWENTY_FIFTH,
          paydayBeforeWeekend: dbProfile.payday_before_weekend,
          categories: (dbProfile.categories && dbProfile.categories.length > 0)
            ? dbProfile.categories
            : DEFAULT_EXPENSE_CATEGORIES,
          incomeCategories: (dbProfile.income_categories && dbProfile.income_categories.length > 0)
            ? dbProfile.income_categories
            : DEFAULT_INCOME_CATEGORIES,
          initialSpent: Number(dbProfile.initial_spent || 0),
          notifications: dbProfile.notifications,
          securityLock: dbProfile.security_lock,
          darkMode: (dbProfile.dark_mode !== undefined && dbProfile.dark_mode !== null) ? dbProfile.dark_mode : false,
          quickChoices: dbProfile.quick_choices || [],
          savingsPot: dbProfile.savings_pot || 0,
          paymentMethods: dbProfile.payment_methods || [
            "Autogiro",
            "Faktura",
            "Kortbetalning",
            "Swish",
            "Övrigt",
          ],
          surplusIncome: dbProfile.surplus_income || 0,
          monthlySavings: dbProfile.monthly_savings || 0,
          monthlySavingsItems: dbProfile.monthly_savings_items || [],
          savingsGoals: dbProfile.savings_goals || [],
          totalSavedLifetime: dbProfile.total_saved_lifetime || 0,
          includeFixedExpensesInAnalysis:
            dbProfile.include_fixed_expenses_in_analysis !== undefined
              ? dbProfile.include_fixed_expenses_in_analysis
              : true,
          showFixedExpensesInTodayView:
            dbProfile.show_fixed_expenses_in_today_view !== undefined
              ? dbProfile.show_fixed_expenses_in_today_view
              : true,
          showFixedExpensesInCalendar:
            dbProfile.show_fixed_expenses_in_calendar !== undefined
              ? dbProfile.show_fixed_expenses_in_calendar
              : false,
          appIconTheme: dbProfile.app_icon_theme,
        };
        setConfig(mappedConfig);
      } else {
        const newConfig = {
          ...defaultConfig,
          darkMode: false,
        };
        setConfig(newConfig);
        // Save default settings for new user
        await dataService.saveSettings(session.user.id, newConfig);
      }

      setTransactions(dbTransactions || []);
      setIncomes(dbIncomes || []);
      setFixedExpenses(dbFixed || []);
    } catch (_error) {
      console.error("Failed to fetch initial data:", _error);
      setConfig((prev) => prev || defaultConfig);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Remove the old debounced sync effect as we'll save individually now

  // --- Calculations ---

  const paydaySetting = config?.payday || 25;
  const paydayType = config?.paydayType || PaydayType.TWENTY_FIFTH;
  const adjustment = config?.paydayBeforeWeekend
    ? WeekendAdjustment.BEFORE
    : WeekendAdjustment.NONE;

  const { start: currentPeriodStart, end: currentPeriodEnd } = useMemo(
    () =>
      getPeriodBoundaries(
        currentPeriodDate,
        paydayType,
        paydaySetting,
        adjustment,
      ),
    [currentPeriodDate, paydayType, paydaySetting, adjustment],
  );

  const currentPeriodId = useMemo(
    () => getPeriodId(currentPeriodStart),
    [currentPeriodStart],
  );

  const actualToday = useMemo(() => new Date(), []);
  const { start: actualPeriodStart, end: actualPeriodEnd } = useMemo(
    () =>
      getPeriodBoundaries(actualToday, paydayType, paydaySetting, adjustment),
    [actualToday, paydayType, paydaySetting, adjustment],
  );

  const isCurrentPeriod =
    currentPeriodStart.getTime() === actualPeriodStart.getTime() &&
    currentPeriodEnd.getTime() === actualPeriodEnd.getTime();

  const periods = useMemo(() => {
    const p = [];
    const now = new Date();
    const actualToday = new Date();
    for (let i = -24; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const { start, end } = getPeriodBoundaries(
        d,
        paydayType,
        paydaySetting,
        adjustment,
      );
      p.push({
        date: new Date(d.getFullYear(), d.getMonth(), 1),
        start,
        end,
        name: getPeriodName(
          start,
          end,
          paydayType,
          config?.language || "sv-SE",
        ),
        isCurrent: actualToday >= start && actualToday <= end,
        isFuture: actualToday < start,
      });
    }
    console.log("Periods:", p);
    return p;
  }, [paydayType, paydaySetting, adjustment, config?.language]);

  const calculateStats = useCallback(
    (targetDate: Date) => {
      if (!config) return null;

      try {
        const actualToday = new Date();
        actualToday.setHours(0, 0, 0, 0);
        const actualTodayMs = actualToday.getTime();

        const referenceDate = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
        );
        referenceDate.setHours(0, 0, 0, 0);

        const paydaySetting = config.payday || 25;
        const paydayType = config.paydayType || PaydayType.TWENTY_FIFTH;
        const adjustment = config.paydayBeforeWeekend
          ? WeekendAdjustment.BEFORE
          : WeekendAdjustment.NONE;

        const { start: periodStart, end: periodEnd } = getPeriodBoundaries(
          referenceDate,
          paydayType,
          paydaySetting,
          adjustment,
        );
        const isFuturePeriod = periodStart > actualToday;
        const isPastPeriod = periodEnd < actualToday;
        const periodName = getPeriodName(
          periodStart,
          periodEnd,
          paydayType,
          config.language,
        );
        const periodId = getPeriodId(periodStart);

        const getAmountForPeriod = (item: any) => {
          if (
            item.isVariable &&
            item.periodOverrides &&
            item.periodOverrides[periodId] !== undefined
          ) {
            return item.periodOverrides[periodId];
          }
          return Number(item.amount) || 0;
        };

        // 1. Calculate Total Disposable Pot for the Period
        const totalIncome = incomes.reduce(
          (sum, i) => {
            const amount = getAmountForPeriod(i);
            const isDue = isVariableItemDue(
              i.deductionDay || 1,
              periodStart,
              periodEnd,
              referenceDate
            );
            return isDue ? sum + amount : sum;
          },
          0,
        );
        const totalFixed = fixedExpenses.reduce((sum, e) => {
          const amount = getAmountForPeriod(e);
          switch (e.frequency) {
            case Frequency.QUARTERLY:
              return sum + amount / 3;
            case Frequency.SEMI_ANNUALLY:
              return sum + amount / 6;
            case Frequency.ANNUALLY:
              return sum + amount / 12;
            default:
              return sum + amount;
          }
        }, 0);
        const totalMonthlySavings =
          (config.monthlySavingsItems?.reduce(
            (sum, item) => sum + getAmountForPeriod(item),
            0,
          ) || 0) + (Number(config.monthlySavings) || 0);
        const disposablePot = totalIncome - totalFixed - totalMonthlySavings;

        // --- FINAL MODEL: BASE + CARRY SYSTEM ---

        const periodStartMs = periodStart.getTime();
        const _periodEndMs = periodEnd.getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        // Fix totalDays calculation by using midnight-to-midnight difference
        const startMidnight = new Date(
          periodStart.getFullYear(),
          periodStart.getMonth(),
          periodStart.getDate(),
        ).getTime();
        const endMidnight = new Date(
          periodEnd.getFullYear(),
          periodEnd.getMonth(),
          periodEnd.getDate(),
        ).getTime();
        let totalDays = Math.round((endMidnight - startMidnight) / oneDay) + 1;

        // Ensure totalDays is at least 1 to prevent division by zero
        if (totalDays <= 0) {
          console.error(
            "ERROR: totalDays is zero or negative, defaulting to 1.",
          );
          totalDays = 1; // Default to 1 to prevent division by zero, but this indicates a date calculation bug
        }

        // 1. Identify Transactions
        const periodEndBoundaryMs =
          new Date(
            periodEnd.getFullYear(),
            periodEnd.getMonth(),
            periodEnd.getDate() + 1,
          ).getTime() - 1;
        const pTransactions = transactions.filter(
          (e) =>
            e.timestamp >= periodStartMs && e.timestamp <= periodEndBoundaryMs,
        );
        const extraIncomes = pTransactions.filter(
          (e) => e.type === "income" && e.category !== "Överskott",
        );
        const distributedSurplusIncomes = pTransactions.filter(
          (e) => e.type === "income",
        );

        const spendingTransactions = pTransactions.filter(
          (e) => e.type !== "income",
        );

        // 2. Sort Day Indices
        let todayIndex = -1;
        const actualTodayDate = new Date(actualTodayMs);
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(
            periodStart.getFullYear(),
            periodStart.getMonth(),
            periodStart.getDate() + i,
          );
          if (
            d.getFullYear() === actualTodayDate.getFullYear() &&
            d.getMonth() === actualTodayDate.getMonth() &&
            d.getDate() === actualTodayDate.getDate()
          ) {
            todayIndex = i;
            break;
          }
        }
        if (todayIndex === -1) {
          if (actualTodayMs < periodStartMs) todayIndex = -1;
          else todayIndex = totalDays;
        }

        // Helper to find which day index [0 .. totalDays-1] a timestamp falls on
        const getDayIndex = (timestamp: number) => {
          for (let i = 0; i < totalDays; i++) {
            const start = new Date(
              periodStart.getFullYear(),
              periodStart.getMonth(),
              periodStart.getDate() + i,
            ).getTime();
            const end = new Date(
              periodStart.getFullYear(),
              periodStart.getMonth(),
              periodStart.getDate() + i + 1,
            ).getTime();
            if (timestamp >= start && timestamp < end) {
              return i;
            }
          }
          if (timestamp < periodStartMs) return -1;
          return totalDays;
        };

        // Separate incomes received up to today from future scheduled incomes
        const extraIncomesUpToToday = extraIncomes.filter(
          (e) => getDayIndex(e.timestamp) <= todayIndex,
        );
        const futureExtraIncomes = extraIncomes.filter(
          (e) => getDayIndex(e.timestamp) > todayIndex,
        );

        // Calculate surplus additions
        const surplusAdditions = new Array(totalDays).fill(0);
        for (const surplus of distributedSurplusIncomes) {
          const surplusDayIndex = getDayIndex(surplus.timestamp);
          if (surplusDayIndex >= 0 && surplusDayIndex < totalDays) {
            const remainingDaysForSurplus = totalDays - surplusDayIndex;
            const dailyAddition = surplus.amount / remainingDaysForSurplus;
            for (let j = surplusDayIndex; j < totalDays; j++) {
              surplusAdditions[j] += dailyAddition;
            }
          }
        }

        // 3. Calculate Day Data
        const dayInfos = [];
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(
            periodStart.getFullYear(),
            periodStart.getMonth(),
            periodStart.getDate() + i,
          );
          const start = d.getTime();
          const end = new Date(
            periodStart.getFullYear(),
            periodStart.getMonth(),
            periodStart.getDate() + i + 1,
          ).getTime();

          const dayExps = spendingTransactions.filter(
            (e) => e.timestamp >= start && e.timestamp < end,
          );
          const dayIncs = extraIncomes.filter(
            (e) => e.timestamp >= start && e.timestamp < end,
          );
          const daySurplusIncs = distributedSurplusIncomes.filter(
            (e) => e.timestamp >= start && e.timestamp < end,
          );

          const dayNum = d.getDate();
          const hasFixedItems = 
            fixedExpenses.some((e) => e.deductionDay === dayNum) ||
            incomes.some((i) => i.deductionDay === dayNum) ||
            (config.monthlySavingsItems || []).some((s) => s.deductionDay === dayNum);

          dayInfos.push({
            date: d,
            hasFixedItems,
            spend: Math.round(
              dayExps
                .filter((e) => e.category !== "Spargris")
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
            ),
            spendForCarry: Math.round(
              dayExps
                .filter((e) => !e.isBackdated && e.category !== "Spargris")
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
            ),
            income: Math.round(
              dayIncs.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
            ),
            surplusIncome: Math.round(
              daySurplusIncs.reduce(
                (sum, e) => sum + (Number(e.amount) || 0),
                0,
              ),
            ),
            transactions: [...dayExps, ...daySurplusIncs].sort(
              (a, b) => b.timestamp - a.timestamp,
            ),
          });
        }

        // 5. Calculate Period Budget & Fixed Daily Base Budget
        // All values in integer cents
        const periodBudgetCents = Math.round(disposablePot);
        const baseDailyBudgetCents = Math.floor(periodBudgetCents / totalDays);

        // 6. Core Budget: The ONLY financial truth
        // remainingPeriodCents = periodBudgetCents - sum(transactions) + sum(incomes up to today)
        // Future incomes are NOT added to remainingPeriodCents yet because the user hasn't received them.
        const totalSavedInPot = Math.round(
          pTransactions
            .filter((e) => e.category === "Spargris")
            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        );

        const totalSpentInPeriod = Math.round(
          spendingTransactions
            .filter((e) => e.category !== "Spargris")
            .reduce(
              (sum, e) => sum + (Number(e.amount) || 0),
              0,
            ),
        );

        const totalExtraIncomeInPeriod = Math.round(
          extraIncomes.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        );
        const totalExtraIncomeUpToToday = Math.round(
          extraIncomesUpToToday.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        );
        const totalFutureExtraIncome = Math.round(
          futureExtraIncomes.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        );
        const totalDistributedSurplusInPeriod = Math.round(
          distributedSurplusIncomes.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        );

        const remainingPeriodCents =
          periodBudgetCents - (totalSpentInPeriod + totalSavedInPot) + totalExtraIncomeUpToToday;

        // 7. Daily Recommended Spend (for Today)
        const daysElapsed = Math.max(0, todayIndex);
        const remainingDaysIncludingToday = Math.max(
          1,
          totalDays - daysElapsed,
        );

        // To ensure today's spending doesn't redistribute today's budget:
        // We calculate the state at the START of today.
        const spentTodayCents =
          todayIndex >= 0 && todayIndex < totalDays
            ? dayInfos[todayIndex].spend
            : 0;

        // 2. Calculate the pot for distribution
        const potForDistribution =
          remainingPeriodCents + spentTodayCents;

        // 3. DYNAMIC daily budget: Spread the remaining pot over remaining days.
        const dynamicBaseBudgetCents = Math.max(
          0,
          Math.floor(potForDistribution / remainingDaysIncludingToday),
        );

        // 4. Current available today is the dynamic budget minus today's spending.
        const availableTodayCents = dynamicBaseBudgetCents - spentTodayCents;

        // 5. Future days get the dynamic budget, but if today is negative, we redistribute the deficit immediately.
        let availableFutureBaseCents = dynamicBaseBudgetCents;
        if (availableTodayCents < 0 && remainingDaysIncludingToday > 1) {
          // If we overspent today, the future days must absorb the hit.
          const remainingPotAfterToday =
            remainingPeriodCents;
          availableFutureBaseCents = Math.max(
            0,
            Math.floor(
              remainingPotAfterToday / (remainingDaysIncludingToday - 1),
            ),
          );
        }

        // Calculate future income additions per day (each future income is spread across days starting from its scheduled date)
        const futureIncomeAdditions = new Array(totalDays).fill(0);
        for (const inc of futureExtraIncomes) {
          const incDayIdx = getDayIndex(inc.timestamp);
          if (incDayIdx >= 0 && incDayIdx < totalDays) {
            const remDays = totalDays - incDayIdx;
            const dailyAddition = (Number(inc.amount) || 0) / remDays;
            for (let j = incDayIdx; j < totalDays; j++) {
              futureIncomeAdditions[j] += dailyAddition;
            }
          }
        }

        // 7. Calendar Data & Status
        // To keep past days stable, we calculate a "stable" recommendation for each day
        // that only considers transactions up to that day.
        const days = dayInfos.map((d, i) => {
          const isToday = i === todayIndex;
          const isPast = i < todayIndex;
          const isFuture = i > todayIndex;

          // baseDailyBudgetCents is fixed, but we add any distributed surplus
          const dayBase = baseDailyBudgetCents + surplusAdditions[i];

          // For past days, we want to show the result AFTER the day's transactions
          // relative to the fixed daily budget of that time.
          // For today, we show availableTodayCents (does NOT include future unreceived incomes).
          // For future days, we show availableFutureBaseCents plus any future income scheduled on/before that day.
          const availableForD =
            isPast
              ? dayBase - d.spend + d.income
              : isToday
                ? availableTodayCents
                : Math.round(availableFutureBaseCents + futureIncomeAdditions[i]);

          let status: "green" | "warning" | "red" | "neutral" = "neutral";
          if (isPast) {
            if (d.spend > dayBase) {
              status = "red";
            } else {
              status = "green";
            }
          }

          return {
            date: d.date,
            isToday,
            isPast,
            isFuture,
            dayBase,
            daySpent: d.spend,
            dayIncome: d.income,
            status,
            availableForD,
            hasTransactions: (d.transactions?.length || 0) > 0,
            hasFixedItems: !!d.hasFixedItems,
            hasFutureTransactions:
              isFuture && (d.transactions?.length || 0) > 0,
            transactions: d.transactions,
          };
        });

        return {
          periodStart,
          periodEnd,
          periodName,
          isFuturePeriod,
          isPastPeriod,
          disposablePot: periodBudgetCents,
          totalIncome,
          totalFixed,
          totalSavings: (config.monthlySavingsItems || []).reduce(
            (sum: number, s: any) => sum + (Number(s.amount) || 0),
            0,
          ),
          totalDaysInPeriod: totalDays,
          daysElapsed,
          remainingDays: remainingDaysIncludingToday,
          totalSpentInPeriod,
          totalExtraIncomeInPeriod,
          totalExtraIncomeUpToToday,
          totalFutureExtraIncome,
          totalDistributedSurplusInPeriod,
          totalSavedInPot,
          remainingPeriodCents,
          availableTodayCents,
          availableFutureCents: availableFutureBaseCents,
          baseDailyBudgetCents,
          periodTransactions: pTransactions.sort(
            (a, b) => b.timestamp - a.timestamp,
          ),
          days,
          periodId,
        };
      } catch (_error) {
        console.error("Error calculating stats:", error);
        return null;
      }
    },
    [config, incomes, fixedExpenses, transactions],
  );

  const stats = useMemo(
    () => calculateStats(currentPeriodDate),
    [calculateStats, currentPeriodDate],
  );

  



  // --- Derived State for UI ---
  const _calendarDays = useMemo(() => {
    return stats?.days || [];
  }, [stats]);

  const attentionItems = useMemo(() => {
    if (!config || !stats) return [];
    const items: any[] = [];
    const currentPeriodId = stats.periodId;

    incomes.forEach((i) => {
      if (
        i.isVariable &&
        (!i.periodOverrides || i.periodOverrides[currentPeriodId] === undefined)
      ) {
        items.push({ ...i, budgetType: "income" });
      }
    });

    fixedExpenses.forEach((e) => {
      if (
        e.isVariable &&
        (!e.periodOverrides || e.periodOverrides[currentPeriodId] === undefined)
      ) {
        items.push({ ...e, budgetType: "expense" });
      }
    });

    config.monthlySavingsItems?.forEach((s) => {
      if (
        s.isVariable &&
        (!s.periodOverrides || s.periodOverrides[currentPeriodId] === undefined)
      ) {
        items.push({ ...s, budgetType: "savings" });
      }
    });

    return items;
  }, [config, incomes, fixedExpenses, stats?.periodId]);

  const notifications = useMemo<AppNotification[]>(() => {
    if (!config || !stats) return [];
    const notifs: AppNotification[] = [];
    const currentPeriodId = stats.periodId;
    const { periodStart, periodEnd } = stats;

    // 1. Variable fixed expenses
    fixedExpenses.forEach((e) => {
      if (
        e.isVariable &&
        (!e.periodOverrides || e.periodOverrides[currentPeriodId] === undefined)
      ) {
        const isDue = isVariableItemDue(
          e.deductionDay || 1,
          periodStart,
          periodEnd,
          new Date(),
        );
        const notifId = `expense_${e.id}_${currentPeriodId}`;
        if (isDue && !dismissedNotificationIds.includes(notifId)) {
          const expenseName = e.name || "utgift";
          const lower = expenseName.toLowerCase();
          const endsWithSuffix =
            lower.endsWith("räkning") || lower.endsWith("faktura");
          const title = endsWithSuffix
            ? `Hej, vad blev din ${expenseName} denna månaden?`
            : `Hej, vad blev din ${expenseName}-räkning denna månaden?`;

          notifs.push({
            id: notifId,
            type: "variable_expense",
            item: { ...e, budgetType: "expense" },
            title,
            subtitle: `Dras den ${e.deductionDay || 1}:e`,
            deductionDay: e.deductionDay || 1,
            expectedAmount: Number(e.amount) || 0,
          });
        }
      }
    });

    // 2. Variable incomes
    incomes.forEach((i) => {
      if (
        i.isVariable &&
        (!i.periodOverrides || i.periodOverrides[currentPeriodId] === undefined)
      ) {
        const isDue = isVariableItemDue(
          i.deductionDay || 1,
          periodStart,
          periodEnd,
          new Date(),
        );
        const notifId = `income_${i.id}_${currentPeriodId}`;
        if (isDue && !dismissedNotificationIds.includes(notifId)) {
          const incomeName = i.name || "inkomst";
          const title = `Hej, vad blev din ${incomeName} denna månaden?`;

          notifs.push({
            id: notifId,
            type: "variable_income",
            item: { ...i, budgetType: "income" },
            title,
            subtitle: `Kommer den ${i.deductionDay || 1}:e`,
            deductionDay: i.deductionDay || 1,
            expectedAmount: Number(i.amount) || 0,
          });
        }
      }
    });

    // 3. Variable savings items
    config.monthlySavingsItems?.forEach((s) => {
      if (
        s.isVariable &&
        (!s.periodOverrides || s.periodOverrides[currentPeriodId] === undefined)
      ) {
        const isDue = isVariableItemDue(
          s.deductionDay || 1,
          periodStart,
          periodEnd,
          new Date(),
        );
        const notifId = `savings_${s.id}_${currentPeriodId}`;
        if (isDue && !dismissedNotificationIds.includes(notifId)) {
          const savingsName = s.name || "sparande";
          const title = `Hej, vad sparar du till ${savingsName} denna månaden?`;

          notifs.push({
            id: notifId,
            type: "variable_savings",
            item: { ...s, budgetType: "savings" },
            title,
            subtitle: `Dras den ${s.deductionDay || 1}:e`,
            deductionDay: s.deductionDay || 1,
            expectedAmount: Number(s.amount) || 0,
          });
        }
      }
    });

    return notifs;
  }, [config, stats, fixedExpenses, incomes, dismissedNotificationIds]);

  const handleDismissNotification = (notificationId: string) => {
    setDismissedNotificationIds((prev) => {
      const next = [...prev, notificationId];
      try {
        localStorage.setItem(
          "dejz_dismissed_notifications",
          JSON.stringify(next),
        );
      } catch (e) {
        console.warn("Could not save dismissed notifications:", e);
      }
      return next;
    });
  };

  const handleSaveVariableOverride = async (item: any, amount: number) => {
    if (!session || !config || !stats) return;
    const currentPeriodId = stats.periodId;
    const updatedOverrides = {
      ...(item.periodOverrides || {}),
      [currentPeriodId]: amount,
    };

    try {
      if (item.budgetType === "income") {
        const updatedIncome = { ...item, periodOverrides: updatedOverrides };
        await dataService.saveIncomeSource(session.user.id, updatedIncome);
        setIncomes((prev) =>
          prev.map((i) => (i.id === item.id ? updatedIncome : i)),
        );
      } else if (item.budgetType === "savings") {
        const updatedSavingsItem = {
          ...item,
          periodOverrides: updatedOverrides,
        };
        const newItems =
          config.monthlySavingsItems?.map((s) =>
            s.id === item.id ? updatedSavingsItem : s,
          ) || [];
        const newConfig = { ...config, monthlySavingsItems: newItems };
        setConfig(newConfig);
        await dataService.saveSettings(session.user.id, newConfig);
      } else {
        const updatedExpense = { ...item, periodOverrides: updatedOverrides };
        await dataService.saveFixedExpense(session.user.id, updatedExpense);
        setFixedExpenses((prev) =>
          prev.map((e) => (e.id === item.id ? updatedExpense : e)),
        );
      }
      feedback.success();
      addToast(t("saved"), "success");
    } catch (err) {
      console.error("Error saving variable override:", err);
      addToast(t("errorSaving"), "error");
    }
  };

  // --- Handlers ---
  const addTransaction = async (
    transaction: Omit<Transaction, "id" | "timestamp">,
    customTimestamp?: number,
  ) => {
    if (!session || !config) return;
    try {
      let potDelta = 0;

      if (editingTransaction) {
        // Adjust savings pot if category was or is 'Spargris'
        if (editingTransaction.category === "Spargris") {
          potDelta -= Number(editingTransaction.amount) || 0;
        }
        if (transaction.category === "Spargris") {
          potDelta += Number(transaction.amount) || 0;
        }

        const updatedTransaction = await dataService.updateTransaction(
          editingTransaction.id,
          {
            ...transaction,
            timestamp: customTimestamp || editingTransaction.timestamp,
            isBackdated: transaction.isBackdated,
          },
        );

        // Update state with updated transaction
        setTransactions((prev) =>
          prev.map((e) =>
            e.id === editingTransaction.id ? updatedTransaction : e,
          ),
        );

        setEditingTransaction(null);
        feedback.tap();
      } else {
        // Adjust savings pot if new category is 'Spargris'
        if (transaction.category === "Spargris") {
          potDelta += Number(transaction.amount) || 0;
        }

        const newTransaction = await dataService.addTransaction(
          session.user.id,
          {
            ...transaction,
            timestamp: customTimestamp || Date.now(),
            isBackdated: transaction.isBackdated,
          },
        );
        setTransactions((prev) => [newTransaction, ...prev]);

        if (
          transaction.type === "income" ||
          transaction.category === "Spargris"
        ) {
          feedback.success();
        } else {
          feedback.expense();
        }
      }

      // Save new savings pot if it changed
      if (potDelta !== 0) {
        setConfig((prev) => {
          if (!prev) return prev;
          const finalPot = Math.max(0, (prev.savingsPot || 0) + potDelta);
          const newConfig = { ...prev, savingsPot: finalPot };
          dataService.saveSettings(session.user.id, newConfig).catch((err) => {
            console.error("Failed to save settings after add/update:", err);
          });
          return newConfig;
        });
      }

      setIsAddTransactionOpen(false);
    } catch (err: any) {
      console.error("[App] Error adding transaction:", err);
      const detail = err?.details ? ` (${err.details})` : "";
      const code = err?.code ? ` [Kod: ${err.code}]` : "";
      addToast(
        `Kunde inte spara: ${err?.message || "Okänt fel"}${detail}${code}`,
        "error",
      );
    }
  };

  const handleSaveIncome = async (income: Omit<Income, "id">) => {
    if (!session) return;
    try {
      const id = editingIncome ? editingIncome.id : crypto.randomUUID();
      const newIncome = {
        ...income,
        isVariable: Boolean(income.isVariable),
        periodOverrides: income.isVariable ? (income.periodOverrides || {}) : {},
        id,
      };
      await dataService.saveIncomeSource(session.user.id, newIncome);

      if (editingIncome) {
        setIncomes((prev) =>
          prev.map((i) => (i.id === editingIncome.id ? newIncome : i)),
        );
      } else {
        setIncomes((prev) => [...prev, newIncome]);
      }
      setIsIncomeModalOpen(false);
      setEditingIncome(null);
    } catch (err: any) {
      console.error("[App] Error saving income:", err);
      addToast(
        `Kunde inte spara inkomst: ${err?.message || "Okänt fel"}`,
        "error",
      );
    }
  };

  const handleSaveFixedExpense = async (expense: Omit<FixedExpense, "id">) => {
    if (!session) return;
    try {
      const id = editingFixedExpense
        ? editingFixedExpense.id
        : crypto.randomUUID();
      const newExpense = {
        ...expense,
        isVariable: Boolean(expense.isVariable),
        periodOverrides: expense.isVariable ? (expense.periodOverrides || {}) : {},
        id,
      };
      await dataService.saveFixedExpense(session.user.id, newExpense);

      if (editingFixedExpense) {
        setFixedExpenses((prev) =>
          prev.map((e) => (e.id === editingFixedExpense.id ? newExpense : e)),
        );
      } else {
        setFixedExpenses((prev) => [...prev, newExpense]);
      }
      setIsFixedExpenseModalOpen(false);
      setEditingFixedExpense(null);
    } catch (err: any) {
      console.error("[App] Error saving fixed expense:", err);
      addToast(
        `Kunde inte spara fast utgift: ${err?.message || "Okänt fel"}`,
        "error",
      );
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const transactionToDelete = transactions.find((e) => e.id === id);
      await dataService.deleteTransaction(id);
      setTransactions((prev) => prev.filter((e) => e.id !== id));

      // Update savings pot if it was a savings transaction
      if (
        (transactionToDelete?.category === "Spargris" ||
          transactionToDelete?.type === "savings") &&
        session
      ) {
        const amountToSubtract = Number(transactionToDelete.amount) || 0;
        setConfig((prev) => {
          if (!prev) return prev;
          const newPot = Math.max(0, (prev.savingsPot || 0) - amountToSubtract);
          const newConfig = { ...prev, savingsPot: newPot };
          dataService.saveSettings(session.user.id, newConfig).catch((err) => {
            console.error("Failed to save settings after deletion:", err);
          });
          return newConfig;
        });
      }

      // If it's a distributed surplus, we might want to reset the prompt date
      if (
        transactionToDelete?.category === "Överskott" &&
        transactionToDelete?.type === "income" &&
        session
      ) {
        setConfig((prev) => {
          if (!prev) return prev;
          const newConfig = {
            ...prev,
            notifications: {
              ...prev.notifications,
              lastSurplusPromptDate: undefined,
            },
          };
          dataService.saveSettings(session.user.id, newConfig).catch((err) => {
            console.error(
              "Failed to save settings after surplus deletion:",
              err,
            );
          });
          return newConfig;
        });
      }
    } catch (_err) {
      addToast("Kunde inte radera transaktionen", "error");
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await dataService.deleteIncomeSource(id);
      setIncomes((prev) => prev.filter((i) => i.id !== id));
      setIsIncomeModalOpen(false);
      setEditingIncome(null);
    } catch (_err) {
      addToast("Kunde inte radera inkomst", "error");
    }
  };

  const handleDeleteFixedExpense = async (id: string) => {
    try {
      await dataService.deleteFixedExpense(id);
      setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
      setIsFixedExpenseModalOpen(false);
      setEditingFixedExpense(null);
    } catch (_err) {
      addToast("Kunde inte radera fast utgift", "error");
    }
  };

  const handleSaveMonthlySaving = async (saving: any) => {
    if (!session || !config) return;
    try {
      const newSaving = {
        ...saving,
        isVariable: Boolean(saving.isVariable),
        periodOverrides: saving.isVariable ? (saving.periodOverrides || {}) : {},
        id: editingMonthlySaving?.id || crypto.randomUUID(),
      };

      const newItems = editingMonthlySaving
        ? config.monthlySavingsItems?.map((s: any) =>
            s.id === editingMonthlySaving.id ? newSaving : s,
          ) || [newSaving]
        : [...(config.monthlySavingsItems || []), newSaving];

      const newConfig = { ...config, monthlySavingsItems: newItems };
      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
      setIsMonthlySavingModalOpen(false);
      setEditingMonthlySaving(null);
      addToast(t("saved"), "success");
    } catch (_error) {
      addToast(t("error"), "error");
    }
  };

  const handleDeleteMonthlySaving = async (id: string) => {
    if (!session || !config) return;
    try {
      const newItems =
        config.monthlySavingsItems?.filter((s: any) => s.id !== id) || [];
      const newConfig = { ...config, monthlySavingsItems: newItems };
      setConfig(newConfig);
      await dataService.saveSettings(session.user.id, newConfig);
      addToast(t("deleted"), "success");
    } catch (_error) {
      addToast(t("error"), "error");
    }
  };

  const handleNavigate = (tab: string, section?: string) => {
    feedback.tap();
    setNavTrigger((prev) => prev + 1);

    if (tab === "search") {
      setIsSearchModalOpen(true);
      return;
    }
    let targetTab = tab;
    let targetSection = section;
    
    // Map old settings calls to profile
    if (targetTab === "settings") {
      targetTab = "profile";
      targetSection = section || "main";
    }
    
    // Map old overview calls to new tabs
    if (targetTab === "overview") {
      targetTab = section === "log" || section === "transactions" ? "transactions" : "analysis";
    }

    const isDifferent = targetTab !== activeTab || (targetTab === "profile" && targetSection !== profileSection) || (targetTab === "settings" && targetSection !== settingsSection);
    if (isDifferent) {
      setNavHistory((prev) => {
        // Limit history size to 30 to prevent unlimited growth
        const last = prev[prev.length - 1];
        if (last && last.tab === activeTab && last.section === (activeTab === "profile" ? profileSection : activeTab === "settings" ? settingsSection : undefined)) {
          return prev;
        }
        return [...prev.slice(-29), { tab: activeTab, section: activeTab === "profile" ? profileSection : activeTab === "settings" ? settingsSection : undefined }];
      });
    }

    setActiveTab(targetTab as Tab);
    if (targetTab === "profile" && targetSection) {
      setProfileSection(targetSection as any);
    } else if (targetTab === "profile") {
      setProfileSection("main");
    } else if (targetTab === "settings" && targetSection) {
      setSettingsSection(targetSection as any);
    } else if (targetTab === "settings") {
      setSettingsSection("main");
    }
  };

  const handleGoBack = useCallback(() => {
    // 1. Close open modals first
    let modalClosed = false;
    
    if (isSearchModalOpen) { setIsSearchModalOpen(false); modalClosed = true; }
    if (isAddTransactionOpen) { setIsAddTransactionOpen(false); modalClosed = true; }
    if (isAddIncomeOpen) { setIsAddIncomeOpen(false); modalClosed = true; }
    if (editingTransaction) { setEditingTransaction(null); modalClosed = true; }
    if (viewingTransaction) { setViewingTransaction(null); modalClosed = true; }
    if (isCalculatorOpen) { setIsCalculatorOpen(false); modalClosed = true; }
        if (isFeedbackModalOpen) { setIsFeedbackModalOpen(false); modalClosed = true; }
    if (isDeleteAccountModalOpen) { setIsDeleteAccountModalOpen(false); modalClosed = true; }
    if (isSecurityModalOpen) { setIsSecurityModalOpen(false); modalClosed = true; }
    if (isManageAccountModalOpen) { setIsManageAccountModalOpen(false); modalClosed = true; }
    if (isVariableUpdateModalOpen) { setIsVariableUpdateModalOpen(false); modalClosed = true; }
    if (legalModal.isOpen) { setLegalModal(p => ({ ...p, isOpen: false })); modalClosed = true; }
    if (isFixedExpenseModalOpen) { setIsFixedExpenseModalOpen(false); modalClosed = true; }
    if (isMonthlySavingModalOpen) { setIsMonthlySavingModalOpen(false); modalClosed = true; }
    if (viewingFixedExpense) { setViewingFixedExpense(null); modalClosed = true; }
    if (viewingMonthlySaving) { setViewingMonthlySaving(null); modalClosed = true; }
    if (editingMonthlySaving) { setEditingMonthlySaving(null); modalClosed = true; }

    if (modalClosed) {
      feedback.tap();
      return true;
    }

    // 2. If profile section is not main, go back to main section
    if (activeTab === 'profile' && profileSection !== 'main') {
      feedback.tap();
      setNavTrigger((prev) => prev + 1);
      setActiveTab('profile');
      setProfileSection('main');
      return true;
    }

    if (activeTab === 'settings' && settingsSection !== 'main') {
      feedback.tap();
      setNavTrigger((prev) => prev + 1);
      setActiveTab('settings');
      setSettingsSection('main');
      return true;
    }

    // 3. Pop from navigation history
    if (navHistory.length > 0) {
      feedback.tap();
      setNavTrigger((prev) => prev + 1);
      const nextStack = [...navHistory];
      const previous = nextStack.pop();
      setNavHistory(nextStack);
      if (previous) {
        setActiveTab(previous.tab);
        setProfileSection(previous.section || "main");
        return true;
      }
    }

    // 4. Default fallback: Go back to Today tab if not already on it
    if (activeTab !== "today") {
      feedback.tap();
      setNavTrigger((prev) => prev + 1);
      setActiveTab("today");
      return true;
    }

    return false;
  }, [
    isSearchModalOpen, isAddTransactionOpen, isAddIncomeOpen, editingTransaction, viewingTransaction,
    isCalculatorOpen, isFeedbackModalOpen, isDeleteAccountModalOpen,
    isSecurityModalOpen, isManageAccountModalOpen, isVariableUpdateModalOpen, legalModal,
    isFixedExpenseModalOpen, isMonthlySavingModalOpen, viewingFixedExpense, viewingMonthlySaving, editingMonthlySaving,
    activeTab, profileSection, settingsSection, navHistory, feedback
  ]);

  // Handle mobile edge-swipe (left-to-right gesture on phone to go back)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let isEdgeSwipe = false;

    // A sub-view is active if a modal is open, or we have navigated deep into a profile section (beyond 'main')
    const isSubViewActive = 
      isSearchModalOpen ||
      isAddTransactionOpen ||
      isAddIncomeOpen ||
      !!editingTransaction ||
      !!viewingTransaction ||
      isCalculatorOpen ||
            isFeedbackModalOpen ||
      isDeleteAccountModalOpen ||
      isSecurityModalOpen ||
      isManageAccountModalOpen ||
      isVariableUpdateModalOpen ||
      legalModal.isOpen ||
      isFixedExpenseModalOpen ||
      isMonthlySavingModalOpen ||
      !!viewingFixedExpense ||
      !!viewingMonthlySaving ||
      !!editingMonthlySaving ||
      activeTab === 'notifications' ||
      (activeTab === 'profile' && profileSection !== 'main') || (activeTab === 'settings' && settingsSection !== 'main');

    const handleTouchStart = (e: TouchEvent) => {
      if (!isSubViewActive) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      // Start is near left edge
      isEdgeSwipe = touchStartX < 35;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe || !isSubViewActive) return;
      if (e.changedTouches.length !== 1) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      // Swipe right from left edge: at least 75px horizontal displacement, mostly horizontal gesture
      if (deltaX > 75 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
        handleGoBack();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    handleGoBack,
    isSearchModalOpen,
    isAddTransactionOpen,
    isAddIncomeOpen,
    editingTransaction,
    viewingTransaction,
    isCalculatorOpen,
    isFeedbackModalOpen,
    isDeleteAccountModalOpen,
    isSecurityModalOpen,
    isManageAccountModalOpen,
    isVariableUpdateModalOpen,
    legalModal,
    isFixedExpenseModalOpen,
    isMonthlySavingModalOpen,
    viewingFixedExpense,
    viewingMonthlySaving,
    editingMonthlySaving,
    activeTab,
    profileSection
  ]);

  const _handleBorrowFromPot = async (amount: number) => {
    if (!session || !config) return;

    try {
      const newSavingsPot = Math.max(0, (config.savingsPot || 0) - amount);
      const redistributedGoals = dataService.distributeSavingsPot(
        newSavingsPot,
        config.savingsGoals || [],
      );
      const updatedConfig = {
        ...config,
        savingsPot: newSavingsPot,
        savingsGoals: redistributedGoals,
        totalSavedLifetime: Math.max(
          0,
          (config.totalSavedLifetime || 0) - amount,
        ),
      };

      // 1. Update settings in DB
      await dataService.saveSettings(session.user.id, updatedConfig);
      setConfig(updatedConfig);

      // 2. Add a "Surplus" transaction to increase current budget
      const newTransaction = await dataService.addTransaction(session.user.id, {
        amount: amount,
        category: "Budgetökning",
        note: t("borrowNote"),
        timestamp: Date.now(),
        type: "income",
        isBackdated: false,
        tags: [],
      });

      setTransactions((prev) => [newTransaction, ...prev]);
      addToast(t("borrowSuccess"), "success");
    } catch (err) {
      console.error("Borrow error:", err);
      addToast(t("errorSaving"), "error");
    }
  };

  const _handleSaveToPot = async (amount: number) => {
    if (!session || !config) return;
    try {
      const newSavingsPot = (config.savingsPot || 0) + amount;
      const redistributedGoals = dataService.distributeSavingsPot(
        newSavingsPot,
        config.savingsGoals || [],
      );
      const updatedConfig = {
        ...config,
        savingsPot: newSavingsPot,
        savingsGoals: redistributedGoals,
        totalSavedLifetime: (config.totalSavedLifetime || 0) + amount,
      };

      // 1. Update settings in DB
      await dataService.saveSettings(session.user.id, updatedConfig);
      setConfig(updatedConfig);

      // 2. Add a "Spargris" transaction to decrease current budget
      const newTransaction = await dataService.addTransaction(session.user.id, {
        amount: amount,
        category: "Spargris",
        note: t("savedFromBudget"),
        timestamp: Date.now(),
        type: "savings" as const,
        isBackdated: false,
        tags: [],
      });

      setTransactions((prev) => [newTransaction, ...prev]);
      feedback.success();
      addToast(t("savingsPotUpdated"), "success");
    } catch (err) {
      console.error("Save to pot error:", err);
      addToast(t("errorSaving"), "error");
    }
  };

  const resetAll = () => {
    showConfirm(t("resetAllTitle"), t("resetAllMessage"), async () => {
      if (!session) return;
      try {
        // Delete all data for the user
        await supabase
          .from("transactions")
          .delete()
          .eq("user_id", session.user.id);
        await supabase
          .from("fixed_expenses")
          .delete()
          .eq("user_id", session.user.id);
        await supabase
          .from("income_sources")
          .delete()
          .eq("user_id", session.user.id);
        await supabase
          .from("savings_goals")
          .delete()
          .eq("user_id", session.user.id);

        const defaultConfig: Config = {
          currency: "kr",
          language: "sv",
          payday: 25,
          paydayType: PaydayType.TWENTY_FIFTH,
          paydayBeforeWeekend: true,
          savingsGoals: [],
          totalSavedLifetime: 0,
          categories: DEFAULT_EXPENSE_CATEGORIES,
          incomeCategories: DEFAULT_INCOME_CATEGORIES,
          initialSpent: 0,
          notifications: { dailySpend: true, overLimit: true },
          securityLock: false,
          darkMode: false,
          quickChoices: [],
          savingsPot: 0,
          surplusIncome: 0,
          monthlySavings: 0,
          monthlySavingsItems: [],
          includeFixedExpensesInAnalysis: true,
          showFixedExpensesInTodayView: true,
          showFixedExpensesInCalendar: false,
          paymentMethods: [
            "Autogiro",
            "Faktura",
            "Kortbetalning",
            "Swish",
            "Övrigt",
          ],
        };

        await dataService.saveSettings(session.user.id, defaultConfig);

        setConfig(defaultConfig);
        setTransactions([]);
        setFixedExpenses([]);
        setIncomes([]);
        setActiveTab("today");
        addToast(t("dataResetSuccess"), "info");
      } catch (_err) {
        addToast("Kunde inte återställa data", "error");
      }
    });
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    const lang = (config?.language as Language) || landingLanguage;
    let translation = translations[lang]?.[key] || translations["sv"][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        translation = translation.replace(`{{${k}}}`, String(v));
      });
    }
    return translation;
  };

  const headerTitle = useMemo(() => {
    if (activeTab === "today") return undefined;
    if (activeTab === "notifications") return t("notificationsTitle");
    if (activeTab === "transactions") return t("log");
    if (activeTab === "analysis") return t("analysis");
    if (activeTab === "budget") return t("budget");
    if (activeTab === "settings") {
      switch (settingsSection) {
        case "salary": return t("salary");
        case "categories": return t("categories");
        case "paymentMethods": return t("paymentMethod");
        case "language": return t("language");
        default: return config?.language === 'en' ? 'Settings' : 'Inställningar';
      }
    }
    if (activeTab === "profile") {
      switch (profileSection) {
        case "salary": return t("salary");
        case "categories": return t("categories");
        case "paymentMethods": return t("paymentMethod");
        case "manageAccount": return t("manageAccount");
        case "language": return t("language");
        case "notifications": return t("notifications");
        default: return t("profile");
      }
    }
    return undefined;
  }, [activeTab, profileSection, settingsSection, t]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-dvh font-sans text-[var(--text-primary)] relative bg-[var(--bg-color)]">
        <div className="min-h-dvh flex items-center justify-center p-6 relative z-10">
          <div className="max-w-md w-full bg-[var(--surface-color)] p-10 rounded-[20px] text-center space-y-6">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Konfiguration saknas
            </h1>

            {!isSupabaseUrlValid && (
              <div className="bg-danger/10 p-4 rounded-2xl text-left">
                <p className="text-xs font-semibold text-danger mb-1">
                  Felaktig URL
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t("supabaseUrlError")}
                </p>
              </div>
            )}

            {!isSupabaseKeyValid && (
              <div className="bg-danger/10 p-4 rounded-2xl text-left">
                <p className="text-xs font-semibold text-danger mb-1">
                  Felaktig Nyckel
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {t("supabaseAnonKeyError")}{" "}
                  <code className="bg-white/10 px-1 rounded">eyJ...</code>
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  Du angav:{" "}
                  <code className="break-all opacity-50">
                    {supabaseAnonKey?.substring(0, 15)}...
                  </code>
                </p>
              </div>
            )}

            <p className="text-xs text-[var(--text-secondary)]">
              Kolla <code className="text-accent">.env</code> filen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className={`min-h-dvh font-sans text-[var(--text-primary)] relative pt-[env(safe-area-inset-top)] bg-[var(--bg-color)] ${config?.darkMode ? 'dark' : ''}`}>
        <div className="min-h-dvh flex items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[var(--text-secondary)] animate-spin" />
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              Startar Dejz...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`min-h-dvh font-sans text-[var(--text-primary)] relative bg-[var(--bg-color)] overflow-x-hidden ${config?.darkMode ? 'dark' : ''}`}>
        {showLanding ? (
          <>
            <LandingPage
              onGetStarted={() => {
                setShowLanding(false);
                setShowWelcome(false);
                setInitialIsRegistering(true);
              }}
              onLogin={() => {
                setShowLanding(false);
                setShowWelcome(false);
                setInitialIsRegistering(false);
              }}
              onStartDemo={() => {
                const mock = seedDemoData();
                setSession(mock as any);
                setShowLanding(false);
                setShowWelcome(false);
                addToast("Välkommen till demoläget!", "success");
              }}
              onGoogleLogin={handleGoogleLogin}
              t={t}
              currentLanguage={landingLanguage}
              onLanguageChange={(lang) => {
                setLandingLanguage(lang);
                localStorage.setItem('app_language', lang);
              }}
            />
            <CookieConsentModal t={t} onOpenPrivacyPolicy={() => setLegalModal({ isOpen: true, type: 'privacy' })} />
          </>
        ) : showWelcome ? (
          <WelcomeScreen
            onAction={(isReg) => {
              setInitialIsRegistering(isReg);
              setShowWelcome(false);
            }}
            onLegalClick={handleLegalClick}
            t={t}
          />
        ) : (
          <Auth
            onShowToast={(msg, type) => addToast(msg, type as ToastType)}
            onLegalClick={handleLegalClick}
            t={t}
            initialIsRegistering={initialIsRegistering}
            onBack={() => setShowLanding(true)}
          />
        )}
      </div>
    );
  }

  if (isLoading || !config || !stats) {
    return (
      <div className="min-h-dvh font-sans text-[var(--text-primary)] relative pt-[env(safe-area-inset-top)] bg-[var(--bg-color)]">
        <div className="min-h-dvh flex items-center justify-center relative z-10">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[var(--text-secondary)] animate-spin" />
            <p className="text-sm text-[var(--text-secondary)] font-medium">
              Laddar din ekonomi...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh font-sans pt-0 text-[var(--text-primary)] selection:bg-accent/30 relative overflow-x-hidden" style={{ background: 'var(--bg-gradient)' }}>
      {/* Top Subtle Blue Ambient Gradient */}
      <div className="absolute top-0 inset-x-0 h-80 sm:h-96 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[130%] h-80 bg-gradient-to-b from-blue-700/12 via-blue-900/8 to-transparent dark:from-blue-600/15 dark:via-blue-800/10 dark:to-transparent blur-3xl opacity-90" />
        <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-blue-800/10 via-blue-950/5 to-transparent dark:from-blue-700/14 dark:via-blue-900/8 dark:to-transparent" />
      </div>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        variant={confirmModal.variant}
        t={t}
      />

      {session && config && (
        <AppHeader
          title={headerTitle}
          onBack={
            activeTab === 'notifications' ||
            (activeTab === 'profile' && profileSection !== 'main') ||
            (activeTab === 'settings' && settingsSection !== 'main')
              ? () => handleGoBack()
              : undefined
          }
          navTrigger={navTrigger}
          userName={
            (
              session?.user?.user_metadata?.full_name ||
              session?.user?.email?.split("@")[0] ||
              ""
            ).split(" ")[0]
          }
          date={(() => {
            const d = new Date(targetDate || new Date());
            d.setHours(0, 0, 0, 0);
            return d;
          })()}
          avatarUrl={avatarUrl}
          onNavigate={handleNavigate}
          onOpenSettings={() => handleNavigate("settings")}
          notificationCount={notifications.length}
          onOpenNotifications={() => handleNavigate("notifications")}
          isDemoMode={isDemoMode}
        />
      )}

      {isDemoMode && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[var(--surface-color)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between px-2 sm:px-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              <span className="text-xs font-bold text-accent">Demoläge aktivt</span>
              <span className="hidden sm:inline text-[var(--text-secondary)] font-normal text-[11px]">— Du utforskar appen med exempeldata</span>
            </div>
            <button
              type="button"
              onClick={handleExitDemo}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent text-[var(--text-on-accent)] hover:opacity-90 active:scale-95 transition-all text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
            >
              <span>{t('exitDemo')}</span>
              <LogOut size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

            <PullToRefresh onRefresh={handleRefresh}>
        <main className={`max-w-2xl mx-auto px-4 sm:px-6 relative ${isDemoMode ? 'pt-[calc(7.2rem+env(safe-area-inset-top))]' : 'pt-[calc(5rem+env(safe-area-inset-top))]'} ${isAddTransactionOpen ? 'pb-0' : 'pb-32'}`}>
          {activeTab !== 'today' && activeTab !== 'settings' && activeTab !== 'profile' && activeTab !== 'budget' && activeTab !== 'notifications' && stats && (
            <UniversalPeriodSelector
              periods={periods}
              currentDate={currentPeriodDate}
              onChange={setCurrentPeriodDate}
              periodName={stats.periodName}
              isCurrentPeriod={isCurrentPeriod}
              config={config}
            />
          )}

          <AnimatePresence>
            {activeTab === "today" && stats && (
              <motion.div
                key="today"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="today" scrollPositionsRef={tabScrollPositions}>
                  <TodayView
                    stats={stats}
                    config={config}
                    userName={
                      (
                        session?.user?.user_metadata?.full_name ||
                        session?.user?.email?.split("@")[0] ||
                        ""
                      ).split(" ")[0]
                    }
                    incomes={incomes}
                    fixedExpenses={fixedExpenses}
                    selectedDate={targetDate}
                    setSelectedDate={setTargetDate}
                    onAddTransaction={(date) => {
                      setTransactionType("expense");
                      if (date) setTargetDate(date);
                      setIsAddTransactionOpen(true);
                    }}
                    onAddIncome={(date) => {
                      setTransactionType("income");
                      if (date) setTargetDate(date);
                      setIsAddTransactionOpen(true);
                    }}
                    onViewTransaction={(t) => {
                      setViewingTransaction(t);
                    }}
                    onViewFixedExpense={(expense) => {
                      setViewingFixedExpense(expense);
                    }}
                    onViewIncome={(income) => {
                      setViewingIncome(income);
                    }}
                    onViewMonthlySaving={(saving) => {
                      setViewingMonthlySaving(saving);
                    }}
                    onDeleteTransaction={deleteTransaction}
                    currentPeriodDate={currentPeriodDate}
                    currentPeriodStart={currentPeriodStart}
                    currentPeriodEnd={currentPeriodEnd}
                    isCurrentPeriod={isCurrentPeriod}
                    periods={periods}
                    setCurrentPeriodDate={setCurrentPeriodDate}
                    onNavigate={handleNavigate}
                    transactions={stats?.periodTransactions || []}
                    allTransactions={transactions}
                    t={t}
                    avatarUrl={avatarUrl}
                    attentionItems={attentionItems}
                    onEditAttentionItem={(item) => {
                      if (item.isVariable) {
                        setItemToUpdateVariable(item);
                        setIsVariableUpdateModalOpen(true);
                        return;
                      }
                      if (item.budgetType === "income") {
                        setEditingIncome(item);
                        setIsIncomeModalOpen(true);
                      } else if (item.budgetType === "expense") {
                        setEditingFixedExpense(item);
                        setIsFixedExpenseModalOpen(true);
                      } else if (item.budgetType === "savings") {
                        setEditingMonthlySaving(item);
                        setIsMonthlySavingModalOpen(true);
                      }
                    }}
                    onUpdateConfig={(newConfig) => {
                      setConfig(newConfig);
                      if (session?.user?.id) {
                        dataService.saveSettings(session.user.id, newConfig);
                      }
                    }}
                  />
                </TabWrapper>
              </motion.div>
            )}

            {activeTab === "analysis" && stats && (
              <motion.div
                key="analysis"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="analysis" scrollPositionsRef={tabScrollPositions}>
                  <OverviewView
                    transactions={transactions}
                    stats={stats}
                    config={config}
                    initialTab="analysis"
                    onAddTransaction={() => {
                      setTransactionType("expense");
                      setTargetDate(new Date());
                      setIsAddTransactionOpen(true);
                    }}
                    onAddIncome={() => {
                      setTransactionType("income");
                      setTargetDate(new Date());
                      setIsAddTransactionOpen(true);
                    }}
                    onViewTransaction={(t) => {
                      setViewingTransaction(t);
                    }}
                    onViewFixedExpense={(expense) => {
                      setViewingFixedExpense(expense);
                    }}
                    onDeleteTransaction={deleteTransaction}
                    t={t}
                    currentLang={config.language as Language}
                    fixedExpenses={fixedExpenses}
                    periods={periods}
                    isPro={isPro(subscriptionStatus, trialEnd)}
                    onUpgrade={() => {
                      setActiveTab("profile");
                      setProfileSection("pro");
                    }}
                  />
                </TabWrapper>
              </motion.div>
            )}

            {activeTab === "transactions" && stats && (
              <motion.div
                key="transactions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="transactions" scrollPositionsRef={tabScrollPositions}>
                  <OverviewView
                    transactions={transactions}
                    stats={stats}
                    config={config}
                    initialTab="log"
                    onAddTransaction={() => {
                      setTransactionType("expense");
                      setTargetDate(new Date());
                      setIsAddTransactionOpen(true);
                    }}
                    onAddIncome={() => {
                      setTransactionType("income");
                      setTargetDate(new Date());
                      setIsAddTransactionOpen(true);
                    }}
                    onViewTransaction={(t) => {
                      setViewingTransaction(t);
                    }}
                    onViewFixedExpense={(expense) => {
                      setViewingFixedExpense(expense);
                    }}
                    onDeleteTransaction={deleteTransaction}
                    t={t}
                    currentLang={config.language as Language}
                    fixedExpenses={fixedExpenses}
                    periods={periods}
                    isPro={isPro(subscriptionStatus, trialEnd)}
                    onUpgrade={() => {
                      setActiveTab("profile");
                      setProfileSection("pro");
                    }}
                  />
                </TabWrapper>
              </motion.div>
            )}

            {activeTab === "budget" && stats && (
              <motion.div
                key="budget"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="budget" scrollPositionsRef={tabScrollPositions}>
                  <BudgetView
                    stats={stats}
                    config={config}
                    setConfig={setConfig}
                    incomes={incomes}
                    setIncomes={setIncomes}
                    fixedExpenses={fixedExpenses}
                    setFixedExpenses={setFixedExpenses}
                    onAddIncome={() => {
                      setEditingIncome(null);
                      setIsIncomeModalOpen(true);
                    }}
                    onEditIncome={(income) => {
                      setEditingIncome(income);
                      setIsIncomeModalOpen(true);
                    }}
                    onViewIncome={(income) => {
                      setViewingIncome(income);
                    }}
                    onAddFixedExpense={() => {
                      setEditingFixedExpense(null);
                      setIsFixedExpenseModalOpen(true);
                    }}
                    onEditFixedExpense={(expense) => {
                      setEditingFixedExpense(expense);
                      setIsFixedExpenseModalOpen(true);
                    }}
                    onViewFixedExpense={(expense) => {
                      setViewingFixedExpense(expense);
                    }}
                    onAddMonthlySaving={() => {
                      setEditingMonthlySaving(null);
                      setIsMonthlySavingModalOpen(true);
                    }}
                    onEditMonthlySaving={(s) => {
                      setEditingMonthlySaving(s);
                      setIsMonthlySavingModalOpen(true);
                    }}
                    onViewMonthlySaving={(s) => {
                      setViewingMonthlySaving(s);
                    }}
                    onResetSavingsPot={handleResetSavingsPot}
                    t={t}
                    currentPeriodId={currentPeriodId}
                  />
                </TabWrapper>
              </motion.div>
            )}

            {activeTab === "settings" && config && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="settings" scrollPositionsRef={tabScrollPositions}>
                  <SettingsMainView
                    onBack={() => setActiveTab("today")}
                    config={config}
                    initialSection={settingsSection as any}
                    setConfig={async (newConfig) => {
                      if (!session) return;
                      try {
                        setConfig(newConfig);
                        await dataService.saveSettings(session.user.id, newConfig);
                      } catch (err) {
                        console.error("Error saving config:", err);
                      }
                    }}
                    t={t}
                    onNavigate={handleNavigate}
                    onSecurityClick={() => setIsSecurityModalOpen(true)}
                    subscriptionStatus={subscriptionStatus}
                    onFeedbackClick={() => setIsFeedbackModalOpen(true)}
                    onExportData={handleExportData}
                    onLegalClick={(type) => setLegalModal({ isOpen: true, type })}
                    profile={profile}
                    userId={session?.user?.id}
                    session={session}
                    onRefresh={fetchData}
                    onResetSavingsPot={handleResetSavingsPot}
                    onResetCompletedGoals={handleResetCompletedGoals}
                    onClearTransactions={handleClearTransactions}
                    onResetAll={resetAll}
                    onTriggerProUpgradeModal={() => setIsProModalOpen(true)}
                  />
                </TabWrapper>
              </motion.div>
            )}

            {activeTab === "profile" && config && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="profile" scrollPositionsRef={tabScrollPositions}>
                  <ProfileView
                    onBack={() => setActiveTab("today")}
                    user={session?.user}
                    onLogout={handleLogout}
                    onUploadAvatar={handleUploadAvatar}
                    avatarUrl={avatarUrl}
                    config={config}
                    initialSection={profileSection}
                    setConfig={async (newConfig) => {
                      if (!session) return;
                      try {
                        setConfig(newConfig);
                        await dataService.saveSettings(
                          session.user.id,
                          newConfig,
                        );
                      } catch (err) {
                        console.error("Error saving config:", err);
                      }
                    }}
                    onNavigate={handleNavigate}
                    isDemoMode={isDemoMode}
                    onExitDemo={handleExitDemo}
                    onFeedbackClick={() => setIsFeedbackModalOpen(true)}
                    onDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
                    onExportData={handleExportData}
                    onLegalClick={handleLegalClick}
                    stats={stats}
                    t={t}
                    subscriptionStatus={subscriptionStatus}
                    trialEnd={trialEnd}
                    nextBillingDate={nextBillingDate}
                    onPaymentSuccess={async () => {
                      try {
                        const result = await verifyPayment(session.user.id);
                        if (result.success) {
                          setSubscriptionStatus(result.status);
                          if (result.status === "canceling") {
                            addToast("Abonnemanget är nu uppsagt.", "info");
                          } else if (
                            result.status === "active" ||
                            result.status === "trialing" ||
                            result.status === "lifetime"
                          ) {
                            addToast(
                              "Betalning genomförd! Du är nu Pro.",
                              "success",
                            );
                          }
                        } else {
                          addToast(
                            "Betalningen behandlas fortfarande. Det kan ta en liten stund.",
                            "info",
                          );
                        }

                        const dbProfile = await dataService.getProfile(
                          session.user.id,
                        );
                        if (dbProfile) {
                          setSubscriptionStatus((prev) => {
                            if (isPro(prev)) return prev;
                            return dbProfile.subscription_status || "free";
                          });
                          setTrialEnd(dbProfile.trial_end);
                          setNextBillingDate(dbProfile.next_billing_date);
                        }
                      } catch (e: any) {
                        console.error("Payment verification failed:", e);
                        addToast(
                          `Ett fel uppstod vid verifiering av betalningen: ${e?.message || "Okänt fel"}`,
                          "error",
                        );
                      }
                    }}
                    onShowToast={addToast}
                    onSecurityClick={() => setIsSecurityModalOpen(true)}
                    profile={profile}
                    userId={session?.user.id || ""}
                    session={session}
                    onRefresh={handleRefresh}
                    onResetSavingsPot={handleResetSavingsPot}
                    onResetCompletedGoals={handleResetCompletedGoals}
                    onClearTransactions={handleClearTransactions}
                    onResetAll={resetAll}
                    addToast={addToast}
                    transactions={transactions}
                    incomes={incomes}
                    fixedExpenses={fixedExpenses}
                    setCurrentPeriodDate={setCurrentPeriodDate}
                    periods={periods}
                    onViewTransaction={setViewingTransaction}
                  />
                </TabWrapper>
              </motion.div>
            )}

            {activeTab === "notifications" && config && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.08 }}
              >
                <TabWrapper tabKey="notifications" scrollPositionsRef={tabScrollPositions}>
                  <NotificationsView
                    notifications={notifications}
                    onOpenItem={(item) => {
                      setItemToUpdateVariable(item);
                      setIsVariableUpdateModalOpen(true);
                    }}
                    onConfirmStandard={async (item) => {
                      await handleSaveVariableOverride(item, Number(item.amount) || 0);
                    }}
                    onDismiss={handleDismissNotification}
                    onBack={() => handleGoBack()}
                    currency={config.currency}
                    config={config}
                    t={t}
                  />
                </TabWrapper>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PullToRefresh>

      {/* Bottom Navigation */}
      {!isAddTransactionOpen && (
        <>
          <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/80 to-transparent pointer-events-none z-30" />
          <CustomBottomNavigation
            activeTab={activeTab}
            setActiveTab={(tab) => {
              if (tab === activeTab) {
                tabScrollPositions.current[tab] = 0;
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                setActiveTab(tab);
              }
            }}
            language={(config?.language as Language) || "sv"}
            currency={config?.currency || "kr"}
            onAddTransaction={(type, prefill) => {
              setTransactionType(type);
              setTransactionPrefill(prefill || null);
              setIsAddTransactionOpen(true);
            }}
            onQuickAdd={(item) => {
              const defaultCategory = config?.categories?.find((c) =>
                c.name.toLowerCase().includes("mat") ||
                c.name.toLowerCase().includes("dryck") ||
                c.name.toLowerCase().includes("inköp")
              )?.name || config?.categories?.[0]?.name || "Övrigt";

              const tDate = targetDate || new Date();
              addTransaction(
                {
                  amount: item.amount,
                  category: item.category || defaultCategory,
                  note: item.name,
                  type: item.type || "expense",
                  isBackdated: tDate.toDateString() !== new Date().toDateString(),
                },
                tDate.getTime()
              );
            }}
            addToast={addToast}
            logoUrl={LOGO_URL}
            avatarUrl={avatarUrl}
          />
        </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isFeedbackModalOpen && (
          <FeedbackModal
            onClose={() => setIsFeedbackModalOpen(false)}
            onSubmit={handleFeedbackSubmit}
            t={t}
          />
        )}
        {isDeleteAccountModalOpen && (
          <DeleteAccountModal
            isOpen={isDeleteAccountModalOpen}
            onClose={() => setIsDeleteAccountModalOpen(false)}
            onConfirm={handleConfirmDeleteAccount}
            t={t}
            isSocialUser={session?.user.app_metadata.provider !== "email"}
          />
        )}

        <OnboardingModal
          isOpen={isOnboarding}
          config={config}
          userId={session?.user.id}
          currentPeriodId={currentPeriodId}
          isPro={isPro(subscriptionStatus)}
          onComplete={async (data) => {
            setIsOnboarding(false);
            const activeUserId = session?.user?.id || "demo-user";

            try {
              // 1. Update full name in profiles table if available
              if (data.fullName) {
                try {
                  await dataService.updateProfile(activeUserId, { full_name: data.fullName });
                } catch (profErr) {
                  console.warn("Could not update profile full_name:", profErr);
                }
              }

              // 2. Map savings goals
              const mappedSavingsGoals: SavingsGoal[] = (data.savingsGoals || []).map(
                (g) => ({
                  id: crypto.randomUUID(),
                  title: g.title,
                  targetAmount: Number(g.targetAmount) || 0,
                  currentAmount: 0,
                  priority: 0,
                  icon: g.icon || "Target",
                  logo: g.logo,
                  deadline: g.deadline,
                  createdAt: Date.now(),
                }),
              );

              // 3. Update config with income, initialSpent, payday, and savings goals
              const newConfig: Config = {
                ...config,
                darkMode: (config?.darkMode !== undefined && config?.darkMode !== null) ? config.darkMode : false,
                payday: data.payday || 25,
                initialSpent: data.initialSpent,
                savingsGoals: mappedSavingsGoals,
              };
              await dataService.saveSettings(activeUserId, newConfig);
              setConfig(newConfig);

              // 4. Add income sources
              const newIncomes: Income[] = [];
              for (const inc of data.incomes || []) {
                if (inc.amount > 0) {
                  const incomeSource: Income = {
                    id: crypto.randomUUID(),
                    name: inc.name || "Lön",
                    amount: Number(inc.amount) || 0,
                    icon: inc.icon || "Wallet",
                    logo: inc.logo,
                  };
                  await dataService.saveIncomeSource(
                    activeUserId,
                    incomeSource,
                  );
                  newIncomes.push(incomeSource);
                }
              }
              setIncomes(newIncomes);

              // 5. Add fixed expenses
              const newFixedExpenses: FixedExpense[] = [];
              for (const exp of data.fixedExpenses || []) {
                if (exp.name && exp.amount > 0) {
                  const fixed: FixedExpense = {
                    id: crypto.randomUUID(),
                    name: exp.name,
                    amount: Number(exp.amount) || 0,
                    paymentMethod: exp.paymentMethod || PaymentMethod.OVRIGT,
                    frequency: exp.frequency || Frequency.MONTHLY,
                    icon: exp.icon || "CreditCard",
                    category: exp.category,
                    logo: exp.logo,
                  };
                  await dataService.saveFixedExpense(activeUserId, fixed);
                  newFixedExpenses.push(fixed);
                }
              }
              setFixedExpenses(newFixedExpenses);

              // 6. Add initial spent transaction if starting mid-period
              if (data.initialSpent > 0) {
                const initialTransaction = await dataService.addTransaction(
                  activeUserId,
                  {
                    amount: data.initialSpent,
                    category: "Övrigt",
                    note: "Justering för start mitt i period",
                    timestamp: Date.now(),
                    type: "expense",
                    isBackdated: false,
                    tags: [],
                  },
                );
                setTransactions((prev) => [initialTransaction, ...prev]);
              }

              // Refresh session to get updated metadata
              try {
                await supabase.auth.refreshSession();
              } catch (refreshErr) {
                console.warn("Could not refresh auth session:", refreshErr);
              }

              // Trigger PWA modal after 10 seconds delay as requested by user
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('trigger-pwa-modal'));
              }, 10000);

              addToast(
                data.fullName ? `Välkommen ${data.fullName}!` : "Välkommen!",
                "success",
              );
            } catch (err) {
              console.error("Error saving onboarding data:", err);
              addToast(
                "Dina inställningar sparades!",
                "success",
              );
            }
          }}
          t={t}
        />

        {isSecurityModalOpen && (
          <SecurityModal
            isOpen={isSecurityModalOpen}
            onClose={() => setIsSecurityModalOpen(false)}
            t={t}
            addToast={addToast}
            userEmail={session?.user?.email}
          />
        )}

        {itemToUpdateVariable && config && (
          <VariableAmountUpdateModal
            isOpen={isVariableUpdateModalOpen}
            onClose={() => {
              setIsVariableUpdateModalOpen(false);
              setItemToUpdateVariable(null);
            }}
            item={itemToUpdateVariable}
            config={config}
            t={t}
            periodName={
              stats
                ? getPeriodName(
                    stats.periodStart,
                    stats.periodEnd,
                    config.paydayType || PaydayType.TWENTY_FIFTH,
                    config.language,
                  )
                : ""
            }
            onSave={(amount) => {
              if (!itemToUpdateVariable) return;

              const currentPeriodId = getPeriodId(
                new Date(stats?.periodStart || new Date()),
              );

              const updatedItem = {
                ...itemToUpdateVariable,
                periodOverrides: {
                  ...(itemToUpdateVariable.periodOverrides || {}),
                  [currentPeriodId]: amount,
                },
              };

              // Local update first for speed
              if (itemToUpdateVariable.budgetType === "income") {
                setIncomes((prev) =>
                  prev.map((i) =>
                    i.id === itemToUpdateVariable.id ? updatedItem : i,
                  ),
                );
                dataService
                  .saveIncomeSource(session!.user.id, updatedItem)
                  .catch((e) => console.error(e));
              } else if (itemToUpdateVariable.budgetType === "expense") {
                setFixedExpenses((prev) =>
                  prev.map((e) =>
                    e.id === itemToUpdateVariable.id ? updatedItem : e,
                  ),
                );
                dataService
                  .saveFixedExpense(session!.user.id, updatedItem)
                  .catch((e) => console.error(e));
              } else if (itemToUpdateVariable.budgetType === "savings") {
                const newItems =
                  config.monthlySavingsItems?.map((s: any) =>
                    s.id === itemToUpdateVariable.id ? updatedItem : s,
                  ) || [];
                const newConfig = { ...config, monthlySavingsItems: newItems };
                setConfig(newConfig);
                dataService
                  .saveSettings(session!.user.id, newConfig)
                  .catch((e) => console.error(e));
              }

              addToast(t("settingsSaved"), "success");
              feedback.success();
            }}
          />
        )}
        {isManageAccountModalOpen && (
          <ManageAccountModal
            isOpen={isManageAccountModalOpen}
            onClose={() => setIsManageAccountModalOpen(false)}
            user={session?.user || null}
            onUpdateProfile={() => {
              // Refresh session to get updated metadata
              supabase.auth.refreshSession();
            }}
            onLogout={handleLogout}
            t={t}
            addToast={addToast}
            onUploadAvatar={handleUploadAvatar}
            avatarUrl={avatarUrl}
            subscriptionStatus={subscriptionStatus}
            trialEnd={trialEnd}
            nextBillingDate={nextBillingDate}
            onPaymentSuccess={async () => {
              // Refresh subscription status
              const {
                data: { session },
              } = await supabase.auth.getSession();
              if (session?.user) {
                // Assuming there's a function to fetch subscription status
                // I'll need to check how it's fetched in other places
                // For now, I'll just trigger a re-fetch if possible
                // Looking at the code, it seems it's fetched in a useEffect
                // I might need to trigger that effect
              }
            }}
          />
        )}

        {viewingTransaction && (
          <TransactionViewModal
            transaction={viewingTransaction}
            onClose={() => setViewingTransaction(null)}
            onEdit={(t) => {
              setViewingTransaction(null);
              setEditingTransaction(t);
              setTransactionType(t.type || "expense");
              setTargetDate(new Date(t.timestamp));
              setIsAddTransactionOpen(true);
            }}
            onDelete={(id) => {
              deleteTransaction(id);
              setViewingTransaction(null);
            }}
            onDuplicate={async (expense) => {
              if (!session) return;
              try {
                const newExpense = await dataService.addTransaction(
                  session.user.id,
                  {
                    amount: expense.amount,
                    category: expense.category,
                    note: expense.note,
                    timestamp: expense.timestamp,
                    type: expense.type,
                    isBackdated: expense.isBackdated,
                    logo: expense.logo,
                    icon: expense.icon,
                    paymentMethod: expense.paymentMethod,
                    receiptUrl: expense.receiptUrl,
                    tags: expense.tags || [],
                  },
                );
                setTransactions((prev) => [newExpense, ...prev]);
                setViewingTransaction(null);
                addToast(t("transactionDuplicated"), "success");
              } catch (_error) {
                addToast(t("error"), "error");
              }
            }}
            t={t}
            config={config}
          />
        )}

        {isAddTransactionOpen && (
          <TransactionModal
            transactions={transactions}
            isPro={isPro(subscriptionStatus)}
            transaction={editingTransaction}
            type={transactionType}
            date={targetDate || undefined}
            categories={
              (transactionType === "income"
                ? config.incomeCategories
                : config.categories) || []
            }
            calendarDays={stats.days}
            periodStart={stats.periodStart}
            periodEnd={stats.periodEnd}
            onChangeType={(newType) => setTransactionType(newType)}
            onClose={() => {
              setIsAddTransactionOpen(false);
              setEditingTransaction(null);
              setTransactionPrefill(null);
            }}
            onSave={(e) => {
              const now = new Date();
              let timestamp: number;
              if (e.date) {
                const d = new Date(e.date);
                if (d.toDateString() === now.toDateString()) {
                  timestamp = Date.now();
                } else if (d.getHours() === 0 && d.getMinutes() === 0) {
                  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                  timestamp = d.getTime();
                } else {
                  timestamp = d.getTime();
                }
              } else {
                timestamp = Date.now();
              }
              const isBackdated = timestamp < Date.now() - 60000;

              // Remove date and splits from the object we spread into the transaction
              const { date: _date, ...transactionData } = e;

              addTransaction(
                {
                  ...transactionData,
                  type: transactionType,
                  isBackdated,
                },
                timestamp,
              );

              setIsAddTransactionOpen(false);
              setEditingTransaction(null);
              setTransactionPrefill(null);
            }}
            onCreateCategory={async (name, icon, type) => {
              if (!session || !config) return;
              try {
                const field =
                  type === "income" ? "incomeCategories" : "categories";
                const currentCategories = [...(config[field] || [])];
                const newCategory = { name, icon };
                currentCategories.push(newCategory);

                const newConfig = { ...config, [field]: currentCategories };
                setConfig(newConfig);
                await dataService.saveSettings(session.user.id, newConfig);
                return newCategory;
              } catch (_error) {
                addToast(t("errorSaving"), "error");
                return null;
              }
            }}
            t={t}
            currentLang={config.language as Language}
            userId={session?.user.id}
            config={config}
            prefill={transactionPrefill}
          />
        )}
        {isIncomeModalOpen && (
          <IncomeModal
            income={editingIncome}
            currentPeriodId={currentPeriodId}
            onClose={() => {
              setIsIncomeModalOpen(false);
              setEditingIncome(null);
            }}
            onSave={handleSaveIncome}
            onDelete={
              editingIncome
                ? () => handleDeleteIncome(editingIncome.id)
                : undefined
            }
            t={t}
            currency={config.currency}
            userId={session?.user.id}
            isPro={isPro(subscriptionStatus)}
            categories={config.incomeCategories}
            paymentMethods={config?.paymentMethods || []}
          />
        )}
        {viewingFixedExpense && (
          <FixedExpenseViewModal
            expense={viewingFixedExpense}
            currentPeriodId={currentPeriodId}
            onClose={() => setViewingFixedExpense(null)}
            onEdit={(expense) => {
              setViewingFixedExpense(null);
              setEditingFixedExpense(expense);
              setIsFixedExpenseModalOpen(true);
            }}
            onDelete={(id) => {
              handleDeleteFixedExpense(id);
              setViewingFixedExpense(null);
            }}
            t={t}
            currency={config?.currency || "kr"}
            config={config}
          />
        )}
        {viewingIncome && (
          <IncomeViewModal
            income={viewingIncome}
            currentPeriodId={currentPeriodId}
            onClose={() => setViewingIncome(null)}
            onEdit={(income) => {
              setViewingIncome(null);
              setEditingIncome(income);
              setIsIncomeModalOpen(true);
            }}
            onDelete={(id) => {
              handleDeleteIncome(id);
              setViewingIncome(null);
            }}
            t={t}
            currency={config?.currency || "kr"}
            config={config}
          />
        )}
        {isFixedExpenseModalOpen && (
          <FixedExpenseModal
            expense={editingFixedExpense}
            currentPeriodId={currentPeriodId}
            onClose={() => {
              setIsFixedExpenseModalOpen(false);
              setEditingFixedExpense(null);
            }}
            onSave={handleSaveFixedExpense}
            onDelete={
              editingFixedExpense
                ? () => handleDeleteFixedExpense(editingFixedExpense.id)
                : undefined
            }
            t={t}
            currency={config?.currency || "kr"}
            categories={config?.categories || []}
            userId={session?.user.id}
            isPro={isPro(subscriptionStatus)}
            paymentMethods={config?.paymentMethods || []}
          />
        )}
        {viewingMonthlySaving && (
          <MonthlySavingViewModal
            saving={viewingMonthlySaving}
            onClose={() => setViewingMonthlySaving(null)}
            onEdit={(saving) => {
              setViewingMonthlySaving(null);
              setEditingMonthlySaving(saving);
              setIsMonthlySavingModalOpen(true);
            }}
            onDelete={() => {
              handleDeleteMonthlySaving(viewingMonthlySaving.id);
              setViewingMonthlySaving(null);
            }}
            t={t}
            currency={config?.currency || "kr"}
            config={config}
          />
        )}
        {isMonthlySavingModalOpen && (
          <MonthlySavingModal
            saving={editingMonthlySaving}
            currentPeriodId={currentPeriodId}
            onClose={() => {
              setIsMonthlySavingModalOpen(false);
              setEditingMonthlySaving(null);
            }}
            onSave={handleSaveMonthlySaving}
            onDelete={
              editingMonthlySaving
                ? () => handleDeleteMonthlySaving(editingMonthlySaving.id)
                : undefined
            }
            t={t}
            currency={config?.currency || "kr"}
            userId={session?.user.id}
            isPro={isPro(subscriptionStatus)}
            paymentMethods={config?.paymentMethods || []}
          />
        )}
        {isCalculatorOpen && (
          <CalculatorModal
            isOpen={isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
            t={t}
          />
        )}
        
        {legalModal.isOpen && (
          <LegalModal
            isOpen={legalModal.isOpen}
            type={legalModal.type}
            onClose={() =>
              setLegalModal((prev) => ({ ...prev, isOpen: false }))
            }
            t={t}
          />
        )}
        {config && (
          <SearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            transactions={transactions}
            config={config}
            onNavigate={handleNavigate}
            onViewTransaction={setViewingTransaction}
          />
        )}
        {isLocked && (
          <PinLockScreen
            mode="unlock"
            t={t}
            onSuccess={() => setIsLocked(false)}
          />
        )}
        {isVariableUpdateModalOpen && itemToUpdateVariable && config && (
          <VariableAmountUpdateModal
            isOpen={isVariableUpdateModalOpen}
            onClose={() => {
              setIsVariableUpdateModalOpen(false);
              setItemToUpdateVariable(null);
            }}
            item={itemToUpdateVariable}
            onSave={(amount) => {
              handleSaveVariableOverride(itemToUpdateVariable, amount);
            }}
            config={config}
            t={t}
            periodName={stats?.periodName}
          />
        )}
      </AnimatePresence>
      <AddToHomeScreenModal t={t} theme={config?.appIconTheme} language={(config?.language as string) || landingLanguage} />
      <Analytics />
    </div>
  );
}
