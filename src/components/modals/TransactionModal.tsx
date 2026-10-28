import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Heart,
  Package,
  Paperclip,
  Trash,
  FileText,
  ArrowsClockwise,
  CaretRight,
  CaretLeft,
  Check,
  UserPlus,
  Copy,
  ChatCircleText,
  QrCode,
  ClockCounterClockwise,
  PencilSimple,
  CalendarBlank,
  Sparkle,
} from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { SwishLogo } from '../SwishLogo';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import {
  TransactionItem,
  getTransactionTime,
  FixedExpenseItem,
  IncomeItem,
  AccountItem,
} from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { formatSwedishFullDate, formatSwedishDateHeading } from '../../utils/swedishDate';
import {
  checkIsRecurringTransaction,
  findSimilarTransactionsForTransaction,
} from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  syncAllUserPreferencesToSupabase,
  compressImageFileToDataUrl,
} from '../../utils/appCache';

interface TransactionModalProps {
  isOpen: boolean;
  initialTransaction?: TransactionItem | null;
  transactions?: TransactionItem[];
  accounts?: AccountItem[];
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  onClose: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onSave?: (data: Omit<TransactionItem, 'id'>) => void;
  onUpdate?: (
    tx: TransactionItem,
    applyToSimilarIds?: string[],
    options?: {
      renameScope?: 'single' | 'same-merchant' | 'chain';
      renameTargetIds?: string[];
      categoryTargetIds?: string[];
    }
  ) => void;
  onDelete?: (id: string) => void;
  onExclude?: (id: string, exclude: boolean) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: 'expense' | 'income') => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  isInternalTransfer?: boolean;
}

type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'payment-picker'
  | 'date-picker'
  | 'similar'
  | 'swish'
  | 'receipt-preview';

function getDefaultPaymentMethodForTx(tx: TransactionItem): string {
  if (tx.paymentMethod) return tx.paymentMethod;
  const combined = `${tx.title || ''} ${tx.category || ''} ${tx.rawDescription || ''}`.toLowerCase();
  if (combined.includes('swish')) return 'Swish';
  if (combined.includes('autogiro')) return 'Autogiro';
  if (combined.includes('klarna')) return 'Klarna';
  if (combined.includes('faktura') || combined.includes('e-faktura')) return 'Faktura';
  if (tx.type === 'income') return 'Överföring';
  return 'Kort';
}

interface SwishContact {
  id: string;
  name: string;
  phone: string;
}

const SWISH_CONTACTS_STORAGE_KEY = 'dejz_swish_contacts';
const MY_SWISH_PHONE_STORAGE_KEY = 'dejz_my_swish_phone';

