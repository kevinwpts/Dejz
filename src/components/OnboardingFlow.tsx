import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
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
import { BottomSheet } from './ui/BottomSheet';

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

type OnboardingStep = 1 | 2 | 3 | 4;

interface SheetEditorState {
  mode: 'add' | 'edit';
  type: 'income' | 'fixed';
  id?: string;
  name: string;
  amount: string;
  day: number;
  category: string;
  paymentMethod?: string;
  logo?: string;
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
  const [step, setStep] = useState<OnboardingStep>(1);
  const [slideDir, setSlideDir] = useState<'forward' | 'back'>('forward');
  const [name, setName] = useState(initialName || '');
  const [payday, setPayday] = useState<number>(targetPayday || 25);
  const [showAllPaydays, setShowAllPaydays] = useState<boolean>(
    () => ![25, 27, 18].includes(targetPayday || 25)
  );

  // BottomSheet editor state for Step 4 (replaces cramped inline forms)
  const [sheetEditor, setSheetEditor] = useState<SheetEditorState | null>(null);
  const [sheetSubView, setSheetSubView] = useState<'main' | 'day-picker'>('main');
  const [sheetNavDir, setSheetNavDir] = useState<'forward' | 'back'>('forward');

  useEffect(() => {
    if (initialName && !name) {
      setName(initialName);
    }
  }, [initialName, name]);

  const hasConnectedBank = connections.length > 0;

  const formatKr = (val: number) =>
    new Intl.NumberFormat('sv-SE').format(Math.round(val)) + ' kr';

