// Påhittad bankdata för karaktäriseringstesterna av bankanalysen.
// Inga riktiga personer eller siffror – bara mönster som liknar svenska bankutdrag.
import type { BankAccount, BankTransactionItem } from '../../../services/bankService';
import type { BankRawJson } from '../../../app/models';
import {
  Config,
  FixedExpense,
  Frequency,
  Income,
  PaydayType,
  Transaction,
} from '../../../types';

/** Fast "nu" för testerna: torsdag 12 november 2026 kl 10:00 (svensk tid). */
export const FIXED_NOW = new Date('2026-11-12T09:00:00.000Z');

let seq = 0;
/** Nollställer id-räknaren så att varje scenario får samma id:n varje körning. */
export function resetTxSeq(): void {
  seq = 0;
}

export interface TxInput {
  date: string | null;
  amount: number;
  desc: string;
  counterparty?: string | null;
  account?: string;
  status?: BankTransactionItem['booking_status'];
  indicator?: BankTransactionItem['credit_debit_indicator'];
  currency?: string;
  rawJson?: BankRawJson;
  id?: string;
  externalKey?: string;
  valueDate?: string | null;
  transactionDate?: string | null;
  transactionId?: string | null;
  entryReference?: string | null;
  reconciliation?: BankTransactionItem['reconciliation_status'];
}

/** Bygger en komplett banktransaktion med rimliga standardvärden. */
export function tx(input: TxInput): BankTransactionItem {
  const n = seq++;
  const id = input.id ?? `t${n}`;
  return {
    id,
    user_id: 'u1',
    connection_id: 'c1',
    bank_account_id: input.account ?? 'acc1',
    external_key: input.externalKey ?? `k_${id}`,
    entry_reference: input.entryReference ?? null,
    transaction_id: input.transactionId ?? null,
    booking_status: input.status ?? 'BOOK',
    booking_date: input.date,
    value_date: input.valueDate !== undefined ? input.valueDate : input.date,
    transaction_date: input.transactionDate !== undefined ? input.transactionDate : input.date,
    amount: input.amount,
    currency: input.currency ?? 'SEK',
    credit_debit_indicator:
      input.indicator !== undefined ? input.indicator : input.amount > 0 ? 'CRDT' : 'DBIT',
    description: input.desc,
    counterparty_name: input.counterparty !== undefined ? input.counterparty : input.desc,
    raw_json: input.rawJson,
    reconciliation_status: input.reconciliation,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };
}

