import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BankTransactionItem } from '../../services/bankService';
import { BottomSheet } from '../ui/BottomSheet';
import {
  TransactionItem,
  getTransactionTime,
  FixedExpenseItem,
  IncomeItem,
  AccountItem,
} from '../HomeTab';
import { getItemReceipts, ReceiptAttachment } from '../../utils/swedishDate';
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
  getTransactionMetaMap,
  saveSwishPhoneDirectoryEntry,
  removeSwishPhoneDirectoryEntry,
} from '../../utils/appCache';
import { formatIsoDateStockholm } from '../../utils/swedishDate';

import {
  inferCategoryAndMethodFromName,
  categorizeBankTransactionForApp,
  cleanDisplayMerchantName,
  formatSwishTitle,
  extractSwishPhoneNumber,
  isLikelySwishTransactionText,
} from '../../utils/bankHistoryAnalyzer';
import { fetchLogoForName, getLearnedBrandCategory } from '../../utils/logo';
import { TxViewEdit } from './transaction/TxViewEdit';
import { TxViewDetails } from './transaction/TxViewDetails';
import { TxViewSwish } from './transaction/TxViewSwish';
import { TxViewLinkFixedPicker } from './transaction/TxViewLinkFixedPicker';
import { TxViewReceiptPreview } from './transaction/TxViewReceiptPreview';
import { TxViewDatePicker } from './transaction/TxViewDatePicker';
import { TxViewPaymentPicker } from './transaction/TxViewPaymentPicker';
import { TxViewCategoryPicker } from './transaction/TxViewCategoryPicker';
import { TxViewSimilar } from './transaction/TxViewSimilar';
import { getDefaultPaymentMethodForTx, ModalSubView } from './transaction/shared';

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
  /** Förifyllt nytt köp (t.ex. från röstinmatning "Ica 143 kr") */
  prefill?: { title: string; amount?: number } | null;
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
  prefill = null,
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

  // Listorna ligger i localStorage – läs om dem varje gång rutan öppnas
  const availableCategories = useMemo(() => {
    void isOpen;
    const list = isIncome ? getStoredIncomeCategories() : getStoredExpenseCategories();
    return list.map((c) => c.name);
  }, [isOpen, isIncome]);

  const availablePaymentMethods = useMemo(() => {
    void isOpen;
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
      setTitle(prefill?.title || '');
      setAmount(prefill?.amount ? String(prefill.amount) : '');
      setDate(todayIso);
      setPickerYearMonth({
        year: parseInt(todayIso.slice(0, 4), 10),
        month: parseInt(todayIso.slice(5, 7), 10) - 1,
      });
      const prefillInferred = prefill?.title
        ? inferCategoryAndMethodFromName(prefill.title, 'transaction')
        : null;
      setPaymentMethod(prefillInferred?.paymentMethod || 'Kort');
      setNote('');
      setCategory(prefillInferred?.category || 'Mat & dryck');
      setDraftReceipts([]);
      setPreviewReceipt(null);
      setSubView('edit');
      setPickerReturnView('edit');
      setNavDirection('forward');
      setShowDeleteConfirm(false);
      setShowSimilarPopup(false);
    }
  }, [initialTransaction, isOpen, prefill]);

  // Senaste kategorin, utan att AI-gissningen startas om när kategorin ändras (då skulle den skriva över användarens val)
  const categoryRef = useRef(category);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

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
      fetchLogoForName(trimmed, categoryRef.current).then(() => {
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
      } as BankTransactionItem,
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

  // Avbryt redigering: släng osparade ändringar och visa köpet som det var
  const handleCancelEdit = () => {
    if (activeTx) {
      setTitle(activeTx.title || '');
      setAmount(activeTx.amount);
      setDate(activeTx.date || '');
      setCategory(
        normalizeCategoryToValid(activeTx.category || (isIncome ? 'Lön' : 'Övrigt'), isIncome ? 'income' : 'expense')
      );
      setPaymentMethod(getDefaultPaymentMethodForTx(activeTx));
    }
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
      <TxViewSimilar
        subView={subView}
        activeTx={activeTx}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        onClose={onClose}
        similarInfo={similarInfo}
        formatKr={formatKr}
        onSelectTransaction={onSelectTransaction}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 2: KATEGORIVÄLJARE                                    */}
      {/* ============================================================== */}
      <TxViewCategoryPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        availableCategories={availableCategories}
        category={category}
        setCategory={setCategory}
        activeTx={activeTx}
        onUpdate={onUpdate}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 3: BETALSÄTTSVÄLJARE                                  */}
      {/* ============================================================== */}
      <TxViewPaymentPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        availablePaymentMethods={availablePaymentMethods}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        activeTx={activeTx}
        onUpdate={onUpdate}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 3.5: EGEN MODERN DATUMVÄLJARE                         */}
      {/* ============================================================== */}
      <TxViewDatePicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        pickerYearMonth={pickerYearMonth}
        date={date}
        setDate={setDate}
        activeTx={activeTx}
        onUpdate={onUpdate}
        setPickerYearMonth={setPickerYearMonth}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 5: INBYGGD KVITTO-VISNING (Fungerar i iOS & PWA)      */}
      {/* ============================================================== */}
      <TxViewReceiptPreview
        subView={subView}
        previewReceipt={previewReceipt}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        activeTx={activeTx}
        fileInputRef={fileInputRef}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 6: KOPPLA TILL BEFINTLIG FAST UTGIFT / INKOMST        */}
      {/* ============================================================== */}
      <TxViewLinkFixedPicker
        subView={subView}
        activeTx={activeTx}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        isIncome={isIncome}
        onClose={onClose}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        recurringStatus={recurringStatus}
        onLinkToFixed={onLinkToFixed}
        formatKr={formatKr}
        onMarkAsFixed={onMarkAsFixed}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 7: DELA UTLÄGG                                        */}
      {/* ============================================================== */}
      <TxViewSwish
        subView={subView}
        activeTx={activeTx}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        onClose={onClose}
        swishSplitMode={swishSplitMode}
        swishCustomShare={swishCustomShare}
        formatKr={formatKr}
        setSwishSplitMode={setSwishSplitMode}
        setSwishCustomShare={setSwishCustomShare}
        onUpdate={onUpdate}
      />

      {/* ============================================================== */}
      {/* HUVUDVY 1: FÖRHANDSGRANSKNING (Ren läsvy utan redigeringsfält) */}
      {/* ============================================================== */}
      <TxViewDetails
        subView={subView}
        isCreateMode={isCreateMode}
        activeTx={activeTx}
        navDirection={navDirection}
        onToggleHeart={onToggleHeart}
        isIncome={isIncome}
        onTogglePackage={onTogglePackage}
        onClose={onClose}
        logoPrefTick={logoPrefTick}
        category={category}
        title={title}
        setLogoPrefTick={setLogoPrefTick}
        recurringStatus={recurringStatus}
        onUpdate={onUpdate}
        isBankSynced={isBankSynced}
        formatKr={formatKr}
        amount={amount}
        txTime={txTime}
        navigateSubView={navigateSubView}
        date={date}
        draftReceipts={draftReceipts}
        setPreviewReceipt={setPreviewReceipt}
        fileInputRef={fileInputRef}
        onLinkToFixed={onLinkToFixed}
        onMarkAsFixed={onMarkAsFixed}
        incomes={incomes}
        fixedExpenses={fixedExpenses}
        similarInfo={similarInfo}
        paymentMethod={paymentMethod}
        resolvedAccountInfo={resolvedAccountInfo}
        showFullAccount={showFullAccount}
        setShowFullAccount={setShowFullAccount}
        handleRemoveReceiptAt={handleRemoveReceiptAt}
        note={note}
        setNote={setNote}
        onExclude={onExclude}
        isExcluded={isExcluded}
        rawBankText={rawBankText}
        onDelete={onDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showDeleteConfirm={showDeleteConfirm}
        displayName={displayName}
        handleDelete={handleDelete}
      />

      {/* ============================================================== */}
      {/* HUVUDVY 2: REDIGERA-VY / SKAPA NY HÄNDELSE                     */}
      {/* ============================================================== */}
      <TxViewEdit
        subView={subView}
        slideAnimClass={slideAnimClass}
        isCreateMode={isCreateMode}
        navigateSubView={navigateSubView}
        onClose={onClose}
        setTxType={setTxType}
        setCategory={setCategory}
        txType={txType}
        title={title}
        activeTx={activeTx}
        isIncome={isIncome}
        category={category}
        recurringStatus={recurringStatus}
        setTitle={setTitle}
        setPaymentMethod={setPaymentMethod}
        defaultCleanBankTitle={defaultCleanBankTitle}
        rawBankText={rawBankText}
        isBankSynced={isBankSynced}
        amount={amount}
        setAmount={setAmount}
        formatKr={formatKr}
        paymentMethod={paymentMethod}
        date={date}
        setPickerYearMonth={setPickerYearMonth}
        note={note}
        setNote={setNote}
        draftReceipts={draftReceipts}
        setPreviewReceipt={setPreviewReceipt}
        handleRemoveReceiptAt={handleRemoveReceiptAt}
        fileInputRef={fileInputRef}
        handleCreateSave={handleCreateSave}
        handleSaveEditClick={handleSaveEditClick}
        handleCancelEdit={handleCancelEdit}
        onDelete={onDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showDeleteConfirm={showDeleteConfirm}
        handleDelete={handleDelete}
      />

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
                        : 'Ändra namnet på fler köp?'
                      : 'Ändra kategorin på fler köp?'}
                  </h3>
                  {!activeSwishPhone && !(isTitleChanged && isAggregatorTx) && (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Välj du flera gäller det även nya köp som kommer in.
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  {isTitleChanged && activeSwishPhone ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Bara den här Swishen
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
                        className="w-full py-2.5 px-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Bara det här köpet (rekommenderas)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('chain')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Alla liknande köp ({similarInfo.transactions.length} st)
                      </button>
                    </>
                  ) : hasDistinctChainVsStore ? (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('same-merchant')}
                        className="w-full py-2.5 px-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Alla från {bankOriginLabel} ({similarInfo.sameMerchantTransactions.length} st)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('chain')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Hela {similarInfo.brandLabel}-kedjan ({similarInfo.transactions.length} st)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Bara det här köpet
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => commitEditChanges('chain')}
                        className="w-full py-2.5 px-4 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] text-xs font-semibold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Alla liknande köp ({similarInfo.transactions.length} st)
                      </button>

                      <button
                        type="button"
                        onClick={() => commitEditChanges('single')}
                        className="w-full py-2.5 px-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Bara det här köpet
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

