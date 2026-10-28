import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Bank,
  UserPlus,
  Copy,
  ChatCircleText,
  QrCode,
  ClockCounterClockwise,
  PencilSimple,
} from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { SwishLogo } from '../SwishLogo';
import { BottomSheet } from '../ui/BottomSheet';
import {
  TransactionItem,
  getTransactionTime,
  FixedExpenseItem,
  IncomeItem,
  AccountItem,
} from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { formatSwedishFullDate } from '../../utils/swedishDate';
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
  onUpdate?: (tx: TransactionItem, applyToSimilarIds?: string[]) => void;
  onDelete?: (id: string) => void;
  onExclude?: (id: string, exclude: boolean) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: 'expense' | 'income') => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  isInternalTransfer?: boolean;
}

type ModalSubView =
  | 'details'
  | 'category-picker'
  | 'payment-picker'
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
  const [applyToAllSimilar, setApplyToAllSimilar] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
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
      setApplyToAllSimilar(true);
      setSubView('details');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
      setSwishMode('request');
      const fullOriginalAmt = initialTransaction.originalAmount || initialTransaction.amount;
      setSwishAmount(Math.max(1, Math.round(fullOriginalAmt / 2)));
      setMyBudgetShareAmount(Math.round(initialTransaction.amount));
      setSelectedLinkedSwishId(initialTransaction.linkedSwishTxId);
      setSwishMessage(initialTransaction.title || '');
      setSwishFeedback(null);
      setIsAddingContact(false);
      const storedMyPhone = loadMySwishPhone();
      setMySwishPhone(storedMyPhone);
      setIsEditingMyPhone(!storedMyPhone);
      setShowSwishQr(true);
    } else {
      setTxType('expense');
      setTitle('');
      setAmount('');
      setDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('Kort');
      setNote('');
      setCategory('Mat & dryck');
      setSubView('details');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
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
    if (subView !== 'swish' || swishMode !== 'request' || normalizedMySwishPhone.length < 7) {
      setQrDataUrl(null);
      return;
    }
    const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
    const swishQrPayload = `C${normalizedMySwishPhone};${amt};${cleanSwishMessage};0`;
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

  const resolvedAccountDisplay = useMemo(() => {
    if (!activeTx) return null;
    if (activeTx.bankAccountName) return activeTx.bankAccountName;

    if (accounts.length > 0) {
      const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
      return `${checking.bankName} · ${checking.name}`;
    }

    return null;
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

  const commitInlineChanges = (overrides?: Partial<TransactionItem>) => {
    if (isCreateMode || !onUpdate || !activeTx) return;
    const nextTitle = (overrides?.title !== undefined ? overrides.title : title).trim() || activeTx.title;
    const nextCategory = overrides?.category !== undefined ? overrides.category : category;
    const nextNote = (overrides?.note !== undefined ? overrides.note : note).trim();
    const nextPaymentMethod =
      overrides?.paymentMethod !== undefined ? overrides.paymentMethod : paymentMethod;
    const nextDate = overrides?.date !== undefined ? overrides.date : date || activeTx.date;
    const nextAmount = isBankSynced
      ? activeTx.amount
      : Math.max(1, Math.round(Number(overrides?.amount !== undefined ? overrides.amount : amount) || activeTx.amount));

    const similarIds =
      applyToAllSimilar && similarInfo.transactions.length > 1
        ? similarInfo.transactions.map((t) => t.id)
        : undefined;

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
      similarIds
    );
  };

  const handleCreateSave = () => {
    const cleanTitle = title.trim();
    const cleanAmt = Math.max(1, Math.round(Number(amount) || 0));
    if (!cleanTitle || cleanAmt <= 0) return;
    if (onSave) {
      onSave({
        title: cleanTitle,
        amount: cleanAmt,
        date: date || new Date().toISOString().slice(0, 10),
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
        <div className={`${slideAnimClass} space-y-5`}>
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

          {/* Merchant Summary Header */}
          <div className="ui-hero-header">
            <div className="ui-hero-icon">
              <ItemLogo
                name={similarInfo.brandLabel || activeTx.title}
                category={category}
                logoUrl={activeTx.logo}
                size="xl"
              />
            </div>
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
              {similarInfo.brandLabel || activeTx.title}
            </h2>
            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-1">
              {similarInfo.transactions.length} tillfällen · Totalt {isIncome ? '+' : '-'}
              {formatKr(similarInfo.totalAmount)}
              {similarInfo.transactions.length > 1
                ? ` · Snitt ${formatKr(similarInfo.averageAmount)}`
                : ''}
            </p>
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
                  className="ui-row-btn text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-[var(--text-primary)] truncate">
                          {tx.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[11px] font-medium text-[var(--text-muted)] shrink-0">
                            · Denna
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                        {formatSwedishFullDate(tx.date)}
                        {getTransactionTime(tx) ? ` · ${getTransactionTime(tx)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`ui-row-amount ${
                        txIsIncome ? 'ui-row-amount-income' : ''
                      }`}
                    >
                      {txIsIncome ? '+' : '-'}
                      {formatKr(tx.amount)}
                    </span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: KATEGORIVÄLJARE (Direktsparande vid val)           */}
      {/* ============================================================== */}
      {subView === 'category-picker' && (
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

          {similarInfo.transactions.length > 1 && (
            <div className="ui-row rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs">
              <div className="min-w-0">
                <span className="ui-row-title">
                  Uppdatera alla {similarInfo.transactions.length} liknande köp
                </span>
                <span className="ui-row-subtitle">
                  Gäller alla köp hos {similarInfo.brandLabel || title}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={applyToAllSimilar}
                onClick={() => setApplyToAllSimilar((prev) => !prev)}
                className={`ui-switch ${
                  applyToAllSimilar ? 'ui-switch-on' : 'ui-switch-off'
                }`}
              >
                <span
                  className={`ui-switch-thumb ${
                    applyToAllSimilar ? 'ui-switch-thumb-on' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          <div className="ui-sheet-group">
            {availableCategories.map((c) => {
              const isSel = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCategory(c);
                    commitInlineChanges({ category: c });
                    navigateSubView('details', 'back');
                  }}
                  className="ui-row-btn text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon category={c} size={14} badge={true} />
                    <span
                      className={`truncate ${
                        isSel
                          ? 'font-bold text-[var(--text-primary)]'
                          : 'font-semibold text-[var(--text-primary)]'
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
      {/* SUB-VIEW 3: BETALSÄTTSVÄLJARE (Ersätter native <select>)       */}
      {/* ============================================================== */}
      {subView === 'payment-picker' && (
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
                    commitInlineChanges({ paymentMethod: m });
                    navigateSubView('details', 'back');
                  }}
                  className="ui-row-btn text-xs"
                >
                  <span
                    className={`truncate ${
                      isSel
                        ? 'font-bold text-[var(--text-primary)]'
                        : 'font-semibold text-[var(--text-primary)]'
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
                    <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-1">
                      <span className="text-[11px] font-medium text-[var(--text-muted)] block">
                        Så här fungerar det
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        Ange hur stor del av utlägget på{' '}
                        <strong className="text-[var(--text-primary)] tabular-nums">
                          {formatKr(fullAmt)}
                        </strong>{' '}
                        som är din egen kostnad, eller koppla en inkommen Swish-insättning.
                      </p>
                    </div>

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
                        onUpdate({
                          ...activeTx,
                          amount: nextShare,
                          originalAmount: nextShare < fullAmt ? fullAmt : undefined,
                          linkedSwishTxId:
                            nextShare < fullAmt ? selectedLinkedSwishId : undefined,
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

                  {normalizedMySwishPhone.length >= 7 && !isEditingMyPhone && showSwishQr && (
                    <div className="flex flex-col items-center pt-1 pb-1">
                      <div className="p-3 rounded-2xl bg-white border border-[var(--border-subtle)]">
                        {qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Swish QR-kod"
                            className="w-40 h-40 object-contain"
                          />
                        ) : (
                          <div className="w-40 h-40 flex items-center justify-center text-xs text-zinc-400">
                            Skapar QR...
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-muted)] mt-2 text-center">
                        Låt din vän skanna med Swish-appen ({swishAmount} kr)
                      </span>
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
      {/* HUVUDVY: DIREKT-INTERAKTIV DETALJVY (Ingen "Redigera"-omväg)   */}
      {/* ============================================================== */}
      {subView === 'details' && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          {/* Top Header */}
          <div className="ui-sheet-header mb-5">
            {isCreateMode ? (
              <span className="ui-sheet-title">
                Lägg till händelse
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                {onToggleHeart && activeTx && (
                  <button
                    type="button"
                    onClick={() =>
                      onToggleHeart(activeTx.id, !activeTx.isHearted)
                    }
                    title="Spara köp"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      activeTx.isHearted
                        ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                        : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Heart
                      size={15}
                      weight={activeTx.isHearted ? 'fill' : 'regular'}
                      className={activeTx.isHearted ? 'text-rose-500' : ''}
                    />
                  </button>
                )}
                {onTogglePackage && activeTx && (
                  <button
                    type="button"
                    onClick={() =>
                      onTogglePackage(
                        activeTx.id,
                        !activeTx.isWaitingForPackage
                      )
                    }
                    title="Väntar på paket"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      activeTx.isWaitingForPackage
                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Package
                      size={15}
                      weight={activeTx.isWaitingForPackage ? 'fill' : 'regular'}
                      className={activeTx.isWaitingForPackage ? 'text-amber-500' : ''}
                    />
                  </button>
                )}
                {activeTx && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Bifoga kvitto"
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      activeTx.receiptUrl
                        ? 'text-[var(--text-primary)] bg-[var(--surface-hover)] border-[var(--text-muted)]'
                        : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Paperclip size={15} weight={activeTx.receiptUrl ? 'bold' : 'regular'} />
                  </button>
                )}
              </div>
            )}

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

          {/* Hero Receipt Header (Direkt-redigerbar titel & belopp) */}
          <div className="ui-hero-header mb-5 pb-5">
            <div className="ui-hero-icon">
              <ItemLogo
                name={displayName}
                category={category}
                logoUrl={activeTx?.logo}
                size="xl"
                isRecurring={recurringStatus.isRecurring}
              />
            </div>

            {/* Direkt-redigerbart namn i toppen */}
            <label className="inline-flex items-center justify-center max-w-full px-3 cursor-text">
              <input
                type="text"
                autoFocus={isCreateMode}
                placeholder={isIncome ? 't.ex. Swish eller Lön' : 't.ex. ICA eller Kaffe'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (!isCreateMode && activeTx) {
                    if (title.trim() && title.trim() !== activeTx.title) {
                      commitInlineChanges({ title: title.trim() });
                    } else if (!title.trim()) {
                      setTitle(activeTx.title);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                size={Math.max(10, (title || activeTx?.title || 't.ex. ICA').length)}
                className="max-w-[280px] bg-transparent border-0 p-0 font-display font-bold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 text-center focus:outline-none truncate"
              />
            </label>

            {/* Belopp */}
            <div
              className={`font-display font-extrabold text-3xl tabular-nums mt-1 ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {!isBankSynced ? (
                <label className="inline-flex items-baseline justify-center gap-1 cursor-text">
                  <span>{isIncome ? '+' : '-'}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    onBlur={() => {
                      if (!isCreateMode && activeTx) {
                        commitInlineChanges({
                          amount: Math.max(1, Number(amount) || activeTx.amount),
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    size={Math.max(2, String(amount || activeTx?.amount || '0').length)}
                    className="w-28 bg-transparent border-0 p-0 font-display font-extrabold text-3xl placeholder-[var(--text-muted)]/50 text-center tabular-nums focus:outline-none"
                  />
                  <span className="text-xl font-bold">kr</span>
                </label>
              ) : (
                <>
                  {isIncome ? '+' : '-'}
                  {formatKr(activeTx!.amount)}
                </>
              )}
            </div>

            {activeTx?.originalAmount &&
              activeTx.originalAmount !== activeTx.amount && (
                <p className="text-xs font-medium text-[var(--text-muted)] mt-1 tabular-nums">
                  Delad utgift · Ursprungligt belopp -{formatKr(activeTx.originalAmount)}
                </p>
              )}

            {/* Lugn metadata-rad direkt under beloppet (endast datum & tid) */}
            {!isCreateMode && activeTx && (
              <p className="text-xs text-[var(--text-muted)] tabular-nums mt-1.5">
                {formatSwedishFullDate(activeTx.date)}
                {txTime ? ` · ${txTime}` : ''}
              </p>
            )}
          </div>

          <div className="space-y-3">
            {/* Avskalad och fokuserad huvudtabell */}
            <div className="ui-sheet-group text-[13px] sm:text-sm">
              {/* 1. Kategori */}
              <button
                type="button"
                onClick={() => navigateSubView('category-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="text-[var(--text-muted)] shrink-0">Kategori</span>
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <CategoryIcon category={category} size={13} />
                  <span>{category}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              {isCreateMode && (
                <>
                  {/* Betalsätt */}
                  <button
                    type="button"
                    onClick={() => navigateSubView('payment-picker', 'forward')}
                    className="ui-row-btn"
                  >
                    <span className="text-[var(--text-muted)] shrink-0">Betalsätt</span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>{paymentMethod}</span>
                      <CaretRight size={12} className="text-[var(--text-muted)]" />
                    </span>
                  </button>

                  {/* Datum */}
                  <label className="ui-input-row cursor-pointer">
                    <span className="text-[var(--text-muted)] shrink-0">Datum</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent border-0 p-0 text-[13px] sm:text-sm font-semibold text-[var(--text-primary)] text-right tabular-nums focus:outline-none"
                    />
                  </label>
                </>
              )}

              {/* 2. Dela utgift (endast för befintlig transaktion) */}
              {!isCreateMode && activeTx && (
                <button
                  type="button"
                  onClick={() => navigateSubView('swish', 'forward')}
                  className="ui-row-btn"
                >
                  <span className="text-[var(--text-muted)] shrink-0">Dela utgift</span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 shrink-0">
                    <SwishLogo size={14} />
                    <span>Swish</span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>
              )}

              {/* 3. Liknande köp (endast för befintlig transaktion) */}
              {!isCreateMode && activeTx && (
                <button
                  type="button"
                  onClick={() => navigateSubView('similar', 'forward')}
                  className="ui-row-btn"
                >
                  <span className="text-[var(--text-muted)] shrink-0">Liknande köp</span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums shrink-0">
                    <span>
                      {similarInfo.transactions.length} st · {formatKr(similarInfo.totalAmount)}
                    </span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>
              )}

              {/* 4. Anteckning */}
              <label className="ui-input-row hover:bg-[var(--surface-hover)]/50 transition-colors">
                <span className="text-[var(--text-muted)] shrink-0">Anteckning</span>
                <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => {
                      if (!isCreateMode && activeTx && note.trim() !== (activeTx.note || '').trim()) {
                        commitInlineChanges({ note: note.trim() });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Lägg till..."
                    className="ui-inline-input truncate focus:text-clip"
                  />
                </div>
              </label>

              {/* Bifogat kvitto (visas som rad endast om ett kvitto är uppladdat) */}
              {!isCreateMode && activeTx?.receiptUrl && (
                <div className="ui-row">
                  <span className="text-[var(--text-muted)] shrink-0">Kvitto</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => navigateSubView('receipt-preview', 'forward')}
                      className="font-semibold text-[var(--text-primary)] hover:underline flex items-center gap-1 truncate max-w-[160px] cursor-pointer"
                    >
                      <FileText size={13} className="shrink-0" />
                      <span className="truncate">
                        {activeTx.receiptName || 'Visa kvitto'}
                      </span>
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
                        className="text-[var(--text-muted)] hover:text-rose-500 p-1 rounded cursor-pointer"
                        title="Ta bort kvitto"
                      >
                        <Trash size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Räkna med i budget */}
              {!isCreateMode && activeTx && onExclude && (
                <div className="ui-row">
                  <span className="text-[var(--text-muted)] shrink-0">Räkna med i budget</span>
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
              {!isCreateMode && activeTx && !recurringStatus.isRecurring && onMarkAsFixed && (
                <button
                  type="button"
                  onClick={() =>
                    onMarkAsFixed(activeTx, isIncome ? 'income' : 'expense')
                  }
                  className="ui-row-btn"
                >
                  <span className="text-[var(--text-muted)] shrink-0">Återkommande</span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <ArrowsClockwise size={13} />
                    <span>Gör till fast {isIncome ? 'inkomst' : 'utgift'}</span>
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
              /* Ta bort manuell transaktion */
              !isBankSynced && activeTx && onDelete && (
                <>
                  {showDeleteConfirm ? (
                    <div className="ui-confirm-danger">
                      <span className="font-medium text-rose-700 dark:text-rose-300">
                        Ta bort permanent?
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="ui-btn-sm bg-[var(--surface-color)] py-1 px-2.5"
                        >
                          Avbryt
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                        >
                          Ta bort
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="ui-btn-danger"
                    >
                      <Trash size={14} />
                      <span>Ta bort transaktion</span>
                    </button>
                  )}
                </>
              )
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
};

