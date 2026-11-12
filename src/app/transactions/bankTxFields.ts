// Fält för en mappad bankrad: inkomstkategori (lön, Swish, återbetalning …) och bantad rawJson.
import type { TransactionItem } from '../models';
import type { BankTransactionItem } from '../../services/bank/types';
import { getLogoUrl } from '../../utils/logo';
import { cleanDisplayMerchantName, formatSwishTitle } from '../../utils/bankAnalysis/merchantRules';
import { isGenericPlaceholderMerchant } from '../../utils/cache/merchants';

export interface BankCatInfo {
  merchant: string;
  category: string;
  logo?: string;
}

/** Inkomstrad: välj kategori (Lön, Swish, CSN, Återbetalning …) och snyggt namn. */
export function resolveIncomeCatInfo(bt: BankTransactionItem, catInfo: BankCatInfo): BankCatInfo {
  const combinedDesc = `${bt.description || ''} ${bt.counterparty_name || ''}`.toLowerCase();
  const isCardRefund = Boolean(bt.raw_json?.card_transaction);
  const isMatchedRetailOrExpenseMerchant =
    Boolean(catInfo.category) &&
    ![
      'Övrigt',
      'Inkomst',
      'Lön',
      'Swish',
      'CSN',
      'Försäkringskassan',
      'Pension',
      'Skatteåterbäring',
      'Utdelning',
      'Bidrag',
      'Återbetalning',
      'Överföring',
      'Sparande',
    ].includes(catInfo.category);

  let incomeCat = 'Inkomst';
  if (
    combinedDesc.includes('lön') ||
    combinedDesc.includes('salary') ||
    combinedDesc.includes('löneutbetalning') ||
    combinedDesc.includes('loneutbetalning')
  ) {
    incomeCat = 'Lön';
  } else if (combinedDesc.includes('swish')) {
    incomeCat = 'Swish';
  } else if (combinedDesc.includes('csn')) {
    incomeCat = 'CSN';
  } else if (
    combinedDesc.includes('försäkringskassan') ||
    combinedDesc.includes('forsakringskassan') ||
    combinedDesc.includes('fk ')
  ) {
    incomeCat = 'Försäkringskassan';
  } else if (combinedDesc.includes('pension')) {
    incomeCat = 'Pension';
  } else if (
    combinedDesc.includes('skatteverket') ||
    combinedDesc.includes('skatteåterbäring') ||
    combinedDesc.includes('skatteaterbaring')
  ) {
    incomeCat = 'Skatteåterbäring';
  } else if (
    combinedDesc.includes('återbetalning') ||
    combinedDesc.includes('aterbetalning') ||
    combinedDesc.includes('retur') ||
    combinedDesc.includes('refund') ||
    combinedDesc.includes('återköp') ||
    combinedDesc.includes('aterkop') ||
    isCardRefund ||
    isMatchedRetailOrExpenseMerchant
  ) {
    incomeCat = 'Återbetalning';
  }

  const cleanName =
    incomeCat === 'Swish'
      ? formatSwishTitle(bt.description, bt.counterparty_name)
      : catInfo.merchant && !isGenericPlaceholderMerchant(catInfo.merchant)
      ? catInfo.merchant
      : cleanDisplayMerchantName(
          bt.counterparty_name || bt.description || 'Insättning'
        );
  return {
    merchant: cleanName,
    category: incomeCat,
    logo: catInfo.logo || getLogoUrl(cleanName, incomeCat),
  };
}

/** Behåller bara de rådata från banken som appen använder senare (saldo, koder, tider). */
export function buildMappedRawJson(
  bt: BankTransactionItem,
  isInternalTransfer: boolean,
  rawAmt: number
): TransactionItem['rawJson'] {
  return bt.raw_json || isInternalTransfer
    ? {
        ...(isInternalTransfer ? { isInternalTransfer: true } : {}),
        ...(bt.raw_json?.balance_after_transaction?.amount !== undefined
          ? {
              balance_after_transaction: {
                amount: bt.raw_json.balance_after_transaction.amount,
              },
            }
          : {}),
        ...(bt.raw_json?.bank_transaction_code
          ? { bank_transaction_code: bt.raw_json.bank_transaction_code }
          : {}),
        ...(bt.raw_json?.proprietary_bank_transaction_code
          ? {
              proprietary_bank_transaction_code:
                bt.raw_json.proprietary_bank_transaction_code,
            }
          : {}),
        ...(bt.raw_json?.merchant_category_code
          ? { merchant_category_code: bt.raw_json.merchant_category_code }
          : {}),
        ...(bt.raw_json?.mcc ? { mcc: bt.raw_json.mcc } : {}),
        ...(typeof bt.raw_json?.transaction_date_time === 'string'
          ? { transaction_date_time: bt.raw_json.transaction_date_time }
          : {}),
        ...(typeof bt.raw_json?.execution_date_time === 'string'
          ? { execution_date_time: bt.raw_json.execution_date_time }
          : {}),
        ...(bt.raw_json?.card_transaction
          ? {
              card_transaction: {
                ...(typeof bt.raw_json.card_transaction.transaction_date_time === 'string'
                  ? {
                      transaction_date_time:
                        bt.raw_json.card_transaction.transaction_date_time,
                    }
                  : {}),
                ...(bt.raw_json.card_transaction.merchant_category_code
                  ? {
                      merchant_category_code:
                        bt.raw_json.card_transaction.merchant_category_code,
                    }
                  : {}),
                ...(bt.raw_json.card_transaction.mcc
                  ? { mcc: bt.raw_json.card_transaction.mcc }
                  : {}),
              },
            }
          : {}),
        exactSignedSekAmount: rawAmt,
      }
    : undefined;
}
