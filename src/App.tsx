/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
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
  MonthlySaving,
  AppNotification,
} from "./types";
import {
  AlertCircle,
  Loader2,
  LogOut,
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  Mic,
  Square,
  Plus,
  X,
} from "lucide-react";
import { useVoiceExpense } from "./hooks/useVoiceExpense";
import { parseQuickExpense } from "./utils/expenseAiParser";
import { SmartInput } from "./components/ui";
import { applyThemeColor } from "./utils/theme";


import { CalendarModal } from './components/CalendarModal';
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
import { LogView } from "./components/LogView";
import { AnalysisView } from "./components/AnalysisView";
import { TodayView } from "./components/TodayView";
import { AppHeader } from "./components/AppHeader";
import { DejziSummaryModal } from "./components/DejziSummaryModal";
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
import { ResetPasswordModal } from "./components/ResetPasswordModal";

import { LegalModal } from "./components/LegalModals";
import { PublicLegalPage, LegalDocType } from "./components/PublicLegalPage";
import { PullToRefresh } from "./components/PullToRefresh";
import { Session } from "@supabase/supabase-js";
import { ToastContainer, ToastMessage, ToastType } from "./components/Toast";
import { ConfirmModal } from "./components/ConfirmModal";
import { ReceiptCameraModal } from "./components/ReceiptCameraModal";

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
import { forceUnlockAllScroll } from "./hooks/useScrollLock";

// --- Types ---

type Tab = "today" | "transactions" | "analysis" | "budget" | "profile" | "settings" | "notifications";