export function account(
  partial: Pick<BankAccount, 'id' | 'name'> & Partial<BankAccount>
): BankAccount {
  return {
    connection_id: 'c1',
    user_id: 'u1',
    provider_account_uid: `uid_${partial.id}`,
    custom_name: null,
    product: null,
    iban: null,
    bban: null,
    currency: 'SEK',
    is_selected: true,
    balance_amount: null,
    balance_currency: null,
    balance_type: null,
    balance_label: null,
    balances_json: [],
    continuation_key: null,
    last_synced_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

export const ELIN_ACCOUNTS: BankAccount[] = [
  account({
    id: 'acc1',
    name: 'Elin Andersson',
    product: 'Privatkonto',
    iban: 'SE3550000000054910000003',
    bban: '5491 000 0003',
  }),
  account({
    id: 'acc2',
    name: 'Elin Andersson',
    product: 'Enkla sparkontot',
    custom_name: 'Buffert resor',
    iban: 'SE7280000810340009783242',
    bban: '8103-4 000 978 324-2',
  }),
];

const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];

/** Scenario 1: Elin – vanlig lön, hyra, el, streaming, mat, sparöverföringar. */
export function elinHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  MONTHS.forEach((m, i) => {
    const isNov = m === '2026-11';
    if (!isNov) {
      rows.push(tx({ date: `${m}-25`, amount: 26400 + i * 10, desc: 'LÖN ACME AB', counterparty: 'ACME AB' }));
      rows.push(
        tx({
          date: `${m}-27`,
          amount: -8950,
          desc: 'HEIMSTADEN AB',
          rawJson: { bank_transaction_code: { description: 'Direct debit' } },
        })
      );
      rows.push(tx({ date: `${m}-28`, amount: -[640, 710, 890, 1120, 980, 760][i], desc: 'ÖRESUNDSKRAFT AB' }));
      rows.push(tx({ date: `${m}-27`, amount: -299, desc: 'TELIA SVERIGE AB' }));
      rows.push(tx({ date: `${m}-28`, amount: -649, desc: 'SATS SVERIGE AB' }));
      rows.push(tx({ date: `${m}-20`, amount: -390, desc: 'KLATTERVERKET GBG', counterparty: 'KLATTERVERKET GBG' }));
    }
    rows.push(tx({ date: `${m}-0${(i % 5) + 2}`, amount: -149, desc: 'NETFLIX.COM' }));
    rows.push(tx({ date: `${m}-0${(i % 3) + 3}`, amount: -129, desc: 'APPLE.COM/BILL' }));
    rows.push(tx({ date: `${m}-03`, amount: -432 - i, desc: 'ICA NARA HAGA' }));
    rows.push(tx({ date: `${m}-09`, amount: -189, desc: 'MAX BURGERS' }));
    rows.push(tx({ date: `${m}-11`, amount: -64.5, desc: 'ESPRESSO HOUSE' }));
    rows.push(
      tx({
        date: `${m}-12`,
        amount: -2000,
        desc: 'Överföring sparkonto',
        rawJson: { bank_transaction_code: { description: 'Transfer' } },
      })
    );
    rows.push(tx({ date: `${m}-12`, amount: 2000, desc: 'Överföring från lönekonto', account: 'acc2' }));
    rows.push(tx({ date: `${m}-18`, amount: -250, desc: 'Swish 0701234567', counterparty: 'ANNA SVENSSON' }));
    rows.push(tx({ date: `${m}-15`, amount: -15, desc: 'ENKLA VARDAGEN', counterparty: null }));
  });
  // Nyligen: reserverat köp, duplicerad rad (samma konto via två kopplingar), utländskt köp
  rows.push(tx({ date: '2026-11-10', amount: -312, desc: 'COOP KONSUM', status: 'PDNG', indicator: 'CRDT' }));
  rows.push(tx({ date: '2026-11-03', amount: -432 - 6, desc: 'ICA NARA HAGA' }));
  rows.push(
    tx({
      date: '2026-11-04',
      amount: -42.5,
      desc: 'BOOKING.COM AMSTERDAM',
      currency: 'EUR',
      rawJson: { card_transaction: {} },
    })
  );
  rows.push(tx({ date: '2026-10-29', amount: 349, desc: 'RETUR ZALANDO', rawJson: { card_transaction: {} } }));
  return rows;
}

