import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CaretLeft,
  Bank,
  CheckCircle,
  Plus,
  Trash,
  Check,
  CalendarBlank,
  PencilSimple,
  X,
} from '@phosphor-icons/react';
import { IncomeItem, FixedExpenseItem } from './HomeTab';
import { BankConnection } from '../services/bankService';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';

interface OnboardingFlowProps {
  initialName: string;
  targetPayday?: number;
  connections: BankConnection[];
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  onSaveName: (name: string) => void;
  onUpdatePayday?: (day: number) => void;
  onOpenBankModal: () => void;
  onAddIncome: (item: Omit<IncomeItem, 'id'>) => void;
  onUpdateIncome?: (item: IncomeItem) => void;
  onDeleteIncome: (id: string) => void;
  onAddFixed: (item: Omit<FixedExpenseItem, 'id'>) => void;
  onUpdateFixed?: (item: FixedExpenseItem) => void;
  onDeleteFixed: (id: string) => void;
  onComplete: () => void;
  onBackToLanding?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialName,
  targetPayday = 25,
  connections,
  incomes,
  fixedExpenses,
  onSaveName,
  onUpdatePayday,
  onOpenBankModal,
  onAddIncome,
  onUpdateIncome,
  onDeleteIncome,
  onAddFixed,
  onUpdateFixed,
  onDeleteFixed,
  onComplete,
  onBackToLanding,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(initialName || '');
  const [payday, setPayday] = useState<number>(targetPayday || 25);

  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName, name]);

  // Quick-add states for Step 3
  const [addingType, setAddingType] = useState<'income' | 'fixed' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  // Inline edit state for Step 3
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDay, setEditDay] = useState<number>(25);

  const hasConnectedBank = connections.length > 0;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveName(trimmed);
    if (onUpdatePayday) {
      onUpdatePayday(payday);
    }
    setStep(2);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newItemName.trim();
    const amt = Math.max(0, Math.round(Number(newItemAmount) || 0));
    if (!title || amt <= 0) return;

    if (addingType === 'income') {
      onAddIncome({
        name: title,
        amount: amt,
        payday: payday || 25,
        category: 'Lön',
      });
    } else if (addingType === 'fixed') {
      onAddFixed({
        name: title,
        amount: amt,
        dueDay: 27,
        category: 'Räkningar',
        paymentMethod: 'Autogiro',
      });
    }

    setNewItemName('');
    setNewItemAmount('');
    setAddingType(null);
  };

  const startEditingIncome = (inc: IncomeItem) => {
    setEditingId(inc.id);
    setEditName(inc.name);
    setEditAmount(String(Math.round(inc.amount)));
    setEditDay(inc.payday || payday || 25);
  };

  const startEditingFixed = (exp: FixedExpenseItem) => {
    setEditingId(exp.id);
    setEditName(exp.name);
    setEditAmount(String(Math.round(exp.amount)));
    setEditDay(exp.dueDay || 27);
  };

  const saveEditIncome = (inc: IncomeItem) => {
    const cleanTitle = editName.trim() || inc.name;
    const cleanAmt = Math.max(0, Math.round(Number(editAmount) || 0));
    const cleanDay = Math.min(31, Math.max(1, Number(editDay) || 25));
    if (onUpdateIncome && cleanAmt > 0) {
      onUpdateIncome({
        ...inc,
        name: cleanTitle,
        amount: cleanAmt,
        payday: cleanDay,
      });
    }
    setEditingId(null);
  };

  const saveEditFixed = (exp: FixedExpenseItem) => {
    const cleanTitle = editName.trim() || exp.name;
    const cleanAmt = Math.max(0, Math.round(Number(editAmount) || 0));
    const cleanDay = Math.min(31, Math.max(1, Number(editDay) || 27));
    if (onUpdateFixed && cleanAmt > 0) {
      onUpdateFixed({
        ...exp,
        name: cleanTitle,
        amount: cleanAmt,
        dueDay: cleanDay,
      });
    }
    setEditingId(null);
  };

  const totalInc = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalFix = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
  const kvarAttSpendera = Math.max(0, totalInc - totalFix);

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] font-sans">
      {/* Top Progress Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between h-10">
          <button
            type="button"
            onClick={() => {
              if (step > 1) {
                setStep((prev) => (prev - 1) as 1 | 2 | 3);
              } else if (onBackToLanding) {
                onBackToLanding();
              }
            }}
            className="p-1.5 -ml-1.5 text-[var(--text-primary)] flex items-center justify-center hover:opacity-70 active:scale-95 transition-all cursor-pointer"
            aria-label="Tillbaka"
          >
            <CaretLeft size={18} weight="bold" />
          </button>

          <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">
            Steg {step} av 3
          </span>

          <div className="w-6" />
        </div>

        {/* Minimal 3-step bar */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-colors ${
                s <= step ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-subtle)]'
              }`}
            />
          ))}
        </div>
      </header>

      {/* STEP 1: NAMN & LÖNEDAG */}
      {step === 1 && (
        <form
          onSubmit={handleNextFromStep1}
          className="flex-1 flex flex-col justify-between py-8 animate-fade-in"
        >
          <div className="my-auto space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
                Vad heter du?
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Så vi vet vem vi hälsar på och när din lön brukar komma.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                  Förnamn
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Ditt förnamn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] font-display font-bold text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-colors"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <CalendarBlank size={15} className="text-[var(--text-secondary)]" />
                    <span>Ordinarie lönedag</span>
                  </span>
                  <select
                    value={payday}
                    onChange={(e) => setPayday(Number(e.target.value) || 25)}
                    className="py-1 px-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] tabular-nums focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Den {d}:e
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { day: 25, label: 'Den 25:e' },
                    { day: 27, label: 'Den 27:e' },
                    { day: 18, label: 'Den 18:e' },
                  ].map((opt) => {
                    const active = payday === opt.day;
                    return (
                      <button
                        key={opt.day}
                        type="button"
                        onClick={() => setPayday(opt.day)}
                        className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          active
                            ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-bold'
                            : 'bg-[var(--bg-color)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>
      )}

      {/* STEP 2: ENABLE BANKING */}
      {step === 2 && (
        <div className="flex-1 flex flex-col justify-between py-8 animate-fade-in">
          <div className="my-auto space-y-6">
            <div className="space-y-1.5">
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
                Koppla din bank
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Hämta konton, lön och fasta utgifter automatiskt via Enable Banking.
              </p>
            </div>

            {hasConnectedBank ? (
              <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-5 space-y-4">
                {connections.map((conn) => (
                  <div key={conn.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle size={20} weight="fill" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-display font-bold text-sm text-[var(--text-primary)] block truncate">
                          {conn.aspsp_name}
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          Ansluten · Fasta utgifter analyserade
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={onOpenBankModal}
                  className="w-full py-2.5 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  Hantera eller lägg till bank
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenBankModal}
                className="w-full bg-[var(--surface-color)] border border-[var(--border-subtle)] hover:border-[var(--text-primary)] rounded-3xl p-5 flex items-center justify-between gap-4 text-left transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
                    <Bank size={22} weight="duotone" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-[var(--text-primary)] block">
                      Välj din bank
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      Säker koppling med BankID
                    </span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-[var(--text-muted)] shrink-0" />
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>

            {!hasConnectedBank && (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Hoppa över just nu
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: INKOMSTER & FASTA UTGIFTER */}
      {step === 3 && (
        <div className="flex-1 flex flex-col justify-between py-5 animate-fade-in min-h-0">
          <div className="space-y-5 overflow-y-auto pr-0.5 pb-4">
            <div className="space-y-1">
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
                Inkomster & fasta utgifter
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Tryck på en rad om du vill justera belopp eller datum.
              </p>
            </div>

            {/* Live Kvar att spendera-sammanfattning */}
            <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
                  Kvar efter fasta räkningar
                </span>
                <span className="font-display font-extrabold text-2xl text-[var(--text-primary)] tabular-nums">
                  {formatKr(kvarAttSpendera)}
                </span>
              </div>
              <div className="text-right text-xs space-y-0.5 tabular-nums">
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  +{formatKr(totalInc)}
                </div>
                <div className="text-[var(--text-muted)] font-semibold">
                  -{formatKr(totalFix)}
                </div>
              </div>
            </div>

            {/* Inkomster (Samma kortdesign som Fasta-fliken) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display font-bold text-xs text-[var(--text-muted)]">
                  Inkomster ({incomes.length})
                </h2>
                <span className="font-display font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                  +{formatKr(totalInc)}
                </span>
              </div>

              {incomes.length > 0 ? (
                <div className="space-y-2">
                  {incomes.map((inc) => {
                    const isEditing = editingId === inc.id;
                    if (isEditing) {
                      return (
                        <div
                          key={inc.id}
                          className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--text-primary)] space-y-2.5 text-xs"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] font-semibold text-[var(--text-primary)] focus:outline-none"
                              placeholder="Namn"
                            />
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] font-bold text-[var(--text-primary)] tabular-nums focus:outline-none"
                              placeholder="Belopp"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--text-muted)]">Lönedag:</span>
                              <input
                                type="number"
                                min={1}
                                max={31}
                                value={editDay}
                                onChange={(e) => setEditDay(Number(e.target.value) || 25)}
                                className="w-14 px-2 py-1 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] font-bold text-center tabular-nums"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onDeleteIncome(inc.id)}
                                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                title="Ta bort"
                              >
                                <Trash size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditIncome(inc)}
                                className="px-3 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check size={13} weight="bold" />
                                <span>Spara</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={inc.id}
                        className="w-full p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => startEditingIncome(inc)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <ItemLogo
                            name={inc.name}
                            category={inc.category}
                            logoUrl={inc.logo}
                            size="md"
                            isRecurring={false}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                              <span className="truncate">{inc.name}</span>
                              <PencilSimple size={11} className="text-[var(--text-muted)] shrink-0" />
                            </span>
                            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="inline-flex items-center gap-1 truncate">
                                <CategoryIcon category={inc.category || 'Lön'} size={12} />
                                <span className="truncate">{inc.category || 'Lön'}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditingIncome(inc)}
                            className="text-right cursor-pointer"
                          >
                            <span className="font-display font-bold text-emerald-600 dark:text-emerald-400 tabular-nums block">
                              +{formatKr(inc.amount)}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                              Den {inc.payday || payday}:e
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteIncome(inc.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                            title="Ta bort"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] px-1">Ingen inkomst tillagd än.</p>
              )}

              {addingType === 'income' ? (
                <form
                  onSubmit={handleQuickAdd}
                  className="p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="T.ex. Lön"
                      autoFocus
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Belopp"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-24 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold cursor-pointer"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingType('income');
                    setNewItemName('');
                    setNewItemAmount('');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <Plus size={13} weight="bold" />
                  <span>Lägg till inkomst</span>
                </button>
              )}
            </section>

            {/* Fasta utgifter (Samma kortdesign som Fasta-fliken) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display font-bold text-xs text-[var(--text-muted)]">
                  Fasta utgifter ({fixedExpenses.length})
                </h2>
                <span className="font-display font-bold text-xs text-[var(--text-primary)] tabular-nums">
                  -{formatKr(totalFix)}
                </span>
              </div>

              {fixedExpenses.length > 0 ? (
                <div className="space-y-2">
                  {fixedExpenses.map((exp) => {
                    const isEditing = editingId === exp.id;
                    if (isEditing) {
                      return (
                        <div
                          key={exp.id}
                          className="p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--text-primary)] space-y-2.5 text-xs"
                        >
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] font-semibold text-[var(--text-primary)] focus:outline-none"
                              placeholder="Namn"
                            />
                            <input
                              type="number"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-24 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] font-bold text-[var(--text-primary)] tabular-nums focus:outline-none"
                              placeholder="Belopp"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[var(--text-muted)]">Förfallodag:</span>
                              <input
                                type="number"
                                min={1}
                                max={31}
                                value={editDay}
                                onChange={(e) => setEditDay(Number(e.target.value) || 27)}
                                className="w-14 px-2 py-1 rounded-lg bg-[var(--bg-color)] border border-[var(--border-subtle)] font-bold text-center tabular-nums"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onDeleteFixed(exp.id)}
                                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                title="Ta bort"
                              >
                                <Trash size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => saveEditFixed(exp)}
                                className="px-3 py-1.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Check size={13} weight="bold" />
                                <span>Spara</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={exp.id}
                        className="w-full p-3.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => startEditingFixed(exp)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                        >
                          <ItemLogo
                            name={exp.name}
                            category={exp.category}
                            logoUrl={exp.logo}
                            size="md"
                            isRecurring={false}
                          />
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 truncate">
                              <span className="truncate">{exp.name}</span>
                              <PencilSimple size={11} className="text-[var(--text-muted)] shrink-0" />
                            </span>
                            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5 truncate">
                              <span className="inline-flex items-center gap-1 truncate">
                                <CategoryIcon category={exp.category || 'Räkningar'} size={12} />
                                <span className="truncate">{exp.category || 'Räkningar'}</span>
                              </span>
                            </div>
                          </div>
                        </button>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditingFixed(exp)}
                            className="text-right cursor-pointer"
                          >
                            <span className="font-display font-bold text-[var(--text-primary)] tabular-nums block">
                              -{formatKr(exp.amount)}
                            </span>
                            <span className="text-xs text-[var(--text-muted)] tabular-nums block mt-0.5">
                              Den {exp.dueDay}:e
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteFixed(exp.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                            title="Ta bort"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] px-1">
                  Inga fasta utgifter tillagda än.
                </p>
              )}

              {addingType === 'fixed' ? (
                <form
                  onSubmit={handleQuickAdd}
                  className="p-3 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="T.ex. Hyra"
                      autoFocus
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Belopp"
                      value={newItemAmount}
                      onChange={(e) => setNewItemAmount(e.target.value)}
                      className="w-24 px-3 py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-color)] text-xs font-bold cursor-pointer"
                    >
                      <Check size={14} weight="bold" />
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAddingType('fixed');
                    setNewItemName('');
                    setNewItemAmount('');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <Plus size={13} weight="bold" />
                  <span>Lägg till fast utgift</span>
                </button>
              )}
            </section>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer shrink-0"
          >
            <span>Klar</span>
            <Check size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
};
