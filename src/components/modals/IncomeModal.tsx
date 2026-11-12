import React, { useState, useMemo } from 'react';
import { useRetainedValue } from './useRetainedValue';
import { useExternalSnapshot } from '../../utils/hooks/useExternalSnapshot';
import { IncomeItem, AccountItem, TransactionItem } from '../HomeTab';
import { BottomSheet } from '../ui/BottomSheet';
import {
  findMatchingIncome,
  findTransactionsForIncome,
} from '../../utils/recurring';
import {
  getStoredIncomeCategories,
  normalizeCategoryToValid,
} from '../../utils/appCache';
import type { IncomeAccountInfo, ModalSubView } from './income/shared';
import { IncomeViewSimilar } from './income/IncomeViewSimilar';
import { IncomeViewCategoryPicker, IncomeViewDayPicker } from './income/IncomeViewPickers';
import { IncomeViewEdit } from './income/IncomeViewEdit';
import { IncomeViewDetails } from './income/IncomeViewDetails';
import { describeAccount } from '../../utils/accountDisplay';

interface IncomeModalProps {
  isOpen: boolean;
  initialIncome?: IncomeItem | null;
  accounts?: AccountItem[];
  transactions?: TransactionItem[];
  onClose: () => void;
  onSelectTransaction?: (tx: TransactionItem) => void;
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
  onSelectTransaction,
  onSave,
  onUpdate,
  onDelete,
}) => {
  const isCreateMode = !initialIncome;

  // Retain last active item during 240ms exit animation
  const lastIncome = useRetainedValue(initialIncome);
  const activeIncome = isCreateMode ? null : lastIncome;

  const [subView, setSubView] = useState<ModalSubView>('details');
  const [pickerReturnView, setPickerReturnView] = useState<'details' | 'edit'>('details');
  const [navDirection, setNavDirection] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [payday, setPayday] = useState<number>(25);
  const [category, setCategory] = useState('Lön');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [logoPrefTick, setLogoPrefTick] = useState(0);

  const navigateSubView = (next: ModalSubView, dir: 'forward' | 'back' = 'forward') => {
    if (next === 'category-picker' || next === 'day-picker') {
      if (subView === 'edit' || subView === 'details') {
        setPickerReturnView(subView);
      }
    }
    setNavDirection(dir);
    setSubView(next);
  };

  // Kategorierna ligger i localStorage – läs om dem varje gång rutan öppnas
  const availableIncomeCategories = useExternalSnapshot(
    () => getStoredIncomeCategories().map((c) => c.name),
    [isOpen]
  );

  // Fyll i/återställ formuläret när rutan öppnas eller en annan inkomst väljs.
  // Görs under render ("adjust state when a prop changes") i stället för i en effekt.
  // Jämför samma värden som den gamla effekten (isOpen + objektreferensen), och
  // null som startvärde gör att återställningen även sker vid första renderingen.
  const [prevResetDeps, setPrevResetDeps] = useState<{
    isOpen: boolean;
    initialIncome: IncomeItem | null | undefined;
  } | null>(null);
  if (
    prevResetDeps === null ||
    prevResetDeps.isOpen !== isOpen ||
    prevResetDeps.initialIncome !== initialIncome
  ) {
    setPrevResetDeps({ isOpen, initialIncome });
    if (isOpen) {
      if (initialIncome) {
        setName(initialIncome.name);
        setAmount(initialIncome.amount);
        setPayday(initialIncome.payday || 25);
        setCategory(normalizeCategoryToValid(initialIncome.category || 'Lön', 'income'));
        setSubView('details');
        setPickerReturnView('details');
      } else {
        setName('');
        setAmount('');
        setPayday(25);
        setCategory('Lön');
        setSubView('edit');
        setPickerReturnView('edit');
      }
      setNavDirection('forward');
      setShowDeleteConfirm(false);
    }
  }

  const resolvedAccountInfo = useMemo((): IncomeAccountInfo | null => {
    const matchedTx = activeIncome
      ? transactions.find(
          (tx) => tx.type === 'income' && Boolean(findMatchingIncome(tx, [activeIncome]))
        )
      : undefined;
    const raw = activeIncome?.bankAccountName || matchedTx?.bankAccountName || '';
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

    return describeAccount(raw, checking);
  }, [activeIncome, transactions, accounts]);

  const similarInfo = useMemo(
    () => findTransactionsForIncome(activeIncome, transactions),
    [activeIncome, transactions]
  );

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const commitInlineChanges = (overrides?: Partial<IncomeItem>) => {
    if (isCreateMode || !onUpdate || !activeIncome) return;
    const nextName = (overrides?.name !== undefined ? overrides.name : name).trim() || activeIncome.name;
    const nextAmt = Math.max(
      1,
      Math.round(Number(overrides?.amount !== undefined ? overrides.amount : amount) || activeIncome.amount)
    );
    const nextPayday = overrides?.payday !== undefined ? overrides.payday : Number(payday);
    const nextCategory = overrides?.category !== undefined ? overrides.category : category;

    onUpdate({
      ...activeIncome,
      name: nextName,
      amount: nextAmt,
      payday: nextPayday,
      category: nextCategory,
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
        payday: Number(payday) || 25,
        category: category || 'Lön',
      });
    }
    onClose();
  };

  // Avbryt redigering: släng osparade ändringar
  const handleCancelEdit = () => {
    if (activeIncome) {
      setName(activeIncome.name);
      setAmount(activeIncome.amount);
      setPayday(activeIncome.payday);
      setCategory(activeIncome.category);
    }
    navigateSubView('details', 'back');
  };

  const handleDelete = () => {
    if (onDelete && activeIncome) {
      onDelete(activeIncome.id);
    }
    setShowDeleteConfirm(false);
    onClose();
  };

  const slideAnimClass =
    navDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left';

  const displayName = name || activeIncome?.name || 'Ny inkomst';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {/* ============================================================== */}
      {/* SUB-VIEW 1: LIKNANDE TRANSAKTIONER (Egen vy i arket)           */}
      {/* ============================================================== */}
      <IncomeViewSimilar
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        onClose={onClose}
        similarInfo={similarInfo}
        formatKr={formatKr}
        onSelectTransaction={onSelectTransaction}
        displayName={displayName}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 2: KATEGORIVÄLJARE                                    */}
      {/* ============================================================== */}
      <IncomeViewCategoryPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        availableIncomeCategories={availableIncomeCategories}
        category={category}
        setCategory={setCategory}
        commitInlineChanges={commitInlineChanges}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 3: UTBETALNINGSDAG-VÄLJARE (Ersätter native <select>) */}
      {/* ============================================================== */}
      <IncomeViewDayPicker
        subView={subView}
        slideAnimClass={slideAnimClass}
        navigateSubView={navigateSubView}
        pickerReturnView={pickerReturnView}
        onClose={onClose}
        payday={payday}
        setPayday={setPayday}
        commitInlineChanges={commitInlineChanges}
        displayName={displayName}
      />

      {/* ============================================================== */}
      {/* SUB-VIEW 4: LÄGG TILL NY INKOMST                               */}
      {/* ============================================================== */}
      <IncomeViewEdit
        subView={subView}
        slideAnimClass={slideAnimClass}
        isCreateMode={isCreateMode}
        navigateSubView={navigateSubView}
        onClose={onClose}
        handleCancelEdit={handleCancelEdit}
        name={name}
        setName={setName}
        amount={amount}
        setAmount={setAmount}
        category={category}
        setCategory={setCategory}
        payday={payday}
        handleCreateSave={handleCreateSave}
        commitInlineChanges={commitInlineChanges}
      />

      {/* ============================================================== */}
      {/* HUVUDVY: DIREKT REDIGERBAR DETALJVY                            */}
      {/* ============================================================== */}
      <IncomeViewDetails
        subView={subView}
        isCreateMode={isCreateMode}
        navDirection={navDirection}
        navigateSubView={navigateSubView}
        onClose={onClose}
        activeIncome={activeIncome}
        displayName={displayName}
        name={name}
        amount={amount}
        payday={payday}
        category={category}
        logoPrefTick={logoPrefTick}
        setLogoPrefTick={setLogoPrefTick}
        formatKr={formatKr}
        resolvedAccountInfo={resolvedAccountInfo}
        similarInfo={similarInfo}
        onDelete={onDelete}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        handleDelete={handleDelete}
      />
    </BottomSheet>
  );
};
