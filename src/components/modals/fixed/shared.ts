/** Vilken vy som visas i fönstret för fasta utgifter */
export type ModalSubView =
  | 'details'
  | 'edit'
  | 'category-picker'
  | 'day-picker'
  | 'payment-picker'
  | 'goal-picker'
  | 'share-picker'
  | 'receipt-preview'
  | 'similar'
  | 'cancel-picker'
  | 'cancel-guide';

export interface CancelGuideData {
  serviceName: string;
  noticePeriod: string;
  steps: string[];
  cancelUrl: string;
  cancelUrlLabel: string;
  tip?: string;
}
