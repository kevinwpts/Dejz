import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Trash,
  PencilSimple,
  Check,
  CaretRight,
  CaretLeft,
  Paperclip,
  FileText,
  ClockCounterClockwise,
  Users,
  ArrowsClockwise,
  Plus,
  Scissors,
  ArrowSquareOut,
  Sparkle,
  Info,
} from '@phosphor-icons/react';
import { FixedExpenseItem, AccountItem, TransactionItem, getTransactionTime } from '../HomeTab';
import { ItemLogo } from '../ItemLogo';
import { CategoryIcon, resolveCategoryColor } from '../CategoryIcon';
import { BottomSheet } from '../ui/BottomSheet';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { DayOfMonthPicker } from '../ui/DayOfMonthPicker';
import { formatSwedishDateHeading, getItemReceipts, ReceiptAttachment } from '../../utils/swedishDate';
import {
  findMatchingFixedExpense,
  findTransactionsForFixedExpense,
  findAllMatchingFixedExpensesByMerchant,
  isFixedExpenseAmountMatch,
} from '../../utils/recurring';
import {
  getStoredExpenseCategories,
  getStoredPaymentMethods,
  normalizeCategoryToValid,
  compressImageFileToDataUrl,
} from '../../utils/appCache';
import { inferCategoryAndMethodFromName } from '../../utils/bankHistoryAnalyzer';
import { fetchLogoForName, getLearnedBrandCategory } from '../../utils/logo';

