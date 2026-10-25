import React, { useState, useEffect } from 'react';
import { X, Trash, CalendarBlank, Tag, CreditCard } from '@phosphor-icons/react';
import { FixedExpenseItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { getLogoUrl } from '../../utils/logo';

interface FixedExpenseModalProps {
  isOpen: boolean;
  initialExpense?: FixedExpenseItem | null;
  onClose: () => void;
  onSave: (data: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate?: (item: FixedExpenseItem) => void;
  onDelete?: (id: string) => void;
}

const CATEGORIES = [
  'Boende',
  'Lån & Krediter',
  'Räkningar',
  'Försäkring',
  'Hälsa',
  'Abonnemang',
  'Övrigt',
];

const PAYMENT_METHODS = ['Autogiro', 'Faktura', 'E-faktura', 'Bankgiro', 'Kort', 'Swish', 'Övrigt'];

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  initialExpense,
  onClose,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState(27);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState('Autogiro');

  useEffect(() => {
    if (isOpen) {
      if (initialExpense) {
        setName(initialExpense.name);
        setAmount(String(initialExpense.amount));
        setDueDay(initialExpense.dueDay || 27);
        setCategory(initialExpense.category || CATEGORIES[0]);
        setPaymentMethod(initialExpense.paymentMethod || 'Autogiro');
      } else {
        setName('');
        setAmount('');
        setDueDay(27);
        setCategory(CATEGORIES[0]);
        setPaymentMethod('Autogiro');
      }
    }
  }, [isOpen, initialExpense]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialExpense);
  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.'));
    const cleanName = name.trim();
    if (!cleanName || isNaN(val) || val <= 0) return;

    const resolvedLogo = getLogoUrl(cleanName, category);

    if (initialExpense && onUpdate) {
      onUpdate({
        ...initialExpense,
        name: cleanName,
        amount: val,
        dueDay,
        category,
        paymentMethod,
        logo: resolvedLogo,
      });
    } else {
      onSave({
        name: cleanName,
        amount: val,
        dueDay,
        category,
        paymentMethod,
        logo: resolvedLogo,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (initialExpense && onDelete) {
      onDelete(initialExpense.id);
      onClose();
    }
  };

  const numericPreview = parseFloat(amount.replace(',', '.'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            {isEditing ? 'Detaljer för fast utgift' : 'Lägg till fast utgift'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isEditing && initialExpense && (
          <div className="mb-5 p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ItemLogo
                name={name.trim() || initialExpense.name}
                category={category}
                logoUrl={
                  name.trim() === initialExpense.name
                    ? initialExpense.logo
                    : undefined
                }
                size="lg"
              />
              <div className="min-w-0">
                <span className="font-display font-bold text-base text-[var(--text-primary)] block truncate">
                  {name.trim() || initialExpense.name}
                </span>
                <span className="text-xs text-[var(--text-muted)] block truncate">
                  Den {dueDay}:e · {category} · {paymentMethod}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display font-extrabold text-xl text-[var(--text-primary)] tabular-nums block">
                -{!isNaN(numericPreview) && numericPreview > 0 ? formatKr(numericPreview) : formatKr(initialExpense.amount)}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                / månad
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Mottagare / Utgift
            </label>
            <div className="flex items-center gap-2.5">
              {!isEditing && (
                <ItemLogo
                  name={name.trim() || category}
                  category={category}
                  size="md"
                />
              )}
              <input
                type="text"
                required
                placeholder="t.ex. Hyra, CSN, Vattenfall, Spotify"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Månatligt belopp (kr)
            </label>
            <input
              type="text"
              required
              placeholder="0 kr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-lg font-display font-bold text-[var(--text-primary)] tabular-nums focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-1">
                <CalendarBlank size={12} />
                <span>Dragningsdag</span>
              </label>
              <select
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-none"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Den {d}:e
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-1">
                <Tag size={12} />
                <span>Kategori</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-none"
              >
                {Array.from(new Set([...CATEGORIES, category])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-1">
              <CreditCard size={12} />
              <span>Betalsätt</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-none"
            >
              {Array.from(new Set([...PAYMENT_METHODS, paymentMethod])).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex items-center gap-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-500/20 transition-colors"
                title="Ta bort utgift"
              >
                <Trash size={15} />
                <span>Ta bort</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Stäng
            </button>

            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 transition-opacity"
            >
              {isEditing ? 'Spara ändringar' : 'Spara kostnad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