/** Scenario 2: Ojämn inkomst – arvoden, CSN, FK, barnbidrag, a-kassa, pension, privatpersoner. */
export function irregularIncomeHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  const arvoden = [12000, 4300, 18750, 9100, 15500, 7600];
  MONTHS.slice(0, 6).forEach((m, i) => {
    rows.push(tx({ date: `${m}-${String(10 + i).padStart(2, '0')}`, amount: arvoden[i], desc: 'ARVODE KREATIVA BYRÅN', counterparty: null }));
    rows.push(tx({ date: `${m}-24`, amount: 4120, desc: 'CSN STUDIEMEDEL', counterparty: 'CENTRALA STUDIESTÖDSNÄMNDEN' }));
    rows.push(tx({ date: `${m}-20`, amount: 1250, desc: 'BARNBIDRAG', counterparty: 'FÖRSÄKRINGSKASSAN' }));
    if (i % 2 === 0) {
      rows.push(tx({ date: `${m}-18`, amount: 6200 + i * 100, desc: 'FÖRÄLDRAPENNING', counterparty: 'FÖRSÄKRINGSKASSAN' }));
    }
    rows.push(tx({ date: `${m}-27`, amount: 3100, desc: 'Insättning', counterparty: 'GRÖNA STADEN AB', rawJson: { bank_transaction_code: { description: 'Credit transfer' } } }));
    rows.push(tx({ date: `${m}-05`, amount: 1800, desc: 'Swish från MAMMA', counterparty: 'KARIN NILSSON' }));
    rows.push(tx({ date: `${m}-14`, amount: -5400, desc: 'HYRA BOSTADSBOLAGET MIMER', counterparty: 'BOSTADSBOLAGET MIMER' }));
    rows.push(tx({ date: `${m}-26`, amount: -1300, desc: 'CSN ÅTERBETALNING', counterparty: 'CSN' }));
  });
  rows.push(tx({ date: '2026-09-25', amount: 14200, desc: 'A-KASSA UTBETALNING', counterparty: 'UNIONENS A-KASSA' }));
  rows.push(tx({ date: '2026-10-25', amount: 14200, desc: 'A-KASSA UTBETALNING', counterparty: 'UNIONENS A-KASSA' }));
  rows.push(tx({ date: '2026-10-23', amount: 3800, desc: 'PENSION', counterparty: 'PENSIONSMYNDIGHETEN' }));
  rows.push(tx({ date: '2026-10-02', amount: 2400, desc: 'Johan Berg', counterparty: 'Johan Berg' }));
  rows.push(tx({ date: '2026-09-02', amount: 2400, desc: 'Johan Berg', counterparty: 'Johan Berg' }));
  rows.push(tx({ date: '2026-10-08', amount: 7800, desc: 'SKATTEVERKET SKATTEÅTERBÄRING', counterparty: 'SKATTEVERKET' }));
  rows.push(tx({ date: '2026-08-08', amount: 2600, desc: 'TRADERA UTBETALNING', counterparty: 'TRADERA AB' }));
  rows.push(tx({ date: '2026-07-08', amount: 2900, desc: 'BLOCKET BETALNING', counterparty: 'BLOCKET AB' }));
  rows.push(tx({ date: '2026-08-15', amount: 1650, desc: 'KLARNA ÅTERBETALNING', counterparty: 'KLARNA' }));
  rows.push(tx({ date: '2026-09-16', amount: 2300, desc: 'Överföring', counterparty: null, rawJson: { bank_transaction_code: { description: 'Instant payment' } } }));
  return rows;
}

/** Scenario 3: Abonnemang och räkningar – kvartal, autogiro, bankgiro, appbutiker, engångsdragningar. */
export function subscriptionsHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  MONTHS.forEach((m, i) => {
    rows.push(tx({ date: `${m}-01`, amount: -119, desc: 'SPOTIFY P2B3C4', rawJson: { card_transaction: {} } }));
    rows.push(tx({ date: `${m}-14`, amount: -(i < 3 ? 39 : 129), desc: 'APPLE.COM/BILL ITUNES' }));
    rows.push(tx({ date: `${m}-27`, amount: -1750, desc: 'BRF SOLGLÄNTAN AVGIFT', counterparty: 'BRF SOLGLÄNTAN', rawJson: { bank_transaction_code: { description: 'Payment' } } }));
    rows.push(tx({ date: `${m}-26`, amount: -412, desc: 'AUTOGIRO TIBBER AB', counterparty: 'TIBBER' }));
    rows.push(tx({ date: `${m}-28`, amount: -79, desc: 'HALLON MOBIL' }));
    rows.push(tx({ date: `${m}-0${(i % 4) + 1}`, amount: -55, desc: 'GOOGLE *Google One' }));
    rows.push(tx({ date: `${m}-22`, amount: -1450, desc: 'BANKGIRO FÖRSKOLA LÖNNEN', counterparty: 'GÖTEBORGS STAD FÖRSKOLA' }));
    rows.push(tx({ date: `${m}-19`, amount: -(i % 2 === 0 ? 215 : 185), desc: 'WEBBHOTELL NORDEN AB', counterparty: 'WEBBHOTELL NORDEN AB' }));
  });
  ['2026-05-15', '2026-08-15', '2026-11-15'].forEach((d) => {
    rows.push(tx({ date: d, amount: -1287, desc: 'IF SKADEFÖRSÄKRING', counterparty: 'IF SKADEFÖRSÄKRING AB' }));
  });
  // Engångs/nya kandidater
  rows.push(tx({ date: '2026-11-02', amount: -99, desc: 'CHATGPT SUBSCRIPTION OPENAI', rawJson: { card_transaction: {} } }));
  rows.push(tx({ date: '2026-10-30', amount: -299, desc: 'PLAYSTATION NETWORK' }));
  rows.push(tx({ date: '2026-11-05', amount: -2490, desc: 'NORDIC WELLNESS ÅRSKORT', rawJson: { bank_transaction_code: { description: 'Direct debit' } } }));
  rows.push(tx({ date: '2026-10-05', amount: -72000, desc: 'BOLÅN SBAB AMORTERING' }));
  rows.push(tx({ date: '2026-11-07', amount: -18, desc: 'PARKSTER' }));
  rows.push(tx({ date: '2026-11-08', amount: -350, desc: 'KAFE MAGASINET MÅNAD' }));
  rows.push(tx({ date: '2026-11-06', amount: -560, desc: 'SWISH 1231234567 LOPPIS', counterparty: null }));
  rows.push(tx({ date: '2026-10-31', amount: -3200, desc: 'Överföring till Johan', counterparty: 'JOHAN BERG' }));
  rows.push(tx({ date: '2026-10-21', amount: -899, desc: 'ELGIGANTEN', counterparty: 'ELGIGANTEN' }));
  rows.push(tx({ date: '2026-09-21', amount: -1299, desc: 'ELGIGANTEN', counterparty: 'ELGIGANTEN' }));
  return rows;
}

