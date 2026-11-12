// @vitest-environment jsdom
// Historik-fliken: köpen grupperade per dag (nyast först, dagssumma), sök, Alla/Utgifter/Inkomster
// och filterarket. Klockan står still på torsdag 12 nov 2026 kl. 18:30 så att "Idag"/"Igår" blir stabila.
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionsTab } from '../TransactionsTab';
import { makeTx, normalizeText } from '../../test/fixtures';

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-12T18:30:00+01:00'));
});
afterAll(() => {
  vi.useRealTimers();
});

const transactions = [
  makeTx({ id: 'a', title: 'Ica Maxi', amount: 432, category: 'Mat & dryck', date: '2026-11-12', time: '17:05' }),
  makeTx({ id: 'b', title: 'SL-kort', amount: 1060, category: 'Transport', date: '2026-11-12', time: '08:10' }),
  makeTx({ id: 'c', title: 'Espresso House', amount: 59, category: 'Mat & dryck', date: '2026-11-11', time: '10:00', note: 'fika med Sara' }),
  makeTx({ id: 'd', title: 'Lön Acme AB', amount: 24800, type: 'income', category: 'Lön', date: '2026-11-03', time: '06:00' }),
  makeTx({ id: 'e', title: 'Zalando', amount: 799, category: 'Shopping', date: '2026-10-20', time: '21:00', isHearted: true }),
];

function renderTab(overrides: Partial<React.ComponentProps<typeof TransactionsTab>> = {}) {
  const onSelectTransaction = vi.fn();
  const user = userEvent.setup();
  render(<TransactionsTab transactions={transactions} onSelectTransaction={onSelectTransaction} {...overrides} />);
  return { onSelectTransaction, user };
}

/** Datumrubrikerna i ordning, t.ex. ["Idag, 12 nov", …] */
const dateHeadings = () =>
  Array.from(document.querySelectorAll('.ui-date-header')).map((el) =>
    normalizeText(el.firstElementChild?.textContent),
  );
const dateSums = () =>
  Array.from(document.querySelectorAll('.ui-date-header')).map((el) =>
    normalizeText(el.lastElementChild?.textContent),
  );
const rowTitles = () => Array.from(document.querySelectorAll('.ui-row-title')).map((el) => el.textContent);
const summary = () => normalizeText(screen.queryByText(/händelse/)?.parentElement?.textContent);

describe('historiken', () => {
  test('grupperar per dag, nyast först, med Idag/Igår och dagssumma', () => {
    renderTab();
    expect(dateHeadings()).toEqual(['Idag, 12 nov', 'Igår, 11 nov', 'Tis, 3 nov', 'Tis, 20 okt']);
    // Idag: 432 + 1 060 = 1 492 kr ut. Lönedagen visas som plus.
    expect(dateSums()).toEqual(['-1 492 kr', '-59 kr', '+24 800 kr', '-799 kr']);
    // Inom en dag: senaste köpet först
    expect(rowTitles().slice(0, 2)).toEqual(['Ica Maxi', 'SL-kort']);
  });

  test('tryck på ett köp öppnar just det köpet', async () => {
    const { user, onSelectTransaction } = renderTab();
    await user.click(screen.getByText('Espresso House'));
    expect(onSelectTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
  });

  test('sök på namn visar bara träffar och summerar dem', async () => {
    const { user } = renderTab();
    await user.type(screen.getByRole('textbox', { name: 'Sök' }), 'ica');
    expect(rowTitles()).toEqual(['Ica Maxi']);
    expect(summary()).toBe('1 händelseTotalt -432 kr');
  });

  test('sök hittar också anteckningar och belopp', async () => {
    const { user } = renderTab();
    const search = screen.getByRole('textbox', { name: 'Sök' });
    await user.type(search, 'sara');
    expect(rowTitles()).toEqual(['Espresso House']);
    await user.clear(search);
    await user.type(search, '1060');
    expect(rowTitles()).toEqual(['SL-kort']);
  });

  test('rensa sökningen visar allt igen', async () => {
    const { user } = renderTab();
    await user.type(screen.getByRole('textbox', { name: 'Sök' }), 'zzz');
    expect(screen.getByText('Inga träffar för ”zzz”')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Rensa sökning' }));
    expect(rowTitles()).toHaveLength(5);
  });

  test('Utgifter och Inkomster hålls isär', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: 'Inkomster' }));
    expect(rowTitles()).toEqual(['Lön Acme AB']);
    expect(normalizeText(document.body.textContent)).toContain('Totalt +24 800 kr');

    await user.click(screen.getByRole('button', { name: 'Utgifter' }));
    expect(rowTitles()).not.toContain('Lön Acme AB');
    expect(rowTitles()).toHaveLength(4);
    // 432 + 1 060 + 59 + 799
    expect(normalizeText(document.body.textContent)).toContain('Totalt -2 350 kr');
  });

  test('samma köp två gånger (t.ex. från både bank och cache) visas bara en gång', () => {
    const dup = { ...transactions[0] };
    renderTab({ transactions: [...transactions, dup] });
    expect(rowTitles().filter((t) => t === 'Ica Maxi')).toHaveLength(1);
  });

  test('filterarket: kategori-filter visar bara den kategorin och kan tas bort med brickan', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: /Filtrera transaktioner/ }));
    expect(screen.getByText('5 transaktioner')).toBeTruthy();

    // Kategorin "Mat & dryck" i arket (texten, oavsett ikon)
    const catButtons = screen.getAllByText('Mat & dryck', { selector: 'button span' });
    await user.click(catButtons[catButtons.length - 1]);
    await user.click(screen.getByRole('button', { name: /^Visa \d+ transaktioner$/ }));

    expect(rowTitles().sort()).toEqual(['Espresso House', 'Ica Maxi']);
    expect(screen.getByRole('button', { name: /Filtrera transaktioner \(1 aktiva\)/ })).toBeTruthy();

    // Brickan "Mat & dryck" ovanför listan tar bort filtret
    const chip = screen.getAllByText('Mat & dryck', { selector: '.ui-chip-sm span' })[0];
    await user.click(chip);
    expect(rowTitles()).toHaveLength(5);
  });

  test('filterarket: "Sparade köp" visar bara hjärtmarkerade', async () => {
    const { user } = renderTab();
    await user.click(screen.getByRole('button', { name: /Filtrera transaktioner/ }));
    await user.click(screen.getByText('Sparade köp'));
    expect(within(document.body).getByRole('button', { name: 'Visa 1 transaktioner' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Visa 1 transaktioner' }));
    expect(rowTitles()).toEqual(['Zalando']);
  });

  test('utan köp visas ett tomt läge', () => {
    renderTab({ transactions: [] });
    expect(screen.getByText('Inga köp än')).toBeTruthy();
  });

  test('"Lägg till" finns bara när det går att lägga till', async () => {
    const onAddTransaction = vi.fn();
    const { user } = renderTab({ onAddTransaction });
    await user.click(screen.getByRole('button', { name: /Lägg till/ }));
    expect(onAddTransaction).toHaveBeenCalledOnce();
  });
});
