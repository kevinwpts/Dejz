import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  ArrowsClockwise,
  CaretDown,
  Bank,
} from '@phosphor-icons/react';
import { IncomeItem, AccountItem, TransactionItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { findMatchingIncome } from '../../utils/recurring';
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
  onSave?: (data: Omit<IncomeItem, 'id'>) => void;
  onUpdate?: (item: IncomeItem) => void;
  onDelete?: (id: string) => void;
}

export const IncomeModal: React.FC<IncomeModalProps> = ({
  isOpen,
  initialIncome,
  accounts = [],
  transactions = [],
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [payday, setPayday] = useState<number>(25);
  const [category, setCategory] = useState('Lön');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);

  const availableIncomeCategories = useMemo(
    () => getStoredIncomeCategories().map((c) => c.name),
    [isOpen]
  );

  useEffect(() => {
    if (initialIncome) {
      setName(initialIncome.name);
      setAmount(initialIncome.amount);
      setPayday(initialIncome.payday || 25);
      setCategory(normalizeCategoryToValid(initialIncome.category || 'Lön', 'income'));
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setIsCatDropdownOpen(false);
    }
  }, [initialIncome, isOpen]);

  const resolvedAccountDisplay = useMemo(() => {
    if (!initialIncome) return null;
    if (initialIncome.bankAccountName) return initialIncome.bankAccountName;

    const matchedTx = transactions.find(
      (tx) => tx.type === 'income' && Boolean(findMatchingIncome(tx, [initialIncome]))
    );
    if (matchedTx?.bankAccountName) {
      return matchedTx.bankAccountName;
    }

    if (accounts.length > 0) {
      const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
      return `${checking.bankName} · ${checking.name}`;
    }

    return null;
  }, [initialIncome, transactions, accounts]);

  if (!isOpen || !initialIncome) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Math.max(0, Math.round(Number(amount) || 0));
    if (!name.trim() || numAmt <= 0) return;

    if (onUpdate) {
      onUpdate({
        ...initialIncome,
        name: name.trim(),
        amount: numAmt,
        payday: Number(payday),
        category,
      });
    }
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(initialIncome.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mt-auto bg-[var(--surface-color)] rounded-t-3xl rounded-b-none p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] border-t border-x border-[var(--border-subtle)] shadow-modal max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bottom-Sheet Drag Handle */}
        <div className="w-10 h-1.5 rounded-full bg-[var(--border-control)] mx-auto mb-3" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] mb-5">
          <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
            <ArrowsClockwise size={14} className="text-emerald-500" />
            <span>Fast inkomst</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hero Receipt Header */}
        <div className="text-center mb-5 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex justify-center mb-3">
            <ItemLogo
              name={initialIncome.name}
              category={initialIncome.category}
              logoUrl={initialIncome.logo}
              size="lg"
              isRecurring={true}
            />
          </div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[var(--text-primary)] mb-2 break-words px-2">
            {initialIncome.name}
          </h2>
          <div className="font-display font-extrabold text-3xl tabular-nums text-emerald-600 dark:text-emerald-400">
            +{formatKr(initialIncome.amount)}
          </div>
        </div>

        {/* EDIT FORM or DETAILS VIEW */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Namn</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Belopp (kr)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] tabular-nums transition-colors"
                />
              </div>

              {/* Custom Category Dropdown */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Kategori</label>
                <button
                  type="button"
                  onClick={() => setIsCatDropdownOpen((prev) => !prev)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <CategoryIcon category={category} size={14} />
                    <span>{category}</span>
                  </span>
                  <CaretDown
                    size={13}
                    className={`text-[var(--text-muted)] transition-transform ${
                      isCatDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isCatDropdownOpen && (
                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] mt-1 max-h-48 overflow-y-auto">
                    {availableIncomeCategories.map((c) => {
                      const isSel = c === category;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCategory(c);
                            setIsCatDropdownOpen(false);
                          }}
                          className={`px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                              : 'hover:bg-[var(--bg-color)] text-[var(--text-primary)] font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <CategoryIcon category={c} size={13} />
                            <span className="truncate">{c}</span>
                          </span>
                          {isSel && <Check size={12} weight="bold" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Dag</label>
                <select
                  value={payday}
                  onChange={(e) => setPayday(Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Den {d}:e
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Check size={14} weight="bold" />
                <span>Spara</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] text-xs">
              {resolvedAccountDisplay && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[var(--text-muted)] shrink-0">Konto</span>
                  <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 text-right min-w-0">
                    <Bank size={13} className="text-[var(--text-secondary)] shrink-0" />
                    <span className="truncate">{resolvedAccountDisplay}</span>
                  </span>
                </div>
              )}

              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[var(--text-muted)]">Kategori</span>
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <CategoryIcon category={initialIncome.category} size={13} />
                  <span>{initialIncome.category}</span>
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[var(--text-muted)]">Utbetalningsdag</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  Den {initialIncome.payday}:e
                </span>
              </div>
            </div>

            {/* Delete Confirmation Box */}
            {showDeleteConfirm ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs animate-fade-in">
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
              <div className="grid grid-cols-2 gap-2">
                {onUpdate && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="py-2.5 px-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <PencilSimple size={14} />
                    <span>Redigera</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="py-2.5 px-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash size={14} />
                    <span>Ta bort</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