/** Scenario 4: Överföringar mellan egna konton (kontonummer, IBAN, namn, parning). */
export function transfersHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  rows.push(tx({ date: '2026-11-01', amount: -5000, desc: '81034000978324', counterparty: null }));
  rows.push(tx({ date: '2026-11-01', amount: 5000, desc: 'Insättning', counterparty: null, account: 'acc2' }));
  rows.push(tx({ date: '2026-10-28', amount: -1200, desc: 'Betalning', counterparty: null, rawJson: { creditor_account: { iban: 'SE72 8000 0810 3400 0978 3242' } } }));
  rows.push(tx({ date: '2026-10-20', amount: -3000, desc: 'ELIN ANDERSSO', counterparty: null }));
  rows.push(tx({ date: '2026-10-21', amount: 3000, desc: 'Från lönekontot', counterparty: null, account: 'acc2' }));
  rows.push(tx({ date: '2026-10-15', amount: -700, desc: 'Buffert resor', counterparty: null }));
  rows.push(tx({ date: '2026-10-10', amount: -444, desc: 'Utbetalning', counterparty: null }));
  rows.push(tx({ date: '2026-10-11', amount: 444, desc: 'Utbetalning', counterparty: null, account: 'acc3' }));
  rows.push(tx({ date: '2026-10-05', amount: -2500, desc: '5196 00 507 53 2255 3219 2851', counterparty: null }));
  rows.push(tx({ date: '2026-10-01', amount: -900, desc: 'Överf via internet', counterparty: null }));
  rows.push(tx({ date: '2026-09-30', amount: -100, desc: 'ENKLA SPARKONTOT', counterparty: null, status: 'PDNG' }));
  rows.push(tx({ date: '2026-09-29', amount: -800, desc: 'KORTKÖP RESERVERAT', counterparty: null, status: 'HOLD', account: 'acc1' }));
  rows.push(tx({ date: '2026-09-29', amount: 800, desc: 'Återköp', counterparty: null, account: 'acc2' }));
  rows.push(tx({ date: '2026-09-25', amount: 27000, desc: 'LÖN', counterparty: 'FÖRETAGET AB' }));
  rows.push(tx({ date: '2026-09-26', amount: -27000, desc: 'Flytt', counterparty: null, account: 'acc3' }));
  rows.push(tx({ date: '2026-09-20', amount: -650, desc: 'Swish', counterparty: 'PER OLSSON' }));
  rows.push(tx({ date: '2026-09-20', amount: 650, desc: 'Swish', counterparty: 'PER OLSSON', account: 'acc2' }));
  rows.push(tx({ date: '2026-09-18', amount: -1100, desc: 'Gemensamt', counterparty: null, reconciliation: 'internal_transfer' }));
  rows.push(tx({ date: '2026-09-17', amount: -330, desc: 'Avbruten', counterparty: null, status: 'CNCL' }));
  rows.push(tx({ date: '2026-09-17', amount: 330, desc: 'Avbruten tillbaka', counterparty: null, account: 'acc2' }));
  return rows;
}

