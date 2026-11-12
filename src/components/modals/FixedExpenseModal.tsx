import { supabase } from '../../supabaseClient';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, CaretLeft } from '@phosphor-icons/react';
import { FixedExpenseItem, AccountItem, TransactionItem } from '../HomeTab';
import { BottomSheet } from '../ui/BottomSheet';
import { DayOfMonthPicker } from '../ui/DayOfMonthPicker';
import { getItemReceipts, ReceiptAttachment } from '../../utils/swedishDate';
import { findMatchingFixedExpense, findTransactionsForFixedExpense } from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  compressImageFileToDataUrl,
  getSavingsGoals,
} from '../../utils/appCache';
import { inferCategoryAndMethodFromName } from '../../utils/bankHistoryAnalyzer';
import { fetchLogoForName, getLearnedBrandCategory } from '../../utils/logo';
import { FixedViewDetails } from './fixed/FixedViewDetails';
import { FixedViewEdit } from './fixed/FixedViewEdit';
import { FixedViewReceiptPreview } from './fixed/FixedViewReceiptPreview';
import { FixedViewGoalPicker } from './fixed/FixedViewGoalPicker';
import { FixedViewPaymentPicker } from './fixed/FixedViewPaymentPicker';
import { FixedViewCategoryPicker } from './fixed/FixedViewCategoryPicker';
import { FixedViewCancelGuide } from './fixed/FixedViewCancelGuide';
import { FixedViewCancelPicker } from './fixed/FixedViewCancelPicker';
import { FixedViewSimilar } from './fixed/FixedViewSimilar';
import type { CancelGuideData, ModalSubView } from './fixed/shared';