  const navigateStep = (next: OnboardingStep, dir: 'forward' | 'back') => {
    setSlideDir(dir);
    setStep(next);
  };

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSaveName(trimmed);
    navigateStep(2, 'forward');
  };

  const handleNextFromStep2 = () => {
    if (onUpdatePayday) {
      onUpdatePayday(payday);
    }
    navigateStep(3, 'forward');
  };

  const openAddSheet = (type: 'income' | 'fixed') => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'add',
      type,
      name: '',
      amount: '',
      day: type === 'income' ? payday || 25 : 27,
      category: type === 'income' ? 'Lön' : 'Räkningar',
      paymentMethod: type === 'fixed' ? 'Autogiro' : undefined,
    });
  };

  const openEditIncomeSheet = (inc: IncomeItem) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'income',
      id: inc.id,
      name: inc.name,
      amount: String(Math.round(inc.amount)),
      day: inc.payday || payday || 25,
      category: inc.category || 'Lön',
      logo: inc.logo,
    });
  };

  const openEditFixedSheet = (exp: FixedExpenseItem) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'fixed',
      id: exp.id,
      name: exp.name,
      amount: String(Math.round(exp.amount)),
      day: exp.dueDay || 27,
      category: exp.category || 'Räkningar',
      paymentMethod: exp.paymentMethod || 'Autogiro',
      logo: exp.logo,
    });
  };

  const handleSaveSheet = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetEditor) return;

    const cleanTitle = sheetEditor.name.trim();
    const cleanAmt = Math.max(0, Math.round(Number(sheetEditor.amount) || 0));
    const cleanDay = Math.min(31, Math.max(1, Number(sheetEditor.day) || 25));

    if (!cleanTitle || cleanAmt <= 0) return;

    if (sheetEditor.type === 'income') {
      if (sheetEditor.mode === 'add') {
        onAddIncome({
          name: cleanTitle,
          amount: cleanAmt,
          payday: cleanDay,
          category: sheetEditor.category || 'Lön',
        });
      } else if (sheetEditor.id && onUpdateIncome) {
        const existing = incomes.find((i) => i.id === sheetEditor.id);
        if (existing) {
          onUpdateIncome({
            ...existing,
            name: cleanTitle,
            amount: cleanAmt,
            payday: cleanDay,
          });
        }
      }
    } else {
      if (sheetEditor.mode === 'add') {
        onAddFixed({
          name: cleanTitle,
          amount: cleanAmt,
          dueDay: cleanDay,
          category: sheetEditor.category || 'Räkningar',
          paymentMethod: sheetEditor.paymentMethod || 'Autogiro',
        });
      } else if (sheetEditor.id && onUpdateFixed) {
        const existing = fixedExpenses.find((f) => f.id === sheetEditor.id);
        if (existing) {
          onUpdateFixed({
            ...existing,
            name: cleanTitle,
            amount: cleanAmt,
            dueDay: cleanDay,
          });
        }
      }
    }

    setSheetEditor(null);
  };

  const handleDeleteFromSheet = () => {
    if (!sheetEditor || !sheetEditor.id) return;
    if (sheetEditor.type === 'income') {
      onDeleteIncome(sheetEditor.id);
    } else {
      onDeleteFixed(sheetEditor.id);
    }
    setSheetEditor(null);
  };

  const totalInc = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalFix = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
  const kvarAttSpendera = Math.max(0, totalInc - totalFix);

  const pageAnimClass =
    slideDir === 'forward' ? 'animate-page-forward' : 'animate-page-back';

  return (
    <div className="min-h-dvh bg-[var(--bg-color)] text-[var(--text-primary)] flex flex-col justify-between max-w-md mx-auto px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] font-sans overflow-x-hidden">
      {/* Top Progress Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between h-10">
          <button
            type="button"
            onClick={() => {
              if (step > 1) {
                navigateStep((step - 1) as OnboardingStep, 'back');
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
            Steg {step} av 4
          </span>

          <div className="w-6" />
        </div>

        {/* Minimal 4-step bar */}
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-colors duration-300 ${
                s <= step ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-subtle)]'
              }`}
            />
          ))}
        </div>
      </header>

      {/* ============================================================== */}
      {/* STEG 1: ENDAST FÖRNAMN ("One question per screen")             */}
      {/* ============================================================== */}
      {step === 1 && (
        <form
          key="step-1"
          onSubmit={handleNextFromStep1}
          className={`flex-1 flex flex-col justify-between py-8 ${pageAnimClass}`}
        >
          <div className="my-auto space-y-8">
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-[var(--text-primary)]">
                Vad heter du?
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Så att vi kan anpassa Dejz för dig.
              </p>
            </div>

            <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] focus-within:border-[var(--text-primary)] rounded-3xl px-5 py-4 transition-colors">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] block mb-1">
                Tilltalsnamn
              </span>
              <input
                type="text"
                autoFocus
                required
                placeholder="Skriv ditt förnamn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-0 p-0 font-display font-extrabold text-xl text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] disabled:opacity-35 transition-all cursor-pointer"
          >
            <span>Fortsätt</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </form>
      )}

      {/* ============================================================== */}
      {/* STEG 2: ENDAST LÖNEDAG (Ingen <select>, ren visuell väljare)   */}
      {/* ============================================================== */}
      {step === 2 && (
        <div
          key="step-2"
          className={`flex-1 flex flex-col justify-between py-8 ${pageAnimClass}`}
        >
          <div className="my-auto space-y-6">
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-[var(--text-primary)]">
                När får du lön?
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Vi räknar ut vad du har kvar att spendera från lön till lön.
              </p>
            </div>

            {/* Vanligaste lönedagarna som stora valkort */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { day: 25, label: 'Den 25:e', sub: 'Vanligast' },
                { day: 27, label: 'Den 27:e', sub: 'Kommun / stat' },
                { day: 18, label: 'Den 18:e', sub: 'Pension / bidrag' },
              ].map((opt) => {
                const active = payday === opt.day;
                return (
                  <button
                    key={opt.day}
                    type="button"
                    onClick={() => setPayday(opt.day)}
                    className={`p-4 rounded-3xl text-left transition-all cursor-pointer border flex flex-col justify-between min-h-[88px] active:scale-[0.98] ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)]'
                        : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                    }`}
                  >
                    <span className="font-display font-extrabold text-base tabular-nums block">
                      {opt.label}
                    </span>
                    <span
                      className={`text-[11px] font-medium block mt-2 ${
                        active ? 'opacity-80' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Annan dag i månaden (7-kolumners kalenderrutnät, aldrig <select>) */}
            <div className="bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAllPaydays((prev) => !prev)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CalendarBlank size={15} className="text-[var(--text-secondary)]" />
                  <span>Annan dag i månaden</span>
                </span>
                <span className="font-display font-bold tabular-nums text-[var(--text-secondary)]">
                  Den {payday}:e
                </span>
              </button>

              {showAllPaydays && (
                <div className="p-3.5 pt-2 border-t border-[var(--border-subtle)]">
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const isSel = payday === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setPayday(d)}
                          className={`h-9 rounded-xl font-display text-xs tabular-nums transition-all cursor-pointer flex items-center justify-center border ${
                            isSel
                              ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-bold'
                              : 'bg-[var(--bg-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)] font-semibold'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextFromStep2}
            className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span>Fortsätt med den {payday}:e</span>
            <ArrowRight size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 3: ENABLE BANKING                                         */}
      {/* ============================================================== */}
      {step === 3 && (
        <div
          key="step-3"
          className={`flex-1 flex flex-col justify-between py-8 ${pageAnimClass}`}
        >
          <div className="my-auto space-y-6">
            <div className="space-y-2">
              <h1 className="font-display font-extrabold text-3xl tracking-tight text-[var(--text-primary)]">
                Koppla din bank
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                Hämta konton, lön och fasta utgifter automatiskt med BankID.
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
                      Säker koppling via Enable Banking
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
              onClick={() => navigateStep(4, 'forward')}
              className="w-full py-3.5 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all cursor-pointer"
            >
              <span>Fortsätt</span>
              <ArrowRight size={16} weight="bold" />
            </button>

            {!hasConnectedBank && (
              <button
                type="button"
                onClick={() => navigateStep(4, 'forward')}
                className="w-full py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Hoppa över just nu
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEG 4: INKOMSTER & FASTA UTGIFTER (Öppnas i riktiga Sheets)   */}
      {/* ============================================================== */}
      {step === 4 && (
        <div
          key="step-4"
          className={`flex-1 flex flex-col justify-between py-5 min-h-0 ${pageAnimClass}`}
        >
          <div className="space-y-5 overflow-y-auto pr-0.5 pb-4">
            <div className="space-y-1">
              <h1 className="font-display font-extrabold text-2xl tracking-tight text-[var(--text-primary)]">
                Stämmer din översikt?
              </h1>
              <p className="text-xs text-[var(--text-secondary)]">
                Tryck på en post för att justera belopp eller datum.
              </p>
            </div>

            {/* Live Kvar att spendera-sammanfattning */}
            <div className="ui-card p-4 flex items-center justify-between gap-3">
              <div>
                <span className="ui-stat-label">
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

            {/* Inkomster (Enhetlig grupperad lista som i Ekonomi-fliken) */}
            <section className="ui-section">
              <div className="ui-section-header">
                <h2 className="ui-section-title">
                  Inkomster ({incomes.length})
                </h2>
                <button
                  type="button"
                  onClick={() => openAddSheet('income')}
                  className="text-xs font-bold text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} weight="bold" />
                  <span>Lägg till</span>
                </button>
              </div>

              {incomes.length > 0 ? (
                <div className="ui-list-card">
                  {incomes.map((inc) => (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => openEditIncomeSheet(inc)}
                      className="ui-tx-row"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={inc.name}
                          category={inc.category}
                          logoUrl={inc.logo}
                          size="md"
                          isRecurring={false}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">
                            {inc.name}
                          </span>
                          <span className="ui-row-subtitle flex items-center gap-1">
                            <span className="truncate">{inc.category || 'Lön'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="ui-row-amount ui-row-amount-income">
                            +{formatKr(inc.amount)}
                          </span>
                          <span className="ui-row-meta">
                            Den {inc.payday || payday}:e
                          </span>
                        </div>
                        <CaretRight size={13} className="text-[var(--text-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddSheet('income')}
                  className="w-full py-4 ui-card text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Lägg till din inkomst</span>
                </button>
              )}
            </section>

            {/* Fasta utgifter (Enhetlig grupperad lista som i Ekonomi-fliken) */}
            <section className="ui-section">
              <div className="ui-section-header">
                <h2 className="ui-section-title">
                  Fasta utgifter ({fixedExpenses.length})
                </h2>
                <button
                  type="button"
                  onClick={() => openAddSheet('fixed')}
                  className="text-xs font-bold text-[var(--text-primary)] hover:opacity-75 flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} weight="bold" />
                  <span>Lägg till</span>
                </button>
              </div>

              {fixedExpenses.length > 0 ? (
                <div className="ui-list-card">
                  {fixedExpenses.map((exp) => (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => openEditFixedSheet(exp)}
                      className="ui-tx-row"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <ItemLogo
                          name={exp.name}
                          category={exp.category}
                          logoUrl={exp.logo}
                          size="md"
                          isRecurring={false}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="ui-row-title">
                            {exp.name}
                          </span>
                          <span className="ui-row-subtitle flex items-center gap-1">
                            <span className="truncate">{exp.category || 'Räkningar'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="ui-row-amount">
                            -{formatKr(exp.amount)}
                          </span>
                          <span className="ui-row-meta">
                            Den {exp.dueDay}:e
                          </span>
                        </div>
                        <CaretRight size={13} className="text-[var(--text-muted)]" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openAddSheet('fixed')}
                  className="w-full py-4 ui-card text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Lägg till fast utgift</span>
                </button>
              )}
            </section>
          </div>

          <button
            type="button"
            onClick={onComplete}
            className="ui-btn-primary py-3.5 text-sm shrink-0"
          >
            <span>Öppna Dejz</span>
            <Check size={16} weight="bold" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* RIKTIGT BOTTOM-SHEET FÖR ATT LÄGGA TILL / ÄNDRA I STEG 4       */}
      {/* ============================================================== */}
      <BottomSheet
        isOpen={Boolean(sheetEditor)}
        onClose={() => setSheetEditor(null)}
      >
        {sheetEditor && (
          <div>
            {sheetSubView === 'day-picker' ? (
              <div
                key="sheet-day-picker"
                className="animate-page-forward space-y-4"
              >
                <div className="ui-sheet-sub-header">
                  <button
                    type="button"
                    onClick={() => {
                      setSheetNavDir('back');
                      setSheetSubView('main');
                    }}
                    title="Tillbaka"
                    aria-label="Tillbaka"
                    className="ui-icon-btn"
                  >
                    <CaretLeft size={15} weight="bold" />
                  </button>
                  <span className="ui-sheet-title">
                    {sheetEditor.type === 'income' ? 'Välj lönedag' : 'Välj förfallodag'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheetEditor(null)}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] space-y-3">
                  <span className="text-[11px] font-medium text-[var(--text-muted)] block text-center">
                    Vilken dag i månaden?
                  </span>
                  <div className="grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const isSel = sheetEditor.day === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setSheetEditor({ ...sheetEditor, day: d });
                            setSheetNavDir('back');
                            setSheetSubView('main');
                          }}
                          className={`h-10 rounded-xl font-display text-xs tabular-nums transition-all cursor-pointer flex items-center justify-center border ${
                            isSel
                              ? 'bg-[var(--text-primary)] text-[var(--bg-color)] border-[var(--text-primary)] font-bold'
                              : 'bg-[var(--surface-color)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)] font-semibold'
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <form
                key="sheet-main"
                onSubmit={handleSaveSheet}
                className={`space-y-5 ${
                  sheetNavDir === 'back' ? 'animate-page-back' : ''
                }`}
              >
                <div className="ui-sheet-sub-header">
                  <span className="ui-sheet-title">
                    {sheetEditor.mode === 'add'
                      ? sheetEditor.type === 'income'
                        ? 'Lägg till inkomst'
                        : 'Lägg till fast utgift'
                      : sheetEditor.type === 'income'
                      ? 'Redigera inkomst'
                      : 'Redigera fast utgift'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSheetEditor(null)}
                    className="ui-icon-btn"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Hero Amount & Logo Preview */}
                <div className="ui-hero-header">
                  <div className="ui-hero-icon">
                    <ItemLogo
                      name={
                        sheetEditor.name ||
                        (sheetEditor.type === 'income' ? 'Lön' : 'Fast utgift')
                      }
                      category={sheetEditor.category}
                      logoUrl={sheetEditor.logo}
                      size="xl"
                      isRecurring={true}
                    />
                  </div>
                  <div
                    className={`font-display font-extrabold text-3xl tabular-nums ${
                      sheetEditor.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {sheetEditor.type === 'income' ? '+' : '-'}
                    {formatKr(Math.max(0, Math.round(Number(sheetEditor.amount) || 0)))}
                  </div>
                </div>

                {/* Hairline-Divided Direct Manipulation Fields */}
                <div className="ui-sheet-group text-[13px] sm:text-sm">
                  <label className="ui-input-row">
                    <span className="text-[var(--text-muted)] shrink-0">Namn</span>
                    <div className="flex items-center justify-end gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        required
                        autoFocus={sheetEditor.mode === 'add'}
                        placeholder={
                          sheetEditor.type === 'income' ? 't.ex. Lön' : 't.ex. Hyra'
                        }
                        value={sheetEditor.name}
                        onChange={(e) =>
                          setSheetEditor({ ...sheetEditor, name: e.target.value })
                        }
                        className="ui-inline-input"
                      />
                      <PencilSimple size={12} className="text-[var(--text-muted)] shrink-0 opacity-60" />
                    </div>
                  </label>

                  <label className="ui-input-row">
                    <span className="text-[var(--text-muted)] shrink-0">Belopp (kr)</span>
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        placeholder="0"
                        value={sheetEditor.amount}
                        onChange={(e) =>
                          setSheetEditor({
                            ...sheetEditor,
                            amount: e.target.value.replace(/[^\d]/g, ''),
                          })
                        }
                        className="w-28 bg-transparent border-0 p-0 text-xs font-display font-bold text-[var(--text-primary)] placeholder-[var(--text-muted)] text-right tabular-nums focus:outline-none"
                      />
                      <PencilSimple size={12} className="text-[var(--text-muted)] shrink-0 opacity-60" />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setSheetNavDir('forward');
                      setSheetSubView('day-picker');
                    }}
                    className="ui-row-btn"
                  >
                    <span className="text-[var(--text-muted)] shrink-0">
                      {sheetEditor.type === 'income' ? 'Utbetalningsdag' : 'Förfallodag'}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                      <span>Den {sheetEditor.day}:e</span>
                      <CaretRight size={12} className="text-[var(--text-muted)]" />
                    </span>
                  </button>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={!sheetEditor.name.trim() || !(Number(sheetEditor.amount) > 0)}
                    className="ui-btn-primary"
                  >
                    <Check size={14} weight="bold" />
                    <span>Spara</span>
                  </button>

                  {sheetEditor.mode === 'edit' && (
                    <button
                      type="button"
                      onClick={handleDeleteFromSheet}
                      className="ui-btn-danger"
                    >
                      <Trash size={14} />
                      <span>Ta bort</span>
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
};

