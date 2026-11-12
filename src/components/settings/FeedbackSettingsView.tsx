import type { SetStateAction } from 'react';
import React from 'react';
import { sendFeedback } from '../../utils/sendFeedback';
import { CaretRight, Compass, PaperPlaneTilt } from '@phosphor-icons/react';

export interface FeedbackSettingsViewProps {
  feedbackMessage: string;
  feedbackSending: boolean;
  setFeedbackSending: (value: SetStateAction<boolean>) => void;
  feedbackType: "idea" | "bug" | "praise";
  userEmail: string | null;
  setFeedbackSent: (value: SetStateAction<boolean>) => void;
  setFeedbackMessage: (value: SetStateAction<string>) => void;
  setFeedbackType: (value: SetStateAction<"idea" | "bug" | "praise">) => void;
  feedbackSent: boolean;
  onStartOnboarding?: () => void;
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
      <form onSubmit={handleSendFeedback} className="space-y-3">
        <span className="ui-settings-label">Vad vill du berätta?</span>
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
              aria-pressed={feedbackType === t.id}
              className={`ui-segmented-tab ${feedbackType === t.id ? 'ui-segmented-tab-active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          aria-label="Ditt meddelande"
          rows={5}
          value={feedbackMessage}
          onChange={(e) => setFeedbackMessage(e.target.value)}
          placeholder={
            feedbackType === 'bug'
              ? 'Vad hände, och vad gjorde du precis innan?'
              : feedbackType === 'praise'
              ? 'Vad gillar du med Dejz?'
              : 'Vad skulle göra Dejz bättre för dig?'
          }
          required
          className="block w-full rounded-card bg-[var(--surface-color)] shadow-[var(--card-shadow)] p-4 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none focus:outline-none focus:shadow-[0_0_0_2px_var(--accent-soft)]"
        />

        {feedbackSent ? (
          <p role="status" className="px-4 text-footnote font-medium text-positive animate-fade-in">
            Tack! Vi läser allt som kommer in.
          </p>
        ) : (
          <p className="px-4 text-footnote text-[var(--text-secondary)]">
            Går direkt till oss som bygger Dejz.
          </p>
        )}

        <button
          type="submit"
          disabled={!feedbackMessage.trim() || feedbackSending}
          className="ui-btn-primary"
        >
          <PaperPlaneTilt size={16} weight="bold" />
          <span>{feedbackSending ? 'Skickar…' : 'Skicka'}</span>
        </button>
      </form>

      {onStartOnboarding && (
        <div className="ui-admin-card">
          <button type="button" onClick={onStartOnboarding} className="ui-admin-row">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <span className="ui-admin-icon-slot">
                <Compass size={18} weight="regular" />
              </span>
              <span className="ui-list-row-title">Visa introduktionen igen</span>
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
