// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { HomeHeroCard, type HomeHeroCardProps } from '../home/HomeHeroCard';
import type { PeriodInfo } from '../../utils/periodEngine';

const formatKr = (n: number) => `${new Intl.NumberFormat('sv-SE').format(Math.round(n))} kr`;
const period = (daysRemaining: number): PeriodInfo => ({
  startDate: new Date('2026-10-25'),
  endDate: new Date('2026-11-24'),
  nextPaydayDate: new Date('2026-11-25'),
  daysTotal: 31,
  daysElapsed: 31 - daysRemaining,
  daysRemaining,
  totalDays: 31,
  daysPassed: 31 - daysRemaining,
  startLabel: '25 okt',
  endLabel: '24 nov',
  nextPayLabel: '25 nov',
  isAdjustedForWeekend: false,
  targetPayday: 25,
  weekendHandling: 'before',
});

function renderCard(overrides: Partial<HomeHeroCardProps> = {}) {
  const props: HomeHeroCardProps = {
    kvarAttSpendera: 6056,
    totalIncome: 24800,
    totalFixedExpenses: 11414,
    totalVariableSpent: 7330,
    accounts: [],
    period: period(13),
    formatKr,
    showBudgetBreakdown: true,
    setShowBudgetBreakdown: vi.fn(),
    isInitialLoading: false,
    setActiveHeroPopup: vi.fn(),
    ...overrides,
  };
  render(<HomeHeroCard {...props} />);
  return props;
}

const text = (s: string) => screen.getByText((_, el) => el?.textContent?.replace(/\s/g, ' ') === s);

afterEach(cleanup);

describe('hemkortet', () => {
  test('visar kvar att spendera och dagar till lön', () => {
    renderCard();
    expect(screen.getByText('Kvar att spendera')).toBeTruthy();
    expect(screen.getByText('13 dagar till lön')).toBeTruthy();
    expect(document.body.textContent?.replace(/\s/g, ' ')).toContain('6 056 kr');
  });

  test('säger "1 dag" och "Lön idag" rätt', () => {
    renderCard({ period: period(1) });
    expect(screen.getByText('1 dag till lön')).toBeTruthy();
    cleanup();
    renderCard({ period: period(0) });
    expect(screen.getByText('Lön idag')).toBeTruthy();
  });

  test('visar "Över budget" när pengarna är slut', () => {
    renderCard({ kvarAttSpendera: -250 });
    expect(screen.getByText('Över budget')).toBeTruthy();
  });

  test('tryck på Inkomst/Fasta/Rörligt öppnar rätt detaljruta', () => {
    const props = renderCard();
    fireEvent.click(screen.getByText('Inkomst'));
    fireEvent.click(screen.getByText('Fasta'));
    fireEvent.click(screen.getByText('Rörligt'));
    expect(props.setActiveHeroPopup).toHaveBeenNthCalledWith(1, 'income');
    expect(props.setActiveHeroPopup).toHaveBeenNthCalledWith(2, 'fixed');
    expect(props.setActiveHeroPopup).toHaveBeenNthCalledWith(3, 'variable');
  });

  test('utan bank: tryck på beloppet öppnar "Stäm av saldo"', () => {
    const onOpenBalance = vi.fn();
    renderCard({ onOpenBalance });
    fireEvent.click(screen.getByLabelText('Stäm av saldo'));
    expect(onOpenBalance).toHaveBeenCalledOnce();
  });

  test('beloppen formateras med mellanslag', () => {
    renderCard();
    expect(text('+24 800 kr')).toBeTruthy();
    expect(text('−11 414 kr')).toBeTruthy();
  });
});
