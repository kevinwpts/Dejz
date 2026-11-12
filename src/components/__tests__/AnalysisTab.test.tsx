// @vitest-environment jsdom
// Analys-fliken: inkomst/utgifter/kvar för perioden, kategorilistan (inkomster och utgifter
// hålls isär) och periodväljaren. Klockan står still på 12 nov 2026 (lön den 25:e).
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalysisTab } from '../AnalysisTab';
import { makeFixed, makeIncome, makePeriod, makeTx, normalizeText } from '../../test/fixtures';

const TODAY = new Date('2026-11-12T18:30:00+01:00');

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(TODAY);
});
afterAll(() => {
  vi.useRealTimers();
});

const salary = makeIncome({ id: 'inc-lon', name: 'Lön Acme AB', amount: 24800, payday: 25 });
const rent = makeFixed({ id: 'fx-hyra', name: 'Hyra', amount: 8500, dueDay: 28, category: 'Boende' });

// Perioden 23 okt – 24 nov (25 okt 2026 är en söndag → lön fredag 23 okt)
const thisPeriod = [
  makeTx({ id: 't1', title: 'Ica Maxi', amount: 432, category: 'Mat & dryck', date: '2026-11-10' }),
  makeTx({ id: 't2', title: 'SL-kort', amount: 1060, category: 'Transport', date: '2026-11-01' }),
  makeTx({ id: 't3', title: 'Present', amount: 300, category: 'Övrigt', date: '2026-11-05' }),
  // Sålde en jacka – en inkomst som också heter "Övrigt"
  makeTx({ id: 't4', title: 'Blocket', amount: 1000, category: 'Övrigt', type: 'income', date: '2026-11-06' }),
];
const lastPeriod = [
  makeTx({ id: 'p1', title: 'Coop', amount: 650, category: 'Mat & dryck', date: '2026-10-10' }),
];

function renderTab(overrides: Partial<React.ComponentProps<typeof AnalysisTab>> = {}) {
  const handlers = { onSelectTransaction: vi.fn(), onSelectFixed: vi.fn(), onSelectIncome: vi.fn() };
  const user = userEvent.setup();
  render(
    <AnalysisTab
      period={makePeriod(TODAY)}
      incomes={[salary]}
      fixedExpenses={[rent]}
      transactions={[...thisPeriod, ...lastPeriod]}
      totalIncome={0}
      totalFixedExpenses={0}
      totalVariableSpent={0}
      {...handlers}
      {...overrides}
    />,
  );
  return { ...handlers, user };
}

/** Värdet under rubriken Inkomst/Utgifter/Kvar */
const stat = (label: string) =>
  normalizeText(screen.getByText(label, { selector: '.ui-stat-label' }).nextElementSibling?.textContent);

/** Kategoriraderna: [rubrik, belopp] */
const categoryRows = () =>
  Array.from(document.querySelectorAll('button[aria-expanded]')).map((btn) => [
    btn.querySelector('.ui-row-title')?.textContent,
    normalizeText(btn.querySelector('.tabular-nums.block')?.textContent),
  ]);

/** Periodknappen mellan pilarna (öppnar periodlistan) */
const periodButton = () => {
  const btn = screen.getByRole('button', { name: 'Föregående period' }).nextElementSibling;
  if (!(btn instanceof HTMLButtonElement)) throw new Error('Periodknappen saknas');
  return btn;
};

describe('analys – den här perioden', () => {
  test('inkomst, utgifter och kvar stämmer', () => {
    renderTab();
    // 24 800 lön + 1 000 Blocket
    expect(stat('Inkomst')).toBe('+25 800 kr');
    // 8 500 hyra + 432 + 1 060 + 300
    expect(stat('Utgifter')).toBe('-10 292 kr');
    expect(stat('Kvar')).toBe('15 508 kr');
  });

  test('inkomster och utgifter med samma kategori blandas aldrig ihop', () => {
    renderTab();
    const rows = categoryRows();
    expect(rows).toContainEqual(['Övrigt', '-300 kr']);
    expect(rows).toContainEqual(['Övriga inkomster', '+1 000 kr']);
    expect(rows).toContainEqual(['Lön', '+24 800 kr']);
    expect(rows).toContainEqual(['Boende', '-8 500 kr']);
    // Ingen rad där inkomsten och utgiften lagts ihop (+1 300 eller +700)
    expect(rows.map(([, amount]) => amount)).not.toContain('+1 300 kr');
    expect(rows.map(([, amount]) => amount)).not.toContain('+700 kr');
  });

  test('tryck på en kategori fäller ut dess köp, och ett köp öppnar köpfönstret', async () => {
    const { user, onSelectTransaction } = renderTab();
    const food = screen.getByText('Mat & dryck', { selector: '.ui-row-title' }).closest('button');
    if (!food) throw new Error('Kategoriraden saknas');
    expect(food.getAttribute('aria-expanded')).toBe('false');
    await user.click(food);
    expect(food.getAttribute('aria-expanded')).toBe('true');

    await user.click(screen.getByText('Ica Maxi'));
    expect(onSelectTransaction).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', amount: 432 }));

    // Tryck igen fäller ihop
    await user.click(food);
    expect(screen.queryByText('Ica Maxi')).toBeNull();
  });

  test('en inkomst i listan öppnar inkomstfönstret', async () => {
    const { user, onSelectIncome } = renderTab();
    await user.click(screen.getByText('Lön', { selector: '.ui-row-title' }));
    await user.click(screen.getByText('Lön Acme AB'));
    expect(onSelectIncome).toHaveBeenCalledWith(expect.objectContaining({ id: 'inc-lon', amount: 24800 }));
  });

  test('utan något alls visas "Inga poster i perioden"', () => {
    renderTab({ incomes: [], fixedExpenses: [], transactions: [] });
    expect(screen.getByText('Inga poster i perioden')).toBeTruthy();
    expect(stat('Kvar')).toBe('0 kr');
  });
});

