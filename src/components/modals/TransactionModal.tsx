import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Heart,
  Package,
  Paperclip,
  Trash,
  PencilSimple,
  FileText,
  Eye,
  EyeSlash,
  ArrowsClockwise,
  CaretDown,
  Check,
  Bank,
  UserPlus,
  ShareNetwork,
  Copy,
  ChatCircleText,
  QrCode,
} from '@phosphor-icons/react';
import QRCode from 'qrcode';
import { SwishLogo } from '../SwishLogo';
import {
  TransactionItem,
  getTransactionTime,
  FixedExpenseItem,
  IncomeItem,
  AccountItem,
} from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon } from '../CategoryIcon';
import { formatSwedishFullDate } from '../../utils/swedishDate';
import { checkIsRecurringTransaction } from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  syncAllUserPreferencesToSupabase,
} from '../../utils/appCache';

interface TransactionModalProps {
  isOpen: boolean;
  initialTransaction?: TransactionItem | null;
  accounts?: AccountItem[];
  fixedExpenses?: FixedExpenseItem[];
  incomes?: IncomeItem[];
  onClose: () => void;
  onSave?: (data: Omit<TransactionItem, 'id'>) => void;
  onUpdate?: (tx: TransactionItem) => void;
  onDelete?: (id: string) => void;
  onExclude?: (id: string, exclude: boolean) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: 'expense' | 'income') => void;
  onToggleHeart?: (id: string, isHearted: boolean) => void;
  onTogglePackage?: (id: string, isWaitingForPackage: boolean) => void;
  isInternalTransfer?: boolean;
}

function getDefaultPaymentMethodForTx(tx: TransactionItem): string {
  if (tx.paymentMethod) return tx.paymentMethod;
  const combined = `${tx.title || ''} ${tx.category || ''} ${tx.rawDescription || ''}`.toLowerCase();
  if (combined.includes('swish')) return 'Swish';
  if (combined.includes('autogiro')) return 'Autogiro';
  if (combined.includes('klarna')) return 'Klarna';
  if (combined.includes('faktura') || combined.includes('e-faktura')) return 'Faktura';
  if (tx.type === 'income') return 'Överföring';
  return 'Kort';
}

interface SwishContact {
  id: string;
  name: string;
  phone: string;
}

const SWISH_CONTACTS_STORAGE_KEY = 'dejz_swish_contacts';
const MY_SWISH_PHONE_STORAGE_KEY = 'dejz_my_swish_phone';