interface FixedExpenseModalProps {
  isOpen: boolean;
  initialExpense?: FixedExpenseItem | null;
  fixedExpenses?: FixedExpenseItem[];
  accounts?: AccountItem[];
  transactions?: TransactionItem[];
  onClose: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: 'expense' | 'income') => void;
  onSave?: (data: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate?: (item: FixedExpenseItem) => void;
  onDelete?: (id: string) => void;
}

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  initialExpense,
  fixedExpenses = [],
  accounts = [],
  transactions = [],
  onClose,
  onSelectTransaction,
  onMarkAsFixed,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const isCreateMode = !initialExpense;

  // Retain last active item during 240ms exit animation
  const lastExpenseRef = useRef<FixedExpenseItem | null>(null);
  if (initialExpense) {
    lastExpenseRef.current = initialExpense;
  }
  const activeExpense = isCreateMode ? null : initialExpense || lastExpenseRef.current;

  const [subView, setSubView] = useState<ModalSubView>('details');
  const [pickerReturnView, setPickerReturnView] = useState<'details' | 'edit'>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [dueDay, setDueDay] = useState<number>(27);
  const [category, setCategory] = useState('Räkningar');
  const [paymentMethod, setPaymentMethod] = useState('Autogiro');
  const [linkedGoalId, setLinkedGoalId] = useState<string>('');
  const [draftReceipts, setDraftReceipts] = useState<ReceiptAttachment[]>([]);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptAttachment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [logoPrefTick, setLogoPrefTick] = useState(0);
  const [showCustomMonthPicker, setShowCustomMonthPicker] = useState(false);
  const [cancelGuide, setCancelGuide] = useState<CancelGuideData | null>(null);
  const [isLoadingCancelGuide, setIsLoadingCancelGuide] = useState(false);
  const cancelGuideCacheRef = useRef<Record<string, CancelGuideData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (
      next === 'category-picker' ||
      next === 'day-picker' ||
      next === 'payment-picker' ||
      next === 'goal-picker' ||
      next === 'receipt-preview'
    ) {
      if (subView === 'edit' || subView === 'details') {
        setPickerReturnView(subView);
      }
    }
    setNavDirection(dir);
    setSubView(next);
  };

  // Listorna ligger i localStorage – läs om dem varje gång rutan öppnas
  const availableCategories = useMemo(() => {
    void isOpen;
    return getStoredExpenseCategories().map((c) => c.name);
  }, [isOpen]);
  const availablePaymentMethods = useMemo(() => {
    void isOpen;
    const stored = getStoredPaymentMethods().map((m) => m.name);
    if (paymentMethod && !stored.includes(paymentMethod)) {
      return [...stored, paymentMethod];
    }
    return stored;
  }, [isOpen, paymentMethod]);

  const availableGoals = useMemo(() => {
    void isOpen;
    return getSavingsGoals();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialExpense) {
      setName(initialExpense.name);
      setAmount(initialExpense.amount);
      setDueDay(initialExpense.dueDay || 27);
      setCategory(normalizeCategoryToValid(initialExpense.category || 'Räkningar', 'expense'));
      setPaymentMethod(initialExpense.paymentMethod || 'Autogiro');
      setLinkedGoalId(initialExpense.linkedGoalId || '');
      setDraftReceipts(getItemReceipts(initialExpense));
      setSubView('details');
      setPickerReturnView('details');
    } else {
      setName('');
      setAmount('');
      setDueDay(27);
      setCategory('Räkningar');
      setPaymentMethod('Autogiro');
      setLinkedGoalId('');
      setDraftReceipts([]);
      setSubView('edit');
      setPickerReturnView('edit');
    }
    setPreviewReceipt(null);
    setNavDirection('forward');
    setShowDeleteConfirm(false);
    setShowFullAccount(false);
    setShowCustomMonthPicker(false);
    setCancelGuide(null);
    setIsLoadingCancelGuide(false);
  }, [initialExpense, isOpen]);

  // Senaste kategorin, utan att AI-gissningen startas om när kategorin ändras (då skulle den skriva över användarens val)
  const categoryRef = useRef(category);
  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  // Live AI-kategorisering om en tjänst/butik saknas i den lokala ordlistan
  useEffect(() => {
    if (!isOpen || subView !== 'edit') return;
    const trimmed = name.trim();
    if (trimmed.length < 3) return;
    const syncInferred = inferCategoryAndMethodFromName(trimmed, 'fixed');
    if (syncInferred?.category) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchLogoForName(trimmed, categoryRef.current).then(() => {
        if (cancelled) return;
        const aiCat = getLearnedBrandCategory(trimmed);
        if (aiCat) {
          setCategory(normalizeCategoryToValid(aiCat, 'expense'));
        }
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, isOpen, subView]);

  const handleOpenCancelGuide = async () => {
    navigateSubView('cancel-guide', 'forward');
    const targetName = (name || activeExpense?.name || '').trim();
    if (!targetName) return;

    const cacheKey = `${targetName.toLowerCase()}|${category}|${paymentMethod}`;
    if (cancelGuideCacheRef.current[cacheKey]) {
      setCancelGuide(cancelGuideCacheRef.current[cacheKey]);
      return;
    }

    setIsLoadingCancelGuide(true);
    try {
      // AI-guiden körs i Supabase (edge function find-cancellation-url, Gemini)
      const { data, error } = await supabase.functions.invoke('find-cancellation-url', {
        body: { name: targetName, category, language: 'sv' },
      });
      if (!error && data && typeof data.cancelUrl === 'string') {
        let host = '';
        try {
          host = new URL(data.cancelUrl).hostname.replace(/^www\./, '');
        } catch {
          host = '';
        }
        const guide: CancelGuideData = {
          serviceName: data.serviceName || targetName,
          noticePeriod: data.noticePeriod || '',
          steps: Array.isArray(data.steps) ? data.steps.slice(0, 6) : [],
          cancelUrl: data.cancelUrl,
          cancelUrlLabel: host ? `Öppna ${host}` : 'Öppna sidan för uppsägning',
          tip: data.tips || undefined,
        };
        cancelGuideCacheRef.current[cacheKey] = guide;
        setCancelGuide(guide);
      }
    } catch {
      // Fallback handled below if null
    } finally {
      setIsLoadingCancelGuide(false);
    }
  };

  const resolvedAccountInfo = useMemo(() => {
    const matchedTx = activeExpense
      ? transactions.find(
          (tx) => tx.type !== 'income' && Boolean(findMatchingFixedExpense(tx, [activeExpense]))
        )
      : undefined;
    const raw = activeExpense?.bankAccountName || matchedTx?.bankAccountName || '';
    const checking =
      accounts.find(
        (a) =>
          raw &&
          (raw.toLowerCase().includes(a.name.toLowerCase()) ||
            raw.toLowerCase().includes(a.bankName.toLowerCase()))
      ) ||
      accounts.find((a) => a.type === 'checking') ||
      accounts[0];

    if (!raw && !checking) return null;

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
  }, [activeExpense, transactions, accounts]);

  const similarInfo = useMemo(
    () => findTransactionsForFixedExpense(activeExpense, transactions),
    [activeExpense, transactions]
  );

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const commitInlineChanges = (overrides?: Partial<FixedExpenseItem>) => {
    if (isCreateMode || !onUpdate || !activeExpense) return;
    const nextName = (overrides?.name !== undefined ? overrides.name : name).trim() || activeExpense.name;
    const nextAmt = Math.max(
      1,
      Math.round(Number(overrides?.amount !== undefined ? overrides.amount : amount) || activeExpense.amount)
    );
    const nextDueDay = overrides?.dueDay !== undefined ? overrides.dueDay : Number(dueDay);
    const nextCategory = overrides?.category !== undefined ? overrides.category : category;
    const nextPaymentMethod =
      overrides?.paymentMethod !== undefined ? overrides.paymentMethod : paymentMethod;
    const nextLinkedGoalId =
      overrides?.linkedGoalId !== undefined ? overrides.linkedGoalId : linkedGoalId;
    const nextReceipts = overrides?.receipts !== undefined ? overrides.receipts : draftReceipts;

    const nextIsCancelled =
      overrides?.isCancelled !== undefined ? overrides.isCancelled : activeExpense.isCancelled;
    const nextHasNoMorePayments =
      overrides?.hasNoMorePayments !== undefined
        ? overrides.hasNoMorePayments
        : activeExpense.hasNoMorePayments;
    const nextLastPaymentDate =
      'lastPaymentDate' in (overrides || {})
        ? overrides?.lastPaymentDate
        : activeExpense.lastPaymentDate;

    onUpdate({
      ...activeExpense,
      name: nextName,
      amount: nextAmt,
      isShared: Boolean(activeExpense.isShared),
      dueDay: nextDueDay,
      category: nextCategory,
      paymentMethod: nextPaymentMethod,
      linkedGoalId: nextLinkedGoalId || undefined,
      receipts: nextReceipts && nextReceipts.length > 0 ? nextReceipts : undefined,
      receiptUrl: nextReceipts && nextReceipts.length > 0 ? nextReceipts[0].url : undefined,
      receiptName: nextReceipts && nextReceipts.length > 0 ? nextReceipts[0].name : undefined,
      isCancelled: nextIsCancelled,
      hasNoMorePayments: nextHasNoMorePayments,
      lastPaymentDate: nextLastPaymentDate,
    });
  };

  const handleCreateSave = () => {
    const cleanName = name.trim();
    const cleanAmt = Math.max(1, Math.round(Number(amount) || 0));
    if (!cleanName || cleanAmt <= 0) return;
    if (onSave) {
      onSave({
        name: cleanName,
        amount: cleanAmt,
        isShared: false,
        dueDay: Number(dueDay) || 27,
        category: category || 'Räkningar',
        paymentMethod: paymentMethod || 'Autogiro',
        linkedGoalId: linkedGoalId || undefined,
        receipts: draftReceipts.length > 0 ? draftReceipts : undefined,
        receiptUrl: draftReceipts.length > 0 ? draftReceipts[0].url : undefined,
        receiptName: draftReceipts.length > 0 ? draftReceipts[0].name : undefined,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && activeExpense) {
      onDelete(activeExpense.id);
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
      if (!isCreateMode && onUpdate && activeExpense) {
        onUpdate({
          ...activeExpense,
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
    if (!isCreateMode && onUpdate && activeExpense) {
      onUpdate({
        ...activeExpense,
        receipts: nextReceipts.length > 0 ? nextReceipts : undefined,
        receiptUrl: nextReceipts[0]?.url,
        receiptName: nextReceipts[0]?.name,
      });
    }
  };

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  const displayName = name || activeExpense?.name || 'Ny fast utgift';

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
      <FixedViewSimilar
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        onClose={onClose}
        similarInfo={similarInfo}
        formatKr={formatKr}
        fixedExpenses={fixedExpenses}
        activeExpense={activeExpense}
        onSelectTransaction={onSelectTransaction}
        onMarkAsFixed={onMarkAsFixed}
        displayName={displayName}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 1A: UPPSAGD — ENKLA SCENARION (1 TRYCK)               */}
      {/* ============================================================== */}
      <FixedViewCancelPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        displayName={displayName}
        onClose={onClose}
        activeExpense={activeExpense}
        commitInlineChanges={commitInlineChanges}
        setShowCustomMonthPicker={setShowCustomMonthPicker}
        showCustomMonthPicker={showCustomMonthPicker}
        handleOpenCancelGuide={handleOpenCancelGuide}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 1B: SÄG UPP ABONNEMANG (AI-GUIDE & DIREKTLÄNK)        */}
      {/* ============================================================== */}
      <FixedViewCancelGuide
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        displayName={displayName}
        onClose={onClose}
        category={category}
        activeExpense={activeExpense}
        formatKr={formatKr}
        amount={amount}
        paymentMethod={paymentMethod}
        isLoadingCancelGuide={isLoadingCancelGuide}
        cancelGuide={cancelGuide}
        onDelete={onDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showDeleteConfirm={showDeleteConfirm}
        handleDelete={handleDelete}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 2: KATEGORIVÄLJARE                                    */}
      {/* ============================================================== */}
      <FixedViewCategoryPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        availableCategories={availableCategories}
        category={category}
        setCategory={setCategory}
        commitInlineChanges={commitInlineChanges}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 3: DRAGNINGSDAG-VÄLJARE (Ersätter native <select>)    */}
      {/* ============================================================== */}
      {subView === 'day-picker' && (
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
              Välj dragningsdag
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <DayOfMonthPicker
            selectedDay={Number(dueDay) || 28}
            onSelectDay={(d) => {
              setDueDay(d);
              if (pickerReturnView === 'details') {
                commitInlineChanges({ dueDay: d });
              }
              navigateSubView(pickerReturnView, 'back');
            }}
            mode="dueday"
            title={`Dragningsdag för ${displayName}`}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 4: BETALSÄTTSVÄLJARE (Ersätter native <select>)       */}
      {/* ============================================================== */}
      <FixedViewPaymentPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        availablePaymentMethods={availablePaymentMethods}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        commitInlineChanges={commitInlineChanges}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 5: SPARMÅLSVÄLJARE                                    */}
      {/* ============================================================== */}
      <FixedViewGoalPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        setLinkedGoalId={setLinkedGoalId}
        commitInlineChanges={commitInlineChanges}
        linkedGoalId={linkedGoalId}
        availableGoals={availableGoals}
        formatKr={formatKr}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 6: INBYGGD KVITTO-VISNING                             */}
      {/* ============================================================== */}
      <FixedViewReceiptPreview
        subView={subView}
        previewReceipt={previewReceipt}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        displayName={displayName}
        fileInputRef={fileInputRef}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 7: REDIGERA FAST UTGIFT                               */}
      {/* ============================================================== */}
      <FixedViewEdit
        subView={subView}
        slideAnimClass={slideAnimClass}
        isCreateMode={isCreateMode}
        onClose={onClose}
        activeExpense={activeExpense}
        setName={setName}
        setAmount={setAmount}
        setDueDay={setDueDay}
        setCategory={setCategory}
        setPaymentMethod={setPaymentMethod}
        setDraftReceipts={setDraftReceipts}
        navigateSubView={navigateSubView}
        name={name}
        category={category}
        amount={amount}
        dueDay={dueDay}
        paymentMethod={paymentMethod}
        availableGoals={availableGoals}
        linkedGoalId={linkedGoalId}
        draftReceipts={draftReceipts}
        fileInputRef={fileInputRef}
        setPreviewReceipt={setPreviewReceipt}
        handleRemoveReceiptAt={handleRemoveReceiptAt}
        handleCreateSave={handleCreateSave}
        commitInlineChanges={commitInlineChanges}
        onDelete={onDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showDeleteConfirm={showDeleteConfirm}
        displayName={displayName}
        handleDelete={handleDelete}
      />

      {/* ============================================================== */}
      {/* HUVUDVY: REN FÖRHANDSGRANSKNING                                */}
      {/* ============================================================== */}
      <FixedViewDetails
        subView={subView}
        isCreateMode={isCreateMode}
        navDirection={navDirection}
        onClose={onClose}
        logoPrefTick={logoPrefTick}
        category={category}
        displayName={displayName}
        setLogoPrefTick={setLogoPrefTick}
        activeExpense={activeExpense}
        name={name}
        amount={amount}
        navigateSubView={navigateSubView}
        dueDay={dueDay}
        draftReceipts={draftReceipts}
        setPreviewReceipt={setPreviewReceipt}
        fileInputRef={fileInputRef}
        similarInfo={similarInfo}
        paymentMethod={paymentMethod}
        availableGoals={availableGoals}
        linkedGoalId={linkedGoalId}
        resolvedAccountInfo={resolvedAccountInfo}
        showFullAccount={showFullAccount}
        setShowFullAccount={setShowFullAccount}
        handleRemoveReceiptAt={handleRemoveReceiptAt}
        onDelete={onDelete}
        setShowDeleteConfirm={setShowDeleteConfirm}
        showDeleteConfirm={showDeleteConfirm}
        handleDelete={handleDelete}
      />
    </BottomSheet>
  );
};
