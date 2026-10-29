import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  CaretRight,
  CaretLeft,
  Paperclip,
  FileText,
  ClockCounterClockwise,
  Users,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { FixedExpenseItem, AccountItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DayOfMonthPicker } from '../ui/DayOfMonthPicker';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import {
  findMatchingFixedExpense,
  findTransactionsForFixedExpense,
  findAllMatchingFixedExpensesByMerchant,
  isFixedExpenseAmountMatch,
} from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  compressImageFileToDataUrl,
} from '../../utils/appCache';
import { inferCategoryAndMethodFromName } from '../../utils/bankHistoryAnalyzer';

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

type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'day-picker'
  | 'payment-picker'
  | 'share-picker'
  | 'receipt-preview'
  | 'similar';

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
  const [isShared, setIsShared] = useState<boolean>(false);
  const [fullAmount, setFullAmount] = useState<number | string>('');
  const [dueDay, setDueDay] = useState<number>(27);
  const [category, setCategory] = useState('Räkningar');
  const [paymentMethod, setPaymentMethod] = useState('Autogiro');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (
      next === 'category-picker' ||
      next === 'day-picker' ||
      next === 'payment-picker' ||
      next === 'share-picker'
    ) {
      if (subView === 'edit' || subView === 'details') {
        setPickerReturnView(subView);
      }
    }
    setNavDirection(dir);
    setSubView(next);
  };

  const availableCategories = useMemo(
    () => getStoredExpenseCategories().map((c) => c.name),
    [isOpen]
  );
  const availablePaymentMethods = useMemo(() => {
    const stored = getStoredPaymentMethods().map((m) => m.name);
    if (paymentMethod && !stored.includes(paymentMethod)) {
      return [...stored, paymentMethod];
    }
    return stored;
  }, [isOpen, paymentMethod]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialExpense) {
      setName(initialExpense.name);
      setAmount(initialExpense.amount);
      setIsShared(Boolean(initialExpense.isShared));
      setFullAmount(
        initialExpense.fullAmount && initialExpense.fullAmount > initialExpense.amount
          ? initialExpense.fullAmount
          : initialExpense.amount * 2
      );
      setDueDay(initialExpense.dueDay || 27);
      setCategory(normalizeCategoryToValid(initialExpense.category || 'Räkningar', 'expense'));
      setPaymentMethod(initialExpense.paymentMethod || 'Autogiro');
      setSubView('details');
      setPickerReturnView('details');
    } else {
      setName('');
      setAmount('');
      setIsShared(false);
      setFullAmount('');
      setDueDay(27);
      setCategory('Räkningar');
      setPaymentMethod('Autogiro');
      setSubView('edit');
      setPickerReturnView('edit');
    }
    setNavDirection('forward');
    setShowDeleteConfirm(false);
    setShowFullAccount(false);
  }, [initialExpense, isOpen]);

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
    const nextIsShared = overrides?.isShared !== undefined ? overrides.isShared : isShared;
    const nextFullAmount = nextIsShared
      ? Math.max(
          nextAmt,
          Math.round(
            Number(
              overrides?.fullAmount !== undefined ? overrides.fullAmount : fullAmount
            ) || nextAmt * 2
          )
        )
      : undefined;
    const nextDueDay = overrides?.dueDay !== undefined ? overrides.dueDay : Number(dueDay);
    const nextCategory = overrides?.category !== undefined ? overrides.category : category;
    const nextPaymentMethod =
      overrides?.paymentMethod !== undefined ? overrides.paymentMethod : paymentMethod;

    onUpdate({
      ...activeExpense,
      name: nextName,
      amount: nextAmt,
      isShared: nextIsShared,
      fullAmount: nextFullAmount,
      dueDay: nextDueDay,
      category: nextCategory,
      paymentMethod: nextPaymentMethod,
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
        isShared: isShared || undefined,
        fullAmount: isShared
          ? Math.max(cleanAmt, Math.round(Number(fullAmount) || cleanAmt * 2))
          : undefined,
        dueDay: Number(dueDay) || 27,
        category: category || 'Räkningar',
        paymentMethod: paymentMethod || 'Autogiro',
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
    const file = e.target.files?.[0];
    if (!file || !onUpdate || !activeExpense) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.74);
      onUpdate({
        ...activeExpense,
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

  const displayName = name || activeExpense?.name || 'Ny fast utgift';

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
      {subView === 'similar' && (
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

          {/* Compact Merchant Summary Bar */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ItemLogo
                name={displayName}
                category={category}
                logoUrl={activeExpense?.logo}
                size="sm"
                isRecurring={true}
              />
              <span className="font-medium text-[13px] text-[var(--text-primary)] truncate">
                {displayName}
              </span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] tabular-nums shrink-0">
              {similarInfo.transactions.length} st · {formatKr(similarInfo.totalAmount)}
            </span>
          </div>

          {similarInfo.transactions.length > 0 ? (
            <div className="ui-sheet-group">
              {similarInfo.transactions.map((tx) => {
                const allSameMerchantFixed = findAllMatchingFixedExpensesByMerchant(
                  tx,
                  fixedExpenses.length > 0
                    ? fixedExpenses
                    : activeExpense
                    ? [activeExpense]
                    : []
                );
                const hasAmountMatch = allSameMerchantFixed.some((exp) =>
                  isFixedExpenseAmountMatch(exp, tx.amount)
                );

                return (
                  <div
                    key={tx.id}
                    className="px-4 py-3 sm:py-3.5 flex items-center justify-between gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTransaction) {
                          onSelectTransaction(tx);
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      <ItemLogo
                        name={tx.title}
                        category={tx.category}
                        logoUrl={tx.logo}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title block truncate">
                          {tx.title}
                        </span>
                        <span className="ui-row-subtitle tabular-nums">
                          {formatSwedishDateHeading(tx.date)}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {!hasAmountMatch && onMarkAsFixed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsFixed(tx, 'expense');
                          }}
                          title="Lägg till detta belopp som egen fast utgift"
                          className="px-2 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowsClockwise size={11} weight="bold" />
                          <span>+ Fast</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectTransaction) {
                            onSelectTransaction(tx);
                          }
                        }}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <div className="text-right">
                          <span className="ui-row-amount">
                            -{formatKr(tx.amount)}
                          </span>
                          <span className="ui-row-meta">
                            {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                              ? 'Reserverat'
                              : getTransactionTime(tx)}
                          </span>
                        </div>
                        <CaretRight size={12} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ui-sheet-box text-center text-xs text-[var(--text-muted)] py-6">
              Inga registrerade banktransaktioner matchar {displayName} ännu.
            </div>
          )}
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
                    if (pickerReturnView === 'details') {
                      commitInlineChanges({ category: c });
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
                    if (pickerReturnView === 'details') {
                      commitInlineChanges({ paymentMethod: m });
                    }
                    navigateSubView(pickerReturnView, 'back');
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
      {/* SUB-VIEW 5: DELAD FAST UTGIFT / SAMBOLÄGE                      */}
      {/* ============================================================== */}
      {subView === 'share-picker' && (
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
              Dela fast utgift
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="ui-sheet-box space-y-4 text-xs">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-[var(--text-primary)] block">
                  Delas med partner / hushåll
                </span>
                <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                  Räknar endast din andel i budgeten
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isShared}
                onClick={() => {
                  const nextShared = !isShared;
                  setIsShared(nextShared);
                  const currentAmt = Math.max(1, Math.round(Number(amount) || 0));
                  const currentFull = Math.max(
                    currentAmt,
                    Math.round(Number(fullAmount) || currentAmt * 2)
                  );
                  if (nextShared) {
                    const half = Math.max(1, Math.round(currentAmt / 2));
                    setFullAmount(currentAmt);
                    setAmount(half);
                    if (pickerReturnView === 'details') {
                      commitInlineChanges({
                        isShared: true,
                        fullAmount: currentAmt,
                        amount: half,
                      });
                    }
                  } else {
                    setAmount(currentFull);
                    setFullAmount('');
                    if (pickerReturnView === 'details') {
                      commitInlineChanges({
                        isShared: false,
                        fullAmount: undefined,
                        amount: currentFull,
                      });
                    }
                  }
                }}
                className={`ui-switch ${isShared ? 'ui-switch-on' : 'ui-switch-off'}`}
              >
                <span className={`ui-switch-thumb ${isShared ? 'ui-switch-thumb-on' : ''}`} />
              </button>
            </div>

            {isShared && (
              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="p-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] block">
                    <span className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Total räkning (dras på bank)
                    </span>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={fullAmount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, '');
                          setFullAmount(v);
                        }}
                        className="w-full bg-transparent border-0 p-0 font-display font-bold text-base text-[var(--text-primary)] tabular-nums focus:outline-none"
                      />
                      <span className="text-xs text-[var(--text-muted)]">kr</span>
                    </div>
                  </label>

                  <label className="p-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] block">
                    <span className="text-[11px] text-[var(--text-muted)] block mb-1">
                      Din andel i budgeten
                    </span>
                    <div className="flex items-baseline gap-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={amount}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d]/g, '');
                          setAmount(v);
                        }}
                        className="w-full bg-transparent border-0 p-0 font-display font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums focus:outline-none"
                      />
                      <span className="text-xs text-[var(--text-muted)]">kr</span>
                    </div>
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '50 % (Lika)', ratio: 0.5 },
                    { label: '1/3 (33 %)', ratio: 1 / 3 },
                    { label: '2/3 (67 %)', ratio: 2 / 3 },
                  ].map((preset) => {
                    const baseFull = Math.max(1, Math.round(Number(fullAmount) || Number(amount) * 2 || 0));
                    const targetShare = Math.max(1, Math.round(baseFull * preset.ratio));
                    const isActive = Math.abs((Number(amount) || 0) - targetShare) <= 1;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setAmount(targetShare);
                          setFullAmount(baseFull);
                        }}
                        className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-bold'
                            : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const cleanShare = Math.max(1, Math.round(Number(amount) || 1));
                    const cleanFull = Math.max(
                      cleanShare,
                      Math.round(Number(fullAmount) || cleanShare * 2)
                    );
                    setAmount(cleanShare);
                    setFullAmount(cleanFull);
                    if (pickerReturnView === 'details') {
                      commitInlineChanges({
                        isShared: true,
                        amount: cleanShare,
                        fullAmount: cleanFull,
                      });
                    }
                    navigateSubView(pickerReturnView, 'back');
                  }}
                  className="ui-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Spara fördelning</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 6: INBYGGD KVITTO-VISNING                             */}
      {/* ============================================================== */}
      {subView === 'receipt-preview' && activeExpense?.receiptUrl && (
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
            <span className="ui-sheet-title max-w-[180px]">
              {activeExpense.receiptName || 'Kvitto'}
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
            {activeExpense.receiptUrl.startsWith('data:image/') ||
            /\.(png|jpe?g|webp|gif)$/i.test(activeExpense.receiptUrl) ? (
              <img
                src={activeExpense.receiptUrl}
                alt={activeExpense.receiptName || 'Kvitto'}
                className="max-h-[56dvh] w-auto object-contain rounded-xl"
              />
            ) : (
              <iframe
                src={activeExpense.receiptUrl}
                title={activeExpense.receiptName || 'Kvitto'}
                className="w-full h-[52dvh] rounded-xl border-0"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={activeExpense.receiptUrl}
              download={activeExpense.receiptName || `kvitto-${displayName}.jpg`}
              className="ui-btn-primary"
            >
              <FileText size={14} weight="bold" />
              <span>Spara fil</span>
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ui-btn-secondary"
            >
              <Paperclip size={14} />
              <span>Byt kvitto</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 7: REDIGERA FAST UTGIFT                               */}
      {/* ============================================================== */}
      {subView === 'edit' && (
        <div className={`${slideAnimClass} space-y-4`}>
          {isCreateMode ? (
            <div className="ui-sheet-header">
              <span className="ui-sheet-title">Lägg till fast utgift</span>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="ui-sheet-sub-header">
              <button
                type="button"
                onClick={() => {
                  if (activeExpense) {
                    setName(activeExpense.name);
                    setAmount(activeExpense.amount);
                    setIsShared(Boolean(activeExpense.isShared));
                    setFullAmount(
                      activeExpense.fullAmount && activeExpense.fullAmount > activeExpense.amount
                        ? activeExpense.fullAmount
                        : activeExpense.amount * 2
                    );
                    setDueDay(activeExpense.dueDay || 27);
                    setCategory(
                      normalizeCategoryToValid(activeExpense.category || 'Räkningar', 'expense')
                    );
                    setPaymentMethod(activeExpense.paymentMethod || 'Autogiro');
                  }
                  navigateSubView('details', 'back');
                }}
                title="Tillbaka"
                aria-label="Tillbaka"
                className="ui-icon-btn"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
              <span className="ui-sheet-title">Redigera fast utgift</span>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
            <label className="flex items-center gap-3.5 cursor-text">
              <ItemLogo
                name={name || activeExpense?.name || 'Fast utgift'}
                category={category}
                logoUrl={activeExpense?.logo}
                size="lg"
                isRecurring={true}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                  Namn
                </span>
                <input
                  type="text"
                  autoFocus={isCreateMode}
                  placeholder="Butik eller tjänst"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    const inferred = inferCategoryAndMethodFromName(nextName, 'fixed');
                    if (inferred?.category) {
                      setCategory(inferred.category);
                    }
                    if (inferred?.paymentMethod) {
                      setPaymentMethod(inferred.paymentMethod);
                    }
                  }}
                  className="w-full bg-transparent border-0 p-0 font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none"
                />
              </div>
            </label>

            <div className="border-t border-[var(--border-subtle)] pt-3.5">
              <label className="block cursor-text">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-0.5">
                  Belopp per månad
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                    className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
                  />
                  <span className="font-display font-semibold text-sm text-[var(--text-muted)] shrink-0">
                    kr/mån
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="ui-sheet-group">

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

            <button
              type="button"
              onClick={() => navigateSubView('day-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label shrink-0">Dragningsdag</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                <span>Den {dueDay}:e</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

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

            <button
              type="button"
              onClick={() => navigateSubView('share-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label shrink-0">Delad utgift</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                <Users
                  size={13}
                  className={isShared ? 'text-emerald-500' : 'text-[var(--text-secondary)]'}
                />
                <span>
                  {isShared && Number(fullAmount) > Number(amount)
                    ? `Din andel (av ${formatKr(Number(fullAmount))})`
                    : 'Betalar själv'}
                </span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>
          </div>

          <div className="space-y-2.5">
            {isCreateMode ? (
              <button
                type="button"
                onClick={handleCreateSave}
                disabled={!name.trim() || !(Number(amount) > 0)}
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Spara fast utgift</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    commitInlineChanges();
                    navigateSubView('details', 'back');
                  }}
                  disabled={!name.trim() || !(Number(amount) > 0)}
                  className="ui-btn-primary"
                >
                  <Check size={14} weight="bold" />
                  <span>Spara ändringar</span>
                </button>

                {onDelete && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="ui-btn-danger"
                    >
                      <Trash size={14} />
                      <span>Ta bort fast utgift</span>
                    </button>

                    <ConfirmDialog
                      isOpen={showDeleteConfirm}
                      title="Ta bort fast utgift?"
                      description={`${displayName} tas bort från dina fasta utgifter.`}
                      confirmLabel="Ta bort"
                      onConfirm={handleDelete}
                      onCancel={() => setShowDeleteConfirm(false)}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* HUVUDVY: REN FÖRHANDSGRANSKNING                                */}
      {/* ============================================================== */}
      {subView === 'details' && !isCreateMode && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          <div className="ui-sheet-header">
            <span className="ui-sheet-title">Fast utgift</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => navigateSubView('edit', 'forward')}
                className="px-3.5 py-1.5 rounded-full bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PencilSimple size={13} weight="regular" />
                <span>Redigera</span>
              </button>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Hero Receipt Header (Ren förhandsgranskning utan inline-inputs) */}
          <div className="ui-hero-header mb-5">
            <div className="flex justify-center mb-3.5">
              <ItemLogo
                name={displayName}
                category={category}
                logoUrl={activeExpense?.logo}
                size="xl"
                isRecurring={true}
              />
            </div>

            <h2 className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] text-center truncate px-2">
              {displayName}
            </h2>

            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="font-display font-semibold text-3xl text-[var(--text-primary)] tabular-nums">
                -{new Intl.NumberFormat('sv-SE').format(Math.round(Number(amount) || 0))}
              </span>
              <span className="font-display font-medium text-lg text-[var(--text-secondary)]">
                kr/mån
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="ui-sheet-group">
              <div className="ui-row">
                <span className="ui-info-label">Kategori</span>
                <span className="ui-info-value flex items-center gap-1.5">
                  <CategoryIcon category={category} size={13} />
                  <span>{category}</span>
                </span>
              </div>

              <div className="ui-row">
                <span className="ui-info-label">Dragningsdag</span>
                <span className="ui-info-value tabular-nums">
                  Den {dueDay}:e
                </span>
              </div>

              <div className="ui-row">
                <span className="ui-info-label">Betalsätt</span>
                <span className="ui-info-value">
                  {paymentMethod}
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

              {isShared && Number(fullAmount) > Number(amount) && (
                <div className="ui-row">
                  <span className="ui-info-label">Delad utgift</span>
                  <span className="ui-info-value flex items-center gap-1.5 tabular-nums">
                    <Users size={13} className="text-emerald-500" />
                    <span>Din andel (av {formatKr(Number(fullAmount))})</span>
                  </span>
                </div>
              )}

              {/* Kvitto-uppladdningsrad när inget kvitto finns än */}
              {activeExpense && !activeExpense.receiptUrl && (
                <div className="ui-row">
                  <span className="ui-info-label">Kvitto</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-medium text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Paperclip size={13} />
                    <span>Bifoga</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bifogat kvitto visas direkt som standard i ett snyggt kort */}
            {activeExpense?.receiptUrl && (
              <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                    <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                    <span className="truncate">{activeExpense.receiptName || 'Bifogat kvitto'}</span>
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
                            ...activeExpense,
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
                  {activeExpense.receiptUrl.startsWith('data:image/') ||
                  /\.(png|jpe?g|webp|gif)$/i.test(activeExpense.receiptUrl) ? (
                    <img
                      src={activeExpense.receiptUrl}
                      alt={activeExpense.receiptName || 'Kvitto'}
                      className="max-h-52 w-auto object-contain rounded-lg"
                    />
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <FileText size={28} weight="duotone" />
                      <span className="font-medium">{activeExpense.receiptName || 'Öppna dokument'}</span>
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Navigationsrad till Liknande transaktioner */}
            <div className="ui-sheet-group">
              <button
                type="button"
                onClick={() => navigateSubView('similar', 'forward')}
                className="ui-row-btn"
              >
                <span className="font-medium text-[var(--text-primary)] flex items-center gap-2">
                  <ClockCounterClockwise
                    size={15}
                    className="text-[var(--text-secondary)] shrink-0"
                  />
                  <span>Liknande transaktioner</span>
                </span>
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-normal tabular-nums shrink-0">
                  <span>
                    {similarInfo.transactions.length} st
                    {similarInfo.transactions.length > 0
                      ? ` · ${formatKr(similarInfo.totalAmount)}`
                      : ''}
                  </span>
                  <CaretRight size={13} className="text-[var(--text-muted)]" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
