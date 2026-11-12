// Formulärets state för köpfönstret: återställning vid öppning, AI-kategori och spara/avbryt/radera.
import React, { useState, useEffect, useRef } from 'react';
import type { TransactionItem } from '../../../app/models';
import type { SimilarTransactionsSummary } from '../../../utils/recurring/similarTransactions';
import {
  getItemReceipts,
  formatIsoDateStockholm,
  ReceiptAttachment,
} from '../../../utils/swedishDate';
import { getStoredExpenseCategories, getStoredIncomeCategories, getStoredPaymentMethods, normalizeCategoryToValid } from '../../../utils/cache/categories';
import { compressReceiptFiles } from '../../../utils/cache/merchants';
import { saveSwishPhoneDirectoryEntry, removeSwishPhoneDirectoryEntry } from '../../../utils/cache/swishDirectory';
import { inferCategoryAndMethodFromName } from '../../../utils/bankAnalysis/existingBudget/manualCategory';
import { extractSwishPhoneNumber } from '../../../utils/bankAnalysis/merchantRules';
import { fetchLogoForName, getLearnedBrandCategory } from '../../../utils/logo';
import { getDefaultPaymentMethodForTx, ModalSubView } from './shared';
import { useExternalSnapshot } from '../../../utils/hooks/useExternalSnapshot';

/** Hur långt ett namnbyte/kategoribyte ska gälla */
export type TxRenameScope = 'single' | 'same-merchant' | 'chain';

/** Förifyllt nytt köp (t.ex. från röstinmatning "Ica 143 kr") */
export type TransactionPrefill = { title: string; amount?: number } | null;

export type TransactionUpdateHandler = (
  tx: TransactionItem,
  applyToSimilarIds?: string[],
  options?: {
    renameScope?: TxRenameScope;
    renameTargetIds?: string[];
    categoryTargetIds?: string[];
  }
) => void;

interface UseTransactionFormArgs {
  isOpen: boolean;
  initialTransaction: TransactionItem | null | undefined;
  prefill: TransactionPrefill;
  activeTx: TransactionItem | null;
  isCreateMode: boolean;
  isBankSynced: boolean;
  defaultCleanBankTitle: string;
  similarInfo: SimilarTransactionsSummary;
  onClose: () => void;
  onSave?: (data: Omit<TransactionItem, 'id'>) => void;
  onUpdate?: TransactionUpdateHandler;
  onDelete?: (id: string) => void;
}

/**
 * Dagens datum (Stockholm) som ÅÅÅÅ-MM-DD. Läses bara när formuläret
 * återställs för ett nytt köp – resultatet sparas i state, så renderingen
 * blir densamma även om komponenten renderas om.
 */
function getTodayIsoStockholm(): string {
  return formatIsoDateStockholm(new Date());
}

export function useTransactionForm({
  isOpen,
  initialTransaction,
  prefill,
  activeTx,
  isCreateMode,
  isBankSynced,
  defaultCleanBankTitle,
  similarInfo,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}: UseTransactionFormArgs) {
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

  const [pickerYearMonth, setPickerYearMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
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
  const availableCategories = useExternalSnapshot(
    () => (isIncome ? getStoredIncomeCategories() : getStoredExpenseCategories()).map((c) => c.name),
    [isOpen, isIncome]
  );

  const storedPaymentMethods = useExternalSnapshot(
    () => getStoredPaymentMethods().map((m) => m.name),
    [isOpen]
  );
  const availablePaymentMethods =
    paymentMethod && !storedPaymentMethods.includes(paymentMethod)
      ? [...storedPaymentMethods, paymentMethod]
      : storedPaymentMethods;

  // Fyll i/återställ formuläret när rutan öppnas, ett annat köp väljs eller
  // förifyllningen byts. Görs under render ("adjust state when a prop changes")
  // i stället för i en effekt. Jämför samma värden som den gamla effekten
  // (isOpen + objektreferenserna), och null som startvärde gör att
  // återställningen även sker vid första renderingen.
  const [prevResetDeps, setPrevResetDeps] = useState<{
    isOpen: boolean;
    initialTransaction: TransactionItem | null | undefined;
    prefill: TransactionPrefill;
  } | null>(null);
  if (
    prevResetDeps === null ||
    prevResetDeps.isOpen !== isOpen ||
    prevResetDeps.initialTransaction !== initialTransaction ||
    prevResetDeps.prefill !== prefill
  ) {
    setPrevResetDeps({ isOpen, initialTransaction, prefill });
    if (isOpen) {
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
      } else {
        const todayIso = getTodayIsoStockholm();
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
    }
  }

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

  const commitEditChanges = (applyScope: TxRenameScope) => {
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
    const uploaded = await compressReceiptFiles(files);
    if (uploaded) {
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

  return {
    subView,
    pickerReturnView,
    navDirection,
    navigateSubView,
    txType,
    setTxType,
    title,
    setTitle,
    amount,
    setAmount,
    date,
    setDate,
    paymentMethod,
    setPaymentMethod,
    note,
    setNote,
    category,
    setCategory,
    draftReceipts,
    previewReceipt,
    setPreviewReceipt,
    showDeleteConfirm,
    setShowDeleteConfirm,
    showSimilarPopup,
    setShowSimilarPopup,
    pickerYearMonth,
    setPickerYearMonth,
    logoPrefTick,
    setLogoPrefTick,
    swishSplitMode,
    setSwishSplitMode,
    swishCustomShare,
    setSwishCustomShare,
    isIncome,
    availableCategories,
    availablePaymentMethods,
    commitEditChanges,
    handleCancelEdit,
    handleSaveEditClick,
    handleCreateSave,
    handleDelete,
    handleReceiptUpload,
    handleRemoveReceiptAt,
  };
}
