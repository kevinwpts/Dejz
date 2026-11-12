// Banktransaktioner → appens transaktioner: reservationer, datum, tid, kategori och dubbletter.
import type { FixedExpenseItem, IncomeItem, TransactionItem } from '../models';
import type { BankAccount, BankTransactionItem } from '../../services/bank/types';
import { getLogoUrl } from '../../utils/logo';
import { categorizeBankTransactionForApp } from '../../utils/bankAnalysis/merchantRules';
import { findRawBankInternalTransferIds } from '../../utils/bankAnalysis/normalization/transferPairs';
import { formatBankAccountNumber, getBankAccountTitle } from '../../utils/bankAnalysis/accounts';
import { getNormalizedBankTxAmount, isLikelyCreditCardInvoiceBankTx, resolveBankTxSekAmount } from '../../utils/bankAnalysis/normalization/amount';
import { deduplicateTransactions } from '../../utils/transactionDedup';
import { getActualBankPaymentDateAndMeta, getSwedishDateStr } from '../../utils/swedishDate';
import { isTransactionManuallyExcluded } from '../../utils/cache/categories';
import { isGenericPlaceholderMerchant } from '../../utils/cache/merchants';
import { getActualTransactionDate } from './reservationDates';
import { extractBankTxTime } from './bankTxTime';
import { sanitizeTransactionItem } from './sanitizeTransaction';
import { matchReservationsToBookedTxs } from './reservationMatching';
import { buildMappedRawJson, resolveIncomeCatInfo } from './bankTxFields';
import { assignIntradaySortOrder } from './daySortOrder';

