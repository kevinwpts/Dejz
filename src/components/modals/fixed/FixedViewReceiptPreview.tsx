import type { ModalSubView } from './shared';
import type { RefObject } from 'react';
import React from 'react';
import { FileText, Plus } from '@phosphor-icons/react';
import { ReceiptAttachment } from '../../../utils/swedishDate';
import { SheetHeader } from '../../ui/SheetHeader';

export interface FixedViewReceiptPreviewProps {
  subView: "details" | "edit" | "category-picker" | "day-picker" | "payment-picker" | "goal-picker" | "receipt-preview" | "similar" | "cancel-picker" | "cancel-guide";
  previewReceipt: ReceiptAttachment | null;
  slideAnimClass: "animate-slide-in-right" | "animate-slide-in-left";
  navigateSubView: (next: ModalSubView, dir?: "forward" | "back") => void;
  pickerReturnView: "details" | "edit";
  onClose: () => void;
  displayName: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

export const FixedViewReceiptPreview: React.FC<FixedViewReceiptPreviewProps> = ({
  subView,
  previewReceipt,
  slideAnimClass,
  navigateSubView,
  pickerReturnView,
  onClose,
  displayName,
  fileInputRef,
}) => (
  <>
    {subView === 'receipt-preview' && previewReceipt && (
      <div className={`${slideAnimClass} space-y-4`}>
        <SheetHeader title={previewReceipt.name || 'Kvitto'} onBack={() => navigateSubView(pickerReturnView, 'back')} onClose={onClose} flush />

        <div className="rounded-2xl bg-[var(--fill-grouped)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
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
            download={previewReceipt.name || `kvitto-${displayName}.jpg`}
            className="ui-btn-primary"
          >
            <FileText size={14} weight="bold" />
            <span>Spara fil</span>
          </a>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="ui-btn-secondary"
          >
            <Plus size={14} weight="bold" />
            <span>Bifoga fler</span>
          </button>
        </div>
      </div>
    )}
  </>
);
