// supabase/functions/enable-banking/transactions.ts – tolkar bankens saldon och transaktioner.
// Här avgörs tecken (+/-) på beloppen och nycklarna som hindrar dubbletter vid varje synk.
import { describe, expect, it } from 'vitest';
import {
  buildBatchTransactionRows,
  type EbTransaction,
  extractClientIp,
  extractCounterpartyAndDescription,
  isLikelyIncomingCreditText,
  normalizeAccountIdentity,
  selectPreferredBalance,
} from '../../supabase/functions/enable-banking/transactions';

describe('selectPreferredBalance', () => {
  it('inga saldon: null i SEK', () => {
    expect(selectPreferredBalance([])).toEqual({ amount: null, currency: 'SEK', balanceType: null, balanceLabel: null });
  });

  it('väljer disponibelt saldo (CLAV) före bokfört', () => {
    const r = selectPreferredBalance([
      { balance_type: 'CLBD', balance_amount: { amount: '100.00', currency: 'SEK' } },
      { balance_type: 'CLAV', balance_amount: { amount: '1234.50', currency: 'SEK' } },
    ]);
    expect(r).toEqual({ amount: 1234.5, currency: 'SEK', balanceType: 'CLAV', balanceLabel: 'Disponibelt saldo (CLAV)' });
  });

  it('hoppar över ett prioriterat saldo utan belopp', () => {
    const r = selectPreferredBalance([
      { balance_type: 'CLAV', balance_amount: {} },
      { balance_type: 'ITBD', balance_amount: { amount: 50, currency: 'EUR' } },
    ]);
    expect(r).toMatchObject({ amount: 50, currency: 'EUR', balanceType: 'ITBD' });
  });

  it('bankens eget namn används i etiketten, okänd typ får en generell etikett', () => {
    expect(selectPreferredBalance([{ balance_type: 'CLAV', name: ' Saldo ', balance_amount: { amount: 1 } }]).balanceLabel).toBe(
      'Saldo (CLAV)',
    );
    expect(selectPreferredBalance([{ balance_type: 'ABCD', balance_amount: { amount: 1 } }]).balanceLabel).toBe('Saldo (ABCD)');
  });

  it('ogiltigt belopp blir null', () => {
    expect(selectPreferredBalance([{ balance_type: 'CLAV', balance_amount: { amount: 'abc' } }]).amount).toBeNull();
  });
});

describe('normalizeAccountIdentity', () => {
  it('IBAN först, sedan BBAN, sist bankens uid', () => {
    expect(normalizeAccountIdentity('se45 5000 0000 0583 9825 7466', '5000-123', 'uid')).toBe('IBAN:SE4550000000058398257466');
    expect(normalizeAccountIdentity(null, '5000-12 345', 'uid')).toBe('BBAN:500012345');
    expect(normalizeAccountIdentity('SE1', '12', ' uid-1 ')).toBe('UID:uid-1');
    expect(normalizeAccountIdentity()).toBe('UID:');
  });
});

describe('isLikelyIncomingCreditText', () => {
  it.each(['Lön november', 'Återbetalning', 'ÅTERKÖP ZALANDO', 'CSN', 'Swish från Anna'])('%s är inkommande', (t) => {
    expect(isLikelyIncomingCreditText(t)).toBe(true);
  });
  it.each(['ICA Nära', 'Spotify', 'Pålönsam AB'])('%s är inte inkommande', (t) => {
    expect(isLikelyIncomingCreditText(t)).toBe(false);
  });
});

