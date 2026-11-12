import React from 'react';
import type { SetStateAction } from 'react';
import type { OnboardingFlowProps } from '../OnboardingFlow';
import { SWEDISH_EXPENSE_PRESETS } from '../../data/swedishExpensePresets';
import { Plus } from '@phosphor-icons/react';
import { getLogoUrl } from '../../utils/logo';
import { normalizeCategoryToValid } from '../../utils/cache/categories';
import {
  SheetEditorState,
} from './onboardingConfig';

export interface OnboardingSheetContext
  extends Pick<
    OnboardingFlowProps,
    'incomes' | 'fixedExpenses' | 'onAddIncome' | 'onAddFixed' | 'onUpdateIncome' | 'onUpdateFixed' | 'onDeleteIncome' | 'onDeleteFixed'
  > {
  setSheetSubView: (value: SetStateAction<"main" | "day-picker" | "category-picker" | "payment-picker">) => void;
  setSheetNavDir: (value: SetStateAction<"forward" | "back">) => void;
  setSheetEditor: (value: SetStateAction<SheetEditorState | null>) => void;
  payday: number;
  sheetEditor: SheetEditorState | null;
  setSuggestedIncomes: (value: SetStateAction<{ id: string; name: string; amount: number; payday: number; category: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; }[]>) => void;
  setPayday: (value: SetStateAction<number>) => void;
  suggestedIncomes: { id: string; name: string; amount: number; payday: number; category: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; }[];
  setSuggestedFixedExpenses: (value: SetStateAction<{ id: string; name: string; amount: number; dueDay: number; category: string; paymentMethod?: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; isShared?: boolean; fullAmount?: number; }[]>) => void;
  suggestedFixedExpenses: { id: string; name: string; amount: number; dueDay: number; category: string; paymentMethod?: string; evidenceSummary?: string; checked: boolean; logo?: string; isFromBank?: boolean; isShared?: boolean; fullAmount?: number; }[];
}

