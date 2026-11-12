// @vitest-environment jsdom
// Fasta utgifter och inkomster: visa, redigera, spara, avbryta och ta bort.
// Beloppen här styr "kvar till lön" – fel värde i onUpdate/onSave ger fel siffra på hemkortet.
import { describe, expect, test, vi, type Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeFixed, makeIncome, normalizeText } from '../../test/fixtures';

vi.mock('../../utils/logo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/logo')>()),
  fetchLogoForName: vi.fn(async () => undefined),
}));
// "Säg upp"-guiden frågar en Supabase-funktion – här svarar den aldrig på riktigt
const invoke = vi.fn(async () => ({ data: null, error: new Error('inte i test') }));
vi.mock('../../supabaseClient', () => ({
  supabase: { functions: { invoke } },
  isLocalDemoMode: false,
}));

const { FixedExpenseModal } = await import('../modals/FixedExpenseModal');
const { IncomeModal } = await import('../modals/IncomeModal');

const bodyText = () => normalizeText(document.body.textContent);
const sheetTitle = (text: string) => screen.getByText(text, { selector: '.ui-sheet-title' });
/** Dagknappen i dagväljaren (texten, så att det fungerar även om knapparna får aria-label) */
const dayButton = (day: number) => screen.getByText(String(day), { selector: 'button > span' });

type Handlers = {
  onClose: Mock<() => void>;
  onSave: Mock<(data: unknown) => void>;
  onUpdate: Mock<(item: unknown) => void>;
  onDelete: Mock<(id: string) => void>;
};

function setup(ui: (handlers: Handlers) => React.ReactElement) {
  const handlers: Handlers = { onClose: vi.fn(), onSave: vi.fn(), onUpdate: vi.fn(), onDelete: vi.fn() };
  const user = userEvent.setup();
  render(ui(handlers));
  return { ...handlers, user };
}

describe('fast utgift', () => {
  const netflix = makeFixed({ id: 'fx-netflix', name: 'Netflix', amount: 129, dueDay: 15, category: 'Nöje' });
  const renderExisting = () => setup((h) => <FixedExpenseModal isOpen initialExpense={netflix} {...h} />);

  test('visar namn, belopp per månad och dragningsdag', () => {
    renderExisting();
    sheetTitle('Fast utgift');
    expect(screen.getByRole('heading', { name: 'Netflix' })).toBeTruthy();
    expect(bodyText()).toContain('-129 kr/mån');
    expect(bodyText()).toContain('Dras den 15:e varje månad');
  });

  test('Redigera → nytt belopp → Spara skickar rätt belopp och behåller id', async () => {
    const { user, onUpdate } = renderExisting();
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    sheetTitle('Redigera fast utgift');

    const amount = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(amount.value).toBe('129');
    await user.clear(amount);
    await user.type(amount, '149');
    await user.click(screen.getByRole('button', { name: /Spara ändringar/ }));

    expect(onUpdate).toHaveBeenCalledOnce();
    expect(onUpdate.mock.calls[0][0]).toMatchObject({
      id: 'fx-netflix',
      name: 'Netflix',
      amount: 149,
      dueDay: 15,
      category: 'Nöje',
      isShared: false,
    });
    // Tillbaka i visningen med nya beloppet
    expect(bodyText()).toContain('-149 kr/mån');
  });

  test('Spara är avstängt med tomt belopp eller tomt namn', async () => {
    const { user } = renderExisting();
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    const save = () => screen.getByRole('button', { name: /Spara ändringar/ }) as HTMLButtonElement;
    await user.clear(screen.getByPlaceholderText('0'));
    expect(save().disabled).toBe(true);
    await user.type(screen.getByPlaceholderText('0'), '50');
    await user.clear(screen.getByPlaceholderText('Butik eller tjänst'));
    expect(save().disabled).toBe(true);
  });

  test('Avbryt återställer ändringarna utan att spara', async () => {
    const { user, onUpdate } = renderExisting();
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.clear(screen.getByPlaceholderText('0'));
    await user.type(screen.getByPlaceholderText('0'), '999');
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(bodyText()).toContain('-129 kr/mån');
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('129');
  });

  test('ändra dragningsdag direkt från visningen sparar på en gång', async () => {
    const { user, onUpdate } = renderExisting();
    await user.click(screen.getByRole('button', { name: /Dragningsdag/ }));
    sheetTitle('Välj dragningsdag');
    await user.click(dayButton(27));
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ id: 'fx-netflix', dueDay: 27, amount: 129 });
    expect(bodyText()).toContain('Dras den 27:e varje månad');
  });

  test('ta bort kräver bekräftelse', async () => {
    const { user, onDelete, onClose } = renderExisting();
    await user.click(screen.getByRole('button', { name: /Ta bort fast utgift/ }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Netflix tas bort från dina fasta utgifter.')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Ta bort' }));
    expect(onDelete).toHaveBeenCalledWith('fx-netflix');
    expect(onClose).toHaveBeenCalled();
  });

  test('ny fast utgift: sparar namn, belopp, dag och betalsätt', async () => {
    const { user, onSave, onClose } = setup((h) => <FixedExpenseModal isOpen initialExpense={null} {...h} />);
    sheetTitle('Lägg till fast utgift');
    const save = () => screen.getByRole('button', { name: /Spara fast utgift/ }) as HTMLButtonElement;
    expect(save().disabled).toBe(true);

    await user.type(screen.getByPlaceholderText('Butik eller tjänst'), 'Hyra');
    await user.type(screen.getByPlaceholderText('0'), '8500');
    await user.click(screen.getByRole('button', { name: /Dragningsdag/ }));
    await user.click(dayButton(28));
    // Tillbaka i formuläret – ingenting sparat ännu
    expect(onSave).not.toHaveBeenCalled();
    expect(bodyText()).toContain('Den 28:e');

    await user.click(save());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave.mock.calls[0][0]).toMatchObject({
      name: 'Hyra',
      amount: 8500,
      dueDay: 28,
      isShared: false,
    });
    expect(onClose).toHaveBeenCalled();
  });

  test('"Säg upp" öppnar valen för uppsägning', async () => {
    const { user } = renderExisting();
    await user.click(screen.getByRole('button', { name: /Säg upp/ }));
    // Vyn byts – visningens rubrik är borta
    expect(screen.queryByText('Fast utgift', { selector: '.ui-sheet-title' })).toBeNull();
  });
});

