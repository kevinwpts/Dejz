import React, { useState } from 'react';
import {
  ArrowRight,
  CaretLeft,
  Bank,
  CheckCircle,
  Plus,
  Trash,
  Check,
} from '@phosphor-icons/react';
import { IncomeItem, FixedExpenseItem } from './HomeTab';
import { BankConnection } from '../services/bankService';
import { ItemLogo } from './ItemLogo';
import { CategoryIcon } from './CategoryIcon';

interface OnboardingFlowProps {
  initialName: string;
  connections: BankConnection[];
  incomes: IncomeItem[];
  fixedExpenses: FixedExpenseItem[];
  onSaveName: (name: string) => void;
  onOpenBankModal: () => void;
  onAddIncome: (item: Omit<IncomeItem, 'id'>) => void;
  onDeleteIncome: (id: string) => void;
  onAddFixed: (item: Omit<FixedExpenseItem, 'id'>) => void;
  onDeleteFixed: (id: string) => void;
  onComplete: () => void;
  onBackToLanding?: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  initialName,
  connections,
  incomes,
  fixedExpenses,
  onSaveName,
  onOpenBankModal,
  onAddIncome,
  onDeleteIncome,
  onAddFixed,
  onDeleteFixed,
  onComplete,
  onBackToLanding,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(initialName || '');

  // Quick-add states for Step 3
  const [addingType, setAddingType] = useState<'income' | 'fixed' | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  const hasConnectedBank = connections.length > 0;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveName(trimmed);
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
        payday: 25,
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

  const totalInc = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalFix = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);

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

      {/* STEP 1: NAMN */}
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
                Så vi vet vem vi hälsar på.
              </p>
            </div>

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
                Hämta konton, lön och fasta utgifter via Enable Banking.
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
                          Ansluten
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
        <div className="flex-1 flex flex-col justify-between py-6 animate-fade-in min-h-0">
          <div className="space-y-5 overflow-y-auto pr-0.5 pb-4">
            <div className="space-y-1">
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
                Inkomster & fasta utgifter
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Fastslå dina månadsposter.
              </p>
            </div>

            {/* Inkomster */}
            <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Inkomster
                </span>
                <span className="font-display font-bold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatKr(totalInc)}
                </span>
              </div>

              {incomes.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {incomes.map((inc) => (
                    <div
                      key={inc.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ItemLogo
                          name={inc.name}
                          category={inc.category}
                          logoUrl={inc.logo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)] block truncate">
                            {inc.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                            <CategoryIcon category={inc.category || 'Lön'} size={11} />
                            <span className="truncate">{inc.category || 'Lön'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
                          {formatKr(inc.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteIncome(inc.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Ta bort"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Ingen inkomst tillagd än.</p>
              )}

              {addingType === 'income' ? (
                <form onSubmit={handleQuickAdd} className="pt-2 space-y-2">
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
                  className="w-full py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <Plus size={13} weight="bold" />
                  <span>Lägg till inkomst</span>
                </button>
              )}
            </div>

            {/* Fasta utgifter */}
            <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Fasta utgifter
                </span>
                <span className="font-display font-bold text-xs text-[var(--text-primary)] tabular-nums">
                  {formatKr(totalFix)}
                </span>
              </div>

              {fixedExpenses.length > 0 ? (
                <div className="divide-y divide-[var(--border-subtle)] max-h-56 overflow-y-auto pr-1">
                  {fixedExpenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ItemLogo
                          name={exp.name}
                          category={exp.category}
                          logoUrl={exp.logo}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-[var(--text-primary)] block truncate">
                            {exp.name}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 truncate mt-0.5">
                            <CategoryIcon category={exp.category || 'Räkningar'} size={11} />
                            <span className="truncate">{exp.category || 'Räkningar'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-display font-bold text-[var(--text-primary)] tabular-nums">
                          {formatKr(exp.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteFixed(exp.id)}
                          className="p-1 text-[var(--text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                          title="Ta bort"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">
                  Inga fasta utgifter tillagda än.
                </p>
              )}

              {addingType === 'fixed' ? (
                <form onSubmit={handleQuickAdd} className="pt-2 space-y-2">
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
                  className="w-full py-2 rounded-xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-xs font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
                >
                  <Plus size={13} weight="bold" />
                  <span>Lägg till fast utgift</span>
                </button>
              )}
            </div>
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
