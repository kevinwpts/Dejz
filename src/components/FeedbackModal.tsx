import React, { useState } from 'react';
import { Send, MessageSquare, Bug, Lightbulb, HeartHandshake } from 'lucide-react';
import { TranslationKey } from '../i18n';
import { Modal, Button, Pill } from './ui';

interface FeedbackModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  t: (key: TranslationKey) => string;
}

type FeedbackType = 'bug' | 'idea' | 'other';

export function FeedbackModal({ isOpen = true, onClose, onSubmit, t }: FeedbackModalProps) {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      const typeLabel = feedbackType === 'bug' ? '[Bugg]' : feedbackType === 'idea' ? '[Idé/Förslag]' : '[Övrigt]';
      const formattedMessage = `${typeLabel} ${message.trim()}`;
      await onSubmit(formattedMessage);
      onClose();
    } catch (error) {
      console.error('Failed to send feedback', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={t('sendFeedback')}
      subtitle={
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse"></span>
          <span>Hjälp oss göra appen ännu bättre!</span>
        </span>
      }
      showCloseButton={true}
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      {/* Category selector pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none">
        <Pill
          active={feedbackType === 'bug'}
          onClick={() => setFeedbackType('bug')}
          icon={<Bug size={13} strokeWidth={2.2} />}
        >
          Rapportera fel
        </Pill>

        <Pill
          active={feedbackType === 'idea'}
          onClick={() => setFeedbackType('idea')}
          icon={<Lightbulb size={13} strokeWidth={2.2} />}
        >
          Idé / Förslag
        </Pill>

        <Pill
          active={feedbackType === 'other'}
          onClick={() => setFeedbackType('other')}
          icon={<HeartHandshake size={13} strokeWidth={2.2} />}
        >
          Övrigt
        </Pill>
      </div>

      <div className="relative">
        <div className="absolute left-3.5 top-3.5 text-[var(--text-tertiary)] pointer-events-none">
          <MessageSquare size={17} strokeWidth={2} />
        </div>
        <textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)} 
          placeholder={
            feedbackType === 'bug'
              ? 'Beskriv felet och vad som hände...'
              : feedbackType === 'idea'
              ? 'Vad för funktion eller förbättring saknar du?'
              : t('feedbackPlaceholder')
          } 
          className="w-full h-32 bg-[var(--surface-muted)] border border-[var(--border-subtle)] rounded-[var(--radius-input,12px)] p-3.5 pl-10 text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition-all resize-none focus:border-[var(--accent-color)]" 
        />
      </div>

      <Button
        variant="primary"
        fullWidth
        size="lg"
        onClick={handleSubmit} 
        disabled={!message.trim() || isSubmitting}
        icon={<Send size={16} strokeWidth={2} />}
      >
        {isSubmitting ? t('sending') : t('sendFeedback')}
      </Button>
    </Modal>
  );
}