interface FixedExpenseModalProps {
  isOpen: boolean;
  initialExpense?: FixedExpenseItem | null;
  fixedExpenses?: FixedExpenseItem[];
  accounts?: AccountItem[];
  transactions?: TransactionItem[];
  onClose: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
  onMarkAsFixed?: (tx: TransactionItem, kind: 'expense' | 'income') => void;
  onSave?: (data: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdate?: (item: FixedExpenseItem) => void;
  onDelete?: (id: string) => void;
}

type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'day-picker'
  | 'payment-picker'
  | 'share-picker'
  | 'receipt-preview'
  | 'similar'
  | 'cancel-guide';

interface CancelGuideData {
  serviceName: string;
  noticePeriod: string;
  steps: string[];
  cancelUrl: string;
  cancelUrlLabel: string;
  tip?: string;
}

export const FixedExpenseModal: React.FC<FixedExpenseModalProps> = ({
  isOpen,
  initialExpense,
  fixedExpenses = [],
  accounts = [],
  transactions = [],
  onClose,
  onSelectTransaction,
  onMarkAsFixed,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const isCreateMode = !initialExpense;

  // Retain last active item during 240ms exit animation
  const lastExpenseRef = useRef<FixedExpenseItem | null>(null);
  if (initialExpense) {
    lastExpenseRef.current = initialExpense;
  }
  const activeExpense = isCreateMode ? null : initialExpense || lastExpenseRef.current;

  const [subView, setSubView] = useState<ModalSubView>('details');
  const [pickerReturnView, setPickerReturnView] = useState<'details' | 'edit'>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [dueDay, setDueDay] = useState<number>(27);
  const [category, setCategory] = useState('Räkningar');
  const [paymentMethod, setPaymentMethod] = useState('Autogiro');
  const [draftReceipts, setDraftReceipts] = useState<ReceiptAttachment[]>([]);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptAttachment | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [cancelGuide, setCancelGuide] = useState<CancelGuideData | null>(null);
  const [isLoadingCancelGuide, setIsLoadingCancelGuide] = useState(false);
  const cancelGuideCacheRef = useRef<Record<string, CancelGuideData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (
      next === 'category-picker' ||
      next === 'day-picker' ||
      next === 'payment-picker' ||
      next === 'receipt-preview'
    ) {
      if (subView === 'edit' || subView === 'details') {
        setPickerReturnView(subView);
      }
    }
    setNavDirection(dir);
    setSubView(next);
  };

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
    if (!isOpen) return;
    if (initialExpense) {
      setName(initialExpense.name);
      setAmount(initialExpense.amount);
      setDueDay(initialExpense.dueDay || 27);
      setCategory(normalizeCategoryToValid(initialExpense.category || 'Räkningar', 'expense'));
      setPaymentMethod(initialExpense.paymentMethod || 'Autogiro');
      setDraftReceipts(getItemReceipts(initialExpense));
      setSubView('details');
      setPickerReturnView('details');
    } else {
      setName('');
      setAmount('');
      setDueDay(27);
      setCategory('Räkningar');
      setPaymentMethod('Autogiro');
      setDraftReceipts([]);
      setSubView('edit');
      setPickerReturnView('edit');
    }
    setPreviewReceipt(null);
    setNavDirection('forward');
    setShowDeleteConfirm(false);
    setShowFullAccount(false);
    setCancelGuide(null);
    setIsLoadingCancelGuide(false);
  }, [initialExpense, isOpen]);

  // Live AI-kategorisering om en tjänst/butik saknas i den lokala ordlistan
  useEffect(() => {
    if (!isOpen || subView !== 'edit') return;
    const trimmed = name.trim();
    if (trimmed.length < 3) return;
    const syncInferred = inferCategoryAndMethodFromName(trimmed, 'fixed');
    if (syncInferred?.category) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchLogoForName(trimmed, category).then(() => {
        if (cancelled) return;
        const aiCat = getLearnedBrandCategory(trimmed);
        if (aiCat) {
          setCategory(normalizeCategoryToValid(aiCat, 'expense'));
        }
      });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, isOpen, subView]);

  const handleOpenCancelGuide = async () => {
    navigateSubView('cancel-guide', 'forward');
    const targetName = (name || activeExpense?.name || '').trim();
    if (!targetName) return;

    const cacheKey = `${targetName.toLowerCase()}|${category}|${paymentMethod}`;
    if (cancelGuideCacheRef.current[cacheKey]) {
      setCancelGuide(cancelGuideCacheRef.current[cacheKey]);
      return;
    }

    setIsLoadingCancelGuide(true);
    try {
      const resp = await fetch('/api/ai/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: targetName,
          category,
          amount: Number(amount) || activeExpense?.amount || 0,
          paymentMethod,
        }),
      });
      if (resp.ok) {
        const data: CancelGuideData = await resp.json();
        cancelGuideCacheRef.current[cacheKey] = data;
        setCancelGuide(data);
      }
    } catch {
      // Fallback handled below if null
    } finally {
      setIsLoadingCancelGuide(false);
    }
  };

  const resolvedAccountInfo = useMemo(() => {
    const matchedTx = activeExpense
      ? transactions.find(
          (tx) => tx.type !== 'income' && Boolean(findMatchingFixedExpense(tx, [activeExpense]))
        )
      : undefined;
    const raw = activeExpense?.bankAccountName || matchedTx?.bankAccountName || '';
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
  }, [activeExpense, transactions, accounts]);

  const similarInfo = useMemo(
    () => findTransactionsForFixedExpense(activeExpense, transactions),
    [activeExpense, transactions]
  );

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const commitInlineChanges = (overrides?: Partial<FixedExpenseItem>) => {
    if (isCreateMode || !onUpdate || !activeExpense) return;
    const nextName = (overrides?.name !== undefined ? overrides.name : name).trim() || activeExpense.name;
    const nextAmt = Math.max(
      1,
      Math.round(Number(overrides?.amount !== undefined ? overrides.amount : amount) || activeExpense.amount)
    );
    const nextDueDay = overrides?.dueDay !== undefined ? overrides.dueDay : Number(dueDay);
    const nextCategory = overrides?.category !== undefined ? overrides.category : category;
    const nextPaymentMethod =
      overrides?.paymentMethod !== undefined ? overrides.paymentMethod : paymentMethod;
    const nextReceipts = overrides?.receipts !== undefined ? overrides.receipts : draftReceipts;

    onUpdate({
      ...activeExpense,
      name: nextName,
      amount: nextAmt,
      dueDay: nextDueDay,
      category: nextCategory,
      paymentMethod: nextPaymentMethod,
      receipts: nextReceipts && nextReceipts.length > 0 ? nextReceipts : undefined,
      receiptUrl: nextReceipts && nextReceipts.length > 0 ? nextReceipts[0].url : undefined,
      receiptName: nextReceipts && nextReceipts.length > 0 ? nextReceipts[0].name : undefined,
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
        dueDay: Number(dueDay) || 27,
        category: category || 'Räkningar',
        paymentMethod: paymentMethod || 'Autogiro',
        receipts: draftReceipts.length > 0 ? draftReceipts : undefined,
        receiptUrl: draftReceipts.length > 0 ? draftReceipts[0].url : undefined,
        receiptName: draftReceipts.length > 0 ? draftReceipts[0].name : undefined,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (onDelete && activeExpense) {
      onDelete(activeExpense.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const uploaded: ReceiptAttachment[] = [];
      for (const file of files) {
        const dataUrl = await compressImageFileToDataUrl(file, 1280, 0.74);
        uploaded.push({ url: dataUrl, name: file.name || 'Bifogat kvitto' });
      }
      const nextReceipts = [...draftReceipts, ...uploaded];
      setDraftReceipts(nextReceipts);
      if (!isCreateMode && onUpdate && activeExpense) {
        onUpdate({
          ...activeExpense,
          receipts: nextReceipts,
          receiptUrl: nextReceipts[0]?.url,
          receiptName: nextReceipts[0]?.name,
        });
      }
    } catch {
      // ignore
    }
    e.target.value = '';
  };

  const handleRemoveReceiptAt = (index: number) => {
    const nextReceipts = draftReceipts.filter((_, i) => i !== index);
    setDraftReceipts(nextReceipts);
    if (!isCreateMode && onUpdate && activeExpense) {
      onUpdate({
        ...activeExpense,
        receipts: nextReceipts.length > 0 ? nextReceipts : undefined,
        receiptUrl: nextReceipts[0]?.url,
        receiptName: nextReceipts[0]?.name,
      });
    }
  };

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  const displayName = name || activeExpense?.name || 'Ny fast utgift';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* Hidden file input for receipt (supports multiple) */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleReceiptUpload}
      />

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

          <div className="ui-date-header px-1">
            <span className="font-medium text-[var(--text-secondary)]">
              {similarInfo.transactions.length}{' '}
              {similarInfo.transactions.length === 1 ? 'händelse' : 'händelser'}
            </span>
            <span className="font-display font-medium text-[var(--text-primary)] tabular-nums">
              Totalt {formatKr(similarInfo.totalAmount)}
            </span>
          </div>

          {similarInfo.transactions.length > 0 ? (
            <div className="ui-sheet-group">
              {similarInfo.transactions.map((tx) => {
                const allSameMerchantFixed = findAllMatchingFixedExpensesByMerchant(
                  tx,
                  fixedExpenses.length > 0
                    ? fixedExpenses
                    : activeExpense
                    ? [activeExpense]
                    : []
                );
                const hasAmountMatch = allSameMerchantFixed.some((exp) =>
                  isFixedExpenseAmountMatch(exp, tx.amount)
                );

                return (
                  <div
                    key={tx.id}
                    className="px-4 py-3 sm:py-3.5 flex items-center justify-between gap-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectTransaction) {
                          onSelectTransaction(tx);
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left hover:opacity-85 transition-opacity cursor-pointer"
                    >
                      <ItemLogo
                        name={tx.title}
                        category={tx.category}
                        logoUrl={tx.logo}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="ui-row-title block truncate">
                          {tx.title}
                        </span>
                        <span className="ui-row-subtitle tabular-nums">
                          {formatSwedishDateHeading(tx.date)}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {!hasAmountMatch && onMarkAsFixed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsFixed(tx, 'expense');
                          }}
                          title="Lägg till detta belopp som egen fast utgift"
                          className="px-2 py-1 rounded-lg bg-[var(--bg-color)] hover:bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[11px] font-medium text-[var(--text-primary)] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <ArrowsClockwise size={11} weight="bold" />
                          <span>+ Fast</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectTransaction) {
                            onSelectTransaction(tx);
                          }
                        }}
                        className="flex items-center gap-1.5 cursor-pointer"
                      >
                        <div className="text-right">
                          <span className="ui-row-amount">
                            -{formatKr(tx.amount)}
                          </span>
                          <span className="ui-row-meta">
                            {tx.bookingStatus === 'PDNG' || tx.bookingStatus === 'HOLD'
                              ? 'Reserverat'
                              : getTransactionTime(tx)}
                          </span>
                        </div>
                        <CaretRight size={12} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="ui-sheet-box text-center text-xs text-[var(--text-muted)] py-6">
              Inga registrerade banktransaktioner matchar {displayName} ännu.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 1B: SÄG UPP ABONNEMANG (AI-GUIDE & DIREKTLÄNK)        */}
      {/* ============================================================== */}
      {subView === 'cancel-guide' && (
        <div className={`${slideAnimClass} space-y-4`}>
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
            <span className="ui-sheet-title truncate max-w-[220px]">
              Säg upp {displayName}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          {/* Sammanfattningskort med årlig besparing */}
          <div className="px-4 py-3 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ItemLogo
                name={displayName}
                category={category}
                logoUrl={activeExpense?.logo}
                size="md"
                isRecurring={false}
              />
              <div className="min-w-0">
                <span className="ui-row-title">{displayName}</span>
                <span className="ui-row-subtitle">
                  -{formatKr(Number(amount) || 0)}/mån · {paymentMethod}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] text-[var(--text-muted)] block">
                Årlig besparing
              </span>
              <span className="font-display font-semibold text-[13.5px] text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatKr((Number(amount) || 0) * 12)}/år
              </span>
            </div>
          </div>

          {isLoadingCancelGuide ? (
            <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-5 space-y-3.5 animate-pulse">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <Sparkle size={14} weight="fill" className="text-[var(--text-primary)] animate-spin" />
                <span>Tar fram uppsägningsguide för {displayName}...</span>
              </div>
              <div className="h-3.5 w-3/4 rounded bg-[var(--surface-raised)]" />
              <div className="space-y-2.5 pt-1">
                <div className="h-10 w-full rounded-xl bg-[var(--surface-raised)]" />
                <div className="h-10 w-full rounded-xl bg-[var(--surface-raised)]" />
                <div className="h-10 w-full rounded-xl bg-[var(--surface-raised)]" />
              </div>
            </div>
          ) : (
            (() => {
              const guide: CancelGuideData = cancelGuide || {
                serviceName: displayName,
                noticePeriod: 'Kontrollera uppsägningstid på Mina Sidor',
                steps: [
                  `Logga in på Mina Sidor hos ${displayName}.`,
                  'Gå till Abonnemang eller Medlemskap och välj Avsluta.',
                  'Kontrollera att du får en bekräftelse på uppsägningen via e-post.',
                ],
                cancelUrl: `https://www.google.com/search?q=${encodeURIComponent(
                  `${displayName} säga upp abonnemang`
                )}`,
                cancelUrlLabel: `Gå till ${displayName}`,
                tip: 'Låt eventuellt autogiro ligga kvar tills sista fakturan under uppsägningstiden är betald.',
              };

              return (
                <div className="space-y-3.5">
                  {/* Uppsägningstid */}
                  <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
                    <span className="text-[var(--text-secondary)] shrink-0">
                      Uppsägningstid
                    </span>
                    <span className="font-medium text-[var(--text-primary)] text-right">
                      {guide.noticePeriod}
                    </span>
                  </div>

                  {/* Steg-för-steg instruktioner */}
                  <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                        Så säger du upp
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                        <Sparkle size={11} weight="fill" />
                        <span>AI-guide</span>
                      </span>
                    </div>

                    <ol className="space-y-2.5">
                      {guide.steps.map((step, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[13px] leading-snug text-[var(--text-primary)]"
                        >
                          <span className="w-5 h-5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-[11px] font-display font-semibold text-[var(--text-primary)] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Smart tips */}
                  {guide.tip && (
                    <div className="px-3.5 py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] flex items-start gap-2.5 text-[12px] leading-snug text-[var(--text-secondary)]">
                      <Info size={15} className="text-[var(--text-primary)] shrink-0 mt-0.5" />
                      <span>{guide.tip}</span>
                    </div>
                  )}

                  {/* Direktlänk & Ta bort */}
                  <div className="space-y-2 pt-1">
                    <a
                      href={guide.cancelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ui-btn-primary"
                    >
                      <span>{guide.cancelUrlLabel}</span>
                      <ArrowSquareOut size={15} weight="bold" />
                    </a>

                    {onDelete && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(true)}
                          className="ui-btn-secondary"
                        >
                          <Trash size={14} />
                          <span>Redan uppsagt? Ta bort utgift</span>
                        </button>

                        <ConfirmDialog
                          isOpen={showDeleteConfirm}
                          title="Ta bort fast utgift?"
                          description={`${displayName} tas bort från dina fasta utgifter.`}
                          confirmLabel="Ta bort"
                          onConfirm={handleDelete}
                          onCancel={() => setShowDeleteConfirm(false)}
                        />
                      </>
                    )}
                  </div>
                </div>
              );
            })()
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
            {availableCategories.map((c) => {
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
      {/* SUB-VIEW 3: DRAGNINGSDAG-VÄLJARE (Ersätter native <select>)    */}
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
              Välj dragningsdag
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
            selectedDay={Number(dueDay) || 28}
            onSelectDay={(d) => {
              setDueDay(d);
              if (pickerReturnView === 'details') {
                commitInlineChanges({ dueDay: d });
              }
              navigateSubView(pickerReturnView, 'back');
            }}
            mode="dueday"
            title={`Dragningsdag för ${displayName}`}
          />
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 4: BETALSÄTTSVÄLJARE (Ersätter native <select>)       */}
      {/* ============================================================== */}
      {subView === 'payment-picker' && (
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
              Välj betalsätt
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
            {availablePaymentMethods.map((m) => {
              const isSel = m === paymentMethod;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(m);
                    if (pickerReturnView === 'details') {
                      commitInlineChanges({ paymentMethod: m });
                    }
                    navigateSubView(pickerReturnView, 'back');
                  }}
                  className="ui-row-btn"
                >
                  <span
                    className={`truncate ${
                      isSel
                        ? 'font-medium text-[var(--text-primary)]'
                        : 'font-normal text-[var(--text-primary)]'
                    }`}
                  >
                    {m}
                  </span>
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
      {/* SUB-VIEW 6: INBYGGD KVITTO-VISNING                             */}
      {/* ============================================================== */}
      {subView === 'receipt-preview' && previewReceipt && (
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
            <span className="ui-sheet-title max-w-[180px]">
              {previewReceipt.name || 'Kvitto'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-btn"
            >
              <X size={16} />
            </button>
          </div>

          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
            {previewReceipt.url.startsWith('data:image/') ||
            /\.(png|jpe?g|webp|gif)$/i.test(previewReceipt.url) ? (
              <img
                src={previewReceipt.url}
                alt={previewReceipt.name || 'Kvitto'}
                className="max-h-[56dvh] w-auto object-contain rounded-xl"
              />
            ) : (
              <iframe
                src={previewReceipt.url}
                title={previewReceipt.name || 'Kvitto'}
                className="w-full h-[52dvh] rounded-xl border-0"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a
              href={previewReceipt.url}
              download={previewReceipt.name || `kvitto-${displayName}.jpg`}
              className="ui-btn-primary"
            >
              <FileText size={14} weight="bold" />
              <span>Spara fil</span>
            </a>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ui-btn-secondary"
            >
              <Plus size={14} weight="bold" />
              <span>Bifoga fler</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SUB-VIEW 7: REDIGERA FAST UTGIFT                               */}
      {/* ============================================================== */}
      {subView === 'edit' && (
        <div className={`${slideAnimClass} space-y-4`}>
          {isCreateMode ? (
            <div className="ui-sheet-header">
              <span className="ui-sheet-title">Lägg till fast utgift</span>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="ui-sheet-sub-header">
              <button
                type="button"
                onClick={() => {
                  if (activeExpense) {
                    setName(activeExpense.name);
                    setAmount(activeExpense.amount);
                    setDueDay(activeExpense.dueDay || 27);
                    setCategory(
                      normalizeCategoryToValid(activeExpense.category || 'Räkningar', 'expense')
                    );
                    setPaymentMethod(activeExpense.paymentMethod || 'Autogiro');
                    setDraftReceipts(getItemReceipts(activeExpense));
                  }
                  navigateSubView('details', 'back');
                }}
                title="Tillbaka"
                aria-label="Tillbaka"
                className="ui-icon-btn"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
              <span className="ui-sheet-title">Redigera fast utgift</span>
              <button type="button" onClick={onClose} className="ui-icon-btn">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Stort och tydligt inmatningskort för Namn + Belopp med live-logga */}
          <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-4 space-y-3.5">
            <label className="flex items-center gap-3.5 cursor-text">
              <ItemLogo
                name={name || activeExpense?.name || 'Fast utgift'}
                category={category}
                logoUrl={activeExpense?.logo}
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
                  placeholder="Butik eller tjänst"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    const inferred = inferCategoryAndMethodFromName(nextName, 'fixed');
                    if (inferred?.category) {
                      setCategory(inferred.category);
                    }
                    if (inferred?.paymentMethod) {
                      setPaymentMethod(inferred.paymentMethod);
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
                    className="w-full bg-transparent border-0 p-0 font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/40 tabular-nums focus:outline-none"
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
              <span className="ui-info-label shrink-0">Dragningsdag</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                <span>Den {dueDay}:e</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigateSubView('payment-picker', 'forward')}
              className="ui-row-btn"
            >
              <span className="ui-info-label shrink-0">Betalsätt</span>
              <span className="font-normal text-[var(--text-primary)] flex items-center gap-1.5">
                <span>{paymentMethod}</span>
                <CaretRight size={12} className="text-[var(--text-muted)]" />
              </span>
            </button>

            <div className="ui-row">
              <span className="ui-info-label">
                {draftReceipts.length > 0 ? `Kvitton (${draftReceipts.length})` : 'Kvitto'}
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="font-medium text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1.5 cursor-pointer"
              >
                <Paperclip size={13} />
                <span>{draftReceipts.length > 0 ? 'Bifoga fler' : 'Bifoga'}</span>
              </button>
            </div>
          </div>

          {draftReceipts.length > 0 && (
            <div className="space-y-2">
              {draftReceipts.map((rcpt, idx) => (
                <div
                  key={`${rcpt.name}-${idx}`}
                  className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewReceipt(rcpt);
                      navigateSubView('receipt-preview', 'forward');
                    }}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 cursor-pointer"
                  >
                    <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                    <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                      {rcpt.name || `Kvitto ${idx + 1}`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveReceiptAt(idx)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                    title="Ta bort kvitto"
                  >
                    <Trash size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2.5">
            {isCreateMode ? (
              <button
                type="button"
                onClick={handleCreateSave}
                disabled={!name.trim() || !(Number(amount) > 0)}
                className="ui-btn-primary"
              >
                <Check size={14} weight="bold" />
                <span>Spara fast utgift</span>
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
                      <span>Ta bort fast utgift</span>
                    </button>

                    <ConfirmDialog
                      isOpen={showDeleteConfirm}
                      title="Ta bort fast utgift?"
                      description={`${displayName} tas bort från dina fasta utgifter.`}
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
          <div className="ui-sheet-header mb-5">
            <span className="ui-sheet-title">Fast utgift</span>
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
          <div className="ui-hero-header relative overflow-hidden mb-5 pb-5">
            {(() => {
              const accentColor = resolveCategoryColor(category);
              return (
                <>
                  <div
                    className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-28 h-28 rounded-full blur-2xl opacity-15 dark:opacity-20"
                    style={{ backgroundColor: accentColor }}
                  />
                  <div className="relative flex justify-center mb-3.5">
                    <ItemLogo
                      name={displayName}
                      category={category}
                      logoUrl={activeExpense?.logo}
                      size="xl"
                      isRecurring={true}
                    />
                  </div>
                </>
              );
            })()}

            <h2 className="font-display font-semibold text-lg sm:text-xl text-[var(--text-primary)] text-center truncate px-2">
              {displayName}
            </h2>

            <div className="mt-1 flex items-baseline justify-center gap-1">
              <span className="font-display font-semibold text-3xl text-[var(--text-primary)] tabular-nums">
                -{new Intl.NumberFormat('sv-SE').format(Math.round(Number(amount) || 0))}
              </span>
              <span className="font-display font-medium text-lg text-[var(--text-secondary)]">
                kr/mån
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] tabular-nums mt-1.5">
              Dras den {dueDay}:e varje månad
            </p>
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
                <span className="ui-info-label">Betalsätt</span>
                <span className="ui-info-value">
                  {paymentMethod}
                </span>
              </div>

              <div className="ui-row">
                <span className="ui-info-label">Dragningsdag</span>
                <span className="ui-info-value tabular-nums">
                  Den {dueDay}:e
                </span>
              </div>

              <div className="ui-row">
                <span className="ui-info-label">Årskostnad</span>
                <span className="ui-info-value tabular-nums">
                  -{formatKr((Number(amount) || 0) * 12)}/år
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

            {/* Bifogade kvitton (visas endast i förhandsgranskning om det faktiskt finns kvitton) */}
            {draftReceipts.length > 0 && (
              <div className="space-y-2">
                {draftReceipts.map((rcpt, idx) => (
                  <button
                    key={`${rcpt.name}-${idx}`}
                    type="button"
                    onClick={() => {
                      setPreviewReceipt(rcpt);
                      navigateSubView('receipt-preview', 'forward');
                    }}
                    className="w-full rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-3.5 space-y-2.5 text-left hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <span className="text-xs font-medium text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                        <Paperclip size={13} weight="bold" className="text-[var(--text-secondary)] shrink-0" />
                        <span className="truncate">{rcpt.name || `Kvitto ${idx + 1}`}</span>
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
                        <span>Öppna</span>
                        <CaretRight size={11} className="text-[var(--text-muted)]" />
                      </span>
                    </div>

                    <div className="w-full rounded-xl bg-[var(--surface-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-56">
                      {rcpt.url.startsWith('data:image/') ||
                      /\.(png|jpe?g|webp|gif)$/i.test(rcpt.url) ? (
                        <img
                          src={rcpt.url}
                          alt={rcpt.name || 'Kvitto'}
                          className="max-h-48 w-auto object-contain rounded-lg"
                        />
                      ) : (
                        <div className="py-5 flex flex-col items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <FileText size={26} weight="duotone" />
                          <span className="font-medium">{rcpt.name || 'Öppna dokument'}</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Navigationsrader: Liknande transaktioner & Säg upp abonnemang */}
            <div className="ui-sheet-group">
              <button
                type="button"
                onClick={() => navigateSubView('similar', 'forward')}
                className="ui-row-btn"
              >
                <span className="font-normal text-[var(--text-primary)] flex items-center gap-2">
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
                      ? ` · ${formatKr(similarInfo.totalAmount)}`
                      : ''}
                  </span>
                  <CaretRight size={13} className="text-[var(--text-muted)]" />
                </span>
              </button>

              <button
                type="button"
                onClick={handleOpenCancelGuide}
                className="ui-row-btn"
              >
                <span className="font-normal text-[var(--text-primary)] flex items-center gap-2">
                  <Scissors
                    size={15}
                    className="text-rose-500 shrink-0"
                  />
                  <span>Säg upp abonnemang</span>
                </span>
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)] font-normal shrink-0">
                  <span>Guide & länk</span>
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
