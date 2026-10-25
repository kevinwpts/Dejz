import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  calculateCurrentPeriod,
  PeriodInfo,
  WeekendHandlingMode,
  isDateInPeriod,
} from './utils/periodEngine';
import { Navbar } from './components/Navbar';
import { BottomNav, AppTab } from './components/BottomNav';
import { HomeTab, AccountItem, IncomeItem, FixedExpenseItem, TransactionItem, getTransactionTime } from './components/HomeTab';
import { FixedTab } from './components/FixedTab';
import { TransactionsTab } from './components/TransactionsTab';
import { SettingsTab } from './components/SettingsTab';
import { BankModal } from './components/modals/BankModal';
import { IncomeModal } from './components/modals/IncomeModal';
import { FixedExpenseModal } from './components/modals/FixedExpenseModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { supabase } from './supabaseClient';
import { bankService, BankConnection, BankAccount, BankTransactionItem } from './services/bankService';
import { dataService } from './services/dataService';
import { Frequency } from './types';
import { getLogoUrl } from './utils/logo';
import {
  analyzeBankTransactionsForOnboarding,
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  formatBankAccountNumber,
  formatSwishTitle,
  getBankAccountTitle,
  getNormalizedBankTxAmount,
  isInternalTransferOrMicroSavings,
} from './utils/bankHistoryAnalyzer';
import { deduplicateTransactions } from './utils/transactionDedup';
import {
  formatIsoDateStockholm,
  formatIsoTimeStockholm,
  getActualBankPaymentDateAndMeta,
  getSwedishDateStr,
} from './utils/swedishDate';

const AUTO_SYNC_COOLDOWN_MS = 45_000; // Minst 45 sek mellan automatiska bakgrundssynkningar
const AUTO_SYNC_INTERVAL_MS = 120_000; // Synka automatiskt var 2:a minut när användaren är aktiv i appen

function getActualTransactionDate(bt: BankTransactionItem): string {
  return getActualBankPaymentDateAndMeta(bt).paymentDate;
}

function sanitizeTransactionDate(item: TransactionItem): TransactionItem {
  return item;
}

function extractBankTxTime(
  bt: BankTransactionItem,
  batchMinuteCounts: Map<string, number>,
  effectiveDate: string,
  category: string,
  merchant: string
): string {
  const raw = bt.raw_json || {};

  // 1. Kontrollera endast genuina tidsfält (INTE bokföringsdatum eller valuteringsdatum som saknar köptid)
  const candidateFields = [
    raw.transaction_time,
    raw.time,
    raw.execution_time,
    raw.timestamp,
    raw.transaction_date,
    bt.transaction_date,
  ];

  for (const val of candidateFields) {
    if (typeof val !== 'string') continue;
    const trimmed = val.trim();
    // Direkt tidformat som "14:35" eller "14:35:10"
    const directTime = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)/);
    if (directTime) {
      const hhmm = `${directTime[1]}:${directTime[2]}`;
      if (hhmm !== '00:00' && hhmm !== '12:00') {
        return hhmm;
      }
    }
    // Om det är en ISO-sträng som innehåller 'T', kolla att den inte är en standard midnatt/middags-placeholder
    if (trimmed.includes('T') && !trimmed.includes('T00:00') && !trimmed.includes('T12:00') && !trimmed.includes('T10:00:00Z')) {
      const parsedTime = formatIsoTimeStockholm(trimmed);
      if (parsedTime) return parsedTime;
    }
  }

  // 2. Kontrollera om klockslag finns i bankens transaktionsbeskrivning (t.ex. "ICA 14:23" eller "KÖP 15.34")
  if (bt.description) {
    const descMatch = bt.description.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)\b/);
    if (descMatch) {
      const hhmm = `${descMatch[1]}:${descMatch[2]}`;
      if (hhmm !== '00:00' && hhmm !== '12:00') {
        return hhmm;
      }
    }
  }

  // 3. Om transaktionen fångades upp i realtid vid köpet
  if (bt.created_at) {
    const createdDate = bt.created_at.slice(0, 10);
    const minuteKey = bt.created_at.slice(0, 16);
    const sameMinuteCount = batchMinuteCounts.get(minuteKey) || 0;
    if (createdDate === effectiveDate && sameMinuteCount <= 3) {
      const liveTime = formatIsoTimeStockholm(bt.created_at);
      if (liveTime) return liveTime;
    }
  }

  // 4. Om banken inte lämnade ut tid: använd ett naturtroget klockslag anpassat efter butikskategori
  return getTransactionTime({
    id: `bank-${bt.id}`,
    title: merchant,
    category,
    date: effectiveDate,
    note: bt.description,
  });
}

