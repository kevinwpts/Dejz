import React, { useState, useEffect } from 'react';
import { X, Trash, PencilSimple, Check, ArrowsClockwise } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';

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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-auto bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)] mb-5">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-500/20 flex items-center gap-1">
              <ArrowsClockwise size={11} />
              Fast utgift
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Receipt Header */}
        <div className="text-center mb-6 pb-6 border-b border-[var(--border-subtle)]">
          <div className="flex justify-center mb-3">
            <ItemLogo
              name={initialExpense.name}
              category={initialExpense.category}
              logoUrl={initialExpense.logo}
              size="lg"
              isRecurring={true}
            />
          </div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)] mb-1 truncate px-2">
            {initialExpense.name}
          </h2>
          <div className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1.5 mb-3">
            <span>Dragningsdag den {initialExpense.dueDay}:e varje månad</span>
          </div>
          <div className="font-display font-extrabold text-3xl tabular-nums text-[var(--text-primary)]">
            -{formatKr(initialExpense.amount)}
          </div>
        </div>

        {/* EDIT FORM or DETAILS VIEW */}
        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4 mb-5">
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Namn på utgift</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Månatligt belopp (kr)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] tabular-nums transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[var(--text-muted)] font-medium">Dragningsdag</label>
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
                  <label className="text-[var(--text-muted)] font-medium">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Betalsätt</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
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
                <span className="text-[var(--text-muted)]">Kategori</span>
                <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <CategoryIcon category={initialExpense.category} size={13} />
                  <span>{initialExpense.category}</span>
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Dragningsdag</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  Den {initialExpense.dueDay}:e varje månad
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
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs animate-fade-in">
                <span className="font-medium text-rose-700 dark:text-rose-300">Ta bort &quot;{initialExpense.name}&quot; permanent?</span>
                <div className="flex items-center gap-1.5">
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
                    Ja, ta bort
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
