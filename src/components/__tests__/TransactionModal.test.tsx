// @vitest-environment jsdom
// Köpfönstret: visa ett köp, redigera belopp/namn, avbryta, välja hur långt ett namnbyte gäller,
// ta bort, och lägga till ett nytt köp. Här hamnar pengarna – fel värde till onUpdate/onSave
// betyder fel siffra på hemkortet.
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { TransactionItem } from '../../app/models';
import { makeTx, normalizeText } from '../../test/fixtures';

// AI-kategorisering/loggor går mot nätet – i testerna svarar de direkt utan resultat
vi.mock('../../utils/logo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/logo')>()),
  fetchLogoForName: vi.fn(async () => undefined),
}));

const { TransactionModal } = await import('../modals/TransactionModal');

type ModalProps = React.ComponentProps<typeof TransactionModal>;

function renderModal(props: Partial<ModalProps> = {}) {
  const handlers = {
    onClose: vi.fn(),
    onSave: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
  };
  const user = userEvent.setup();
  const utils = render(<TransactionModal isOpen {...handlers} {...props} />);
  return { ...utils, ...handlers, user };
}

const bodyText = () => normalizeText(document.body.textContent);
const nameInput = () => screen.getByPlaceholderText('Butik eller köp');
const amountInput = () => screen.getByPlaceholderText('0');

/** Rubriken i arket (det finns ingen dialog-roll på bottenarket) */
const sheetTitle = (text: string) => screen.getByText(text, { selector: '.ui-sheet-title' });