/** Funktionerna för lägg-till/ändra-bladet i onboardingen. Ingen hook – anropar inga React-hooks. */
export function createOnboardingSheetActions({
  setSheetSubView,
  setSheetNavDir,
  setSheetEditor,
  payday,
  sheetEditor,
  setSuggestedIncomes,
  setPayday,
  suggestedIncomes,
  setSuggestedFixedExpenses,
  suggestedFixedExpenses,
  incomes,
  fixedExpenses,
  onAddIncome,
  onAddFixed,
  onUpdateIncome,
  onUpdateFixed,
  onDeleteIncome,
  onDeleteFixed,
}: OnboardingSheetContext) {
  const openAddSheet = (
    type: 'income' | 'fixed',
    preset?: { name: string; category: string; day?: number; amount?: number; paymentMethod?: string }
  ) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'add',
      type,
      name: preset?.name ?? '',
      amount: preset?.amount ? String(preset.amount) : '',
      day: preset?.day ?? (type === 'income' ? payday || 25 : 27),
      category: preset?.category ?? (type === 'income' ? 'Lön' : 'Räkningar'),
      paymentMethod: type === 'fixed' ? preset?.paymentMethod ?? 'Autogiro' : undefined,
      logo: preset ? getLogoUrl(preset.name, preset.category) : undefined,
    });
  };

  // Snabbknappar: namn och kategori är ifyllda, användaren skriver bara sitt belopp
  const QUICK_INCOMES = [
    { name: 'Lön', category: 'Lön' },
    { name: 'CSN', category: 'Bidrag' },
    { name: 'Bidrag', category: 'Bidrag' },
    { name: 'Pension', category: 'Pension' },
  ];
  // Vanligaste fasta kostnaderna för unga vuxna i Sverige, i grupper.
  // Abonnemang med fast pris får priset ifyllt från prislistan (swedishExpensePresets) – det går att ändra.
  type QuickChip = { name: string; category: string; amount?: number; paymentMethod?: string };
  const fromPreset = (presetId: string, name: string, category: string): QuickChip => {
    const preset = SWEDISH_EXPENSE_PRESETS.find((x) => x.id === presetId);
    return { name, category, amount: preset?.defaultAmount, paymentMethod: preset?.paymentMethod };
  };
  const QUICK_FIXED_GROUPS: { title: string; items: QuickChip[] }[] = [
    {
      title: 'Boende och räkningar',
      items: [
        { name: 'Hyra', category: 'Boende' },
        { name: 'El', category: 'Boende' },
        { name: 'Hemförsäkring', category: 'Försäkring' },
        { name: 'Mobil', category: 'Abonnemang' },
        { name: 'Bredband', category: 'Abonnemang' },
        { name: 'CSN', category: 'Räkningar' },
        { name: 'A-kassa & fack', category: 'Räkningar' },
        { name: 'Lån', category: 'Räkningar' },
      ],
    },
    {
      title: 'Resor',
      items: [
        { name: 'Månadskort', category: 'Transport', paymentMethod: 'Kort' },
        { name: 'Bilförsäkring', category: 'Försäkring' },
        { name: 'Billån/leasing', category: 'Transport' },
      ],
    },
    {
      title: 'Abonnemang',
      items: [
        fromPreset('netflix-standard', 'Netflix', 'Nöje'),
        fromPreset('spotify-individual', 'Spotify', 'Nöje'),
        fromPreset('youtube-premium', 'YouTube Premium', 'Nöje'),
        fromPreset('disney-plus', 'Disney+', 'Nöje'),
        fromPreset('max-hbo', 'Max', 'Nöje'),
        fromPreset('viaplay-film-serier', 'Viaplay', 'Nöje'),
        fromPreset('storytel-ljudbok', 'Storytel', 'Nöje'),
        { name: 'Gym', category: 'Hälsa' },
      ],
    },
    {
      title: 'Sparande',
      items: [{ name: 'Sparande', category: 'Sparande', paymentMethod: 'Överföring' }],
    },
  ];
  const QUICK_FIXED: QuickChip[] = QUICK_FIXED_GROUPS.flatMap((g) => g.items);

  const openEditSuggestedFixed = (item: {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: string;
    paymentMethod?: string;
    logo?: string;
    isShared?: boolean;
    fullAmount?: number;
  }) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'fixed',
      id: item.id,
      name: item.name,
      amount: String(Math.round(item.amount)),
      day: item.dueDay || 27,
      category: normalizeCategoryToValid(item.category || 'Räkningar', 'expense'),
      paymentMethod: item.paymentMethod || 'Autogiro',
      logo: item.logo,
      isShared: Boolean(item.isShared),
      fullAmount: item.fullAmount ? String(Math.round(item.fullAmount)) : String(Math.round(item.amount * 2)),
    });
  };

  const openEditSuggestedIncome = (item: {
    id: string;
    name: string;
    amount: number;
    payday: number;
    category: string;
    logo?: string;
  }) => {
    setSheetSubView('main');
    setSheetNavDir('forward');
    setSheetEditor({
      mode: 'edit',
      type: 'income',
      id: item.id,
      name: item.name,
      amount: String(Math.round(item.amount)),
      day: item.payday || payday || 25,
      category: normalizeCategoryToValid(item.category || 'Lön', 'income'),
      logo: item.logo,
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
      const nextCat = normalizeCategoryToValid(sheetEditor.category || 'Lön', 'income');
      const nextLogo = sheetEditor.logo || getLogoUrl(cleanTitle, nextCat);
      if (sheetEditor.mode === 'add') {
        onAddIncome({
          name: cleanTitle,
          amount: cleanAmt,
          payday: cleanDay,
          category: nextCat,
          logo: nextLogo,
        });
        setSuggestedIncomes((prev) => [
          ...prev,
          {
            id: `custom-inc-${Date.now()}`,
            name: cleanTitle,
            amount: cleanAmt,
            payday: cleanDay,
            category: nextCat,
            logo: nextLogo,
            checked: true,
          },
        ]);
        setPayday(cleanDay);
      } else if (sheetEditor.id) {
        const prevSuggested = suggestedIncomes.find((i) => i.id === sheetEditor.id);
        setSuggestedIncomes((prev) =>
          prev.map((item) =>
            item.id === sheetEditor.id
              ? {
                  ...item,
                  name: cleanTitle,
                  amount: cleanAmt,
                  payday: cleanDay,
                  category: nextCat,
                  logo: nextLogo,
                  checked: true,
                }
              : item
          )
        );
        if (onUpdateIncome) {
          const existing = incomes.find(
            (i) =>
              i.id === sheetEditor.id ||
              (prevSuggested && i.name.toLowerCase() === prevSuggested.name.toLowerCase())
          );
          if (existing) {
            onUpdateIncome({
              ...existing,
              name: cleanTitle,
              amount: cleanAmt,
              payday: cleanDay,
              category: nextCat,
              logo: nextLogo,
            });
          }
        }
        setPayday(cleanDay);
      }
    } else {
      const nextCat = normalizeCategoryToValid(sheetEditor.category || 'Räkningar', 'expense');
      const nextMethod = sheetEditor.paymentMethod || 'Autogiro';
      const nextLogo = sheetEditor.logo || getLogoUrl(cleanTitle, nextCat);
      const nextIsShared = Boolean(sheetEditor.isShared);
      const nextFullAmt = nextIsShared
        ? Math.max(cleanAmt, Math.round(Number(sheetEditor.fullAmount) || cleanAmt * 2))
        : undefined;
      if (sheetEditor.mode === 'add') {
        onAddFixed({
          name: cleanTitle,
          amount: cleanAmt,
          dueDay: cleanDay,
          category: nextCat,
          paymentMethod: nextMethod,
          logo: nextLogo,
          isShared: nextIsShared,
          fullAmount: nextFullAmt,
        });
        setSuggestedFixedExpenses((prev) => [
          ...prev,
          {
            id: `custom-${Date.now()}`,
            name: cleanTitle,
            amount: cleanAmt,
            dueDay: cleanDay,
            category: nextCat,
            paymentMethod: nextMethod,
            logo: nextLogo,
            checked: true,
            isShared: nextIsShared,
            fullAmount: nextFullAmt,
          },
        ]);
      } else if (sheetEditor.id) {
        const prevSuggested = suggestedFixedExpenses.find((f) => f.id === sheetEditor.id);
        setSuggestedFixedExpenses((prev) =>
          prev.map((item) =>
            item.id === sheetEditor.id
              ? {
                  ...item,
                  name: cleanTitle,
                  amount: cleanAmt,
                  dueDay: cleanDay,
                  category: nextCat,
                  paymentMethod: nextMethod,
                  logo: nextLogo,
                  checked: true,
                  isShared: nextIsShared,
                  fullAmount: nextFullAmt,
                }
              : item
          )
        );
        if (onUpdateFixed) {
          const existing = fixedExpenses.find(
            (f) =>
              f.id === sheetEditor.id ||
              (prevSuggested && f.name.toLowerCase() === prevSuggested.name.toLowerCase())
          );
          if (existing) {
            onUpdateFixed({
              ...existing,
              name: cleanTitle,
              amount: cleanAmt,
              dueDay: cleanDay,
              category: nextCat,
              paymentMethod: nextMethod,
              logo: nextLogo,
              isShared: nextIsShared,
              fullAmount: nextFullAmt,
            });
          }
        }
      }
    }

    setSheetEditor(null);
  };

  const handleDeleteFromSheet = () => {
    if (!sheetEditor || !sheetEditor.id) return;
    if (sheetEditor.type === 'income') {
      const target = suggestedIncomes.find((i) => i.id === sheetEditor.id);
      setSuggestedIncomes((prev) => prev.filter((i) => i.id !== sheetEditor.id));
      const existing = incomes.find(
        (i) =>
          i.id === sheetEditor.id ||
          (target && i.name.toLowerCase() === target.name.toLowerCase())
      );
      if (existing) {
        onDeleteIncome(existing.id);
      }
    } else {
      const target = suggestedFixedExpenses.find((f) => f.id === sheetEditor.id);
      setSuggestedFixedExpenses((prev) => prev.filter((f) => f.id !== sheetEditor.id));
      const existing = fixedExpenses.find(
        (f) =>
          f.id === sheetEditor.id ||
          (target && f.name.toLowerCase() === target.name.toLowerCase())
      );
      if (existing) {
        onDeleteFixed(existing.id);
      }
    }
    setSheetEditor(null);
  };

  const renderQuickChips = (type: 'income' | 'fixed') => {
    const taken = new Set(
      (type === 'income' ? suggestedIncomes : suggestedFixedExpenses).map((i) =>
        i.name.toLowerCase()
      )
    );
    const chips = (type === 'income' ? QUICK_INCOMES : QUICK_FIXED).filter(
      (c) => !taken.has(c.name.toLowerCase())
    );
    const renderChip = (c: { name: string; category: string; amount?: number; paymentMethod?: string }) => (
      <button
        key={c.name}
        type="button"
        onClick={() => openAddSheet(type, c)}
        className="ui-onb-chip"
      >
        <Plus size={14} className="text-[var(--accent-color)]" />
        <span>{c.name}</span>
      </button>
    );
    if (type === 'fixed') {
      return (
        <div className="space-y-4">
          {QUICK_FIXED_GROUPS.map((group) => {
            const groupChips = group.items.filter((c) => !taken.has(c.name.toLowerCase()));
            if (groupChips.length === 0) return null;
            return (
              <div key={group.title} className="space-y-2">
                <p className="ui-onb-group-label">{group.title}</p>
                <div className="flex flex-wrap gap-2">{groupChips.map(renderChip)}</div>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => openAddSheet(type)}
            className="ui-onb-chip-other"
          >
            <Plus size={14} />
            <span>Annat</span>
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => openAddSheet(type, c)}
            className="ui-onb-chip"
          >
            <Plus size={14} className="text-[var(--accent-color)]" />
            <span>{c.name}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => openAddSheet(type)}
          className="ui-onb-chip-other"
        >
          <Plus size={14} />
          <span>Annat</span>
        </button>
      </div>
    );
  };

  return { openEditSuggestedFixed, renderQuickChips, openEditSuggestedIncome, handleSaveSheet, handleDeleteFromSheet };
}