export function mapBankTransactionsToAppItems(
  bankTxs: BankTransactionItem[],
  accs: BankAccount[],
  fixedList: FixedExpenseItem[],
  incomeList: IncomeItem[],
  aliases: Record<string, { name: string; category: string }>
): TransactionItem[] {
  const batchMinuteCounts = new Map<string, number>();
  for (const bt of bankTxs) {
    if (bt.created_at) {
      const key = bt.created_at.slice(0, 16);
      batchMinuteCounts.set(key, (batchMinuteCounts.get(key) || 0) + 1);
    }
  }

  const rawInternalTransferIds = findRawBankInternalTransferIds(bankTxs, accs);

  const { bookedToReservationMeta, settledPendingIds, isPendingDisappearedFromLatestSync } =
    matchReservationsToBookedTxs(bankTxs, rawInternalTransferIds, batchMinuteCounts);

  const todayIsoForPendingCheck = getSwedishDateStr();
  const todayMsForPendingCheck = Date.parse(`${todayIsoForPendingCheck}T12:00:00`);

  const mappedBankTxs: TransactionItem[] = bankTxs
    .filter((bt) => {
      if (bt.booking_status === 'CNCL' || bt.booking_status === 'RJCT') return false;
      if (bt.replaced_by_bank_tx_id || settledPendingIds.has(bt.id)) {
        return false;
      }
      // Om en reservation har försvunnit eller ersatts utan att någon bokförd transaktion
      // matchat den (och utan replaced_by_bank_tx_id), dölj den ENDAST om den är äldre än 7 dagar.
      if (isPendingDisappearedFromLatestSync(bt)) {
        const pDate = getActualTransactionDate(bt);
        const pMs = pDate ? Date.parse(`${pDate}T12:00:00`) : NaN;
        const ageDays =
          Number.isFinite(pMs) && Number.isFinite(todayMsForPendingCheck)
            ? (todayMsForPendingCheck - pMs) / (1000 * 60 * 60 * 24)
            : 99;
        if (ageDays > 7) {
          return false;
        }
      }
      if (bt.reconciliation_status === 'excluded') {
        return false;
      }
      const rawAmt = getNormalizedBankTxAmount(bt);
      if (rawAmt === 0) return false;

      return true;
    })
    .map((bt) => {
      const fxInfo = resolveBankTxSekAmount(bt);
      const rawAmt = fxInfo.signedSekAmount;
      const isIncome = rawAmt > 0;
      const normAmt = fxInfo.absSekAmount;
      const isRawInternalTransfer =
        rawInternalTransferIds.has(bt.id) || bt.reconciliation_status === 'internal_transfer';
      let catInfo = isRawInternalTransfer
        ? {
            merchant: 'Överföring mellan egna konton',
            category: 'Överföring',
            logo: getLogoUrl('Överföring', 'Överföring'),
          }
        : categorizeBankTransactionForApp(bt);
      const reservationMeta = bookedToReservationMeta.get(bt.id);
      if (
        !isRawInternalTransfer &&
        reservationMeta?.preservedMerchant &&
        isGenericPlaceholderMerchant(catInfo.merchant)
      ) {
        catInfo = {
          merchant: reservationMeta.preservedMerchant,
          category: reservationMeta.preservedCategory || catInfo.category,
          logo: getLogoUrl(
            reservationMeta.preservedMerchant,
            reservationMeta.preservedCategory || catInfo.category
          ),
        };
      }

      if (isIncome && !isRawInternalTransfer) {
        catInfo = resolveIncomeCatInfo(bt, catInfo);
      }

      const dateMeta = getActualBankPaymentDateAndMeta(
        bt,
        reservationMeta?.purchaseDate,
        reservationMeta?.purchaseTime
      );
      let effectiveDate = dateMeta.paymentDate;
      const todayStr = getSwedishDateStr();
      if (effectiveDate > todayStr) {
        effectiveDate = todayStr;
      }

      const txTime =
        dateMeta.paymentTime ||
        reservationMeta?.purchaseTime ||
        extractBankTxTime(
          bt,
          batchMinuteCounts,
          effectiveDate,
          catInfo.category,
          catInfo.merchant
        );

      const isManuallyExcluded =
        isTransactionManuallyExcluded(bt.id) ||
        isTransactionManuallyExcluded(`bank-${bt.id}`) ||
        (reservationMeta?.replacedPendingId
          ? isTransactionManuallyExcluded(reservationMeta.replacedPendingId) ||
            isTransactionManuallyExcluded(`bank-${reservationMeta.replacedPendingId}`)
          : false);

      const isAutoCreditCardInvoice =
        !isIncome &&
        !bt.reconciliation_status &&
        isLikelyCreditCardInvoiceBankTx(bt);

      const matchedBankAcc = accs.find((a) => a.id === bt.bank_account_id);
      const bankAccountName = matchedBankAcc
        ? (() => {
            const title = getBankAccountTitle(matchedBankAcc, 'SEB');
            const num = formatBankAccountNumber(
              matchedBankAcc.bban || matchedBankAcc.iban || matchedBankAcc.product || ''
            );
            return num ? `${title} · ${num}` : title;
          })()
        : undefined;

      const effectiveRawDesc =
        (!isGenericPlaceholderMerchant(bt.description)
          ? bt.description
          : reservationMeta?.preservedDescription) || bt.description;

      const foreignCurrencyNote =
        fxInfo.isForeignCurrency && fxInfo.originalCurrency !== 'SEK'
          ? `Ursprungligt belopp: ${fxInfo.originalAmount.toLocaleString('sv-SE')} ${fxInfo.originalCurrency}`
          : undefined;

      return sanitizeTransactionItem(
        {
          id: `bank-${bt.id}`,
          title: catInfo.merchant,
          amount: Math.round(normAmt),
          type: isIncome ? ('income' as const) : ('expense' as const),
          category: catInfo.category,
          date: effectiveDate,
          time: txTime,
          bookingDate: dateMeta.bookingDate,
          bookingStatus: dateMeta.bookingStatus,
          reconciliationStatus: rawInternalTransferIds.has(bt.id)
            ? 'internal_transfer'
            : bt.reconciliation_status,
          isExcluded:
            bt.reconciliation_status === 'excluded' ||
            isManuallyExcluded ||
            isAutoCreditCardInvoice,
          note: foreignCurrencyNote,
          logo: catInfo.logo || getLogoUrl(catInfo.merchant, catInfo.category),

          rawDescription: effectiveRawDesc,
          counterpartyName: bt.counterparty_name || undefined,
          currency: fxInfo.isForeignCurrency ? fxInfo.originalCurrency : bt.currency || 'SEK',
          creditDebitIndicator:
            bt.credit_debit_indicator || (isIncome ? 'CRDT' : 'DBIT'),
          transactionId: bt.transaction_id || undefined,
          entryReference: bt.entry_reference || undefined,
          valueDate: reservationMeta?.purchaseDate || bt.value_date || undefined,
          bankAccountId: bt.bank_account_id || undefined,
          bankAccountName,
          createdAt: bt.created_at || undefined,
          rawJson: buildMappedRawJson(bt, rawInternalTransferIds.has(bt.id), rawAmt),
        },
        fixedList,
        incomeList,
        aliases,
        reservationMeta?.replacedPendingId
          ? `bank-${reservationMeta.replacedPendingId}`
          : undefined
      );
    });

  const dedupedBankTxs = deduplicateTransactions(mappedBankTxs);

  assignIntradaySortOrder(dedupedBankTxs);

  return dedupedBankTxs;
}
