import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  CaretDown,
  Bank,
  Paperclip,
  FileText,
  Eye,
} from '@phosphor-icons/react';
import { FixedExpenseItem, AccountItem, TransactionItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { findMatchingFixedExpense } from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
} from '../../utils/appCache';

interface FixedExpenseModalProps {
  isOpen: boolean;
  initialExpense?: FixedExpenseItem | null;
  accounts?: AccountItem[];
  transactions?: TransactionItem[];
  onClose: () => void;
  onSave?: (data: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate?: (item: FixedExpenseItem) => void;
  onDelete?: (id: string) => void;
}

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  initialExpense,
  accounts = [],
  transactions = [],
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [dueDay, setDueDay] = useState<number>(27);
  const [category, setCategory] = useState('Räkningar');
  const [paymentMethod, setPaymentMethod] = useState('Autogiro');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (initialExpense) {
      setName(initialExpense.name);
      setAmount(initialExpense.amount);
      setDueDay(initialExpense.dueDay || 27);
      setCategory(normalizeCategoryToValid(initialExpense.category || 'Räkningar', 'expense'));
      setPaymentMethod(initialExpense.paymentMethod || 'Autogiro');
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setIsCatDropdownOpen(false);
    }
  }, [initialExpense, isOpen]);

  const resolvedAccountDisplay = useMemo(() => {
    if (!initialExpense) return null;
    if (initialExpense.bankAccountName) return initialExpense.bankAccountName;

    const matchedTx = transactions.find(
      (tx) => tx.type !== 'income' && Boolean(findMatchingFixedExpense(tx, [initialExpense]))
    );
    if (matchedTx?.bankAccountName) {
      return matchedTx.bankAccountName;
    }

    if (accounts.length > 0) {
      const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
      return `${checking.bankName} · ${checking.name}`;
    }

    return null;
  }, [initialExpense, transactions, accounts]);

  if (!isOpen || !initialExpense) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Math.max(0, Math.round(Number(amount) || 0));
    if (!name.trim() || numAmt <= 0) return;

    if (onUpdate) {
      onUpdate({
        ...initialExpense,
        name: name.trim(),
        amount: numAmt,
        dueDay: Number(dueDay),
        category,
        paymentMethod,
      });
    }
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(initialExpense.id);
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
        <div className="flex items-center justify-end pb-3.5 border-b border-[var(--border-subtle)] mb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Hero Receipt Header (Clean: Logo + Full Name + Amount) */}
        <div className="text-center mb-5 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex justify-center mb-3">
            <ItemLogo
              name={initialExpense.name}
              category={initialExpense.category}
              logoUrl={initialExpense.logo}
              size="lg"
              isRecurring={true}
            />
          </div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[var(--text-primary)] mb-2 break-words px-2">
            {initialExpense.name}
          </h2>
          <div className="font-display font-extrabold text-3xl tabular-nums text-[var(--text-primary)]">
            -{formatKr(initialExpense.amount)}
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
                    {availableCategories.map((c) => {
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

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--text-muted)] font-medium">Dag</label>
                  <select
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Den {d}:e
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--text-muted)] font-medium">Betalsätt</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {availablePaymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <CategoryIcon category={initialExpense.category} size={13} />
                  <span>{initialExpense.category}</span>
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[var(--text-muted)]">Dragningsdag</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  Den {initialExpense.dueDay}:e
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[var(--text-muted)]">Betalsätt</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {initialExpense.paymentMethod || 'Autogiro'}
                </span>
              </div>
            </div>

            {/* Kvitto / Faktura Section */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Paperclip size={14} className="text-[var(--text-secondary)]" />
                  <span>Kvitto</span>
                </span>
                {initialExpense.receiptUrl && onUpdate && (
                  <button
                    type="button"
                    onClick={() => {
                      onUpdate({
                        ...initialExpense,
                        receiptUrl: undefined,
                        receiptName: undefined,
                      });
                    }}
                    className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash size={12} />
                    <span>Ta bort</span>
                  </button>
                )}
              </div>

              {initialExpense.receiptUrl ? (
                <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
                  {initialExpense.receiptUrl.startsWith('data:image/') ? (
                    <img
                      src={initialExpense.receiptUrl}
                      alt="Kvitto"
                      className="w-9 h-9 rounded-lg object-cover border border-[var(--border-subtle)] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                      <FileText size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                      {initialExpense.receiptName || 'Kvitto'}
                    </span>
                  </div>
                  <a
                    href={initialExpense.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] flex items-center gap-1 shrink-0"
                  >
                    <Eye size={12} />
                    <span>Visa</span>
                  </a>
                </div>
              ) : (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !onUpdate) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          onUpdate({
                            ...initialExpense,
                            receiptUrl: reader.result,
                            receiptName: file.name,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Paperclip size={13} />
                    <span>Bifoga kvitto</span>
                  </button>
                </div>
              )}
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