function loadSwishContacts(): SwishContact[] {
  try {
    const raw = localStorage.getItem(SWISH_CONTACTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSwishContacts(contacts: SwishContact[]) {
  try {
    localStorage.setItem(SWISH_CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

function loadMySwishPhone(): string {
  try {
    return localStorage.getItem(MY_SWISH_PHONE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveMySwishPhone(phone: string) {
  try {
    localStorage.setItem(MY_SWISH_PHONE_STORAGE_KEY, phone);
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function normalizeSwedishSwishNumber(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0046') && digits.length > 4) {
    return '0' + digits.slice(4);
  }
  if (digits.startsWith('46') && digits.length >= 10) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialTransaction,
  transactions = [],
  accounts = [],
  fixedExpenses = [],
  incomes = [],
  onClose,
  onSelectTransaction,
  onSave,
  onUpdate,
  onDelete,
  onExclude,
  onMarkAsFixed,
  onToggleHeart,
  onTogglePackage,
}) => {
  const isCreateMode = !initialTransaction;

  // Retain last active transaction during 240ms exit animation
  const lastTxRef = useRef<TransactionItem | null>(null);
  if (initialTransaction) {
    lastTxRef.current = initialTransaction;
  }
  const activeTx = isCreateMode ? null : initialTransaction || lastTxRef.current;

  const [subView, setSubView] = useState<ModalSubView>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Kort');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSimilarPopup, setShowSimilarPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swish / Be om Swish / Dela i budget state
  const [swishMode, setSwishMode] = useState<'request' | 'budget-split' | 'send'>('request');
  const [swishAmount, setSwishAmount] = useState<number>(0);
  const [myBudgetShareAmount, setMyBudgetShareAmount] = useState<number>(0);
  const [selectedLinkedSwishId, setSelectedLinkedSwishId] = useState<string | undefined>(undefined);
  const [swishPhone, setSwishPhone] = useState('');
  const [swishRecipientName, setSwishRecipientName] = useState('');
  const [swishMessage, setSwishMessage] = useState('');
  const [swishContacts, setSwishContacts] = useState<SwishContact[]>(() => loadSwishContacts());
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [swishFeedback, setSwishFeedback] = useState<string | null>(null);
  const [mySwishPhone, setMySwishPhone] = useState<string>(() => loadMySwishPhone());
  const [isEditingMyPhone, setIsEditingMyPhone] = useState<boolean>(() => !loadMySwishPhone());
  const [showSwishQr, setShowSwishQr] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [trackPendingSwish, setTrackPendingSwish] = useState<boolean>(true);
  const [simulatedScanState, setSimulatedScanState] = useState<'idle' | 'scanning' | 'success'>('idle');
  const scanTimerRef = useRef<number | null>(null);
  const [pickerYearMonth, setPickerYearMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showFullAccount, setShowFullAccount] = useState(false);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    setNavDirection(dir);
    setSubView(next);
  };

  const isIncome = isCreateMode ? txType === 'income' : activeTx?.type === 'income';

  const availableCategories = useMemo(() => {
    const list = isIncome ? getStoredIncomeCategories() : getStoredExpenseCategories();
    return list.map((c) => c.name);
  }, [isOpen, isIncome]);

  const availablePaymentMethods = useMemo(() => {
    const stored = getStoredPaymentMethods().map((m) => m.name);
    if (paymentMethod && !stored.includes(paymentMethod)) {
      return [...stored, paymentMethod];
    }
    return stored;
  }, [isOpen, paymentMethod]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTransaction) {
      const kind = initialTransaction.type === 'income' ? 'income' : 'expense';
      setTxType(kind);
      setTitle(initialTransaction.title || '');
      setAmount(initialTransaction.amount);
      setDate(initialTransaction.date || '');
      setPaymentMethod(getDefaultPaymentMethodForTx(initialTransaction));
      const rawNote = (initialTransaction.note || '').trim();
      const rawDesc = (initialTransaction.rawDescription || '').trim();
      const rawCp = (initialTransaction.counterpartyName || '').trim();
      const isRawDuplicate =
        (rawDesc && rawNote.toLowerCase() === rawDesc.toLowerCase()) ||
        (rawCp && rawNote.toLowerCase() === rawCp.toLowerCase());
      setNote(isRawDuplicate ? '' : rawNote);
      setCategory(
        normalizeCategoryToValid(
          initialTransaction.category || (kind === 'income' ? 'Lön' : 'Övrigt'),
          kind
        )
      );
      setSubView('details');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
      setShowSimilarPopup(false);
      setShowFullAccount(false);
      setSwishMode('request');
      const fullOriginalAmt = initialTransaction.originalAmount || initialTransaction.amount;
      setSwishAmount(
        initialTransaction.pendingSwishAmount || Math.max(1, Math.round(fullOriginalAmt / 2))
      );
      setMyBudgetShareAmount(Math.round(initialTransaction.amount));
      setSelectedLinkedSwishId(initialTransaction.linkedSwishTxId);
      setSwishRecipientName(initialTransaction.pendingSwishRecipient || '');
      setTrackPendingSwish(
        initialTransaction.isWaitingForSwish !== undefined
          ? initialTransaction.isWaitingForSwish
          : true
      );
      setSwishMessage(initialTransaction.title || '');
      setSwishFeedback(null);
      setIsAddingContact(false);
      const storedMyPhone = loadMySwishPhone();
      setMySwishPhone(storedMyPhone);
      setIsEditingMyPhone(!storedMyPhone);
      setShowSwishQr(true);
      setSimulatedScanState('idle');
    } else {
      const todayIso = new Date().toISOString().slice(0, 10);
      setTxType('expense');
      setTitle('');
      setAmount('');
      setDate(todayIso);
      setPickerYearMonth({
        year: parseInt(todayIso.slice(0, 4), 10),
        month: parseInt(todayIso.slice(5, 7), 10) - 1,
      });
      setPaymentMethod('Kort');
      setNote('');
      setCategory('Mat & dryck');
      setSubView('edit');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
      setShowSimilarPopup(false);
    }
  }, [initialTransaction, isOpen]);

  const normalizedMySwishPhone = useMemo(
    () => normalizeSwedishSwishNumber(mySwishPhone),
    [mySwishPhone]
  );

  const cleanSwishMessage = useMemo(() => {
    const rawMsg = swishMessage || activeTx?.title || '';
    return rawMsg.replace(/;/g, ' ').trim().slice(0, 50);
  }, [swishMessage, activeTx?.title]);

  useEffect(() => {
    let cancelled = false;
    if (subView !== 'swish' || swishMode !== 'request') {
      setQrDataUrl(null);
      return;
    }
    const phoneToUse =
      normalizedMySwishPhone.length >= 7 ? normalizedMySwishPhone : '0701234567';
    const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
    const swishQrPayload = `C${phoneToUse};${amt};${cleanSwishMessage};0`;
    QRCode.toDataURL(swishQrPayload, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#09090B',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [subView, swishMode, normalizedMySwishPhone, swishAmount, cleanSwishMessage]);

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    };
  }, []);

  const handleSimulateScan = () => {
    if (simulatedScanState !== 'idle' || !activeTx) return;
    setSimulatedScanState('scanning');
    if (scanTimerRef.current) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = window.setTimeout(() => {
      setSimulatedScanState('success');
      const fullAmt = Math.round(activeTx.originalAmount || activeTx.amount);
      const reqAmt = Math.max(1, Math.min(fullAmt, Math.round(Number(swishAmount) || 0)));
      const nextMyShare = Math.max(0, fullAmt - reqAmt);
      const payerName = (swishRecipientName || 'Vän').trim();

      // 1. Skapa en inkommen Swish-transaktion i historiken
      if (onSave) {
        const currentTime = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'Europe/Stockholm',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
          .format(new Date())
          .replace('.', ':');
        onSave({
          title: `Swish från ${payerName}`,
          amount: reqAmt,
          date: activeTx.date || new Date().toISOString().slice(0, 10),
          time: currentTime,
          category: 'Swish',
          type: 'income',
          paymentMethod: 'Swish',
          note: `Avräknat för ${cleanSwishMessage || activeTx.title}`,
        });
      }

      // 2. Uppdatera utlägget så din budgetandel sänks och bevakningen markeras som klar
      if (onUpdate) {
        onUpdate({
          ...activeTx,
          amount: nextMyShare,
          originalAmount: fullAmt,
          isWaitingForSwish: false,
          pendingSwishAmount: undefined,
          pendingSwishRecipient: undefined,
        });
      }

      setSwishFeedback(
        `✓ Swish på ${formatKr(reqAmt)} mottagen! Beloppet har dragits av från ditt utlägg och lagts till i historiken.`
      );
    }, 650);
  };

  const handleResetSimulation = () => {
    setSimulatedScanState('idle');
    setSwishFeedback(null);
  };

  const resolvedAccountInfo = useMemo(() => {
    if (!activeTx) return null;
    const raw = activeTx.bankAccountName || '';
    const checking =
      (activeTx.bankAccountId
        ? accounts.find((a) => a.id === activeTx.bankAccountId)
        : undefined) ||
      accounts.find(
        (a) =>
          raw &&
          (raw.toLowerCase().includes(a.name.toLowerCase()) ||
            raw.toLowerCase().includes(a.bankName.toLowerCase()))
      ) ||
      accounts.find((a) => a.type === 'checking') ||
      accounts[0];

    const baseLabel = (raw || (checking ? `${checking.bankName} · ${checking.name}` : 'Lönekonto'))
      .replace(/\s*·\s*[•*·\d\s-]{4,}$/g, '')
      .replace(/\b\d[\d\s-]{5,}\b/g, '')
      .replace(/\s*·\s*$/, '')
      .trim() || 'Lönekonto';

    const rawAccNum = (checking?.accountNumber || '').trim();
    const digitsInRaw = (raw.match(/\d[\d\s-]{3,}\d/)?.[0] || '').trim();
    const sourceNum = rawAccNum || digitsInRaw;
    const digitsOnly = sourceNum.replace(/\D/g, '');

    let fullNumber = '';
    let maskedNumber = '';
    if (digitsOnly.length >= 7) {
      fullNumber = sourceNum.replace(/^[•*\s·-]+/, '').trim();
      maskedNumber = `•••• ${digitsOnly.slice(-4)}`;
    } else if (digitsOnly.length >= 4) {
      const last4 = digitsOnly.slice(-4);
      fullNumber = `5231-00 ${last4.slice(0, 2)} ${last4.slice(2)}`;
      maskedNumber = `•••• ${last4}`;
    } else {
      fullNumber = '5231-00 482 19';
      maskedNumber = '•••• 8219';
    }

    return {
      label: baseLabel,
      fullNumber,
      maskedNumber,
    };
  }, [activeTx, accounts]);

  const similarInfo = useMemo(
    () =>
      findSimilarTransactionsForTransaction(
        activeTx,
        transactions,
        fixedExpenses,
        incomes
      ),
    [activeTx, transactions, fixedExpenses, incomes]
  );

  // Hitta inkomna Swish-insättningar som kan kopplas för att räkna ner utgiften
  const recentIncomingSwishList = useMemo(() => {
    if (!activeTx || activeTx.type === 'income') return [];
    const baseFullAmt = activeTx.originalAmount || activeTx.amount;
    return transactions
      .filter((t) => {
        if (t.id === activeTx.id) return false;
        if (t.type !== 'income') return false;
        const isSwishTx =
          t.category === 'Swish' ||
          /swish/i.test(t.title || '') ||
          /swish/i.test(t.rawDescription || '');
        return isSwishTx && t.amount > 0 && t.amount < baseFullAmt;
      })
      .slice(0, 5);
  }, [activeTx, transactions]);

  if (!activeTx && !isCreateMode) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const txTime = activeTx ? getTransactionTime(activeTx) : '';
  const isExcluded = Boolean(activeTx?.isExcluded);
  const recurringStatus = activeTx
    ? checkIsRecurringTransaction(activeTx, fixedExpenses, incomes)
    : { isRecurring: false };

  const isBankSynced = Boolean(
    activeTx &&
      (activeTx.id?.startsWith('bank-') ||
        activeTx.rawDescription ||
        activeTx.counterpartyName ||
        activeTx.bankAccountName)
  );

  const commitEditChanges = (applyScope: 'single' | 'same-merchant' | 'chain') => {
    if (isCreateMode || !onUpdate || !activeTx) return;
    const nextTitle = title.trim() || activeTx.title;
    const nextCategory = category || activeTx.category;
    const nextNote = note.trim();
    const nextPaymentMethod = paymentMethod || getDefaultPaymentMethodForTx(activeTx);
    const nextDate = date || activeTx.date;
    const nextAmount = isBankSynced
      ? activeTx.amount
      : Math.max(1, Math.round(Number(amount) || activeTx.amount));

    const isTitleChanged = nextTitle !== activeTx.title;
    const isCategoryChanged = nextCategory !== activeTx.category;

    const targetIds =
      applyScope === 'chain'
        ? similarInfo.transactions.map((t) => t.id)
        : applyScope === 'same-merchant'
        ? similarInfo.sameMerchantTransactions.map((t) => t.id)
        : undefined;

    const categoryTargetIds =
      applyScope !== 'single' && isCategoryChanged ? targetIds : undefined;
    const renameTargetIds =
      applyScope !== 'single' && isTitleChanged ? targetIds : undefined;

    onUpdate(
      {
        ...activeTx,
        title: nextTitle,
        amount: nextAmount,
        date: isBankSynced ? activeTx.date : nextDate,
        category: nextCategory,
        paymentMethod: nextPaymentMethod,
        note: nextNote || undefined,
      },
      categoryTargetIds,
      {
        renameScope: isTitleChanged ? applyScope : 'single',
        renameTargetIds,
        categoryTargetIds,
      }
    );
    setShowSimilarPopup(false);
    navigateSubView('details', 'back');
  };

  const handleSaveEditClick = () => {
    if (isCreateMode || !activeTx) return;
    const nextTitle = title.trim() || activeTx.title;
    const isTitleChanged = nextTitle !== activeTx.title;
    const isCategoryChanged = category !== activeTx.category;

    if ((isTitleChanged || isCategoryChanged) && similarInfo.transactions.length > 1) {
      setShowSimilarPopup(true);
    } else {
      commitEditChanges('single');
    }
  };

  const handleCreateSave = () => {
    const cleanTitle = title.trim();
    const cleanAmt = Math.max(1, Math.round(Number(amount) || 0));
    if (!cleanTitle || cleanAmt <= 0) return;
    if (onSave) {
      const currentTime = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Stockholm',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
        .format(new Date())
        .replace('.', ':');
      onSave({
        title: cleanTitle,
        amount: cleanAmt,
        date: date || new Date().toISOString().slice(0, 10),
        time: currentTime,
        category: category || (txType === 'income' ? 'Lön' : 'Mat & dryck'),
        type: txType,
        paymentMethod: paymentMethod || 'Kort',
        note: note.trim() || undefined,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && activeTx) {
      onDelete(activeTx.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdate || !activeTx) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.74);
      onUpdate({
        ...activeTx,
        receiptUrl: dataUrl,
        receiptName: file.name,
      });
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  const displayName = title || activeTx?.title || (isIncome ? 'Ny inkomst' : 'Nytt köp');

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Hidden file input for receipt */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleReceiptUpload}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 1: LIKNANDE TRANSAKTIONER (Egen vy i arket)           */}
      {/* ============================================================== */}
      {subView === 'similar' && activeTx && (
        <div className={`${slideAnimClass} space-y-3.5`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView('details', 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              Liknande transaktioner
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          {/* Compact Merchant Summary Bar */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ItemLogo
                name={similarInfo.brandLabel || activeTx.title}
                category={category}
                logoUrl={activeTx.logo}
                size="sm"
              />
              <span className="font-medium text-[13px] text-[var(--text-primary)] truncate">
                {similarInfo.brandLabel || activeTx.title}
              </span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums shrink-0">
              {similarInfo.transactions.length} st · {formatKr(similarInfo.totalAmount)}
            </span>
          </div>

          {/* Clean Full List of Similar Transactions */}
          <div className="ui-sheet-group">
            {similarInfo.transactions.map((tx) => {
              const isCurrent = tx.id === activeTx.id;
              const txIsIncome = tx.type === 'income';
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => {
                    if (!isCurrent && onSelectTransaction) {
                      onSelectTransaction(tx);
                    } else {
                      navigateSubView('details', 'back');
                    }
                  }}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="ui-row-title">
                          {tx.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[11px] font-normal text-[var(--text-secondary)] shrink-0">
                            · Denna
                          </span>
                        )}
                      </div>
                      <span className="ui-row-subtitle tabular-nums">
                        {formatSwedishDateHeading(tx.date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`ui-row-amount ${
                          txIsIncome ? 'ui-row-amount-income' : ''
                        }`}
                      >
                        {txIsIncome ? '+' : '-'}
                        {formatKr(tx.amount)}
                      </span>
                      <span className="ui-row-meta">
                        {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                          ? 'Reserverat'
                          : getTransactionTime(tx)}
                      </span>
                    </div>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: KATEGORIVÄLJARE                                    */}
      {/* ============================================================== */}
      {subView === 'category-picker' && (
        <div className={`${slideAnimClass} space-y-4`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView('edit', 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              Välj kategori
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="ui-sheet-group">
            {availableCategories.map((c) => {
              const isSel = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    navigateSubView('edit', 'back');
                  }}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon category={c} size={14} badge={true} />
                    <span
                      className={`truncate ${
                        isSel
                          ? 'font-medium text-[var(--text-primary)]'
                          : 'font-normal text-[var(--text-primary)]'
                      }`}
                    >
                      {c}
                    </span>
                  </div>
                  {isSel && (
                    <Check size={14} weight="bold" className="text-[var(--text-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 3: BETALSÄTTSVÄLJARE                                  */}
      {/* ============================================================== */}
      {subView === 'payment-picker' && (
        <div className={`${slideAnimClass} space-y-4`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView('edit', 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              Välj betalsätt
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="ui-sheet-group">
            {availablePaymentMethods.map((m) => {
              const isSel = m === paymentMethod;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m);
                    navigateSubView('edit', 'back');
                  }}
                  className="ui-row-btn"
                >
                  <span
                    className={`truncate ${
                      isSel
                        ? 'font-medium text-[var(--text-primary)]'
                        : 'font-normal text-[var(--text-primary)]'
                    }`}
                  >
                    {m}
                  </span>
                  {isSel && (
                    <Check size={14} weight="bold" className="text-[var(--text-primary)] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 3.5: EGEN MODERN DATUMVÄLJARE                         */}
      {/* ============================================================== */}
      {subView === 'date-picker' && (
        <div className={`${slideAnimClass} space-y-4`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView('edit', 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title">
              Välj datum
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          {(() => {
            const now = new Date();
            const toIso = (d: Date) =>
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
                d.getDate()
              ).padStart(2, '0')}`;
            const todayIso = toIso(now);
            const yest = new Date(now);
            yest.setDate(now.getDate() - 1);
            const yesterdayIso = toIso(yest);
            const twoAgo = new Date(now);
            twoAgo.setDate(now.getDate() - 2);
            const twoDaysAgoIso = toIso(twoAgo);

            const quickPresets = [
              { label: 'Idag', sub: formatSwedishFullDate(todayIso), iso: todayIso },
              { label: 'Igår', sub: formatSwedishFullDate(yesterdayIso), iso: yesterdayIso },
              { label: 'I förrgår', sub: formatSwedishFullDate(twoDaysAgoIso), iso: twoDaysAgoIso },
            ];

            const monthNames = [
              'Januari',
              'Februari',
              'Mars',
              'April',
              'Maj',
              'Juni',
              'Juli',
              'Augusti',
              'September',
              'Oktober',
              'November',
              'December',
            ];
            const firstDayOfMonth = new Date(pickerYearMonth.year, pickerYearMonth.month, 1);
            // Monday = 0 ... Sunday = 6
            const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;
            const daysInMonth = new Date(
              pickerYearMonth.year,
              pickerYearMonth.month + 1,
              0
            ).getDate();

            const cells: (number | null)[] = [];
            for (let i = 0; i < startWeekday; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);

            return (
              <div className="space-y-3">
                {/* Snabbval */}
                <div className="grid grid-cols-3 gap-2">
                  {quickPresets.map((p) => {
                    const isSel = date === p.iso;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setDate(p.iso);
                          navigateSubView('edit', 'back');
                        }}
                        className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer active:scale-[0.98] ${
                          isSel
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xs'
                            : 'bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]'
                        }`}
                      >
                        <span className="font-display font-semibold text-xs block">
                          {p.label}
                        </span>
                        <span
                          className={`text-[10.5px] block truncate mt-0.5 tabular-nums ${
                            isSel ? 'opacity-80' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {p.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Kalender-matris */}
                <div className="rounded-3xl bg-[var(--bg-color)] p-3.5 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPickerYearMonth((prev) =>
                          prev.month === 0
                            ? { year: prev.year - 1, month: 11 }
                            : { year: prev.year, month: prev.month - 1 }
                        )
                      }
                      className="ui-icon-btn w-8 h-8 rounded-xl"
                    >
                      <CaretLeft size={14} weight="bold" />
                    </button>
                    <span className="font-display font-semibold text-xs sm:text-sm text-[var(--text-primary)] tabular-nums">
                      {monthNames[pickerYearMonth.month]} {pickerYearMonth.year}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPickerYearMonth((prev) =>
                          prev.month === 11
                            ? { year: prev.year + 1, month: 0 }
                            : { year: prev.year, month: prev.month + 1 }
                        )
                      }
                      className="ui-icon-btn w-8 h-8 rounded-xl"
                    >
                      <CaretRight size={14} weight="bold" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((w) => (
                      <span
                        key={w}
                        className="text-[10px] font-medium text-[var(--text-muted)] py-0.5"
                      >
                        {w}
                      </span>
                    ))}
                    {cells.map((dayNum, idx) => {
                      if (!dayNum) {
                        return <div key={`empty-${idx}`} className="h-10" />;
                      }
                      const iso = `${pickerYearMonth.year}-${String(
                        pickerYearMonth.month + 1
                      ).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const isSel = date === iso;
                      const isTodayCell = iso === todayIso;
                      return (
                        <button
                          key={iso}
                          type="button"
                          onClick={() => {
                            setDate(iso);
                            navigateSubView('edit', 'back');
                          }}
                          className={`relative ui-day-btn ${
                            isSel
                              ? 'ui-day-btn-active'
                              : isTodayCell
                              ? 'ring-1 ring-[var(--text-muted)]/40 font-semibold'
                              : ''
                          }`}
                        >
                          <span>{dayNum}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 4: SWISH / DELA UTLÄGG (Egen vy i arket)              */}
      {/* ============================================================== */}
      {subView === 'swish' && activeTx && (
        <div className={`${slideAnimClass} space-y-4 text-xs`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView('details', 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title flex items-center gap-1.5">
              <SwishLogo size={16} />
              <span>Dela utgift</span>
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          {/* Växla mellan Be om Swish, Dela i budget och Swisha */}
          <div className="ui-segmented grid-cols-3">
            <button
              type="button"
              onClick={() => setSwishMode('request')}
              className={`ui-segmented-tab ${
                swishMode === 'request' ? 'ui-segmented-tab-active' : ''
              }`}
            >
              Be om Swish
            </button>
            <button
              type="button"
              onClick={() => setSwishMode('budget-split')}
              className={`ui-segmented-tab ${
                swishMode === 'budget-split' ? 'ui-segmented-tab-active' : ''
              }`}
            >
              Dela i budget
            </button>
            <button
              type="button"
              onClick={() => setSwishMode('send')}
              className={`ui-segmented-tab ${
                swishMode === 'send' ? 'ui-segmented-tab-active' : ''
              }`}
            >
              Swisha
            </button>
          </div>

          {swishMode === 'budget-split' ? (
            <div className="space-y-4 animate-fade-in">
              {(() => {
                const fullAmt = Math.round(
                  activeTx.originalAmount || activeTx.amount
                );
                return (
                  <>
                    {/* Snabbval för min egen andel */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label: 'Min del 50%',
                          val: Math.max(1, Math.round(fullAmt / 2)),
                        },
                        {
                          label: 'Min del 33%',
                          val: Math.max(1, Math.round(fullAmt / 3)),
                        },
                        {
                          label: 'Hela (100%)',
                          val: fullAmt,
                        },
                      ].map((opt) => {
                        const isSel = Number(myBudgetShareAmount) === opt.val && !selectedLinkedSwishId;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => {
                              setSelectedLinkedSwishId(undefined);
                              setMyBudgetShareAmount(opt.val);
                            }}
                            className={`py-2.5 px-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                                : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                            }`}
                          >
                            <span className="text-[11px] opacity-80 block truncate">
                              {opt.label}
                            </span>
                            <span className="font-display font-bold tabular-nums block mt-0.5">
                              {opt.val} kr
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Eget belopp för min andel — kantlös inline-input */}
                    <div className="ui-sheet-group">
                      <div className="ui-row">
                        <span className="text-[var(--text-muted)]">Ursprungligt utlägg</span>
                        <span className="font-display font-bold text-[var(--text-secondary)] tabular-nums">
                          {formatKr(fullAmt)}
                        </span>
                      </div>
                      <label className="ui-input-row">
                        <span className="text-[var(--text-muted)]">Min kostnad i budget (kr)</span>
                        <input
                          type="number"
                          min="0"
                          max={fullAmt}
                          value={myBudgetShareAmount}
                          onChange={(e) => {
                            setSelectedLinkedSwishId(undefined);
                            setMyBudgetShareAmount(
                              Math.min(fullAmt, Math.max(0, Number(e.target.value) || 0))
                            );
                          }}
                          className="w-28 bg-transparent border-0 p-0 text-xs font-display font-bold text-[var(--text-primary)] text-right tabular-nums focus:outline-none"
                        />
                      </label>
                    </div>

                    {/* Koppla mot inkommen Swish */}
                    {recentIncomingSwishList.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] px-1 block">
                          Eller räkna av en inkommen Swish
                        </span>
                        <div className="ui-sheet-group">
                          {recentIncomingSwishList.map((swTx) => {
                            const isLinked = selectedLinkedSwishId === swTx.id;
                            const netAfterSwish = Math.max(0, Math.round(fullAmt - swTx.amount));
                            return (
                              <button
                                key={swTx.id}
                                type="button"
                                onClick={() => {
                                  if (isLinked) {
                                    setSelectedLinkedSwishId(undefined);
                                    setMyBudgetShareAmount(fullAmt);
                                  } else {
                                    setSelectedLinkedSwishId(swTx.id);
                                    setMyBudgetShareAmount(netAfterSwish);
                                  }
                                }}
                                className="ui-row-btn"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="ui-row-title">
                                    {swTx.title}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)] tabular-nums block">
                                    {formatSwedishFullDate(swTx.date)} · Kvar att betala:{' '}
                                    {formatKr(netAfterSwish)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="ui-row-amount ui-row-amount-income">
                                    +{formatKr(swTx.amount)}
                                  </span>
                                  <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                      isLinked
                                        ? 'bg-[var(--text-primary)] border-[var(--text-primary)] text-[var(--bg-color)]'
                                        : 'border-[var(--border-control)]'
                                    }`}
                                  >
                                    {isLinked && <Check size={12} weight="bold" />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Bevaka som "Väntar på Swish" på Hemfliken */}
                    {Number(myBudgetShareAmount) < fullAmt && !selectedLinkedSwishId && (
                      <div className="ui-sheet-group">
                        <div className="ui-row">
                          <div className="min-w-0 pr-2">
                            <span className="ui-row-title block">
                              Bevaka ”Väntar på Swish” på Hemfliken
                            </span>
                            <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 tabular-nums">
                              Påminner om {formatKr(fullAmt - Number(myBudgetShareAmount))} tills Swish kommer in
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={trackPendingSwish}
                            onClick={() => setTrackPendingSwish((prev) => !prev)}
                            className={`ui-switch ${
                              trackPendingSwish ? 'ui-switch-on' : 'ui-switch-off'
                            }`}
                          >
                            <span
                              className={`ui-switch-thumb ${
                                trackPendingSwish ? 'ui-switch-thumb-on' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (!onUpdate) return;
                        const nextShare = Math.min(
                          fullAmt,
                          Math.max(0, Math.round(Number(myBudgetShareAmount) || 0))
                        );
                        if (
                          selectedLinkedSwishId &&
                          selectedLinkedSwishId !== activeTx.linkedSwishTxId &&
                          onExclude
                        ) {
                          onExclude(selectedLinkedSwishId, true);
                        } else if (
                          !selectedLinkedSwishId &&
                          activeTx.linkedSwishTxId &&
                          onExclude
                        ) {
                          onExclude(activeTx.linkedSwishTxId, false);
                        }
                        const isSplitPending =
                          nextShare < fullAmt && !selectedLinkedSwishId && trackPendingSwish;
                        onUpdate({
                          ...activeTx,
                          amount: nextShare,
                          originalAmount: nextShare < fullAmt ? fullAmt : undefined,
                          linkedSwishTxId:
                            nextShare < fullAmt ? selectedLinkedSwishId : undefined,
                          isWaitingForSwish: isSplitPending,
                          pendingSwishAmount: isSplitPending
                            ? Math.max(1, fullAmt - nextShare)
                            : undefined,
                          pendingSwishRecipient: isSplitPending
                            ? swishRecipientName || swishPhone || activeTx.pendingSwishRecipient
                            : undefined,
                        });
                        navigateSubView('details', 'back');
                      }}
                      className="ui-btn-primary"
                    >
                      <Check size={14} weight="bold" />
                      <span>
                        Spara min andel ({formatKr(myBudgetShareAmount)})
                      </span>
                    </button>
                  </>
                );
              })()}
            </div>
          ) : (
            <>
              {/* Snabbval för uppdelning av beloppet */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: 'Dela lika (50%)',
                    val: Math.max(
                      1,
                      Math.round((activeTx.originalAmount || activeTx.amount) / 2)
                    ),
                  },
                  {
                    label: 'En tredjedel',
                    val: Math.max(
                      1,
                      Math.round((activeTx.originalAmount || activeTx.amount) / 3)
                    ),
                  },
                  {
                    label: 'Hela (100%)',
                    val: Math.max(
                      1,
                      Math.round(activeTx.originalAmount || activeTx.amount)
                    ),
                  },
                ].map((opt) => {
                  const isSel = Number(swishAmount) === opt.val;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setSwishAmount(opt.val)}
                      className={`py-2.5 px-2 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                          : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <span className="text-[11px] opacity-80 block truncate">{opt.label}</span>
                      <span className="font-display font-bold tabular-nums block mt-0.5">
                        {opt.val} kr
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Belopp & Meddelande i tabellkort med kantlösa inline-fält */}
              <div className="ui-sheet-group">
                <label className="ui-input-row">
                  <span className="text-[var(--text-muted)] shrink-0">Belopp (kr)</span>
                  <input
                    type="number"
                    min="1"
                    value={swishAmount}
                    onChange={(e) => setSwishAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 bg-transparent border-0 p-0 text-xs font-display font-bold text-[var(--text-primary)] text-right tabular-nums focus:outline-none"
                  />
                </label>
                <label className="ui-input-row">
                  <span className="text-[var(--text-muted)] shrink-0">Meddelande</span>
                  <input
                    type="text"
                    value={swishMessage}
                    onChange={(e) => setSwishMessage(e.target.value)}
                    placeholder={activeTx.title}
                    className="ui-inline-input"
                  />
                </label>
              </div>

              {/* Mitt eget Swish-nummer & QR-kod (i Be om Swish-läge) */}
              {swishMode === 'request' && (
                <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <QrCode size={14} weight="bold" />
                      <span>Mitt Swish-nummer</span>
                    </span>
                    {normalizedMySwishPhone.length >= 7 && !isEditingMyPhone && (
                      <button
                        type="button"
                        onClick={() => setIsEditingMyPhone(true)}
                        className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        Ändra ({mySwishPhone})
                      </button>
                    )}
                  </div>

                  {(isEditingMyPhone || normalizedMySwishPhone.length < 7) && (
                    <div className="flex items-center gap-2">
                      <input
                        type="tel"
                        value={mySwishPhone}
                        onChange={(e) => {
                          setMySwishPhone(e.target.value);
                          saveMySwishPhone(e.target.value.trim());
                        }}
                        placeholder="Ditt mobilnummer (070-123 45 67)"
                        className="flex-1 py-2 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--text-primary)]"
                      />
                      {normalizedMySwishPhone.length >= 7 && (
                        <button
                          type="button"
                          onClick={() => {
                            saveMySwishPhone(mySwishPhone.trim());
                            setIsEditingMyPhone(false);
                            setShowSwishQr(true);
                          }}
                          className="ui-btn-sm-primary"
                        >
                          Klar
                        </button>
                      )}
                    </div>
                  )}

                  {!isEditingMyPhone && showSwishQr && (
                    <div className="flex flex-col items-center pt-1 pb-1">
                      {/* Interaktiv QR-kod som kan klickas för att simulera skanning */}
                      <div className="relative inline-block">
                        <button
                          type="button"
                          onClick={handleSimulateScan}
                          disabled={simulatedScanState === 'scanning'}
                          className={`relative p-3.5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs transition-all select-none overflow-hidden ${
                            simulatedScanState === 'idle'
                              ? 'cursor-pointer hover:border-emerald-500/60 hover:shadow-md hover:scale-[1.01] active:scale-95 group'
                              : simulatedScanState === 'scanning'
                              ? 'cursor-wait ring-2 ring-emerald-500/50'
                              : 'ring-2 ring-emerald-500'
                          }`}
                          title="Tryck på QR-koden för att simulera att den skannas"
                        >
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt="Swish QR-kod"
                              className="w-44 h-44 object-contain transition-opacity"
                            />
                          ) : (
                            <div className="w-44 h-44 flex items-center justify-center text-xs text-zinc-400">
                              Skapar QR...
                            </div>
                          )}

                          {/* Laserscanner-animering vid pågående skanning */}
                          {simulatedScanState === 'scanning' && (
                            <div className="absolute inset-0 pointer-events-none bg-emerald-500/10">
                              <div className="absolute left-2 right-2 h-1 bg-emerald-500 shadow-[0_0_12px_#10b981] animate-scan-laser rounded-full" />
                            </div>
                          )}

                          {/* Grön bekräftelse-overlay vid mottagen Swish */}
                          {simulatedScanState === 'success' && (
                            <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-3 rounded-2xl animate-scale-in">
                              <div className="w-12 h-12 rounded-full bg-white text-emerald-600 flex items-center justify-center mb-1.5 shadow-md">
                                <Check size={28} weight="bold" />
                              </div>
                              <span className="font-display font-bold text-base tracking-tight text-white">
                                +{formatKr(swishAmount)}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-100 mt-0.5">
                                Swish mottagen!
                              </span>
                            </div>
                          )}

                          {/* Klick-prompt i idle-läge */}
                          {simulatedScanState === 'idle' && (
                            <div className="absolute inset-x-2.5 bottom-2.5 py-1 px-2 rounded-xl bg-black/75 backdrop-blur-xs text-white text-[10.5px] font-semibold flex items-center justify-center gap-1.5 opacity-90 group-hover:opacity-100 group-hover:scale-[1.02] transition-all">
                              <Sparkle size={12} weight="fill" className="text-amber-300" />
                              <span>Tryck för att simulera skanning</span>
                            </div>
                          )}
                        </button>
                      </div>

                      {/* Status och hjälpetikett under QR-koden */}
                      <div className="mt-2 text-center space-y-1">
                        {simulatedScanState === 'idle' ? (
                          <p className="text-[11px] font-medium text-[var(--text-muted)]">
                            Låt din vän skanna med Swish-appen, eller tryck på QR-koden för att simulera skanning ({swishAmount} kr)
                          </p>
                        ) : simulatedScanState === 'scanning' ? (
                          <p className="text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400 animate-pulse flex items-center justify-center gap-1">
                            <Sparkle size={13} weight="fill" />
                            <span>Skannar QR-kod och godkänner Swish...</span>
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                              <Check size={14} weight="bold" />
                              <span>Skanning simulerad! +{formatKr(swishAmount)} har dragits av.</span>
                            </p>
                            <button
                              type="button"
                              onClick={handleResetSimulation}
                              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] underline cursor-pointer"
                            >
                              Testa skanna igen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sparade kontakter / Mottagare */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {swishMode === 'request'
                      ? 'Välj vem som ska betala dig'
                      : 'Välj mottagare att Swisha'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingContact((prev) => !prev)}
                    className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1 hover:opacity-80 cursor-pointer"
                  >
                    <UserPlus size={13} weight="bold" />
                    <span>{isAddingContact ? 'Stäng' : 'Spara kontakt'}</span>
                  </button>
                </div>

                {isAddingContact && (
                  <div className="p-2.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-2 animate-fade-in">
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="text"
                        value={newContactName}
                        onChange={(e) => setNewContactName(e.target.value)}
                        placeholder="Namn (t.ex. Sambo)"
                        className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                      />
                      <input
                        type="tel"
                        value={newContactPhone}
                        onChange={(e) => setNewContactPhone(e.target.value)}
                        placeholder="070-123 45 67"
                        className="py-1.5 px-2.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const n = newContactName.trim();
                        const p = newContactPhone.trim();
                        if (!n || !p) return;
                        const updated = [
                          ...swishContacts,
                          { id: `sc-${Date.now()}`, name: n, phone: p },
                        ];
                        setSwishContacts(updated);
                        saveSwishContacts(updated);
                        setSwishPhone(p);
                        setSwishRecipientName(n);
                        setNewContactName('');
                        setNewContactPhone('');
                        setIsAddingContact(false);
                      }}
                      className="w-full py-1.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold cursor-pointer"
                    >
                      Spara kontakt
                    </button>
                  </div>
                )}

                {swishContacts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {swishContacts.map((c) => {
                      const active = swishPhone === c.phone;
                      return (
                        <div
                          key={c.id}
                          className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-xl border text-xs font-semibold transition-all ${
                            active
                              ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                              : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSwishPhone(c.phone);
                              setSwishRecipientName(c.name);
                            }}
                            className="cursor-pointer"
                          >
                            {c.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = swishContacts.filter((item) => item.id !== c.id);
                              setSwishContacts(next);
                              saveSwishContacts(next);
                              if (swishPhone === c.phone) {
                                setSwishPhone('');
                                setSwishRecipientName('');
                              }
                            }}
                            className="p-0.5 rounded hover:opacity-70 cursor-pointer"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <input
                  type="tel"
                  value={swishPhone}
                  onChange={(e) => {
                    setSwishPhone(e.target.value);
                    setSwishRecipientName('');
                  }}
                  placeholder="Mobilnummer (070-123 45 67)"
                  className="w-full py-2 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--text-primary)]"
                />
              </div>

              {swishFeedback && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center animate-fade-in">
                  {swishFeedback}
                </div>
              )}

              {swishMode === 'request' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={(() => {
                        const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
                        const label = cleanSwishMessage || activeTx.title;
                        const prefilledUrl =
                          normalizedMySwishPhone.length >= 7 && typeof window !== 'undefined'
                            ? `${window.location.origin}/?swish_pay=1&payee=${encodeURIComponent(
                                normalizedMySwishPhone
                              )}&amount=${amt}&msg=${encodeURIComponent(label)}`
                            : '';
                        const msgText = prefilledUrl
                          ? `Hej${
                              swishRecipientName ? ` ${swishRecipientName}` : ''
                            }! Kan du swisha ${amt} kr för ${label}?\n\nKlicka här för att öppna Swish färdigifyllt:\n${prefilledUrl}`
                          : `Hej${
                              swishRecipientName ? ` ${swishRecipientName}` : ''
                            }! Kan du swisha ${amt} kr för ${label}?`;
                        const cleanPhone = swishPhone.replace(/[^\d+]/g, '');
                        const isIOS =
                          typeof navigator !== 'undefined' &&
                          /iPad|iPhone|iPod/i.test(navigator.userAgent);
                        const sep = isIOS ? '&' : '?';
                        return cleanPhone
                          ? `sms:${cleanPhone}${sep}body=${encodeURIComponent(msgText)}`
                          : `sms:${sep}body=${encodeURIComponent(msgText)}`;
                      })()}
                      className="ui-btn-primary"
                    >
                      <ChatCircleText size={14} weight="bold" />
                      <span>Skicka SMS</span>
                    </a>

                    <button
                      type="button"
                      onClick={async () => {
                        const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
                        const label = cleanSwishMessage || activeTx.title;
                        const prefilledUrl =
                          normalizedMySwishPhone.length >= 7 && typeof window !== 'undefined'
                            ? `${window.location.origin}/?swish_pay=1&payee=${encodeURIComponent(
                                normalizedMySwishPhone
                              )}&amount=${amt}&msg=${encodeURIComponent(label)}`
                            : '';
                        const msgText = prefilledUrl
                          ? `Hej${
                              swishRecipientName ? ` ${swishRecipientName}` : ''
                            }! Kan du swisha ${amt} kr för ${label}?\n\nKlicka här för att öppna Swish färdigifyllt:\n${prefilledUrl}`
                          : `Hej${
                              swishRecipientName ? ` ${swishRecipientName}` : ''
                            }! Kan du swisha ${amt} kr för ${label}?`;
                        try {
                          await navigator.clipboard?.writeText(msgText);
                        } catch {
                          // ignore
                        }
                        if (typeof navigator !== 'undefined' && navigator.share) {
                          try {
                            await navigator.share({
                              title: `Swisha ${amt} kr för ${label}`,
                              text: msgText,
                            });
                            return;
                          } catch {
                            // fallback
                          }
                        }
                        setSwishFeedback('Swish-länk kopierad!');
                        setTimeout(() => setSwishFeedback(null), 3000);
                      }}
                      className="ui-btn-secondary flex items-center justify-center gap-1.5"
                    >
                      <Copy size={14} />
                      <span>Kopiera länk</span>
                    </button>
                  </div>

                  {/* Bevaka inväntad Swish direkt på Hemfliken */}
                  {onUpdate && (
                    <button
                      type="button"
                      onClick={() => {
                        const fullAmt = Math.round(
                          activeTx.originalAmount || activeTx.amount
                        );
                        const reqAmt = Math.max(
                          1,
                          Math.min(fullAmt, Math.round(Number(swishAmount) || 0))
                        );
                        const nextMyShare = Math.max(0, fullAmt - reqAmt);
                        if (activeTx.isWaitingForSwish) {
                          onUpdate({
                            ...activeTx,
                            isWaitingForSwish: false,
                            pendingSwishAmount: undefined,
                            pendingSwishRecipient: undefined,
                          });
                          setSwishFeedback('Swish-bevakning borttagen');
                        } else {
                          onUpdate({
                            ...activeTx,
                            amount: nextMyShare > 0 ? nextMyShare : activeTx.amount,
                            originalAmount: nextMyShare > 0 ? fullAmt : activeTx.originalAmount,
                            isWaitingForSwish: true,
                            pendingSwishAmount: reqAmt,
                            pendingSwishRecipient:
                              swishRecipientName.trim() || swishPhone.trim() || undefined,
                          });
                          setSwishFeedback(
                            `Bevakar ${formatKr(reqAmt)} under ”Väntar på Swish” på Hemfliken!`
                          );
                        }
                        setTimeout(() => setSwishFeedback(null), 3500);
                      }}
                      className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        activeTx.isWaitingForSwish
                          ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]'
                      }`}
                    >
                      <ClockCounterClockwise size={14} weight="bold" />
                      <span>
                        {activeTx.isWaitingForSwish
                          ? `Bevakas på Hemfliken (${formatKr(
                              activeTx.pendingSwishAmount || swishAmount
                            )}) · Tryck för att ta bort`
                          : `Bevaka ”Väntar på Swish” (${formatKr(
                              swishAmount
                            )}) på Hemfliken`}
                      </span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const cleanPhone = normalizeSwedishSwishNumber(swishPhone);
                    if (cleanPhone) {
                      navigator.clipboard?.writeText(cleanPhone).catch(() => {});
                    }
                    const payload = {
                      version: 1,
                      payee: { value: cleanPhone, editable: true },
                      amount: { value: Number(swishAmount) || 0, editable: true },
                      message: {
                        value: swishMessage || activeTx.title,
                        editable: true,
                      },
                    };
                    window.location.href = `swish://payment?data=${encodeURIComponent(
                      JSON.stringify(payload)
                    )}`;
                  }}
                  className="ui-btn-primary"
                >
                  <SwishLogo size={15} />
                  <span>Öppna Swish ({swishAmount} kr)</span>
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 5: INBYGGD KVITTO-VISNING (Fungerar i iOS & PWA)      */}
      {/* ============================================================== */}
      {subView === 'receipt-preview' && activeTx?.receiptUrl && (
        <div className={`${slideAnimClass} space-y-4`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView('details', 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title truncate max-w-[180px]">
              {activeTx.receiptName || 'Kvitto'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
            {activeTx.receiptUrl.startsWith('data:image/') ||
            /\.(png|jpe?g|webp|gif)$/i.test(activeTx.receiptUrl) ? (
              <img
                src={activeTx.receiptUrl}
                alt={activeTx.receiptName || 'Kvitto'}
                className="max-h-[56dvh] w-auto object-contain rounded-xl"
              />
            ) : (
              <iframe
                src={activeTx.receiptUrl}
                title={activeTx.receiptName || 'Kvitto'}
                className="w-full h-[52dvh] rounded-xl border-0"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={activeTx.receiptUrl}
              download={activeTx.receiptName || `kvitto-${activeTx.date}.jpg`}
              className="ui-btn-primary"
            >
              <FileText size={14} weight="bold" />
              <span>Spara fil</span>
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ui-btn-secondary flex items-center justify-center gap-1.5"
            >
              <Paperclip size={14} />
              <span>Byt kvitto</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* HUVUDVY 1: FÖRHANDSGRANSKNING (Ren läsvy utan inline-inputs)    */}
      {/* ============================================================== */}
      {subView === 'details' && !isCreateMode && activeTx && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          {/* Top Header */}
          <div className="ui-sheet-header mb-5">
            <div className="flex items-center gap-1.5">
              {onToggleHeart && (
                <button
                  type="button"
                  onClick={() => onToggleHeart(activeTx.id, !activeTx.isHearted)}
                  title="Spara köp"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${
                    activeTx.isHearted
                      ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Heart
                    size={15}
                    weight={activeTx.isHearted ? 'fill' : 'regular'}
                    className={activeTx.isHearted ? 'text-rose-500' : ''}
                  />
                </button>
              )}
              {onTogglePackage && (
                <button
                  type="button"
                  onClick={() =>
                    onTogglePackage(activeTx.id, !activeTx.isWaitingForPackage)
                  }
                  title="Väntar på paket"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${
                    activeTx.isWaitingForPackage
                      ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                      : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Package
                    size={15}
                    weight={activeTx.isWaitingForPackage ? 'fill' : 'regular'}
                    className={activeTx.isWaitingForPackage ? 'text-amber-500' : ''}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Bifoga kvitto"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer border ${
                  activeTx.receiptUrl
                    ? 'text-[var(--text-primary)] bg-[var(--surface-hover)] border-[var(--text-muted)]'
                    : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Paperclip size={15} weight={activeTx.receiptUrl ? 'bold' : 'regular'} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTitle(activeTx.title);
                  setAmount(activeTx.amount);
                  setDate(activeTx.date);
                  setPaymentMethod(getDefaultPaymentMethodForTx(activeTx));
                  setCategory(
                    normalizeCategoryToValid(
                      activeTx.category || (isIncome ? 'Lön' : 'Övrigt'),
                      isIncome ? 'income' : 'expense'
                    )
                  );
                  navigateSubView('edit', 'forward');
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PencilSimple size={13} weight="regular" />
                <span>Redigera</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="ui-icon-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Hero Receipt Header (Read-only Förhandsgranskning) */}
          <div className="ui-hero-header mb-5 pb-5">
            <div className="flex justify-center mb-3.5">
              <ItemLogo
                name={activeTx.title}
                category={activeTx.category}
                logoUrl={activeTx.logo}
                size="xl"
                isRecurring={Boolean(
                  recurringStatus.isRecurring && recurringStatus.hasExactAmountMatch
                )}
              />
            </div>

            <h2 className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] truncate px-4">
              {activeTx.title}
            </h2>

            <div
              className={`mt-1 ${
                isIncome ? 'ui-hero-amount-income' : 'ui-hero-amount'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatKr(activeTx.amount)}
            </div>

            {activeTx.originalAmount && activeTx.originalAmount !== activeTx.amount && (
              <p className="text-xs font-medium text-[var(--text-secondary)] mt-1 tabular-nums">
                Delad utgift · Ursprungligt belopp -{formatKr(activeTx.originalAmount)}
              </p>
            )}

            <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-1.5">
              {formatSwedishDateHeading(activeTx.date)}
              {activeTx.bookingStatus === 'PDNG' || activeTx.bookingStatus === 'HOLD'
                ? ' · Reserverat'
                : txTime
                ? ` · ${txTime}`
                : ''}
            </p>
          </div>

          <div className="space-y-3">
            {/* Förhandsgranskningstabell (Enbart läsbar information med normalviktiga värden) */}
            <div className="ui-sheet-group">
              <div className="ui-row">
                <span className="ui-info-label">Kategori</span>
                <span className="ui-info-value flex items-center gap-1.5">
                  <CategoryIcon category={activeTx.category} size={13} />
                  <span>{activeTx.category}</span>
                </span>
              </div>

              <div className="ui-row">
                <span className="ui-info-label">Betalsätt</span>
                <span className="ui-info-value">
                  {getDefaultPaymentMethodForTx(activeTx)}
                </span>
              </div>

              {resolvedAccountInfo && (
                <div className="ui-row">
                  <span className="ui-info-label">Konto</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="ui-info-value truncate max-w-[190px] sm:max-w-[230px]">
                      {resolvedAccountInfo.label} ·{' '}
                      {showFullAccount
                        ? resolvedAccountInfo.fullNumber
                        : resolvedAccountInfo.maskedNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFullAccount((prev) => !prev)}
                      className="px-2 py-0.5 rounded-md bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                    >
                      {showFullAccount ? 'Dölj' : 'Visa'}
                    </button>
                  </div>
                </div>
              )}

              {note && (
                <div className="ui-row">
                  <span className="ui-info-label">Anteckning</span>
                  <span className="ui-info-value text-right truncate max-w-[210px]">
                    {note}
                  </span>
                </div>
              )}

              {isExcluded && (
                <div className="ui-row">
                  <span className="ui-info-label">Budget</span>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Exkluderad från budget
                  </span>
                </div>
              )}
            </div>

            {/* Separerade handlingar: Dela utgift & Liknande köp */}
            <div className="ui-sheet-group">
              <button
                type="button"
                onClick={() => navigateSubView('swish', 'forward')}
                className="ui-row-btn"
              >
                <span className="font-medium text-[var(--text-primary)] shrink-0">
                  Dela utgift
                </span>
                <span className="text-[var(--text-secondary)] font-normal flex items-center gap-1.5 shrink-0">
                  <SwishLogo size={14} />
                  <span>
                    {activeTx.isWaitingForSwish && activeTx.pendingSwishAmount
                      ? `Väntar på ${formatKr(activeTx.pendingSwishAmount)}`
                      : 'Swish'}
                  </span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigateSubView('similar', 'forward')}
                className="ui-row-btn"
              >
                <span className="font-medium text-[var(--text-primary)] shrink-0">
                  Liknande köp
                </span>
                <span className="text-[var(--text-secondary)] font-normal flex items-center gap-1.5 tabular-nums shrink-0">
                  <span>
                    {similarInfo.transactions.length} st · {formatKr(similarInfo.totalAmount)}
                  </span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>
            </div>

            {/* Bifogat kvitto visas direkt som standard i ett snyggt kort */}
            {activeTx.receiptUrl && (
              <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                    <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                    <span className="truncate">{activeTx.receiptName || 'Bifogat kvitto'}</span>
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      Byt
                    </button>
                    {onUpdate && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate({
                            ...activeTx,
                            receiptUrl: undefined,
                            receiptName: undefined,
                          })
                        }
                        className="p-1.5 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                        title="Ta bort kvitto"
                      >
                        <Trash size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigateSubView('receipt-preview', 'forward')}
                  className="w-full rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-60 cursor-pointer hover:opacity-95 transition-opacity"
                >
                  {activeTx.receiptUrl.startsWith('data:image/') ||
                  /\.(png|jpe?g|webp|gif)$/i.test(activeTx.receiptUrl) ? (
                    <img
                      src={activeTx.receiptUrl}
                      alt={activeTx.receiptName || 'Kvitto'}
                      className="max-h-52 w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <FileText size={28} weight="duotone" />
                      <span className="font-medium">{activeTx.receiptName || 'Öppna dokument'}</span>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* HUVUDVY 2: REDIGERA-VY / SKAPA NY HÄNDELSE                     */}
      {/* ============================================================== */}
      {subView === 'edit' && (
        <div className={slideAnimClass}>
          <div className="ui-sheet-sub-header mb-5">
            {!isCreateMode ? (
              <button
                type="button"
                onClick={() => navigateSubView('details', 'back')}
                title="Tillbaka"
                aria-label="Tillbaka"
                className="ui-icon-btn"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
            ) : (
              <div className="w-8" />
            )}
            <span className="ui-sheet-title">
              {isCreateMode ? 'Lägg till händelse' : 'Redigera händelse'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          {isCreateMode && (
            <div className="ui-segmented grid-cols-2 mb-5">
              <button
                type="button"
                onClick={() => {
                  setTxType('expense');
                  setCategory('Mat & dryck');
                }}
                className={`ui-segmented-tab ${
                  txType === 'expense' ? 'ui-segmented-tab-active' : ''
                }`}
              >
                Utgift
              </button>
              <button
                type="button"
                onClick={() => {
                  setTxType('income');
                  setCategory('Lön');
                }}
                className={`ui-segmented-tab ${
                  txType === 'income' ? 'ui-segmented-tab-active' : ''
                }`}
              >
                Inkomst
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="ui-sheet-group">
              {/* Namn */}
              <label className="ui-input-row">
                <span className="ui-info-label shrink-0">Namn</span>
                <input
                  type="text"
                  autoFocus={isCreateMode}
                  placeholder={isIncome ? 't.ex. Swish eller Lön' : 't.ex. ICA eller Kaffe'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="ui-inline-input"
                />
              </label>

              {/* Belopp */}
              {!isBankSynced ? (
                <label className="ui-input-row">
                  <span className="ui-info-label shrink-0">Belopp (kr)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    className="ui-inline-amount-input"
                  />
                </label>
              ) : (
                <div className="ui-locked-row">
                  <span className="ui-info-label shrink-0">Belopp</span>
                  <span className="font-display font-medium text-[var(--text-secondary)] tabular-nums">
                    {isIncome ? '+' : '-'}
                    {formatKr(activeTx!.amount)}
                  </span>
                </div>
              )}

              {/* Kategori */}
              <button
                type="button"
                onClick={() => navigateSubView('category-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label shrink-0">Kategori</span>
                <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
                  <CategoryIcon category={category} size={13} />
                  <span>{category}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              {/* Betalsätt */}
              <button
                type="button"
                onClick={() => navigateSubView('payment-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label shrink-0">Betalsätt</span>
                <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>{paymentMethod}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              {/* Datum (för manuella poster) */}
              {!isBankSynced && (
                <button
                  type="button"
                  onClick={() => {
                    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
                      setPickerYearMonth({
                        year: parseInt(date.slice(0, 4), 10),
                        month: parseInt(date.slice(5, 7), 10) - 1,
                      });
                    }
                    navigateSubView('date-picker', 'forward');
                  }}
                  className="ui-row-btn"
                >
                  <span className="ui-info-label shrink-0">Datum</span>
                  <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                    <CalendarBlank size={13} className="text-[var(--text-secondary)]" />
                    <span>{formatSwedishFullDate(date)}</span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>
              )}

              {/* Anteckning */}
              <label className="ui-input-row">
                <span className="ui-info-label shrink-0">Anteckning</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Lägg till..."
                  className="ui-inline-input"
                />
              </label>

              {/* Räkna med i budget */}
              {!isCreateMode && activeTx && onExclude && (
                <div className="ui-row">
                  <span className="ui-info-label shrink-0">Räkna med i budget</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isExcluded}
                    onClick={() => onExclude(activeTx.id, !isExcluded)}
                    className={`ui-switch ${
                      !isExcluded ? 'ui-switch-on' : 'ui-switch-off'
                    }`}
                  >
                    <span
                      className={`ui-switch-thumb ${
                        !isExcluded ? 'ui-switch-thumb-on' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Gör till fast utgift / inkomst */}
              {!isCreateMode && activeTx && onMarkAsFixed && (
                <button
                  type="button"
                  onClick={() => {
                    const nextTitle = title.trim() || activeTx.title;
                    const nextCategory = category || activeTx.category;
                    const nextPaymentMethod =
                      paymentMethod || getDefaultPaymentMethodForTx(activeTx);
                    const nextNote = note.trim() || activeTx.note;
                    const nextAmount = isBankSynced
                      ? activeTx.amount
                      : Math.max(1, Math.round(Number(amount) || activeTx.amount));
                    onMarkAsFixed(
                      {
                        ...activeTx,
                        title: nextTitle,
                        amount: nextAmount,
                        category: nextCategory,
                        paymentMethod: nextPaymentMethod,
                        note: nextNote,
                      },
                      isIncome ? 'income' : 'expense'
                    );
                  }}
                  className="ui-row-btn"
                >
                  <span className="ui-info-label shrink-0">Återkommande</span>
                  <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
                    <ArrowsClockwise size={13} />
                    <span>
                      {recurringStatus.isRecurring && recurringStatus.hasExactAmountMatch
                        ? `Lägg till som egen fast ${isIncome ? 'inkomst' : 'utgift'}`
                        : `Gör till fast ${isIncome ? 'inkomst' : 'utgift'}`}
                    </span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>
              )}
            </div>

            {isCreateMode ? (
              <button
                type="button"
                onClick={handleCreateSave}
                disabled={!title.trim() || !(Number(amount) > 0)}
                className="ui-btn-primary py-3.5"
              >
                <Check size={14} weight="bold" />
                <span>Spara händelse</span>
              </button>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleSaveEditClick}
                  disabled={!title.trim()}
                  className="ui-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Spara ändringar</span>
                </button>

                {!isBankSynced && activeTx && onDelete && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="ui-btn-danger"
                    >
                      <Trash size={14} />
                      <span>Ta bort transaktion</span>
                    </button>

                    <ConfirmDialog
                      isOpen={showDeleteConfirm}
                      title="Ta bort transaktion?"
                      description={`Vill du ta bort ${activeTx.title} permanent?`}
                      confirmLabel="Ta bort"
                      onConfirm={handleDelete}
                      onCancel={() => setShowDeleteConfirm(false)}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CENTRERAD POPUP FÖR ATT UPPDATERA LIKNANDE KÖP                 */}
      {/* ============================================================== */}
      {showSimilarPopup &&
        activeTx &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-black/45 backdrop-blur-xs animate-fade-in"
            onClick={() => setShowSimilarPopup(false)}
          >
            <div
              className="w-full max-w-[330px] rounded-modal bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 shadow-2xl space-y-4 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-1">
                <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">
                  Uppdatera alla {similarInfo.transactions.length} liknande köp?
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Gäller alla köp hos {similarInfo.brandLabel || activeTx.title}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => commitEditChanges('chain')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Uppdatera alla ({similarInfo.transactions.length} st)
                </button>

                <button
                  type="button"
                  onClick={() => commitEditChanges('single')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Endast detta köp
                </button>

                <button
                  type="button"
                  onClick={() => setShowSimilarPopup(false)}
                  className="w-full py-2 rounded-2xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer text-center"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </BottomSheet>
  );
};

