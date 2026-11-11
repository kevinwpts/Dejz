import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateHouseholdSettlement, toPeriodKey } from '../householdSync';

// Delad budget: vem har betalat vad, och vem är skyldig vem?

const member = (email: string, name: string, totalIncome: number, fixed: number, variable: number) => ({
  email,
  name,
  totalIncome,
  sharedFixedPaid: fixed,
  sharedVariableSpent: variable,
  sharedExpensesList: [],
  updatedAt: '2026-11-01T10:00:00Z',
});
const household = (extra: Record<string, unknown> = {}) =>
  ({
    householdId: 'h1',
    inviteCode: 'ABC123',
    splitMode: 'equal',
    members: {
      'elin@x.se': member('elin@x.se', 'Elin', 30000, 6000, 2000),
      'sam@x.se': member('sam@x.se', 'Sam', 20000, 1000, 1000),
    },
    ...extra,
  }) as any;

test('50/50: den som betalat mer får tillbaka mellanskillnaden', () => {
  const s = calculateHouseholdSettlement(household(), 'elin@x.se', '2026-11-25');
  assert.equal(s.myTotalPaid, 8000);
  assert.equal(s.partnerTotalPaid, 2000);
  assert.equal(s.combinedTotalShared, 10000);
  assert.equal(s.myFairShare, 5000);
  assert.equal(s.netBalance, 3000, 'Sam är skyldig Elin 3 000 kr');
});

test('samma sak sett från den andra personen blir omvänt', () => {
  const s = calculateHouseholdSettlement(household(), 'sam@x.se', '2026-11-25');
  assert.equal(s.netBalance, -3000, 'Sam är skyldig 3 000 kr');
});

test('efter inkomst: andelen följer lönerna (30 000 mot 20 000 = 60/40)', () => {
  const s = calculateHouseholdSettlement(household({ splitMode: 'income' }), 'elin@x.se', '2026-11-25');
  assert.equal(Math.round(s.myShareRatio * 100), 60);
  assert.equal(s.myFairShare, 6000);
  assert.equal(s.netBalance, 2000);
});

test('utan partner finns ingen skuld', () => {
  const hh = household();
  delete hh.members['sam@x.se'];
  const s = calculateHouseholdSettlement(hh, 'elin@x.se', '2026-11-25');
  assert.equal(s.partnerMember, null);
  assert.equal(s.netBalance, 0);
});

test('"avräknad" gäller bara perioden den markerades i – även efter omladdning (text mot datum)', () => {
  const settled = household({ settledAt: '2026-11-26T09:00:00Z', settledPeriodStart: '2026-11-25' });
  const periodStartAsDate = new Date('2026-11-25T00:00:00+01:00');
  assert.equal(calculateHouseholdSettlement(settled, 'elin@x.se', periodStartAsDate).isSettledForCurrentPeriod, true);
  assert.equal(calculateHouseholdSettlement(settled, 'elin@x.se', '2026-12-25').isSettledForCurrentPeriod, false);
});

test('periodnyckel: datum och text blir samma svenska datum', () => {
  assert.equal(toPeriodKey(new Date('2026-11-24T23:30:00Z')), '2026-11-25'); // redan 25:e i Sverige
  assert.equal(toPeriodKey('2026-11-25'), '2026-11-25');
  assert.equal(toPeriodKey(undefined), '');
});