function getPayDatesForIncome(
  inc: IncomeItem,
  fallbackPayday = 25,
  beforeWeekend = true
): string[] {
  const dates: string[] = [];
  const day = inc.payday || fallbackPayday || 25;
  const todayStockholm = getSwedishDateStr();
  const currentYear = parseInt(todayStockholm.slice(0, 4), 10);
  const currentMonth = parseInt(todayStockholm.slice(5, 7), 10) - 1; // 0-indexed

  for (let offset = 0; offset <= 5; offset++) {
    const d = new Date(currentYear, currentMonth - offset, day);
    if (beforeWeekend) {
      const dow = d.getDay();
      if (dow === 6) d.setDate(d.getDate() - 1); // Lördag -> Fredag
      if (dow === 0) d.setDate(d.getDate() - 2); // Söndag -> Fredag
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${dayStr}`);
  }
  return dates;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');

  // Lönedagsinställning (standard 25:e)
  const [targetPayday, setTargetPayday] = useState<number>(25);

  // Helghantering (standard 'before' = fredagen före helg)
  const [weekendHandling, setWeekendHandling] = useState<WeekendHandlingMode>('before');

  // Enable Banking connections & accounts
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [syncingBank, setSyncingBank] = useState(false);
  const [callbackStatusMsg, setCallbackStatusMsg] = useState<string | null>(null);

  // Refs för tyst automatisk bakgrundssynk
  const syncInFlightRef = useRef(false);
  const lastSyncTimestampRef = useRef<number>(0);

  // Riktiga inkomster – Startar tomt
  const [incomes, setIncomes] = useState<IncomeItem[]>([]);

  // Riktiga fasta utgifter – Startar tomt
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpenseItem[]>([]);

  // Riktiga köp – Startar tomt
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);

  // Inloggad användare i Supabase
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Modaltillstånd
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState<IncomeItem | null>(null);
  const [isFixedModalOpen, setIsFixedModalOpen] = useState(false);
  const [selectedFixedExpense, setSelectedFixedExpense] = useState<FixedExpenseItem | null>(null);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionItem | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Borttagna genererade inkomst-ID:n
  const [dismissedTxIds, setDismissedTxIds] = useState<string[]>([]);

  // Ladda Enable Banking status + banktransaktioner från Supabase
  const refreshBankStatus = useCallback(async (): Promise<{
    connections: BankConnection[];
    accounts: BankAccount[];
  }> => {
    try {
      const status = await bankService.getStatus();
      const conns = status.connections || [];
      const accs = status.accounts || [];
      setConnections(conns);
      setBankAccounts(accs);

      // Hämta synkade banktransaktioner från Supabase (public.bank_transactions)
      const bankTxs = await bankService
        .listAllTransactionsForReconciliation(1000)
        .catch(() => []);

      if (Array.isArray(bankTxs) && bankTxs.length > 0) {
        // Analysera återkommande inkomster och fasta utgifter från bankhistoriken
        const analyzed = analyzeBankTransactionsForOnboarding(
          bankTxs,
          targetPayday,
          weekendHandling === 'before'
        );

        if (analyzed.detectedIncomes.length > 0) {
          setIncomes((prev) => {
            const existingNames = new Set(prev.map((i) => i.name.toLowerCase().trim()));
            const additions: IncomeItem[] = analyzed.detectedIncomes
              .filter((det) => !existingNames.has(det.name.toLowerCase().trim()))
              .map((det, idx) => {
                const cat = det.category || 'Lön';
                return {
                  id: `bank-inc-${idx}-${det.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: det.name,
                  amount: Math.round(Number(det.amount) || 0),
                  payday: det.deductionDay || targetPayday || 25,
                  category: cat,
                  logo: det.logo || getLogoUrl(det.name, cat),
                };
              });
            return additions.length > 0 ? [...prev, ...additions] : prev;
          });
        }

        if (analyzed.detectedFixedExpenses.length > 0) {
          setFixedExpenses((prev) => {
            const existingNames = new Set(prev.map((f) => f.name.toLowerCase().trim()));
            const additions: FixedExpenseItem[] = analyzed.detectedFixedExpenses
              .filter((det) => !existingNames.has(det.name.toLowerCase().trim()))
              .map((det, idx) => {
                const cat = det.category || 'Räkningar';
                return {
                  id: `bank-fix-${idx}-${det.name.toLowerCase().replace(/\s+/g, '-')}`,
                  name: det.name,
                  amount: Math.round(Number(det.amount) || 0),
                  dueDay: det.deductionDay || 27,
                  category: cat,
                  paymentMethod: det.paymentMethod || 'Autogiro',
                  logo: det.logo || getLogoUrl(det.name, cat),
                };
              });
            if (additions.length === 0) return prev;
            return [...prev, ...additions].sort((a, b) => a.dueDay - b.dueDay);
          });
        }

        const fixedNameSet = new Set(
          analyzed.detectedFixedExpenses.map((d) => d.name.toLowerCase().trim())
        );

        // Räkna hur många banktransaktioner som skapades exakt samma minut (för att skilja live-synk från bulk-historik)
        const batchMinuteCounts = new Map<string, number>();
        for (const bt of bankTxs) {
          if (bt.created_at) {
            const key = bt.created_at.slice(0, 16);
            batchMinuteCounts.set(key, (batchMinuteCounts.get(key) || 0) + 1);
          }
        }

        // 1. Samla alla bokförda transaktioner för att upptäcka och rensa preliminära reservationer (PDNG/HOLD)
        const bookedNegativeTxs = bankTxs.filter((bt) => {
          if (bt.booking_status !== 'BOOK') return false;
          if (bt.reconciliation_status === 'excluded' || bt.reconciliation_status === 'internal_transfer') return false;
          return getNormalizedBankTxAmount(bt) < 0;
        });

        // Spara metadata (datum & tid) från preliminära reservationer så att en bokförd transaktion
        // som ersätter reservationen behåller det exakta datumet och klockslaget från när köpet gjordes
        const bookedToReservationMeta = new Map<string, { purchaseDate: string; purchaseTime: string }>();

        // 2. Filtrera fram rörliga kortköp & betalningar (exkludera ersatta reservationer, avbokade och interna överföringar)
        const mappedBankTxs: TransactionItem[] = bankTxs
          .filter((bt) => {
            if (bt.booking_status === 'CNCL' || bt.booking_status === 'RJCT') return false;
            if (bt.reconciliation_status === 'reserved_replaced' || bt.replaced_by_bank_tx_id) {
              return false;
            }
            if (bt.reconciliation_status === 'excluded' || bt.reconciliation_status === 'internal_transfer') {
              return false;
            }
            if (isInternalTransferOrMicroSavings(bt, accs)) return false;
            const rawAmt = getNormalizedBankTxAmount(bt);
            if (rawAmt === 0) return false;

            // Om transaktionen är preliminär (reservation), kolla om banken redan hunnit bokföra den
            if (bt.booking_status === 'PDNG' || bt.booking_status === 'HOLD') {
              const pendingAmt = Math.round(Math.abs(rawAmt));
              const pendingMerchant = categorizeBankTransactionForApp(bt).merchant.toLowerCase().trim();
              const pendingDate = getActualTransactionDate(bt);

              const isSettledByBooked = bookedNegativeTxs.some((b) => {
                const bAmt = Math.round(Math.abs(getNormalizedBankTxAmount(b)));
                if (bAmt !== pendingAmt) return false;
                const bMerchant = categorizeBankTransactionForApp(b).merchant.toLowerCase().trim();
                const merchantsMatch =
                  bMerchant === pendingMerchant ||
                  (bt.description && bt.description.toLowerCase().includes(bMerchant)) ||
                  (b.description && b.description.toLowerCase().includes(pendingMerchant));
                if (!merchantsMatch) return false;

                const bDate = getActualTransactionDate(b);
                if (pendingDate && bDate) {
                  const dayDiff =
                    Math.abs(new Date(bDate).getTime() - new Date(pendingDate).getTime()) /
                    (1000 * 60 * 60 * 24);
                  if (dayDiff <= 4) {
                    // Spara reservationens ursprungliga köpdatum och köptid
                    const purchaseDate = pendingDate;
                    const purchaseTime = extractBankTxTime(
                      bt,
                      batchMinuteCounts,
                      purchaseDate,
                      pendingMerchant,
                      pendingMerchant
                    );
                    bookedToReservationMeta.set(b.id, { purchaseDate, purchaseTime });
                    return true;
                  }
                }
                return false;
              });

              if (isSettledByBooked) {
                return false;
              }
            }

            return true;
          })
          .map((bt) => {
            const rawAmt = getNormalizedBankTxAmount(bt);
            const isIncome = rawAmt > 0;
            const normAmt = Math.abs(rawAmt);
            let catInfo = categorizeBankTransactionForApp(bt);

            if (isIncome) {
              const combinedDesc = `${bt.description || ''} ${bt.counterparty_name || ''}`.toLowerCase();
              let incomeCat = 'Inkomst';
              if (
                combinedDesc.includes('lön') ||
                combinedDesc.includes('salary') ||
                combinedDesc.includes('löneutbetalning') ||
                combinedDesc.includes('loneutbetalning')
              ) {
                incomeCat = 'Lön';
              } else if (combinedDesc.includes('swish')) {
                incomeCat = 'Swish';
              } else if (combinedDesc.includes('csn')) {
                incomeCat = 'CSN';
              } else if (
                combinedDesc.includes('försäkringskassan') ||
                combinedDesc.includes('forsakringskassan') ||
                combinedDesc.includes('fk ')
              ) {
                incomeCat = 'Försäkringskassan';
              } else if (combinedDesc.includes('pension')) {
                incomeCat = 'Pension';
              } else if (
                combinedDesc.includes('återbetalning') ||
                combinedDesc.includes('aterbetalning') ||
                combinedDesc.includes('retur') ||
                combinedDesc.includes('refund') ||
                combinedDesc.includes('återköp') ||
                combinedDesc.includes('aterkop')
              ) {
                incomeCat = 'Återbetalning';
              }

              const cleanName =
                incomeCat === 'Swish'
                  ? formatSwishTitle(bt.description, bt.counterparty_name)
                  : cleanDisplayMerchantName(bt.counterparty_name || bt.description || 'Insättning');
              catInfo = {
                merchant: cleanName,
                category: incomeCat,
                logo: catInfo.logo || getLogoUrl(cleanName, incomeCat),
              };
            }

            const reservationMeta = bookedToReservationMeta.get(bt.id);
            const dateMeta = getActualBankPaymentDateAndMeta(
              bt,
              reservationMeta?.purchaseDate,
              reservationMeta?.purchaseTime
            );
            let effectiveDate = dateMeta.paymentDate;
            const todayStr = getSwedishDateStr();
            if (effectiveDate > todayStr) {
              effectiveDate = todayStr;
            }

            const txTime =
              dateMeta.paymentTime ||
              reservationMeta?.purchaseTime ||
              extractBankTxTime(
                bt,
                batchMinuteCounts,
                effectiveDate,
                catInfo.category,
                catInfo.merchant
              );

            return sanitizeTransactionDate({
              id: `bank-${bt.id}`,
              title: catInfo.merchant,
              amount: Math.round(normAmt),
              type: isIncome ? ('income' as const) : ('expense' as const),
              category: catInfo.category,
              date: effectiveDate,
              time: txTime,
              bookingDate: dateMeta.bookingDate,
              bookingStatus: dateMeta.bookingStatus,
              reconciliationStatus: bt.reconciliation_status,
              isExcluded: bt.reconciliation_status === 'excluded',
              note:
                bt.description && bt.description.toLowerCase() !== catInfo.merchant.toLowerCase()
                  ? bt.description
                  : undefined,
              logo: catInfo.logo || getLogoUrl(catInfo.merchant, catInfo.category),
            });
          })
          .filter(
            (item) => item.type === 'income' || !fixedNameSet.has(item.title.toLowerCase().trim())
          );

        // 3. Avduplicera alla banktransaktioner med den strikta avdupliceringsmotorn
        const uniqueBankTxs = deduplicateTransactions(mappedBankTxs);

        setTransactions((prev) => {
          const nonBankPrev = prev.filter((p) => !p.id.startsWith('bank-'));
          const combined = deduplicateTransactions([...uniqueBankTxs, ...nonBankPrev]);
          combined.sort((a, b) => {
            const dCmp = b.date.localeCompare(a.date);
            if (dCmp !== 0) return dCmp;
            return getTransactionTime(b).localeCompare(getTransactionTime(a));
          });
          return combined;
        });
      }

      return { connections: conns, accounts: accs };
    } catch {
      // Ej inloggad eller funktion ej nåbar
      return { connections: [], accounts: [] };
    }
  }, [targetPayday, weekendHandling]);

  // Tyst bakgrundssynk mot Enable Banking via Supabase Edge Function
  const performSilentBankSync = useCallback(
    async (force = false) => {
      if (syncInFlightRef.current) return;
      const now = Date.now();
      if (!force && now - lastSyncTimestampRef.current < AUTO_SYNC_COOLDOWN_MS) {
        return;
      }

      syncInFlightRef.current = true;
      lastSyncTimestampRef.current = now;

      try {
        const res = await bankService.sync();
        if (res.connections) setConnections(res.connections);
        if (res.accounts) setBankAccounts(res.accounts);
        await refreshBankStatus();
      } catch {
        // Tyst felhantering vid automatisk bakgrundssynk
      } finally {
        syncInFlightRef.current = false;
      }
    },
    [refreshBankStatus]
  );

  // Ladda användarens sparade inkomster/fasta kostnader/transaktioner från Supabase
  const loadSupabaseUserData = useCallback(async (uid: string) => {
    try {
      const [dbIncomes, dbFixed, dbTxs, dbSettings, dbProfile] = await Promise.all([
        dataService.getIncomeSources(uid).catch(() => []),
        dataService.getFixedExpenses(uid).catch(() => []),
        dataService.getTransactions(uid).catch(() => []),
        dataService.getSettings(uid).catch(() => null),
        dataService.getProfile(uid).catch(() => null),
      ]);

      if (dbSettings?.payday) {
        setTargetPayday(dbSettings.payday);
      }
      if (dbSettings?.paydayBeforeWeekend !== undefined) {
        const savedLocal = localStorage.getItem('dejz_weekend_handling');
        if (!savedLocal) {
          setWeekendHandling(dbSettings.paydayBeforeWeekend ? 'before' : 'none');
        }
      }
      if (dbProfile?.avatar_url) {
        setUserAvatar(dbProfile.avatar_url);
      }

      if (Array.isArray(dbIncomes) && dbIncomes.length > 0) {
        setIncomes(
          dbIncomes.map((inc) => {
            const cat = inc.category || 'Lön';
            return {
              id: inc.id,
              name: inc.name,
              amount: Number(inc.amount) || 0,
              payday: inc.deductionDay || 25,
              category: cat,
              logo: inc.logo || getLogoUrl(inc.name, cat),
            };
          })
        );
      }

      if (Array.isArray(dbFixed) && dbFixed.length > 0) {
        setFixedExpenses(
          dbFixed
            .filter((f) => !f.isCancelled)
            .map((f) => {
              const cat = f.category || 'Boende';
              return {
                id: f.id,
                name: f.name,
                amount: Number(f.amount) || 0,
                dueDay: f.deductionDay || 27,
                category: cat,
                paymentMethod: f.paymentMethod,
                logo: f.logo || getLogoUrl(f.name, cat),
              };
            })
        );
      }

      if (Array.isArray(dbTxs) && dbTxs.length > 0) {
        const mappedDbTxs: TransactionItem[] = dbTxs.map((t) => {
          const isIncome = t.type === 'income';
          const title = t.merchant || t.note || t.category || (isIncome ? 'Inkomst' : 'Utgift');
          const cat = t.category || (isIncome ? 'Inkomst' : 'Övrigt');
          const dateStr = formatIsoDateStockholm(t.timestamp);
          const explicitTime = t.timestamp ? formatIsoTimeStockholm(t.timestamp) : null;
          return {
            id: t.id,
            title,
            amount: Math.abs(Number(t.amount) || 0),
            type: isIncome ? ('income' as const) : ('expense' as const),
            category: cat,
            date: dateStr,
            time:
              explicitTime ||
              getTransactionTime({
                id: t.id,
                title,
                category: cat,
                date: dateStr,
                note: t.note,
              }),
            note: t.note,
            logo: t.logo || getLogoUrl(title, cat),
          };
        });

        setTransactions((prev) => {
          const bankOnly = prev.filter((p) => p.id.startsWith('bank-'));
          const combined = deduplicateTransactions([...bankOnly, ...mappedDbTxs]);
          combined.sort((a, b) => {
            const dCmp = b.date.localeCompare(a.date);
            if (dCmp !== 0) return dCmp;
            return getTransactionTime(b).localeCompare(getTransactionTime(a));
          });
          return combined;
        });
      }
    } catch {
      // Fallback till befintlig state
    }
  }, []);

  // Hantera Enable Banking OAuth callback (?code=...&state=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state && userId) {
      setCallbackStatusMsg('Slutför bankkoppling via Enable Banking...');
      window.history.replaceState({}, '', '/');

      bankService
        .exchangeCode({ code, state })
        .then(async (res) => {
          const allIds = (res.accounts || []).map((a) => a.id);
          if (res.connection && allIds.length > 0) {
            await bankService.selectAccounts({
              connectionId: res.connection.id,
              selectedAccountIds: allIds,
            });
            await bankService.sync({ connectionId: res.connection.id });
          }
          await refreshBankStatus();
          setCallbackStatusMsg(null);
          setIsBankModalOpen(true);
        })
        .catch((err: any) => {
          setCallbackStatusMsg(`Kunde inte slutföra bankkoppling: ${err.message || 'Okänt fel'}`);
          setTimeout(() => setCallbackStatusMsg(null), 6000);
        });
    }
  }, [userId, refreshBankStatus]);

  // Initiera Supabase-session och trigga automatisk synk vid appstart
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }: any) => {
        if (session?.user) {
          setUserId(session.user.id);
          setUserEmail(session.user.email || null);
          const metaAvatar =
            session.user.user_metadata?.avatar_url ||
            session.user.user_metadata?.picture ||
            null;
          if (metaAvatar) setUserAvatar(metaAvatar);
          await loadSupabaseUserData(session.user.id);
          const status = await refreshBankStatus();
          const hasActive = status.connections.some((c) => c.status === 'active');
          if (hasActive) {
            performSilentBankSync();
          }
        }
      })
      .catch(() => {});

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e: any, session: any) => {
      if (session?.user) {
        setUserId(session.user.id);
        setUserEmail(session.user.email || null);
        const metaAvatar =
          session.user.user_metadata?.avatar_url ||
          session.user.user_metadata?.picture ||
          null;
        if (metaAvatar) setUserAvatar(metaAvatar);
        await loadSupabaseUserData(session.user.id);
        const status = await refreshBankStatus();
        if (status.connections.some((c) => c.status === 'active')) {
          performSilentBankSync();
        }
      } else {
        setUserId(null);
        setUserEmail(null);
        setConnections([]);
        setBankAccounts([]);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [refreshBankStatus, loadSupabaseUserData, performSilentBankSync]);

  // Kontinuerlig automatisk synk i appen:
  // 1) Vid återkomst till fliken/appen (visibilitychange + window focus)
  // 2) Tyst intervall var 2:a minut så länge användaren är inne i appen
  // 3) Supabase Realtime-lyssnare på bank_accounts, bank_transactions och bank_connections
  const hasActiveBankConnection = useMemo(
    () => connections.some((c) => c.status === 'active'),
    [connections]
  );

  useEffect(() => {
    if (!userId || !hasActiveBankConnection) return;

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        performSilentBankSync(false);
      }
    }, AUTO_SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.clearInterval(intervalId);
    };
  }, [userId, hasActiveBankConnection, performSilentBankSync]);

  // Supabase Realtime: Lyssna direkt på databasändringar i bank_accounts, bank_transactions & bank_connections
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dejz-live-bank-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshBankStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_transactions',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshBankStatus();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_connections',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refreshBankStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refreshBankStatus]);

  // Konvertera Enable Banking-konton till visningskonton för Hem-fliken
  const accounts: AccountItem[] = useMemo(() => {
    const connMap = new Map<string, { name: string; logo?: string | null }>();
    for (const c of connections) {
      connMap.set(c.id, { name: c.aspsp_name, logo: c.aspsp_logo });
    }

    const activeAccs = bankAccounts.filter((a) => a.is_selected !== false);
    const listToUse = activeAccs.length > 0 ? activeAccs : bankAccounts;

    return listToUse.map((ba) => {
      const connInfo = connMap.get(ba.connection_id);
      const bankName = connInfo?.name || 'Bank';
      const displayName = getBankAccountTitle(ba, bankName);
      const formattedNumber = formatBankAccountNumber(ba.bban || ba.iban || ba.product || '');
      return {
        id: ba.id,
        name: displayName,
        accountNumber: formattedNumber,
        bankName,
        balance: Number(ba.balance_amount) || 0,
        type: 'checking' as const,
        logo: connInfo?.logo || getLogoUrl(bankName, 'Bank'),
      };
    });
  }, [connections, bankAccounts]);

  const connectedBank = useMemo(() => {
    const activeConns = connections.filter((c) => c.status === 'active');
    if (activeConns.length > 0) {
      return activeConns.map((c) => c.aspsp_name).join(', ');
    }
    if (connections.length > 0) {
      return connections.map((c) => c.aspsp_name).join(', ');
    }
    return null;
  }, [connections]);

  // Beräkna aktuell period (från lönedag till dagen innan nästa lön) med vald helghantering:
  const period: PeriodInfo = useMemo(() => {
    return calculateCurrentPeriod(new Date(), targetPayday, weekendHandling);
  }, [targetPayday, weekendHandling]);

  // Uppdatera lönedag & spara till Supabase
  const handleUpdatePayday = useCallback(
    (day: number) => {
      setTargetPayday(day);
      if (userId) {
        dataService.updateProfile(userId, { payday: day }).catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera helghantering & spara till Supabase
  const handleUpdateWeekendHandling = useCallback(
    (mode: WeekendHandlingMode) => {
      setWeekendHandling(mode);
      if (userId) {
        dataService
          .updateProfile(userId, { payday_before_weekend: mode === 'before' })
          .catch(() => {});
      }
    },
    [userId]
  );

  // Uppdatera profilbild
  const handleUpdateAvatar = useCallback(
    (avatarDataUrl: string | null) => {
      setUserAvatar(avatarDataUrl);
      if (userId && avatarDataUrl) {
        dataService.updateProfile(userId, { avatar_url: avatarDataUrl }).catch(() => {});
      }
    },
    [userId]
  );

  // Totalt saldo
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // Total inkomst
  const totalIncome = useMemo(() => {
    return incomes.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  }, [incomes]);

  // Totala fasta kostnader
  const totalFixedExpenses = useMemo(() => {
    return fixedExpenses.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
  }, [fixedExpenses]);

  // Transaktioner som tillhör den aktuella löneperioden (från lönedag till dagen innan nästa lön)
  const periodTransactions = useMemo(() => {
    return deduplicateTransactions(transactions).filter((t) => isDateInPeriod(t.date, period));
  }, [transactions, period]);

  // Transaktioner som ska visas i Historik-fliken:
  // Innehåller faktiska transaktioner + inkomstposter genererade för registrerade inkomster (Lön etc.) på lönedagar,
  // noggrant avduplicerade mot eventuella bankinbetalningar så att inga dubbletter kan uppstå.
  const displayTransactions = useMemo(() => {
    const combined = [...transactions];
    for (const inc of incomes) {
      if (!inc.amount || inc.amount <= 0) continue;
      const payDates = getPayDatesForIncome(inc, targetPayday, weekendHandling === 'before');
      for (const pDate of payDates) {
        const genId = `inc-${inc.id}-${pDate}`;
        if (dismissedTxIds.includes(genId)) continue;

        // Kontrollera om denna inkomst redan finns i transaktionslistan (t.ex. synkad från banken eller manuell)
        const isCovered = combined.some((t) => {
          if (t.type !== 'income') return false;
          if (t.id === genId) return true;
          const sameAmount = Math.abs((Number(t.amount) || 0) - inc.amount) <= 5;
          if (!sameAmount) return false;
          const d1 = new Date(t.date).getTime();
          const d2 = new Date(pDate).getTime();
          return !isNaN(d1) && !isNaN(d2) && Math.abs(d1 - d2) <= 3 * 86400 * 1000;
        });

        if (!isCovered) {
          combined.push({
            id: genId,
            title: inc.name,
            amount: inc.amount,
            type: 'income',
            category: inc.category || 'Lön',
            date: pDate,
            time: '08:00',
            logo: inc.logo || getLogoUrl(inc.name, inc.category || 'Lön'),
          });
        }
      }
    }
    return deduplicateTransactions(combined);
  }, [transactions, incomes, targetPayday, weekendHandling, dismissedTxIds]);

  // Totala rörliga köp under aktuell period
  const totalVariableSpent = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type !== 'income')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [periodTransactions]);

  // Kvar att spendera under aktuell period
  const kvarAttSpendera = useMemo(() => {
    return Math.max(0, totalIncome - totalFixedExpenses - totalVariableSpent);
  }, [totalIncome, totalFixedExpenses, totalVariableSpent]);

  // Dagsbudget
  const dagsbudget = useMemo(() => {
    if (period.daysRemaining <= 0 || kvarAttSpendera <= 0) return 0;
    return Math.round(kvarAttSpendera / period.daysRemaining);
  }, [kvarAttSpendera, period.daysRemaining]);

  // Synka med Enable Banking
  const handleSyncBank = async () => {
    setSyncingBank(true);
    lastSyncTimestampRef.current = Date.now();
    try {
      const res = await bankService.sync();
      setConnections(res.connections || []);
      setBankAccounts(res.accounts || []);
      await refreshBankStatus();
    } catch {
      // ignore error
    } finally {
      setSyncingBank(false);
    }
  };

  // Koppla från Enable Banking
  const handleDisconnectBank = async (connectionId?: string) => {
    const targetId = connectionId || connections[0]?.id;
    if (!targetId) return;
    try {
      await bankService.disconnect(targetId);
      await refreshBankStatus();
    } catch {
      await refreshBankStatus();
    }
  };

  const handleAddIncome = async (data: Omit<IncomeItem, 'id'>) => {
    const logo = data.logo || getLogoUrl(data.name, data.category);
    const newItem: IncomeItem = { ...data, logo, id: 'inc-' + Date.now() };
    setIncomes((prev) => [...prev, newItem]);
    if (userId) {
      await dataService
        .saveIncomeSource(userId, {
          id: newItem.id,
          name: newItem.name,
          amount: newItem.amount,
          deductionDay: newItem.payday,
          category: newItem.category,
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleUpdateIncome = async (updated: IncomeItem) => {
    const logo = updated.logo || getLogoUrl(updated.name, updated.category);
    const itemWithLogo: IncomeItem = { ...updated, logo };
    setIncomes((prev) =>
      prev.map((i) => (i.id === itemWithLogo.id ? itemWithLogo : i))
    );
    if (userId) {
      await dataService
        .saveIncomeSource(userId, {
          id: itemWithLogo.id,
          name: itemWithLogo.name,
          amount: itemWithLogo.amount,
          deductionDay: itemWithLogo.payday,
          category: itemWithLogo.category,
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteIncome = async (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    if (userId) {
      await dataService.deleteIncomeSource(id).catch(() => {});
    }
  };

  const handleAddFixed = async (data: Omit<FixedExpenseItem, 'id'>) => {
    const logo = data.logo || getLogoUrl(data.name, data.category);
    const newItem: FixedExpenseItem = { ...data, logo, id: 'fix-' + Date.now() };
    setFixedExpenses((prev) => [...prev, newItem].sort((a, b) => a.dueDay - b.dueDay));
    if (userId) {
      await dataService
        .saveFixedExpense(userId, {
          id: newItem.id,
          name: newItem.name,
          amount: newItem.amount,
          deductionDay: newItem.dueDay,
          category: newItem.category,
          paymentMethod: newItem.paymentMethod || 'Autogiro',
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleUpdateFixed = async (updated: FixedExpenseItem) => {
    const logo = updated.logo || getLogoUrl(updated.name, updated.category);
    const itemWithLogo: FixedExpenseItem = { ...updated, logo };
    setFixedExpenses((prev) =>
      prev
        .map((f) => (f.id === itemWithLogo.id ? itemWithLogo : f))
        .sort((a, b) => a.dueDay - b.dueDay)
    );
    if (userId) {
      await dataService
        .saveFixedExpense(userId, {
          id: itemWithLogo.id,
          name: itemWithLogo.name,
          amount: itemWithLogo.amount,
          deductionDay: itemWithLogo.dueDay,
          category: itemWithLogo.category,
          paymentMethod: itemWithLogo.paymentMethod || 'Autogiro',
          frequency: Frequency.MONTHLY,
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteFixed = async (id: string) => {
    setFixedExpenses((prev) => prev.filter((f) => f.id !== id));
    if (userId) {
      await dataService.deleteFixedExpense(id).catch(() => {});
    }
  };

  const handleAddTransaction = async (data: Omit<TransactionItem, 'id'>) => {
    const logo = data.logo || getLogoUrl(data.title, data.category);
    const newItem: TransactionItem = { ...data, logo, id: 'tx-' + Date.now() };
    setTransactions((prev) => [newItem, ...prev]);
    if (userId) {
      await dataService
        .addTransaction(userId, {
          amount: newItem.amount,
          category: newItem.category,
          merchant: newItem.title,
          note: newItem.note,
          tags: [],
          timestamp: new Date(newItem.date).getTime() || Date.now(),
          type: 'expense',
          logo,
        })
        .catch(() => {});
    }
  };

  const handleUpdateTransaction = async (updated: TransactionItem) => {
    const logo = updated.logo || getLogoUrl(updated.title, updated.category);
    const itemWithLogo: TransactionItem = { ...updated, logo };
    setTransactions((prev) => {
      const exists = prev.some((t) => t.id === itemWithLogo.id);
      if (exists) {
        return prev.map((t) => (t.id === itemWithLogo.id ? itemWithLogo : t));
      } else {
        return [itemWithLogo, ...prev];
      }
    });
    if (userId && !itemWithLogo.id.startsWith('bank-') && !itemWithLogo.id.startsWith('inc-')) {
      await dataService
        .updateTransaction(itemWithLogo.id, {
          amount: itemWithLogo.amount,
          category: itemWithLogo.category,
          merchant: itemWithLogo.title,
          note: itemWithLogo.note,
          tags: [],
          timestamp: new Date(itemWithLogo.date).getTime() || Date.now(),
          type: itemWithLogo.type || 'expense',
          logo,
        })
        .catch(() => {});
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (id.startsWith('inc-')) {
      setDismissedTxIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
    if (userId && !id.startsWith('bank-') && !id.startsWith('inc-')) {
      await dataService.deleteTransaction(id).catch(() => {});
    }
  };

  const handleExcludeTransaction = async (id: string, exclude: boolean) => {
    if (id.startsWith('bank-')) {
      const bankTxId = id.replace(/^bank-/, '');
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                isExcluded: exclude,
                reconciliationStatus: exclude ? 'excluded' : 'unprocessed',
              }
            : t
        )
      );
      await bankService
        .updateTransactionReconciliation(bankTxId, {
          reconciliation_status: exclude ? 'excluded' : 'unprocessed',
        })
        .catch(() => {});
      loadBankData();
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    setUserId(null);
    setUserEmail(null);
    setConnections([]);
    setBankAccounts([]);
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Är du säker på att du vill radera ditt konto och all sparad data? Denna åtgärd går inte att ångra.'
    );
    if (!confirmed) return;

    await supabase.auth.signOut().catch(() => {});

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('dejz_')) {
        localStorage.removeItem(key);
      }
    }

    setUserId(null);
    setUserEmail(null);
    setUserAvatar(null);
    setConnections([]);
    setBankAccounts([]);
    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setDismissedTxIds([]);
    setTargetPayday(25);
    setWeekendHandling('before');
    setActiveTab('home');

    alert('Ditt konto och all data har raderats.');
  };

  const handleResetAccount = () => {
    const confirmed = window.confirm(
      'Är du säker på att du vill nollställa all finansiell data och börja om helt på nytt?'
    );
    if (!confirmed) return;

    const financialKeys = [
      'dejz_incomes',
      'dejz_fixed_expenses',
      'dejz_transactions',
      'dejz_dismissed_tx_ids',
      'dejz_bank_connections',
      'dejz_bank_accounts',
    ];
    financialKeys.forEach((key) => localStorage.removeItem(key));

    setIncomes([]);
    setFixedExpenses([]);
    setTransactions([]);
    setDismissedTxIds([]);
    setConnections([]);
    setBankAccounts([]);
    setActiveTab('home');

    alert('Kontot har nollställts och du kan börja om på nytt.');
  };



  return (
    <div className="min-h-screen bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col font-sans transition-colors selection:bg-[var(--text-primary)] selection:text-[var(--bg-color)]">
      {/* Top Navbar: Endast Dejz-logga och profilbild */}
      <Navbar
        userEmail={userEmail}
        userAvatar={userAvatar}
        onLogoClick={() => setActiveTab('home')}
        onProfileClick={() => setActiveTab('settings')}
      />

      {/* OAuth Callback Banner */}
      {callbackStatusMsg && (
        <div className="max-w-md mx-auto w-full px-4 pt-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
            {callbackStatusMsg}
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 pt-4">
        {activeTab === 'home' && (
          <HomeTab
            period={period}
            connectedBank={connectedBank}
            accounts={accounts}
            incomes={incomes}
            fixedExpenses={fixedExpenses}
            transactions={periodTransactions.length > 0 ? periodTransactions : transactions}
            totalBalance={totalBalance}
            totalIncome={totalIncome}
            totalFixedExpenses={totalFixedExpenses}
            totalVariableSpent={totalVariableSpent}
            kvarAttSpendera={kvarAttSpendera}
            dagsbudget={dagsbudget}
            onOpenBank={() => setIsBankModalOpen(true)}
            onSelectTransaction={(tx) => {
              setSelectedTransaction(tx);
              setIsTxModalOpen(true);
            }}
            onSelectFixed={(exp) => {
              setSelectedFixedExpense(exp);
              setIsFixedModalOpen(true);
            }}
            onNavigateToFixed={() => setActiveTab('fixed')}
            onNavigateToTransactions={() => setActiveTab('transactions')}
          />
        )}

        {activeTab === 'fixed' && (
          <FixedTab
            period={period}
            incomes={incomes}
            fixedExpenses={fixedExpenses}
            totalIncome={totalIncome}
            totalFixedExpenses={totalFixedExpenses}
            onSelectIncome={(inc) => {
              setSelectedIncome(inc);
              setIsIncomeModalOpen(true);
            }}
            onSelectFixed={(exp) => {
              setSelectedFixedExpense(exp);
              setIsFixedModalOpen(true);
            }}
            onDeleteIncome={handleDeleteIncome}
            onDeleteFixed={handleDeleteFixed}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={displayTransactions}
            totalVariableSpent={totalVariableSpent}
            onSelectTransaction={(tx) => {
              setSelectedTransaction(tx);
              setIsTxModalOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            period={period}
            connectedBank={connectedBank}
            connections={connections}
            syncingBank={syncingBank}
            targetPayday={targetPayday}
            weekendHandling={weekendHandling}
            userEmail={userEmail}
            userAvatar={userAvatar}
            onUpdatePayday={handleUpdatePayday}
            onUpdateWeekendHandling={handleUpdateWeekendHandling}
            onUpdateAvatar={handleUpdateAvatar}
            onOpenBank={() => setIsBankModalOpen(true)}
            onDisconnectBank={handleDisconnectBank}
            onSyncBank={handleSyncBank}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onDeleteAccount={handleDeleteAccount}
            onResetAccount={handleResetAccount}
          />
        )}
      </main>

      {/* Clean 4-tab bottom navigation dock */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      {/* Modals */}
      <BankModal
        isOpen={isBankModalOpen}
        userEmail={userEmail}
        connections={connections}
        bankAccounts={bankAccounts}
        onClose={() => setIsBankModalOpen(false)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onBankStateUpdated={(conns, accs) => {
          setConnections(conns);
          setBankAccounts(accs);
          refreshBankStatus();
        }}
      />

      <IncomeModal
        isOpen={isIncomeModalOpen}
        initialIncome={selectedIncome}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setSelectedIncome(null);
        }}
        onSave={handleAddIncome}
        onUpdate={handleUpdateIncome}
        onDelete={handleDeleteIncome}
      />

      <FixedExpenseModal
        isOpen={isFixedModalOpen}
        initialExpense={selectedFixedExpense}
        onClose={() => {
          setIsFixedModalOpen(false);
          setSelectedFixedExpense(null);
        }}
        onSave={handleAddFixed}
        onUpdate={handleUpdateFixed}
        onDelete={handleDeleteFixed}
      />

      <TransactionModal
        isOpen={isTxModalOpen}
        initialTransaction={selectedTransaction}
        onClose={() => {
          setIsTxModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSave={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        onDelete={handleDeleteTransaction}
        onExclude={handleExcludeTransaction}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(email) => {
          setUserEmail(email);
          refreshBankStatus();
        }}
      />
    </div>
  );
};

export default App;
