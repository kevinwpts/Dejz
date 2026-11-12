import React from 'react';
import { CheckCircle, FileText, X } from '@phosphor-icons/react';
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
    <div className="fixed bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[150] w-[calc(100%-2rem)] max-w-sm animate-fade-in">
      <div className="px-4 py-3 rounded-2xl bg-[var(--text-primary)] text-[var(--bg-color)] shadow-xl flex items-center justify-between gap-3 text-xs">
        <span className="font-medium truncate">
          {toast.excluded ? `${toast.title} räknas inte i budget` : `${toast.title} räknas med i budget`}
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="px-2.5 py-1 rounded-lg bg-[var(--bg-color)]/15 hover:bg-[var(--bg-color)]/25 font-display font-bold shrink-0 cursor-pointer transition-colors"
        >
          Ångra
        </button>
      </div>
    </div>
  );
};

/** Mörk bekräftelsenotis i iOS-/Revolut-stil: en rad text + valfri knapp eller Ångra */
export const FeedbackToast: React.FC<{ toast: FeedbackToastState | null; onClose: () => void }> = ({
  toast,
  onClose,
}) => {
  if (!toast) return null;
  return (
    <div className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-[220] w-[calc(100%-2rem)] max-w-sm animate-fade-in pointer-events-auto">
      {/* Mörk notis i iOS-/Revolut-stil: en rad text + Ångra */}
      <div className="pl-3.5 pr-2 py-2 min-h-[48px] rounded-2xl bg-toast text-on-toast shadow-[var(--toast-shadow)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <CheckCircle size={20} weight="fill" className="text-positive shrink-0" />
          <div className="min-w-0">
            <p className="text-callout font-medium truncate">{toast.title}</p>
            {toast.subtitle && (
              <p className="text-meta text-white/60 truncate">{toast.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center shrink-0">
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                const action = toast.onAction;
                onClose();
                action?.();
              }}
              className="px-3 py-2 rounded-xl text-callout font-semibold text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
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
              className="px-3 py-2 rounded-xl text-callout font-semibold text-toast-action hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            >
              {toast.undoLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Stäng"
            >
              <X size={14} weight="bold" />
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
    title={receipt?.name || 'Kvitto'}
    zIndexClass="z-[190]"
  >
    {receipt && (
      <div className="space-y-4">
        <div className="rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] p-2 overflow-hidden flex items-center justify-center max-h-[60dvh]">
          {receipt.url.startsWith('data:image/') ||
          /\.(png|jpe?g|webp|gif)$/i.test(receipt.url) ? (
            <img
              src={receipt.url}
              alt={receipt.name}
              className="max-h-[56dvh] w-auto object-contain rounded-xl"
            />
          ) : (
            <iframe
              src={receipt.url}
              title={receipt.name}
              className="w-full h-[52dvh] rounded-xl border-0"
            />
          )}
        </div>
        <a
          href={receipt.url}
          download={receipt.name || 'kvitto.jpg'}
          className="ui-btn-primary"
        >
          <FileText size={14} weight="bold" />
          <span>Spara fil</span>
        </a>
      </div>
    )}
  </BottomSheet>
);
