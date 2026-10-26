import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bank,
  Heart,
  Paperclip,
  Trash,
  FileText,
  Eye,
  EyeSlash,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime, FixedExpenseItem, IncomeItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { formatSwedishFullDate } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../constants';

interface TransactionModalProps {
  isOpen: boolean;
  initialTransaction?: TransactionItem | null;
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  onClose: () => void;
  onSave?: (data: Omit<TransactionItem, 'id'>) => void;
  onUpdate?: (tx: TransactionItem) => void;
  onDelete?: (id: string) => void;
  onExclude?: (id: string, exclude: boolean) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: 'expense' | 'income') => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  isInternalTransfer?: boolean;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialTransaction,
  fixedExpenses = [],
  incomes = [],
  onClose,
  onUpdate,
  onDelete,
  onExclude,
  onMarkAsFixed,
  onToggleHeart,
  isInternalTransfer: _propIsInternalTransfer,
}) => {
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTransaction) {
      setNote(initialTransaction.note || '');
      setCategory(initialTransaction.category || (initialTransaction.type === 'income' ? 'Lön' : 'Övrigt'));
    }
  }, [initialTransaction]);

  if (!isOpen || !initialTransaction) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const isIncome = initialTransaction.type === 'income';
  const txTime = getTransactionTime(initialTransaction);
  const isExcluded = Boolean(initialTransaction.isExcluded);
  const recurringStatus = checkIsRecurringTransaction(
    initialTransaction,
    fixedExpenses,
    incomes
  );

  const availableCategories = isIncome ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;

  const handleNoteChange = (newNote: string) => {
    setNote(newNote);
    if (onUpdate) {
      onUpdate({
        ...initialTransaction,
        note: newNote,
        category,
      });
    }
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    if (onUpdate) {
      onUpdate({
        ...initialTransaction,
        note,
        category: newCat,
      });
    }
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
          <div className="flex items-center gap-2">
            {initialTransaction.id.startsWith('bank-') && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-500/20 flex items-center gap-1">
                <Bank size={11} />
                Bank
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleHeart && (
              <button
                type="button"
                onClick={() => onToggleHeart(initialTransaction.id, !initialTransaction.isHearted)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  initialTransaction.isHearted
                    ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
                title={initialTransaction.isHearted ? 'Ta bort hjärtmarkering' : 'Hjärtmarkera transaktion'}
              >
                <Heart
                  size={18}
                  weight={initialTransaction.isHearted ? 'fill' : 'regular'}
                  className={initialTransaction.isHearted ? 'text-rose-500' : ''}
                />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hero Receipt Header */}
        <div className="text-center mb-6 pb-6 border-b border-[var(--border-subtle)]">
          <div className="flex justify-center mb-3">
            <ItemLogo
              name={initialTransaction.title}
              category={category}
              logoUrl={initialTransaction.logo}
              size="lg"
              isRecurring={recurringStatus.isRecurring}
            />
          </div>
          <h2 className="font-display font-bold text-xl text-[var(--text-primary)] mb-1 truncate px-2">
            {initialTransaction.title}
          </h2>
          <div className="text-xs text-[var(--text-muted)] flex items-center justify-center gap-1.5 mb-3">
            <span>{formatSwedishFullDate(initialTransaction.date)} · kl {txTime}</span>
          </div>
          <div
            className={`font-display font-extrabold text-3xl tabular-nums ${
              isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--text-primary)]'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatKr(initialTransaction.amount)}
          </div>
        </div>

        {/* Editable Fields: Category & Note */}
        <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-4 text-xs mb-5">
          {/* Category Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--text-muted)] font-medium">Kategori</label>
            <div className="relative">
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
                {!availableCategories.some((c) => c.name === category) && category && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>
          </div>

          {/* Editable Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[var(--text-muted)] font-medium">Anteckning</label>
            <input
              type="text"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Skriv en anteckning..."
              className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
            />
          </div>
        </div>

        {/* Kvitto / Bilaga Section */}
        <div className="mb-5 p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Paperclip size={14} className="text-[var(--text-secondary)]" />
              <span>Kvitto eller bilaga</span>
            </span>
            {initialTransaction.receiptUrl && onUpdate && (
              <button
                type="button"
                onClick={() => {
                  onUpdate({
                    ...initialTransaction,
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

          {initialTransaction.receiptUrl ? (
            <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
              {initialTransaction.receiptUrl.startsWith('data:image/') ? (
                <img
                  src={initialTransaction.receiptUrl}
                  alt="Kvitto"
                  className="w-10 h-10 rounded-lg object-cover border border-[var(--border-subtle)] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <FileText size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                  {initialTransaction.receiptName || 'Bifogad fil'}
                </span>
              </div>
              <a
                href={initialTransaction.receiptUrl}
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
                        ...initialTransaction,
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
                className="w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Paperclip size={13} />
                <span>Bifoga kvitto...</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="space-y-2 mb-2">
          <div className="grid grid-cols-2 gap-2">
            {onExclude && (
              <button
                type="button"
                onClick={() => onExclude(initialTransaction.id, !isExcluded)}
                className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                  isExcluded
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <EyeSlash size={14} />
                <span>{isExcluded ? 'Inkludera i budget' : 'Exkludera'}</span>
              </button>
            )}

            {!recurringStatus.isRecurring && onMarkAsFixed && (
              <button
                type="button"
                onClick={() => onMarkAsFixed(initialTransaction, isIncome ? 'income' : 'expense')}
                className="py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ArrowsClockwise size={14} />
                <span>{isIncome ? 'Gör till fast inkomst' : 'Gör till fast utgift'}</span>
              </button>
            )}
          </div>

          {onDelete && (
            <div>
              {showDeleteConfirm ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-rose-700 dark:text-rose-300">Ta bort transaktion permanent?</span>
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
                      onClick={() => onDelete(initialTransaction.id)}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer"
                    >
                      Ja, ta bort
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 px-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash size={14} />
                  <span>Ta bort transaktion</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
