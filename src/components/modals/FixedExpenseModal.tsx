import React, { useState, useEffect } from 'react';
import { X, Trash, PencilSimple, Check } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';

interface FixedExpenseModalProps {
  isOpen: boolean;
  initialExpense?: FixedExpenseItem | null;
  onClose: () => void;
  onSave?: (data: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate?: (item: FixedExpenseItem) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES = [
  'Boende',
  'Räkningar',
  'Abonnemang',
  'Försäkring',
  'Transport',
  'Lån',
  'Hälsa',
  'Övrigt',
];

const PAYMENT_METHODS = [
  'Autogiro',
  'Kort',
  'E-faktura',
  'Faktura',
  'Överföring',
];

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  initialExpense,
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

  useEffect(() => {
    if (initialExpense) {
      setName(initialExpense.name);
      setAmount(initialExpense.amount);
      setDueDay(initialExpense.dueDay || 27);
      setCategory(initialExpense.category || 'Räkningar');
      setPaymentMethod(initialExpense.paymentMethod || 'Autogiro');
      setIsEditing(false);
      setShowDeleteConfirm(false);
    }
  }, [initialExpense, isOpen]);

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md my-auto bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            {isEditing ? 'Redigera fast utgift' : 'Detaljer för fast utgift'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Card */}
        <div className="mb-4 p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ItemLogo
              name={initialExpense.name}
              category={initialExpense.category}
              logoUrl={initialExpense.logo}
              size="lg"
            />
            <div className="min-w-0">
              <span className="font-display font-bold text-base text-[var(--text-primary)] block truncate">
                {initialExpense.name}
              </span>
              <span className="text-xs text-[var(--text-muted)] block truncate">
                Den {initialExpense.dueDay}:e · {initialExpense.category}
                {initialExpense.paymentMethod ? ` · ${initialExpense.paymentMethod}` : ''}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="font-display font-extrabold text-xl text-[var(--text-primary)] tabular-nums block">
              -{formatKr(initialExpense.amount)}
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-medium">
              / månad
            </span>
          </div>
        </div>

        {/* EDIT FORM or DETAILS VIEW */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-3.5 mb-5">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Namn på utgift
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Månatligt belopp (kr)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] tabular-nums"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Dragningsdag
                </label>
                <select
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Den {d}:e
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Betalsätt
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Check size={14} weight="bold" />
                <span>Spara ändringar</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 mb-5">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] text-xs">
              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Mottagare / Utgift</span>
                <span className="font-semibold text-[var(--text-primary)] text-right truncate">
                  {initialExpense.name}
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Månatligt belopp</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  -{formatKr(initialExpense.amount)}
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Dragningsdag</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  Den {initialExpense.dueDay}:e varje månad
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Kategori</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {initialExpense.category}
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Betalsätt</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {initialExpense.paymentMethod || 'Autogiro'}
                </span>
              </div>
            </div>

            {/* Delete Confirmation Box */}
            {showDeleteConfirm ? (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-2.5 animate-fade-in">
                <p className="text-rose-600 dark:text-rose-400 font-medium">
                  Vill du ta bort &quot;{initialExpense.name}&quot; permanent? Den kommer inte att läggas till igen automatiskt vid banksynk.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-1.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  >
                    Avbryt
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700"
                  >
                    Ja, ta bort
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 pt-1">
                {onUpdate && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                  >
                    <PencilSimple size={14} />
                    <span>Redigera</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="py-2.5 px-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="Ta bort fast utgift"
                  >
                    <Trash size={14} />
                    <span>Ta bort</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
        >
          Stäng
        </button>
      </div>
    </div>
  );
};