/** Scenario 5: Datumkantfall – saknade datum, årsskifte, skottdag, månadsslut. */
export function edgeDatesHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  rows.push(tx({ date: null, valueDate: '2026-10-31', transactionDate: null, amount: 31000, desc: 'LÖN STORA BOLAGET', counterparty: 'STORA BOLAGET' }));
  rows.push(tx({ date: null, valueDate: null, transactionDate: '2026-09-30', amount: 31000, desc: 'LÖN STORA BOLAGET', counterparty: 'STORA BOLAGET' }));
  rows.push(tx({ date: '2026-08-31', amount: 31000, desc: 'LÖN STORA BOLAGET', counterparty: 'STORA BOLAGET' }));
  rows.push(tx({ date: null, valueDate: null, transactionDate: null, amount: -499, desc: 'NETFLIX.COM' }));
  rows.push(tx({ date: '2025-12-31', amount: -499, desc: 'NETFLIX.COM' }));
  rows.push(tx({ date: '2026-01-01', amount: -499, desc: 'NETFLIX.COM' }));
  rows.push(tx({ date: '2024-02-29', amount: -2400, desc: 'FOLKSAM FÖRSÄKRING' }));
  rows.push(tx({ date: '2025-02-28', amount: -2400, desc: 'FOLKSAM FÖRSÄKRING' }));
  rows.push(tx({ date: '2026-02-28', amount: -2400, desc: 'FOLKSAM FÖRSÄKRING' }));
  rows.push(tx({ date: '2026-11-12', amount: -88, desc: 'PRESSBYRÅN', counterparty: 'PRESSBYRAN' }));
  rows.push(tx({ date: '2026-11-11', amount: -1000.4, desc: 'STADIUM', counterparty: 'STADIUM' }));
  rows.push(tx({ date: '2026-11-11', amount: 0, desc: 'NOLLBELOPP', counterparty: null }));
  rows.push(tx({ date: '2026-10-30', amount: -230, desc: 'CIRCLE K', counterparty: 'CIRCLE K', status: 'OTHR' }));
  return rows;
}

