import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  CaretRight,
  CaretLeft,
  ClockCounterClockwise,
} from '@phosphor-icons/react';
import { IncomeItem, AccountItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DayOfMonthPicker } from '../ui/DayOfMonthPicker';
import { formatSwedishDateHeading } from '../../utils/swedishDate';
import {
  findMatchingIncome,
  findTransactionsForIncome,
} from '../../utils/recurring';
import {
  getStoredIncomeCategories,
  normalizeCategoryToValid,
} from '../../utils/appCache';
import { inferCategoryAndMethodFromName } from '../../utils/bankHistoryAnalyzer';

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

type ModalSubView = 'details' | 'edit' | 'category-picker' | 'day-picker' | 'similar';

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
  const [pickerReturnView, setPickerReturnView] = useState<'details' | 'edit'>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [payday, setPayday] = useState<number>(25);
  const [category, setCategory] = useState('Lön');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (next === 'category-picker' || next === 'day-picker') {
      if (subView === 'edit' || subView === 'details') {
        setPickerReturnView(subView);
      }
    }
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
      setSubView('details');
      setPickerReturnView('details');
    } else {
      setName('');
      setAmount('');
      setPayday(25);
      setCategory('Lön');
      setSubView('edit');
      setPickerReturnView('edit');
    }
    setNavDirection('forward');
    setShowDeleteConfirm(false);
    setShowFullAccount(false);
  }, [initialIncome, isOpen]);

  const resolvedAccountInfo = useMemo(() => {
    const matchedTx = activeIncome
      ? transactions.find(
          (tx) => tx.type === 'income' && Boolean(findMatchingIncome(tx, [activeIncome]))
        )
      : undefined;
    const raw = activeIncome?.bankAccountName || matchedTx?.bankAccountName || '';
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

          {/* Compact Merchant Summary Bar */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <ItemLogo
                name={displayName}
                category={category}
                logoUrl={activeIncome?.logo}
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
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="ui-row-title">
                        {tx.title}
                      </span>
                      <span className="ui-row-subtitle tabular-nums">
                        {formatSwedishDateHeading(tx.date)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="ui-row-amount-income">
                        +{formatKr(tx.amount)}
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
            {availableIncomeCategories.map((c) => {
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
      {/* SUB-VIEW 3: UTBETALNINGSDAG-VÄLJARE (Ersätter native <select>) */}
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

          <DayOfMonthPicker
            selectedDay={Number(payday) || 25}
            onSelectDay={(d) => {
              setPayday(d);
              if (pickerReturnView === 'details') {
                commitInlineChanges({ payday: d });
              }
              navigateSubView(pickerReturnView, 'back');
            }}
            mode="payday"
            title={`Utbetalningsdag för ${displayName}`}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 4: REDIGERA INKOMST                                   */}
      {/* ============================================================== */}
      {subView === 'edit' && (
        <div className={`${slideAnimClass} space-y-4`}>
          {isCreateMode ? (
            <div className="ui-sheet-header">
              <span className="ui-sheet-title">Lägg till inkomst</span>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="ui-sheet-sub-header">
              <button
                type="button"
                onClick={() => {
                  if (activeIncome) {
                    setName(activeIncome.name);
                    setAmount(activeIncome.amount);
                    setPayday(activeIncome.payday || 25);
                    setCategory(
                      normalizeCategoryToValid(activeIncome.category || 'Lön', 'income')
                    );
                  }
                  navigateSubView('details', 'back');
                }}
                title="Tillbaka"
                aria-label="Tillbaka"
                className="ui-icon-btn"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
              <span className="ui-sheet-title">Redigera inkomst</span>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
            <label className="flex items-center gap-3.5 cursor-text">
              <ItemLogo
                name={name || activeIncome?.name || 'Lön'}
                category={category}
                logoUrl={activeIncome?.logo}
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
                  placeholder="Inkomstkälla"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    const inferred = inferCategoryAndMethodFromName(nextName, 'income');
                    if (inferred?.category) {
                      setCategory(inferred.category);
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
                    className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-emerald-600 dark:text-emerald-400 placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
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
              <span className="ui-info-label shrink-0">Utbetalningsdag</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                <span>Den {payday}:e</span>
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
                <span>Spara inkomst</span>
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
                      <span>Ta bort inkomst</span>
                    </button>

                    <ConfirmDialog
                      isOpen={showDeleteConfirm}
                      title="Ta bort inkomst?"
                      description={`${displayName} tas bort från dina inkomster.`}
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
            <span className="ui-sheet-title">Fast inkomst</span>
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
                logoUrl={activeIncome?.logo}
                size="xl"
                isRecurring={true}
              />
            </div>

            <h2 className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] text-center truncate px-2">
              {displayName}
            </h2>

            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="font-display font-semibold text-3xl text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{new Intl.NumberFormat('sv-SE').format(Math.round(Number(amount) || 0))}
              </span>
              <span className="font-display font-medium text-lg text-emerald-600/70 dark:text-emerald-400/70">
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
                <span className="ui-info-label">Utbetalningsdag</span>
                <span className="ui-info-value tabular-nums">
                  Den {payday}:e
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
            </div>

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
                      ? ` · +${formatKr(similarInfo.totalAmount)}`
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
