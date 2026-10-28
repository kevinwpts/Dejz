import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  CaretRight,
  CaretLeft,
  Bank,
  Paperclip,
  FileText,
  ClockCounterClockwise,
  Users,
} from '@phosphor-icons/react';
import { FixedExpenseItem, AccountItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { formatSwedishFullDate } from '../../utils/swedishDate';
import {
  findMatchingFixedExpense,
  findTransactionsForFixedExpense,
} from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  compressImageFileToDataUrl,
} from '../../utils/appCache';

interface FixedExpenseModalProps {
  isOpen: boolean;
  initialExpense?: FixedExpenseItem | null;
  accounts?: AccountItem[];
  transactions?: TransactionItem[];
  onClose: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onSave?: (data: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate?: (item: FixedExpenseItem) => void;
  onDelete?: (id: string) => void;
}

type ModalSubView =
  | 'details'
  | 'category-picker'
  | 'day-picker'
  | 'payment-picker'
  | 'share-picker'
  | 'receipt-preview'
  | 'similar';

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  initialExpense,
  accounts = [],
  transactions = [],
  onClose,
  onSelectTransaction,
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
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [isShared, setIsShared] = useState<boolean>(false);
  const [fullAmount, setFullAmount] = useState<number | string>('');
  const [dueDay, setDueDay] = useState<number>(27);
  const [category, setCategory] = useState('Räkningar');
  const [paymentMethod, setPaymentMethod] = useState('Autogiro');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
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
    } else {
      setName('');
      setAmount('');
      setIsShared(false);
      setFullAmount('');
      setDueDay(27);
      setCategory('Räkningar');
      setPaymentMethod('Autogiro');
    }
    setSubView('details');
    setNavDirection('forward');
    setShowDeleteConfirm(false);
  }, [initialExpense, isOpen]);

  const resolvedAccountDisplay = useMemo(() => {
    const cleanAcc = (raw: string | undefined | null) => {
      if (!raw) return null;
      const stripped = raw
        .replace(/\s*·\s*\d{4}\b/g, '')
        .replace(/\b\d[\d\s-]{5,}\b/g, '')
        .replace(/\s*·\s*$/, '')
        .trim();
      return stripped || null;
    };

    if (!activeExpense) {
      if (accounts.length > 0) {
        const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
        return cleanAcc(`${checking.bankName} · ${checking.name}`);
      }
      return null;
    }
    if (activeExpense.bankAccountName) return cleanAcc(activeExpense.bankAccountName);

    const matchedTx = transactions.find(
      (tx) => tx.type !== 'income' && Boolean(findMatchingFixedExpense(tx, [activeExpense]))
    );
    if (matchedTx?.bankAccountName) {
      return cleanAcc(matchedTx.bankAccountName);
    }

    if (accounts.length > 0) {
      const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
      return cleanAcc(`${checking.bankName} · ${checking.name}`);
    }

    return null;
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

          <div className="ui-hero-header">
            <div className="flex justify-center mb-3">
              <ItemLogo
                name={displayName}
                category={category}
                logoUrl={activeExpense?.logo}
                size="xl"
                isRecurring={true}
              />
            </div>
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
              {displayName}
            </h2>
            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-1">
              {similarInfo.transactions.length} tillfällen · Totalt -{formatKr(similarInfo.totalAmount)}
              {similarInfo.transactions.length > 1
                ? ` · Snitt ${formatKr(similarInfo.averageAmount)}`
                : ''}
            </p>
          </div>

          {similarInfo.transactions.length > 0 ? (
            <div className="ui-sheet-group">
              {similarInfo.transactions.map((tx) => (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => {
                    if (onSelectTransaction) {
                      onSelectTransaction(tx);
                    }
                  }}
                  className="ui-row-btn"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ItemLogo
                      name={tx.title}
                      category={tx.category}
                      logoUrl={tx.logo}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {tx.title}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums block mt-0.5">
                        {formatSwedishFullDate(tx.date)}
                        {getTransactionTime(tx) ? ` · ${getTransactionTime(tx)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="ui-row-amount">
                      -{formatKr(tx.amount)}
                    </span>
                    <CaretRight size={12} className="text-[var(--text-muted)]" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="ui-sheet-box text-center text-xs text-[var(--text-muted)] py-6">
              Inga registrerade banktransaktioner matchar {displayName} ännu.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 2: KATEGORIVÄLJARE (Direktsparande)                   */}
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
                  className="ui-row-btn"
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
      {/* SUB-VIEW 3: DRAGNINGSDAG-VÄLJARE (Ersätter native <select>)    */}
      {/* ============================================================== */}
      {subView === 'day-picker' && (
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

          <div className="ui-sheet-box space-y-3">
            <span className="text-[11px] font-medium text-[var(--text-muted)] block text-center">
              Vilken dag i månaden dras {displayName}?
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const isSel = Number(dueDay) === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDueDay(d);
                      commitInlineChanges({ dueDay: d });
                      navigateSubView('details', 'back');
                    }}
                    className={isSel ? 'ui-day-btn-active' : 'ui-day-btn'}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
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
                  className="ui-row-btn"
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
      {/* SUB-VIEW 5: DELAD FAST UTGIFT / SAMBOLÄGE                      */}
      {/* ============================================================== */}
      {subView === 'share-picker' && (
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
                    commitInlineChanges({
                      isShared: true,
                      fullAmount: currentAmt,
                      amount: half,
                    });
                  } else {
                    setAmount(currentFull);
                    setFullAmount('');
                    commitInlineChanges({
                      isShared: false,
                      fullAmount: undefined,
                      amount: currentFull,
                    });
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
                    commitInlineChanges({
                      isShared: true,
                      amount: cleanShare,
                      fullAmount: cleanFull,
                    });
                    navigateSubView('details', 'back');
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
      {/* HUVUDVY: DIREKT-INTERAKTIV DETALJVY                            */}
      {/* ============================================================== */}
      {subView === 'details' && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          <div className="ui-sheet-header">
            <span className="ui-sheet-title">
              {isCreateMode ? 'Lägg till fast utgift' : 'Fast utgift'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          {/* Hero Receipt Header (Direkt-redigerbart namn & belopp) */}
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

            <label className="inline-flex items-center justify-center max-w-full px-3 cursor-text">
              <input
                type="text"
                autoFocus={isCreateMode}
                placeholder="t.ex. Hyra eller Spotify"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (!isCreateMode && activeExpense) {
                    if (name.trim() && name.trim() !== activeExpense.name) {
                      commitInlineChanges({ name: name.trim() });
                    } else if (!name.trim()) {
                      setName(activeExpense.name);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                size={Math.max(10, (name || 't.ex. Hyra').length)}
                className="max-w-[280px] bg-transparent border-0 p-0 font-display font-bold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 text-center focus:outline-none truncate"
              />
            </label>

            <div className="mt-1">
              <label className="inline-flex items-baseline justify-center gap-1 cursor-text group">
                <span className="font-display font-extrabold text-3xl text-[var(--text-primary)]">
                  -
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => {
                    if (!isCreateMode && activeExpense) {
                      const nextAmt = Math.max(
                        1,
                        Math.round(Number(amount) || activeExpense.amount)
                      );
                      setAmount(nextAmt);
                      if (nextAmt !== activeExpense.amount) {
                        commitInlineChanges({ amount: nextAmt });
                      }
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  size={Math.max(2, String(amount || '0').length)}
                  className="max-w-[140px] bg-transparent border-0 p-0 font-display font-extrabold text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 text-center tabular-nums focus:outline-none"
                />
                <span className="font-display font-bold text-xl text-[var(--text-muted)]">
                  kr/mån
                </span>
              </label>
            </div>

            {resolvedAccountDisplay && (
              <p className="text-xs text-[var(--text-muted)] mt-1.5">
                {resolvedAccountDisplay}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="ui-sheet-group">
              {/* Kategori — Öppnar kategoriväljare med sidleds-slide */}
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

              {/* Dragningsdag — Öppnar kalenderväljare (1–31) */}
              <button
                type="button"
                onClick={() => navigateSubView('day-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="text-[var(--text-muted)] shrink-0">Dragningsdag</span>
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <span>Den {dueDay}:e</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              {/* Betalsätt — Öppnar betalsättsväljare */}
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

              {/* Delad utgift / Samboläge */}
              <button
                type="button"
                onClick={() => navigateSubView('share-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="text-[var(--text-muted)] shrink-0">Delad utgift</span>
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <Users size={13} className={isShared ? 'text-emerald-500' : 'text-[var(--text-secondary)]'} />
                  <span>
                    {isShared && Number(fullAmount) > Number(amount)
                      ? `Din andel (av ${formatKr(Number(fullAmount))})`
                      : 'Betalar själv'}
                  </span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>

              {/* Kvitto som integrerad rad (endast i redigeringsläge) */}
              {!isCreateMode && activeExpense && (
                <div className="ui-row">
                  <span className="text-[var(--text-muted)] shrink-0">Kvitto</span>
                  {activeExpense.receiptUrl ? (
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => navigateSubView('receipt-preview', 'forward')}
                        className="font-semibold text-[var(--text-primary)] hover:underline flex items-center gap-1 truncate max-w-[140px] cursor-pointer"
                      >
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate">
                          {activeExpense.receiptName || 'Visa kvitto'}
                        </span>
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
                          className="text-[var(--text-muted)] hover:text-rose-500 p-1 rounded cursor-pointer"
                          title="Ta bort kvitto"
                        >
                          <Trash size={13} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-semibold text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Paperclip size={13} />
                      <span>Bifoga</span>
                    </button>
                  )}
                </div>
              )}
            </div>

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
                {/* Navigationsrad till Liknande transaktioner */}
                <div className="ui-sheet-group">
                  <button
                    type="button"
                    onClick={() => navigateSubView('similar', 'forward')}
                    className="ui-row-btn"
                  >
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                      <ClockCounterClockwise
                        size={15}
                        className="text-[var(--text-secondary)] shrink-0"
                      />
                      <span>Liknande transaktioner</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[var(--text-muted)] font-medium tabular-nums shrink-0">
                      <span>
                        {similarInfo.transactions.length} st
                        {similarInfo.transactions.length > 0
                          ? ` · ${formatKr(similarInfo.totalAmount)}`
                          : ''}
                      </span>
                      <CaretRight size={13} />
                    </span>
                  </button>
                </div>

                {/* Delete Action */}
                {onDelete && (
                  <>
                    {showDeleteConfirm ? (
                      <div className="ui-confirm-danger animate-fade-in">
                        <span className="font-medium text-rose-700 dark:text-rose-300">
                          Ta bort permanent?
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-2.5 py-1 rounded-lg bg-[var(--surface-color)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-semibold cursor-pointer"
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
                        <span>Ta bort fast utgift</span>
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
