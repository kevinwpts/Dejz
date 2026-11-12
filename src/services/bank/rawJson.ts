// Bantar ner bankens råa transaktionsdata till de fält appen faktiskt använder.
import type { BankRawJson } from '../../app/models';

export function compactBankTxRawJson(raw: BankRawJson | null | undefined): BankRawJson | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const compact: BankRawJson = {};
  if (raw.balance_after_transaction?.amount !== undefined) {
    compact.balance_after_transaction = {
      amount: raw.balance_after_transaction.amount,
    };
  }
  if (raw.bank_transaction_code && typeof raw.bank_transaction_code === 'object') {
    compact.bank_transaction_code = raw.bank_transaction_code;
  }
  if (raw.proprietary_bank_transaction_code !== undefined) {
    compact.proprietary_bank_transaction_code = raw.proprietary_bank_transaction_code;
  }
  if (raw.merchant_category_code !== undefined) {
    compact.merchant_category_code = raw.merchant_category_code;
  }
  if (raw.mcc !== undefined) {
    compact.mcc = raw.mcc;
  }
  if (raw.creditor_account && typeof raw.creditor_account === 'object') {
    compact.creditor_account = raw.creditor_account;
  }
  if (raw.debtor_account && typeof raw.debtor_account === 'object') {
    compact.debtor_account = raw.debtor_account;
  }
  if (raw.card_transaction && typeof raw.card_transaction === 'object') {
    compact.card_transaction = {
      authorized_date: raw.card_transaction.authorized_date,
      transaction_date_time: raw.card_transaction.transaction_date_time,
      transaction_date: raw.card_transaction.transaction_date,
      time: raw.card_transaction.time,
      merchant_category_code: raw.card_transaction.merchant_category_code,
      mcc: raw.card_transaction.mcc,
      acceptor_name: raw.card_transaction.acceptor_name,
      merchant_name: raw.card_transaction.merchant_name,
    };
  }
  if (raw.remittance_information !== undefined) {
    compact.remittance_information = raw.remittance_information;
  }
  const currencyFields = [
    'exchange_rate',
    'instructed_amount',
    'transaction_amount',
    'currency_exchange',
  ];
  for (const key of currencyFields) {
    if (raw[key] !== undefined && raw[key] !== null) {
      compact[key] = raw[key];
    }
  }
  const timeFields = [
    'transaction_date_time',
    'execution_date_time',
    'acceptance_date_time',
    'origination_date_time',
    'origination_date',
    'transaction_time',
    'time',
    'execution_time',
    'timestamp',
    'transaction_date',
    'value_date',
    'booking_date',
  ];
  for (const key of timeFields) {
    if (raw[key] !== undefined && raw[key] !== null) {
      compact[key] = raw[key];
    }
  }
  return Object.keys(compact).length > 0 ? compact : undefined;
}
