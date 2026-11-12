import React from 'react';
import { CheckCircle, DownloadSimple, X } from '@phosphor-icons/react';
import { BottomSheet } from '../../components/ui/BottomSheet';

/* Små fristående notiser och blad som visas ovanpå appen. Flyttade från App.tsx. */

export interface FeedbackToastState {
  id: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  undoLabel?: string;
  onUndo?: () => void;
}

/** "Ångra" när ett köp tas bort ur (eller läggs tillbaka i) budgeten */
export const UndoToast: React.FC<{
  toast: { id: string; excluded: boolean; title: string } | null;
  onUndo: () => void;
}> = ({ toast, onUndo }) => {
  if (!toast) return null;
  return (
    <div className="ui-toast-wrap z-[150]" role="status" aria-live="polite">
      <div key={toast.id} className="ui-toast">
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium truncate">
            {toast.excluded ? 'Räknas inte i budget' : 'Räknas med i budget'}
          </p>
          <p className="text-footnote text-on-toast/60 truncate">{toast.title}</p>
        </div>
        <button type="button" onClick={onUndo} className="ui-toast-action">
          Ångra
        </button>
      </div>
    </div>
  );
};

/** Bekräftelsenotis i iOS-/Revolut-stil: svävar ovanför bottenmenyn, en rad text + valfri knapp eller Ångra */
export const FeedbackToast: React.FC<{ toast: FeedbackToastState | null; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  if (!toast) return null;
  return (
    <div className="ui-toast-wrap z-[220] pointer-events-auto" role="status" aria-live="polite">
      <div key={toast.id} className="ui-toast">
        <CheckCircle size={22} weight="fill" className="text-positive shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-callout font-medium truncate">{toast.title}</p>
          {toast.subtitle && (
            <p className="text-footnote text-on-toast/60 truncate">{toast.subtitle}</p>
          )}
        </div>

        <div className="flex items-center shrink-0 -mr-1.5">
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                const action = toast.onAction;
                onClose();
                action?.();
              }}
              className="ui-toast-action text-on-toast"
            >
              {toast.actionLabel}
            </button>
          )}

          {toast.undoLabel && toast.onUndo ? (
            <button
              type="button"
              onClick={() => {
                const undo = toast.onUndo;
                onClose();
                undo?.();
              }}
              className="ui-toast-action"
            >
              {toast.undoLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full text-on-toast/60 hover:text-on-toast hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Stäng"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Visar ett bifogat kvitto (bild eller PDF) med knapp för att spara filen */
export const ReceiptPreviewSheet: React.FC<{
  receipt: { url: string; name: string } | null;
  onClose: () => void;
}> = ({ receipt, onClose }) => (
  <BottomSheet
    isOpen={Boolean(receipt)}
    onClose={onClose}
    title={receipt?.name ? `Kvitto · ${receipt.name}` : 'Kvitto'}
    zIndexClass="z-[190]"
  >
    {receipt && (
      <div className="space-y-4">
        <div className="ui-receipt-frame">
          {receipt.url.startsWith('data:image/') ||
          /\.(png|jpe?g|webp|gif)$/i.test(receipt.url) ? (
            <img
              src={receipt.url}
              alt={receipt.name ? `Kvitto · ${receipt.name}` : 'Kvitto'}
              className="ui-receipt-image"
            />
          ) : (
            <iframe
              src={receipt.url}
              title={receipt.name}
              className="ui-receipt-pdf"
            />
          )}
        </div>
        <a
          href={receipt.url}
          download={receipt.name ? `Kvitto ${receipt.name}` : 'kvitto'}
          className="ui-btn-secondary"
        >
          <DownloadSimple size={18} />
          <span>Spara kvittot</span>
        </a>
      </div>
    )}
  </BottomSheet>
);