describe('köpfönstret – visa och redigera ett köp', () => {
  const ica = makeTx({ id: 'tx-ica', title: 'Ica Maxi', amount: 250, category: 'Mat & dryck' });

  test('förhandsvisningen visar namn och belopp med minustecken', () => {
    renderModal({ initialTransaction: ica });
    expect(screen.getByRole('heading', { name: 'Ica Maxi' })).toBeTruthy();
    expect(bodyText()).toContain('-250 kr');
    // Inget redigeringsfält syns förrän man trycker Redigera
    expect(screen.queryByPlaceholderText('Butik eller köp')).toBeNull();
  });

  test('Redigera → ändra belopp → Spara skickar det nya beloppet för bara det här köpet', async () => {
    const { user, onUpdate } = renderModal({ initialTransaction: ica });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    sheetTitle('Redigera köp');

    expect((nameInput() as HTMLInputElement).value).toBe('Ica Maxi');
    expect((amountInput() as HTMLInputElement).value).toBe('250');

    await user.clear(amountInput());
    await user.type(amountInput(), '3a1,9'); // bara siffror sparas
    expect((amountInput() as HTMLInputElement).value).toBe('319');
    await user.click(screen.getByRole('button', { name: /Spara ändringar/ }));

    // Oförändrat namn och kategori → ingen fråga om fler köp, direkt sparat
    expect(screen.queryByText(/på fler köp\?/)).toBeNull();
    expect(onUpdate).toHaveBeenCalledOnce();
    const [saved, applyToIds, options] = onUpdate.mock.calls[0];
    expect(saved).toMatchObject({ id: 'tx-ica', title: 'Ica Maxi', amount: 319, category: 'Mat & dryck' });
    expect(applyToIds).toBeUndefined();
    expect(options).toEqual({ renameScope: 'single', renameTargetIds: undefined, categoryTargetIds: undefined });

    // Tillbaka i förhandsvisningen med det nya beloppet
    expect(screen.queryByPlaceholderText('Butik eller köp')).toBeNull();
    expect(bodyText()).toContain('-319 kr');
  });

  test('ett tomt belopp sparas inte som 0 kr – det gamla beloppet behålls', async () => {
    const { user, onUpdate } = renderModal({ initialTransaction: ica });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.clear(amountInput());
    await user.click(screen.getByRole('button', { name: /Spara ändringar/ }));
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ amount: 250 });
  });

  test('Avbryt slänger ändringarna och visar köpet som det var', async () => {
    const { user, onUpdate } = renderModal({ initialTransaction: ica });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.clear(nameInput());
    await user.type(nameInput(), 'Något annat');
    await user.clear(amountInput());
    await user.type(amountInput(), '999');

    await user.click(screen.getByRole('button', { name: 'Avbryt' }));

    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Ica Maxi' })).toBeTruthy();
    expect(bodyText()).toContain('-250 kr');
    expect(bodyText()).not.toContain('999');

    // Öppnar man redigeringen igen är fälten återställda
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    expect((nameInput() as HTMLInputElement).value).toBe('Ica Maxi');
    expect((amountInput() as HTMLInputElement).value).toBe('250');
  });

  test('Spara är avstängt när namnet är tomt', async () => {
    const { user } = renderModal({ initialTransaction: ica });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.clear(nameInput());
    expect((screen.getByRole('button', { name: /Spara ändringar/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  test('ta bort: kräver bekräftelse och skickar rätt id', async () => {
    const { user, onDelete, onClose } = renderModal({ initialTransaction: ica });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.click(screen.getByRole('button', { name: /Ta bort transaktion/ }));

    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Ta bort transaktion?')).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Ta bort' }));
    expect(onDelete).toHaveBeenCalledWith('tx-ica');
    expect(onClose).toHaveBeenCalled();
  });

  test('ångrar man borttagningen händer ingenting', async () => {
    const { user, onDelete } = renderModal({ initialTransaction: ica });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await user.click(screen.getByRole('button', { name: /Ta bort transaktion/ }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Avbryt' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  test('inkomster visas med plus och "Redigera inkomst"', async () => {
    const salary = makeTx({ title: 'Lön Acme AB', amount: 24800, type: 'income', category: 'Lön' });
    const { user } = renderModal({ initialTransaction: salary });
    expect(bodyText()).toContain('+24 800 kr');
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    sheetTitle('Redigera inkomst');
  });
});

describe('köpfönstret – köp från banken', () => {
  const bankTx = makeTx({
    id: 'bank-123',
    title: 'Ica Nära',
    amount: 87,
    rawDescription: 'ICA NARA SODERMALM',
    bankAccountName: 'Swedbank · Lönekonto',
  });

  test('beloppet från banken går inte att ändra', async () => {
    const { user, onUpdate } = renderModal({ initialTransaction: bankTx });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    expect(screen.queryByPlaceholderText('0')).toBeNull();
    expect(bodyText()).toContain('Banktext: ICA NARA SODERMALM');

    await user.click(screen.getByRole('button', { name: /Spara ändringar/ }));
    expect(onUpdate.mock.calls[0][0]).toMatchObject({ amount: 87, date: bankTx.date });
  });

  test('bankköp kan inte tas bort (bara döljas)', async () => {
    const { user } = renderModal({ initialTransaction: bankTx });
    await user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    expect(screen.queryByRole('button', { name: /Ta bort transaktion/ })).toBeNull();
  });
});

describe('köpfönstret – byta namn: bara det här köpet eller fler?', () => {
  // Tre köp på samma butik – ett namnbyte kan gälla alla
  const first = makeTx({ id: 'tx-1', title: 'Pressbyrån', amount: 45, category: 'Mat & dryck', date: '2026-11-10' });
  const second = makeTx({ id: 'tx-2', title: 'Pressbyrån', amount: 39, category: 'Mat & dryck', date: '2026-11-03' });
  const third = makeTx({ id: 'tx-3', title: 'Pressbyrån', amount: 52, category: 'Mat & dryck', date: '2026-10-27' });
  const all: TransactionItem[] = [first, second, third];

  async function renameTo(newName: string) {
    const r = renderModal({ initialTransaction: first, transactions: all });
    await r.user.click(screen.getByRole('button', { name: /^Redigera$/ }));
    await r.user.clear(nameInput());
    await r.user.type(nameInput(), newName);
    await r.user.click(screen.getByRole('button', { name: /Spara ändringar/ }));
    return r;
  }

  test('nytt namn → frågan visas och ingenting sparas förrän man valt', async () => {
    const { onUpdate } = await renameTo('Fika');
    expect(screen.getByText('Ändra namnet på fler köp?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bara det här köpet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Alla liknande köp \(3 st\)/ })).toBeTruthy();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  test('"Bara det här köpet" byter namn på ett köp', async () => {
    const { user, onUpdate } = await renameTo('Fika');
    await user.click(screen.getByRole('button', { name: 'Bara det här köpet' }));

    expect(onUpdate).toHaveBeenCalledOnce();
    const [saved, applyToIds, options] = onUpdate.mock.calls[0];
    expect(saved).toMatchObject({ id: 'tx-1', title: 'Fika', amount: 45 });
    expect(applyToIds).toBeUndefined();
    expect(options).toMatchObject({ renameScope: 'single', renameTargetIds: undefined });
    expect(screen.queryByText('Ändra namnet på fler köp?')).toBeNull();
  });

  test('"Alla liknande köp" byter namn på alla tre', async () => {
    const { user, onUpdate } = await renameTo('Fika');
    await user.click(screen.getByRole('button', { name: /Alla liknande köp/ }));

    const [saved, , options] = onUpdate.mock.calls[0];
    expect(saved).toMatchObject({ id: 'tx-1', title: 'Fika' });
    expect(options?.renameScope).toBe('chain');
    expect([...(options?.renameTargetIds ?? [])].sort()).toEqual(['tx-1', 'tx-2', 'tx-3']);
    // Kategorin ändrades inte → inga kategorimål
    expect(options?.categoryTargetIds).toBeUndefined();
  });

  test('Avbryt i frågan sparar ingenting och man står kvar i redigeringen', async () => {
    const { user, onUpdate } = await renameTo('Fika');
    // Både frågan och redigeringen har en Avbryt – välj den i frågan (sist i dokumentet)
    const cancelButtons = screen.getAllByRole('button', { name: 'Avbryt' });
    await user.click(cancelButtons[cancelButtons.length - 1]);
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.queryByText('Ändra namnet på fler köp?')).toBeNull();
    expect((nameInput() as HTMLInputElement).value).toBe('Fika');
  });
});

describe('köpfönstret – nytt köp', () => {
  test('Spara är avstängt tills både namn och belopp finns', async () => {
    const { user } = renderModal({ initialTransaction: null });
    sheetTitle('Nytt köp');
    const save = () => screen.getByRole('button', { name: /Spara (köp|inkomst)/ }) as HTMLButtonElement;
    expect(save().disabled).toBe(true);
    await user.type(nameInput(), 'Ica');
    expect(save().disabled).toBe(true);
    await user.type(amountInput(), '143');
    expect(save().disabled).toBe(false);
  });

  test('sparar namn, belopp, typ och kategori och stänger', async () => {
    const { user, onSave, onClose } = renderModal({ initialTransaction: null });
    await user.type(nameInput(), '  Bio med Sara  ');
    await user.type(amountInput(), '180');
    await user.click(screen.getByRole('button', { name: /Spara (köp|inkomst)/ }));

    expect(onSave).toHaveBeenCalledOnce();
    const saved = onSave.mock.calls[0][0];
    expect(saved).toMatchObject({ title: 'Bio med Sara', amount: 180, type: 'expense', paymentMethod: 'Kort' });
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(saved.time).toMatch(/^\d{2}:\d{2}$/);
    expect(onClose).toHaveBeenCalled();
  });

  test('"Inkomst" sparar en inkomst med kategorin Lön', async () => {
    const { user, onSave } = renderModal({ initialTransaction: null });
    await user.click(screen.getByRole('button', { name: 'Inkomst' }));
    expect(screen.getByPlaceholderText('Inkomstkälla')).toBeTruthy();
    await user.type(screen.getByPlaceholderText('Inkomstkälla'), 'Extrajobb');
    await user.type(amountInput(), '1500');
    await user.click(screen.getByRole('button', { name: /Spara (köp|inkomst)/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ title: 'Extrajobb', amount: 1500, type: 'income', category: 'Lön' });
  });

  test('förifyllt från rösten ("Ica 143 kr") – inget sparas förrän man trycker Spara', async () => {
    const { user, onSave } = renderModal({ initialTransaction: null, prefill: { title: 'Ica', amount: 143 } });
    expect((nameInput() as HTMLInputElement).value).toBe('Ica');
    expect((amountInput() as HTMLInputElement).value).toBe('143');
    expect(onSave).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /Spara (köp|inkomst)/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ title: 'Ica', amount: 143 });
  });

  test('stängd ruta visar ingenting', () => {
    render(<TransactionModal isOpen={false} initialTransaction={null} onClose={vi.fn()} />);
    expect(screen.queryByText('Lägg till köp')).toBeNull();
  });
});

describe('köpfönstret – kontorad', () => {
  // Fixat: fönstret hittade tidigare på ett kontonummer ("•••• 8219") när det riktiga saknades
  test('ett manuellt köp utan konto visar inget påhittat kontonummer', () => {
    renderModal({ initialTransaction: makeTx({ title: 'Kaffe', amount: 35 }), accounts: [] });
    expect(bodyText()).not.toContain('8219');
  });
});
