import React, { useState, useRef } from 'react';
import {
  X,
  Bank,
  Code,
  CaretDown,
  CaretUp,
  Check,
  Copy,
  ArrowsLeftRight,
  EyeSlash,
  ArrowsClockwise,
  Heart,
  Paperclip,
  Trash,
  FileText,
  Eye,
} from '@phosphor-icons/react';
import { TransactionItem, getTransactionTime, FixedExpenseItem, IncomeItem } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import {
  formatSwedishDateHeading,
  formatSwedishFullDate,
} from '../../utils/swedishDate';
import { isInternalTransferTransaction } from '../../utils/transferDetection';
import { checkIsRecurringTransaction } from '../../utils/recurring';

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
  onExclude,
  onMarkAsFixed,
  onToggleHeart,
  isInternalTransfer: propIsInternalTransfer,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !initialTransaction) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const isIncome = initialTransaction.type === 'income';
  const txTime = getTransactionTime(initialTransaction);
  const isDetectedTransfer =
    propIsInternalTransfer ?? isInternalTransferTransaction(initialTransaction);
  const isExcluded = Boolean(initialTransaction.isExcluded);
  const recurringStatus = checkIsRecurringTransaction(
    initialTransaction,
    fixedExpenses,
    incomes
  );

  const rawJsonData = initialTransaction.rawJson || {
    id: initialTransaction.id,
    title: initialTransaction.title,
    amount: initialTransaction.amount,
    date: initialTransaction.date,
    bookingDate: initialTransaction.bookingDate,
    bookingStatus: initialTransaction.bookingStatus,
    description: initialTransaction.rawDescription || initialTransaction.note,
  };

  const handleCopyJson = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(rawJsonData, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore
    }
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg my-auto bg-[var(--surface-color)] rounded-t-3xl sm:rounded-2xl p-6 border border-[var(--border-subtle)] shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-bold text-base text-[var(--text-primary)]">
              Transaktionsdetaljer
            </h3>
            {initialTransaction.id.startsWith('bank-') && (
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-semibold border border-blue-500/20 flex items-center gap-1">
                <Bank size={11} />
                Enable Banking
              </span>
            )}
            {recurringStatus.isRecurring && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-500/20 flex items-center gap-1">
                <ArrowsClockwise size={11} weight="bold" />
                Återkommande {recurringStatus.type === 'income' ? 'inkomst' : 'fast utgift'}
              </span>
            )}
            {isDetectedTransfer && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20 flex items-center gap-1">
                <ArrowsLeftRight size={11} />
                Intern överföring
              </span>
            )}
            {isExcluded && (
              <span className="px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 text-[10px] font-semibold border border-slate-500/30 flex items-center gap-1">
                <EyeSlash size={11} />
                Exkluderad
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
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
              className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Summary hero card */}
        <div className="mb-4 p-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <ItemLogo
              name={initialTransaction.title}
              category={initialTransaction.category}
              logoUrl={initialTransaction.logo}
              size="lg"
              isRecurring={recurringStatus.isRecurring}
            />
            <div className="min-w-0">
              <span className="font-display font-bold text-base text-[var(--text-primary)] block truncate">
                {initialTransaction.title}
              </span>
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 truncate tabular-nums">
                <span>{formatSwedishDateHeading(initialTransaction.date)} kl {txTime} ·</span>
                <span className="inline-flex items-center gap-1">
                  <CategoryIcon category={initialTransaction.category} size={11} />
                  <span>{initialTransaction.category}</span>
                </span>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span
              className={`font-display font-extrabold text-xl tabular-nums block ${
                isIncome
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              {isIncome ? '+' : '-'}
              {formatKr(initialTransaction.amount)}
            </span>
          </div>
        </div>

        {/* Kvitto & Bilaga */}
        <div className="p-3.5 mb-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Paperclip size={14} className="text-[var(--text-secondary)]" />
              <span>Kvitto eller fil</span>
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
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
              {initialTransaction.receiptUrl.startsWith('data:image/') ? (
                <img
                  src={initialTransaction.receiptUrl}
                  alt="Kvitto"
                  className="w-12 h-12 rounded-lg object-cover border border-[var(--border-subtle)] shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <FileText size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                  {initialTransaction.receiptName || 'Bifogad fil'}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block">Kvitto tillagt</span>
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
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Paperclip size={14} />
                <span>Bifoga kvitto eller PDF...</span>
              </button>
            </div>
          )}
        </div>

        {/* Återkommande information banner */}
        {recurringStatus.isRecurring && (
          <div className="mb-4 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
              <ArrowsClockwise size={14} weight="bold" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-[var(--text-primary)] block">
                Återkommande post i Ekonomi
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 leading-relaxed">
                {recurringStatus.type === 'income'
                  ? 'Denna inkomst är registrerad som en fast inkomst i Ekonomifliken och ingår i budgetperiodens totala inkomst.'
                  : 'Denna utgift är registrerad som en fast utgift i Ekonomifliken och räknas in i "Fasta utgifter" för månaden.'}
              </span>
            </div>
          </div>
        )}

        {/* Markera som fast utgift / inkomst om ej redan återkommande */}
        {!recurringStatus.isRecurring && onMarkAsFixed && (
          <div className="p-3.5 mb-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <ArrowsClockwise size={14} className="text-indigo-500" />
                <span>{isIncome ? 'Markera som fast inkomst' : 'Markera som fast utgift'}</span>
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                {isIncome
                  ? 'Lägg till i Fasta inkomster för att automatiskt inkludera i budgetperioden.'
                  : 'Lägg till i Fasta utgifter för att ha full kontroll på dina återkommande kostnader.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onMarkAsFixed(initialTransaction, isIncome ? 'income' : 'expense')}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 transition-colors cursor-pointer"
            >
              {isIncome ? 'Gör till fast' : 'Gör till fast'}
            </button>
          </div>
        )}

        {/* Exkludera från budget & dölj-kontroll */}
        {onExclude && (
          <div className="p-3.5 mb-4 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <EyeSlash size={14} className={isExcluded ? 'text-amber-500' : 'text-[var(--text-muted)]'} />
                {isExcluded ? 'Exkluderad från budget' : 'Exkludera från budget'}
              </span>
              <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">
                {isExcluded
                  ? 'Påverkar inte "Kvar att spendera" och är dold från översikten.'
                  : 'Dölj från appen och räkna inte med i "Kvar att spendera".'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onExclude(initialTransaction.id, !isExcluded)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                isExcluded
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              {isExcluded ? 'Inkludera igen' : 'Exkludera'}
            </button>
          </div>
        )}

        {/* 1. Allmän översikt */}
        <div className="space-y-4 mb-5">
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)] text-xs">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Mottagare / Butik</span>
              <span className="font-semibold text-[var(--text-primary)] text-right truncate">
                {initialTransaction.title}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Belopp</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                {isIncome ? '+' : '-'}
                {formatKr(initialTransaction.amount)}
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Kategori</span>
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <CategoryIcon category={initialTransaction.category} size={13} />
                <span>{initialTransaction.category}</span>
              </span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <span className="text-[var(--text-muted)]">Köptillfälle (Datum & tid)</span>
              <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                {formatSwedishFullDate(initialTransaction.date)} · kl {txTime}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Open Banking / Rådata avsnitt */}
        {initialTransaction.id.startsWith('bank-') && (
          <div className="border-t border-[var(--border-subtle)] pt-4 mt-2">
            <button
              type="button"
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-between transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Code size={15} className="text-[var(--text-primary)]" />
                <span>Visa rådata från Enable Banking (JSON)</span>
              </span>
              {showRawJson ? <CaretUp size={14} /> : <CaretDown size={14} />}
            </button>

            {showRawJson && (
              <div className="mt-3 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="text-[var(--text-muted)] font-mono text-[11px]">Payload (JSON)</span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:opacity-80 transition-opacity bg-[var(--surface-raised)] border border-[var(--border-subtle)] px-2 py-1 rounded-lg cursor-pointer"
                  >
                    {copiedJson ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copiedJson ? 'Kopierad!' : 'Kopiera JSON'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto max-h-60 leading-relaxed scrollbar-thin">
                  {JSON.stringify(rawJsonData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