describe('extractCounterpartyAndDescription', () => {
  const base: EbTransaction = {
    status: 'BOOK',
    transaction_amount: { amount: '125.00', currency: 'sek' },
    booking_date: '2026-11-10',
    value_date: '2026-11-11T00:00:00',
  };

  it('DBIT blir alltid negativt, motpart = mottagaren', () => {
    const r = extractCounterpartyAndDescription({
      ...base,
      credit_debit_indicator: 'dbit',
      creditor: { name: 'ICA Nära' },
      debtor: { name: 'Anna' },
    });
    expect(r).toMatchObject({ amount: -125, counterpartyName: 'ICA Nära', currency: 'SEK', creditDebitIndicator: 'DBIT' });
    expect(r.description).toBe('ICA Nära');
  });

  it('CRDT blir positivt, motpart = avsändaren', () => {
    const r = extractCounterpartyAndDescription({
      ...base,
      transaction_amount: { amount: '-25000', currency: 'SEK' },
      credit_debit_indicator: 'CRDT',
      debtor_name: 'Volvo AB',
      remittance_information: ['LÖN', 'NOV'],
    });
    expect(r).toMatchObject({ amount: 25000, counterpartyName: 'Volvo AB', description: 'LÖN NOV' });
  });

  it('reserverat kortköp märkt CRDT blir ändå negativt', () => {
    const r = extractCounterpartyAndDescription({
      ...base,
      status: 'PDNG',
      credit_debit_indicator: 'CRDT',
      card_transaction: { acceptor_name: 'Espresso House' },
    });
    expect(r).toMatchObject({ amount: -125, bookingStatus: 'PDNG', description: 'Espresso House' });
  });

  it('reserverad återbetalning utan indikator förblir positiv', () => {
    const r = extractCounterpartyAndDescription({ ...base, status: 'HOLD', remittance_information: 'Återbetalning Zalando' });
    expect(r.amount).toBe(125);
  });

  it('reserverat köp utan indikator blir negativt', () => {
    expect(extractCounterpartyAndDescription({ ...base, status: 'HOLD', remittance_information: 'ICA' }).amount).toBe(-125);
  });

  it('okänd status blir OTHR, belopp med mellanslag och komma tolkas', () => {
    const r = extractCounterpartyAndDescription({ status: 'weird', amount: '1 234,50' });
    expect(r).toMatchObject({ bookingStatus: 'OTHR', amount: 1234.5, description: 'Banktransaktion', currency: 'SEK' });
  });

  it('datum hålls isär och hittas aldrig på', () => {
    const r = extractCounterpartyAndDescription({ ...base, transaction_date: 'igår' });
    expect(r).toMatchObject({ bookingDate: '2026-11-10', valueDate: '2026-11-11', transactionDate: null });
  });

  it('stabil nyckel från bankens id', () => {
    const r = extractCounterpartyAndDescription({ ...base, entry_reference: ' ref-123 ' });
    expect(r.externalKey).toBe('ref-123_BOOK');
  });

  it('SEB:s tillfälliga referenser används inte som nyckel (de ändras vid varje anrop)', () => {
    const volatile = extractCounterpartyAndDescription({
      ...base,
      entry_reference: 'AbCdEfGhIjKlMnOpQrStUv_WxYzAbCdEfGhIjKlMn',
      remittance_information: 'ICA',
      balance_after_transaction: { amount: '900' },
    });
    expect(volatile.externalKey).toBe('BOOK_2026-11-10_2026-11-11_125.00_SEK_900.00_ICA');
    const base64 = extractCounterpartyAndDescription({ ...base, transaction_id: `aGxk${'A'.repeat(40)}` });
    expect(base64.externalKey.startsWith('BOOK_2026-11-10')).toBe(true);
  });

  it('andra förekomsten av samma köp får #2', () => {
    expect(extractCounterpartyAndDescription(base, 2).externalKey).toMatch(/#2$/);
  });
});

describe('buildBatchTransactionRows', () => {
  it('två identiska köp samma dag blir två rader med olika nycklar', () => {
    const tx: EbTransaction = {
      transaction_amount: { amount: '45', currency: 'SEK' },
      credit_debit_indicator: 'DBIT',
      booking_date: '2026-11-10',
      remittance_information: 'Pressbyrån',
    };
    const rows = buildBatchTransactionRows([tx, { ...tx }, { ...tx }], 'user-1', 'conn-1', 'acc-1');
    expect(rows.map((r) => r.external_key)).toEqual([
      'BOOK_2026-11-10_noval_-45.00_SEK_nobal_Pressbyrån',
      'BOOK_2026-11-10_noval_-45.00_SEK_nobal_Pressbyrån#2',
      'BOOK_2026-11-10_noval_-45.00_SEK_nobal_Pressbyrån#3',
    ]);
    expect(rows[0]).toMatchObject({
      user_id: 'user-1',
      connection_id: 'conn-1',
      bank_account_id: 'acc-1',
      amount: -45,
      booking_status: 'BOOK',
      entry_reference: null,
      raw_json: tx,
    });
  });
});

describe('extractClientIp', () => {
  const req = (headers: Record<string, string>) => new Request('https://x', { headers });
  it('första adressen i x-forwarded-for, annars cf-connecting-ip / x-real-ip', () => {
    expect(extractClientIp(req({ 'x-forwarded-for': ' 1.2.3.4 , 10.0.0.1' }))).toBe('1.2.3.4');
    expect(extractClientIp(req({ 'cf-connecting-ip': '5.6.7.8' }))).toBe('5.6.7.8');
    expect(extractClientIp(req({ 'x-real-ip': '9.9.9.9' }))).toBe('9.9.9.9');
    expect(extractClientIp(req({}))).toBeNull();
  });
});