/** Scenario 6: Många olika engångsbutiker (testar taket på AI-kandidater). */
export function manyMerchantsHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  for (let i = 0; i < 40; i++) {
    rows.push(tx({ date: `2026-10-${String((i % 28) + 1).padStart(2, '0')}`, amount: -(100 + i * 7), desc: `BUTIK NUMMER${String.fromCharCode(65 + (i % 26))}${i}` }));
  }
  for (let i = 0; i < 15; i++) {
    rows.push(tx({ date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`, amount: 1600 + i * 100, desc: `KUND ${String.fromCharCode(65 + i)}${i} AB`, counterparty: `KUND ${String.fromCharCode(65 + i)}${i} AB` }));
  }
  return rows;
}

/** Scenario 7: Kantfall i inkomst- och räkningsgrenarna (okänd hyresvärd, bara CSN, personnamn). */
export function gapFillHistory(): BankTransactionItem[] {
  resetTxSeq();
  const rows: BankTransactionItem[] = [];
  ['2026-08', '2026-09', '2026-10'].forEach((m) => {
    rows.push(tx({ date: `${m}-28`, amount: -6200, desc: 'VASAKRONAN', counterparty: 'VASAKRONAN' }));
    rows.push(tx({ date: `${m}-24`, amount: 4120, desc: 'CSN', counterparty: 'CSN' }));
    rows.push(tx({ date: `${m}-06`, amount: 6000, desc: 'Johan Berg', counterparty: 'Johan Berg' }));
    rows.push(tx({ date: `${m}-07`, amount: 5200, desc: 'NETONNET RETURER', counterparty: 'NETONNET' }));
    rows.push(tx({ date: `${m}-08`, amount: 1200, desc: 'Systembolaget kreditnota', counterparty: 'SYSTEMBOLAGET' }));
  });
  rows.push(tx({ date: '2026-10-03', amount: 2300, desc: 'Buffert resor', counterparty: null }));
  return rows;
}

export function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    currency: 'kr',
    language: 'sv',
    payday: 25,
    paydayType: PaydayType.TWENTY_FIFTH,
    paydayBeforeWeekend: true,
    categories: [
      { id: 'mat', name: 'Mat & dryck', icon: 'ShoppingCart', color: '#000000' },
      { id: 'uteliv', name: 'Uteliv', icon: 'Utensils', color: '#000000' },
      { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: '#000000' },
      { id: 'transport', name: 'Transport', icon: 'Car', color: '#000000' },
      { id: 'abonnemang', name: 'Abonnemang', icon: 'Smartphone', color: '#000000' },
      { id: 'ovrigt', name: 'Övrigt', icon: 'Package', color: '#000000' },
    ],
    incomeCategories: [{ id: 'lon', name: 'Lön', icon: 'Briefcase', color: '#000000' }],
    paymentMethods: ['Kortbetalning', 'Swish', 'Autogiro'],
    initialSpent: 0,
    notifications: {},
    securityLock: false,
    darkMode: false,
    quickChoices: [],
    savingsPot: 0,
    savingsGoals: [],
    totalSavedLifetime: 0,
    surplusIncome: 0,
    monthlySavings: 0,
    includeFixedExpensesInAnalysis: true,
    showFixedExpensesInTodayView: false,
    showFixedExpensesInCalendar: false,
    ...overrides,
  };
}

export const EXISTING_FIXED: FixedExpense[] = [
  { id: 'f1', name: 'Hyra (Heimstaden)', amount: 8950, category: 'Boende', paymentMethod: 'Autogiro', frequency: Frequency.MONTHLY, deductionDay: 27 },
  { id: 'f2', name: 'Netflix', amount: 129, category: 'Streaming', paymentMethod: 'Kort', frequency: Frequency.MONTHLY, deductionDay: 2 },
  { id: 'f3', name: 'SATS', amount: 649, category: 'Hälsa', paymentMethod: 'Kort', frequency: Frequency.MONTHLY, isCancelled: true },
  { id: 'f4', name: 'Telia', amount: 297, category: 'Abonnemang', paymentMethod: 'Autogiro', frequency: Frequency.MONTHLY },
  { id: 'f5', name: 'Espresso House', amount: 300, category: 'Uteliv', paymentMethod: 'Kort', frequency: Frequency.MONTHLY },
];

export const EXISTING_INCOMES: Income[] = [{ id: 'i1', name: 'Lön', amount: 26400, category: 'Lön', deductionDay: 25 }];

/** Appens befintliga transaktioner (funktion så att tidszonen hinner sättas först). */
export function existingAppTxs(): Transaction[] {
  return [
  { id: 'a1', amount: 432, category: 'Mat & dryck', tags: [], merchant: 'ICA Nara Haga', timestamp: Date.parse('2026-11-03T12:00:00'), type: 'expense' },
  { id: 'a2', amount: 189, category: 'Uteliv', tags: ['bank_tx:t_nonexistent'], merchant: 'Max Burgers', timestamp: Date.parse('2026-11-09T12:00:00'), type: 'expense' },
  { id: 'a3', amount: 64.5, category: 'Uteliv', tags: [], merchant: 'Espresso House', timestamp: Date.parse('2026-11-11T12:00:00'), type: 'expense', bankTransactionId: 'other_bank' },
  ];
}
