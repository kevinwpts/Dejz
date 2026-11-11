import { useApp } from '../AppContext';
import React from 'react';
import { SetNewPasswordSheet } from '../../components/SetNewPasswordSheet';
import { FeedbackSheet } from '../../components/FeedbackSheet';
import { FeedbackToast, ReceiptPreviewSheet, UndoToast } from './AppToasts';

export const AppOverlays: React.FC = () => {
  const {
    undoToast,
    undoTimerRef,
    setUndoToast,
    handleExcludeTransaction,
    isPasswordRecovery,
    userId,
    endPasswordRecovery,
    showFeedbackToast,
    feedbackToast,
    feedbackTimerRef,
    setFeedbackToast,
    previewReceipt,
    setPreviewReceipt,
  } = useApp();
  return (
      <>
        {/* Ångra-notis när ett köp tas bort ur budgeten */}
        <UndoToast
          toast={undoToast}
          onUndo={() => {
            if (!undoToast) return;
            const { id, excluded } = undoToast;
            if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
            setUndoToast(null);
            handleExcludeTransaction(id, !excluded, true);
          }}
        />

        {/* Floating Modern Confirmation Feedback Toast */}
        <FeedbackSheet />

        <SetNewPasswordSheet
          open={isPasswordRecovery && Boolean(userId)}
          onDone={() => {
            endPasswordRecovery();
            showFeedbackToast({ id: 'password-updated', title: 'Lösenordet är bytt' });
          }}
          onSkip={endPasswordRecovery}
        />

        <FeedbackToast
          toast={feedbackToast}
          onClose={() => {
            if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current);
            setFeedbackToast(null);
          }}
        />

        {/* Kvittovisare */}
        <ReceiptPreviewSheet receipt={previewReceipt} onClose={() => setPreviewReceipt(null)} />

      </>
  );
};