describe('fast inkomst', () => {
  const salary = makeIncome({ id: 'inc-lon', name: 'Lön Acme AB', amount: 24800, payday: 25, category: 'Lön' });
  const renderExisting = () => setup((h) => <IncomeModal isOpen initialIncome={salary} {...h} />);

  test('visar belopp med plus och utbetalningsdag', () => {
    renderExisting();
    sheetTitle('Fast inkomst');
    expect(bodyText()).toContain('+24 800 kr/mån');
    expect(bodyText()).toContain('Utbetalas den 25:e varje månad');
  });

  test('Redigera → nytt belopp → Spara', async () => {
    const { user, onUpdate } = renderExisting();
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    sheetTitle('Redigera inkomst');
    const amount = screen.getByPlaceholderText('0');
    await user.clear(amount);
    await user.type(amount, '26 100');
    await user.click(screen.getByRole('button', { name: /Spara ändringar/ }));
    expect(onUpdate.mock.calls[0][0]).toEqual({ ...salary, amount: 26100 });
    expect(bodyText()).toContain('+26 100 kr/mån');
  });

  test('Avbryt slänger ändringen', async () => {
    const { user, onUpdate } = renderExisting();
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.clear(screen.getByPlaceholderText('Inkomstkälla'));
    await user.type(screen.getByPlaceholderText('Inkomstkälla'), 'Annat');
    await user.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Lön Acme AB' })).toBeTruthy();
  });

  test('byt utbetalningsdag från visningen', async () => {
    const { user, onUpdate } = renderExisting();
    await user.click(screen.getByRole('button', { name: /Utbetalningsdag/ }));
    await user.click(dayButton(24));
    expect(onUpdate.mock.calls[0][0]).toEqual({ ...salary, payday: 24 });
  });

  test('ta bort kräver bekräftelse', async () => {
    const { user, onDelete } = renderExisting();
    await user.click(screen.getByRole('button', { name: /Ta bort inkomst/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Ta bort' }));
    expect(onDelete).toHaveBeenCalledWith('inc-lon');
  });

  test('ny inkomst sparas med lönedag 25 som standard', async () => {
    const { user, onSave, onClose } = setup((h) => <IncomeModal isOpen initialIncome={null} {...h} />);
    sheetTitle('Lägg till inkomst');
    await user.type(screen.getByPlaceholderText('Inkomstkälla'), 'CSN');
    await user.type(screen.getByPlaceholderText('0'), '3 500');
    await user.click(screen.getByRole('button', { name: /Spara inkomst/ }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'CSN', amount: 3500, payday: 25 }));
    expect(onClose).toHaveBeenCalled();
  });

  test('ny inkomst kan inte sparas utan belopp', async () => {
    const { user } = setup((h) => <IncomeModal isOpen initialIncome={null} {...h} />);
    await user.type(screen.getByPlaceholderText('Inkomstkälla'), 'CSN');
    expect((screen.getByRole('button', { name: /Spara inkomst/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
