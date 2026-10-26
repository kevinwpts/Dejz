import { BankAccount } from '../services/bankService';
import { TransactionItem } from '../components/HomeTab';

/**
 * Kontrollerar strikt om en transaktion är en intern överföring eller överföring mellan egna konton
 * (t.ex. till/från sparkonto eller överföring med användarens eget namn).
 * 
 * Kortköp, butiksköp, räkningar och autogiro är ALDRIG interna överföringar.
 */
export function isInternalTransferTransaction(
  tx: Partial<TransactionItem> & { rawJson?: any },
  userAccounts: BankAccount[] = [],
  userEmail?: string | null
): boolean {
  if (!tx) return false;

  const rawJson = tx.rawJson || {};
  const combined = [
    tx.title || '',
    tx.rawDescription || '',
    tx.note || '',
    tx.counterpartyName || '',
    tx.category || '',
  ]
    .join(' ')
    .toLowerCase();

  // 1. Definitivt INTE en intern överföring om det är ett kortköp, butiksköp, autogiro eller räkning:
  if (
    rawJson?.card_transaction ||
    combined.includes('kortköp') ||
    combined.includes('kortkop') ||
    combined.includes('autogiro') ||
    combined.includes('bankgiro') ||
    combined.includes('plusgiro') ||
    /swish\s*123\d{7}/i.test(combined)
  ) {
    return false;
  }

  // 2. Tydliga svenska nyckelfraser för överföring mellan egna konton:
  if (
    combined.includes('överföring mellan egna') ||
    combined.includes('overforing mellan egna') ||
    combined.includes('överföring egna konton') ||
    combined.includes('overforing egna konton') ||
    combined.includes('egen överföring') ||
    combined.includes('egen overforing') ||
    combined.includes('mellan egna konton') ||
    combined.includes('mellan egna') ||
    combined.includes('enkla sparkontot') ||
    combined.includes('enkla vardagen') ||
    combined.includes('intern överföring') ||
    combined.includes('intern overforing')
  ) {
    return true;
  }

  // 3. Om banken flaggat transaktionskoden som "Transfer" eller "InternalTransfer":
  const btcDesc = (rawJson?.bank_transaction_code?.description || '').toLowerCase().trim();
  const isBtcTransfer = btcDesc === 'transfer' || btcDesc === 'internaltransfer';

  // Kolla om creditor_account eller debtor_account matchar användarens egna konton
  const creditorIban = (rawJson?.creditor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const creditorBban = (rawJson?.creditor_account?.other?.identification || '').replace(/\D+/g, '');
  const debtorIban = (rawJson?.debtor_account?.iban || '').replace(/\s+/g, '').toUpperCase();
  const debtorBban = (rawJson?.debtor_account?.other?.identification || '').replace(/\D+/g, '');

  const matchesOwnAccount = userAccounts.some((a) => {
    const aIban = (a.iban || '').replace(/\s+/g, '').toUpperCase();
    const aBban = (a.bban || '').replace(/\D+/g, '');
    return (
      (creditorIban && aIban && creditorIban === aIban) ||
      (creditorBban && aBban && (creditorBban.includes(aBban) || aBban.includes(creditorBban))) ||
      (debtorIban && aIban && debtorIban === aIban) ||
      (debtorBban && aBban && (debtorBban.includes(aBban) || aBban.includes(debtorBban)))
    );
  });

  if (isBtcTransfer && matchesOwnAccount) {
    return true;
  }

  // Om transaktionen har koden Transfer OCH titeln innehåller användarens eget namn extraherat dynamiskt från e-posten
  if (isBtcTransfer && userEmail) {
    const localPart = userEmail.split('@')[0].toLowerCase();
    const nameParts = localPart.split(/[._\-\d]+/).filter((p) => p.length >= 3);
    const matchesUserName = nameParts.some((part) => combined.includes(part));
    if (matchesUserName) {
      return true;
    }
  }

  // 4. Om BÅDE avsändare (debtor) och mottagare (creditor) finns i bankdatan och BÅDA är användarens egna konton:
  if (
    userAccounts &&
    userAccounts.length >= 1 &&
    (rawJson?.debtor_account || rawJson?.creditor_account) &&
    isBtcTransfer
  ) {
    if (matchesOwnAccount) {
      return true;
    }
  }

  return false;
}
