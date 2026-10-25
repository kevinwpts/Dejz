import React, { useState, useEffect } from 'react';
import { X, Trash, CalendarBlank, Tag, NotePencil, EyeSlash } from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { getLogoUrl } from '../../utils/logo';
import {
  getSwedishDateStr,
  formatSwedishDateHeading,
  formatSwedishFullDate,
} from '../../utils/swedishDate';

interface TransactionModalProps {
  isOpen: boolean;
  initialTransaction?: TransactionItem | null;
  onClose: () => void;
  onSave: (data: Omit<TransactionItem, 'id'>) => void;
  onUpdate?: (tx: TransactionItem) => void;
  onDelete?: (id: string) => void;
  onExclude?: (id: string, exclude: boolean) => void;
}

const CATEGORIES = ['Mat', 'Fika & Restaurang', 'Transport', 'Nöje', 'Shopping', 'Hälsa', 'Hem & Vardag', 'Köp', 'Övrigt'];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialTransaction,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onExclude,
}) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [date, setDate] = useState(() => getSwedishDateStr());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialTransaction) {
        setTitle(initialTransaction.title);
        setAmount(String(initialTransaction.amount));
        setCategory(initialTransaction.category || CATEGORIES[0]);
        setDate(initialTransaction.date || getSwedishDateStr());
        setNote(initialTransaction.note || '');
      } else {
        setTitle('');
        setAmount('');
        setCategory(CATEGORIES[0]);
        setDate(getSwedishDateStr());
        setNote('');
      }
    }
  }, [isOpen, initialTransaction]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialTransaction);
  const isBankTx = Boolean(initialTransaction && initialTransaction.id.startsWith('bank-'));
  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBankTx) return;
    const val = parseFloat(amount.replace(',', '.'));
    const cleanTitle = title.trim();
    if (!cleanTitle || isNaN(val) || val <= 0) return;

    const resolvedLogo = getLogoUrl(cleanTitle, category);

    if (initialTransaction && onUpdate) {
      onUpdate({
        ...initialTransaction,
        title: cleanTitle,
        amount: val,
        category,
        date,
        note: note.trim() || undefined,
        logo: resolvedLogo,
      });
    } else {
      onSave({
        title: cleanTitle,
        amount: val,
        category,
        date,
        note: note.trim() || undefined,
        logo: resolvedLogo,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (initialTransaction && onDelete) {
      onDelete(initialTransaction.id);
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
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
            {isEditing ? 'Transaktionsdetaljer' : 'Registrera köp'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Summary hero card when viewing/editing a transaction */}
        {isEditing && initialTransaction && (
          <div className="mb-5 space-y-2.5">
            <div className="p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ItemLogo
                  name={title.trim() || initialTransaction.title}
                  category={category}
                  logoUrl={
                    title.trim() === initialTransaction.title
                      ? initialTransaction.logo
                      : undefined
                  }
                  size="lg"
                />
                <div className="min-w-0">
                  <span className="font-display font-bold text-base text-[var(--text-primary)] block truncate">
                    {title.trim() || initialTransaction.title}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] block truncate tabular-nums">
                    Betald {formatSwedishDateHeading(initialTransaction.date)} kl {getTransactionTime(initialTransaction)} · {category}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`font-display font-extrabold text-xl tabular-nums block ${
                    initialTransaction.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {initialTransaction.type === 'income' ? '+' : '-'}
                  {!isNaN(numericPreview) && numericPreview > 0 ? formatKr(numericPreview) : formatKr(initialTransaction.amount)}
                </span>
                {initialTransaction.id.startsWith('bank-') && (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                    Banktransaktion
                  </span>
                )}
              </div>
            </div>

            {/* Bankens bokföringsstatus & bokföringsdatum */}
            {(initialTransaction.id.startsWith('bank-') || initialTransaction.bookingDate || initialTransaction.bookingStatus) && (
              <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)]/70 border border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  {initialTransaction.bookingStatus === 'PDNG' || initialTransaction.bookingStatus === 'HOLD'
                    ? 'Bankstatus'
                    : 'Bokförd hos banken'}
                </span>
                <span className="font-semibold text-[var(--text-secondary)]">
                  {initialTransaction.bookingStatus === 'PDNG' || initialTransaction.bookingStatus === 'HOLD' ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      Preliminär reservation (ej bokförd ännu)
                    </span>
                  ) : initialTransaction.bookingDate ? (
                    formatSwedishFullDate(initialTransaction.bookingDate)
                  ) : (
                    'Bokförd'
                  )}
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isBankTx && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-semibold text-center">
              Banktransaktion från Enable Banking (kan ej redigeras)
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Butik / Inköp
            </label>
            <div className="flex items-center gap-2.5">
              {!isEditing && (
                <ItemLogo
                  name={title.trim() || category}
                  category={category}
                  size="md"
                />
              )}
              <input
                type="text"
                required
                disabled={isBankTx}
                placeholder="t.ex. ICA, Spotify, Circle K, SL"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-sm font-medium text-[var(--text-primary)] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Belopp (kr)
            </label>
            <input
              type="text"
              required
              disabled={isBankTx}
              placeholder="0 kr"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-lg font-display font-bold text-[var(--text-primary)] tabular-nums focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-1">
                <Tag size={12} />
                <span>Kategori</span>
              </label>
              <select
                value={category}
                disabled={isBankTx}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {Array.from(new Set([...CATEGORIES, category])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-1">
                <CalendarBlank size={12} />
                <span>Datum</span>
              </label>
              <input
                type="date"
                value={date}
                disabled={isBankTx}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-1">
              <NotePencil size={12} />
              <span>Anteckning (valfritt)</span>
            </label>
            <input
              type="text"
              placeholder="Lägg till en notering..."
              value={note}
              disabled={isBankTx}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            {isEditing && initialTransaction && initialTransaction.id.startsWith('bank-') ? (
              <button
                type="button"
                onClick={() => {
                  const currentlyExcluded = initialTransaction.isExcluded;
                  if (onExclude) {
                    onExclude(initialTransaction.id, !currentlyExcluded);
                  }
                  onClose();
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  initialTransaction.isExcluded
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                }`}
                title={initialTransaction.isExcluded ? 'Inkludera i budget igen' : 'Exkludera från budget'}
              >
                <EyeSlash size={15} />
                <span>{initialTransaction.isExcluded ? 'Inkludera' : 'Exkludera'}</span>
              </button>
            ) : isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-rose-500/20 transition-colors"
                title="Ta bort köp"
              >
                <Trash size={15} />
                <span>Ta bort</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Stäng
            </button>

            {!isBankTx && (
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold hover:opacity-90 transition-opacity"
              >
                {isEditing ? 'Spara ändringar' : 'Spara utgift'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
