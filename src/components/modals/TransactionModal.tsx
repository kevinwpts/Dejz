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
  ClockCounterClockwise,
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
import { CategoryIcon, PaymentMethodIcon, resolveCategoryColor } from '../CategoryIcon';
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
  compressImageFileToDataUrl,
  getSavingsGoals,
  saveSavingsGoals,
  SavingsGoalItem,
   getTransactionMetaMap,
  saveTransactionMeta,
  saveSwishPhoneDirectoryEntry,
  removeSwishPhoneDirectoryEntry,
} from '../../utils/appCache';
import { hasConnectedHouseholdPartner } from '../../utils/householdSync';
import { formatIsoDateStockholm } from '../../utils/swedishDate';


import { SwishLogo } from '../SwishLogo';
import { parseQuickEntry } from '../../utils/quickEntry';
import {
  inferCategoryAndMethodFromName,
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  formatSwishTitle,
  extractSwishPhoneNumber,
  isLikelySwishTransactionText,
} from '../../utils/bankHistoryAnalyzer';
import {
  fetchLogoForName,
  getLearnedBrandCategory,
  isMerchantCategoryIconPreferred,
  setMerchantCategoryIconPreferred,
} from '../../utils/logo';

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
  onLinkToFixed?: (
    tx: TransactionItem,
    item: FixedExpenseItem | IncomeItem | null,
    kind: 'expense' | 'income'
  ) => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  isInternalTransfer?: boolean;
  userEmail?: string | null;
  userName?: string | null;
  onOpenFriendsChat?: (friendKey?: string | null) => void;
}

