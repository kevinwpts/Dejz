import { ModalSubView } from './shared';
import type { RefObject } from 'react';
import React from 'react';
import { DownloadSimple, Plus } from '@phosphor-icons/react';
import { TransactionItem } from '../../../app/models';
import { ReceiptAttachment } from '../../../utils/swedishDate';
import { SheetHeader } from '../../ui/SheetHeader';

export interface TxViewReceiptPreviewProps {
  subView: "details" | "edit" | "category-picker" | "payment-picker" | "date-picker" | "link-fixed-picker" | "similar" | "swish" | "receipt-preview";
  previewReceipt: ReceiptAttachment | null;
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  activeTx: TransactionItem | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export const TxViewReceiptPreview: React.FC<TxViewReceiptPreviewProps> = ({
  subView,
  previewReceipt,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  activeTx,
  fileInputRef,
}) => (
  <>
    {subView === 'receipt-preview' && previewReceipt && (
      <div className={`${slideAnimClass} space-y-4`}>
        <SheetHeader title={previewReceipt.name || 'Kvitto'} onBack={() => navigateSubView(pickerReturnView, 'back')} onClose={onClose} flush />

        <div className="rounded-card-nested bg-[var(--fill-grouped)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
          {previewReceipt.url.startsWith('data:image/') ||
          /\.(png|jpe?g|webp|gif)$/i.test(previewReceipt.url) ? (
            <img
              src={previewReceipt.url}
              alt={previewReceipt.name || 'Kvitto'}
              className="max-h-[56dvh] w-auto object-contain rounded-xl"
            />
          ) : (
            <iframe
              src={previewReceipt.url}
              title={previewReceipt.name || 'Kvitto'}
              className="w-full h-[52dvh] rounded-xl border-0"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={previewReceipt.url}
            download={previewReceipt.name || `kvitto-${activeTx?.date || 'ny'}.jpg`}
            className="ui-btn-secondary"
          >
            <DownloadSimple size={16} weight="bold" />
            <span>Spara</span>
          </a>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ui-btn-secondary"
          >
            <Plus size={16} weight="bold" />
            <span>Bifoga fler</span>
          </button>
        </div>
      </div>
    )}
  </>
);
