import { useApp } from '../AppContext';
import React from 'react';
import { PartnerSimulatorColumn } from '../../components/AdminSimulator';
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
    splitSimulatorActive,
    mobileSimPane,
    userEmail,
    userName,
    selectedChatFriendKey,
    setSelectedChatFriendKey,
    setActiveTab,
    setMobileSimPane,
    handleToggleSplitSimulator,
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

        {/* Live Split-Screen Simulator (Du + Motpart sida vid sida på datorn, eller växlingsbar på mindre skärm) */}
        {splitSimulatorActive && (
          <div
            className={
              mobileSimPane === 'partner'
                ? 'flex-1 flex justify-center p-2 sm:p-4 min-[820px]:fixed min-[820px]:right-3 min-[820px]:top-3 min-[820px]:bottom-3 min-[820px]:p-0 z-[120] items-stretch'
                : 'fixed right-3 top-3 bottom-3 z-[120] hidden min-[820px]:flex items-stretch'
            }
          >
            <PartnerSimulatorColumn
              myUserEmail={userEmail}
              myUserName={userName}
              selectedFriendKeyInMyApp={selectedChatFriendKey}
              onSelectFriendInMyApp={(fk) => {
                setSelectedChatFriendKey(fk);
                setActiveTab('friends');
                setMobileSimPane('mine');
              }}
              onCloseSimulator={() => handleToggleSplitSimulator(false)}
            />
          </div>
        )}
      </>
  );
};
