import React, { useMemo, useRef } from 'react';
import { BottomSheet } from '../ui/BottomSheet';
import {
  TransactionItem,
  getTransactionTime,
  FixedExpenseItem,
  IncomeItem,
  AccountItem,
} from '../HomeTab';
import {
  checkIsRecurringTransaction,
  findSimilarTransactionsForTransaction,
} from '../../utils/recurring';
import { TxViewEdit } from './transaction/TxViewEdit';
import { TxViewDetails } from './transaction/TxViewDetails';
import { TxViewSwish } from './transaction/TxViewSwish';
import { TxViewLinkFixedPicker } from './transaction/TxViewLinkFixedPicker';
import { TxViewReceiptPreview } from './transaction/TxViewReceiptPreview';
import { TxViewDatePicker } from './transaction/TxViewDatePicker';
import { TxViewPaymentPicker } from './transaction/TxViewPaymentPicker';
import { TxViewCategoryPicker } from './transaction/TxViewCategoryPicker';
import { TxViewSimilar } from './transaction/TxViewSimilar';
import { TxRenameScopeDialog } from './transaction/TxRenameScopeDialog';
import {
  useTransactionForm,
  TransactionPrefill,
  TransactionUpdateHandler,
} from './transaction/useTransactionForm';
import {
  resolveTxAccountInfo,
  isTxBankSynced,
  getRawBankText,
  getDefaultCleanBankTitle,
  isAggregatorTransaction,
} from './transaction/txDerived';

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
  onUpdate?: TransactionUpdateHandler;
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
  prefill?: TransactionPrefill;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const resolvedAccountInfo = useMemo(
    () => resolveTxAccountInfo(activeTx, accounts),
    [activeTx, accounts]
  );

  const isBankSynced = isTxBankSynced(activeTx);
  const rawBankText = getRawBankText(activeTx);
  const defaultCleanBankTitle = getDefaultCleanBankTitle(activeTx);

  const {
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
    showFullAccount,
    setShowFullAccount,
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
  } = useTransactionForm({
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
  });

  if (!activeTx && !isCreateMode) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const txTime = activeTx ? getTransactionTime(activeTx) : '';
  const isExcluded = Boolean(activeTx?.isExcluded);
  const recurringStatus = activeTx
    ? checkIsRecurringTransaction(activeTx, fixedExpenses, incomes)
    : { isRecurring: false };

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
      {showSimilarPopup && activeTx && typeof document !== 'undefined' && (
        <TxRenameScopeDialog
          activeTx={activeTx}
          title={title}
          defaultCleanBankTitle={defaultCleanBankTitle}
          isAggregatorTx={isAggregatorTransaction(activeTx)}
          similarInfo={similarInfo}
          onCommit={commitEditChanges}
          onDismiss={() => setShowSimilarPopup(false)}
        />
      )}
    </BottomSheet>
  );
};