function loadSwishContacts(): SwishContact[] {
  try {
    const raw = localStorage.getItem(SWISH_CONTACTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSwishContacts(contacts: SwishContact[]) {
  try {
    localStorage.setItem(SWISH_CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

function loadMySwishPhone(): string {
  try {
    return localStorage.getItem(MY_SWISH_PHONE_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveMySwishPhone(phone: string) {
  try {
    localStorage.setItem(MY_SWISH_PHONE_STORAGE_KEY, phone);
    syncAllUserPreferencesToSupabase();
  } catch {
    // ignore
  }
}

export function normalizeSwedishSwishNumber(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0046') && digits.length > 4) {
    return '0' + digits.slice(4);
  }
  if (digits.startsWith('46') && digits.length >= 10) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  initialTransaction,
  accounts = [],
  fixedExpenses = [],
  incomes = [],
  onClose,
  onUpdate,
  onDelete,
  onExclude,
  onMarkAsFixed,
  onToggleHeart,
  onTogglePackage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [date, setDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Kort');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swish / Be om Swish state
  const [isSwishOpen, setIsSwishOpen] = useState(false);
  const [swishMode, setSwishMode] = useState<'request' | 'send'>('request');
  const [swishAmount, setSwishAmount] = useState<number>(0);
  const [swishPhone, setSwishPhone] = useState('');
  const [swishRecipientName, setSwishRecipientName] = useState('');
  const [swishMessage, setSwishMessage] = useState('');
  const [swishContacts, setSwishContacts] = useState<SwishContact[]>(() => loadSwishContacts());
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [swishFeedback, setSwishFeedback] = useState<string | null>(null);
  const [mySwishPhone, setMySwishPhone] = useState<string>(() => loadMySwishPhone());
  const [isEditingMyPhone, setIsEditingMyPhone] = useState<boolean>(() => !loadMySwishPhone());
  const [showSwishQr, setShowSwishQr] = useState<boolean>(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isIncome = initialTransaction?.type === 'income';

  const availableCategories = useMemo(() => {
    const list = isIncome ? getStoredIncomeCategories() : getStoredExpenseCategories();
    return list.map((c) => c.name);
  }, [isOpen, isIncome]);

  const availablePaymentMethods = useMemo(() => {
    const stored = getStoredPaymentMethods().map((m) => m.name);
    if (paymentMethod && !stored.includes(paymentMethod)) {
      return [...stored, paymentMethod];
    }
    return stored;
  }, [isOpen, paymentMethod]);

  useEffect(() => {
    if (initialTransaction) {
      setTitle(initialTransaction.title || '');
      setAmount(initialTransaction.amount);
      setDate(initialTransaction.date || '');
      setPaymentMethod(getDefaultPaymentMethodForTx(initialTransaction));
      setNote(initialTransaction.note || '');
      const kind = initialTransaction.type === 'income' ? 'income' : 'expense';
      setCategory(
        normalizeCategoryToValid(
          initialTransaction.category || (kind === 'income' ? 'Lön' : 'Övrigt'),
          kind
        )
      );
      setIsEditing(false);
      setIsCatDropdownOpen(false);
      setShowDeleteConfirm(false);
      setIsSwishOpen(false);
      setSwishMode('request');
      setSwishAmount(Math.max(1, Math.round(initialTransaction.amount / 2)));
      setSwishMessage(initialTransaction.title || '');
      setSwishFeedback(null);
      setIsAddingContact(false);
      const storedMyPhone = loadMySwishPhone();
      setMySwishPhone(storedMyPhone);
      setIsEditingMyPhone(!storedMyPhone);
      setShowSwishQr(true);
    }
  }, [initialTransaction, isOpen]);

  const normalizedMySwishPhone = useMemo(
    () => normalizeSwedishSwishNumber(mySwishPhone),
    [mySwishPhone]
  );

  const cleanSwishMessage = useMemo(() => {
    const rawMsg = swishMessage || initialTransaction?.title || '';
    return rawMsg.replace(/;/g, ' ').trim().slice(0, 50);
  }, [swishMessage, initialTransaction?.title]);

  useEffect(() => {
    let cancelled = false;
    if (!isSwishOpen || swishMode !== 'request' || normalizedMySwishPhone.length < 7) {
      setQrDataUrl(null);
      return;
    }
    const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
    // Officiellt Swish QR-format: C<mottagare>;<belopp>;<meddelande>;0 (0 = låst/100% förifyllt)
    const swishQrPayload = `C${normalizedMySwishPhone};${amt};${cleanSwishMessage};0`;
    QRCode.toDataURL(swishQrPayload, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#09090B',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isSwishOpen, swishMode, normalizedMySwishPhone, swishAmount, cleanSwishMessage]);

  const resolvedAccountDisplay = useMemo(() => {
    if (!initialTransaction) return null;
    if (initialTransaction.bankAccountName) return initialTransaction.bankAccountName;

    if (accounts.length > 0) {
      const checking = accounts.find((a) => a.type === 'checking') || accounts[0];
      return `${checking.bankName} · ${checking.name}`;
    }

    return null;
  }, [initialTransaction, accounts]);

  if (!isOpen || !initialTransaction) return null;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const txTime = getTransactionTime(initialTransaction);
  const isExcluded = Boolean(initialTransaction.isExcluded);
  const recurringStatus = checkIsRecurringTransaction(
    initialTransaction,
    fixedExpenses,
    incomes
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = Math.max(0, Math.round(Number(amount) || 0));
    if (!title.trim() || numAmt <= 0) return;

    if (onUpdate) {
      onUpdate({
        ...initialTransaction,
        title: title.trim(),
        amount: numAmt,
        date: date || initialTransaction.date,
        category,
        paymentMethod,
        note: note.trim() || undefined,
      });
    }
    setIsEditing(false);
    onClose();
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(initialTransaction.id);
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
          <div className="flex items-center gap-1.5">
            {onTogglePackage && (
              <button
                type="button"
                onClick={() =>
                  onTogglePackage(
                    initialTransaction.id,
                    !initialTransaction.isWaitingForPackage
                  )
                }
                title="Väntar på paket"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                  initialTransaction.isWaitingForPackage
                    ? 'text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20'
                    : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Package
                  size={16}
                  weight={initialTransaction.isWaitingForPackage ? 'fill' : 'regular'}
                  className={initialTransaction.isWaitingForPackage ? 'text-amber-500' : ''}
                />
              </button>
            )}
            {onToggleHeart && (
              <button
                type="button"
                onClick={() =>
                  onToggleHeart(initialTransaction.id, !initialTransaction.isHearted)
                }
                title="Spara köp"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                  initialTransaction.isHearted
                    ? 'text-rose-500 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                    : 'bg-[var(--bg-color)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Heart
                  size={16}
                  weight={initialTransaction.isHearted ? 'fill' : 'regular'}
                  className={initialTransaction.isHearted ? 'text-rose-500' : ''}
                />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hero Receipt Header (Clean: Logo + Full Name + Amount, matching FixedExpenseModal) */}
        <div className="text-center mb-5 pb-5 border-b border-[var(--border-subtle)]">
          <div className="flex justify-center mb-3">
            <ItemLogo
              name={initialTransaction.title}
              category={category}
              logoUrl={initialTransaction.logo}
              size="lg"
              isRecurring={recurringStatus.isRecurring}
            />
          </div>
          <h2 className="font-display font-bold text-lg sm:text-xl text-[var(--text-primary)] mb-2 break-words px-2">
            {initialTransaction.title}
          </h2>
          <div
            className={`font-display font-extrabold text-3xl tabular-nums ${
              isIncome
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {isIncome ? '+' : '-'}
            {formatKr(initialTransaction.amount)}
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
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
                  <label className="text-[var(--text-muted)] font-medium">Datum</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition-colors cursor-pointer"
                  />
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

              <div className="flex flex-col gap-1.5">
                <label className="text-[var(--text-muted)] font-medium">Anteckning</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Lägg till anteckning..."
                  className="w-full py-2.5 px-3.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              {(onExclude || (!recurringStatus.isRecurring && onMarkAsFixed)) && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {onExclude && (
                    <button
                      type="button"
                      onClick={() => onExclude(initialTransaction.id, !isExcluded)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                        isExcluded
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--surface-color)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <EyeSlash size={13} />
                      <span>{isExcluded ? 'Inkludera' : 'Exkludera'}</span>
                    </button>
                  )}

                  {!recurringStatus.isRecurring && onMarkAsFixed && (
                    <button
                      type="button"
                      onClick={() =>
                        onMarkAsFixed(initialTransaction, isIncome ? 'income' : 'expense')
                      }
                      className="py-2 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                    >
                      <ArrowsClockwise size={13} />
                      <span>Gör till fast</span>
                    </button>
                  )}
                </div>
              )}
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
                  <CategoryIcon category={category} size={13} />
                  <span>{category}</span>
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[var(--text-muted)]">Datum</span>
                <span className="font-semibold text-[var(--text-primary)] tabular-nums">
                  {formatSwedishFullDate(initialTransaction.date)} · {txTime}
                </span>
              </div>

              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <span className="text-[var(--text-muted)]">Betalsätt</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {paymentMethod}
                </span>
              </div>

              {initialTransaction.note && (
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[var(--text-muted)] shrink-0">Anteckning</span>
                  <span className="font-semibold text-[var(--text-primary)] text-right break-words">
                    {initialTransaction.note}
                  </span>
                </div>
              )}
            </div>

            {/* Kvitto / Faktura Section */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Paperclip size={14} className="text-[var(--text-secondary)]" />
                  <span>Kvitto</span>
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
                      className="w-9 h-9 rounded-lg object-cover border border-[var(--border-subtle)] shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                      <FileText size={16} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-[var(--text-primary)] block truncate">
                      {initialTransaction.receiptName || 'Kvitto'}
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
                    className="w-full py-2 px-3 rounded-xl border border-dashed border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Paperclip size={13} />
                    <span>Bifoga kvitto</span>
                  </button>
                </div>
              )}
            </div>

            {/* Swisha / Be om Swish Section */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-3">
              <button
                type="button"
                onClick={() => setIsSwishOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
              >
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">
                    <SwishLogo size={18} />
                  </span>
                  <span>Swisha / Be om Swish</span>
                </span>
                <CaretDown
                  size={13}
                  weight="bold"
                  className={`text-[var(--text-muted)] transition-transform duration-200 ${
                    isSwishOpen ? 'rotate-180 text-[var(--text-primary)]' : ''
                  }`}
                />
              </button>

              {isSwishOpen && (
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-3 animate-fade-in text-xs">
                  {/* Växla mellan Be om Swish och Swisha */}
                  <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setSwishMode('request')}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        swishMode === 'request'
                          ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Be om Swish
                    </button>
                    <button
                      type="button"
                      onClick={() => setSwishMode('send')}
                      className={`py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        swishMode === 'send'
                          ? 'bg-[var(--text-primary)] text-[var(--bg-color)] font-bold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      Swisha
                    </button>
                  </div>

                  {/* Snabbval för uppdelning av beloppet */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] block">
                      Belopp att {swishMode === 'request' ? 'be om' : 'swisha'}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        {
                          label: 'Dela lika (50%)',
                          val: Math.max(1, Math.round(initialTransaction.amount / 2)),
                        },
                        {
                          label: 'En tredjedel',
                          val: Math.max(1, Math.round(initialTransaction.amount / 3)),
                        },
                        {
                          label: 'Hela (100%)',
                          val: Math.max(1, Math.round(initialTransaction.amount)),
                        },
                      ].map((opt) => {
                        const isSel = Number(swishAmount) === opt.val;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setSwishAmount(opt.val)}
                            className={`py-2 px-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                              isSel
                                ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                                : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                            }`}
                          >
                            <span className="block truncate">{opt.label}</span>
                            <span className="font-display font-bold tabular-nums block mt-0.5">
                              {opt.val} kr
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                          Valfritt belopp (kr)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={swishAmount}
                          onChange={(e) => setSwishAmount(Math.max(0, Number(e.target.value) || 0))}
                          className="w-full py-2 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[var(--text-muted)] block mb-1">
                          Meddelande
                        </label>
                        <input
                          type="text"
                          value={swishMessage}
                          onChange={(e) => setSwishMessage(e.target.value)}
                          placeholder={initialTransaction.title}
                          className="w-full py-2 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mitt eget Swish-nummer & QR-kod direkt på skärmen (i Be om Swish-läge) */}
                  {swishMode === 'request' && (
                    <div className="p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                          <QrCode size={14} weight="bold" />
                          <span>Mitt Swish-nummer (för QR &amp; länk)</span>
                        </span>
                        {normalizedMySwishPhone.length >= 7 && !isEditingMyPhone && (
                          <button
                            type="button"
                            onClick={() => setIsEditingMyPhone(true)}
                            className="text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Ändra ({mySwishPhone})
                          </button>
                        )}
                      </div>

                      {(isEditingMyPhone || normalizedMySwishPhone.length < 7) && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="tel"
                            value={mySwishPhone}
                            onChange={(e) => {
                              setMySwishPhone(e.target.value);
                              saveMySwishPhone(e.target.value.trim());
                            }}
                            placeholder="Ditt mobilnummer (t.ex. 070-123 45 67)"
                            className="flex-1 py-2 px-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--text-primary)]"
                          />
                          {normalizedMySwishPhone.length >= 7 && (
                            <button
                              type="button"
                              onClick={() => {
                                saveMySwishPhone(mySwishPhone.trim());
                                setIsEditingMyPhone(false);
                                setShowSwishQr(true);
                              }}
                              className="py-2 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold shrink-0 cursor-pointer"
                            >
                              Klar
                            </button>
                          )}
                        </div>
                      )}

                      {normalizedMySwishPhone.length >= 7 ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setShowSwishQr((prev) => !prev)}
                            className="w-full py-2 px-3 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5">
                              <QrCode size={14} weight="bold" />
                              <span>
                                {showSwishQr ? 'Dölj Swish QR-kod' : 'Visa Swish QR-kod på skärmen'}
                              </span>
                            </span>
                            <span className="text-[11px] font-bold text-[var(--text-muted)] tabular-nums">
                              {swishAmount} kr
                            </span>
                          </button>

                          {showSwishQr && qrDataUrl && (
                            <div className="p-3.5 rounded-2xl bg-white text-zinc-900 border border-zinc-200 flex flex-col items-center text-center space-y-2 shadow-sm animate-fade-in">
                              <div className="flex items-center gap-1.5">
                                <SwishLogo size={18} />
                                <span className="text-xs font-extrabold tracking-tight text-zinc-900">
                                  Skanna med Swish
                                </span>
                              </div>
                              <img
                                src={qrDataUrl}
                                alt="Swish QR-kod"
                                className="w-44 h-44 rounded-xl object-contain"
                              />
                              <div className="space-y-0.5">
                                <div className="text-sm font-extrabold tabular-nums text-zinc-900">
                                  {swishAmount} kr · {cleanSwishMessage || initialTransaction.title}
                                </div>
                                <div className="text-[11px] font-medium text-zinc-500 tabular-nums">
                                  Mottagare: {mySwishPhone} (100 % förifyllt)
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                          Fyll i ditt eget nummer en gång så ritar Dejz upp en riktig Swish QR-kod och skapar en förifylld Swish-länk i SMS.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Sparade vänner / kontakter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-[var(--text-muted)]">
                        {swishMode === 'request'
                          ? 'Vän att be om Swish (för SMS)'
                          : 'Vänner / mottagare'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAddingContact((prev) => !prev)}
                        className="text-[11px] font-semibold text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus size={13} />
                        <span>{isAddingContact ? 'Avbryt' : '+ Lägg till vän'}</span>
                      </button>
                    </div>

                    {isAddingContact && (
                      <div className="p-2.5 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            placeholder="Namn (t.ex. Emma)"
                            className="py-2 px-2.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                          />
                          <input
                            type="tel"
                            value={newContactPhone}
                            onChange={(e) => setNewContactPhone(e.target.value)}
                            placeholder="070-123 45 67"
                            className="py-2 px-2.5 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none tabular-nums"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newContactName.trim() || !newContactPhone.trim()) return;
                            const next: SwishContact[] = [
                              ...swishContacts,
                              {
                                id: `sc-${Date.now()}`,
                                name: newContactName.trim(),
                                phone: newContactPhone.trim(),
                              },
                            ];
                            setSwishContacts(next);
                            saveSwishContacts(next);
                            setSwishPhone(newContactPhone.trim());
                            setSwishRecipientName(newContactName.trim());
                            setNewContactName('');
                            setNewContactPhone('');
                            setIsAddingContact(false);
                          }}
                          className="w-full py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold cursor-pointer"
                        >
                          Spara vän
                        </button>
                      </div>
                    )}

                    {swishContacts.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        {swishContacts.map((c) => {
                          const isSelected = swishPhone === c.phone;
                          return (
                            <div
                              key={c.id}
                              className={`shrink-0 pl-2.5 pr-1.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all ${
                                isSelected
                                  ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                                  : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)]'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSwishPhone(c.phone);
                                  setSwishRecipientName(c.name);
                                }}
                                className="text-left cursor-pointer"
                              >
                                <span className="text-[11px] font-bold block leading-tight">
                                  {c.name}
                                </span>
                                <span className="text-[10px] opacity-75 tabular-nums block leading-tight">
                                  {c.phone}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = swishContacts.filter((item) => item.id !== c.id);
                                  setSwishContacts(next);
                                  saveSwishContacts(next);
                                  if (swishPhone === c.phone) {
                                    setSwishPhone('');
                                    setSwishRecipientName('');
                                  }
                                }}
                                className="p-0.5 rounded hover:opacity-70 cursor-pointer"
                                title="Ta bort vän"
                              >
                                <X size={11} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="tel"
                      value={swishPhone}
                      onChange={(e) => {
                        setSwishPhone(e.target.value);
                        setSwishRecipientName('');
                      }}
                      placeholder={
                        swishMode === 'request'
                          ? 'Vännens nummer för SMS (t.ex. 070-123 45 67)'
                          : 'Mottagarens nummer (t.ex. 070-123 45 67)'
                      }
                      className="w-full py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none focus:border-[var(--text-primary)]"
                    />
                  </div>

                  {swishFeedback && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold text-center animate-fade-in">
                      {swishFeedback}
                    </div>
                  )}

                  {/* Knappar för Be om Swish eller Öppna Swish */}
                  {swishMode === 'request' ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={(() => {
                            const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
                            const label = cleanSwishMessage || initialTransaction.title;
                            const prefilledUrl =
                              normalizedMySwishPhone.length >= 7 && typeof window !== 'undefined'
                                ? `${window.location.origin}/?swish_pay=1&payee=${encodeURIComponent(
                                    normalizedMySwishPhone
                                  )}&amount=${amt}&msg=${encodeURIComponent(label)}`
                                : '';
                            const msgText = prefilledUrl
                              ? `Hej${
                                  swishRecipientName ? ` ${swishRecipientName}` : ''
                                }! Kan du swisha ${amt} kr för ${label}?\n\nKlicka här för att öppna Swish färdigifyllt:\n${prefilledUrl}`
                              : `Hej${
                                  swishRecipientName ? ` ${swishRecipientName}` : ''
                                }! Kan du swisha ${amt} kr för ${label}?`;
                            const cleanPhone = swishPhone.replace(/[^\d+]/g, '');
                            const isIOS =
                              typeof navigator !== 'undefined' &&
                              /iPad|iPhone|iPod/i.test(navigator.userAgent);
                            const sep = isIOS ? '&' : '?';
                            return cleanPhone
                              ? `sms:${cleanPhone}${sep}body=${encodeURIComponent(msgText)}`
                              : `sms:${sep}body=${encodeURIComponent(msgText)}`;
                          })()}
                          className="py-2.5 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          <ChatCircleText size={14} weight="bold" />
                          <span>Skicka SMS med Swish-länk</span>
                        </a>

                        <button
                          type="button"
                          onClick={async () => {
                            const amt = Math.max(1, Math.round(Number(swishAmount) || 0));
                            const label = cleanSwishMessage || initialTransaction.title;
                            const prefilledUrl =
                              normalizedMySwishPhone.length >= 7 && typeof window !== 'undefined'
                                ? `${window.location.origin}/?swish_pay=1&payee=${encodeURIComponent(
                                    normalizedMySwishPhone
                                  )}&amount=${amt}&msg=${encodeURIComponent(label)}`
                                : '';
                            const msgText = prefilledUrl
                              ? `Hej${
                                  swishRecipientName ? ` ${swishRecipientName}` : ''
                                }! Kan du swisha ${amt} kr för ${label}?\n\nKlicka här för att öppna Swish färdigifyllt:\n${prefilledUrl}`
                              : `Hej${
                                  swishRecipientName ? ` ${swishRecipientName}` : ''
                                }! Kan du swisha ${amt} kr för ${label}?`;
                            try {
                              await navigator.clipboard?.writeText(msgText);
                            } catch {
                              // ignore
                            }
                            if (typeof navigator !== 'undefined' && navigator.share) {
                              try {
                                await navigator.share({
                                  title: `Swisha ${amt} kr för ${label}`,
                                  text: msgText,
                                });
                                return;
                              } catch {
                                // Fallback till urklippsbekräftelse om delning avbryts eller blockeras
                              }
                            }
                            setSwishFeedback(
                              prefilledUrl
                                ? 'Förifylld Swish-länk kopierad till urklipp!'
                                : 'Swish-förfrågan kopierad till urklipp!'
                            );
                            setTimeout(() => setSwishFeedback(null), 3000);
                          }}
                          className="py-2.5 px-3 rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                        >
                          <Copy size={14} />
                          <span>Kopiera Swish-länk</span>
                        </button>
                      </div>

                      {onUpdate &&
                        initialTransaction.type !== 'income' &&
                        Number(swishAmount) > 0 &&
                        Number(swishAmount) < initialTransaction.amount && (
                          <button
                            type="button"
                            onClick={() => {
                              const requested = Math.round(Number(swishAmount) || 0);
                              const remaining = Math.max(
                                0,
                                Math.round(initialTransaction.amount - requested)
                              );
                              const origTotal = Math.round(initialTransaction.amount);
                              const splitNote = `Delat utlägg (totalt ${origTotal} kr, bad om ${requested} kr via Swish)`;
                              onUpdate({
                                ...initialTransaction,
                                amount: remaining,
                                note: initialTransaction.note
                                  ? `${initialTransaction.note} · ${splitNote}`
                                  : splitNote,
                              });
                              setAmountStr(String(remaining));
                              setSwishFeedback(
                                `Ditt utlägg är nu satt till ${remaining} kr i budgeten!`
                              );
                              setTimeout(() => setSwishFeedback(null), 3500);
                            }}
                            className="w-full py-2 px-3 rounded-xl bg-[var(--surface-color)] border border-dashed border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Check size={13} weight="bold" />
                            <span>
                              Räkna bort {Math.round(Number(swishAmount))} kr från mitt utlägg (sätt till{' '}
                              {Math.max(0, Math.round(initialTransaction.amount - Number(swishAmount)))}{' '}
                              kr)
                            </span>
                          </button>
                        )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const cleanPhone = normalizeSwedishSwishNumber(swishPhone);
                        if (cleanPhone) {
                          navigator.clipboard?.writeText(cleanPhone).catch(() => {});
                        }
                        const payload = {
                          version: 1,
                          payee: { value: cleanPhone, editable: true },
                          amount: { value: Number(swishAmount) || 0, editable: true },
                          message: {
                            value: swishMessage || initialTransaction.title,
                            editable: true,
                          },
                        };
                        setSwishFeedback(
                          cleanPhone
                            ? `Nummer (${swishPhone}) kopierat – öppnar Swish...`
                            : 'Öppnar Swish...'
                        );
                        setTimeout(() => setSwishFeedback(null), 3000);
                        window.location.href = `swish://payment?data=${encodeURIComponent(
                          JSON.stringify(payload)
                        )}`;
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <SwishLogo size={15} />
                      <span>Öppna Swish ({swishAmount} kr)</span>
                    </button>
                  )}
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
