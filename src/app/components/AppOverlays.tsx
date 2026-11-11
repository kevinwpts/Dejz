import type { AppTab } from '../../components/BottomNav';
import type { FeedbackToastState } from './AppToasts';
import type { MutableRefObject, SetStateAction } from 'react';
import React from 'react';
import { PartnerSimulatorColumn } from '../../components/AdminSimulator';
import { SetNewPasswordSheet } from '../../components/SetNewPasswordSheet';
import { FeedbackSheet } from '../../components/FeedbackSheet';
import { FeedbackToast, ReceiptPreviewSheet, UndoToast } from './AppToasts';

export interface AppOverlaysProps {
  undoToast: { id: string; excluded: boolean; title: string; };
  undoTimerRef: MutableRefObject<number>;
  setUndoToast: (value: SetStateAction<{ id: string; excluded: boolean; title: string; }>) => void;
  handleExcludeTransaction: (id: string, exclude: boolean, skipToast?: boolean) => Promise<void>;
  isPasswordRecovery: boolean;
  userId: string;
  endPasswordRecovery: () => void;
  showFeedbackToast: (toast: FeedbackToastState, durationMs?: number) => void;
  feedbackToast: FeedbackToastState;
  feedbackTimerRef: MutableRefObject<number>;
  setFeedbackToast: (value: SetStateAction<FeedbackToastState>) => void;
  previewReceipt: { url: string; name: string; };
  setPreviewReceipt: (value: SetStateAction<{ url: string; name: string; }>) => void;
  splitSimulatorActive: boolean;
  mobileSimPane: "mine" | "partner";
  userEmail: string;
  userName: string;
  selectedChatFriendKey: string;
  setSelectedChatFriendKey: (value: SetStateAction<string>) => void;
  setActiveTab: (value: SetStateAction<AppTab>) => void;
  setMobileSimPane: (value: SetStateAction<"mine" | "partner">) => void;
  handleToggleSplitSimulator: (active: boolean) => void;
}

export const AppOverlays: React.FC<AppOverlaysProps> = ({
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
}) => (
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