describe('analys – periodväljaren', () => {
  test('pilen bakåt visar förra perioden, framåt är avstängd i den nuvarande', async () => {
    const { user } = renderTab();
    const next = screen.getByRole('button', { name: 'Nästa period' }) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    const currentLabel = normalizeText(periodButton().textContent);

    await user.click(screen.getByRole('button', { name: 'Föregående period' }));
    expect(normalizeText(periodButton().textContent)).not.toBe(currentLabel);
    expect(next.disabled).toBe(false);

    // Förra periodens köp syns, inte den här periodens
    expect(categoryRows()).toContainEqual(['Mat & dryck', '-650 kr']);
    expect(screen.queryByText('Transport', { selector: '.ui-row-title' })).toBeNull();

    await user.click(next);
    expect(normalizeText(periodButton().textContent)).toBe(currentLabel);
  });

  test('det går inte att backa längre än fem perioder', async () => {
    const { user } = renderTab();
    const prev = screen.getByRole('button', { name: 'Föregående period' }) as HTMLButtonElement;
    for (let i = 0; i < 5; i++) await user.click(prev);
    expect(prev.disabled).toBe(true);
  });

  test('periodlistan visar sex olika perioder och byter vid val', async () => {
    const { user } = renderTab();
    const currentLabel = normalizeText(periodButton().textContent);
    await user.click(periodButton());

    const options = screen
      .getAllByRole('button')
      .filter((b) => b.classList.contains('ui-row-btn') && /–/.test(b.textContent ?? ''));
    expect(options).toHaveLength(6);
    expect(new Set(options.map((o) => o.textContent)).size).toBe(6);

    await user.click(options[1]);
    expect(normalizeText(periodButton().textContent)).not.toBe(currentLabel);
    expect(categoryRows()).toContainEqual(['Mat & dryck', '-650 kr']);
  });
});

describe('analys – buggar', () => {
  // Fixat: Analys skickade periodens kopia (med månadens dragning som belopp) i stället för den
  // sparade posten – ändrade man sedan något sparades 1 143 kr som nytt budgetbelopp i stället för 800 kr.
  test('en fast utgift öppnas med sitt sparade belopp, inte månadens dragning', async () => {
    const power = makeFixed({ id: 'fx-el', name: 'Vattenfall', amount: 800, dueDay: 28, category: 'Räkningar' });
    const bill = makeTx({ id: 'el-nov', title: 'Vattenfall', amount: 1143, category: 'Räkningar', date: '2026-10-28' });
    const { user, onSelectFixed } = renderTab({ fixedExpenses: [power], transactions: [bill], incomes: [] });
    await user.click(screen.getByText('Räkningar', { selector: '.ui-row-title' }));
    const row = within(document.body).getAllByText('Vattenfall')[0];
    await user.click(row);
    expect(onSelectFixed).toHaveBeenCalledWith(power);
  });

  // Fixat: 31 mars − 1 månad blev 3 mars, så "förra perioden" var samma som den nuvarande
  test('periodlistan har sex olika perioder även den 31:a med lön den 1:a', async () => {
    vi.setSystemTime(new Date('2026-03-31T12:00:00+02:00'));
    try {
      const { user } = renderTab({ targetPayday: 1, period: makePeriod(new Date('2026-03-31T12:00:00+02:00'), 1) });
      await user.click(periodButton());
      const labels = screen
        .getAllByRole('button')
        .filter((b) => b.classList.contains('ui-row-btn') && /–/.test(b.textContent ?? ''))
        .map((b) => b.textContent);
      expect(new Set(labels).size).toBe(6);
    } finally {
      vi.setSystemTime(TODAY);
    }
  });

  // Fixat: förra perioden räknades med Date.setMonth(-1), som "rinner över" den 29–31:a och
  // missade perioder när lönen flyttats för helg.
  test('förra perioden direkt efter en helgflyttad lön hoppas inte över', async () => {
    // Fredag 23 okt 2026: lönen (25:e, en söndag) kom i dag
    vi.setSystemTime(new Date('2026-10-23T12:00:00+02:00'));
    try {
      const { user } = renderTab({ period: makePeriod(new Date('2026-10-23T12:00:00+02:00')) });
      expect(normalizeText(periodButton().textContent)).toContain('23 okt – 24 nov');
      await user.click(screen.getByRole('button', { name: 'Föregående period' }));
      expect(normalizeText(periodButton().textContent)).toContain('25 sep – 22 okt');
    } finally {
      vi.setSystemTime(TODAY);
    }
  });
});