const normalizePaymentMethods = (methods: any[] | null | undefined): any[] => {
  if (!methods || !Array.isArray(methods) || methods.length === 0) {
    return DEFAULT_PAYMENT_METHODS;
  }
  return methods.map(m => {
    if (typeof m === 'string') {
      const found = DEFAULT_PAYMENT_METHODS.find(dm => dm.name.toLowerCase() === m.toLowerCase());
      if (found) return found;
      if (m.toLowerCase() === 'e-faktura' || m.toLowerCase() === 'faktura') {
        return { name: "Faktura", icon: "receipt", color: "#f59e0b" };
      }
      if (m.toLowerCase() === 'kort') {
        return { name: "Kortbetalning", icon: "credit-card", color: "#ec4899" };
      }
      return { name: m, icon: 'credit-card', color: '#6366f1' };
    }
    return {
      name: m.name || '',
      icon: m.icon || 'credit-card',
      color: m.color || '#6366f1'
    };
  });
};

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
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0].toLowerCase();
      if (['en', 'sv'].includes(firstSegment)) {
        localStorage.setItem('app_language', firstSegment);
        return firstSegment as Language;
      }
    }
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
  const [_isAtTop, setIsAtTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY <= 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    let tabSegment = 'today';
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0].toLowerCase();
      if (['en', 'sv'].includes(firstSegment)) {
        tabSegment = pathSegments[1] || 'today';
      } else {
        tabSegment = pathSegments[0];
      }
    }
    if (["today", "transactions", "analysis", "budget", "profile", "settings", "notifications"].includes(tabSegment)) {
      return tabSegment as Tab;
    }
    return "today";
  });

  useEffect(() => {
    // Safety guard: ensure no lingering scroll lock persists across views or after fast modal closes
    forceUnlockAllScroll();
  }, [activeTab]);
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
  const [budgetSection, setBudgetSection] = useState<string | null>(null);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [plusQuickText, setPlusQuickText] = useState("");
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);
  const [plusSuccessMsg, setPlusSuccessMsg] = useState<{ text: string; transcript?: string } | null>(null);
  const plusQuickInputRef = useRef<HTMLInputElement>(null);
  const plusCameraInputRef = useRef<HTMLInputElement>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [isReceiptCameraOpen, setIsReceiptCameraOpen] = useState(false);

  const prepareReceiptImage = async (file: File): Promise<{ base64: string; mimeType: string }> => {
    try {
      const resized = await new Promise<{ base64: string; mimeType: string }>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 1024;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas context not available"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL("image/jpeg", 0.85);
          resolve({
            base64: base64.includes(",") ? base64.split(",")[1] : base64,
            mimeType: "image/jpeg"
          });
          URL.revokeObjectURL(objectUrl);
        };
        img.onerror = () => {
          reject(new Error("Failed to load image"));
          URL.revokeObjectURL(objectUrl);
        };
        img.src = objectUrl;
      });
      return resized;
    } catch {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const res = reader.result as string;
          resolve(res.includes(",") ? res.split(",")[1] : res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return { base64, mimeType: file.type || "image/jpeg" };
    }
  };

  const {
    isRecording,
    isAudioTranscribing,
    error: plusVoiceError,
    toggleRecording,
    stopRecordingAndProcess
  } = useVoiceExpense({
    isEn: config?.language === "en",
    onTextUpdate: (text) => setPlusQuickText(text),
    onSuccess: async (result) => {
      if (result.items && result.items.length > 0) {
        for (const item of result.items) {
          if (item.amount > 0) {
            const defaultCategory = config?.language === "en" ? "Uncategorized" : "Okategoriserat";
            await addTransaction({
              amount: item.amount,
              type: "expense",
              category: item.category?.trim() || defaultCategory,
              merchant: item.merchant?.trim() || (config?.language === "en" ? "Voice expense" : "Röstutgift"),
              timestamp: Date.now(),
              tags: []
            });
          }
        }
        feedback.success();
        setPlusSuccessMsg({
          text: config?.language === "en" ? "Expense added" : "Utgift tillagd"
        });
        setPlusQuickText("");
        setTimeout(() => {
          setPlusSuccessMsg(null);
          setIsPlusMenuOpen(false);
        }, 1500);
      }
    }
  });

  const handlePlusKvittoClick = () => {
    feedback.tap();
    setIsPlusMenuOpen(false);
    setIsReceiptCameraOpen(true);
  };

  const handleReceiptFileCaptured = async (file: File) => {
    setIsScanningReceipt(true);
    setPlusSuccessMsg({ text: config?.language === "en" ? "📷 Scanning receipt..." : "📷 Läser av kvitto..." });
    feedback.tap();

    try {
      const { base64, mimeType } = await prepareReceiptImage(file);
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { image: base64, mimeType },
      });

      if (error || !data || !data.amount || Number(data.amount) <= 0) {
        setIsScanningReceipt(false);
        setIsReceiptCameraOpen(false);
        setPlusSuccessMsg(null);
        setTransactionType("expense");
        setTargetDate(new Date());
        setIsAddTransactionOpen(true);
        setIsPlusMenuOpen(false);
        return;
      }

      const amount = Number(data.amount);
      const merchant = data.merchant || (config?.language === "en" ? "Receipt" : "Kvitto");
      const category = data.category || (config?.language === "en" ? "Uncategorized" : "Okategoriserat");

      await addTransaction({
        amount,
        type: "expense",
        category: category.trim(),
        merchant: merchant.trim(),
        timestamp: Date.now(),
        tags: []
      });

      feedback.success();
      setIsReceiptCameraOpen(false);
      setPlusSuccessMsg({
        text: config?.language === "en" ? "Expense added" : "Utgift tillagd"
      });
      setTimeout(() => {
        setPlusSuccessMsg(null);
        setIsPlusMenuOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Auto receipt scan error:", err);
      setIsReceiptCameraOpen(false);
      setTransactionType("expense");
      setTargetDate(new Date());
      setIsAddTransactionOpen(true);
      setIsPlusMenuOpen(false);
    } finally {
      setIsScanningReceipt(false);
    }
  };

  const handlePlusCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleReceiptFileCaptured(file);
    if (e.target) e.target.value = "";
  };

  const handlePlusQuickExpenseSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = plusQuickText.trim();
    if (!clean || isSubmittingQuick) return;

    setIsSubmittingQuick(true);
    try {
      const defaultCategory = config?.language === "en" ? "Uncategorized" : "Okategoriserat";
      const parsed = await parseQuickExpense(
        clean,
        config?.categories || [],
        transactions,
        defaultCategory
      );

      if (parsed.amount && parsed.amount > 0) {
        await addTransaction({
          amount: parsed.amount,
          type: "expense",
          category: parsed.category || defaultCategory,
          merchant: parsed.merchant || (config?.language === "en" ? "Quick Add" : "Snabbköp"),
          timestamp: Date.now(),
          tags: []
        });

        feedback.success();
        setPlusSuccessMsg({
          text: config?.language === "en" ? "Expense added" : "Utgift tillagd"
        });
        setPlusQuickText("");
        setTimeout(() => {
          setPlusSuccessMsg(null);
          setIsPlusMenuOpen(false);
        }, 1500);
      }
    } catch (_err) {
      console.error("Quick expense failed", _err);
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  const handlePlusMicClick = async () => {
    if (isRecording) {
      const res = await stopRecordingAndProcess(plusQuickText);
      if (res && !res.handled && plusQuickText.trim()) {
        handlePlusQuickExpenseSubmit();
      }
    } else {
      toggleRecording(plusQuickText);
    }
  };
  const [transactionPrefill, setTransactionPrefill] = useState<any>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | "savings"
  >("expense");
  const [isAddIncomeOpen, setIsAddIncomeOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [viewingTransaction, setViewingTransaction] =
    useState<Transaction | null>(null);
  const [searchModalOpenBeforeViewing, setSearchModalOpenBeforeViewing] = useState(false);

  const handleCloseTransactionView = () => {
    setViewingTransaction(null);
    if (searchModalOpenBeforeViewing) {
      setIsSearchModalOpen(true);
      setSearchModalOpenBeforeViewing(false);
    }
  };
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
  const [isDejziSummaryOpen, setIsDejziSummaryOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
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

  const [publicLegalDoc, setPublicLegalDoc] = useState<LegalDocType | null>(() => {
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (path.includes('privacy') || hash.includes('privacy') || path.includes('integritet')) return 'privacy';
    if (path.includes('terms') || hash.includes('terms') || path.includes('villkor')) return 'terms';
    if (path.includes('cookie') || hash.includes('cookie')) return 'cookies';
    return null;
  });

  useEffect(() => {
    const checkLegalUrl = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('privacy') || hash.includes('privacy') || path.includes('integritet')) {
        setPublicLegalDoc('privacy');
      } else if (path.includes('terms') || hash.includes('terms') || path.includes('villkor')) {
        setPublicLegalDoc('terms');
      } else if (path.includes('cookie') || hash.includes('cookie')) {
        setPublicLegalDoc('cookies');
      } else if (path === '/' || path === '') {
        setPublicLegalDoc(null);
      }
    };

    window.addEventListener('popstate', checkLegalUrl);
    window.addEventListener('hashchange', checkLegalUrl);
    return () => {
      window.removeEventListener('popstate', checkLegalUrl);
      window.removeEventListener('hashchange', checkLegalUrl);
    };
  }, []);

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

  // Instantly restore previous scroll position when switching to any tab
  useLayoutEffect(() => {
    const savedY = tabScrollPositions.current[activeTab] ?? 0;
    window.scrollTo({ top: savedY, behavior: "instant" as any });

    const raf = requestAnimationFrame(() => {
      window.scrollTo({ top: savedY, behavior: "instant" as any });
    });
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  const handleLegalClick = (
    type: "privacy" | "terms" | "cookies" | "contact",
  ) => {
    if (type === 'privacy' || type === 'terms' || type === 'cookies') {
      try {
        window.history.pushState({}, '', `/${type}`);
      } catch (_e) {
        // ignore
      }
      setPublicLegalDoc(type);
    } else {
      setLegalModal({ isOpen: true, type });
    }
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
              session.user.email === "hej@dejz.se" || session.user.email === "kevinwpts@gmail.com" ? "admin" : "user",
            language: landingLanguage,
            dark_mode: true,
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

        const LEGACY_EXPENSE_RENAMES: Record<string, { name: string; icon: string; color: string }> = {
          'Shopping & Kläder': { name: 'Shopping', icon: 'shopping', color: '#ec4899' },
          'Restaurang & Fika': { name: 'Restaurang', icon: 'utensils', color: '#f97316' },
          'Streaming & Media': { name: 'Streaming', icon: 'tv', color: '#8b5cf6' },
          'Boende & Hushåll': { name: 'Boende', icon: 'home', color: '#6366f1' },
          'Transport & Pendling': { name: 'Transport', icon: 'car', color: '#0ea5e9' },
          'Abonnemang & Tjänster': { name: 'Abonnemang', icon: 'smartphone', color: '#3b82f6' },
          'Nöje & Fritid': { name: 'Nöjen', icon: 'drama', color: '#a855f7' },
          'Träning & Hälsa': { name: 'Hälsa', icon: 'dumbbell', color: '#10b981' },
          'Räkningar & Avgifter': { name: 'Räkningar', icon: 'receipt', color: '#64748b' },
          'Resor & Semester': { name: 'Resor', icon: 'plane', color: '#06b6d4' },
        };

        const migrateExpenseCategories = (categories: any[]) => {
          const { migrated, hasChanged: iconChanged } = migrateCategories(categories);
          let hasChanged = iconChanged;
          const renamedPairs: { oldName: string; newName: string }[] = [];

          for (let i = 0; i < migrated.length; i++) {
            const cat = migrated[i];
            const oldName = (cat.name || '').trim();
            if (LEGACY_EXPENSE_RENAMES[oldName]) {
              const target = LEGACY_EXPENSE_RENAMES[oldName];
              migrated[i] = {
                ...cat,
                name: target.name,
                icon: target.icon || cat.icon,
                color: cat.color || target.color,
              };
              renamedPairs.push({ oldName, newName: target.name });
              hasChanged = true;
            }
          }

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
              color: "#0284c7",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, newCat);
            } else {
              migrated.push(newCat);
            }
            hasChanged = true;
          }

          const hasStreaming = migrated.some(
            (c) =>
              (c.name || '').trim().toLowerCase().includes("streaming") ||
              (c.name || '').trim().toLowerCase().includes("stream"),
          );
          if (!hasStreaming && migrated.length > 0) {
            const ovrigtIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "övrigt",
            );
            const newCat = {
              name: "Streaming",
              icon: "tv",
              color: "#8b5cf6",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, newCat);
            } else {
              migrated.push(newCat);
            }
            hasChanged = true;
          }

          const hasFika = migrated.some(
            (c) => (c.name || '').trim().toLowerCase() === "fika",
          );
          if (!hasFika && migrated.length > 0) {
            const restIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "restaurang",
            );
            const fikaCat = {
              name: "Fika",
              icon: "coffee",
              color: "#d97706",
            };
            if (restIdx !== -1) {
              migrated.splice(restIdx + 1, 0, fikaCat);
            } else {
              migrated.push(fikaCat);
            }
            hasChanged = true;
          }

          const hasAbonnemang = migrated.some(
            (c) => (c.name || '').trim().toLowerCase().includes("abonnemang"),
          );
          if (!hasAbonnemang && migrated.length > 0) {
            const ovrigtIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "övrigt",
            );
            const abonCat = {
              name: "Abonnemang",
              icon: "smartphone",
              color: "#3b82f6",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, abonCat);
            } else {
              migrated.push(abonCat);
            }
            hasChanged = true;
          }

          return { migrated, hasChanged, renamedPairs };
        };

        const { migrated: migratedExpense, hasChanged: expenseChanged, renamedPairs: authRenamedPairs } =
          migrateExpenseCategories(dbSettings.categories || []);
        const { migrated: migratedIncome, hasChanged: incomeChanged } =
          migrateCategories(dbSettings.incomeCategories || []);

        if (expenseChanged || incomeChanged) {
          console.log("[Migration] Migrated categories back to clean standards");
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

          if (authRenamedPairs && authRenamedPairs.length > 0) {
            for (const pair of authRenamedPairs) {
              dataService.renameCategory(session.user.id, pair.oldName, pair.newName).catch(() => {});
            }
          }
        }

        let languageToUse = dbSettings.language;
        const pathSegments = window.location.pathname.split('/').filter(Boolean);
        const urlLang = pathSegments.length > 0 && ['en', 'sv'].includes(pathSegments[0].toLowerCase()) ? pathSegments[0].toLowerCase() : null;

        if (urlLang && urlLang !== languageToUse) {
          languageToUse = urlLang;
          dataService.saveSettings(session.user.id, { ...dbSettings, language: urlLang });
        } else if (!languageToUse && landingLanguage) {
          languageToUse = landingLanguage;
          dataService.saveSettings(session.user.id, { ...dbSettings, language: landingLanguage });
        } else if (languageToUse && languageToUse !== landingLanguage) {
          setLandingLanguage(languageToUse as Language);
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
            (dbSettings.darkMode !== undefined && dbSettings.darkMode !== null) ? dbSettings.darkMode : true,
          themeMode: dbSettings.themeMode || 'system',
          quickChoices: dbSettings.quickChoices || [],
          savingsPot: dbSettings.savingsPot || 0,
          savingsGoals: dbSettings.savingsGoals || [],
          totalSavedLifetime: dbSettings.totalSavedLifetime || 0,
          paymentMethods: normalizePaymentMethods(dbSettings.paymentMethods),
          surplusIncome: dbSettings.surplusIncome || 0,
          monthlySavings: dbSettings.monthlySavings || 0,
          monthlySavingsItems: dbSettings.monthlySavingsItems || [],
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
              : true,
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
    profile?.role === "admin" || session?.user?.email === "hej@dejz.se" || session?.user?.email === "kevinwpts@gmail.com";

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

  // Continuously record scroll position for current active tab (ignore while onboarding)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (activeTab && !isOnboarding) {
            tabScrollPositions.current[activeTab] = window.scrollY;
          }
          setIsAtTop(window.scrollY <= 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeTab, isOnboarding]);

  // When exiting onboarding, always start at the very top of Home
  useEffect(() => {
    if (!isOnboarding) {
      tabScrollPositions.current['today'] = 0;
      window.scrollTo({ top: 0, behavior: 'instant' as any });
      const t1 = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as any }), 50);
      const t2 = setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as any }), 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOnboarding]);

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
    if (type === "success" || type === "info") {
      return; // Quietly ignore success and info toasts to keep the app clean, quiet, and modern
    }
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

  // --- Theme Logic: System (default) / Light / Dark ---
  useEffect(() => {
    const applyTheme = () => {
      let isDark = false;
      const themeMode = config?.themeMode || 'system';

      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        // System preference
        if (typeof window !== 'undefined' && window.matchMedia) {
          isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
      }

      document.documentElement.classList.remove("dark", "light");
      document.body.classList.remove("dark", "light");

      if (isDark) {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.add("light");
        document.body.classList.add("light");
      }

      const userThemeHex = config?.themeColor || '#635BFF';
      applyThemeColor(userThemeHex, isDark);

      const themeColor = isDark ? "#232323" : "#F2EFE8";
      document.documentElement.style.backgroundColor = themeColor;
      document.body.style.backgroundColor = themeColor;

      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      if (metaTags.length > 0) {
        metaTags.forEach((tag) => tag.setAttribute("content", themeColor));
      } else {
        const meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", themeColor);
        document.head.appendChild(meta);
      }
    };

    applyTheme();

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = () => {
        if (!config?.themeMode || config.themeMode === 'system') {
          applyTheme();
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleSystemThemeChange);
        return () => mediaQuery.removeListener(handleSystemThemeChange);
      }
    }
  }, [config?.themeMode, config?.darkMode, config?.themeColor]);

  // --- URL Routing & Language Subpath Sync ---
  useEffect(() => {
    const handleUrlChange = () => {
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      let detectedLang: Language = 'sv';
      let tabSegment = 'today';
      
      if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0].toLowerCase();
        if (['en', 'sv'].includes(firstSegment)) {
          detectedLang = firstSegment as Language;
          tabSegment = pathSegments[1] || 'today';
        } else {
          tabSegment = pathSegments[0];
        }
      }
      
      if (detectedLang !== landingLanguage) {
        setLandingLanguage(detectedLang);
        localStorage.setItem('app_language', detectedLang);
      }
      
      if (["today", "transactions", "analysis", "budget", "profile", "settings", "notifications"].includes(tabSegment)) {
        if (tabSegment !== activeTab) {
          setActiveTab(tabSegment as Tab);
        }
      } else if (activeTab !== 'today') {
        setActiveTab('today');
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [landingLanguage, activeTab]);

  useEffect(() => {
    const currentLang = config?.language || landingLanguage;
    let newPath = '';
    
    if (showLanding) {
      newPath = currentLang === 'en' ? '/en' : '/';
    } else {
      if (currentLang === 'en') {
        newPath = '/en';
        if (activeTab && activeTab !== 'today') {
          newPath += `/${activeTab}`;
        }
      } else {
        newPath = activeTab && activeTab !== 'today' ? `/${activeTab}` : '/';
      }
    }
    
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [config?.language, landingLanguage, activeTab, showLanding]);

  // --- Auth Logic ---
  useEffect(() => {
    const demoSessionStr = localStorage.getItem('dejz_demo_session');
    if (demoSessionStr) {
      try {
        const demoSession = JSON.parse(demoSessionStr);
        const demoVersion = localStorage.getItem('demo_data_version');
        if (demoVersion !== 'v6_historical_rich' && demoVersion !== 'v_fresh_test_account') {
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
      
      if (_event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordOpen(true);
      }
      
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

    const hash = window.location.hash;
    const search = window.location.search;

    if (
      hash.includes('type=recovery') ||
      search.includes('type=recovery')
    ) {
      setIsResetPasswordOpen(true);
      setShowLanding(false);
      setShowWelcome(false);
    }

    if (hash.includes('error=') || search.includes('error=')) {
      try {
        const hashParams = new URLSearchParams(hash.replace(/^#/, '?'));
        const searchParams = new URLSearchParams(search);
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
        if (errorDesc) {
          addToast(decodeURIComponent(errorDesc.replace(/\+/g, ' ')), 'error');
        }
      } catch (err) {
        console.warn('Error parsing recovery error:', err);
      }
    }

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

  const handleFacebookLogin = async () => {
    try {
      let inIframe = false;
      try {
        inIframe = window.self !== window.top;
      } catch (_e) {
        inIframe = true;
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: window.location.origin,
          skipBrowserRedirect: inIframe,
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
        msg = "Facebook-inloggning är inte aktiverad i din Supabase-instrumentpanel ännu.";
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
      darkMode: true,
      themeMode: 'system',
      quickChoices: [],
      savingsPot: 0,
      savingsGoals: [],
      totalSavedLifetime: 0,
      surplusIncome: 0,
      monthlySavings: 0,
      monthlySavingsItems: [],
      includeFixedExpensesInAnalysis: true,
      showFixedExpensesInTodayView: true,
      showFixedExpensesInCalendar: true,
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
            session.user.email === "hej@dejz.se" || session.user.email === "kevinwpts@gmail.com" ? "admin" : "user",
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
          dark_mode: true,
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
        // Migrate category emojis back to Lucide icon names
        const migrateCategories = (cats: any[]) => {
          let hasChanged = false;
          const migrated = cats.map((cat) => {
            if (cat.icon && isEmojiString(cat.icon)) {
              hasChanged = true;
              return { ...cat, icon: resolveLucideIcon(cat.icon) };
            }
            return cat;
          });
          return { migrated, hasChanged };
        };

        const LEGACY_EXPENSE_RENAMES: Record<string, { name: string; icon: string; color: string }> = {
          'Shopping & Kläder': { name: 'Shopping', icon: 'shopping', color: '#ec4899' },
          'Restaurang & Fika': { name: 'Restaurang', icon: 'utensils', color: '#f97316' },
          'Streaming & Media': { name: 'Streaming', icon: 'tv', color: '#8b5cf6' },
          'Boende & Hushåll': { name: 'Boende', icon: 'home', color: '#6366f1' },
          'Transport & Pendling': { name: 'Transport', icon: 'car', color: '#0ea5e9' },
          'Abonnemang & Tjänster': { name: 'Abonnemang', icon: 'smartphone', color: '#3b82f6' },
          'Nöje & Fritid': { name: 'Nöjen', icon: 'drama', color: '#a855f7' },
          'Träning & Hälsa': { name: 'Hälsa', icon: 'dumbbell', color: '#10b981' },
          'Räkningar & Avgifter': { name: 'Räkningar', icon: 'receipt', color: '#64748b' },
          'Resor & Semester': { name: 'Resor', icon: 'plane', color: '#06b6d4' },
        };

        const migrateExpenseCategories = (cats: any[]) => {
          const { migrated, hasChanged: iconChanged } = migrateCategories(cats);
          let hasChanged = iconChanged;
          const renamedPairs: { oldName: string; newName: string }[] = [];

          for (let i = 0; i < migrated.length; i++) {
            const cat = migrated[i];
            const oldName = (cat.name || '').trim();
            if (LEGACY_EXPENSE_RENAMES[oldName]) {
              const target = LEGACY_EXPENSE_RENAMES[oldName];
              migrated[i] = {
                ...cat,
                name: target.name,
                icon: target.icon || cat.icon,
                color: cat.color || target.color,
              };
              renamedPairs.push({ oldName, newName: target.name });
              hasChanged = true;
            }
          }

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
              color: "#0284c7",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, newCat);
            } else {
              migrated.push(newCat);
            }
            hasChanged = true;
          }

          const hasStreaming = migrated.some(
            (c) =>
              (c.name || '').trim().toLowerCase().includes("streaming") ||
              (c.name || '').trim().toLowerCase().includes("stream"),
          );
          if (!hasStreaming && migrated.length > 0) {
            const ovrigtIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "övrigt",
            );
            const newCat = {
              name: "Streaming",
              icon: "tv",
              color: "#8b5cf6",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, newCat);
            } else {
              migrated.push(newCat);
            }
            hasChanged = true;
          }

          const hasFika = migrated.some(
            (c) => (c.name || '').trim().toLowerCase() === "fika",
          );
          if (!hasFika && migrated.length > 0) {
            const restIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "restaurang",
            );
            const fikaCat = {
              name: "Fika",
              icon: "coffee",
              color: "#d97706",
            };
            if (restIdx !== -1) {
              migrated.splice(restIdx + 1, 0, fikaCat);
            } else {
              migrated.push(fikaCat);
            }
            hasChanged = true;
          }

          const hasAbonnemang = migrated.some(
            (c) => (c.name || '').trim().toLowerCase().includes("abonnemang"),
          );
          if (!hasAbonnemang && migrated.length > 0) {
            const ovrigtIdx = migrated.findIndex(
              (c) => (c.name || '').trim().toLowerCase() === "övrigt",
            );
            const abonCat = {
              name: "Abonnemang",
              icon: "smartphone",
              color: "#3b82f6",
            };
            if (ovrigtIdx !== -1) {
              migrated.splice(ovrigtIdx, 0, abonCat);
            } else {
              migrated.push(abonCat);
            }
            hasChanged = true;
          }

          return { migrated, hasChanged, renamedPairs };
        };

        const rawCategories = dbProfile.categories && dbProfile.categories.length > 0
          ? dbProfile.categories
          : DEFAULT_EXPENSE_CATEGORIES;

        const rawIncomeCategories = dbProfile.income_categories && dbProfile.income_categories.length > 0
          ? dbProfile.income_categories
          : DEFAULT_INCOME_CATEGORIES;

        const { migrated: migratedExpense, hasChanged: expenseChanged, renamedPairs: fetchRenamedPairs } =
          migrateExpenseCategories(rawCategories);
        const { migrated: migratedIncome, hasChanged: incomeChanged } =
          migrateCategories(rawIncomeCategories);

        if (expenseChanged || incomeChanged) {
          console.log("[Migration fetchData] Migrated categories back to clean standards");
          dbProfile.categories = migratedExpense;
          dbProfile.income_categories = migratedIncome;

          if (fetchRenamedPairs && fetchRenamedPairs.length > 0) {
            for (const pair of fetchRenamedPairs) {
              dataService.renameCategory(session.user.id, pair.oldName, pair.newName).catch(() => {});
            }
          }
          
          // Async save migrated settings back
          dataService.saveSettings(session.user.id, {
            currency: dbProfile.currency === "SEK" ? "kr" : dbProfile.currency,
            language: dbProfile.language,
            payday: dbProfile.payday,
            paydayType: dbProfile.payday_type || PaydayType.TWENTY_FIFTH,
            paydayBeforeWeekend: dbProfile.payday_before_weekend,
            categories: migratedExpense,
            incomeCategories: migratedIncome,
            initialSpent: Number(dbProfile.initial_spent || 0),
            notifications: dbProfile.notifications,
            securityLock: dbProfile.security_lock,
            darkMode: dbProfile.dark_mode !== false,
            savingsPot: dbProfile.savings_pot || 0,
            savingsGoals: dbProfile.savings_goals || [],
            totalSavedLifetime: dbProfile.total_saved_lifetime || 0,
            surplusIncome: dbProfile.surplus_income || 0,
            monthlySavings: dbProfile.monthly_savings || 0,
            monthlySavingsItems: dbProfile.monthly_savings_items || [],
            includeFixedExpensesInAnalysis: dbProfile.include_fixed_expenses_in_analysis !== false,
            showFixedExpensesInTodayView: dbProfile.show_fixed_expenses_in_today_view !== false,
            showFixedExpensesInCalendar: dbProfile.show_fixed_expenses_in_calendar !== false,
            appIconTheme: dbProfile.app_icon_theme,
          }).catch((err) => {
            console.error("[Migration fetchData] Failed to save migrated settings:", err);
          });
        }

        const mappedConfig = {
          currency: dbProfile.currency === "SEK" ? "kr" : dbProfile.currency,
          language: dbProfile.language,
          payday: dbProfile.payday,
          paydayType: dbProfile.payday_type || PaydayType.TWENTY_FIFTH,
          paydayBeforeWeekend: dbProfile.payday_before_weekend,
          categories: dbProfile.categories,
          incomeCategories: dbProfile.income_categories,
          initialSpent: Number(dbProfile.initial_spent || 0),
          notifications: dbProfile.notifications,
          securityLock: dbProfile.security_lock,
          darkMode: (dbProfile.dark_mode !== undefined && dbProfile.dark_mode !== null) ? dbProfile.dark_mode : true,
          themeMode: dbProfile.theme_mode || 'system',
          quickChoices: dbProfile.quick_choices || [],
          savingsPot: dbProfile.savings_pot || 0,
          paymentMethods: normalizePaymentMethods(dbProfile.payment_methods),
          surplusIncome: dbProfile.surplus_income || 0,
          monthlySavings: dbProfile.monthly_savings || dbProfile.monthlySavings || config?.monthlySavings || 0,
          monthlySavingsItems: (dbProfile.monthly_savings_items && dbProfile.monthly_savings_items.length > 0)
            ? dbProfile.monthly_savings_items
            : (dbProfile.monthlySavingsItems && dbProfile.monthlySavingsItems.length > 0)
              ? dbProfile.monthlySavingsItems
              : (config?.monthlySavingsItems && config.monthlySavingsItems.length > 0)
                ? config.monthlySavingsItems
                : (dbProfile.savings_goals || dbProfile.savingsGoals || config?.savingsGoals || []).filter((g: any) => Number(g.targetAmount) > 0).map((g: any) => ({
                    id: g.id || crypto.randomUUID(),
                    name: g.title || 'Månadssparande',
                    amount: Number(g.targetAmount) || 0,
                    icon: g.icon || 'PiggyBank',
                    logo: g.logo,
                    deductionDay: dbProfile.payday || 25,
                    frequency: Frequency.MONTHLY,
                  })),
          savingsGoals: (dbProfile.savings_goals && dbProfile.savings_goals.length > 0)
            ? dbProfile.savings_goals
            : (dbProfile.savingsGoals && dbProfile.savingsGoals.length > 0)
              ? dbProfile.savingsGoals
              : (config?.savingsGoals || []),
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
              : true,
        };

        // Ensure monthlySavings is consistent with monthlySavingsItems
        if (mappedConfig.monthlySavingsItems && mappedConfig.monthlySavingsItems.length > 0) {
          const itemsSum = mappedConfig.monthlySavingsItems.reduce(
            (sum: number, item: any) => sum + (Number(item.amount) || 0),
            0,
          );
          if (itemsSum > 0) {
            mappedConfig.monthlySavings = itemsSum;
          }
        } else if (mappedConfig.monthlySavings > 0) {
          mappedConfig.monthlySavingsItems = [{
            id: crypto.randomUUID(),
            name: mappedConfig.language === 'en' ? 'Monthly savings' : 'Månadssparande',
            amount: mappedConfig.monthlySavings,
            icon: 'PiggyBank',
            deductionDay: mappedConfig.payday || 25,
            frequency: Frequency.MONTHLY,
          }];
        }

        setConfig(mappedConfig);
      } else {
        const newConfig = {
          ...defaultConfig,
          darkMode: true,
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

  const { start: currentPeriodStart, end: currentPeriodEnd } = useMemo(() => {
    const tempBounds = getPeriodBoundaries(
      currentPeriodDate,
      paydayType,
      paydaySetting,
      adjustment,
    );
    const pId = getPeriodId(tempBounds.start);
    const actualToday = new Date();
    actualToday.setHours(0, 0, 0, 0);

    if (config?.lockedPeriods?.[pId] && new Date(config.lockedPeriods[pId].end) < actualToday) {
      return {
        start: new Date(config.lockedPeriods[pId].start),
        end: new Date(config.lockedPeriods[pId].end),
      };
    }
    return tempBounds;
  }, [currentPeriodDate, paydayType, paydaySetting, adjustment, config?.lockedPeriods]);

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
    actualToday.setHours(0, 0, 0, 0);

    let registrationDate: Date | null = null;
    if (session?.user?.created_at) {
      const d = new Date(session.user.created_at);
      if (!isNaN(d.getTime())) registrationDate = d;
    }
    if (!registrationDate && profile?.created_at) {
      const d = new Date(profile.created_at);
      if (!isNaN(d.getTime())) registrationDate = d;
    }

    const earliest = registrationDate || now;

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const earliestYear = earliest.getFullYear();
    const earliestMonth = earliest.getMonth();

    const monthDiff = (nowYear - earliestYear) * 12 + (nowMonth - earliestMonth);
    const startOffset = -Math.max(0, monthDiff);
    const endOffset = 24;

    const newLockedPeriods = { ...(config?.lockedPeriods || {}) };
    let hasNewLocks = false;

    for (let i = startOffset; i <= endOffset; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const tempBounds = getPeriodBoundaries(
        d,
        paydayType,
        paydaySetting,
        adjustment,
      );
      const pId = getPeriodId(tempBounds.start);

      let start = tempBounds.start;
      let end = tempBounds.end;

      if (registrationDate && end < registrationDate) {
        continue;
      }
      let name = getPeriodName(
        start,
        end,
        paydayType,
        config?.language || "sv-SE",
      );

      if (newLockedPeriods[pId]) {
        start = new Date(newLockedPeriods[pId].start);
        end = new Date(newLockedPeriods[pId].end);
        name = newLockedPeriods[pId].name;
      } else if (end < actualToday) {
        newLockedPeriods[pId] = {
          start: start.toISOString(),
          end: end.toISOString(),
          name,
        };
        hasNewLocks = true;
      }

      p.push({
        date: new Date(d.getFullYear(), d.getMonth(), 1),
        start,
        end,
        name,
        isCurrent: actualToday >= start && actualToday <= end,
        isFuture: actualToday < start,
        periodId: pId,
      });
    }

    if (hasNewLocks && config && session?.user?.id) {
      const updatedConfig = { ...config, lockedPeriods: newLockedPeriods };
      setConfig(updatedConfig);
      dataService.saveSettings(session.user.id, updatedConfig).catch(() => {});
    }

    return p;
  }, [paydayType, paydaySetting, adjustment, config?.language, session?.user?.created_at, profile?.created_at, transactions, config?.lockedPeriods, session?.user?.id]);

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

        const tempBounds = getPeriodBoundaries(
          referenceDate,
          paydayType,
          paydaySetting,
          adjustment,
        );
        const pId = getPeriodId(tempBounds.start);
        let periodStart = tempBounds.start;
        let periodEnd = tempBounds.end;

        if (config.lockedPeriods?.[pId] && new Date(config.lockedPeriods[pId].end) < actualToday) {
          periodStart = new Date(config.lockedPeriods[pId].start);
          periodEnd = new Date(config.lockedPeriods[pId].end);
        }

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
        const savingsFromItems = config.monthlySavingsItems?.reduce(
          (sum, item) => sum + getAmountForPeriod(item),
          0,
        ) || 0;

        const explicitMonthlySavings = savingsFromItems > 0 
          ? savingsFromItems 
          : (Number(config.monthlySavings) || 0);

        const fallbackSavingsGoals =
          explicitMonthlySavings === 0 && config.savingsGoals?.length
            ? config.savingsGoals.reduce(
                (sum, g) => sum + (Number(g.targetAmount) || 0),
                0,
              )
            : 0;

        const totalMonthlySavings = explicitMonthlySavings + fallbackSavingsGoals;
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
          const currentMonth = d.getMonth();
          const hasFixedItems = 
            fixedExpenses.some((e) => {
              if (e.deductionDay !== dayNum) return false;
              if (e.frequency && e.startMonth !== undefined && e.frequency !== Frequency.MONTHLY) {
                const startM = e.startMonth;
                if (e.frequency === Frequency.QUARTERLY) return (currentMonth - startM) % 3 === 0;
                if (e.frequency === Frequency.SEMI_ANNUALLY) return (currentMonth - startM) % 6 === 0;
                if (e.frequency === Frequency.ANNUALLY) return currentMonth === startM;
              }
              return true;
            }) ||
            incomes.some((i) => {
              if (i.deductionDay !== dayNum) return false;
              if (i.frequency && i.startMonth !== undefined && i.frequency !== Frequency.MONTHLY) {
                const startM = i.startMonth;
                if (i.frequency === Frequency.QUARTERLY) return (currentMonth - startM) % 3 === 0;
                if (i.frequency === Frequency.SEMI_ANNUALLY) return (currentMonth - startM) % 6 === 0;
                if (i.frequency === Frequency.ANNUALLY) return currentMonth === startM;
              }
              return true;
            }) ||
            (config.monthlySavingsItems || []).some((s) => {
              if (s.deductionDay !== dayNum) return false;
              if (s.frequency && s.startMonth !== undefined && s.frequency !== Frequency.MONTHLY) {
                const startM = s.startMonth;
                if (s.frequency === Frequency.QUARTERLY) return (currentMonth - startM) % 3 === 0;
                if (s.frequency === Frequency.SEMI_ANNUALLY) return (currentMonth - startM) % 6 === 0;
                if (s.frequency === Frequency.ANNUALLY) return currentMonth === startM;
              }
              return true;
            });

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

        // 2. Calculate dynamic budget or total deficit
        let availableTodayCents = 0;
        let availableFutureBaseCents = 0;

        if (remainingPeriodCents <= 0) {
          // If total remaining in period is 0 or negative (overspent whole period),
          // Kvar idag equals Totalt kvar (the deficit)
          availableTodayCents = remainingPeriodCents;
          availableFutureBaseCents = remainingPeriodCents;
        } else {
          // Calculate the pot for distribution
          const potForDistribution = remainingPeriodCents + spentTodayCents;

          // DYNAMIC daily budget: Spread the remaining pot over remaining days.
          const dynamicBaseBudgetCents = Math.max(
            0,
            Math.floor(potForDistribution / remainingDaysIncludingToday),
          );

          // Current available today is the dynamic budget minus today's spending.
          availableTodayCents = dynamicBaseBudgetCents - spentTodayCents;

          // Future days get the dynamic budget, but if today is negative, redistribute the deficit
          availableFutureBaseCents = dynamicBaseBudgetCents;
          if (availableTodayCents < 0 && remainingDaysIncludingToday > 1) {
            const remainingPotAfterToday = remainingPeriodCents;
            availableFutureBaseCents = Math.floor(
              remainingPotAfterToday / (remainingDaysIncludingToday - 1),
            );
          }
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
          totalSavings: totalMonthlySavings,
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
        console.error("Error calculating stats:", _error);
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
  const calendarDays = useMemo(() => {
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

      const itemsSum = newItems.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const newConfig = { ...config, monthlySavingsItems: newItems, monthlySavings: itemsSum };
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
      const itemsSum = newItems.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
      const newConfig = { ...config, monthlySavingsItems: newItems, monthlySavings: itemsSum };
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

    if (activeTab) {
      tabScrollPositions.current[activeTab] = window.scrollY;
    }

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

    const isDifferent =
      targetTab !== activeTab ||
      (targetTab === "profile" && targetSection !== profileSection) ||
      (targetTab === "settings" && targetSection !== settingsSection) ||
      (targetTab === "budget" && targetSection !== budgetSection);
    if (isDifferent) {
      setNavHistory((prev) => {
        // Limit history size to 30 to prevent unlimited growth
        const last = prev[prev.length - 1];
        const currentSection = activeTab === "profile" ? profileSection : activeTab === "settings" ? settingsSection : activeTab === "budget" ? budgetSection : undefined;
        if (last && last.tab === activeTab && last.section === currentSection) {
          return prev;
        }
        return [...prev.slice(-29), { tab: activeTab, section: currentSection }];
      });
    }

    setActiveTab(targetTab as Tab);
    if (targetTab === "today") {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      setCurrentPeriodDate(now);
      setTargetDate(now);
    }
    if (targetTab === "budget") {
      setBudgetSection(targetSection || null);
    }
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
    if (viewingTransaction) { handleCloseTransactionView(); modalClosed = true; }
    if (isCalculatorOpen) { setIsCalculatorOpen(false); modalClosed = true; }
    if (isDejziSummaryOpen) { setIsDejziSummaryOpen(false); modalClosed = true; }
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

    // 2. If subview is active in budget, profile or settings, pop from navHistory or go back to main section
    if (
      (activeTab === 'budget' && budgetSection) ||
      (activeTab === 'profile' && profileSection !== 'main') ||
      (activeTab === 'settings' && settingsSection !== 'main')
    ) {
      if (navHistory.length > 0) {
        feedback.tap();
        setNavTrigger((prev) => prev + 1);
        const nextStack = [...navHistory];
        const previous = nextStack.pop();
        setNavHistory(nextStack);
        if (previous) {
          setActiveTab(previous.tab);
          if (previous.tab === "profile") {
            setProfileSection(previous.section || "main");
          } else if (previous.tab === "settings") {
            setSettingsSection(previous.section || "main");
          } else if (previous.tab === "budget") {
            setBudgetSection(previous.section || null);
          }
          return true;
        }
      }

      feedback.tap();
      setNavTrigger((prev) => prev + 1);
      if (activeTab === 'budget') setBudgetSection(null);
      else if (activeTab === 'profile') setProfileSection('main');
      else if (activeTab === 'settings') setSettingsSection('main');
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
        if (previous.tab === "profile") {
          setProfileSection(previous.section || "main");
        } else if (previous.tab === "settings") {
          setSettingsSection(previous.section || "main");
        } else if (previous.tab === "budget") {
          setBudgetSection(previous.section || null);
        }
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
      (activeTab === 'budget' && !!budgetSection) ||
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
          darkMode: true,
          quickChoices: [],
          savingsPot: 0,
          surplusIncome: 0,
          monthlySavings: 0,
          monthlySavingsItems: [],
          includeFixedExpensesInAnalysis: true,
          showFixedExpensesInTodayView: true,
          showFixedExpensesInCalendar: true,
          paymentMethods: DEFAULT_PAYMENT_METHODS,
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

  const handleRenameCategory = async (
    type: "income" | "expense",
    oldName: string,
    newName: string,
  ) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (
      !trimmedOld ||
      !trimmedNew ||
      trimmedOld.toLowerCase() === trimmedNew.toLowerCase()
    ) {
      return;
    }

    // 1. Update in-memory transactions (both direct category and splits)
    setTransactions((prev) => {
      let anyTxChanged = false;
      const next = prev.map((t) => {
        let changed = false;
        let newCat = t.category;
        let newSplits = t.splits;

        const isMatchingType =
          type === "income" ? t.type === "income" : t.type !== "income";
        if (
          isMatchingType &&
          (t.category || "").trim().toLowerCase() === trimmedOld.toLowerCase()
        ) {
          newCat = trimmedNew;
          changed = true;
        }

        if (t.splits && Array.isArray(t.splits) && t.splits.length > 0) {
          const nextSplits = t.splits.map((s: any) => {
            if (
              (s.category || "").trim().toLowerCase() ===
              trimmedOld.toLowerCase()
            ) {
              changed = true;
              return { ...s, category: trimmedNew };
            }
            return s;
          });
          if (changed) {
            newSplits = nextSplits;
          }
        }

        if (changed) {
          anyTxChanged = true;
          return { ...t, category: newCat, splits: newSplits };
        }
        return t;
      });
      return anyTxChanged ? next : prev;
    });

    // 2. Update fixed expenses in memory
    if (type === "expense") {
      setFixedExpenses((prev) =>
        prev.map((e) =>
          (e.category || "").trim().toLowerCase() === trimmedOld.toLowerCase()
            ? { ...e, category: trimmedNew }
            : e,
        ),
      );
    }

    // 3. Update incomes in memory
    if (type === "income") {
      setIncomes((prev) =>
        prev.map((i) =>
          (i.category || "").trim().toLowerCase() === trimmedOld.toLowerCase()
            ? { ...i, category: trimmedNew }
            : i,
        ),
      );
    }

    // 4. Update quickChoices in config if present
    if (config?.quickChoices && config.quickChoices.length > 0) {
      const updatedQC = config.quickChoices.map((qc) =>
        (qc.category || "").trim().toLowerCase() === trimmedOld.toLowerCase()
          ? { ...qc, category: trimmedNew }
          : qc,
      );
      setConfig((prev) => (prev ? { ...prev, quickChoices: updatedQC } : prev));
    }

    // 5. Persist rename to database / local storage
    const activeUserId = session?.user?.id || (isDemoMode ? "demo-user" : "");
    if (activeUserId) {
      try {
        await dataService.renameCategory(
          activeUserId,
          type,
          trimmedOld,
          trimmedNew,
        );
      } catch (err) {
        console.error("Failed to rename category in database:", err);
      }
    }
  };

  const handleMigrateAndDeleteCategory = async (
    type: "income" | "expense",
    deleteCatId: string,
    migrateToCatId?: string,
  ) => {
    if (!config) return;
    const field = type === "income" ? "incomeCategories" : "categories";
    const categories = config[field] || [];
    const deleteCat = categories.find((c: any) => c.id === deleteCatId);
    if (!deleteCat) return;

    let targetCat = categories.find((c: any) => c.id === migrateToCatId);
    if (!targetCat) {
      targetCat =
        categories.find(
          (c: any) => c.id === "ovrigt" || c.name.toLowerCase() === "övrigt",
        ) || categories.find((c: any) => c.id !== deleteCatId);
    }

    setTransactions((prev) =>
      prev.map((t) => {
        const isMatch =
          t.categoryId === deleteCatId ||
          (t.category &&
            deleteCat.name &&
            t.category.trim().toLowerCase() === deleteCat.name.trim().toLowerCase());
        if (isMatch && targetCat) {
          return {
            ...t,
            categoryId: targetCat.id,
            category: targetCat.name,
          };
        }
        return t;
      }),
    );

    const newCategories = categories.filter((c: any) => c.id !== deleteCatId);
    const newConfig = {
      ...config,
      [field]: newCategories,
    };

    setConfig(newConfig);

    const activeUserId = session?.user?.id || (isDemoMode ? "demo-user" : "");
    if (activeUserId) {
      try {
        await dataService.saveSettings(activeUserId, newConfig);
      } catch (err) {
        console.error("Failed to save settings after category deletion:", err);
      }
    }
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
    if (activeTab === "today") return config?.language === 'en' ? 'Overview' : 'Överblick';
    if (activeTab === "notifications") return t("notificationsTitle");
    if (activeTab === "transactions") return t("log");
    if (activeTab === "analysis") return t("analysis");
    if (activeTab === "budget") {
      if (budgetSection === "allocate" || budgetSection === "category-budgets") {
        return 'Budget';
      }
      return budgetSection ? (config?.language === 'en' ? 'Budget' : 'Budget') : (config?.language === 'en' ? 'Finances' : 'Ekonomi');
    }
    if (activeTab === "settings") {
      if (settingsSection === "main") return config?.language === 'en' ? 'Settings' : 'Inställningar';
      switch (settingsSection) {
        case "salary": return t("salary");
        case "categories": return t("categories");
        case "paymentMethods": return t("paymentMethods");
        case "language": return t("language");
        case "appearance": return config?.language === 'en' ? 'Appearance' : 'Utseende';
        default: return config?.language === 'en' ? 'Settings' : 'Inställningar';
      }
    }
    if (activeTab === "profile") {
      if (profileSection === "main") return t("profile");
      switch (profileSection) {
        case "salary": return t("salary");
        case "categories": return t("categories");
        case "paymentMethods": return t("paymentMethods");
        case "manageAccount": return t("manageAccount");
        case "language": return t("language");
        case "appearance": return config?.language === 'en' ? 'Appearance' : 'Utseende';
        case "receipts": return config?.language === 'en' ? 'Receipts' : 'Mina kvitton';
        case "notifications": return t("notifications");
        default: return t("profile");
      }
    }
    return config?.language === 'en' ? 'Overview' : 'Överblick';
  }, [activeTab, budgetSection, profileSection, settingsSection, config?.language, t]);

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

  if (publicLegalDoc) {
    return (
      <div className={config?.darkMode ?? true ? 'dark' : ''}>
        <PublicLegalPage
          initialDoc={publicLegalDoc}
          onNavigateHome={() => {
            try {
              window.history.pushState({}, '', '/');
            } catch (_e) {
              // ignore
            }
            setPublicLegalDoc(null);
          }}
        />
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className={`min-h-dvh font-sans text-[var(--text-primary)] relative pt-[env(safe-area-inset-top)] bg-[var(--bg-color)] ${config?.darkMode ?? true ? 'dark' : ''}`}>
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
    const isDark = !showLanding && (config?.darkMode ?? true);
    return (
      <div className={`min-h-dvh font-sans text-[var(--text-primary)] relative bg-[var(--bg-color)] overflow-x-clip ${isDark ? 'dark' : ''}`}>
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
              onFacebookLogin={handleFacebookLogin}
              onLegalClick={handleLegalClick}
              t={t}
              currentLanguage={landingLanguage}
              onLanguageChange={(lang) => {
                setLandingLanguage(lang);
                localStorage.setItem('app_language', lang);
              }}
            />
            <CookieConsentModal t={t} onOpenPrivacyPolicy={() => handleLegalClick('privacy')} />
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

        {isResetPasswordOpen && (
          <ResetPasswordModal
            isOpen={isResetPasswordOpen}
            onClose={() => {
              setIsResetPasswordOpen(false);
              try {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
              } catch (historyErr) {
                console.warn('Could not clean history:', historyErr);
              }
            }}
            onShowToast={addToast}
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

        {isResetPasswordOpen && (
          <ResetPasswordModal
            isOpen={isResetPasswordOpen}
            onClose={() => {
              setIsResetPasswordOpen(false);
              try {
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
              } catch (historyErr) {
                console.warn('Could not clean history:', historyErr);
              }
            }}
            onShowToast={addToast}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`min-h-dvh font-sans pt-0 text-[var(--text-primary)] selection:bg-accent/30 relative overflow-x-clip bg-[var(--bg-color)] transition-colors duration-500`}>

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
            (activeTab === 'budget' && !!budgetSection) ||
            activeTab === 'profile' ||
            activeTab === 'settings'
              ? () => handleGoBack()
              : undefined
          }
          navTrigger={navTrigger}
          userName={
            (() => {
              const raw = (
                profile?.full_name ||
                session?.user?.user_metadata?.full_name ||
                session?.user?.user_metadata?.name ||
                ""
              ).trim();
              if (raw) {
                const first = raw.split(" ")[0];
                return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
              }
              const email = session?.user?.email || "";
              if (email.toLowerCase().startsWith("kevin")) return "Kevin";
              if (email.includes("@")) {
                const part = email.split("@")[0];
                return part.charAt(0).toUpperCase() + part.slice(1);
              }
              return "Kevin";
            })()
          }
          date={(() => {
            const d = new Date(targetDate || new Date());
            d.setHours(0, 0, 0, 0);
            return d;
          })()}
          avatarUrl={avatarUrl}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onOpenSettings={() => handleNavigate("settings")}
          notificationCount={notifications.length}
          onOpenNotifications={() => handleNavigate("notifications")}
          onOpenDejzi={() => setIsDejziSummaryOpen(true)}
          isDemoMode={isDemoMode}
          language={(config?.language as string) || "sv"}
          activeTab={activeTab}
        />
      )}

      {isDemoMode && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[var(--bg-secondary)]/95 backdrop-blur-xl border-b border-[var(--border-color)] px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 flex items-center justify-between text-xs font-semibold shadow-xs">
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
        <main className={`max-w-2xl mx-auto px-3.5 sm:px-6 relative ${isDemoMode ? 'pt-[calc(5.8rem+env(safe-area-inset-top,0px))]' : 'pt-[calc(3.75rem+env(safe-area-inset-top,0px))]'} ${isAddTransactionOpen ? 'pb-0' : 'pb-32'}`}>
          {stats && (
            <div style={{ display: activeTab === "today" ? "block" : "none" }}>
              <TodayView
                stats={stats}
                config={config}
                isDemoMode={isDemoMode}
                onOpenDejzi={() => setIsDejziSummaryOpen(true)}
                userName={
                  (() => {
                    const raw = (
                      profile?.full_name ||
                      session?.user?.user_metadata?.full_name ||
                      session?.user?.user_metadata?.name ||
                      ""
                    ).trim();
                    if (raw) return raw.split(" ")[0];
                    const email = session?.user?.email || "";
                    if (email.toLowerCase().startsWith("kevin")) return "Kevin";
                    if (email.includes("@")) {
                      const part = email.split("@")[0];
                      return part.charAt(0).toUpperCase() + part.slice(1);
                    }
                    return "";
                  })()
                }
                incomes={incomes}
                fixedExpenses={fixedExpenses}
                selectedDate={targetDate}
                setSelectedDate={setTargetDate}
                onAddTransaction={() => {
                  setTransactionType("expense");
                  setTargetDate(new Date());
                  setIsAddTransactionOpen(true);
                }}
                onQuickAddExpense={async (amount: number, note?: string, category?: string) => {
                  const isEn = config.language === 'en';
                  const defaultName = isEn ? 'Quick expense' : 'Snabb utgift';
                  const defaultCategory = isEn ? 'Uncategorized' : 'Okategoriserat';
                  const categoryName = category?.trim() || defaultCategory;
                  const merchantName = note?.trim() || defaultName;

                  const now = new Date();
                  let timestamp = Date.now();

                  if (targetDate) {
                    const d = new Date(targetDate);
                    if (d.toDateString() === now.toDateString()) {
                      timestamp = Date.now();
                    } else {
                      d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
                      timestamp = d.getTime();
                    }
                  }

                  await addTransaction(
                    {
                      amount,
                      type: "expense",
                      category: categoryName,
                      merchant: merchantName,
                      note: note?.trim() || "",
                      tags: [],
                      isBackdated: timestamp < Date.now() - 60000,
                    },
                    timestamp,
                  );
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
                  const activeUserId = session?.user?.id || "demo-user";
                  dataService.saveSettings(activeUserId, newConfig).catch((err) => {
                    console.warn("Failed to save updated settings:", err);
                  });
                }}
                onOpenCalculator={() => setIsCalculatorOpen(true)}
              />
            </div>
          )}

          {stats && (
            <div style={{ display: activeTab === "analysis" ? "block" : "none" }}>
              <AnalysisView
                transactions={transactions}
                stats={stats}
                config={config}
                t={t}
                fixedExpenses={fixedExpenses}
                currentLang={config.language as Language}
                onViewTransaction={(t) => {
                  setViewingTransaction(t);
                }}
                onDeleteTransaction={deleteTransaction}
                onViewFixedExpense={(expense) => {
                  setViewingFixedExpense(expense);
                }}
                periods={periods}
                currentPeriodDate={currentPeriodDate}
                onPeriodChange={setCurrentPeriodDate}
                onOpenCalendarPicker={() => setIsCalendarModalOpen(true)}
              />
            </div>
          )}

          {stats && (
            <div style={{ display: activeTab === "transactions" ? "block" : "none" }}>
              <LogView
                transactions={transactions}
                config={config}
                periods={periods}
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
                onDeleteTransaction={deleteTransaction}
                t={t}
                currentLang={config.language as Language}
              />
            </div>
          )}

          {stats && (
            <div 
              style={{ display: activeTab === "budget" ? "block" : "none" }}
              className="min-h-full bg-gradient-to-b from-[#0B0F19] via-[#090C14] to-[#06080D] relative overflow-hidden pb-24"
            >
              {/* Subtle lighter blue ambient light spots here and there */}
              <div className="absolute top-12 left-1/4 w-72 h-72 bg-cyan-500/[0.07] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 right-6 w-80 h-80 bg-blue-600/[0.08] rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-1/4 left-8 w-64 h-64 bg-indigo-500/[0.06] rounded-full blur-3xl pointer-events-none" />

              <BudgetView
                stats={stats}
                config={config}
                allTransactions={transactions}
                setConfig={(newConfig) => {
                  setConfig(newConfig);
                  const activeUserId = session?.user?.id || "demo-user";
                  dataService.saveSettings(activeUserId, newConfig).catch((err) => {
                    console.error("Failed to save category budgets:", err);
                  });
                }}
                initialSection={budgetSection}
                onClearSection={() => setBudgetSection(null)}
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
                isDemoMode={isDemoMode}
              />
            </div>
          )}

          {config && (
            <div style={{ display: activeTab === "settings" ? "block" : "none" }}>
              <SettingsMainView
                onBack={() => setActiveTab("today")}
                config={config}
                initialSection={settingsSection as any}
                setConfig={async (newConfig) => {
                  if (!session) return;
                  try {
                    setConfig(newConfig);
                    if (newConfig.language) {
                      setLandingLanguage(newConfig.language as Language);
                    }
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
                onRenameCategory={handleRenameCategory}
                transactions={transactions}
                onMigrateAndDeleteCategory={handleMigrateAndDeleteCategory}
              />
            </div>
          )}

          {config && (
            <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
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
                    if (newConfig.language) {
                      setLandingLanguage(newConfig.language as Language);
                    }
                    await dataService.saveSettings(
                      session.user.id,
                      newConfig,
                    );
                  } catch (err) {
                    console.error("Error saving config:", err);
                  }
                }}
                onNavigate={handleNavigate}
                onRenameCategory={handleRenameCategory}
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
                onMigrateAndDeleteCategory={handleMigrateAndDeleteCategory}
                incomes={incomes}
                fixedExpenses={fixedExpenses}
                setCurrentPeriodDate={setCurrentPeriodDate}
                periods={periods}
                onViewTransaction={setViewingTransaction}
              />
            </div>
          )}

          {config && (
            <div style={{ display: activeTab === "notifications" ? "block" : "none" }}>
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
            </div>
          )}
        </main>
      </PullToRefresh>

      {/* Bottom Navigation */}
      {!isAddTransactionOpen && (
        <>
          <div className="fixed bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[var(--bg-color)] via-[var(--bg-color)]/80 to-transparent pointer-events-none z-30" />
          <CustomBottomNavigation
            activeTab={activeTab}
            budgetSection={budgetSection}
            onNavigateSection={(tab, section) => {
              handleNavigate(tab, section);
            }}
            onPlusClick={() => {
              feedback.tap();
              setIsPlusMenuOpen(true);
            }}
            setActiveTab={(tab) => {
              if (tab === activeTab) {
                tabScrollPositions.current[tab] = 0;
                window.scrollTo({ top: 0, behavior: "smooth" });
                if (tab === "today") {
                  const now = new Date();
                  now.setHours(0, 0, 0, 0);
                  setCurrentPeriodDate(now);
                  setTargetDate(now);
                }
              } else {
                handleNavigate(tab);
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
            tabScrollPositions.current['today'] = 0;
            window.scrollTo({ top: 0, behavior: 'instant' as any });
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

              // 2. Map savings goals and monthly savings
              const totalMonthlySavingsAmount =
                (data.monthlySavings !== undefined && data.monthlySavings > 0)
                  ? data.monthlySavings
                  : (data.savingsGoals || []).reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);

              const mappedSavingsGoals: SavingsGoal[] = (data.savingsGoals && data.savingsGoals.length > 0)
                ? (data.savingsGoals || []).map((g) => ({
                    id: crypto.randomUUID(),
                    title: g.title,
                    targetAmount: Number(g.targetAmount) || 0,
                    currentAmount: 0,
                    priority: 0,
                    icon: g.icon || "Target",
                    logo: g.logo,
                    deadline: g.deadline,
                    createdAt: Date.now(),
                  }))
                : (totalMonthlySavingsAmount > 0 ? [{
                    id: crypto.randomUUID(),
                    title: config?.language === "en" ? "Monthly savings" : "Månadssparande",
                    targetAmount: totalMonthlySavingsAmount,
                    currentAmount: 0,
                    priority: 0,
                    icon: "PiggyBank",
                    createdAt: Date.now(),
                  }] : []);

              // Map recurring monthly savings items from onboarding
              const mappedMonthlySavingsItems: MonthlySaving[] = (data.monthlySavingsItems && data.monthlySavingsItems.length > 0)
                ? data.monthlySavingsItems
                : (data.savingsGoals || [])
                    .filter((g) => Number(g.targetAmount) > 0)
                    .map((g) => ({
                      id: crypto.randomUUID(),
                      name: g.title || (config?.language === "en" ? "Monthly savings" : "Månadssparande"),
                      amount: Number(g.targetAmount) || 0,
                      icon: g.icon || "PiggyBank",
                      logo: g.logo,
                      deductionDay: data.payday || 25,
                      frequency: Frequency.MONTHLY,
                    }));

              const finalMonthlySavingsItems: MonthlySaving[] = mappedMonthlySavingsItems.length > 0
                ? mappedMonthlySavingsItems
                : (totalMonthlySavingsAmount > 0 ? [{
                    id: crypto.randomUUID(),
                    name: config?.language === "en" ? "Monthly savings" : "Månadssparande",
                    amount: totalMonthlySavingsAmount,
                    icon: "PiggyBank",
                    deductionDay: data.payday || 25,
                    frequency: Frequency.MONTHLY,
                  }] : (config?.monthlySavingsItems || []));

              // 3. Update config with income, initialSpent, payday, savings goals, monthlySavings, monthlySavingsItems, age, gender, and categories
              const newConfig: Config = {
                ...config,
                darkMode: (config?.darkMode !== undefined && config?.darkMode !== null) ? config.darkMode : true,
                payday: data.payday || 25,
                paydayBeforeWeekend: data.paydayBeforeWeekend !== undefined ? data.paydayBeforeWeekend : (config?.paydayBeforeWeekend !== undefined ? config.paydayBeforeWeekend : true),
                initialSpent: data.initialSpent,
                savingsGoals: mappedSavingsGoals,
                monthlySavings: totalMonthlySavingsAmount,
                monthlySavingsItems: finalMonthlySavingsItems,
                userAgeGroup: data.userAgeGroup || config?.userAgeGroup,
                userGender: data.userGender || config?.userGender,
                categories: (data.categories && data.categories.length > 0) ? data.categories : config.categories,
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
                    deductionDay: inc.deductionDay || data.payday || 25,
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
            onClose={() => handleCloseTransactionView()}
            onEdit={(t) => {
              setViewingTransaction(null);
              setEditingTransaction(t);
              setTransactionType(t.type || "expense");
              setTargetDate(new Date(t.timestamp));
              setIsAddTransactionOpen(true);
            }}
            onDelete={(id) => {
              deleteTransaction(id);
              handleCloseTransactionView();
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
                handleCloseTransactionView();
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
            config={config}
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
            config={config}
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
            config={config}
          />
        )}
        {isCalculatorOpen && (
          <CalculatorModal
            isOpen={isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
            t={t}
          />
        )}
        {isDejziSummaryOpen && (
          <DejziSummaryModal
            isOpen={isDejziSummaryOpen}
            onClose={() => setIsDejziSummaryOpen(false)}
            userName={
              (
                session?.user?.user_metadata?.full_name ||
                session?.user?.email?.split("@")[0] ||
                ""
              ).split(" ")[0]
            }
            stats={stats}
            calendarDays={calendarDays || []}
            availableForToday={stats?.availableForD || 0}
            currency={config?.currency || "kr"}
            language={(config?.language as string) || "sv"}
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
        {isResetPasswordOpen && (
          <ResetPasswordModal
            isOpen={isResetPasswordOpen}
            onClose={() => setIsResetPasswordOpen(false)}
            onShowToast={addToast}
          />
        )}
        {config && (
          <SearchModal
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
            transactions={transactions}
            config={config}
            onNavigate={handleNavigate}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onViewTransaction={(trans) => {
              setSearchModalOpenBeforeViewing(true);
              setIsSearchModalOpen(false);
              setViewingTransaction(trans);
            }}
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
        {isCalendarModalOpen && (
          <CalendarModal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            calendarDays={calendarDays || []}
            selectedDate={targetDate}
            onSelectDate={(newDate) => {
              setTargetDate(newDate);
              if (setCurrentPeriodDate) {
                setCurrentPeriodDate(newDate);
              }
              setIsCalendarModalOpen(false);
            }}
            periods={periods}
            currentPeriodDate={currentPeriodDate}
            onPeriodChange={(newDate) => {
              setCurrentPeriodDate(newDate);
            }}
            periodName={stats?.periodName}
            isCurrentPeriod={isCurrentPeriod}
            t={t}
            language={(config?.language as Language) || 'sv'}
            showFixedInCalendar={config?.showFixedExpensesInCalendar}
          />
        )}

        {/* Central Plus Button Overlay Menu */}
        {isPlusMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center px-4 pb-24"
          >
            {/* Click outside to close */}
            <div 
              className="absolute inset-0 cursor-pointer" 
              onClick={() => {
                feedback.tap();
                setIsPlusMenuOpen(false);
              }}
            />

            <motion.div
              initial={{ y: 80, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 80, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-[420px] rounded-3xl bg-white dark:bg-[#242424] border border-[#E6E2D8] dark:border-[#383838] shadow-2xl p-5 relative z-10 space-y-5"
            >
              {/* Header with X Close Button */}
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold tracking-tight text-[#6E6961] dark:text-[#A8A8A8] select-none">
                  {config?.language === "en" ? "Add transaction" : "Ny transaktion"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    feedback.tap();
                    setIsPlusMenuOpen(false);
                  }}
                  className="w-8 h-8 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] hover:bg-[#EDE9DF] dark:hover:bg-[#383838] text-[#6E6961] hover:text-[#1C1917] dark:text-[#A8A8A8] dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* The 3 Action Buttons */}
              <div className="grid grid-cols-3 gap-3 justify-items-center py-1">
                {/* Utgift */}
                <button
                  type="button"
                  onClick={() => {
                    feedback.tap();
                    setIsPlusMenuOpen(false);
                    setTransactionType("expense");
                    setTargetDate(new Date());
                    setIsAddTransactionOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] group-hover:bg-[#EDE9DF] dark:group-hover:bg-[#383838] border border-[#E6E2D8] dark:border-[#383838] flex items-center justify-center transition-colors">
                    <ArrowDownLeft size={20} strokeWidth={1.75} className="text-[#1C1917] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:text-white dark:group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-[#1C1917] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors text-center">
                    {config?.language === "en" ? "Expense" : "Utgift"}
                  </span>
                </button>

                {/* Inkomst */}
                <button
                  type="button"
                  onClick={() => {
                    feedback.tap();
                    setIsPlusMenuOpen(false);
                    setTransactionType("income");
                    setTargetDate(new Date());
                    setIsAddTransactionOpen(true);
                  }}
                  className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] group-hover:bg-[#EDE9DF] dark:group-hover:bg-[#383838] border border-[#E6E2D8] dark:border-[#383838] flex items-center justify-center transition-colors">
                    <ArrowUpRight size={20} strokeWidth={1.75} className="text-[#1C1917] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:text-white dark:group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-xs font-medium text-[#1C1917] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors text-center">
                    {config?.language === "en" ? "Income" : "Inkomst"}
                  </span>
                </button>

                {/* Kvitto */}
                <button
                  type="button"
                  onClick={handlePlusKvittoClick}
                  disabled={isScanningReceipt}
                  className="flex flex-col items-center gap-2 group cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full bg-[#EFECE6] dark:bg-[#2D2D2D] group-hover:bg-[#EDE9DF] dark:group-hover:bg-[#383838] border border-[#E6E2D8] dark:border-[#383838] flex items-center justify-center transition-colors">
                    {isScanningReceipt ? (
                      <Loader2 size={20} className="animate-spin text-[#1C1917] dark:text-white" />
                    ) : (
                      <Camera size={20} strokeWidth={1.75} className="text-[#1C1917] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:text-white dark:group-hover:text-white transition-colors" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-[#1C1917] dark:text-[#A8A8A8] group-hover:text-[#1C1917] dark:group-hover:text-white transition-colors text-center">
                    {isScanningReceipt ? (config?.language === "en" ? "Scanning..." : "Scannar...") : (config?.language === "en" ? "Receipt" : "Kvitto")}
                  </span>
                </button>

                <input
                  ref={plusCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePlusCameraCapture}
                />
              </div>

              {/* Snabbutgift Form with Mic using Reusable SmartInput */}
              <div className="pt-2 border-t border-[#E6E2D8] dark:border-[#383838]">
                <SmartInput
                  hideLabel
                  value={plusQuickText}
                  onChange={setPlusQuickText}
                  onSubmit={handlePlusQuickExpenseSubmit}
                  placeholder={
                    isRecording
                      ? (config?.language === "en" ? "Listening... Speak purchase" : "Lyssnar... Prata in köpet")
                      : isAudioTranscribing
                        ? (config?.language === "en" ? "Processing speech..." : "Tolkar röstinlägg...")
                        : (config?.language === "en" ? "Quick expense: e.g. 45 Coop..." : "Snabbutgift: t.ex. 45 ICA...")
                  }
                  isProcessing={isSubmittingQuick || isAudioTranscribing}
                  disabled={isRecording}
                  inputRef={plusQuickInputRef}
                  leftElement={
                    <button
                      type="button"
                      onClick={handlePlusMicClick}
                      disabled={isSubmittingQuick || isAudioTranscribing}
                      className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all cursor-pointer border select-none ${
                        isRecording
                          ? "bg-rose-500 text-white border-rose-400 animate-pulse scale-105"
                          : isAudioTranscribing
                            ? "bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/30"
                            : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border-rose-500/20 active:scale-95"
                      }`}
                    >
                      {isAudioTranscribing ? (
                        <Loader2 size={14} className="animate-spin text-rose-500 dark:text-rose-400" />
                      ) : isRecording ? (
                        <Square size={12} className="fill-current" />
                      ) : (
                        <Mic size={15} strokeWidth={2} />
                      )}
                    </button>
                  }
                  submitVariant="inside"
                  submitIcon={<Plus size={16} strokeWidth={2.2} />}
                  feedback={
                    plusSuccessMsg
                      ? { type: 'success', message: plusSuccessMsg.text }
                      : plusVoiceError
                        ? { type: 'error', message: plusVoiceError }
                        : null
                  }
                  inputClassName={`h-11 sm:h-12 rounded-2xl bg-[#F6F4EE] dark:bg-white/[0.04] text-[#1C1917] dark:text-white placeholder-[#8C867C] dark:placeholder-[#A8A8A8]/70 ${
                    isRecording ? "border-rose-500/80 ring-2 ring-rose-500/30" : "border-[#E6E2D8] dark:border-[#383838]"
                  }`}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AddToHomeScreenModal t={t} theme={config?.appIconTheme} language={(config?.language as string) || landingLanguage} />
      <ReceiptCameraModal
        isOpen={isReceiptCameraOpen}
        onClose={() => setIsReceiptCameraOpen(false)}
        onCapture={handleReceiptFileCaptured}
        isProcessing={isScanningReceipt}
        language={config?.language}
      />
    </div>
  );
}