type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'payment-picker'
  | 'date-picker'
  | 'link-fixed-picker'
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
  onLinkToFixed,
  onToggleHeart,
  onTogglePackage,
  userEmail: _userEmail,
  userName: _userName,
  onOpenFriendsChat: _onOpenFriendsChat,
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
  const [logoPrefTick, setLogoPrefTick] = useState(0);
  const [swishSplitMode, setSwishSplitMode] = useState<'equal' | 'custom'>('equal');
  const [swishCustomShare, setSwishCustomShare] = useState<string>('');

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (
      (next === 'category-picker' ||
        next === 'payment-picker' ||
        next === 'date-picker' ||
        next === 'receipt-preview' ||
        next === 'link-fixed-picker') &&
      (subView === 'details' || subView === 'edit')
    ) {
      setPickerReturnView(subView);
    }
    setNavDirection(dir);
    setSubView(next);
  };

  const isIncome = isCreateMode ? txType === 'income' : activeTx?.type === 'income';

  // Snabbinmatning: "Ica 342" i namnfältet → namn "Ica" och belopp 342 (bara när beloppet är tomt)
  const applyQuickEntry = () => {
    if (!isCreateMode || String(amount).trim() !== '') return;
    const parsed = parseQuickEntry(title);
    if (!parsed) return;
    setTitle(parsed.name);
    setAmount(String(parsed.amount));
    const inferred = inferCategoryAndMethodFromName(parsed.name, isIncome ? 'income' : 'transaction');
    if (inferred?.category) setCategory(inferred.category);
    if (inferred?.paymentMethod) setPaymentMethod(inferred.paymentMethod);
  };

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
      const todayIso = formatIsoDateStockholm(new Date());
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

  // Ursprungligt namn (så som posten såg ut när banken importerade den eller när den skapades från början, oavsett hur många gånger den döpts om)
  const defaultCleanBankTitle = (() => {
    if (!activeTx) return '';
    const rawSource = (activeTx.counterpartyName || activeTx.rawDescription || '').trim();
    if (!rawSource && !activeTx.rawJson) {
      return (
        activeTx.originalTitle ||
        (activeTx.id ? getTransactionMetaMap()[activeTx.id]?.originalTitle : '') ||
        ''
      ).trim();
    }
    if (
      activeTx.category === 'Swish' ||
      /swish/i.test(rawSource) ||
      isLikelySwishTransactionText(rawSource, activeTx.rawJson)
    ) {
      return formatSwishTitle(
        activeTx.rawDescription || rawSource,
        activeTx.counterpartyName,
        activeTx.type === 'income',
        activeTx.rawJson,
        true
      );
    }
    const pureCategorized = categorizeBankTransactionForApp(
      {
        description: activeTx.rawDescription || '',
        counterparty_name: activeTx.counterpartyName || '',
        raw_json: activeTx.rawJson,
        reconciliation_status: activeTx.reconciliationStatus,
      } as any,
      undefined,
      undefined,
      true
    );
    if (pureCategorized?.merchant && pureCategorized.merchant !== 'Banktransaktion') {
      return pureCategorized.merchant;
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

    // Om detta är en Swish-transaktion med telefonnummer och användaren väljer att spara för alla med detta nummer (ej 'single'), spara eller återställ i Swish-katalogen!
    if (isTitleChanged && applyScope !== 'single') {
      const swishPhone = extractSwishPhoneNumber(
        `${activeTx.rawDescription || ''} ${activeTx.counterpartyName || ''} ${activeTx.title || ''}`
      );
      if (swishPhone) {
        if (
          defaultCleanBankTitle &&
          nextTitle.trim().toLowerCase() === defaultCleanBankTitle.trim().toLowerCase()
        ) {
          removeSwishPhoneDirectoryEntry(swishPhone);
        } else {
          const parenPersonMatch = nextTitle.match(/^swish\s*\(([^)]+)\)$/i);
          const cleanedPerson = (
            parenPersonMatch?.[1] ||
            nextTitle
              .replace(/^swish\s+(?:från|fran|till|köp)?\s*/i, '')
              .replace(/\(\s*[\d\s+-]+\s*\)/g, '')
          ).trim();
          if (cleanedPerson.length >= 2 && !/\d{5,}/.test(cleanedPerson)) {
            saveSwishPhoneDirectoryEntry(swishPhone, cleanedPerson);
          }
        }
      }
    }

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
        date: date || formatIsoDateStockholm(new Date()),
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
              onClick={() => navigateSubView(pickerReturnView, 'back')}
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
                    if (pickerReturnView === 'details' && activeTx && onUpdate) {
                      saveTransactionMeta(activeTx.id, { customCategory: c });
                      onUpdate({ ...activeTx, category: c });
                    }
                    navigateSubView(pickerReturnView, 'back');
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
              onClick={() => navigateSubView(pickerReturnView, 'back')}
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
                    if (pickerReturnView === 'details' && activeTx && onUpdate) {
                      saveTransactionMeta(activeTx.id, { paymentMethod: m });
                      onUpdate({ ...activeTx, paymentMethod: m });
                    }
                    navigateSubView(pickerReturnView, 'back');
                  }}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PaymentMethodIcon method={m} size={17} />
                    <span
                      className={`truncate ${
                        isSel
                          ? 'font-medium text-[var(--text-primary)]'
                          : 'font-normal text-[var(--text-primary)]'
                      }`}
                    >
                      {m}
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
      {/* SUB-VIEW 3.5: EGEN MODERN DATUMVÄLJARE                         */}
      {/* ============================================================== */}
      {subView === 'date-picker' && (
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
                          if (pickerReturnView === 'details' && activeTx && onUpdate) {
                            onUpdate({ ...activeTx, date: p.iso });
                          }
                          navigateSubView(pickerReturnView, 'back');
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
                          className={`text-[11px] block truncate mt-0.5 tabular-nums ${
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
                            if (pickerReturnView === 'details' && activeTx && onUpdate) {
                              onUpdate({ ...activeTx, date: iso });
                            }
                            navigateSubView(pickerReturnView, 'back');
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
      {/* SUB-VIEW 6: KOPPLA TILL BEFINTLIG FAST UTGIFT / INKOMST        */}
      {/* ============================================================== */}
      {subView === 'link-fixed-picker' && activeTx && (
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
            <span className="ui-sheet-title">
              {isIncome ? 'Koppla till fast inkomst' : 'Koppla till fast utgift'}
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
            {(isIncome ? incomes : fixedExpenses).map((item) => {
              const isMatched =
                (isIncome
                  ? activeTx.linkedIncomeId === item.id
                  : activeTx.linkedFixedExpenseId === item.id) ||
                recurringStatus.matchedItemId === item.id;
              const dayNum = 'dueDay' in item ? item.dueDay : item.payday;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (onLinkToFixed) {
                      onLinkToFixed(activeTx, item, isIncome ? 'income' : 'expense');
                    }
                    navigateSubView(pickerReturnView, 'back');
                  }}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ItemLogo
                      name={item.name}
                      category={item.category}
                      logoUrl={item.logo}
                      size="md"
                      isRecurring={true}
                    />
                    <div className="min-w-0 flex-1 text-left">
                      <span
                        className={`block truncate ${
                          isMatched
                            ? 'font-medium text-[var(--text-primary)]'
                            : 'font-normal text-[var(--text-primary)]'
                        }`}
                      >
                        {item.name}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] tabular-nums">
                        {formatKr(item.amount)}/mån · Den {dayNum}:e
                      </span>
                    </div>
                  </div>
                  {isMatched && (
                    <Check size={14} weight="bold" className="text-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}

            {(activeTx.linkedFixedExpenseId || activeTx.linkedIncomeId) && onLinkToFixed && (
              <button
                type="button"
                onClick={() => {
                  onLinkToFixed(activeTx, null, isIncome ? 'income' : 'expense');
                  navigateSubView(pickerReturnView, 'back');
                }}
                className="ui-row-btn text-rose-500"
              >
                <span className="font-medium">Ta bort koppling till fast post</span>
              </button>
            )}
          </div>

          {onMarkAsFixed && (
            <button
              type="button"
              onClick={() => onMarkAsFixed(activeTx, isIncome ? 'income' : 'expense')}
              className="ui-btn-secondary w-full flex items-center justify-center gap-1.5"
            >
              <Plus size={14} weight="bold" />
              <span>
                Skapa som ny fast {isIncome ? 'inkomst' : 'utgift'} ({activeTx.title})
              </span>
            </button>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 7: DELA UTLÄGG                                        */}
      {/* ============================================================== */}
      {subView === 'swish' && activeTx && (
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
            <span className="ui-sheet-title">Dela utlägg</span>
            <button type="button" onClick={onClose} className="ui-icon-btn">
              <X size={16} />
            </button>
          </div>

          {(() => {
            const baseFullAmt = Math.round(
              Math.abs(Number(activeTx.originalAmount || activeTx.amount) || 0)
            );
            const halfAmt = Math.max(1, Math.round(baseFullAmt / 2));
            const friendShare =
              swishSplitMode === 'equal'
                ? halfAmt
                : Math.min(
                    baseFullAmt - 1,
                    Math.max(1, Math.round(Number(swishCustomShare) || halfAmt))
                  );
            const myRemainingShare = Math.max(0, baseFullAmt - friendShare);
            const isAlreadySplit = Boolean(
              activeTx.isWaitingForSwish ||
                (activeTx.originalAmount && activeTx.originalAmount > activeTx.amount)
            );

            return (
              <div className="space-y-4">
                {/* Uppdelningskort */}
                <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <ItemLogo
                        name={activeTx.title}
                        category={activeTx.category}
                        logoUrl={activeTx.logo}
                        size="md"
                      />
                      <div className="min-w-0">
                        <span className="ui-row-title block truncate">{activeTx.title}</span>
                        <span className="ui-row-subtitle tabular-nums">
                          Totalt belopp: {formatKr(baseFullAmt)}
                        </span>
                      </div>
                    </div>
                    <SwishLogo size={22} />
                  </div>

                  {/* Välj uppdelning */}
                  <div className="ui-segmented grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSwishSplitMode('equal');
                        setSwishCustomShare(String(halfAmt));
                      }}
                      className={`ui-segmented-tab ${
                        swishSplitMode === 'equal' ? 'ui-segmented-tab-active' : ''
                      }`}
                    >
                      Dela lika (50/50)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSwishSplitMode('custom');
                        if (!swishCustomShare) setSwishCustomShare(String(halfAmt));
                      }}
                      className={`ui-segmented-tab ${
                        swishSplitMode === 'custom' ? 'ui-segmented-tab-active' : ''
                      }`}
                    >
                      Anpassat belopp
                    </button>
                  </div>

                  {swishSplitMode === 'custom' && (
                    <div className="pt-1">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] block mb-1">
                        Belopp att få tillbaka (kr)
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={swishCustomShare}
                        onChange={(e) =>
                          setSwishCustomShare(e.target.value.replace(/[^\d]/g, ''))
                        }
                        placeholder={String(halfAmt)}
                        className="w-full px-3.5 py-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] font-display font-semibold text-base text-[var(--text-primary)] tabular-nums focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Tydlig fördelning */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)]">
                    <div className="p-3 rounded-xl bg-[var(--surface-color)]">
                      <span className="text-[11px] text-[var(--text-secondary)] block">
                        Din del i budget
                      </span>
                      <span className="font-display font-bold text-base text-[var(--text-primary)] tabular-nums mt-0.5 block">
                        {formatKr(myRemainingShare)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-right">
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block font-medium">
                        Att få tillbaka
                      </span>
                      <span className="font-display font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block">
                        +{formatKr(friendShare)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rena, tydliga åtgärder */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      saveTransactionMeta(activeTx.id, {
                        isWaitingForSwish: true,
                        pendingSwishAmount: friendShare,
                        originalAmount: baseFullAmt,
                        customAmount: myRemainingShare,
                      });
                      if (onUpdate) {
                        onUpdate({
                          ...activeTx,
                          originalAmount: baseFullAmt,
                          amount: myRemainingShare,
                          isWaitingForSwish: true,
                          pendingSwishAmount: friendShare,
                        });
                      }
                      navigateSubView('details', 'back');
                    }}
                    className="ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>Räkna bara min del ({formatKr(myRemainingShare)}) i budget</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const noteText = encodeURIComponent(activeTx.title || 'Utlägg');
                      const swishAppUrl = `swish://payment?amount=${friendShare}&message=${noteText}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(
                          `Hej! Kan du swisha mig ${friendShare} kr för ${activeTx.title}? Tack!`
                        );
                      }
                      window.location.href = swishAppUrl;
                    }}
                    className="ui-btn-secondary"
                  >
                    <SwishLogo size={15} />
                    <span>Öppna Swish för att begära {formatKr(friendShare)}</span>
                  </button>

                  {isAlreadySplit && (
                    <button
                      type="button"
                      onClick={() => {
                        saveTransactionMeta(activeTx.id, {
                          isWaitingForSwish: false,
                          pendingSwishAmount: undefined,
                          pendingSwishRecipient: undefined,
                          originalAmount: undefined,
                          customAmount: baseFullAmt,
                        });
                        if (onUpdate) {
                          onUpdate({
                            ...activeTx,
                            amount: baseFullAmt,
                            originalAmount: undefined,
                            isWaitingForSwish: false,
                            pendingSwishAmount: undefined,
                            pendingSwishRecipient: undefined,
                          });
                        }
                        navigateSubView('details', 'back');
                      }}
                      className="ui-btn-danger"
                    >
                      <Trash size={13} />
                      <span>Återställ till hela beloppet ({formatKr(baseFullAmt)})</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ============================================================== */}
      {/* HUVUDVY 1: FÖRHANDSGRANSKNING (Ren läsvy utan redigeringsfält) */}
      {/* ============================================================== */}
      {subView === 'details' && !isCreateMode && activeTx && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          {/* Top Header */}
          <div className="ui-sheet-header !mb-0">
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
                onClick={onClose}
                className="ui-icon-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Hero Receipt Header (Direkt redigerbar) */}
          <div className="ui-hero-header relative overflow-hidden pt-5 mb-5 pb-5">
            {(() => {
              void logoPrefTick;
              const accentColor = resolveCategoryColor(category || activeTx.category);
              const prefersCatIcon = isMerchantCategoryIconPreferred(title || activeTx.title);
              return (
                <>
                  <div
                    className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-44 h-32 rounded-full blur-2xl opacity-15 dark:opacity-20"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="relative flex justify-center mb-3.5">
                    <button
                      type="button"
                      onClick={() => {
                        setMerchantCategoryIconPreferred(title || activeTx.title, !prefersCatIcon);
                        setLogoPrefTick((t) => t + 1);
                      }}
                      title={
                        prefersCatIcon
                          ? 'Tryck för att visa företagslogga'
                          : 'Tryck för att visa kategori-ikon'
                      }
                      className="relative group/logo cursor-pointer rounded-2xl focus:outline-none active:scale-95 transition-transform"
                    >
                      <ItemLogo
                        key={`tx-logo-${logoPrefTick}`}
                        name={title || activeTx.title}
                        category={category || activeTx.category}
                        logoUrl={activeTx.logo}
                        size="xl"
                        isRecurring={Boolean(recurringStatus.isRecurring)}
                      />
                    </button>
                  </div>
                </>
              );
            })()}

            <div className="flex items-center justify-center gap-1.5 px-3 max-w-md mx-auto">
              <input
                type="text"
                spellCheck={false}
                autoCorrect="off"
                value={title}
                onChange={(e) => {
                  const nextTitle = e.target.value;
                  setTitle(nextTitle);
                  if (activeTx && onUpdate) {
                    onUpdate({ ...activeTx, title: nextTitle.trim() || activeTx.title });
                  }
                }}
                className="font-display font-semibold text-base sm:text-lg text-[var(--text-primary)] text-center bg-transparent border-0 focus:outline-none focus:ring-0 transition-colors w-full p-0"
                placeholder="Transaktionens namn"
              />
              {(() => {
                const canResetTitle =
                  Boolean(defaultCleanBankTitle) &&
                  title.trim().toLowerCase() !== defaultCleanBankTitle.trim().toLowerCase();
                if (!canResetTitle) return null;
                return (
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(defaultCleanBankTitle);
                      if (activeTx && onUpdate) {
                        onUpdate({ ...activeTx, title: defaultCleanBankTitle });
                      }
                    }}
                    title={`Återställ till ursprungsnamn (${defaultCleanBankTitle})`}
                    aria-label={`Återställ till ursprungsnamn (${defaultCleanBankTitle})`}
                    className="w-7 h-7 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <ClockCounterClockwise size={13} weight="bold" />
                  </button>
                );
              })()}
            </div>

            {isBankSynced ? (
              <div
                className={`mt-1 font-display font-bold tabular-nums text-2xl sm:text-3xl ${
                  isIncome ? 'text-emerald-500' : 'text-[var(--text-primary)]'
                }`}
              >
                {isIncome ? '+' : '-'}
                {formatKr(activeTx.amount)}
              </div>
            ) : (
              <div
                className={`mt-1 flex items-baseline justify-center ${
                  isIncome ? 'ui-hero-amount-income' : 'ui-hero-amount'
                }`}
              >
                <span className="font-display font-bold text-2xl sm:text-3xl">
                  {isIncome ? '+' : '-'}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  spellCheck={false}
                  size={Math.max(1, (amount || '0').length)}
                  style={{ width: `${Math.max(1, (amount || '0').length)}ch` }}
                  value={amount}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^\d]/g, '');
                    setAmount(cleaned);
                    const num = Number(cleaned);
                    if (num > 0 && activeTx && onUpdate) {
                      onUpdate({ ...activeTx, amount: num });
                    }
                  }}
                  className={`bg-transparent border-0 focus:outline-none focus:ring-0 text-center font-display font-bold tabular-nums text-2xl sm:text-3xl p-0 ${
                    isIncome ? 'text-emerald-500' : 'text-[var(--text-primary)]'
                  }`}
                  placeholder="0"
                />
                <span className="ml-1.5 font-display font-medium text-base text-[var(--text-secondary)]">
                  kr
                </span>
              </div>
            )}

            {isBankSynced ? (
              <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-1.5 flex items-center justify-center gap-1">
                <span>{formatSwedishDateHeading(activeTx.date)}</span>
                {activeTx.bookingStatus === 'PDNG' || activeTx.bookingStatus === 'HOLD'
                  ? ' · Reserverat'
                  : txTime
                  ? ` · ${txTime}`
                  : ''}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => navigateSubView('date-picker', 'forward')}
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] tabular-nums mt-1.5 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <span>{formatSwedishDateHeading(date || activeTx.date)}</span>
                <CaretRight size={11} className="text-[var(--text-muted)]" />
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {/* 1. Kompakta snabbåtgärder (Apple Wallet / Revolut-stil) */}
            <div className="grid grid-cols-4 gap-2">
              {!isIncome ? (
                <button
                  type="button"
                  onClick={() => {
                    const baseFullAmt = Math.round(
                      Math.abs(Number(activeTx.originalAmount || activeTx.amount) || 0)
                    );
                    setSwishCustomShare(
                      String(activeTx.pendingSwishAmount || Math.max(1, Math.round(baseFullAmt / 2)))
                    );
                    navigateSubView('swish', 'forward');
                  }}
                  className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                    <SwishLogo size={16} />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                    {activeTx.isWaitingForSwish ? 'Väntar' : 'Dela'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateSubView('category-picker', 'forward')}
                  className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                    <CategoryIcon category={category || activeTx.category} size={16} />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                    Kategori
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (draftReceipts.length > 0) {
                    setPreviewReceipt(draftReceipts[0]);
                    navigateSubView('receipt-preview', 'forward');
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group relative"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform relative">
                  <Paperclip size={16} weight="regular" />
                  {draftReceipts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-color)]" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                  {draftReceipts.length > 0 ? `${draftReceipts.length} kvitto` : 'Kvitto'}
                </span>
              </button>

              {(onLinkToFixed || onMarkAsFixed) && (
                <button
                  type="button"
                  onClick={() => {
                    const hasExistingList = isIncome
                      ? incomes.length > 0
                      : fixedExpenses.length > 0;
                    if (hasExistingList && onLinkToFixed) {
                      navigateSubView('link-fixed-picker', 'forward');
                    } else if (onMarkAsFixed) {
                      onMarkAsFixed(activeTx, isIncome ? 'income' : 'expense');
                    }
                  }}
                  className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform ${
                      recurringStatus.isRecurring
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[var(--surface-color)] text-[var(--text-primary)]'
                    }`}
                  >
                    <ArrowsClockwise size={16} />
                  </div>
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                    {recurringStatus.isRecurring ? 'Fast post' : 'Gör fast'}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigateSubView('similar', 'forward')}
                className="p-2.5 rounded-2xl bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
              >
                <div className="w-8 h-8 rounded-full bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] group-hover:scale-105 transition-transform">
                  <ClockCounterClockwise size={16} />
                </div>
                <span className="text-[11px] font-medium text-[var(--text-primary)] truncate max-w-full">
                  {similarInfo.transactions.length > 0 ? `${similarInfo.transactions.length} köp` : 'Historik'}
                </span>
              </button>
            </div>

            {/* 2. Ett enda sammanhållet detaljkort (allt i ett lugnt flöde) */}
            <div className="ui-sheet-group">
              <button
                type="button"
                onClick={() => navigateSubView('category-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label">Kategori</span>
                <span className="ui-info-value flex items-center gap-1.5">
                  <CategoryIcon category={category || activeTx.category} size={13} />
                  <span>{category || activeTx.category}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigateSubView('payment-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="ui-info-label">Betalsätt</span>
                <span className="ui-info-value flex items-center gap-1.5">
                  <PaymentMethodIcon method={paymentMethod || getDefaultPaymentMethodForTx(activeTx)} size={15} />
                  <span>{paymentMethod || getDefaultPaymentMethodForTx(activeTx)}</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              {isBankSynced ? (
                <div className="ui-row">
                  <span className="ui-info-label">Bokfört datum</span>
                  <span className="ui-info-value tabular-nums">
                    {formatSwedishDateHeading(activeTx.date)}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateSubView('date-picker', 'forward')}
                  className="ui-row-btn"
                >
                  <span className="ui-info-label">Datum</span>
                  <span className="ui-info-value flex items-center gap-1.5 tabular-nums">
                    <span>{formatSwedishDateHeading(date || activeTx.date)}</span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </span>
                </button>
              )}

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
                      className="px-2 py-0.5 rounded-md bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
                    >
                      {showFullAccount ? 'Dölj' : 'Visa'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bifogade kvitton (visas endast i listan om kvitto finns; snabbvalsknappen ovan hanterar bifogning) */}
              {draftReceipts.length > 0 && (
                <>
                  {draftReceipts.map((rcpt, idx) => (
                    <div key={`${rcpt.name}-${idx}`} className="ui-row">
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewReceipt(rcpt);
                          navigateSubView('receipt-preview', 'forward');
                        }}
                        className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1 group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 overflow-hidden">
                          {rcpt.url.startsWith('data:image/') ||
                          /\.(png|jpe?g|webp|gif)$/i.test(rcpt.url) ? (
                            <img src={rcpt.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Paperclip size={13} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-[var(--text-primary)] block truncate group-hover:opacity-80">
                            {rcpt.name || `Kvitto ${idx + 1}`}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] block">
                            Klicka för att granska
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewReceipt(rcpt);
                            navigateSubView('receipt-preview', 'forward');
                          }}
                          className="px-2 py-1 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                          Öppna
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveReceiptAt(idx)}
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Ta bort kvitto"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Anteckning direkt i kortet */}
              <div className="ui-row">
                <span className="ui-info-label shrink-0">Anteckning</span>
                <input
                  type="text"
                  placeholder="Lägg till anteckning..."
                  value={note}
                  onChange={(e) => {
                    const nextNote = e.target.value;
                    setNote(nextNote);
                    if (activeTx && onUpdate) {
                      onUpdate({ ...activeTx, note: nextNote.trim() || undefined });
                    }
                  }}
                  className="font-normal text-right text-[var(--text-primary)] placeholder-[var(--text-muted)] bg-transparent border-0 p-0 text-xs sm:text-sm focus:outline-none flex-1 ml-3"
                />
              </div>

              {/* Budget & Hushålls-inställningar samlade */}
              {onExclude && (
                <div className="ui-row">
                  <span className="ui-info-label">Räkna i budget</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isExcluded}
                    onClick={() => {
                      onExclude(activeTx.id, !isExcluded);
                      setLogoPrefTick((t) => t + 1);
                    }}
                    className={`ui-switch ${!isExcluded ? 'ui-switch-on' : 'ui-switch-off'}`}
                  >
                    <span
                      className={`ui-switch-thumb ${
                        !isExcluded ? 'ui-switch-thumb-on' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {!isIncome && hasConnectedHouseholdPartner() && (
                <div className="ui-row">
                  <span className="ui-info-label flex items-center gap-1.5">
                    <UserPlus size={14} className="text-[var(--text-secondary)]" />
                    <span>Delat utlägg i hushållet</span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(activeTx.isSharedExpense)}
                    onClick={() => {
                      const nextVal = !activeTx.isSharedExpense;
                      saveTransactionMeta(activeTx.id, { isSharedExpense: nextVal });
                      if (onUpdate) {
                        onUpdate({ ...activeTx, isSharedExpense: nextVal });
                      }
                      setLogoPrefTick((t) => t + 1);
                    }}
                    className={`ui-switch ${
                      activeTx.isSharedExpense ? 'ui-switch-on' : 'ui-switch-off'
                    }`}
                  >
                    <span
                      className={`ui-switch-thumb ${
                        activeTx.isSharedExpense ? 'ui-switch-thumb-on' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Sparmålskoppling om Sparande */}
              {(() => {
                const goals: SavingsGoalItem[] = getSavingsGoals();
                if (goals.length === 0 || (activeTx.category !== 'Sparande' && isIncome)) {
                  return null;
                }
                const txActId = `tx-goal-${activeTx.id}`;
                const linkedGoal = goals.find((g) =>
                  (g.activities || []).some((a) => a.id === txActId)
                );

                return (
                  <div className="ui-row flex-col items-stretch gap-2 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                        <Sparkle size={13} weight="fill" className="text-emerald-500 shrink-0" />
                        <span>
                          {linkedGoal
                            ? `Kopplad till sparmål: ${linkedGoal.name}`
                            : 'Räkna in mot sparmål'}
                        </span>
                      </span>
                      {linkedGoal && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextGoals = goals.map((item) => {
                              if (item.id !== linkedGoal.id) return item;
                              const matchedAct = (item.activities || []).find(
                                (a) => a.id === txActId
                              );
                              const delta =
                                matchedAct?.amount !== undefined
                                  ? Number(matchedAct.amount) || 0
                                  : Math.round(Math.abs(Number(activeTx.amount) || 0));
                              return {
                                ...item,
                                currentAmount: Math.max(
                                  0,
                                  (Number(item.currentAmount) || 0) - delta
                                ),
                                activities: (item.activities || []).filter(
                                  (a) => a.id !== txActId
                                ),
                              };
                            });
                            saveSavingsGoals(nextGoals);
                            setLogoPrefTick((t) => t + 1);
                          }}
                          className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer shrink-0"
                        >
                          Koppla bort
                        </button>
                      )}
                    </div>
                    {!linkedGoal && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {goals.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              const amt = Math.round(Math.abs(Number(activeTx.amount) || 0));
                              if (amt <= 0) return;
                              const nextGoals = goals.map((item) => {
                                if (item.id !== g.id) return item;
                                return {
                                  ...item,
                                  currentAmount: (Number(item.currentAmount) || 0) + amt,
                                  activities: [
                                    {
                                      id: txActId,
                                      text: `${activeTx.title} (+${formatKr(amt)})`,
                                      date:
                                        activeTx.date ||
                                        formatIsoDateStockholm(new Date()),
                                      amount: amt,
                                    },
                                    ...(item.activities || []),
                                  ],
                                };
                              });
                              saveSavingsGoals(nextGoals);
                              setLogoPrefTick((t) => t + 1);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Plus size={11} weight="bold" className="text-emerald-500" />
                            <span>{g.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Rå banktext diskret längst ner i detaljkortet */}
              {rawBankText && (
                <div className="ui-row items-start py-2.5 bg-[var(--surface-hover)]/25">
                  <span className="text-[12px] text-[var(--text-muted)] shrink-0 pt-0.5">Banktext</span>
                  <span className="text-[12px] text-right break-words max-w-[230px] sm:max-w-[265px] text-[var(--text-secondary)] font-normal leading-snug">
                    {rawBankText}
                  </span>
                </div>
              )}
            </div>

            {/* Ta bort transaktion */}
            {activeTx && onDelete && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="ui-btn-danger"
                >
                  <Trash size={14} />
                  <span>{isBankSynced ? 'Dölj / ta bort transaktion' : 'Ta bort transaktion'}</span>
                </button>

                <ConfirmDialog
                  isOpen={showDeleteConfirm}
                  title={isBankSynced ? 'Dölj transaktion?' : 'Ta bort transaktion?'}
                  description={
                    isBankSynced
                      ? `${displayName} döljs från transaktionslistan och budgeten.`
                      : `${displayName} tas bort.`
                  }
                  confirmLabel={isBankSynced ? 'Dölj' : 'Ta bort'}
                  onConfirm={handleDelete}
                  onCancel={() => setShowDeleteConfirm(false)}
                />
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
            {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
              <div className="flex items-center gap-3.5">
                <label className="flex items-center gap-3.5 cursor-text flex-1 min-w-0">
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
                      enterKeyHint="next"
                      placeholder={
                        isIncome ? 'Inkomstkälla' : isCreateMode ? 'T.ex. Ica 342' : 'Butik eller köp'
                      }
                      value={title}
                      onBlur={applyQuickEntry}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && isCreateMode) {
                          e.preventDefault();
                          applyQuickEntry();
                        }
                      }}
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
                {!isCreateMode &&
                  defaultCleanBankTitle &&
                  title.trim().toLowerCase() !== defaultCleanBankTitle.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => {
                        setTitle(defaultCleanBankTitle);
                        const inferred = inferCategoryAndMethodFromName(
                          defaultCleanBankTitle,
                          isIncome ? 'income' : 'transaction'
                        );
                        if (inferred?.category) {
                          setCategory(inferred.category);
                        }
                      }}
                      title={`Återställ ursprungsnamn (${defaultCleanBankTitle})`}
                      aria-label={`Återställ ursprungsnamn (${defaultCleanBankTitle})`}
                      className="w-8 h-8 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shrink-0"
                    >
                      <ClockCounterClockwise size={15} weight="bold" />
                    </button>
                  )}
              </div>

              {!isCreateMode && rawBankText && (
                <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-[var(--text-muted)]">
                  <span className="truncate" title={rawBankText}>
                    Banktext:{' '}
                    <span className="font-medium text-[var(--text-secondary)]">
                      {rawBankText}
                    </span>
                  </span>
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
                      Belopp
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

            {/* Samlat formulärkort för Kategori, Betalsätt, Datum, Anteckning & Kvitto */}
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
                  <PaymentMethodIcon method={paymentMethod} size={15} />
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

              {/* Kvitto */}
              {draftReceipts.length > 0 ? (
                <>
                  {draftReceipts.map((rcpt, idx) => (
                    <div key={`${rcpt.name}-${idx}`} className="ui-row">
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="ui-row-btn text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <span className="flex items-center gap-2">
                      <Plus size={13} weight="bold" className="text-emerald-500" />
                      <span>Bifoga fler kvitton</span>
                    </span>
                    <Paperclip size={13} className="text-[var(--text-muted)]" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ui-row-btn"
                >
                  <span className="ui-info-label shrink-0">Kvitto</span>
                  <span className="font-normal text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Paperclip size={13} />
                    <span>Bifoga kvitto</span>
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
          const activeSwishPhone = extractSwishPhoneNumber(
            `${activeTx.rawDescription || ''} ${activeTx.counterpartyName || ''} ${activeTx.title || ''}`
          );
          const hasDistinctChainVsStore =
            !activeSwishPhone &&
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
                <div className="text-center">
                  <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">
                    {isTitleChanged
                      ? activeSwishPhone
                        ? 'Byt namn på Swish?'
                        : isAggregatorTx
                        ? 'Ändra namn på köpet?'
                        : 'Byt namn bakåt och framåt i tiden?'
                      : 'Byt kategori bakåt och framåt i tiden?'}
                  </h3>
                </div>

                <div className="space-y-2 pt-1">
                  {isTitleChanged && activeSwishPhone ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Endast denna Swish-händelse
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('same-merchant')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer tabular-nums"
                      >
                        Alla med nummer {activeSwishPhone} ({similarInfo.transactions.length} st)
                      </button>
                    </>
                  ) : isTitleChanged && isAggregatorTx ? (
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

