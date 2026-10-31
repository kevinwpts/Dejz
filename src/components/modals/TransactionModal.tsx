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
  Plus,
} from '@phosphor-icons/react';
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
import { CategoryIcon, resolveCategoryColor } from '../CategoryIcon';
import {
  formatSwedishFullDate,
  formatSwedishDateHeading,
  getItemReceipts,
  ReceiptAttachment,
} from '../../utils/swedishDate';
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
import {
  inferCategoryAndMethodFromName,
  cleanDisplayMerchantName,
  formatSwishTitle,
} from '../../utils/bankHistoryAnalyzer';
import { fetchLogoForName, getLearnedBrandCategory } from '../../utils/logo';

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
  const [pickerReturnView, setPickerReturnView] = useState<'details' | 'edit'>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [txType, setTxType] = useState<'expense' | 'income'>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Kort');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [draftReceipts, setDraftReceipts] = useState<ReceiptAttachment[]>([]);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptAttachment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSimilarPopup, setShowSimilarPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pickerYearMonth, setPickerYearMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showFullAccount, setShowFullAccount] = useState(false);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (next === 'receipt-preview' && (subView === 'details' || subView === 'edit')) {
      setPickerReturnView(subView);
    }
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
      setDraftReceipts(getItemReceipts(initialTransaction));
      setPreviewReceipt(null);
      setSubView('details');
      setPickerReturnView('details');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
      setShowSimilarPopup(false);
      setShowFullAccount(false);
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
      setDraftReceipts([]);
      setPreviewReceipt(null);
      setSubView('edit');
      setPickerReturnView('edit');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
      setShowSimilarPopup(false);
    }
  }, [initialTransaction, isOpen]);

  // Live AI-kategorisering om ett företagsnamn saknas i den lokala ordlistan
  useEffect(() => {
    if (!isOpen || subView !== 'edit') return;
    const trimmed = title.trim();
    if (trimmed.length < 3) return;
    const syncInferred = inferCategoryAndMethodFromName(
      trimmed,
      isIncome ? 'income' : 'transaction'
    );
    if (syncInferred?.category) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchLogoForName(trimmed, category).then(() => {
        if (cancelled) return;
        const aiCat = getLearnedBrandCategory(trimmed);
        if (aiCat) {
          setCategory(
            normalizeCategoryToValid(aiCat, isIncome ? 'income' : 'expense')
          );
        }
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [title, isOpen, subView, isIncome]);

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

  // Orörd originaltext direkt från banken (visas alltid som referens under "Banktext")
  const rawBankText = (() => {
    if (!activeTx) return '';
    const desc = (activeTx.rawDescription || '').trim();
    const cp = (activeTx.counterpartyName || '').trim();
    if (
      desc &&
      cp &&
      desc.toLowerCase() !== cp.toLowerCase() &&
      !desc.toLowerCase().includes(cp.toLowerCase()) &&
      !cp.toLowerCase().includes(desc.toLowerCase())
    ) {
      return `${cp} · ${desc}`;
    }
    return desc || cp || '';
  })();

  // Bankens städade standardnamn (för att kunna återställa om användaren döpt om händelsen)
  const defaultCleanBankTitle = (() => {
    if (!activeTx) return '';
    const rawSource = (activeTx.counterpartyName || activeTx.rawDescription || '').trim();
    if (!rawSource) return '';
    if (activeTx.category === 'Swish' || /swish/i.test(rawSource)) {
      return formatSwishTitle(activeTx.rawDescription || rawSource, activeTx.counterpartyName);
    }
    const cleaned = cleanDisplayMerchantName(rawSource);
    return cleaned && cleaned !== 'Banktransaktion' ? cleaned : rawSource;
  })();

  const isAggregatorTx = Boolean(
    activeTx &&
      (/\b(klarna|swish|paypal|qliro|walley|trustly)\b/i.test(
        `${activeTx.rawDescription || ''} ${activeTx.counterpartyName || ''} ${activeTx.title || ''}`
      ) ||
        activeTx.category === 'Swish')
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
        receipts: draftReceipts.length > 0 ? draftReceipts : undefined,
        receiptUrl: draftReceipts.length > 0 ? draftReceipts[0].url : undefined,
        receiptName: draftReceipts.length > 0 ? draftReceipts[0].name : undefined,
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

    if (isTitleChanged || isCategoryChanged) {
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
        receipts: draftReceipts.length > 0 ? draftReceipts : undefined,
        receiptUrl: draftReceipts.length > 0 ? draftReceipts[0].url : undefined,
        receiptName: draftReceipts.length > 0 ? draftReceipts[0].name : undefined,
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
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const uploaded: ReceiptAttachment[] = [];
      for (const file of files) {
        const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.74);
        uploaded.push({ url: dataUrl, name: file.name || 'Bifogat kvitto' });
      }
      const nextReceipts = [...draftReceipts, ...uploaded];
      setDraftReceipts(nextReceipts);
      if (!isCreateMode && onUpdate && activeTx) {
        onUpdate({
          ...activeTx,
          receipts: nextReceipts,
          receiptUrl: nextReceipts[0]?.url,
          receiptName: nextReceipts[0]?.name,
        });
      }
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const handleRemoveReceiptAt = (index: number) => {
    const nextReceipts = draftReceipts.filter((_, i) => i !== index);
    setDraftReceipts(nextReceipts);
    if (!isCreateMode && onUpdate && activeTx) {
      onUpdate({
        ...activeTx,
        receipts: nextReceipts.length > 0 ? nextReceipts : undefined,
        receiptUrl: nextReceipts[0]?.url,
        receiptName: nextReceipts[0]?.name,
      });
    }
  };

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  const displayName = title || activeTx?.title || (isIncome ? 'Ny inkomst' : 'Nytt köp');

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Hidden file input for receipt (supports multiple) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
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

          <div className="ui-date-header px-1">
            <span className="font-medium text-[var(--text-secondary)]">
              {similarInfo.transactions.length}{' '}
              {similarInfo.transactions.length === 1 ? 'händelse' : 'händelser'}
            </span>
            <span className="font-display font-medium text-[var(--text-primary)] tabular-nums">
              Totalt {formatKr(similarInfo.totalAmount)}
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
      {/* SUB-VIEW 5: INBYGGD KVITTO-VISNING (Fungerar i iOS & PWA)      */}
      {/* ============================================================== */}
      {subView === 'receipt-preview' && previewReceipt && (
        <div className={`${slideAnimClass} space-y-4`}>
          <div className="ui-sheet-sub-header">
            <button
              type="button"
              onClick={() => navigateSubView(pickerReturnView, 'back')}
              title="Tillbaka"
              aria-label="Tillbaka"
              className="ui-icon-btn"
            >
              <CaretLeft size={15} weight="bold" />
            </button>
            <span className="ui-sheet-title truncate max-w-[180px]">
              {previewReceipt.name || 'Kvitto'}
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
            {previewReceipt.url.startsWith('data:image/') ||
            /\.(png|jpe?g|webp|gif)$/i.test(previewReceipt.url) ? (
              <img
                src={previewReceipt.url}
                alt={previewReceipt.name || 'Kvitto'}
                className="max-h-[56dvh] w-auto object-contain rounded-xl"
              />
            ) : (
              <iframe
                src={previewReceipt.url}
                title={previewReceipt.name || 'Kvitto'}
                className="w-full h-[52dvh] rounded-xl border-0"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={previewReceipt.url}
              download={previewReceipt.name || `kvitto-${activeTx?.date || 'ny'}.jpg`}
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
              <Plus size={14} weight="bold" />
              <span>Bifoga fler</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* HUVUDVY 1: FÖRHANDSGRANSKNING (Ren läsvy utan redigeringsfält) */}
      {/* ============================================================== */}
      {subView === 'details' && !isCreateMode && activeTx && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          {/* Top Header */}
          <div className="ui-sheet-header mb-5">
            <div className="flex items-center gap-1">
              {onToggleHeart && (
                <button
                  type="button"
                  onClick={() => onToggleHeart(activeTx.id, !activeTx.isHearted)}
                  title="Spara köp"
                  className={`ui-icon-btn ${
                    activeTx.isHearted ? 'text-rose-500 hover:text-rose-600' : ''
                  }`}
                >
                  <Heart
                    size={18}
                    weight={activeTx.isHearted ? 'fill' : 'regular'}
                    className={activeTx.isHearted ? 'text-rose-500' : ''}
                  />
                </button>
              )}
              {!isIncome && onTogglePackage && (
                <button
                  type="button"
                  onClick={() =>
                    onTogglePackage(activeTx.id, !activeTx.isWaitingForPackage)
                  }
                  title="Väntar på paket"
                  className={`ui-icon-btn ${
                    activeTx.isWaitingForPackage ? 'text-amber-500 hover:text-amber-600' : ''
                  }`}
                >
                  <Package
                    size={18}
                    weight={activeTx.isWaitingForPackage ? 'fill' : 'regular'}
                    className={activeTx.isWaitingForPackage ? 'text-amber-500' : ''}
                  />
                </button>
              )}
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
                  setDraftReceipts(getItemReceipts(activeTx));
                  navigateSubView('edit', 'forward');
                }}
                className="px-3.5 py-1.5 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
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
          <div className="ui-hero-header relative overflow-hidden mb-5 pb-5">
            {(() => {
              const accentColor = resolveCategoryColor(activeTx.category);
              return (
                <>
                  <div
                    className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full blur-2xl opacity-15 dark:opacity-20"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="relative flex justify-center mb-3.5">
                    <ItemLogo
                      name={activeTx.title}
                      category={activeTx.category}
                      logoUrl={activeTx.logo}
                      size="xl"
                      isRecurring={Boolean(recurringStatus.isRecurring)}
                    />
                  </div>
                </>
              );
            })()}

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
            {/* Förhandsgranskningstabell (endast läsvy) */}
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

              {rawBankText && (
                <div className="ui-row items-start py-2.5">
                  <span className="ui-info-label shrink-0 pt-0.5">Banktext</span>
                  <span className="ui-info-value text-right break-words max-w-[230px] sm:max-w-[265px] text-[var(--text-secondary)] font-normal leading-snug">
                    {rawBankText}
                  </span>
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
                    Räknas ej i budget
                  </span>
                </div>
              )}
            </div>

            {/* Bifogade kvitton (visas endast i förhandsgranskning om det faktiskt finns kvitton) */}
            {draftReceipts.length > 0 && (
              <div className="space-y-2">
                {draftReceipts.map((rcpt, idx) => (
                  <button
                    key={`${rcpt.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setPreviewReceipt(rcpt);
                      navigateSubView('receipt-preview', 'forward');
                    }}
                    className="w-full rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5 space-y-2.5 text-left hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                        <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                        <span className="truncate">{rcpt.name || `Kvitto ${idx + 1}`}</span>
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
                        <span>Öppna</span>
                        <CaretRight size={11} className="text-[var(--text-muted)]" />
                      </span>
                    </div>

                    <div className="w-full rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-56">
                      {rcpt.url.startsWith('data:image/') ||
                      /\.(png|jpe?g|webp|gif)$/i.test(rcpt.url) ? (
                        <img
                          src={rcpt.url}
                          alt={rcpt.name || 'Kvitto'}
                          className="max-h-48 w-auto object-contain rounded-lg"
                        />
                      ) : (
                        <div className="py-5 flex flex-col items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <FileText size={26} weight="duotone" />
                          <span className="font-medium">{rcpt.name || 'Öppna dokument'}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Liknande transaktioner */}
            <div className="ui-sheet-group">
              <button
                type="button"
                onClick={() => navigateSubView('similar', 'forward')}
                className="ui-row-btn"
              >
                <span className="font-normal text-[var(--text-primary)] flex items-center gap-2 shrink-0">
                  <ClockCounterClockwise
                    size={15}
                    className="text-[var(--text-secondary)] shrink-0"
                  />
                  <span>Liknande transaktioner</span>
                </span>
                <span className="text-[var(--text-secondary)] font-normal flex items-center gap-1.5 tabular-nums shrink-0">
                  <span>
                    {similarInfo.transactions.length} st · {formatKr(similarInfo.totalAmount)}
                  </span>
                  <CaretRight size={13} className="text-[var(--text-muted)]" />
                </span>
              </button>
            </div>
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
            {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
              <label className="flex items-center gap-3.5 cursor-text">
                <ItemLogo
                  name={title || activeTx?.title || (isIncome ? 'Inkomst' : 'Utgift')}
                  category={category}
                  logoUrl={activeTx?.logo}
                  size="lg"
                  isRecurring={Boolean(!isCreateMode && recurringStatus.isRecurring)}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                    Namn
                  </span>
                  <input
                    type="text"
                    autoFocus={isCreateMode}
                    placeholder={isIncome ? 'Inkomstkälla' : 'Butik eller köp'}
                    value={title}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setTitle(nextTitle);
                      const inferred = inferCategoryAndMethodFromName(
                        nextTitle,
                        isIncome ? 'income' : 'transaction'
                      );
                      if (inferred?.category) {
                        setCategory(inferred.category);
                      }
                      if (isCreateMode && inferred?.paymentMethod) {
                        setPaymentMethod(inferred.paymentMethod);
                      }
                    }}
                    className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                  />
                </div>
              </label>

              {!isCreateMode && rawBankText && (
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[var(--text-muted)]">
                  <span className="truncate" title={rawBankText}>
                    Banktext:{' '}
                    <span className="font-medium text-[var(--text-secondary)]">
                      {rawBankText}
                    </span>
                  </span>
                  {defaultCleanBankTitle &&
                    title.trim().toLowerCase() !== defaultCleanBankTitle.toLowerCase() && (
                      <button
                        type="button"
                        onClick={() => setTitle(defaultCleanBankTitle)}
                        className="px-2 py-0.5 rounded-md bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[10.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                      >
                        Återställ ({defaultCleanBankTitle})
                      </button>
                    )}
                </div>
              )}

              <div className="border-t border-[var(--border-subtle)] pt-3.5">
                {!isBankSynced ? (
                  <label className="block cursor-text">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                      Belopp
                    </span>
                    <div className="flex items-baseline justify-between gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                        className={`w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-[var(--text-primary)]'
                        }`}
                      />
                      <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                        kr
                      </span>
                    </div>
                  </label>
                ) : (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Belopp (banksynkad)
                    </span>
                    <span
                      className={`font-display font-bold text-xl tabular-nums ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatKr(activeTx!.amount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Grupp 1: Egenskaper & Kvitto */}
            <div className="ui-sheet-group">
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
                  placeholder="Lägg till anteckning"
                  className="ui-inline-input"
                />
              </label>

              {/* Bifoga kvitto */}
              <div className="ui-row">
                <span className="ui-info-label shrink-0">
                  {draftReceipts.length > 0 ? `Kvitton (${draftReceipts.length})` : 'Kvitto'}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="font-medium text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1.5 cursor-pointer"
                >
                  <Paperclip size={13} />
                  <span>{draftReceipts.length > 0 ? 'Bifoga fler' : 'Bifoga kvitto'}</span>
                </button>
              </div>
            </div>

            {/* Grupp 2: Budget & Återkommande (endast vid redigering av befintlig händelse) */}
            {!isCreateMode && activeTx && (onExclude || onMarkAsFixed) && (
              <div className="ui-sheet-group">
                {onExclude && (
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

                {onMarkAsFixed && (
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
            )}

            {draftReceipts.length > 0 && (
              <div className="space-y-2">
                {draftReceipts.map((rcpt, idx) => (
                  <div
                    key={`${rcpt.name}-${idx}`}
                    className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center justify-between gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewReceipt(rcpt);
                        navigateSubView('receipt-preview', 'forward');
                      }}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 cursor-pointer"
                    >
                      <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                        {rcpt.name || `Kvitto ${idx + 1}`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveReceiptAt(idx)}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      title="Ta bort kvitto"
                    >
                      <Trash size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                      description={`${activeTx.title} tas bort.`}
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
      {/* CENTRERAD POPUP FÖR ATT BYTA BAKÅT OCH FRAMÅT I TIDEN          */}
      {/* ============================================================== */}
      {showSimilarPopup &&
        activeTx &&
        typeof document !== 'undefined' &&
        (() => {
          const nextTitleTrimmed = title.trim() || activeTx.title;
          const isTitleChanged = nextTitleTrimmed !== activeTx.title;
          const bankOriginLabel =
            defaultCleanBankTitle ||
            activeTx.counterpartyName ||
            activeTx.rawDescription ||
            activeTx.title;
          const hasDistinctChainVsStore =
            similarInfo.transactions.length > similarInfo.sameMerchantTransactions.length &&
            similarInfo.sameMerchantTransactions.length >= 1;

          return createPortal(
            <div
              className="fixed inset-0 z-[260] flex items-center justify-center p-5 bg-black/45 backdrop-blur-xs animate-fade-in"
              onClick={() => setShowSimilarPopup(false)}
            >
              <div
                className="w-full max-w-[348px] rounded-modal bg-[var(--surface-color)] border border-[var(--border-subtle)] p-5 shadow-2xl space-y-4 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center space-y-1.5">
                  <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">
                    {isTitleChanged
                      ? isAggregatorTx
                        ? 'Ändra namn på köpet?'
                        : 'Byt namn bakåt och framåt i tiden?'
                      : 'Byt kategori bakåt och framåt i tiden?'}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {isTitleChanged && isAggregatorTx ? (
                      <>
                        Köp via{' '}
                        <span className="font-medium text-[var(--text-secondary)]">
                          {bankOriginLabel}
                        </span>{' '}
                        gäller oftast olika saker från gång till gång. Vill du ändra till{' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          {nextTitleTrimmed}
                        </span>{' '}
                        ({category}) endast för detta köp eller för alla?
                      </>
                    ) : (
                      <>
                        Vill du att ändringen till{' '}
                        <span className="font-medium text-[var(--text-primary)]">
                          {nextTitleTrimmed}
                        </span>{' '}
                        ({category}) ska gälla alla befintliga köp bakåt i tiden och alla framtida köp från{' '}
                        <span className="font-medium text-[var(--text-secondary)]">
                          {bankOriginLabel}
                        </span>
                        {similarInfo.transactions.length > 1
                          ? ` (${similarInfo.transactions.length} befintliga händelser)`
                          : ''}
                        ?
                      </>
                    )}
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {isTitleChanged && isAggregatorTx ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Endast detta köp (rekommenderas)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('chain')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Byt bakåt och framåt i tiden
                      </button>
                    </>
                  ) : hasDistinctChainVsStore ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('same-merchant')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Byt för {bankOriginLabel} ({similarInfo.sameMerchantTransactions.length} st + framtida)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('chain')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Byt för hela kedjan {similarInfo.brandLabel} ({similarInfo.transactions.length} st)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Endast detta köp
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('chain')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Byt bakåt och framåt i tiden
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Endast detta köp
                      </button>
                    </>
                  )}

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
          );
        })()}
    </BottomSheet>
  );
};

