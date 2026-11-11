import type { TransactionItem } from '../../../app/models';

/** Vilken vy som visas i köpfönstret */
export type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'payment-picker'
  | 'date-picker'
  | 'link-fixed-picker'
  | 'similar'
  | 'swish'
  | 'receipt-preview';

export function getDefaultPaymentMethodForTx(tx: TransactionItem): string {
  if (tx.paymentMethod) return tx.paymentMethod;
  const combined = `${tx.title || ''} ${tx.category || ''} ${tx.rawDescription || ''}`.toLowerCase();
  if (combined.includes('swish')) return 'Swish';
  if (combined.includes('autogiro')) return 'Autogiro';
  if (combined.includes('klarna')) return 'Klarna';
  if (combined.includes('faktura') || combined.includes('e-faktura')) return 'Faktura';
  if (tx.type === 'income') return 'Överföring';
  return 'Kort';
}
