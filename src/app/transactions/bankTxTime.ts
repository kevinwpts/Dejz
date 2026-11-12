// Plockar ut bankradens riktiga klockslag (hittar aldrig på ett eget).
import type { BankTransactionItem } from '../../services/bankService';
import { formatIsoTimeStockholm } from '../../utils/swedishDate';

export function extractBankTxTime(
  bt: BankTransactionItem,
  _batchMinuteCounts: Map<string, number>,
  _effectiveDate: string,
  _category: string,
  _merchant: string
): string {
  const raw = bt.raw_json || {};

  // 1. Kontrollera genuina tidsfält för kort- och konto-transaktioner
  const candidateFields = [
    raw.card_transaction?.transaction_date_time,
    raw.card_transaction?.authorized_date,
    raw.card_transaction?.time,
    raw.transaction_date_time,
    raw.execution_date_time,
    raw.acceptance_date_time,
    raw.origination_date_time,
    raw.transaction_time,
    raw.time,
    raw.execution_time,
    raw.timestamp,
    raw.transaction_date,
    bt.transaction_date,
  ];

  for (const val of candidateFields) {
    if (typeof val !== 'string') continue;
    const trimmed = val.trim();
    const directTime = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)/);
    if (directTime) {
      const hhmm = `${directTime[1]}:${directTime[2]}`;
      if (hhmm !== '00:00' && hhmm !== '12:00') {
        return hhmm;
      }
    }
    if (
      trimmed.includes('T') &&
      !trimmed.includes('T00:00') &&
      !trimmed.includes('T12:00') &&
      !trimmed.includes('T10:00:00Z')
    ) {
      const parsedTime = formatIsoTimeStockholm(trimmed);
      if (parsedTime) return parsedTime;
    }
  }

  // 2. Kontrollera om klockslag finns i bankens transaktionsbeskrivning
  if (bt.description) {
    const descMatch = bt.description.match(/\b([01]\d|2[0-3])[:.]([0-5]\d)\b/);
    if (descMatch) {
      const hhmm = `${descMatch[1]}:${descMatch[2]}`;
      if (hhmm !== '00:00' && hhmm !== '12:00') {
        return hhmm;
      }
    }
  }

  // 3. Om banken inte lämnade ut tid: returnera tom sträng (hitta aldrig på klockslag)
  return '';
}
