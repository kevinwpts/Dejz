import type { SetStateAction } from 'react';
import React from 'react';
import { sendFeedback } from '../../utils/sendFeedback';
import { CaretRight, Compass, PaperPlaneTilt } from '@phosphor-icons/react';

export interface FeedbackSettingsViewProps {
  feedbackMessage: string;
  feedbackSending: boolean;
  setFeedbackSending: (value: SetStateAction<boolean>) => void;
  feedbackType: "idea" | "bug" | "praise";
  userEmail: string;
  setFeedbackSent: (value: SetStateAction<boolean>) => void;
  setFeedbackMessage: (value: SetStateAction<string>) => void;
  setFeedbackType: (value: SetStateAction<"idea" | "bug" | "praise">) => void;
  feedbackSent: boolean;
  onStartOnboarding: () => void;
}

export const FeedbackSettingsView: React.FC<FeedbackSettingsViewProps> = ({
  feedbackMessage,
  feedbackSending,
  setFeedbackSending,
  feedbackType,
  userEmail,
  setFeedbackSent,
  setFeedbackMessage,
  setFeedbackType,
  feedbackSent,
  onStartOnboarding,
}) => {
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMessage = feedbackMessage.trim();
    if (!cleanMessage || feedbackSending) return;
    setFeedbackSending(true);
    try {
      const prev = JSON.parse(localStorage.getItem('dejz_user_feedback') || '[]');
      prev.unshift({
        id: Date.now(),
        type: feedbackType,
        message: cleanMessage,
        userEmail: userEmail || 'anonym',
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('dejz_user_feedback', JSON.stringify(prev.slice(0, 50)));
    } catch {
      // ignore
    }

    try {
      // Sparas i Supabase och mejlas till hej@dejz.se (funktionen send-feedback)
      await sendFeedback(feedbackType, cleanMessage);
    } catch {
      // fallback already stored locally
    } finally {
      setFeedbackSending(false);
      setFeedbackSent(true);
      setFeedbackMessage('');
      setTimeout(() => setFeedbackSent(false), 3500);
    }
  };

  return (
    <div className="ui-page animate-slide-in-right">
      <div className="ui-card-p">
        <form onSubmit={handleSendFeedback} className="space-y-4">
          <div className="ui-segmented grid-cols-3">
            {[
              { id: 'idea' as const, label: 'Förslag' },
              { id: 'bug' as const, label: 'Bugg' },
              { id: 'praise' as const, label: 'Beröm' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFeedbackType(t.id)}
                className={`ui-segmented-tab ${
                  feedbackType === t.id ? 'ui-segmented-tab-active' : ''
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            rows={4}
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder="Ditt meddelande"
            required
            className="ui-box-input resize-none"
          />

          {feedbackSent && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold text-center animate-fade-in">
              Tack för din feedback!
            </div>
          )}

          <button
            type="submit"
            disabled={!feedbackMessage.trim() || feedbackSending}
            className="ui-btn-primary"
          >
            <PaperPlaneTilt size={15} weight="bold" />
            <span>{feedbackSending ? 'Skickar...' : 'Skicka'}</span>
          </button>
        </form>
      </div>

      {onStartOnboarding && (
        <div className="ui-admin-card">
          <button
            type="button"
            onClick={onStartOnboarding}
            className="ui-admin-row"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Compass size={18} weight="regular" />
              </span>
              <span className="font-normal text-[13px] sm:text-[14px] text-[var(--text-primary)] truncate">
                Visa introduktionsguiden igen
              </span>
            </div>
            <span className="ui-admin-chevron">
              <CaretRight size={13} />
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
