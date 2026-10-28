import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  CaretRight,
  CaretLeft,
  Bank,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { IncomeItem, AccountItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { formatSwedishFullDate } from '../../utils/swedishDate';
import {
  findMatchingIncome,
  findTransactionsForIncome,
} from '../../utils/recurring';
import {
  getStoredIncomeCategories,
  normalizeCategoryToValid,
} from '../../utils/appCache';

interface IncomeModalProps {
  isOpen: boolean;
  initialIncome?: IncomeItem | null;
  accounts?: AccountItem[];
  transactions?: TransactionItem[];
  onClose: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onSave?: (data: Omit<IncomeItem, 'id'>) => void;
  onUpdate?: (item: IncomeItem) => void;
  onDelete?: (id: string) => void;
}

type ModalSubView = 'details' | 'category-picker' | 'day-picker' | 'similar';

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  initialIncome,
  accounts = [],
  transactions = [],
  onClose,
  onSelectTransaction,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const isCreateMode = !initialIncome;

  // Retain last active item during 240ms exit animation
  const lastIncomeRef = useRef<IncomeItem | null>(null);
  if (initialIncome) {
    lastIncomeRef.current = initialIncome;
  }
  const activeIncome = isCreateMode ? null : initialIncome || lastIncomeRef.current;

  const [subView, setSubView] = useState<ModalSubView>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [payday, setPayday] = useState<number>(25);
  const [category, setCategory] = useState('Lön');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    setNavDirection(dir);
    setSubView(next);
  };

  const availableIncomeCategories = useMemo(
    () => getStoredIncomeCategories().map((c) => c.name),
    [isOpen]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (initialIncome) {
      setName(initialIncome.name);
      setAmount(initialIncome.amount);
      setPayday(initialIncome.payday || 25);
      setCategory(normalizeCategoryToValid(initialIncome.category || 'Lön', 'income'));
    } else {
      setName('');
      setAmount('');
      setPayday(25);
      setCategory('Lön');
    }
    setSubView('details');
    setNavDirection('forward');
    setShowDeleteConfirm(false);
  }, [initialIncome, isOpen]);

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

    if (!activeIncome) {
      if (accounts.length > 0) {
        const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
        return cleanAcc(`${checking.bankName} · ${checking.name}`);
      }
      return null;
    }
    if (activeIncome.bankAccountName) return cleanAcc(activeIncome.bankAccountName);

    const matchedTx = transactions.find(
      (tx) => tx.type === 'income' && Boolean(findMatchingIncome(tx, [activeIncome]))
    );
    if (matchedTx?.bankAccountName) {
      return cleanAcc(matchedTx.bankAccountName);
    }

    if (accounts.length > 0) {
      const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
      return cleanAcc(`${checking.bankName} · ${checking.name}`);
    }

    return null;
  }, [activeIncome, transactions, accounts]);

  const similarInfo = useMemo(
    () => findTransactionsForIncome(activeIncome, transactions),
    [activeIncome, transactions]
  );

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const commitInlineChanges = (overrides?: Partial<IncomeItem>) => {
    if (isCreateMode || !onUpdate || !activeIncome) return;
    const nextName = (overrides?.name !== undefined ? overrides.name : name).trim() || activeIncome.name;
    const nextAmt = Math.max(
      1,
      Math.round(Number(overrides?.amount !== undefined ? overrides.amount : amount) || activeIncome.amount)
    );
    const nextPayday = overrides?.payday !== undefined ? overrides.payday : Number(payday);
    const nextCategory = overrides?.category !== undefined ? overrides.category : category;

    onUpdate({
      ...activeIncome,
      name: nextName,
      amount: nextAmt,
      payday: nextPayday,
      category: nextCategory,
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
        payday: Number(payday) || 25,
        category: category || 'Lön',
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && activeIncome) {
      onDelete(activeIncome.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  const displayName = name || activeIncome?.name || 'Ny inkomst';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
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
                logoUrl={activeIncome?.logo}
                size="xl"
                isRecurring={true}
              />
            </div>
            <h2 className="font-display font-bold text-lg text-[var(--text-primary)]">
              {displayName}
            </h2>
            <p className="text-xs text-[var(--text-muted)] tabular-nums mt-1">
              {similarInfo.transactions.length} tillfällen · Totalt +{formatKr(similarInfo.totalAmount)}
              {similarInfo.transactions.length > 1
                ? ` · Snitt +${formatKr(similarInfo.averageAmount)}`
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
                    <span className="ui-row-amount-income">
                      +{formatKr(tx.amount)}
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
            {availableIncomeCategories.map((c) => {
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
      {/* SUB-VIEW 3: UTBETALNINGSDAG-VÄLJARE (Ersätter native <select>) */}
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
              Välj utbetalningsdag
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
              Vilken dag i månaden betalas {displayName} ut?
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                const isSel = Number(payday) === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setPayday(d);
                      commitInlineChanges({ payday: d });
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
      {/* HUVUDVY: DIREKT-INTERAKTIV DETALJVY                            */}
      {/* ============================================================== */}
      {subView === 'details' && (
        <div className={navDirection === 'back' ? 'animate-slide-in-left' : ''}>
          <div className="ui-sheet-header">
            <span className="ui-sheet-title">
              {isCreateMode ? 'Lägg till inkomst' : 'Fast inkomst'}
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
                logoUrl={activeIncome?.logo}
                size="xl"
                isRecurring={true}
              />
            </div>

            <label className="inline-flex items-center justify-center max-w-full px-3 cursor-text">
              <input
                type="text"
                autoFocus={isCreateMode}
                placeholder="t.ex. Lön"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (!isCreateMode && activeIncome) {
                    if (name.trim() && name.trim() !== activeIncome.name) {
                      commitInlineChanges({ name: name.trim() });
                    } else if (!name.trim()) {
                      setName(activeIncome.name);
                    }
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                size={Math.max(8, (name || 't.ex. Lön').length)}
                className="max-w-[280px] bg-transparent border-0 p-0 font-display font-bold text-lg sm:text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 text-center focus:outline-none truncate"
              />
            </label>

            <div className="mt-1">
              <label className="inline-flex items-baseline justify-center gap-1 cursor-text group">
                <span className="font-display font-extrabold text-3xl text-emerald-600 dark:text-emerald-400">
                  +
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={() => {
                    if (!isCreateMode && activeIncome) {
                      const nextAmt = Math.max(
                        1,
                        Math.round(Number(amount) || activeIncome.amount)
                      );
                      setAmount(nextAmt);
                      if (nextAmt !== activeIncome.amount) {
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
                  className="max-w-[140px] bg-transparent border-0 p-0 font-display font-extrabold text-3xl text-emerald-600 dark:text-emerald-400 placeholder-[var(--text-muted)]/50 text-center tabular-nums focus:outline-none"
                />
                <span className="font-display font-bold text-xl text-emerald-600/70 dark:text-emerald-400/70">
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
              {/* Kategori — Öppnar kategoriväljare */}
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

              {/* Utbetalningsdag — Öppnar kalenderväljare (1–31) */}
              <button
                type="button"
                onClick={() => navigateSubView('day-picker', 'forward')}
                className="ui-row-btn"
              >
                <span className="text-[var(--text-muted)] shrink-0">Utbetalningsdag</span>
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <span>Den {payday}:e</span>
                  <CaretRight size={12} className="text-[var(--text-muted)]" />
                </span>
              </button>
            </div>

            {isCreateMode ? (
              <button
                type="button"
                onClick={handleCreateSave}
                disabled={!name.trim() || !(Number(amount) > 0)}
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Spara inkomst</span>
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
                          ? ` · +${formatKr(similarInfo.totalAmount)}`
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
                        <span>Ta bort inkomst</span>
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
